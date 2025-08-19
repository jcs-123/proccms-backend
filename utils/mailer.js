import nodemailer from "nodemailer";

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "jcs@jecc.ac.in", // your Gmail address
    pass: "womfcxrchvzfondh", // your App Password (NOT Gmail password)
  },
});

// Send Mail Function
export const sendStatusMail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"PROCCMS" <jcs@jecc.ac.in>`,
      to,
      subject,
      text,
      html,
    });
    console.log("✅ Mail sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};
