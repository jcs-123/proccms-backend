import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import staffRoutes from './routes/staffRoutes.js';
import authRoutes from './routes/authRoutes.js';
import repairRequestRoutes from './routes/repairRequestRoutes.js';
import gatePassRoutes from "./routes/gatePassRoutes.js";
import vehicleRoutes from './routes/vehicleRoutes.js';
import roomBookingRoutes from './routes/roomBooking.js';
import adminDashboardRoutes from './routes/adminDashboard.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ CRITICAL: Ensure uploads directory exists at the correct path
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory at:", uploadsDir);
} else {
  console.log("✅ Uploads directory already exists at:", uploadsDir);
}

// Middleware
app.use(cors());
app.use(express.json());

// ✅ CRITICAL: Serve uploaded files from the correct path
app.use("/uploads", express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    // Set proper caching headers for uploaded files
    if (path.extname(filePath) === '.png' || 
        path.extname(filePath) === '.jpg' || 
        path.extname(filePath) === '.jpeg') {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    }
  }
}));

// Routes
app.use('/api/staff', staffRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/repair-requests', repairRequestRoutes);
app.use("/api/gatepass", gatePassRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/room-booking', roomBookingRoutes);
app.use('/api/admin', adminDashboardRoutes);

// ✅ Health check endpoint with upload directory status
app.get("/health", (req, res) => {
  const uploadsStatus = fs.existsSync(uploadsDir) ? 
    "✅ Uploads directory exists" : 
    "❌ Uploads directory missing";
  
  // Check if we can read from the uploads directory
  let canReadUploads = false;
  let files = [];
  try {
    files = fs.readdirSync(uploadsDir);
    canReadUploads = true;
  } catch (error) {
    console.error("Cannot read uploads directory:", error);
  }
  
  res.json({
    status: "Server is running",
    uploadsDirectory: uploadsStatus,
    uploadsPath: uploadsDir,
    readable: canReadUploads,
    files: files,
    timestamp: new Date().toISOString()
  });
});

// Test file serving endpoint
app.get("/test-upload", (req, res) => {
  const testFilePath = path.join(uploadsDir, "test.txt");
  
  try {
    // Create a test file
    fs.writeFileSync(testFilePath, "This is a test file for verifying uploads directory");
    
    res.json({
      message: "Test file created",
      path: testFilePath,
      url: "/uploads/test.txt"
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to create test file",
      message: error.message
    });
  }
});

// Root
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>PROCCMS Backend</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .status { color: green; font-weight: bold; }
          .error { color: red; }
          .endpoints { margin-top: 20px; }
          .endpoint { margin: 5px 0; padding: 5px; background: #f5f5f5; }
          code { background: #eee; padding: 2px 5px; }
        </style>
      </head>
      <body>
        <h1>PROCCMS Backend is running</h1>
        <p class="status">✅ Server is operational</p>
        <p>Uploads directory: <code>${uploadsDir}</code></p>
        <p>Uploads status: ${fs.existsSync(uploadsDir) ? '<span class="status">✅ Exists</span>' : '<span class="error">❌ Missing</span>'}</p>
        
        <div class="endpoints">
          <h3>Available API Endpoints:</h3>
          <div class="endpoint"><strong>GET</strong> <a href="/health">/health</a> - Server health check</div>
          <div class="endpoint"><strong>GET</strong> <a href="/test-upload">/test-upload</a> - Test file upload</div>
          <div class="endpoint"><strong>POST</strong> /api/repair-requests - Create repair request</div>
          <div class="endpoint"><strong>GET</strong> /api/repair-requests - Get repair requests</div>
          <div class="endpoint"><strong>POST</strong> /api/auth/login - User authentication</div>
          <div class="endpoint"><strong>GET</strong> /api/staff - Staff management</div>
          <div class="endpoint"><strong>POST</strong> /api/gatepass - Gate pass requests</div>
          <div class="endpoint"><strong>GET</strong> /api/vehicles - Vehicle management</div>
          <div class="endpoint"><strong>POST</strong> /api/room-booking - Room booking</div>
          <div class="endpoint"><strong>GET</strong> /api/admin - Admin dashboard</div>
        </div>
        
        <p style="margin-top: 30px;">
          <a href="/health">Check server health</a> | 
          <a href="/test-upload">Test uploads directory</a>
        </p>
      </body>
    </html>
  `);
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

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Test upload: http://localhost:${PORT}/test-upload`);
  console.log(`📊 Server status: http://localhost:${PORT}/`);
});

// import express from "express";
// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import cors from "cors";
// import path from "path";
// import { fileURLToPath } from "url";
// import fs from "fs"; // Added for directory creation

// import staffRoutes from './routes/staffRoutes.js';
// import authRoutes from './routes/authRoutes.js';
// import repairRequestRoutes from './routes/repairRequestRoutes.js';
// import gatePassRoutes from "./routes/gatePassRoutes.js";
// import vehicleRoutes from './routes/vehicleRoutes.js';
// import roomBookingRoutes from './routes/roomBooking.js';
// import adminDashboardRoutes from './routes/adminDashboard.js';

// dotenv.config();

// const app = express();
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // ✅ CRITICAL: Ensure uploads directory exists at the correct path
// const uploadsDir = path.join(__dirname, "uploads");
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
//   console.log("✅ Created uploads directory at:", uploadsDir);
// } else {
//   console.log("✅ Uploads directory already exists at:", uploadsDir);
// }

// // Middleware
// app.use(cors());
// app.use(express.json());

// // ✅ CRITICAL: Serve uploaded files from the correct path
// app.use("/uploads", express.static(uploadsDir, {
//   setHeaders: (res, filePath) => {
//     // Set proper caching headers for uploaded files
//     if (path.extname(filePath) === '.png' || 
//         path.extname(filePath) === '.jpg' || 
//         path.extname(filePath) === '.jpeg') {
//       res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
//     }
//   }
// }));

// // Routes
// app.use('/api/staff', staffRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/repair-requests', repairRequestRoutes);
// app.use("/api/gatepass", gatePassRoutes);
// app.use('/api/vehicles', vehicleRoutes);
// app.use('/api/room-booking', roomBookingRoutes);
// app.use('/api/admin', adminDashboardRoutes);

// // ✅ Health check endpoint with upload directory status
// app.get("/health", (req, res) => {
//   const uploadsStatus = fs.existsSync(uploadsDir) ? 
//     "✅ Uploads directory exists" : 
//     "❌ Uploads directory missing";
  
//   // Check if we can read from the uploads directory
//   let canReadUploads = false;
//   try {
//     fs.readdirSync(uploadsDir);
//     canReadUploads = true;
//   } catch (error) {
//     console.error("Cannot read uploads directory:", error);
//   }
  
//   res.json({
//     status: "Server is running",
//     uploadsDirectory: uploadsStatus,
//     uploadsPath: uploadsDir,
//     readable: canReadUploads,
//     files: canReadUploads ? fs.readdirSync(uploadsDir) : [],
//     timestamp: new Date().toISOString()
//   });
// });

// // Test file serving endpoint
// app.get("/test-upload", (req, res) => {
//   const testFilePath = path.join(uploadsDir, "test.txt");
  
//   // Create a test file
//   fs.writeFileSync(testFilePath, "This is a test file for verifying uploads directory");
  
//   res.json({
//     message: "Test file created",
//     path: testFilePath,
//     url: "/uploads/test.txt"
//   });
// });

// // Root
// app.get("/", (req, res) => {
//   res.send(`
//     <html>
//       <head>
//         <title>PROCCMS Backend</title>
//         <style>
//           body { font-family: Arial, sans-serif; margin: 40px; }
//           .status { color: green; font-weight: bold; }
//           .error { color: red; }
//           .endpoints { margin-top: 20px; }
//           .endpoint { margin: 5px 0; padding: 5px; background: #f5f5f5; }
//           code { background: #eee; padding: 2px 5px; }
//         </style>
//       </head>
//       <body>
//         <h1>PROCCMS Backend is running</h1>
//         <p class="status">✅ Server is operational</p>
//         <p>Uploads directory: <code>${uploadsDir}</code></p>
//         <p>Uploads status: ${fs.existsSync(uploadsDir) ? '<span class="status">✅ Exists</span>' : '<span class="error">❌ Missing</span>'}</p>
        
//         <div class="endpoints">
//           <h3>Available API Endpoints:</h3>
//           <div class="endpoint"><strong>GET</strong> <a href="/health">/health</a> - Server health check</div>
//           <div class="endpoint"><strong>GET</strong> <a href="/test-upload">/test-upload</a> - Test file upload</div>
//           <div class="endpoint"><strong>POST</strong> /api/repair-requests - Create repair request</div>
//           <div class="endpoint"><strong>GET</strong> /api/repair-requests - Get repair requests</div>
//           <div class="endpoint"><strong>POST</strong> /api/auth/login - User authentication</div>
//           <div class="endpoint"><strong>GET</strong> /api/staff - Staff management</div>
//           <div class="endpoint"><strong>POST</strong> /api/gatepass - Gate pass requests</div>
//           <div class="endpoint"><strong>GET</strong> /api/vehicles - Vehicle management</div>
//           <div class="endpoint"><strong>POST</strong> /api/room-booking - Room booking</div>
//           <div class="endpoint"><strong>GET</strong> /api/admin - Admin dashboard</div>
//         </div>
        
//         <p style="margin-top: 30px;">
//           <a href="/health">Check server health</a> | 
//           <a href="/test-upload">Test uploads directory</a>
//         </p>
//       </body>
//     </html>
//   `);
// });

// // MongoDB connection
// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log("✅ MongoDB Connected");
//   } catch (error) {
//     console.error("❌ MongoDB connection failed:", error.message);
//     process.exit(1);
//   }
// };

// connectDB();

// // Error handling for uncaught exceptions
// process.on('uncaughtException', (error) => {
//   console.error('❌ Uncaught Exception:', error);
// });

// process.on('unhandledRejection', (reason, promise) => {
//   console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`📁 Uploads directory: ${uploadsDir}`);
//   console.log(`🔗 Health check: http://localhost:${PORT}/health`);
//   console.log(`🔗 Test upload: http://localhost:${PORT}/test-upload`);
//   console.log(`📊 Server status: http://localhost:${PORT}/`);
// });