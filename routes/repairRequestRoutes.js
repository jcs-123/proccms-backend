import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import RepairRequest from "../models/RepairRequest.js";
import { sendStatusMail } from "../utils/mailer.js";
import User from "../models/User.js";
import Staff from "../models/Staff.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

/**
 * POST - Create new repair request
 * Accepts optional file upload.
 */
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { username, description, isNewRequirement, role, department } = req.body;
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : "";

    const newRequest = new RepairRequest({
      username,
      department, // ✅ Add this
      description,
      isNewRequirement,
      role,
      fileUrl,
      status: "Pending",
      assignedTo: "",
    });

    const savedRequest = await newRequest.save();
    res.status(201).json(savedRequest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET - Fetch repair requests based on user role
 * Admin: gets all
 * Staff: gets assignedTo=username
 * User: gets their own requests
 */
router.get("/", async (req, res) => {
  const { username, role, department, search, status, assignedTo, dateFrom, dateTo } = req.query;

  let filter = {};

  if (role === "user") {
    filter.username = username;
    filter.department = department;
  } else if (role === "staff") {
    filter.$or = [
      { assignedTo: username },
      { username: username }
    ];
  }
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: "i" } },
      { department: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (status) {
    filter.status = status;
  }

  if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) {
      filter.createdAt.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999); // include entire day
      filter.createdAt.$lte = end;
    }
  }

  try {
    const requests = await RepairRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Failed to get repair requests" });
  }
});

/**
 * PUT - Full update of repair request (rarely used)
 */
router.put("/:id", async (req, res) => {
  try {
    const updatedRequest = await RepairRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedRequest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * PATCH - Partial update: used to assign staff or update status
 */
router.patch("/:id", async (req, res) => {
  try {
    const existing = await RepairRequest.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Repair request not found" });
    }

    const updateData = { ...req.body };

    // Completed date logic
    // inside PATCH route after updating
    if (updateData.status || updateData.assignedTo) {
      try {
        console.log("📨 Sending notification email...");

        const systemEmail = "project@jecc.ac.in";

        const user = await User.findOne({ username: updated.username });
        const staff = await Staff.findOne({ username: updated.assignedTo });

        console.log("   🔎 User email:", user?.email);
        console.log("   🔎 Staff email:", staff?.email);

        const recipients = [
          user?.email,
          staff?.email,
          systemEmail,
        ].filter(Boolean);

        console.log("   📧 Final recipients:", recipients);

        await sendStatusMail({
          to: recipients,
          subject: `Repair Request Update: ${updated.status}`,
          text: `Your request (${updated.description}) status is now ${updated.status}`,
          html: `<h3>Repair Request Update</h3>
             <p><b>Status:</b> ${updated.status}</p>
             <p><b>Assigned To:</b> ${updated.assignedTo || "Not yet assigned"}</p>`,
        });
      } catch (mailErr) {
        console.error("⚠️ Email send failed:", mailErr.message);
      }
    }


    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});
// In routes/repairRequests.js or similar
router.patch('/:id/verify', async (req, res) => {
  try {
    const updated = await RepairRequest.findByIdAndUpdate(
      req.params.id,
      { isVerified: req.body.isVerified },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Add remarks to a repair request
router.post('/:id/remarks', async (req, res) => {
  try {
    const { text, enteredBy } = req.body;

    const updatedRequest = await RepairRequest.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          remarks: {
            text,
            enteredBy,
            date: new Date()
          }
        }
      },
      { new: true }
    );

    res.json(updatedRequest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get remarks for a repair request
router.get('/:id/remarks', async (req, res) => {
  try {
    const request = await RepairRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json(request.remarks || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/all-remarks', async (req, res) => {
  try {
    const requests = await RepairRequest.find({});

    const allRemarks = [];

    requests.forEach(request => {
      request.remarks.forEach(remark => {
        allRemarks.push({
          requestId: request._id,
          _id: remark._id, // ✅ Include remark ID
          username: request.username,
          department: request.department,
          text: remark.text,
          enteredBy: remark.enteredBy,
          date: remark.date,
          seen: remark.seen || false, // ✅ Include seen status
        });
      });
    });

    res.json(allRemarks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.patch('/:requestId/remarks/:remarkId/mark-seen', async (req, res) => {
  const { requestId, remarkId } = req.params;

  try {
    const result = await RepairRequest.updateOne(
      {
        _id: requestId,
        "remarks._id": remarkId,
      },
      {
        $set: {
          "remarks.$.seen": true,
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Remark not found or already marked" });
    }

    res.json({ message: "Remark marked as seen" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});




export default router;
