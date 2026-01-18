const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
  // Content Details
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    trim: true
  },
  
  // Media Type
  mediaType: {
    type: String,
    enum: ['text', 'photo', 'video'],
    required: true
  },
  
  // Media File
  mediaUrl: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number // in bytes
  },
  mimeType: {
    type: String
  },
  
  // Uploader Info
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedByName: String,
  uploadedByEmail: String,
  uploadedByRole: String,
  
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  
  // Status & Approval
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedByName: String,
  approvedByEmail: String,
  approvedByRole: String,
  
  approvedAt: Date,
  
  // Cascade Level Info
  level: {
    type: String,
    enum: ['superadmin', 'state', 'division', 'district', 'block'],
    required: true
  },
  levelId: String, // state name, division name, district name, etc.
  
  // Additional Info
  note: String,
  rejectionReason: String,
  
  // Metadata
  views: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: ['news', 'event', 'announcement', 'resource', 'other'],
    default: 'other'
  },
  
  tags: [String]
}, { 
  timestamps: true,
  collection: 'contents'
});

// Indexes for common queries
ContentSchema.index({ uploadedBy: 1, status: 1, uploadedAt: -1 });
ContentSchema.index({ status: 1, level: 1, levelId: 1, uploadedAt: -1 });
ContentSchema.index({ uploadedAt: -1 });
ContentSchema.index({ level: 1, levelId: 1, uploadedAt: -1 });

module.exports = mongoose.model('Content', ContentSchema);
