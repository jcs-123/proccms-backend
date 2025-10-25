import express from "express";
import { login, resetPassword, verifyToken } from "../controllers/authController.js";

const router = express.Router();

// ✅ Login
router.post("/login", login);

// ✅ Reset password
router.put("/reset-password", resetPassword);

// ✅ Verify token for every system login check
router.get("/verify", verifyToken);

export default router;


// const express = require('express');
// const router = express.Router();
// const { login } = require('../controllers/authController');

// router.post('/login', login);


// module.exports = router;
