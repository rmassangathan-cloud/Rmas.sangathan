const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'state_president', 'state_secretary', 'state_media_incharge', 'division_president', 'division_secretary', 'division_media_incharge', 'district_president', 'district_secretary', 'district_media_incharge'], default: 'district_president' },
  assignedLevel: { type: String, enum: ['state', 'division', 'district', 'block'], required: function() { return this.role !== 'superadmin'; } }, // Level of assignment
  assignedId: { type: String, required: function() { return this.role !== 'superadmin'; } }, // ID of the assigned entity (state name, division name, district name, block name)
  state: { type: String, default: 'Bihar' }, // Keep for backward compatibility
  division: { type: String }, // Keep for backward compatibility
  districts: [{ type: String }], // Keep for backward compatibility
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

userSchema.methods.setPassword = async function(password) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
};

userSchema.methods.validatePassword = async function(password) {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
