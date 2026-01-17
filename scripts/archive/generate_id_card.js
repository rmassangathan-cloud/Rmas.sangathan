const mongoose = require('mongoose');
const Membership = require('../models/Membership');
const QRCode = require('qrcode');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

require('dotenv').config();

async function generateIdCard(memberId) {
  try {
    console.log('🔍 Finding member:', memberId);
    const member = await Membership.findById(memberId);

    if (!member) {
      console.error('❌ Member not found');
      return;
    }

    if (member.status !== 'accepted') {
      console.error('❌ Member not accepted');
      return;
    }

    console.log('✅ Member found:', member.fullName);

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(`${process.env.BASE_URL || 'http://localhost:5000'}/verify/${member.membershipId}`);

    // Generate ID card PDF with retry/backoff
    const maxAttempts = parseInt(process.env.ID_CARD_RETRY || '3', 10);
    const baseBackoff = parseInt(process.env.ID_CARD_BACKOFF_MS || '500', 10);
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    let lastErr = null;
    let pdfBuffer = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let browser = null;
      try {
        console.log(`Attempt ${attempt}/${maxAttempts}: launching browser for ID card`);
        browser = await puppeteer.launch({
          headless: 'new',
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process',
            '--no-zygote'
          ]
        });

        const page = await browser.newPage();

        // Read EJS template
        const templatePath = path.join(__dirname, '..', 'views', 'pdf', 'id-card.ejs');
        const template = fs.readFileSync(templatePath, 'utf8');

        // Read and encode images to base64
        let memberPhoto = '';
        let nhraLogo = '';

        try {
          const memberPhotoPath = path.join(__dirname, '..', 'public', member.photo.replace('/uploads/', 'uploads/'));
          if (fs.existsSync(memberPhotoPath)) {
            memberPhoto = fs.readFileSync(memberPhotoPath).toString('base64');
          }
        } catch (err) {
          console.error('Error loading member photo:', err.message);
        }

        try {
          const nhraLogoPath = path.join(__dirname, '..', 'public', 'images', 'logo.jpeg');
          if (fs.existsSync(nhraLogoPath)) {
            nhraLogo = fs.readFileSync(nhraLogoPath).toString('base64');
          }
        } catch (err) {
          console.error('Error loading NHRA logo:', err.message);
        }

        // Render EJS template
        const html = ejs.render(template, {
          member,
          qrCodeDataURL,
          memberPhoto,
          nhraLogo
        });

        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Generate PDF
        pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '10mm',
            right: '10mm',
            bottom: '10mm',
            left: '10mm'
          }
        });

        await browser.close();
        console.log('✅ ID card buffer created');
        break;
      } catch (err) {
        lastErr = err;
        console.error(`❌ ID card attempt ${attempt} failed:`, err && err.message);
        try { if (browser) await browser.close(); } catch (closeErr) { console.error('Error closing browser after failure:', closeErr && closeErr.message); }
        if (attempt < maxAttempts) {
          const delay = baseBackoff * attempt;
          console.log(`⏳ Retrying ID card generation in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    if (!pdfBuffer) throw lastErr || new Error('ID card generation failed after retries');

    // Save PDF
    const pdfDir = path.join(__dirname, '..', 'public', 'pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfFilename = `id_card_${member.membershipId.replace(/\//g, '_')}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);
    fs.writeFileSync(pdfPath, pdfBuffer);

    console.log('✅ ID card generated:', pdfPath);

    // Update member record
    member.idCardUrl = `/pdfs/${pdfFilename}`;
    member.history = member.history || [];
    member.history.push({
      by: null,
      role: 'system',
      action: 'id_card_generated',
      note: 'ID card generated',
      timestamp: new Date()
    });
    await member.save();

    console.log('✅ Member record updated');

  } catch (error) {
    console.error('❌ Error generating ID card:', error);
  }
}

// If run directly
if (require.main === module) {
  const memberId = process.argv[2];
  if (!memberId) {
    console.error('Usage: node generate_id_card.js <memberId>');
    process.exit(1);
  }

  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      return generateIdCard(memberId);
    })
    .then(() => {
      console.log('✅ ID card generation completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = { generateIdCard };