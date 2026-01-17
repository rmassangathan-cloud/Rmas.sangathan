require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { sendMail } = require('../utils/mailer');
const Membership = require('../models/Membership');
const admin = require('../routes/admin');

(async function(){
  const membershipId = process.argv[2];
  if (!membershipId) { console.error('Usage: node test_manage_role_flow.js <membershipId>'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/human-right');

  const m = await Membership.findOne({ membershipId });
  if (!m) { console.error('Membership not found:', membershipId); await mongoose.disconnect(); process.exit(1); }

  console.log('Found membership:', m.fullName, '-', membershipId);

  const qr = await QRCode.toDataURL(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/verify/${membershipId}`);

  try {
    const pdfBuffer = await admin.generateMembershipPDF(m, qr);
    const pdfDir = path.join(__dirname, '..', 'public', 'pdfs');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
    const pdfFilename = membershipId.replace(/\//g, '_') + '-updated.pdf';
    const pdfPath = path.join(pdfDir, pdfFilename);
    fs.writeFileSync(pdfPath, pdfBuffer);

    await Membership.findOneAndUpdate({ membershipId }, { pdfUrl: `/pdfs/${pdfFilename}`, $push: { history: { by: null, role: 'system', action: 'pdf_regenerated', note: 'PDF regenerated on role assignment (test script)', date: new Date() } } });
    console.log('✅ PDF regenerated and saved:', pdfPath);

    // Send email using the same logic as manage-role route
    const fresh = await Membership.findOne({ membershipId }).lean();
    if (!fresh.email) { console.warn('No email for member, skipping email'); await mongoose.disconnect(); process.exit(0); }

    const assigned = (fresh.assignedRoles && fresh.assignedRoles[0]) ? fresh.assignedRoles[0] : {};
    let roleNameHi = assigned.roleName || assigned.role || 'नियत किया गया पद';
    try {
      const rolesPathLocal = path.join(__dirname, '..', 'public', 'locations', 'roles_hierarchy.json');
      if (fs.existsSync(rolesPathLocal)) {
        const rolesDataLocal = JSON.parse(fs.readFileSync(rolesPathLocal, 'utf8'));
        for (const catKey of Object.keys(rolesDataLocal.categories || {})) {
          const match = (rolesDataLocal.categories[catKey].roles || []).find(r => r.code === (assigned.role || assigned.roleCode || '') || r.code === (assigned.roleName || ''));
          if (match) { roleNameHi = match.name || roleNameHi; break; }
        }
      }
    } catch (e) { console.error('Could not resolve role name in Hindi for email:', e && e.message); }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: fresh.email,
      subject: 'बधाई हो! आपका नया पद असाइन किया गया – RMAS',
      text: `नमस्ते ${fresh.fullName},\n\nआपको ${roleNameHi} पद पर ${assigned.teamType || '—'} में ${assigned.level || '—'} स्तर पर असाइन किया गया है। अपडेटेड जॉइनिंग लेटर संलग्न है।\n\nधन्यवाद,\nNHRA Bihar Team`,
    };

    const attachPath = path.join(__dirname, '..', 'public', fresh.pdfUrl.replace(/^\/+/, ''));
    if (fs.existsSync(attachPath)) {
      mailOptions.attachments = [{ filename: `NHRA_Membership_${membershipId.replace(/\//g,'_')}.pdf`, path: attachPath }];
      console.log('📎 Attaching PDF to email:', attachPath);
    } else {
      console.warn('⚠️ Attachment not found:', attachPath);
    }

    const res = await sendMail(mailOptions);
    console.log('SEND_RESULT:', res && res.accepted);
    await Membership.findOneAndUpdate({ membershipId }, { $push: { history: { by: null, role: 'system', action: 'email_sent', note: `Role assignment email sent to ${fresh.email}`, date: new Date() } } });

    await mongoose.disconnect();
    console.log('✅ Test manage-role flow completed');
  } catch (e) {
    console.error('Error in test flow:', e && e.message, e && e.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
})();