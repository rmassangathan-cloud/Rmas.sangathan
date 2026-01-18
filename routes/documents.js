const express = require('express');
const router = express.Router();
const Membership = require('../models/Membership');
const DownloadOtp = require('../models/DownloadOtp');
const { sendMail } = require('../utils/mailer');
const { logAction } = require('../utils/auditLogger');
const crypto = require('crypto');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const puppeteer = require('puppeteer');

// TTLs
const OTP_TTL_MIN = parseInt(process.env.OTP_TTL_MIN || '10', 10);
const TOKEN_TTL_MIN = parseInt(process.env.TOKEN_TTL_MIN || '15', 10);

function genOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }

// Request download form
router.get('/request-download', (req, res) => {
  res.render('documents/request_download', { email: req.query.email || '', error: null });
});

// Submit request (send OTP)
router.post('/request-download', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email) return res.status(400).render('documents/request_download', { email: '', error: 'Email is required' });

    // find membership
    const member = await Membership.findOne({ email: email.toLowerCase().trim() }).lean();
    if (!member) return res.status(404).render('documents/request_download', { email, error: 'No membership found for this email' });

    if (name && member.fullName && name.trim().toLowerCase() !== member.fullName.trim().toLowerCase()) {
      return res.status(400).render('documents/request_download', { email, error: 'Name does not match membership' });
    }

    const otp = genOtp();
    const doc = new DownloadOtp({
      email: email.toLowerCase().trim(),
      membershipId: member._id,
      otp,
      expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60 * 1000)
    });
    await doc.save();

    // Send OTP email
    await sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your RMAS download OTP',
      text: `नमस्ते ${member.fullName || ''},\n\nआपका OTP है: ${otp}\nयह ${OTP_TTL_MIN} मिनट के बाद expire हो जाएगा।\n\nयदि आपने अनुरोध नहीं किया है तो इस ईमेल को अनदेखा करें।`
    });

    res.render('documents/otp_sent', { email });
  } catch (err) {
    console.error('Request download error:', err);
    res.status(500).render('documents/request_download', { email: req.body.email || '', error: 'Server error' });
  }
});

// Verify OTP and generate short-lived token
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const rec = await DownloadOtp.findOne({ email: email.toLowerCase().trim(), otp, verified: false, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!rec) return res.status(400).render('documents/otp_sent', { email, error: 'Invalid or expired OTP' });

    rec.verified = true;
    rec.token = crypto.randomBytes(32).toString('hex');
    rec.tokenExpires = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000);
    await rec.save();

    res.redirect(`/documents/profile?token=${rec.token}`);
  } catch (err) {
    console.error('Verify otp error:', err);
    res.status(500).render('documents/otp_sent', { email: req.body.email || '', error: 'Server error' });
  }
});

// Profile view - show member data if token valid
router.get('/profile', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).send('Token required');

    const rec = await DownloadOtp.findOne({ token, tokenExpires: { $gt: new Date() }, verified: true });
    if (!rec) return res.status(400).send('Invalid or expired token');

    const member = await Membership.findById(rec.membershipId).lean();
    if (!member) return res.status(404).send('Membership not found');

    res.render('documents/profile_view', { member, token });
  } catch (err) {
    console.error('Profile view error:', err);
    res.status(400).send('Invalid or expired token');
  }
});

