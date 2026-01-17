require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const ejs = require('ejs');

(async function(){
  const templatePath = path.join(__dirname, '..', 'views', 'pdf', 'joining-letter.ejs');
  const template = fs.readFileSync(templatePath, 'utf8');

  // load logo
  let nhraLogo = '';
  try { const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo.jpeg'); if (fs.existsSync(logoPath)) nhraLogo = fs.readFileSync(logoPath).toString('base64'); } catch(e){console.warn('logo load failed', e.message)}

  // load stamp
  let stampBase64 = '';
  try { const stampPath = path.join(__dirname, '..', 'public', 'images', 'stamp.png'); if (fs.existsSync(stampPath)) stampBase64 = fs.readFileSync(stampPath).toString('base64'); } catch(e){console.warn('stamp load failed', e.message)}

  const html = ejs.render(template, {
    membership: {
      assignedRoles: [{
        level: 'district',
        roleName: 'Media Incharge',
        location: 'Katihar'
      }]
    },
    member: { name: 'Test User', email: 'test@example.com', role: 'Volunteer', role_hin: 'स्वयंसेवक', team: 'State', level: 'State' },
    qrDataUrl: '',
    qrCodeDataURL: '',
    rmasLogo: nhraLogo,
    nhraLogo,
    memberPhoto: '',
    stampBase64,
    signatureUrl: '',
    officialStamp: '',
    issueDateHindi: '14 जनवरी 2026',
    date: '14 जनवरी 2026',
    startDate: '14 जनवरी 2026',
    endDate: '13 जनवरी 2027',
    membershipId: 'TEST-0001',
    refNo: 'REF-TEST',
    verifyUrl: '',
    signerName: 'State President',
    signerDesignation: 'RMAS Bihar',
    orgWebsite: 'https://rmas.org.in',
    orgPhone: 'N/A',
    orgAddress: 'D-2, S/F, Gali No. 9, Best Jyoti Nagar, Shahdara, Delhi-94'
  });

  // find chrome
  let execPath = process.env.PUPPETEER_EXECUTABLE_PATH || '';
  execPath = execPath ? execPath.replace(/^"(.*)"$/, '$1') : '';
  if (!execPath) {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    execPath = candidates.find(p => fs.existsSync(p)) || '';
  }

  const browser = await puppeteer.launch({ headless: true, executablePath: execPath || undefined, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' } });
    const out = path.join(__dirname, '..', 'public', 'pdfs', 'test_joining_letter.pdf');
    const pdfDir = path.dirname(out); if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
    fs.writeFileSync(out, pdfBuffer);
    console.log('✅ Test PDF generated:', out);
    await browser.close();
  } catch(err){ console.error('Error generating test pdf:', err); if (browser) await browser.close(); process.exit(1)}
})();
