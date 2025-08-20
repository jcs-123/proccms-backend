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

    // ✅ Send emails for different scenarios using standardized templates
    if (updateData.assignedTo && updateData.assignedTo !== existing.assignedTo) {
      // Assignment changed - notify staff, project, and requester
      const staff = await Staff.findOne({ name: updateData.assignedTo });

      if (staff?.email) {
        // Email to assigned staff
        const staffEmail = EmailTemplates.assignedToStaff(updated, staff);
        await sendStatusMail({
          to: staff.email,
          subject: staffEmail.subject,
          text: `Dear ${staff.name}, a repair request has been assigned to you.`,
          html: staffEmail.html,
        });

        // Email to project about assignment
        const projectEmail = EmailTemplates.assignmentNotification(updated, staff);
        await sendStatusMail({
          to: "sandraps@jecc.ac.in",
          subject: projectEmail.subject,
          text: `Repair request ${existing._id} has been assigned to ${staff.name}.`,
          html: projectEmail.html
        });

        // Email to requester about assignment
        if (existing.email) {
          const requesterEmail = EmailTemplates.requesterAssignmentNotification(updated, staff);
          await sendStatusMail({
            to: existing.email,
            subject: requesterEmail.subject,
            text: `Your repair request has been assigned to ${staff.name}.`,
            html: requesterEmail.html
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
        const requesterEmail = EmailTemplates.completionToRequester(updated);
        completionEmails.push(
          sendStatusMail({
            to: existing.email,
            subject: requesterEmail.subject,
            text: `Your repair request has been completed.`,
            html: requesterEmail.html
          })
        );
      }

      // Email to project
      const projectEmail = EmailTemplates.completionToProject(updated);
      completionEmails.push(
        sendStatusMail({
          to: "sandraps@jecc.ac.in",
          subject: projectEmail.subject,
          text: `Repair request ${existing._id} has been completed.`,
          html: projectEmail.html
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

// Verification endpoint
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
        const projectEmail = EmailTemplates.verificationNotification(updated);
        await sendStatusMail({
          to: "sandraps@jecc.ac.in",
          subject: projectEmail.subject,
          text: `Repair request ${existing._id} has been verified by an administrator.`,
          html: projectEmail.html
        });

        // Optional: Also notify the requester that their request was verified
        if (existing.email) {
          const requesterEmail = EmailTemplates.verificationToRequester(updated);
          await sendStatusMail({
            to: existing.email,
            subject: requesterEmail.subject,
            text: `Your repair request has been verified by the administration.`,
            html: requesterEmail.html
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