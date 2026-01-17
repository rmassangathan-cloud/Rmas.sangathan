require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const Membership = require('../models/Membership');
const { generateMembershipPDF, } = (function(){ try { return require('../routes/admin.js').generateMembershipPDF ? { generateMembershipPDF: require('../routes/admin.js').generateMembershipPDF } : {}; } catch(e) { return {}; }})();

(async function main(){
  const membershipId = process.argv[2];
  if (!membershipId) { console.error('Usage: node regen_pdf_update.js <membershipId>'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/human-right');

  const m = await Membership.findOne({ membershipId });
  if (!m) { console.error('Membership not found:', membershipId); await mongoose.disconnect(); process.exit(1); }

  console.log('Found membership:', m.fullName, membershipId);

  const qrCodeDataURL = await QRCode.toDataURL(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/verify/${membershipId}`);

  // Use the generateMembershipPDF exported function if available, else require the router's function via eval
  let pdfBuffer;
  try {
    if (generateMembershipPDF && typeof generateMembershipPDF === 'function') {
      pdfBuffer = await generateMembershipPDF(m, qrCodeDataURL);
    } else {
      // fallback: require the file and execute the internal function by reading it via require
      const admin = require('../routes/admin');
      if (admin && admin.__proto__ && admin.generateMembershipPDF) {
        pdfBuffer = await admin.generateMembershipPDF(m, qrCodeDataURL);
      } else if (admin && admin.__doc__) {
        throw new Error('generateMembershipPDF not found');
      } else {
        // As a last resort, call the generate_joining_letter script logic
        const spawn = require('child_process').spawnSync;
        const res = spawn('node', ['scripts/generate_joining_letter.js', membershipId], { stdio: 'inherit' });
        if (res.status !== 0) throw new Error('generate_joining_letter script failed');
        console.log('Generated joining letter via script. Exiting.');
        await mongoose.disconnect();
        process.exit(0);
      }
    }

    const pdfDir = path.join(__dirname, '..', 'public', 'pdfs');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
    const pdfFilename = membershipId.replace(/\//g, '_') + '-updated.pdf';
    const pdfPath = path.join(pdfDir, pdfFilename);
    fs.writeFileSync(pdfPath, pdfBuffer);

    await Membership.findOneAndUpdate({ membershipId }, { pdfUrl: `/pdfs/${pdfFilename}`, $push: { history: { by: null, role: 'system', action: 'pdf_regenerated', note: 'PDF regenerated (manual test)', date: new Date() } } });

    console.log('✅ Test PDF written at:', pdfPath);
  } catch (e) {
    console.error('❌ Error generating test PDF:', e.message);
  }

  await mongoose.disconnect();
})();