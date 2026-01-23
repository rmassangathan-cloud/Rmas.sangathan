# Resend Email API - Quick Reference

## Installation
```bash
npm install resend@4.0.1
```

## Environment Variables
```env
RESEND_API_KEY=re_GpGFBG96_JaUq8RWJhK7rzFTahJnhR86w
EMAIL_FROM=no-reply@nhra-bihar.org
```

## Basic Usage
```javascript
const { sendMail } = require('../utils/mailer');

// Simple email
await sendMail({
  to: 'user@example.com',
  subject: 'Hello',
  text: 'Hello World'
});

// With HTML
await sendMail({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hello <strong>World</strong></p>'
});

// With Cloudinary PDF attachment
await sendMail({
  to: 'user@example.com',
  subject: 'Your Document',
  html: 'See attachment',
  attachments: [{
    filename: 'document.pdf',
    url: 'https://res.cloudinary.com/...' // Resend will fetch and convert
  }]
});

// With local PDF attachment
await sendMail({
  to: 'user@example.com',
  subject: 'Your Document',
  html: 'See attachment',
  attachments: [{
    filename: 'document.pdf',
    path: '/path/to/file.pdf' // Read from disk
  }]
});

// With buffer attachment
await sendMail({
  to: 'user@example.com',
  subject: 'Your Document',
  html: 'See attachment',
  attachments: [{
    filename: 'document.pdf',
    content: pdfBuffer // Already a Buffer
  }]
});
```

## Email Routes

### Test Email
```
GET /admin/api/test-email?email=test@example.com
```

### Acceptance Email
```
POST /admin/forms/:id/accept
- Sends with PDF attachment (from Cloudinary)
- Includes membership ID
- Hindi template
```

### Rejection Email
```
POST /admin/forms/:id/reject
- Simple text rejection
- Includes reason if provided
```

### Resend Joining Letter
```
POST /admin/forms/:id/resend-joining-letter
- Resends PDF attachment
- Updated member email
```

### OTP Email
```
POST /auth/forgot-password
- Sends OTP for password reset
- 10-minute validity
- Hindi + English templates
```

### Role Assignment
```
POST /admin/forms/:id/manage-role
- Notifies member of role assignment
- Includes download link for ID Card
```

## Response Format
```javascript
{
  ok: true,
  email: 'user@example.com',
  resendId: 're_abc123...',
  timestamp: '2026-01-23T...'
}
```

## Error Handling
```javascript
try {
  const result = await sendMail({...});
  if (result && result.id) {
    console.log('✅ Sent:', result.id);
  } else {
    console.error('❌ Failed to send');
  }
} catch (err) {
  console.error('Email error:', err.message);
}
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No emails received | Check spam folder, verify API key |
| Attachment missing | Verify PDF URL is accessible |
| "API key not configured" | Add `RESEND_API_KEY` to `.env` |
| Deployment issue | Add env var to Vercel/Render settings |

## Templates Available
- `generateOtpEmailHTML()` - Password reset OTP
- `generateOtpEmailText()` - Password reset OTP (plain text)
- `generateAcceptanceEmailHTML()` - Member acceptance
- `generateDownloadOtpEmailHTML()` - Download OTP for documents
- `generateRoleAssignmentEmailHTML()` - Role assignment notification

## Files Modified
- `utils/mailer.js` - Complete rewrite (Resend)
- `package.json` - Added resend dependency
- `routes/admin.js` - Updated all email routes
- `routes/auth.js` - Updated OTP sending

## Quick Start

1. **Install:**
   ```bash
   npm install
   ```

2. **Configure:**
   ```env
   RESEND_API_KEY=re_GpGFBG96_JaUq8RWJhK7rzFTahJnhR86w
   ```

3. **Test:**
   ```bash
   curl http://localhost:5000/admin/api/test-email
   ```

4. **Deploy:**
   - Push code
   - Add `RESEND_API_KEY` to deployment env vars
   - Done! ✅

## Documentation
- Complete guide: `RESEND_SETUP.md`
- Resend docs: https://resend.com/docs
- Project: NHRA Initiative (Bihar human rights)

---

Last updated: January 23, 2026
