# Resend API Email Migration - Complete Setup Guide

## Overview
This guide covers the complete migration from Nodemailer (Gmail SMTP) to Resend API for the NHRA Bihar project.

### Why Resend?
- ✅ Vercel-friendly (no SMTP issues on serverless)
- ✅ Modern API with excellent deliverability
- ✅ No authentication issues with Gmail
- ✅ Built-in attachment support
- ✅ Better error handling and logging

---

## 1. Installation

### Step 1: Install Resend Package
```bash
npm install resend@latest
```

Or if you want a specific version:
```bash
npm install resend@4.0.1
```

**Note:** The package.json has already been updated with `"resend": "^4.0.1"`. Just run `npm install`.

---

## 2. Environment Variables Setup

### Required Variables
Add these to your `.env` file:

```env
# Resend API
RESEND_API_KEY=re_GpGFBG96_JaUq8RWJhK7rzFTahJnhR86w

# Optional: Custom FROM email (defaults to NHRA Bihar <no-reply@nhra-bihar.org>)
EMAIL_FROM=no-reply@nhra-bihar.org

# Keep these for backward compatibility (no longer used for sending, but auth.js still references them)
EMAIL_USER=human2394right@gmail.com
EMAIL_PASS=your_app_password_here
```

### On Vercel/Render Deployment
1. Go to your deployment platform's environment variables section
2. Add: `RESEND_API_KEY=re_GpGFBG96_JaUq8RWJhK7rzFTahJnhR86w`
3. Optional: Add `EMAIL_FROM=no-reply@nhra-bihar.org`
4. Redeploy

---

## 3. Files Modified

### ✅ utils/mailer.js
**Completely rewritten to use Resend API**

Changes:
- Replaced Nodemailer with `const { Resend } = require('resend')`
- New `sendMail(opts)` function that's compatible with existing code
- Support for:
  - Buffer attachments (local PDFs)
  - URL attachments (Cloudinary PDFs)
  - HTML and text email content
- Helper function `fetchFileFromUrl()` for remote attachments
- All email templates (OTP, Acceptance, Download OTP, Role Assignment) updated with Hindi text

**Key Features:**
```javascript
// Supports buffer attachments (local files)
attachments: [{ filename: 'doc.pdf', path: '/path/to/file.pdf' }]

// Supports URL attachments (Cloudinary)
attachments: [{ filename: 'doc.pdf', url: 'https://cloudinary.com/...' }]

// Supports direct buffer content
attachments: [{ filename: 'doc.pdf', content: pdfBuffer }]
```

### ✅ package.json
- Added `"resend": "^4.0.1"` to dependencies
- Kept `"nodemailer"` for backward compatibility (can be removed later)

### ✅ routes/admin.js
Updated all email sending routes:

1. **POST /forms/:id/accept** (Line ~785)
   - Uses Cloudinary PDF URL if available
   - Falls back to local PDF path
   - Improved error handling

2. **POST /forms/:id/resend-joining-letter** (Line ~870)
   - Attaches PDF from Cloudinary URL
   - Better error messages

3. **POST /forms/:id/reject** (Line ~925)
   - Simple rejection email with reason

4. **POST /forms/:id/accept-quick** (Line ~490)
   - Quick acceptance without PDF

5. **POST /forms/:id/reject-quick** (Line ~512)
   - Quick rejection without PDF

6. **POST /forms/:id/manage-role** (Line ~1040)
   - Role assignment notification email
   - Download link for ID Card/Joining Letter

7. **GET /api/test-email** (NEW - Line ~2470)
   - Test email endpoint for admins
   - Verifies Resend setup is working

### ✅ routes/auth.js
- Updated OTP sending (Line ~204)
- Uses `generateOtpEmailHTML()` and `generateOtpEmailText()` from mailer.js
- Hindi text templates

---

## 4. Email Templates

All templates are in `utils/mailer.js`:

### 1. OTP Email (Password Reset)
- **Function:** `generateOtpEmailHTML()` and `generateOtpEmailText()`
- **Usage:** Auth password reset flow
- **Language:** Hindi

### 2. Acceptance Email
- **Function:** `generateAcceptanceEmailHTML()`
- **Usage:** Member acceptance with PDF attachment
- **Includes:** Membership ID, Download link, QR code info

### 3. Download OTP Email
- **Function:** `generateDownloadOtpEmailHTML()`
- **Usage:** ID Card/Joining Letter download
- **Includes:** OTP, Time limit warning

### 4. Role Assignment Email
- **Function:** `generateRoleAssignmentEmailHTML()`
- **Usage:** Role assigned to member
- **Includes:** Role details, Download link

---

## 5. Testing Email Configuration

### Method 1: API Test Endpoint
```bash
GET http://localhost:5000/admin/api/test-email?email=your-test@email.com
```

