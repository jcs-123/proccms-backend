// routes/repairRequests.js
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import RepairRequest from "../models/RepairRequest.js";
import { sendStatusMail } from "../utils/mailer.js";
import Staff from "../models/Staff.js";
import fs from 'fs';
import { EmailTemplates } from "../utils/EmailTemplates.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Serve static files from uploads directory - FIXED PATH
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Multer config for file uploads - UPDATED
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to remove special characters
    const originalname = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}-${originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and common document types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and document files are allowed'));
    }
  }
});

/**
 * POST - Create new repair request
 * Accepts optional file upload.
 */
router.post("/", upload.single("file"), async (req, res) => {
  try {
    // Handle file upload error
    if (req.fileValidationError) {
      return res.status(400).json({ message: req.fileValidationError });
    }

    const { username, description, isNewRequirement, role, department, email } = req.body;
    
    // Fix file URL path
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : "";

    const newRequest = new RepairRequest({
      username,
      department,
      description,
      isNewRequirement,
      role,
      email: email || '',
      fileUrl,
      status: "Pending",
      assignedTo: "",
    });

    const savedRequest = await newRequest.save();

    // ✅ Send email to project when new request is created
    try {
      const emailTemplate = EmailTemplates.newRequest(savedRequest);
      await sendStatusMail({
        to: "sandraps@jecc.ac.in",
        subject: emailTemplate.subject,
        text: `A new repair request has been created by ${username} from ${department}.`,
        html: emailTemplate.html
      });
    } catch (emailError) {
      console.error("Failed to send creation email:", emailError.message);
      // Don't fail the request if email fails
    }

    res.status(201).json(savedRequest);
  } catch (err) {
    // Handle multer errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
      }
    }
    res.status(500).json({ message: err.message });
  }
});
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

    // Send notification email about the new remark
    if (updatedRequest.email) {
      try {
        const remark = updatedRequest.remarks[updatedRequest.remarks.length - 1];
        const remarkEmail = EmailTemplates.newRemarkNotification(updatedRequest, remark);
        
        await sendStatusMail({
          to: updatedRequest.email,
          subject: remarkEmail.subject,
          text: `A new remark has been added to your repair request.`,
          html: remarkEmail.html
        });
      } catch (emailError) {
        console.error("Failed to send remark notification email:", emailError.message);
      }
    }

    res.json(updatedRequest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
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
// ... rest of your routes remain the same