// utils/mailer.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "jcs@jecc.ac.in",           // your Gmail ID
    pass: "womfcxrchvzfondh",         // App Password (from Google)
  },
});

export const sendStatusMail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"PROCCMS" <jcs@jecc.ac.in>`,
      to,
      subject,
      text,
      html,
    });

    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    throw error;
  }
};
