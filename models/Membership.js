const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  fatherName: { type: String },
  dob: { type: Date },
  gender: { type: String },
  mobile: { type: String, required: true },
  email: { type: String },
  bloodGroup: { type: String },
  education: { type: String },
  occupation: { type: String },
  idNumber: { type: String },
  state: { type: String },
  houseNo: { type: String },
  street: { type: String },
  panchayat: { type: String },
  village: { type: String },
  pincode: { type: String },
  district: { type: String },
  division: { type: String }, // Auto-assigned based on district
  block: { type: String },
  photo: { type: String },
  documentsUrl: { type: String },
  characterCertUrl: { type: String },
  reason: { type: String, required: true },
  agreedToTerms: { type: Boolean, default: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  membershipId: { type: String },
  pdfUrl: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedDistrict: { type: String },
  teamType: { type: String, enum: ['core', 'mahila', 'yuva', 'alpsankhyak', 'scst'], default: 'core' },
  jobRole: { type: String },
  history: [{
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String,
    action: { type: String, enum: ['submitted', 'accepted', 'rejected', 'role_assigned'] },
    note: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Membership', membershipSchema);
