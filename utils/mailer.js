// utils/mailer.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "jcs@jecc.ac.in",
    pass: "womfcxrchvzfondh",
  },
});

export const sendStatusMail = async ({ to, subject, text, html, cc = [] }) => {
  try {
    const mailOptions = {
      from: `"PROCCMS" <jcs@jecc.ac.in>`,
      to,
      subject,
      text,
      html,
    };

    // Add CC recipients if provided
    if (cc && cc.length > 0) {
      mailOptions.cc = cc.join(',');
    }

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    throw error;
  }
};