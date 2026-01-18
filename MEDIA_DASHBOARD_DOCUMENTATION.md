# 📺 Media Incharge Dashboard - Complete Implementation

## Overview
The Media Incharge Dashboard is a complete content management system integrated into the RMAS admin panel. It allows media incharges to upload photos, videos, and text content, while presidents and secretaries can approve or reject submissions.

---

## ✅ Features Implemented

### 1. **Content Upload** (Media Incharges Only)
- **Title**: Content title (required)
- **Type**: Select between text, photo, or video (required)
- **Category**: News, Event, Announcement, Resource, or Other
- **Description**: Optional content description
- **File Upload**: For photo/video types (max 10MB)
- **Tags**: Comma-separated keywords for categorization

**Supported File Formats:**
- Photos: JPEG, PNG, GIF, WebP
- Videos: MP4, WebM, QuickTime
- Max File Size: 10MB

### 2. **Content Management Dashboard**
Shows all content with:
- **Summary Cards**: Total, Pending, Approved, Rejected counts
- **Content Table**: Title, Type, Uploaded By, Status, Upload Date
- **Status Badges**: Color-coded (Yellow: Pending, Green: Approved, Red: Rejected)
- **Action Buttons**: For presidents/secretaries to approve/reject (on pending items only)

### 3. **Approval Workflow**
**For Presidents/Secretaries:**
- **Approve Button**: With optional approval note
- **Reject Button**: With required rejection reason
- Both actions are logged in audit trail

**Cascade Permissions:**
- Media incharges see only their own uploaded content
- Presidents/Secretaries see all content from their level and below
- State-level officers see all content in the state
- Superadmin sees everything

### 4. **Audit Logging**
All actions are logged:
- `content_uploaded`: When media incharge uploads content
- `content_approved`: When content is approved with note
- `content_rejected`: When content is rejected with reason

Each log includes:
- User info (name, email, role, IP address)
- Content details (title, media type, file size)
- Timestamp
- Action details

---

## 🗂️ File Structure

### Models
**`models/Content.js`**
```javascript
{
  title: String,                 // Content title
  content: String,               // Description/text
  mediaType: Enum (text/photo/video),
  mediaUrl: String,              // URL to file
  fileName: String,              // Original filename
  fileSize: Number,              // File size in bytes
  mimeType: String,              // MIME type
  
  uploadedBy: ObjectId (User),   // Uploader reference
  uploadedByName: String,
  uploadedByEmail: String,
  uploadedByRole: String,
  uploadedAt: Date,
  
  status: Enum (pending/approved/rejected),
  approvedBy: ObjectId (User),   // Approver reference
  approvedByName: String,
  approvedByEmail: String,
  approvedByRole: String,
  approvedAt: Date,
  
  level: Enum (state/division/district/block),
  levelId: String,               // Location identifier
  
  note: String,                  // Approval note
  rejectionReason: String,
  
  views: Number,
  category: Enum (news/event/announcement/resource/other),
  tags: [String]
}
```

### Middleware
**`middleware/mediaUpload.js`**
- Multer configuration for file uploads
- Storage: `public/uploads/media/`
- File validation: MIME type checking
- Size limit: 10MB
- Filename generation: Unique timestamps

### Routes
**`routes/admin.js`** (Lines 2030-2361)

**GET /admin/media-dashboard**
- Display all content with cascade permissions
- Show stats by status
- Render upload form (for media incharges)
- Display action buttons (for approvers)

**POST /admin/media/upload**
- Accept multipart form data with file
- Validate title and media type
- Save to MongoDB with uploader info
- Store file in public/uploads/media/
- Log audit action: `content_uploaded`

**POST /admin/media/approve/:id**
- Check if user is president/secretary/superadmin
- Update content status to "approved"
- Set approver information and timestamp
- Log audit action: `content_approved`

