import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // NOT hashed
  name: { type: String, required: true },
  phone: { type: String, required: true },
  department: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, default: "admin" }
});

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
