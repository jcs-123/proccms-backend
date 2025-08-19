import express from "express";
import { sendStatusMail } from "../utils/mailer.js";

const router = express.Router();

// GET route for testing
router.get("/send-test-mail", async (req, res) => {
  try {
    await sendStatusMail({
      to: "receiver@example.com", // replace with your test mail
      subject: "Test Email from PROCCMS",
      text: "This is a plain text test email.",
      html: "<h3>Hello 👋</h3><p>This is a <b>test email</b> from PROCCMS.</p>",
    });

    res.json({ success: true, message: "Test email sent successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
