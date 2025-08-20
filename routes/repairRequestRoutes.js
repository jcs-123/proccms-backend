import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import RepairRequest from "../models/RepairRequest.js";
import { sendStatusMail } from "../utils/mailer.js";
import Staff from "../models/Staff.js";
import fs from 'fs'; // Add this import

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ ADD THIS: Serve static files from uploads directory
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

/**
 * POST - Create new repair request
 * Accepts optional file upload.
 */
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { username, description, isNewRequirement, role, department, email } = req.body;
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
      await sendStatusMail({
        to: "sandraps@jecc.ac.in",
        subject: "📋 New Repair Request Created",
        text: `A new repair request has been created by ${username} from ${department}.`,
        html: `
          <h2>New Repair Request Created</h2>
          <p><strong>Request ID:</strong> ${savedRequest._id}</p>
          <p><strong>Requested By:</strong> ${username}</p>
          <p><strong>Department:</strong> ${department}</p>
          <p><strong>Description:</strong> ${description}</p>
          <p><strong>Type:</strong> ${isNewRequirement ? "New Requirement" : "Repair Request"}</p>
          <p><strong>Status:</strong> Pending</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <hr/>
          <p style="font-size:12px;color:gray">This is an automated email from PROCCMS.</p>
        `
      });
    } catch (emailError) {
      console.error("Failed to send creation email:", emailError.message);
      // Don't fail the request if email fails
    }

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

    // if status is updated to Completed
    if (updateData.status === "Completed" && existing.status !== "Completed") {
      updateData.completedAt = new Date();
    }

    if (updateData.status !== "Completed" && existing.status === "Completed") {
      updateData.completedAt = null;
    }

    const updated = await RepairRequest.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    // ✅ Send emails for different scenarios
    if (updateData.assignedTo && updateData.assignedTo !== existing.assignedTo) {
      // Assignment changed - notify staff, project, and requester
      const staff = await Staff.findOne({ name: updateData.assignedTo });

      if (staff?.email) {
        // Email to assigned staff
        await sendStatusMail({
          to: staff.email,
          subject: "📌 Repair Request Assigned to You",
          text: `Dear ${staff.name}, a repair request has been assigned to you.`,
          html: `
            <h2>Repair Request Assigned</h2>
            <p>Hello <b>${staff.name}</b>,</p>
            <p>A repair request has been assigned to you.</p>
            <p><b>Request ID:</b> ${existing._id}</p>
            <p><b>Requested By:</b> ${existing.username}</p>
            <p><b>Department:</b> ${existing.department}</p>
            <p><b>Description:</b> ${existing.description}</p>
            <p><b>Status:</b> ${updateData.status || existing.status}</p>
            <p>Please log in to the system to take action.</p>
            <hr/>
            <p style="font-size:12px;color:gray">This is an automated email from PROCCMS.</p>
          `,
        });

        // Email to project about assignment
        await sendStatusMail({
          to: "sandraps@jecc.ac.in",
          subject: "👤 Repair Request Assigned",
          text: `Repair request ${existing._id} has been assigned to ${staff.name}.`,
          html: `
            <h2>Repair Request Assigned</h2>
            <p><b>Request ID:</b> ${existing._id}</p>
            <p><b>Assigned To:</b> ${staff.name}</p>
            <p><b>Requested By:</b> ${existing.username}</p>
            <p><b>Department:</b> ${existing.department}</p>
            <p><b>Description:</b> ${existing.description}</p>
            <p><b>Status:</b> ${updateData.status || existing.status}</p>
            <hr/>
            <p style="font-size:12px;color:gray">This is an automated email from PROCCMS.</p>
          `
        });

        // Email to requester about assignment
        if (existing.email) {
          await sendStatusMail({
            to: existing.email,
            subject: "🔄 Your Repair Request Has Been Assigned",
            text: `Your repair request has been assigned to ${staff.name}.`,
            html: `
              <h2>Request Assigned</h2>
              <p>Hello <b>${existing.username}</b>,</p>
              <p>Your repair request has been assigned to a staff member.</p>
              <p><b>Request ID:</b> ${existing._id}</p>
              <p><b>Assigned To:</b> ${staff.name}</p>
              <p><b>Description:</b> ${existing.description}</p>
              <p><b>Status:</b> ${updateData.status || existing.status}</p>
              <p>You will be notified when the request is completed.</p>
              <hr/>
              <p style="font-size:12px;color:gray">This is an automated email from PROCCMS.</p>
            `
          });
        }
      }
    }

    // ✅ Send completion emails
    if (updateData.status === "Completed" && existing.status !== "Completed") {
      // Request completed - notify requester and project
      const completionEmails = [];

      // Email to requester
      if (existing.email) {
        completionEmails.push(
          sendStatusMail({
            to: existing.email,
            subject: "✅ Your Repair Request Has Been Completed",
            text: `Your repair request has been completed.`,
            html: `
              <h2>Request Completed</h2>
              <p>Hello <b>${existing.username}</b>,</p>
              <p>Your repair request has been completed successfully.</p>
              <p><b>Request ID:</b> ${existing._id}</p>
              <p><b>Description:</b> ${existing.description}</p>
              <p><b>Completed By:</b> ${existing.assignedTo || "Staff"}</p>
              <p><b>Completion Date:</b> ${new Date().toLocaleString()}</p>
              <p>Thank you for using our service.</p>
              <hr/>
              <p style="font-size:12px;color:gray">This is an automated email from PROCCMS.</p>
            `
          })
        );
      }

      // Email to project
      completionEmails.push(
        sendStatusMail({
          to: "sandraps@jecc.ac.in",
          subject: "✅ Repair Request Completed",
          text: `Repair request ${existing._id} has been completed.`,
          html: `
            <h2>Repair Request Completed</h2>
            <p><b>Request ID:</b> ${existing._id}</p>
            <p><b>Requested By:</b> ${existing.username}</p>
            <p><b>Department:</b> ${existing.department}</p>
            <p><b>Description:</b> ${existing.description}</p>
            <p><b>Completed By:</b> ${existing.assignedTo || "Staff"}</p>
            <p><b>Completion Date:</b> ${new Date().toLocaleString()}</p>
            <hr/>
            <p style="font-size:12px;color:gray">This is an automated email from PROCCMS.</p>
          `
        })
      );

      // Send all completion emails
      await Promise.all(completionEmails);
    }

    res.json(updated);
  } catch (err) {
    console.error("Update failed:", err);
    res.status(500).json({ message: "Update failed" });
  }
});
// In routes/repairRequests.js or similar
// In routes/repairRequests.js
router.patch('/:id/verify', async (req, res) => {
  try {
    const existing = await RepairRequest.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Repair request not found" });
    }

    const updated = await RepairRequest.findByIdAndUpdate(
      req.params.id,
      { isVerified: req.body.isVerified },
      { new: true }
    );

    // ✅ Send email notification when request is verified
    if (req.body.isVerified && !existing.isVerified) {
      try {
        // Email to project office
        await sendStatusMail({
          to: "sandraps@jecc.ac.in", // Project office email
          subject: "✅ Repair Request Verified by Admin",
          text: `Repair request ${existing._id} has been verified by an administrator.`,
          html: `
            <h2>Repair Request Verified</h2>
            <p><strong>Request ID:</strong> ${existing._id}</p>
            <p><strong>Requested By:</strong> ${existing.username}</p>
            <p><strong>Department:</strong> ${existing.department}</p>
            <p><strong>Description:</strong> ${existing.description}</p>
            <p><strong>Completed By:</strong> ${existing.assignedTo || "Not assigned"}</p>
            <p><strong>Completion Date:</strong> ${existing.completedAt ? new Date(existing.completedAt).toLocaleString() : "Not completed"}</p>
            <p><strong>Verification Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Verified By:</strong> Admin</p>
            <hr/>
            <p style="font-size:12px;color:gray">This is an automated email from PROCCMS.</p>
          `
        });

        // Optional: Also notify the requester that their request was verified
        if (existing.email) {
          await sendStatusMail({
            to: existing.email,
            subject: "✅ Your Repair Request Has Been Verified",
            text: `Your repair request has been verified by the administration.`,
            html: `
              <h2>Request Verified</h2>
              <p>Hello <b>${existing.username}</b>,</p>
              <p>Your repair request has been verified by the administration.</p>
              <p><b>Request ID:</b> ${existing._id}</p>
              <p><b>Description:</b> ${existing.description}</p>
              <p><b>Status:</b> Verified</p>
              <p><b>Verification Date:</b> ${new Date().toLocaleString()}</p>
              <p>Thank you for using our service.</p>
              <hr/>
              <p style="font-size:12px;color:gray">This is an automated email from PROCCMS.</p>
            `
          });
        }

        console.log("Verification email sent successfully");
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError.message);
        // Don't fail the request if email fails
      }
    }

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
