import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import RepairRequest from "../models/RepairRequest.js";
import { sendStatusMail } from "../utils/mailer.js";
import Staff from "../models/Staff.js";
import fs from "fs";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Use the same uploads directory as in server.js
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
  console.log("✅ Created uploads directory in routes:", uploadsDir);
} else {
  console.log("✅ Uploads directory exists:", uploadsDir);
  // Debug: List existing files
  try {
    const files = fs.readdirSync(uploadsDir);
    console.log("📁 Existing files:", files);
  } catch (error) {
    console.error("❌ Cannot read uploads directory:", error);
  }
}

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("📁 Destination:", uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename with original extension
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    console.log("💾 New filename:", filename, "for original:", file.originalname);
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log("🔍 File filter checking:", file.originalname);
    
    // Accept images and documents (case insensitive)
    const allowedExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|pdf|doc|docx)$/i;
    
    if (!allowedExtensions.test(file.originalname)) {
      console.log("❌ File rejected:", file.originalname);
      return cb(new Error('Only image and document files are allowed!'), false);
    }
    
    console.log("✅ File accepted:", file.originalname);
    cb(null, true);
  }
});

// Email template function for consistency
const getEmailTemplate = (title, content) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .content { background: white; padding: 20px; border-radius: 5px; margin-top: 10px; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        .status-badge { 
          display: inline-block; 
          padding: 4px 8px; 
          border-radius: 4px; 
          font-weight: bold; 
          font-size: 12px; 
        }
        .pending { background: #fff3cd; color: #856404; }
        .assigned { background: #d1ecf1; color: #0c5460; }
        .completed { background: #d4edda; color: #155724; }
        .verified { background: #e2e3e5; color: #383d41; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>PROCCMS - JECC Maintenance System</h2>
        </div>
        <div class="content">
          <h3>${title}</h3>
          ${content}
        </div>
        <div class="footer">
          <p>This is an automated email from PROCCMS (Project Office Computerized Complaint Management System).</p>
          <p>Please do not reply to this email. Contact the project office for assistance.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * POST - Create new repair request
 * Accepts optional file upload.
 */
router.post("/", (req, res) => {
  // Use multer upload with proper error handling
  upload.single("file")(req, res, async function (err) {
    try {
      if (err) {
        console.error("❌ Upload error:", err.message);
        
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              message: 'File too large. Maximum size is 5MB.' 
            });
          }
        }
        
        return res.status(400).json({ 
          message: err.message || 'File upload failed' 
        });
      }
      
      console.log("📦 Request body:", req.body);
      console.log("📄 Uploaded file:", req.file);
      
      const { username, description, isNewRequirement, role, department, email } = req.body;
      const fileUrl = req.file ? `/uploads/${req.file.filename}` : "";

      console.log("🌐 File URL to be saved:", fileUrl);

      const newRequest = new RepairRequest({
        username,
        department,
        description,
        isNewRequirement: isNewRequirement === 'true' || isNewRequirement === true,
        role,
        email: email || '',
        fileUrl,
        status: "Pending",
        assignedTo: "",
      });

      const savedRequest = await newRequest.save();
      console.log("💾 Request saved to database:", savedRequest._id);

      // ✅ Set file permissions after saving
      if (req.file) {
        const filePath = path.join(uploadsDir, req.file.filename);
        fs.chmod(filePath, 0o755, (err) => {
          if (err) {
            console.error("❌ Error setting file permissions:", err);
          } else {
            console.log("✅ File permissions set successfully");
          }
        });
      }

      // ✅ Send email to project when new request is created
      try {
        const emailContent = `
          <p>A new repair request has been submitted through the PROCCMS system.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Request ID:</strong> ${savedRequest._id}</p>
            <p><strong>Requested By:</strong> ${username}</p>
            <p><strong>Department:</strong> ${department}</p>
            <p><strong>Request Type:</strong> ${isNewRequirement ? "New Requirement" : "Repair Request"}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p><strong>Status:</strong> <span class="status-badge pending">Pending</span></p>
            <p><strong>Submission Date:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            ${fileUrl ? `<p><strong>Attachment:</strong> <a href="https://proccms-backend.onrender.com${fileUrl}">View File</a></p>` : ''}
          </div>
          <p>Please review and assign this request to appropriate staff member.</p>
        `;

        await sendStatusMail({
          to: "sandraps@jecc.ac.in",
          subject: "📋 New Repair Request Created - PROCCMS",
          text: `A new repair request has been created by ${username} from ${department}. Request ID: ${savedRequest._id}`,
          html: getEmailTemplate("New Repair Request Created", emailContent)
        });
        
        console.log("📧 Notification email sent");
      } catch (emailError) {
        console.error("❌ Failed to send creation email:", emailError.message);
        // Don't fail the request if email fails
      }

      res.status(201).json(savedRequest);
    } catch (err) {
      console.error("❌ Error creating repair request:", err);
      res.status(500).json({ message: err.message });
    }
  });
});

// ... rest of your routes remain the same
// import express from "express";
// import multer from "multer";
// import path from "path";
// import { fileURLToPath } from "url";
// import RepairRequest from "../models/RepairRequest.js";
// import { sendStatusMail } from "../utils/mailer.js";
// import Staff from "../models/Staff.js";
// import fs from "fs";

// const router = express.Router();
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // ✅ CRITICAL: Ensure uploads directory exists
// const uploadsDir = path.join(__dirname, "../uploads");
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
//   console.log("✅ Created uploads directory in routes:", uploadsDir);
// }

// // Multer config for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     // Use the same uploads directory as in server.js
//     cb(null, uploadsDir);
//   },
//   filename: (req, file, cb) => {
//     // Create a unique filename with original extension
//     const ext = path.extname(file.originalname);
//     const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
//     cb(null, filename);
//   },
// });

// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB limit
//   },
//   fileFilter: (req, file, cb) => {
//     // Accept images only
//     if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx)$/)) {
//       return cb(new Error('Only image and document files are allowed!'), false);
//     }
//     cb(null, true);
//   }
// });
// // Email template function for consistency
// const getEmailTemplate = (title, content) => {
//   return `
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <meta charset="utf-8">
//       <style>
//         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//         .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//         .header { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
//         .content { background: white; padding: 20px; border-radius: 5px; margin-top: 10px; }
//         .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
//         .status-badge { 
//           display: inline-block; 
//           padding: 4px 8px; 
//           border-radius: 4px; 
//           font-weight: bold; 
//           font-size: 12px; 
//         }
//         .pending { background: #fff3cd; color: #856404; }
//         .assigned { background: #d1ecf1; color: #0c5460; }
//         .completed { background: #d4edda; color: #155724; }
//         .verified { background: #e2e3e5; color: #383d41; }
//       </style>
//     </head>
//     <body>
//       <div class="container">
//         <div class="header">
//           <h2>PROCCMS - JECC Maintenance System</h2>
//         </div>
//         <div class="content">
//           <h3>${title}</h3>
//           ${content}
//         </div>
//         <div class="footer">
//           <p>This is an automated email from PROCCMS (Project Office Computerized Complaint Management System).</p>
//           <p>Please do not reply to this email. Contact the project office for assistance.</p>
//         </div>
//       </div>
//     </body>
//     </html>
//   `;
// };

// /**
//  * POST - Create new repair request
//  * Accepts optional file upload.
//  */
// router.post("/", upload.single("file"), async (req, res) => {
//   try {
//     const { username, description, isNewRequirement, role, department, email } = req.body;
//     const fileUrl = req.file ? `/uploads/${req.file.filename}` : "";

//     const newRequest = new RepairRequest({
//       username,
//       department,
//       description,
//       isNewRequirement,
//       role,
//       email: email || '',
//       fileUrl,
//       status: "Pending",
//       assignedTo: "",
//     });

//     const savedRequest = await newRequest.save();

//     // ✅ Send email to project when new request is created
//     try {
//       const emailContent = `
//         <p>A new repair request has been submitted through the PROCCMS system.</p>
//         <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
//           <p><strong>Request ID:</strong> ${savedRequest._id}</p>
//           <p><strong>Requested By:</strong> ${username}</p>
//           <p><strong>Department:</strong> ${department}</p>
//           <p><strong>Request Type:</strong> ${isNewRequirement ? "New Requirement" : "Repair Request"}</p>
//           <p><strong>Description:</strong> ${description}</p>
//           <p><strong>Status:</strong> <span class="status-badge pending">Pending</span></p>
//           <p><strong>Submission Date:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
//         </div>
//         <p>Please review and assign this request to appropriate staff member.</p>
//       `;

//       await sendStatusMail({
//         to: "sandraps@jecc.ac.in",
//         subject: "📋 New Repair Request Created - PROCCMS",
//         text: `A new repair request has been created by ${username} from ${department}. Request ID: ${savedRequest._id}`,
//         html: getEmailTemplate("New Repair Request Created", emailContent)
//       });
//     } catch (emailError) {
//       console.error("Failed to send creation email:", emailError.message);
//       // Don't fail the request if email fails
//     }

//     res.status(201).json(savedRequest);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

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
        const staffEmailContent = `
          <p>Dear <strong>${staff.name}</strong>,</p>
          <p>A repair request has been assigned to you for action.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Request ID:</strong> ${existing._id}</p>
            <p><strong>Requested By:</strong> ${existing.username}</p>
            <p><strong>Department:</strong> ${existing.department}</p>
            <p><strong>Description:</strong> ${existing.description}</p>
            <p><strong>Priority:</strong> ${existing.priority || "Normal"}</p>
            <p><strong>Status:</strong> <span class="status-badge assigned">Assigned</span></p>
          </div>
          <p>Please log in to the PROCCMS system to update the status and add remarks.</p>
        `;

        await sendStatusMail({
          to: staff.email,
          subject: "📌 Repair Request Assigned to You - PROCCMS",
          text: `Dear ${staff.name}, repair request ${existing._id} has been assigned to you.`,
          html: getEmailTemplate("Repair Request Assigned", staffEmailContent)
        });

        // Email to project about assignment
        const projectEmailContent = `
          <p>A repair request has been assigned to a staff member.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Request ID:</strong> ${existing._id}</p>
            <p><strong>Assigned To:</strong> ${staff.name}</p>
            <p><strong>Requested By:</strong> ${existing.username}</p>
            <p><strong>Department:</strong> ${existing.department}</p>
            <p><strong>Description:</strong> ${existing.description}</p>
            <p><strong>Status:</strong> <span class="status-badge assigned">Assigned</span></p>
          </div>
        `;

        await sendStatusMail({
          to: "sandraps@jecc.ac.in",
          subject: "👤 Repair Request Assigned - PROCCMS",
          text: `Repair request ${existing._id} assigned to ${staff.name}.`,
          html: getEmailTemplate("Repair Request Assigned", projectEmailContent)
        });

        // Email to requester about assignment
        if (existing.email) {
          const requesterEmailContent = `
            <p>Dear <strong>${existing.username}</strong>,</p>
            <p>Your repair request has been assigned to a staff member and is being processed.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Request ID:</strong> ${existing._id}</p>
              <p><strong>Assigned To:</strong> ${staff.name}</p>
              <p><strong>Description:</strong> ${existing.description}</p>
              <p><strong>Status:</strong> <span class="status-badge assigned">In Progress</span></p>
            </div>
            <p>You will receive further updates as the request progresses.</p>
          `;

          await sendStatusMail({
            to: existing.email,
            subject: "🔄 Repair Request Assigned - PROCCMS",
            text: `Your repair request has been assigned to ${staff.name}.`,
            html: getEmailTemplate("Request Assigned to Staff", requesterEmailContent)
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
        const requesterCompletionContent = `
          <p>Dear <strong>${existing.username}</strong>,</p>
          <p>Your repair request has been completed successfully.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Request ID:</strong> ${existing._id}</p>
            <p><strong>Description:</strong> ${existing.description}</p>
            <p><strong>Completed By:</strong> ${existing.assignedTo || "Technical Staff"}</p>
            <p><strong>Completion Date:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            <p><strong>Status:</strong> <span class="status-badge completed">Completed</span></p>
          </div>
          <p>Please verify the work and contact the project office if any issues persist.</p>
        `;

        completionEmails.push(
          sendStatusMail({
            to: existing.email,
            subject: "✅ Repair Request Completed - PROCCMS",
            text: `Your repair request ${existing._id} has been completed.`,
            html: getEmailTemplate("Repair Request Completed", requesterCompletionContent)
          })
        );
      }

      // Email to project
      const projectCompletionContent = `
        <p>A repair request has been marked as completed by the assigned staff.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Request ID:</strong> ${existing._id}</p>
          <p><strong>Requested By:</strong> ${existing.username}</p>
          <p><strong>Department:</strong> ${existing.department}</p>
          <p><strong>Description:</strong> ${existing.description}</p>
          <p><strong>Completed By:</strong> ${existing.assignedTo || "Technical Staff"}</p>
          <p><strong>Completion Date:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          <p><strong>Status:</strong> <span class="status-badge completed">Completed</span></p>
        </div>
        <p>Please verify the completion and update the system accordingly.</p>
      `;

      completionEmails.push(
        sendStatusMail({
          to: "sandraps@jecc.ac.in",
          subject: "✅ Repair Request Completed - PROCCMS",
          text: `Repair request ${existing._id} completed by ${existing.assignedTo}.`,
          html: getEmailTemplate("Repair Request Completed", projectCompletionContent)
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
        const verificationContent = `
          <p>A repair request has been verified by the administration.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Request ID:</strong> ${existing._id}</p>
            <p><strong>Requested By:</strong> ${existing.username}</p>
            <p><strong>Department:</strong> ${existing.department}</p>
            <p><strong>Description:</strong> ${existing.description}</p>
            <p><strong>Completed By:</strong> ${existing.assignedTo || "Technical Staff"}</p>
            <p><strong>Completion Date:</strong> ${existing.completedAt ? new Date(existing.completedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : "N/A"}</p>
            <p><strong>Verification Date:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            <p><strong>Status:</strong> <span class="status-badge verified">Verified</span></p>
          </div>
          <p>This request is now closed in the system.</p>
        `;

        // Email to project office
        await sendStatusMail({
          to: "sandraps@jecc.ac.in",
          subject: "✅ Repair Request Verified - PROCCMS",
          text: `Repair request ${existing._id} verified by admin.`,
          html: getEmailTemplate("Repair Request Verified", verificationContent)
        });

        // Optional: Notify the requester
        if (existing.email) {
          const requesterVerificationContent = `
            <p>Dear <strong>${existing.username}</strong>,</p>
            <p>Your repair request has been verified by the administration and is now closed.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Request ID:</strong> ${existing._id}</p>
              <p><strong>Description:</strong> ${existing.description}</p>
              <p><strong>Verified Date:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              <p><strong>Status:</strong> <span class="status-badge verified">Verified & Closed</span></p>
            </div>
            <p>Thank you for using PROCCMS services.</p>
          `;

          await sendStatusMail({
            to: existing.email,
            subject: "✅ Repair Request Verified - PROCCMS",
            text: `Your repair request ${existing._id} has been verified.`,
            html: getEmailTemplate("Request Verified", requesterVerificationContent)
          });
        }

        console.log("Verification email sent successfully");
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError.message);
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add remarks to a repair request
// Add remarks to a repair request with email notifications
router.post('/:id/remarks', async (req, res) => {
  try {
    const { text, enteredBy, userRole } = req.body;
    const requestId = req.params.id;

    // Find the request first to get details
    const request = await RepairRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Repair request not found" });
    }

    const updatedRequest = await RepairRequest.findByIdAndUpdate(
      requestId,
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

    // Send email notifications based on who added the remark
    try {
      if (userRole === "admin" || userRole === "staff") {
        // Admin/Staff added remark - notify requester
        if (request.email) {
          const adminRemarkContent = `
            <p>Dear <strong>${request.username}</strong>,</p>
            <p>A new remark has been added to your repair request by ${enteredBy}.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Request ID:</strong> ${request._id}</p>
              <p><strong>Description:</strong> ${request.description}</p>
              <p><strong>Status:</strong> <span class="status-badge ${request.status.toLowerCase()}">${request.status}</span></p>
              <p><strong>New Remark:</strong> ${text}</p>
              <p><strong>Added By:</strong> ${enteredBy}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            </div>
            <p>Please log in to the PROCCMS system to view details and respond if needed.</p>
          `;

          await sendStatusMail({
            to: request.email,
            subject: "💬 New Remark Added to Your Repair Request - PROCCMS",
            text: `A new remark has been added to your repair request (ID: ${request._id}) by ${enteredBy}. Remark: ${text}`,
            html: getEmailTemplate("New Remark Added", adminRemarkContent)
          });
        }

        // Also notify project office about the remark
        const projectRemarkContent = `
          <p>A new remark has been added to a repair request by ${enteredBy}.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Request ID:</strong> ${request._id}</p>
            <p><strong>Requested By:</strong> ${request.username}</p>
            <p><strong>Department:</strong> ${request.department}</p>
            <p><strong>Description:</strong> ${request.description}</p>
            <p><strong>Status:</strong> <span class="status-badge ${request.status.toLowerCase()}">${request.status}</span></p>
            <p><strong>New Remark:</strong> ${text}</p>
            <p><strong>Added By:</strong> ${enteredBy}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
        `;

        await sendStatusMail({
          to: "sandraps@jecc.ac.in",
          subject: "💬 Remark Added to Repair Request - PROCCMS",
          text: `A remark was added to request ${request._id} by ${enteredBy}.`,
          html: getEmailTemplate("Remark Added to Request", projectRemarkContent)
        });
      } else {
        // User added remark - notify admin/staff
        const userRemarkContent = `
          <p>A new remark has been added by the requester to their repair request.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Request ID:</strong> ${request._id}</p>
            <p><strong>Requested By:</strong> ${request.username}</p>
            <p><strong>Department:</strong> ${request.department}</p>
            <p><strong>Description:</strong> ${request.description}</p>
            <p><strong>Status:</strong> <span class="status-badge ${request.status.toLowerCase()}">${request.status}</span></p>
            <p><strong>New Remark:</strong> ${text}</p>
            <p><strong>Added By:</strong> ${enteredBy}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
          <p>Please review this remark in the PROCCMS system.</p>
        `;

        await sendStatusMail({
          to: "sandraps@jecc.ac.in",
          subject: "💬 User Added Remark to Repair Request - PROCCMS",
          text: `User ${request.username} added a remark to their request ${request._id}.`,
          html: getEmailTemplate("User Remark Added", userRemarkContent)
        });

        // Also notify assigned staff if there is one
        if (request.assignedTo && request.assignedTo !== "--- select ---") {
          const staff = await Staff.findOne({ name: request.assignedTo });
          if (staff?.email) {
            await sendStatusMail({
              to: staff.email,
              subject: "💬 User Added Remark to Assigned Request - PROCCMS",
              text: `User ${request.username} added a remark to request ${request._id} which is assigned to you.`,
              html: getEmailTemplate("User Remark Added to Your Request", userRemarkContent)
            });
          }
        }
      }
    } catch (emailError) {
      console.error("Failed to send remark notification email:", emailError.message);
      // Don't fail the request if email fails
    }

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