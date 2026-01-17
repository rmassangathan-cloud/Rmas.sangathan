require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

(async function(){
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/human-right');
  const M = require('../models/Membership');
  const id = process.argv[2];
  if (!id) { console.error('Usage: node apply_updated_pdf.js <membershipId>'); process.exit(1); }
  const m = await M.findOne({ membershipId: id });
  if (!m) { console.error('Membership not found'); await mongoose.disconnect(); process.exit(1); }

  const src = path.join(__dirname, '..', 'public', 'pdfs', `${id.replace(/\//g, '_')}_joining_letter.pdf`);
  const altSrc = path.join(__dirname, '..', 'public', 'pdfs', `RMAS_BIH_KAT_2026_005_joining_letter.pdf`);
  const finalSrc = fs.existsSync(src) ? src : (fs.existsSync(altSrc) ? altSrc : null);
  if (!finalSrc) { console.error('Source joining letter not found:', src, altSrc); await mongoose.disconnect(); process.exit(1); }

  const dst = path.join(__dirname, '..', 'public', 'pdfs', id.replace(/\//g, '_') + '-updated.pdf');
  fs.copyFileSync(finalSrc, dst);

  await M.findByIdAndUpdate(m._id, { pdfUrl: `/pdfs/${path.basename(dst)}`, $push: { history: { by: null, role: 'system', action: 'pdf_regenerated', note: 'PDF regenerated on role assignment (test)', date: new Date() } } });

  console.log('✅ Copied and updated DB:', dst);
  await mongoose.disconnect();
})();