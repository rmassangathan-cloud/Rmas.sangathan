require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const ejs = require('ejs');
const Membership = require('../models/Membership');

function formatDateHindi(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('hi-IN', options);
}

(async function main() {
  const membershipId = process.argv[2];
  if (!membershipId) { console.error('Usage: node generate_joining_letter.js <membershipId>'); process.exit(1); }

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/human-right');
  const m = await Membership.findOne({ membershipId });
  if (!m) { console.error('Membership not found:', membershipId); await mongoose.disconnect(); process.exit(1); }

  console.log('Found membership:', m.fullName, '-', membershipId);

  // Resolve Puppeteer exec path (env override, then common paths)
  let execPath = process.env.PUPPETEER_EXECUTABLE_PATH || '';
  execPath = execPath ? execPath.replace(/^"(.*)"$/, '$1') : '';
  if (!execPath) {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    execPath = candidates.find(p => fs.existsSync(p)) || '';
  }
  if (!execPath) console.warn('⚠️ No Chrome/Chromium executable found; Puppeteer may fail to launch');
  console.log('Using Puppeteer executablePath:', execPath || 'default bundled');
  const browser = await puppeteer.launch({ headless: 'new', executablePath: execPath || undefined, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();

    const templatePath = path.join(__dirname, '..', 'views', 'pdf', 'joining-letter.ejs');
    const template = fs.readFileSync(templatePath, 'utf8');

    // images
    let nhraLogo = '';
    let memberPhoto = '';
    let digitalSignature = '';
    let officialStamp = '';

    try {
      const nhraLogoPath = path.join(__dirname, '..', 'public', 'images', 'logo.jpeg');
      if (fs.existsSync(nhraLogoPath)) nhraLogo = fs.readFileSync(nhraLogoPath).toString('base64');
    } catch(e){ console.warn('nhra logo load failed', e.message); }

    try { const memberPhotoPath = path.join(__dirname, '..', 'public', m.photo.replace('/uploads/', 'uploads/')); if (fs.existsSync(memberPhotoPath)) memberPhoto = fs.readFileSync(memberPhotoPath).toString('base64'); } catch(e){ console.warn('member photo load failed', e.message); }

    // placeholders
    digitalSignature = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
    officialStamp = digitalSignature;

    // QR and verify
    const membershipIdFinal = m.membershipId || membershipId;
    const verifyUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/verify/${membershipIdFinal}`;
    const qrCodeDataURL = await QRCode.toDataURL(verifyUrl);

    const issueDateHindi = formatDateHindi(new Date());
    const startDate = issueDateHindi;
    const endDate = formatDateHindi(new Date(new Date().setFullYear(new Date().getFullYear()+1)));

    // map primary assigned role
    const primaryAssigned = (m.assignedRoles && m.assignedRoles[0]) ? m.assignedRoles[0] : null;
    const memberForTemplate = {
      name: m.fullName || 'N/A',
      email: m.email || 'N/A',
      phone: m.mobile || 'N/A',
      role: primaryAssigned ? (primaryAssigned.roleName || primaryAssigned.role) : (m.jobRole || 'N/A'),
      role_hin: primaryAssigned ? (primaryAssigned.roleName || null) : (m.jobRole || null),
      team: primaryAssigned ? (primaryAssigned.teamType || m.teamType) : (m.teamType || '—'),
      level: primaryAssigned ? (primaryAssigned.level || '—') : '—'
    };

    const html = ejs.render(template, {
      membership: m,
      member: memberForTemplate,
      qrDataUrl: qrCodeDataURL,
      qrCodeDataURL,
      rmasLogo: nhraLogo,
      nhraLogo,
      memberPhoto,
      signatureUrl: 'data:image/png;base64,'+digitalSignature,
      officialStamp,
      issueDateHindi,
      date: issueDateHindi,
      startDate,
      endDate,
      membershipId: membershipIdFinal,
      refNo: m.refNo || '',
      verifyUrl,
      signerName: process.env.SIGNER_NAME || 'State President',
      signerDesignation: process.env.SIGNER_DESIGNATION || 'RMAS Bihar',
      orgWebsite: process.env.ORG_WEBSITE || 'https://rmas.org.in',
      orgPhone: process.env.ORG_PHONE || 'N/A',
      orgAddress: process.env.ORG_ADDRESS || 'D-2, S/F, Gali No. 9, Best Jyoti Nagar, Shahdara, Delhi-94'
    });

    await page.setContent(html, { waitUntil: 'networkidle0' });
    // Use 0 page margins so header can sit flush to top; content margins applied via template
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }, preferCSSPageSize: true });

    const pdfDir = path.join(__dirname, '..', 'public', 'pdfs'); if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
    const pdfFilename = membershipIdFinal.replace(/\//g, '_') + '_joining_letter.pdf';
    const pdfPath = path.join(pdfDir, pdfFilename);
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Update membership with pdfUrl and history
    m.pdfUrl = `/pdfs/${pdfFilename}`;
    m.history = m.history || [];
    m.history.push({ by: null, role: 'system', action: 'pdf_regenerated', note: 'Joining letter generated (script)', date: new Date() });
    await m.save();

    console.log('✅ Joining letter generated and saved:', m.pdfUrl);

    await browser.close();
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error generating joining letter:', err);
    if (browser) await browser.close();
    await mongoose.disconnect();
    process.exit(1);
  }
})();