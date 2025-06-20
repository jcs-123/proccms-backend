import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  email: { type: String, unique: true }, // not required
  phone: { type: String }                // not required
}, { timestamps: true });

const Staff = mongoose.model('Staff', staffSchema);
export default Staff;
