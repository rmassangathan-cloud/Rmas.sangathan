require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const ejs = require('ejs');
const Membership = require('../models/Membership');

// Helper function to format date in Hindi
function formatDateHindi(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('hi-IN', options);
}

// Helper function to format designation
function formatDesignation(assignedLevel, assignedRole, assignedEntity) {
  if (!assignedLevel || !assignedRole) return 'Member';

  const roleMap = {
    'adhyaksh': 'Adhiyaksh',
    'sachiv': 'Secretary',
    'media_incharge': 'Media Incharge',
    'president': 'President',
    'secretary': 'Secretary'
  };

  const levelMap = {
    'state': 'Pardesh',
    'division': 'Divisional',
    'district': 'District',
    'block': 'Block'
  };

  const roleDisplay = roleMap[assignedRole] || assignedRole;
  const levelDisplay = levelMap[assignedLevel] || assignedLevel;

  if (assignedLevel === 'state') {
    return `${levelDisplay} ${roleDisplay}`;
  } else {
    return `${levelDisplay} ${roleDisplay} ${assignedEntity || ''}`.trim();
  }
}

async function generateIdCard(membershipId) {
  try {
    console.log('🔍 Finding membership:', membershipId);

    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/human-right');

    // Find the membership
    const membership = await Membership.findOne({ membershipId });
    if (!membership) {
      console.error('❌ Membership not found:', membershipId);
      return;
    }

    console.log('✅ Found membership:', membership.fullName);
    // Prefer the new assignedRoles array but keep legacy fields for compatibility
    const primaryAssigned = (membership.assignedRoles && membership.assignedRoles[0]) ? membership.assignedRoles[0] : null;
    console.log('Membership data:', {
      membershipId: membership.membershipId,
      fullName: membership.fullName,
      jobRole: membership.jobRole,
      teamType: membership.teamType,
      assignedRoles: membership.assignedRoles || null,
      primaryAssigned,
      photo: membership.photo,
      assignedAt: membership.assignedAt
    });

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
    if (!execPath) console.warn('⚠️ No Chrome/Chromium executable found (id card script); Puppeteer may fail to launch');
    console.log('Using Puppeteer executablePath:', execPath || 'default bundled');

    // Retry/backoff logic for transient Puppeteer failures
    const maxAttempts = parseInt(process.env.ID_CARD_RETRY || '3', 10);
    const baseBackoff = parseInt(process.env.ID_CARD_BACKOFF_MS || '500', 10);

    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    let lastError = null;
    let generated = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let browser;
      try {
        console.log(`Attempt ${attempt}/${maxAttempts}: launching browser`);
        browser = await puppeteer.launch({
          headless: 'new',
          executablePath: execPath || undefined,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process',
            '--no-zygote'
          ]
        });

        // Read ID card template
        const idCardTemplatePath = path.join(__dirname, '../views/pdf/id-card.ejs');
        const idCardTemplate = fs.readFileSync(idCardTemplatePath, 'utf8');

        // Load images
        let nhraLogo = '';
        let memberPhoto = '';
        let stampImage = '';

        try {
          const nhraLogoPath = path.join(__dirname, '../public/images/logo.jpeg');
          if (fs.existsSync(nhraLogoPath)) {
            nhraLogo = fs.readFileSync(nhraLogoPath).toString('base64');
            console.log('✅ RMAS logo loaded');
          } else {
            nhraLogo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
          }
        } catch (err) {
          console.error('❌ Error loading RMAS logo:', err.message);
          nhraLogo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
        }

        try {
          const memberPhotoPath = path.join(__dirname, '../public', membership.photo.replace('/uploads/', 'uploads/'));
          if (fs.existsSync(memberPhotoPath)) {
            memberPhoto = fs.readFileSync(memberPhotoPath).toString('base64');
            console.log('✅ Member photo loaded');
          } else {
            memberPhoto = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
          }
        } catch (err) {
          console.error('❌ Error loading member photo:', err.message);
          memberPhoto = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
        }

        try {
          const stampPath = path.join(__dirname, '../public/images/stamp.png');
          if (fs.existsSync(stampPath)) {
            stampImage = fs.readFileSync(stampPath).toString('base64');
            console.log('✅ Stamp loaded');
          } else {
            stampImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
          }
        } catch (err) {
          console.error('❌ Error loading stamp:', err.message);
          stampImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
        }

        // Generate QR code
        const qrCodeDataURL = await QRCode.toDataURL(`http://localhost:3000/verify/${membershipId}`);
        console.log('✅ QR code generated');

        // Format issue date
        const issueDateHindi = formatDateHindi(membership.assignedAt || new Date());

        // Determine assigned role details (prefer assignedRoles array)
        const assignedRoleCode = primaryAssigned ? (primaryAssigned.role || primaryAssigned.roleName) : (membership.assignedRole || membership.jobRole);
        const assignedLevel = primaryAssigned ? (primaryAssigned.level || null) : membership.assignedLevel || null;
        const assignedEntity = primaryAssigned ? (primaryAssigned.location || primaryAssigned.assignedEntity) : membership.assignedEntity || null;

        // Format designation from the resolved values
        const designation = formatDesignation(assignedLevel, assignedRoleCode, assignedEntity);
        // Render template
        const idCardHtml = ejs.render(idCardTemplate, {
          membership,
          nhraLogo,
          memberPhoto,
          stampImage,
          qrCodeDataURL,
          issueDateHindi,
          designation
        });

        // Create page and generate PDF
        const page = await browser.newPage();
        await page.setContent(idCardHtml, { waitUntil: 'networkidle0' });

        const idCardBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });

        // Save PDF
        const pdfDir = path.join(__dirname, '../public/pdfs');
        if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

        const idCardFilename = `id_card_${membershipId.replace(/\//g, '_')}.pdf`;
        const idCardPath = path.join(pdfDir, idCardFilename);
        fs.writeFileSync(idCardPath, idCardBuffer);

        // Update membership with URL
        membership.idCardUrl = `/pdfs/${idCardFilename}`;
        await membership.save();

        console.log('✅ ID Card generated and saved:', idCardPath);
        console.log('📄 URL:', membership.idCardUrl);

        generated = true;

        await browser.close();
        break;

      } catch (err) {
        lastError = err;
        console.error(`❌ Attempt ${attempt} failed:`, err && err.message);
        if (err && err.stack) console.error(err.stack);
        try {
          if (browser) await browser.close();
        } catch (closeErr) {
          console.error('❌ Error closing browser after failure:', closeErr && closeErr.message);
        }

        if (attempt < maxAttempts) {
          const delay = baseBackoff * attempt;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    if (!generated) {
      throw lastError || new Error('Unknown error generating ID card after retries');
    }

  } catch (err) {
    console.error('❌ Error generating ID card:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    await mongoose.disconnect();
  }
}

// Export for tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateIdCard };
}

// If run directly, invoke
if (require.main === module) {
  // Get membership ID from command line argument
  const membershipId = process.argv[2];
  if (!membershipId) {
    console.error('❌ Please provide a membership ID as argument');
    console.log('Usage: node generate_id_card_correct.js "RMAS/BIH/KAT/2026/001"');
    process.exit(1);
  }
  generateIdCard(membershipId);
}