**POST /admin/media/reject/:id**
- Check if user is president/secretary/superadmin
- Update content status to "rejected"
- Store rejection reason
- Log audit action: `content_rejected`

### Views
**`views/admin/media-dashboard.ejs`**
- Responsive grid layout
- Stats cards (4-column on desktop, responsive on mobile)
- Upload form (hidden for non-media incharges)
- Content table with sorting
- Status badges with color coding
- Approve/Reject modals with forms
- AJAX form submission
- Error handling and success alerts

---

## 🔐 Security & Permissions

### Role-Based Access

| Role | Can Upload | Can Approve | Can View |
|------|-----------|-----------|----------|
| superadmin | ✅ | ✅ | ✅ All |
| state_media_incharge | ✅ | ❌ | ✅ State |
| state_president | ❌ | ✅ | ✅ State |
| state_secretary | ❌ | ✅ | ✅ State |
| division_media_incharge | ✅ | ❌ | ✅ Division |
| division_president | ❌ | ✅ | ✅ Division |
| division_secretary | ❌ | ✅ | ✅ Division |
| district_media_incharge | ✅ | ❌ | ✅ District |
| district_president | ❌ | ✅ | ✅ District |
| district_secretary | ❌ | ✅ | ✅ District |

### Data Protection
- Content stored in separate collection with proper indexing
- Uploaded files in `public/uploads/media/` with unique names
- All actions logged with user/IP information
- Cascade permissions enforced at query level

---

## 🚀 Usage Guide

### For Media Incharges

1. Navigate to **Admin Dashboard** → **Media Management**
2. Click **📤 Upload New Content**
3. Fill in the form:
   - Title (required)
   - Content Type (text/photo/video, required)
   - Category (optional)
   - Description (optional)
   - Upload File (required for photo/video)
   - Tags (optional)
4. Click **📤 Upload Content**
5. Content will be in **⏳ Pending** status
6. Wait for approval from president/secretary

### For Presidents/Secretaries

1. Navigate to **Admin Dashboard** → **Media Management**
2. View all pending content in the table
3. Click **✅ Approve** or **❌ Reject** button
4. For Approve:
   - Optionally add an approval note
   - Click **Approve**
5. For Reject:
   - Enter rejection reason (required)
   - Click **Reject**
6. Content status updates immediately

### For Superadmin

- Can access all content
- Can approve/reject any submission
- Can view complete audit trail

---

## 📊 Dashboard Components

### Summary Cards
- **Total Content**: Count of all content items
- **⏳ Pending**: Content awaiting approval
- **✅ Approved**: Approved content
- **❌ Rejected**: Rejected content

### Content Table
Shows all content with:
- **Title**: Content title with link to view file
- **Type**: Icon + type name (📷 Photo, 🎥 Video, 📝 Text)
- **Uploaded By**: Uploader name and role
- **Status**: Color-coded badge
- **Date**: Upload date in local format
- **Actions**: Approve/Reject buttons (if pending and user can approve)

### Upload Form
Only visible to media incharges:
- Title input
- Media type dropdown (triggers file input visibility)
- Category select
- Description textarea
- File upload (for photo/video)
- Tags input
- Submit button with loader

### Approval Modals
**Approve Modal:**
- Shows content title
- Optional note field
- Cancel/Approve buttons

**Reject Modal:**
- Shows content title
- Required rejection reason field
- Cancel/Reject buttons

---

## 🔌 API Endpoints

### GET /admin/media-dashboard
**Returns:**
```json
{
  "contents": [...],
  "stats": {
    "total": 10,
    "pending": 3,
    "approved": 5,
    "rejected": 2
  },
  "currentUser": {...},
  "isMediaIncharge": true,
  "isApprover": false
}
```

### POST /admin/media/upload
**Request:**
```
multipart/form-data
- title: string (required)
- mediaType: string (required)
- category: string (optional)
- content: string (optional)
- tags: string (optional)
- media: file (required if mediaType is photo/video)
```

