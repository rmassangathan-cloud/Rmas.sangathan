const mongoose = require('mongoose');

const DownloadOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: false },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  token: { type: String },
  tokenExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// TTL index will auto-delete expired OTP docs (MongoDB requires a single-field date for expireAfterSeconds)
DownloadOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Also remove token docs after tokenExpires
DownloadOtpSchema.index({ tokenExpires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('DownloadOtp', DownloadOtpSchema);
