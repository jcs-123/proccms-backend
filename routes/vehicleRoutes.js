import express from 'express';
import VehiclePass from '../models/VehiclePass.js';

const router = express.Router();

// Get all passes
router.get('/', async (req, res) => {
  try {
    const passes = await VehiclePass.find();
    res.json(passes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pass by ID
router.get('/:id', async (req, res) => {
  try {
    const pass = await VehiclePass.findById(req.params.id);
    if (!pass) return res.status(404).json({ error: 'Pass not found' });
    res.json(pass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new pass
router.post('/', async (req, res) => {
  try {
    const newPass = new VehiclePass(req.body);
    await newPass.save();
    res.status(201).json(newPass);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update pass by ID
router.put('/:id', async (req, res) => {
  try {
    const updatedPass = await VehiclePass.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedPass) return res.status(404).json({ error: 'Pass not found' });
    res.json(updatedPass);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;




// const express = require('express');
// const router = express.Router();
// const VehiclePass = require('../models/VehiclePass');

// // Get all passes
// router.get('/', async (req, res) => {
//   try {
//     const passes = await VehiclePass.find();
//     res.json(passes);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Get pass by ID
// router.get('/:id', async (req, res) => {
//   try {
//     const pass = await VehiclePass.findById(req.params.id);
//     if (!pass) return res.status(404).json({ error: 'Pass not found' });
//     res.json(pass);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Create new pass
// router.post('/', async (req, res) => {
//   try {
//     const newPass = new VehiclePass(req.body);
//     await newPass.save();
//     res.status(201).json(newPass);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// // Update pass by ID
// router.put('/:id', async (req, res) => {
//   try {
//     const updatedPass = await VehiclePass.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true, runValidators: true }
//     );
//     if (!updatedPass) return res.status(404).json({ error: 'Pass not found' });
//     res.json(updatedPass);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// module.exports = router;
