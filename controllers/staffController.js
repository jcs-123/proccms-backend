import Staff from "../models/Staff.js";

export const addStaff = async (req, res) => {
  try {
    const { name, username, password, department, email, phone } = req.body;

    if (!name || !username || !password || !department) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newStaff = new Staff({ name, username, password, department, email, phone });
    await newStaff.save();

    res.json({ message: "Staff added successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllStaff = async (req, res) => {
  try {
    const staffList = await Staff.find().sort({ createdAt: -1 });
    res.json(staffList);
  } catch (err) {
    res.status(500).json({ message: "Failed to get staff list" });
  }
};




// const Staff = require("../models/Staff");

// const addStaff = async (req, res) => {
//   try {
//     const { name, username, password, department, email, phone } = req.body;

//     if (!name || !username || !password || !department) {
//       return res.status(400).json({ message: "All fields are required" });
//     }


//     // You may also want to validate email and phone format here

//     const newStaff = new Staff({ name, username, password, department, email, phone });
//     await newStaff.save();

//     res.json({ message: "Staff added successfully" });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };


// const getAllStaff = async (req, res) => {
//   try {
//     const staffList = await Staff.find().sort({ createdAt: -1 });
//     res.json(staffList);
//   } catch (err) {
//     res.status(500).json({ message: "Failed to get staff list" });
//   }
// };


// module.exports = { addStaff, getAllStaff };
