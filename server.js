import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import staffRoutes from './routes/staffRoutes.js';
import authRoutes from './routes/authRoutes.js';
import repairRequestRoutes from './routes/repairRequestRoutes.js';
import gatePassRoutes from "./routes/gatePassRoutes.js";
import vehicleRoutes from './routes/vehicleRoutes.js';
import roomBookingRoutes from './routes/roomBooking.js';
import adminDashboardRoutes from './routes/adminDashboard.js';
import errorHandler from './middleware/errorMiddleware.js';
import createUploadsDir from './utils/createUploadsDir.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory on server start
createUploadsDir();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files - THIS IS CRUCIAL FOR IMAGE PERSISTENCE
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Logging middleware to track file access
app.use("/uploads", (req, res, next) => {
  console.log(`📁 File access: ${req.url}`);
  next();
});

// Routes
app.use('/api/staff', staffRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/repair-requests', repairRequestRoutes);
app.use("/api/gatepass", gatePassRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/room-booking', roomBookingRoutes);
app.use('/api/admin', adminDashboardRoutes);

// Error handling middleware (should be last)
app.use(errorHandler);

// Root
app.get("/", (req, res) => {
  res.send("PROCCMS Backend is running");
});

// Health check endpoint
app.get("/health", (req, res) => {
  const uploadsDir = path.join(__dirname, "uploads");
  const uploadsExists = fs.existsSync(uploadsDir);
  
  res.json({
    status: "OK",
    uploadsDirectory: {
      exists: uploadsExists,
      path: uploadsDir,
      writable: uploadsExists ? true : false
    }
  });
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
  console.log(`📁 Upload directory: ${path.join(__dirname, "uploads")}`);
  console.log(`🌐 Access files at: http://localhost:${PORT}/uploads/`);
});