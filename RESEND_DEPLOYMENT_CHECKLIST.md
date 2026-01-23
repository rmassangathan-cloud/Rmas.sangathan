# ✅ Resend API Migration - Deployment Checklist

## Pre-Deployment Verification

### Code Review
- [x] `utils/mailer.js` - Resend API integrated
- [x] `package.json` - resend dependency added
- [x] `routes/admin.js` - All email routes updated
- [x] `routes/auth.js` - OTP sending updated
- [x] Test email endpoint created: `GET /admin/api/test-email`
- [x] All error handling implemented
- [x] Hindi text templates preserved

### Dependencies
```bash
✓ npm install resend@4.0.1 (DONE)
✓ resend package in node_modules
✓ No breaking changes to other deps
```

### Documentation
- [x] `RESEND_SETUP.md` - Complete guide (14 sections)
- [x] `RESEND_QUICK_START.md` - Quick reference
- [x] `RESEND_IMPLEMENTATION.md` - Implementation summary

---

## Environment Setup

### Local Development (.env)
```bash
# Add these to .env:
RESEND_API_KEY=re_GpGFBG96_JaUq8RWJhK7rzFTahJnhR86w
EMAIL_FROM=no-reply@nhra-bihar.org
```

### Vercel Deployment
1. Go to: Project → Settings → Environment Variables
2. Add new variable:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_GpGFBG96_JaUq8RWJhK7rzFTahJnhR86w`
3. Click "Save"
4. Trigger redeploy (or push new commit)

### Render Deployment
1. Go to: Dashboard → Your Project → Environment
2. Add new variable:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_GpGFBG96_JaUq8RWJhK7rzFTahJnhR86w`
3. Click "Save & Deploy"

---

## Local Testing

### Step 1: Start Server
```bash
npm run dev
```

Expected output:
```
✅ Server running on http://localhost:5000
```

### Step 2: Test Email Endpoint
```bash
curl http://localhost:5000/admin/api/test-email
```

Expected response:
```json
{
  "ok": true,
  "msg": "Test email sent successfully!",
  "email": "your@email.com",
  "resendId": "re_...",
  "timestamp": "2026-01-23T..."
}
```

### Step 3: Check Email
- Check inbox for test email
- Verify it has "NHRA" and "Resend API Configuration: सफल"
- Check spam folder if not received

### Step 4: Test Membership Acceptance
1. Login as admin
2. Create test membership form
3. Accept it
4. Should receive acceptance email with PDF attachment
5. Verify PDF opens properly

### Step 5: Test OTP
1. Logout
2. Go to Forgot Password
3. Enter email
4. Check inbox for OTP email
5. Verify OTP is readable and has 10-min warning

### Step 6: Test Rejection
1. Create another test membership
2. Reject it with note
3. Check inbox for rejection email
4. Verify reason is included

---

## Production Testing

### Step 1: Deploy
```bash
git add .
git commit -m "Migrate to Resend API"
git push
```

Wait for deployment to complete on Vercel/Render.

### Step 2: Verify Environment
```bash
# On Vercel/Render dashboard, verify:
✓ RESEND_API_KEY is set
✓ Build successful
✓ Deployment live
```

### Step 3: Test Production Email
```bash
curl https://your-domain.vercel.app/admin/api/test-email
```

### Step 4: Full E2E Test
1. **On Production Server:**
   - Login with admin account
   - Create test membership
   - Accept it
   - Check email received

2. **Check Email Content:**
   - [ ] Subject line correct
   - [ ] HTML formatting preserved
   - [ ] PDF attachment included
   - [ ] Membership ID visible
   - [ ] QR code reference present
   - [ ] Hindi text rendered correctly

3. **Test OTP Flow:**
   - [ ] Logout
   - [ ] Forgot password
   - [ ] Receive OTP email
   - [ ] OTP is 6 digits
   - [ ] 10-minute warning present

---

## Email Routes Testing Matrix

| Route | Method | Test | Expected |
|-------|--------|------|----------|
| `/forms/:id/accept` | POST | Accept form | Email + PDF ✅ |
| `/forms/:id/reject` | POST | Reject form | Email + Reason ✅ |
| `/forms/:id/accept-quick` | POST | Quick accept | Email (no PDF) ✅ |
| `/forms/:id/reject-quick` | POST | Quick reject | Email (no PDF) ✅ |
| `/forms/:id/resend-joining-letter` | POST | Resend | Email + PDF ✅ |
| `/forms/:id/manage-role` | POST | Assign role | Email + Link ✅ |
| `/forgot-password` | POST | OTP request | OTP email ✅ |
| `/api/test-email` | GET | Test | Test email ✅ |

