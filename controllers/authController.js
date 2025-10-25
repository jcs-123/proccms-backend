import User from '../models/User.js';
import Staff from '../models/Staff.js';
import Admin from '../models/Admin.js';



export const login = async (req, res) => {
  const { username, password } = req.body;

  // Admin login (hardcoded)
  const admin = await Admin.findOne({ username, password });
  if (admin) {
    return res.json({
      username: admin.username,
      role: admin.role,
      name: admin.name,
      phone: admin.phone,
      department: admin.department,
      email: admin.email,
      token: "admin-token"
    });
  }

  // User login (plaintext)
  const user = await User.findOne({ username, password });
  if (user) {
    return res.json({
      role: 'user',
      name: user.name,
      username: user.username,
      token: 'user-token',
      department: user.department,
      email: user.email,
      phone: user.phone,
      userId: user._id
    });
  }

  // Staff login
  const staff = await Staff.findOne({ username, password });
  if (staff) {
    return res.json({
      role: 'staff',
      name: staff.name,
      username: staff.username,
      token: 'staff-token',
      department: staff.department,
      email: staff.email,
      phone: staff.phone
    });
  }

  return res.status(401).json({ message: 'Invalid credentials' });
};

export const resetPassword = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // ✅ Admin password reset
    const admin = await Admin.findOne({ username });
    if (admin) {
      await Admin.updateOne({ username }, { $set: { password } });
      return res.status(200).json({ message: 'Admin password updated' });
    }

    // ✅ User password reset
    const user = await User.findOne({ username });
    if (user) {
      await User.updateOne({ username }, { $set: { password } });
      return res.status(200).json({ message: 'User password updated' });
    }

    // ✅ Staff password reset
    const staff = await Staff.findOne({ username });
    if (staff) {
      await Staff.updateOne({ username }, { $set: { password } });
      return res.status(200).json({ message: 'Staff password updated' });
    }

    return res.status(404).json({ message: 'User not found' });

  } catch (error) {
    console.error('🔥 Password reset error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};



export const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization;

    // 🔹 Simple static token check (since you’re not using JWT)
    if (token === "admin-token") {
      return res.status(200).json({ valid: true, role: "admin" });
    }
    if (token === "staff-token") {
      return res.status(200).json({ valid: true, role: "staff" });
    }
    if (token === "user-token") {
      return res.status(200).json({ valid: true, role: "user" });
    }

    // ❌ Token not valid
    return res.status(401).json({ valid: false });
  } catch (error) {
    console.error("🔥 Token verify error:", error);
    return res.status(500).json({ valid: false });
  }
};


// import User from '../models/User.js';
// import Staff from '../models/Staff.js';

// export const login = async (req, res) => {
//   const { username, password } = req.body;

//   // Admin login (hardcoded)
//   if (username === "JEC645" && password === "JEC645") {
//     return res.json({
//       username: "admin",
//       role: "admin",
//       name: "LT COL JACOB ED (RETD)",
//       phone: "9800454545",
//       department: "OFFICE",
//       email: "projectengineer@jecc.ac.in",
//       token: "admin-token"
//     });
//   }

//   // User login (plaintext)
//   const user = await User.findOne({ username, password });
//   if (user) {
//     return res.json({
//       role: 'user',
//       name: user.name,
//       username: user.username,
//       token: 'user-token',
//       department: user.department,
//       email: user.email,
//       phone: user.phone,
//       userId: user._id
//     });
//   }

//   // Staff login
//   const staff = await Staff.findOne({ username, password });
//   if (staff) {
//     return res.json({
//       role: 'staff',
//       name: staff.name,
//       username: staff.username,
//       token: 'staff-token',
//       department: staff.department,
//       email: staff.email,
//       phone: staff.phone
//     });
//   }

//   return res.status(401).json({ message: 'Invalid credentials' });
// };

// export const resetPassword = async (req, res) => {
//   const { username, password } = req.body;

//   try {
//     if (!username || !password) {
//       return res.status(400).json({ message: 'Username and password are required' });
//     }

//     const user = await User.findOne({ username });
//     if (user) {
//       // Just update the password field, leave others untouched
//       await User.updateOne({ username }, { $set: { password } });
//       return res.status(200).json({ message: 'User password updated' });
//     }

//     const staff = await Staff.findOne({ username });
//     if (staff) {
//       await Staff.updateOne({ username }, { $set: { password } });
//       return res.status(200).json({ message: 'Staff password updated' });
//     }

//     return res.status(404).json({ message: 'User not found' });

//   } catch (error) {
//     console.error('🔥 Password reset error:', error);
//     return res.status(500).json({ message: 'Internal Server Error', error: error.message });
//   }
// };