**Response:**
```json
{
  "success": true,
  "message": "Content uploaded successfully and pending approval",
  "contentId": "ObjectId"
}
```

### POST /admin/media/approve/:id
**Request:**
```json
{
  "note": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Content approved successfully"
}
```

### POST /admin/media/reject/:id
**Request:**
```json
{
  "rejectionReason": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Content rejected successfully"
}
```

---

## 📝 Audit Trail

All media actions are logged with:
- **Action Type**: content_uploaded, content_approved, content_rejected
- **Performed By**: User name, email, role
- **IP Address**: Request IP
- **User Agent**: Browser info
- **Timestamp**: Exact time of action
- **Details**: Specific action information
- **Target**: Content ID, title, type

View audit logs: **Admin Dashboard** → **Audit Logs** (Superadmin only)

---

## 🛠️ Technical Details

### Dependencies
- **multer**: File upload handling
- **mongoose**: MongoDB ODM
- **express**: Web framework
- **express-ejs-layouts**: Template engine

### File Organization
```
d:\human-right\
├── models/
│   └── Content.js (Content schema with indexes)
├── middleware/
│   └── mediaUpload.js (Multer configuration)
├── routes/
│   └── admin.js (Media routes at lines 2030-2361)
├── views/
│   └── admin/
│       └── media-dashboard.ejs (Dashboard UI)
├── public/
│   └── uploads/
│       └── media/ (Uploaded files stored here)
└── utils/
    └── auditLogger.js (Audit logging integration)
```

### Database Indexes
```javascript
ContentSchema.index({ uploadedBy: 1, status: 1 });
ContentSchema.index({ status: 1, level: 1, levelId: 1 });
ContentSchema.index({ uploadedAt: -1 });
ContentSchema.index({ approvedAt: -1 });
```

---

## 🧪 Testing Checklist

- [x] Media incharge can upload content
- [x] Upload form validates required fields
- [x] File type validation works (only accepted MIME types)
- [x] File size validation works (max 10MB)
- [x] Content appears as pending in dashboard
- [x] Presidents/Secretaries can see pending content
- [x] Approve button works with optional note
- [x] Reject button works with required reason
- [x] Status updates immediately after action
- [x] Audit logs capture all actions
- [x] Cascade permissions work correctly
- [x] Only authorized roles can access dashboard
- [x] Files stored in correct directory
- [x] Responsive design on mobile/tablet

---

## 🔄 Integration Points

### Dashboard Navigation
- Added Media Management card on admin dashboard
- Added Media Dashboard quick action button
- Visible to all media incharges and approvers

### Audit System
- All media actions logged to Audit collection
- Searchable by action type in audit dashboard
- Included in CSV exports

### User System
- Content linked to User model via uploadedBy
- Approver linked via approvedBy reference
- Cascade permissions based on user role/level

---

## 📌 Notes

- All file uploads are stored with unique timestamps to prevent conflicts
- Uploaded files are directly accessible at `/uploads/media/filename`
- Rejected content can be uploaded again by the media incharge
- Once approved, content is locked (cannot be edited or deleted currently)
- Views counter can be used for analytics in future enhancements

---

## 🎯 Future Enhancements

1. **Edit Approved Content**: Allow editing of approved content with re-approval
2. **Content Analytics**: Track views and engagement
3. **Bulk Upload**: Allow uploading multiple files at once
4. **Content Archive**: Archive old/expired content
5. **Advanced Search**: Filter by category, date range, uploader
6. **Published Content Widget**: Display approved content on public website
7. **Email Notifications**: Notify on approval/rejection
8. **Content Versioning**: Track content changes over time

---

## 📞 Support

For issues or questions about the Media Dashboard:
1. Check audit logs for action history
2. Verify file upload permissions
3. Check file size and format requirements
4. Verify user role and cascade level

---

**Last Updated**: January 2025
**Status**: ✅ Production Ready
