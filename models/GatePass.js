import mongoose from "mongoose";

const gatePassSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ["permanent", "temporary"],
    required: true,
  },
  department: {
    type: String,
    default: "",
  },
  issuedTo: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    required: true,
  },
  vehicleType: {
    type: String,
    default: "",
  },
  vehicleRegNo: {
    type: String,
    default: "",
  },
  items: {
    type: [String],
    required: true,
    validate: [arrayLimit, "At least one item is required"],
  },
}, { timestamps: true });

function arrayLimit(val) {
  return val.length > 0;
}

const GatePass = mongoose.model("GatePass", gatePassSchema);

export default GatePass;
