import mongoose from 'mongoose';

const roomBookingSchema = new mongoose.Schema(
  {
    username: { type: String, required: true }, // requesting user
    department: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    roomType: { type: String, required: true },
    date: { type: String, required: true },
    timeFrom: { type: String, required: true },
    timeTo: { type: String, required: true },
    purpose: { type: String, required: true },
    facilities: [String],
    tablesWithCloth: { type: Number, default: 0 },
    tablesWithoutCloth: { type: Number, default: 0 },
    executiveChairs: { type: Number, default: 0 },
    participantChairs: { type: Number, default: 0 },
    additionalChairs: { type: Number, default: 0 },
    remarks: { type: String },
    agreed: { type: Boolean, required: true },
    assignedStaff: { type: String }, // staff username
    status: { type: String, default: 'Pending' },
    adminRemarks: { type: String }, // Add this line
    userRemarks: { type: String }, // Add this line


  },
  {
    timestamps: true,
  }
);

export default mongoose.model('RoomBooking', roomBookingSchema);
