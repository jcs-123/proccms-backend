import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "jcs@jecc.ac.in",       // your Gmail
    pass: "womfcxrchvzfondh",     // your Gmail App Password
  },
});

export const sendStatusMail = async ({ to, subject, text, html }) => {
  try {
    await transporter.sendMail({
      from: `"PROCCMS" <jcs@jecc.ac.in>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
  }
};
