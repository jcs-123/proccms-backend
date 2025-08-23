import express from "express";
import RepairRequest from "../models/RepairRequest.js";
import { sendStatusMail } from "../utils/mailer.js";
import Staff from "../models/Staff.js";
import { upload, handleMulterError } from "../middleware/uploadMiddleware.js";
import fs from "fs";
import path from "path";

const router = express.Router();

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
router.post("/", upload.single("file"), handleMulterError, async (req, res) => {
  try {
    const { username, description, isNewRequirement, role, department, email } = req.body;
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : "";

    console.log('📁 File upload details:', {
      originalName: req.file?.originalname,
      savedAs: req.file?.filename,
      fileUrl: fileUrl,
      fileSize: req.file?.size
    });

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
      const emailContent = `
        <p>A new repair request has been submitted through the PROCCMS system.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Request ID:</strong> ${savedRequest._id}</p>
          <p><strong>Requested By:</strong> ${username}</p>
          <p><strong>Department:</strong> ${department}</p>
          <p><strong>Request Type:</strong> ${isNewRequirement ? "New Requirement" : "Repair Request"}</p>
          <p><strong>Description:</strong> ${description}</p>
          ${fileUrl ? `<p><strong>Attachment:</strong> <a href="${process.env.BASE_URL || 'http://localhost:5000'}${fileUrl}">View File</a></p>` : ''}
          <p><strong>Status:</strong> <span class="status-badge pending">Pending</span></p>
          <p><strong>Submission Date:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        </div>
        <p>Please review and assign this request to appropriate staff member.</p>
      `;

      await sendStatusMail({
        to: "sandraps@jecc.ac.in",
        subject: "📋 New Repair Request Created - PROCCMS",
        text: `A new repair request has been created by ${username} from ${department}. Request ID: ${savedRequest._id}`,
        html: getEmailTemplate("New Repair Request Created", emailContent)
      });
    } catch (emailError) {
      console.error("Failed to send creation email:", emailError.message);
      // Don't fail the request if email fails
    }

    res.status(201).json(savedRequest);
  } catch (err) {
    console.error("Error creating repair request:", err);
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
    
    // Verify file existence for each request
    const requestsWithFileCheck = await Promise.all(
      requests.map(async (request) => {
        const requestObj = request.toObject();
        if (requestObj.fileUrl) {
          const filePath = path.join(process.cwd(), requestObj.fileUrl);
          requestObj.fileExists = fs.existsSync(filePath);
          
          if (!requestObj.fileExists) {
            console.warn(`⚠️ File not found: ${filePath}`);
          }
        }
        return requestObj;
      })
    );
    
    res.json(requestsWithFileCheck);
  } catch (err) {
    console.error("Error fetching repair requests:", err);
    res.status(500).json({ message: "Failed to get repair requests" });
  }
});

// ... (rest of your routes remain similar but add proper error handling)

export default router;