import express from "express";
import { addStaff, getAllStaff } from "../controllers/staffController.js";

const router = express.Router();

router.post("/add", addStaff);
router.get("/", getAllStaff);

export default router;
