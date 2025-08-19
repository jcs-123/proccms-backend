// utils/mailer.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "jcs@jecc.ac.in",       // Gmail ID
    pass: "womfcxrchvzfondh",     // Gmail App Password
  },
});

// verify transporter at startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Mailer connection failed:", error);
  } else {
    console.log("✅ Mailer is ready to send messages");
  }
});

export const sendStatusMail = async ({ to, subject, text, html }) => {
  try {
    console.log("📧 Preparing to send mail...");
    console.log("   ➡️ To:", to);
    console.log("   ➡️ Subject:", subject);

    const info = await transporter.sendMail({
      from: `"PROCCMS" <jcs@jecc.ac.in>`,
      to,
      subject,
      text,
      html,
    });

    console.log("✅ Email sent successfully!");
    console.log("   📩 Message ID:", info.messageId);
    console.log("   ✉️ Response:", info.response);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};
