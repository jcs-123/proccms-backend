import express from 'express';
import { login, resetPassword } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.put('/reset-password', resetPassword);

export default router;


// const express = require('express');
// const router = express.Router();
// const { login } = require('../controllers/authController');

// router.post('/login', login);


// module.exports = router;