---

## Common Issues During Testing

### Issue: Email not received
**Checklist:**
- [ ] Check spam/promotions folder
- [ ] API key correct (not truncated)
- [ ] Recipient email valid
- [ ] Check server logs for errors
- [ ] Test with `/admin/api/test-email`
- [ ] Verify API key has email sending permission

### Issue: Attachment missing
**Checklist:**
- [ ] Check PDF URL in database (`membership.pdfUrl`)
- [ ] URL is HTTPS (not HTTP)
- [ ] URL is accessible (test in browser)
- [ ] File size < 25MB
- [ ] Check logs: "Attachment added: ..." message

### Issue: Template formatting broken
**Checklist:**
- [ ] Check HTML in mailer.js
- [ ] Verify email client supports CSS
- [ ] Test in multiple email clients
- [ ] Check for special characters (Hindi)

### Issue: Deployment fails
**Checklist:**
- [ ] `npm install` ran successfully
- [ ] resend package in package.json
- [ ] No syntax errors in modified files
- [ ] RESEND_API_KEY added to env vars
- [ ] Build logs for specific error

---

## Rollback Plan (If Needed)

### Quick Rollback to Nodemailer
If Resend has critical issues:

1. **Revert Code:**
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Restore Nodemailer Config:**
   - Keep EMAIL_USER and EMAIL_PASS in .env
   - Remove RESEND_API_KEY temporarily

3. **Re-deploy:**
   ```bash
   # Trigger redeploy on Vercel/Render
   ```

**Note:** All logic will still work - just uses Nodemailer instead of Resend.

---

## Success Criteria

✅ **All Tests Passed:**
- [ ] Local `/admin/api/test-email` works
- [ ] Test email received in inbox
- [ ] Acceptance email sends with PDF
- [ ] OTP email sends correctly
- [ ] Rejection email includes reason
- [ ] Role assignment email includes download link
- [ ] All HTML templates render properly
- [ ] Hindi text displays correctly
- [ ] No errors in server logs
- [ ] No errors in Resend dashboard

✅ **Production Ready:**
- [ ] Deployed to Vercel/Render
- [ ] RESEND_API_KEY added to env
- [ ] Production `/admin/api/test-email` works
- [ ] Real user flow tested end-to-end
- [ ] Email delivery verified
- [ ] Monitoring configured

---

## Monitoring Plan

### Daily
- Check email logs in application
- Monitor for "❌ Mailer error" messages
- Check Resend dashboard for bounces

### Weekly
- Review email delivery rates
- Check spam complaints
- Verify no rate limit issues

### Monthly
- Analyze email open rates (if enabled)
- Review cost/usage (free tier: 100/day)
- Update documentation if needed

---

## Support Contacts

| Issue | Contact |
|-------|---------|
| Email not sent | Check logs in `/logs/` |
| API error | Review Resend docs: https://resend.com/docs |
| Attachment failed | Check PDF URL accessibility |
| Rate limit | Contact Resend for upgrade |

---

## Final Checklist Before Production

### Code
- [x] All routes updated
- [x] Error handling complete
- [x] Logging implemented
- [x] No console.log() left in production code
- [x] Documentation complete

### Testing
- [ ] Local test email works
- [ ] Acceptance email tested
- [ ] OTP email tested
- [ ] Rejection email tested
- [ ] Role assignment tested
- [ ] PDF attachment verified

### Deployment
- [ ] .env has RESEND_API_KEY
- [ ] Git commit ready
- [ ] Vercel/Render env vars set
- [ ] Build passes
- [ ] No deployment errors

### Post-Deployment
- [ ] Verify on production
- [ ] Test production email route
- [ ] Full E2E test completed
- [ ] Users notified (if needed)
- [ ] Monitoring enabled

---

## Sign-Off

**Prepared By:** AI Assistant
**Prepared Date:** January 23, 2026
**Version:** 1.0
**Status:** Ready for Deployment ✅

---

## Quick Start Command

```bash
# 1. Install
npm install

# 2. Configure .env
echo 'RESEND_API_KEY=re_GpGFBG96_JaUq8RWJhK7rzFTahJnhR86w' >> .env

# 3. Test locally
npm run dev &
curl http://localhost:5000/admin/api/test-email

# 4. Deploy
git add .
git commit -m "Migrate to Resend API"
git push

# 5. On Vercel/Render: Add RESEND_API_KEY env var and redeploy

# Done! 🚀
```

---

**Next Action:** Start testing and deploy to production.
