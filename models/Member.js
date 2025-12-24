const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  fatherName: { type: String },
  dob: { type: Date },
  gender: { type: String },
  mobile: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  state: { type: String },
  district: { type: String },
  block: { type: String },
  village: { type: String },
  houseNo: { type: String },
  street: { type: String },
  panchayat: { type: String },
  pincode: { type: String },
  occupation: { type: String },
  education: { type: String },
  idNumber: { type: String },
  photoUrl: { type: String },
  documentsUrl: { type: String },
  // workflow fields
  status: { type: String, enum: ['pending','accepted','rejected','escalated'], default: 'pending' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedDistrict: { type: String },
  history: [{ by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: String, action: String, note: String, date: { type: Date, default: Date.now } }],
  bloodGroup: { type: String },
  reason: { type: String, required: true },
  agreedToTerms: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Member', memberSchema);
