import mongoose from 'mongoose';

const remarkSchema = new mongoose.Schema({
  text: { type: String, required: true },
  enteredBy: { type: String, required: true },
  date: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: String },
  verifiedAt: { type: Date },
  seen: { type: Boolean, default: false },
});

const repairRequestSchema = new mongoose.Schema({
  username: { type: String, required: true },
  department: { type: String, required: true },
  email: { type: String },
  mobile: { type: String },
  description: { type: String, required: true },
  isNewRequirement: { type: Boolean, default: false },
  role: { type: String, required: true },
  fileUrl: { type: String },
  status: { type: String, default: 'Pending' },
  assignedTo: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: String },
  verifiedAt: { type: Date },
  completedAt: { type: Date },
  remarks: [remarkSchema],
  createdAt: { type: Date, default: Date.now },
  remark: [
    {
      text: String,
      enteredBy: String,
      date: { type: Date, default: Date.now },

    }
  ]

});

const RepairRequest = mongoose.model('RepairRequest', repairRequestSchema);
export default RepairRequest;