// Generate and return PDF (joining | idcard) on demand
router.post('/generate', async (req, res) => {
  try {
    const { token, type } = req.body;
    if (!token) return res.status(400).send('Token required');
    const rec = await DownloadOtp.findOne({ token, tokenExpires: { $gt: new Date() }, verified: true });
    if (!rec) return res.status(400).send('Invalid or expired token');

    const member = await Membership.findById(rec.membershipId).lean();
    if (!member) return res.status(404).send('Membership not found');

    if (type === 'joining') {
      const qrData = `${process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`}/verify/${member.membershipId || member._id}`;
      const qrCodeDataURL = await QRCode.toDataURL(qrData);

      // Use admin helper to generate PDF if available
      const adminRoutes = require('./admin');
      if (!adminRoutes.generateMembershipPDF) {
        return res.status(500).send('Server misconfiguration: PDF generator not available');
      }

      // Defensive check: ensure we have minimal fields the template expects
      if (!member.membershipId) {
        console.warn('⚠️ membership has no membershipId, using temporary id for PDF generation:', member._id);
        member.membershipId = `TEMP/${Date.now()}`;
      }

      try {
        console.log('📄 Generating joining PDF for member:', member._id, member.email || '(no-email)');
        const pdfBuffer = await adminRoutes.generateMembershipPDF(member, qrCodeDataURL);
        
        // Log the joining letter download
        await logAction({
          action: 'joining_letter_downloaded',
          req: req,
          targetId: member._id,
          targetType: 'Document',
          targetName: `Joining Letter - ${member.fullName || member.email}`,
          details: {
            membershipId: member.membershipId,
            memberName: member.fullName,
            memberEmail: member.email,
            fileName: `RMAS_Joining_${member.membershipId || member._id}.pdf`,
            fileSize: pdfBuffer.length,
            downloadType: 'joining_letter',
            documentType: 'Joining Letter'
          },
          note: `Joining letter downloaded by ${rec.email}`
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="RMAS_Joining_${member.membershipId || member._id}.pdf"`);
        res.setHeader('Content-Length', String(pdfBuffer.length));
        res.setHeader('Cache-Control', 'no-store');
        console.log('📤 Sending Joining PDF, bytes:', pdfBuffer.length);
        return res.send(pdfBuffer);
      } catch (err) {
        console.error('❌ Joining PDF generation error:', err && err.message);
        console.error(err && err.stack);
        try {
          await Membership.findByIdAndUpdate(member._id, { $push: { history: { action: 'joining_pdf_error', note: err && err.message, date: new Date() } } });
        } catch (histErr) { console.error('❌ Error saving history for joining PDF failure:', histErr && histErr.message); }
        return res.status(500).send('Error generating joining letter: ' + (err && err.message));
      }
    } else if (type === 'idcard') {
      // Render id-card template and use Puppeteer to generate PDF
      const idCardTemplatePath = path.join(__dirname, '..', 'views', 'pdf', 'id-card.ejs');
      const idCardTemplate = fs.readFileSync(idCardTemplatePath, 'utf8');

      let nhraLogo = '';
      let memberPhoto = '';
      let stampImage = '';
      try {
        const nhraLogoPath = path.join(__dirname, '..', 'public', 'images', 'logo.jpeg');
        if (fs.existsSync(nhraLogoPath)) nhraLogo = fs.readFileSync(nhraLogoPath).toString('base64');
      } catch (e) {}
      try {
        const memberPhotoPath = path.join(__dirname, '..', 'public', member.photo ? member.photo.replace(/^\//, '') : '');
        if (member.photo && fs.existsSync(memberPhotoPath)) memberPhoto = fs.readFileSync(memberPhotoPath).toString('base64');
      } catch (e) {}
      try {
        const stampPath = path.join(__dirname, '..', 'public', 'images', 'stamp.png');
        if (fs.existsSync(stampPath)) stampImage = fs.readFileSync(stampPath).toString('base64');
      } catch (e) {}

      const qrData = `${process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`}/verify/${member.membershipId || member._id}`;
      const qrCodeDataURL = await QRCode.toDataURL(qrData);

      const designation = (member.assignedRoles && member.assignedRoles[0]) ? `${member.assignedRoles[0].level || ''} ${member.assignedRoles[0].roleName || member.assignedRoles[0].role || ''} ${member.assignedRoles[0].location || ''}`.trim() : (member.jobRole || 'Member');

      const idCardHtml = ejs.render(idCardTemplate, { membership: member, rmasLogo: nhraLogo, nhraLogo, memberPhoto, stampImage, qrCodeDataURL, issueDateHindi: new Date().toLocaleDateString('hi-IN'), designation });

      const execPath = (process.env.PUPPETEER_EXECUTABLE_PATH || '').replace(/^"(.*)"$/, '$1') || undefined;
      const browser = await puppeteer.launch({ headless: 'new', executablePath: execPath });
      const page = await browser.newPage();
      await page.setContent(idCardHtml, { waitUntil: 'networkidle0' });
      const buf = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();

      // Log the ID card download
      await logAction({
        action: 'id_card_downloaded',
        req: req,
        targetId: member._id,
        targetType: 'Document',
        targetName: `ID Card - ${member.fullName || member.email}`,
        details: {
          membershipId: member.membershipId,
          memberName: member.fullName,
          memberEmail: member.email,
          fileName: `RMAS_IDCard_${member.membershipId || member._id}.pdf`,
          fileSize: buf.length,
          downloadType: 'id_card',
          documentType: 'ID Card'
        },
        note: `ID card downloaded by ${rec.email}`
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="RMAS_IDCard_${member.membershipId || member._id}.pdf"`);
      return res.send(buf);
    } else {
      return res.status(400).send('Invalid document type');
    }
  } catch (err) {
    console.error('Generate document error:', err);
    res.status(400).send('Error generating document: ' + (err.message || ''));
  }
});

module.exports = router;
