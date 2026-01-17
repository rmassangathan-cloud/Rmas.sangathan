require('dotenv').config();
const { sendMail } = require('../utils/mailer');
const path = require('path');
const mongoose = require('mongoose');
(async function(){
  const membershipId = process.argv[2];
  if (!membershipId) { console.error('Usage: node send_updated_pdf_email.js <membershipId>'); process.exit(1); }
  const attach = path.join(__dirname, '..', 'public', 'pdfs', membershipId.replace(/\//g, '_') + '-updated.pdf');
  const M = require('../models/Membership');
  try {
      await mongoose.connect(process.env.MONGO_URI||'mongodb://localhost:27017/human-right');
    const m = await M.findOne({ membershipId });
    if (!m) { console.error('Membership not found:', membershipId); await mongoose.disconnect(); process.exit(1); }
    if (!m.email) { console.error('No email for membership:', membershipId); await mongoose.disconnect(); process.exit(1); }
    const res = await sendMail({ from: process.env.EMAIL_USER, to: m.email, subject: 'RMAS Joining Letter - Role Assigned', text: 'Your role has been assigned. Please find the joining letter attached.', attachments: [{ filename: `${membershipId.replace(/\//g,'_')}-joining_letter.pdf`, path: attach }] });
    console.log('SEND_RESULT:', res && res.accepted);
    await M.findOneAndUpdate({ membershipId }, { $push: { history: { by: null, role: 'system', action: 'email_sent', note: 'Role assignment email sent (test)', date: new Date() } } });
    await mongoose.disconnect();
  } catch (e) {
    console.error('SEND_ERROR:', e && e.message);
    process.exit(1);
  }
})();