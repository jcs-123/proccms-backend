import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import staffRoutes from './routes/staffRoutes.js';
import authRoutes from './routes/authRoutes.js';
import repairRequestRoutes from './routes/repairRequestRoutes.js'; // ✅ NEW
import gatePassRoutes from "./routes/gatePassRoutes.js";
import vehicleRoutes from './routes/vehicleRoutes.js';
import roomBookingRoutes from './routes/roomBooking.js';
import adminDashboardRoutes from './routes/adminDashboard.js';
import testMailRoutes from "./routes/testMail.js";



dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use('/api/staff', staffRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/repair-requests', repairRequestRoutes); // ✅ NEW
app.use("/api/gatepass", gatePassRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/room-booking', roomBookingRoutes);
app.use('/api/admin',adminDashboardRoutes);

app.use("/api/test", testMailRoutes);

// Root
app.get("/", (req, res) => {
  res.send("PROCCMS Backend is running");
});

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
