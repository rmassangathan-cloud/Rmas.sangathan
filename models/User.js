const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define allowed roles with strict enum
const ALLOWED_ROLES = [
  'superadmin',
  'state_president',
  'state_secretary',
  'state_media_incharge',
  'division_president',
  'division_secretary',
  'division_media_incharge',
  'district_president',
  'district_secretary',
  'district_media_incharge',
  'block_president',
  'block_secretary',
  'block_media_incharge'
];

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  passwordHash: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: {
      values: ALLOWED_ROLES,
      message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}`
    },
    required: true
  },
  assignedLevel: { 
    type: String, 
    enum: {
      values: ['state', 'division', 'district', 'block'],
      message: 'assignedLevel must be one of: state, division, district, block'
    },
    required: function() { 
      return this.role !== 'superadmin'; 
    },
    validate: {
      validator: function() {
        // If role is superadmin, assignedLevel should not be set
        if (this.role === 'superadmin' && this.assignedLevel) {
          return false;
        }
        return true;
      },
      message: 'superadmin users should not have assignedLevel'
    }
  },
  assignedId: { 
    type: String,
    required: function() { 
      return this.role !== 'superadmin'; 
    },
    validate: {
      validator: function() {
        // If role is superadmin, assignedId should not be set
        if (this.role === 'superadmin' && this.assignedId) {
          return false;
        }
        return true;
      },
      message: 'superadmin users should not have assignedId'
    }
  },
  // Backward compatibility fields
  state: { 
    type: String, 
    default: 'Bihar' 
  },
  division: { 
    type: String 
  },
  districts: [{ 
    type: String 
  }],
  active: {
    type: Boolean,
    default: true
  },
  // Password reset and change tracking
  passwordChanged: {
    type: Boolean,
    default: false
  },
  resetToken: {
    type: String
  },
  resetTokenExpiry: {
    type: Date
  },
  otp: {
    type: String
  },
  otpExpiry: {
    type: Date
  },
  otpAttempts: {
    type: Number,
    default: 0
  },
  otpLastRequestTime: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true // Auto-update updatedAt
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
