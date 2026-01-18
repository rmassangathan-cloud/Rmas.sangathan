const mongoose = require('mongoose');

const AuditSchema = new mongoose.Schema({
  // Action details
  action: {
    type: String,
    required: true,
    enum: [
      // Auth actions
      'login', 'logout', 'forgot_password', 'reset_password', 'password_reset_via_otp',
      // User management
      'user_created', 'user_edited', 'user_deleted', 'user_deactivated', 'user_reactivated',
      // Role management
      'role_assigned', 'role_changed', 'permission_changed',
      // Form/Membership
      'form_submitted', 'form_accepted', 'form_rejected', 'form_claimed', 'form_released',
      // Documents
      'joining_letter_downloaded', 'id_card_downloaded', 'joining_letter_generated', 'id_card_generated',
      // Other
      'data_exported', 'report_generated', 'settings_changed'
    ]
  },
  
  // Who performed the action
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  performedByEmail: String,
  performedByName: String,
  performedByRole: String,
  performedByLevel: {
    type: String,
    enum: ['superadmin', 'state', 'division', 'district', 'block'],
    default: 'block'
  },
  performedByLevelId: String, // e.g., state name, division name, district name, block name
  
  // What was affected
  targetId: mongoose.Schema.Types.ObjectId,
  targetType: {
    type: String,
    enum: ['User', 'Membership', 'Form', 'Document', 'Other']
  },
  targetName: String, // e.g., user name, membership ID
  
  // Additional details
  details: mongoose.Schema.Types.Mixed, // Flexible for different action types
  
  // Request information
  ipAddress: String,
  userAgent: String,
  
  // Cascade/Location information
  level: {
    type: String,
    enum: ['superadmin', 'state', 'division', 'district', 'block']
  },
  levelId: String, // state name, division name, district name, block name
  
  // Optional note
  note: String,
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { 
  timestamps: true,
  collection: 'audits'
});

// Index for common queries
AuditSchema.index({ action: 1, timestamp: -1 });
AuditSchema.index({ performedBy: 1, timestamp: -1 });
AuditSchema.index({ targetId: 1, timestamp: -1 });
AuditSchema.index({ level: 1, levelId: 1, timestamp: -1 });
AuditSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Audit', AuditSchema);
