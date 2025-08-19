import nodemailer from "nodemailer";

// Create reusable transporter object
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "jcs@jecc.ac.in",
    pass: process.env.EMAIL_PASSWORD || "womfcxrchvzfondh",
  },
  tls: {
    rejectUnauthorized: false // For local testing only, remove in production
  }
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Mail server connection failed:", error);
  } else {
    console.log("✅ Mail server is ready to send messages");
  }
});

export const sendStatusMail = async (mailOptions) => {
  try {
    const defaultOptions = {
      from: `"PROCCMS" <${process.env.EMAIL_USER || "jcs@jecc.ac.in"}>`,
      subject: "PROCCMS Notification",
    };

    const info = await transporter.sendMail({
      ...defaultOptions,
      ...mailOptions
    });

    console.log("✅ Email sent to:", mailOptions.to);
    console.log("📧 Message ID:", info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error("❌ Email send error:", {
      to: mailOptions.to,
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
};