import mongoose from 'mongoose';

const VehiclePassSchema = new mongoose.Schema({
  passNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
  },
  staffCode: {
    type: String,
    required: true,
    trim: true,
  },
  issuedTo: {
    type: String,
    required: true,
    trim: true,
  },
  classOrDept: {
    type: String,
    required: true,
    trim: true,
  },
  rcOwner: {
    type: String,
    required: true,
    trim: true,
  },
  rcNo: {
    type: String,
    default: '',
    trim: true,
  },
  vehicleReg: {
    type: String,
    required: true,
    trim: true,
  },
  vehicleType: {
    type: String,
    required: true,
    trim: true,
  },
  licenseNo: {
    type: String,
    default: '',
    trim: true,
  },
  authorization: {
    type: String,
    required: true,
    trim: true,
  },
  remarks: {
    type: String,
    default: '',
    trim: true,
  },
}, {
  timestamps: true,
});

const VehiclePass = mongoose.model('VehiclePass', VehiclePassSchema);
export default VehiclePass;



// // models/VehiclePass.js
// const mongoose = require('mongoose');

// const VehiclePassSchema = new mongoose.Schema({
//   passNo: {
//     type: String,
//     required: true,
//     unique: true,
//     trim: true,
//   },
//   date: {
//     type: Date,
//     required: true,
//   },
//   staffCode: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   issuedTo: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   classOrDept: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   rcOwner: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   rcNo: {
//     type: String,
//     default: '',
//     trim: true,
//   },
//   vehicleReg: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   vehicleType: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   licenseNo: {
//     type: String,
//     default: '',
//     trim: true,
//   },
//   authorization: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   remarks: {
//     type: String,
//     default: '',
//     trim: true,
//   },
// }, {
//   timestamps: true,
// });

// module.exports = mongoose.model('VehiclePass', VehiclePassSchema);
