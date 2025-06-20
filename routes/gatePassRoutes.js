import express from "express";
import GatePass from "../models/GatePass.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const gatePass = new GatePass(req.body);
    await gatePass.save();
    res.status(201).json(gatePass);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const passes = await GatePass.find();
    res.json(passes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const gatePass = await GatePass.findById(req.params.id);
    if (!gatePass) {
      return res.status(404).json({ message: "Gate Pass not found" });
    }
    res.json(gatePass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.put("/:id", async (req, res) => {
  try {
    const updatedGatePass = await GatePass.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedGatePass) {
      return res.status(404).json({ message: "Gate Pass not found" });
    }
    res.json(updatedGatePass);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