**Requirements:**
- Must be logged in as superadmin
- Optional `?email=` parameter (defaults to current user's email)

**Expected Response:**
```json
{
  "ok": true,
  "msg": "Test email sent successfully!",
  "email": "your-test@email.com",
  "resendId": "re_abc123...",
  "timestamp": "2026-01-23T..."
}
```

### Method 2: Manual Testing
1. Log in as superadmin
2. Navigate to: `http://localhost:5000/admin/api/test-email`
3. Check email inbox for test message
4. Verify "Resend API Configuration: सफल" message

---

## 6. Attachment Handling

### Scenario 1: Cloudinary PDF (Preferred)
```javascript
// When membership.pdfUrl exists (Cloudinary URL)
attachments: [{
  filename: 'RMAS_Membership_ID.pdf',
  url: 'https://res.cloudinary.com/...' // Automatically fetched and converted to base64
}]
```

### Scenario 2: Local PDF
```javascript
// When pdfPath is local file
attachments: [{
  filename: 'RMAS_Membership_ID.pdf',
  path: '/path/to/local/file.pdf' // Read and converted to base64
}]
```

### Scenario 3: Buffer Content
```javascript
// Direct buffer (from Puppeteer)
attachments: [{
  filename: 'RMAS_Membership_ID.pdf',
  content: pdfBuffer // Already a Buffer, converted to base64
}]
```

---

## 7. Email Sending Flow

### Acceptance Email Flow
1. Admin accepts form → triggers `/forms/:id/accept`
2. PDF generated with Puppeteer → `pdfPath` and `pdfBuffer` created
3. PDF uploaded to Cloudinary → `membership.pdfUrl` saved
4. Email prepared with:
   - HTML template (acceptance message)
   - Text version (fallback)
   - Attachment (from `membership.pdfUrl` or `pdfPath`)
5. `sendMail()` converts attachment to base64 and sends via Resend API
6. Response logged with Resend ID

### Error Handling
- If attachment fails: email still sends (logged as warning)
- If email fails: logged, user can retry manually
- No route crashes - errors caught in try/catch

---

## 8. Migrating from Nodemailer

### What Changed
| Feature | Nodemailer | Resend |
|---------|-----------|--------|
| Authentication | Email + Password | API Key |
| Configuration | `nodemailer.createTransport()` | `new Resend(API_KEY)` |
| Sending | `transporter.sendMail()` | `resend.emails.send()` |
| Attachments | Path/Buffer | Path/Buffer/URL |
| Rate Limits | None (Gmail) | 100/day (free tier) |
| Vercel Support | ❌ (SMTP issues) | ✅ (API-based) |

### Backward Compatibility
- All `sendMail()` calls remain the same
- Existing code requires no changes except:
  - Remove `.then().catch()` chains if not using async/await
  - Add error handling for null responses

---

## 9. Common Issues & Fixes

### Issue 1: "RESEND_API_KEY not configured"
**Solution:**
```bash
# Check .env file
echo $RESEND_API_KEY

# Or in Node
node -e "console.log(process.env.RESEND_API_KEY)"
```

### Issue 2: Email not received
**Check:**
1. Verify API key is correct
2. Check spam folder
3. Test with `/admin/api/test-email`
4. Check server logs for Resend errors
5. Verify recipient email is valid

### Issue 3: Attachment not included
**Check:**
1. Is `membership.pdfUrl` set? (Check database)
2. Is Cloudinary URL accessible? (Try in browser)
3. Check logs for "Attachment added" message
4. Verify file size < 25MB (Resend limit)

### Issue 4: "Too many redirects" on Vercel
**Solution:** Make sure `EMAIL_FROM` doesn't redirect:
```env
# ❌ Wrong
EMAIL_FROM=http://example.com/email

# ✅ Right
EMAIL_FROM=no-reply@nhra-bihar.org
# or
EMAIL_FROM=NHRA Bihar <no-reply@nhra-bihar.org>
```

---

## 10. Deployment Checklist

- [ ] Install resend package: `npm install`
- [ ] Add `RESEND_API_KEY` to `.env`
- [ ] Test locally: `GET /admin/api/test-email`
- [ ] Verify acceptance email with PDF works
- [ ] Verify OTP email for password reset
- [ ] Verify rejection email
- [ ] Deploy to Vercel/Render
- [ ] Add `RESEND_API_KEY` to deployment env vars
- [ ] Test on production: `/admin/api/test-email?email=test@...`
- [ ] Create test membership and accept it
- [ ] Verify email received with PDF attachment

---

## 11. Monitoring & Logging

### Log Messages to Monitor
```
✅ Email sent to: user@email.com (ID: re_abc123...)
❌ Mailer error: [error message]
⚠️ No email address - skipping email notification
❌ Failed to process attachment: [filename]
```

### Production Monitoring
- Check application logs (Winston) in `/logs/`
- Monitor Resend dashboard for bounce/complaint rates
- Set up alerts for "❌" error messages

---

## 12. Resend API Limits (Free Tier)
- **Rate:** 100 emails/day
- **Attachment Size:** Max 25MB per email
- **Email Size:** Max 12MB per email
- **Domains:** Requires DKIM setup for custom domain

### For Custom Domain (no-reply@nhra-bihar.org)
1. Login to Resend dashboard
2. Add domain
3. Configure DKIM records (provided by Resend)
4. Verify domain
5. Update `EMAIL_FROM` to use custom domain

---

## 13. Support & Documentation

- **Resend Docs:** https://resend.com/docs
- **Resend API Reference:** https://resend.com/docs/api-reference
- **GitHub Issues:** Check project issues for email-related problems

---

## 14. Next Steps

1. ✅ **Immediate:** Set `RESEND_API_KEY` in `.env`
2. ✅ **Test:** Run `/admin/api/test-email`
3. ✅ **Verify:** Accept a membership and check email
4. ✅ **Deploy:** Push to Vercel/Render with env vars
5. ⏭️ **Optional:** Setup custom domain in Resend
6. ⏭️ **Optional:** Configure email analytics in Resend dashboard

---

## Summary

✅ **All emails now use Resend API**
✅ **Cloudinary PDF attachments supported**
✅ **Better error handling and logging**
✅ **No SMTP authentication issues**
✅ **Works on Vercel/Render deployment**
✅ **Test endpoint available**

Enjoy reliable email delivery! 🚀

---

**Last Updated:** January 23, 2026
**Resend API Version:** ^4.0.1
**Node.js Version:** 16+
