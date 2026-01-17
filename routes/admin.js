const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Membership = require('../models/Membership');
const { ensureRole, ensureAuthenticated } = require('../middleware/auth');
const { canAccessApplication, requireSuperAdmin, canPerformActions, canAssignRoleAtLevel } = require('../middleware/role');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const ejs = require('ejs');

// Helper function to generate membership ID
async function generateMembershipId(district) {
  const year = new Date().getFullYear();
  const districtCode = district.substring(0, 3).toUpperCase(); // First 3 letters

  // Find the last membership ID for this district and year
  const lastMembership = await Membership.findOne({
    membershipId: new RegExp(`RMAS/BIH/${districtCode}/${year}/`)
  }).sort({ membershipId: -1 });

  let serial = 1;
  if (lastMembership && lastMembership.membershipId) {
    const parts = lastMembership.membershipId.split('/');
    if (parts.length === 5) {
      serial = parseInt(parts[4]) + 1;
    }
  }

  return `RMAS/BIH/${districtCode}/${year}/${String(serial).padStart(3, '0')}`;
}

// Helper function to format date in English
function formatDateEnglish(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-IN', options);
}

// Helper function to generate PDF
async function generateMembershipPDF(membership, qrCodeDataURL) {
   console.log('🎨 Starting PDF generation for:', membership.fullName);

   // Resolve Puppeteer executable path: prefer env, else check common Chrome locations
   console.log('RAW env PUPPETEER_EXECUTABLE_PATH:', JSON.stringify(process.env.PUPPETEER_EXECUTABLE_PATH));
   let execPath = process.env.PUPPETEER_EXECUTABLE_PATH || '';
   execPath = execPath ? execPath.replace(/^"(.*)"$/, '$1') : '';
   console.log('Sanitized execPath candidate:', execPath);
   if (!execPath) {
      const candidates = [
         'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
         'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      ];
      execPath = candidates.find(p => fs.existsSync(p)) || '';
      console.log('Found execPath from common candidates:', execPath || 'none');
   }
   if (!execPath) {
      console.warn('⚠️ No Chrome/Chromium executable found in env or common paths; Puppeteer may fail to launch');
   } else if (!fs.existsSync(execPath)) {
      console.warn('⚠️ Puppeteer exec path set but file not found:', execPath);
   }
   console.log('Using Puppeteer executablePath:', execPath || 'default bundled');

   // Browser will be launched inside the retry loop below so each attempt gets a fresh process
   // (this helps in cases where prior launches may have left a bad state)

   // Try multiple attempts to create the page+PDF to handle transient Puppeteer errors
   const maxAttempts = parseInt(process.env.PDF_RETRY || '3', 10);
   const baseBackoff = parseInt(process.env.PDF_BACKOFF_MS || '500', 10);
   const sleep = (ms) => new Promise(res => setTimeout(res, ms));

   let lastError = null;
   let pdfBuffer = null;

   // Read EJS template and image assets once
   const templatePath = path.join(__dirname, '../views/pdf/joining-letter.ejs');
   console.log('📄 Reading template from:', templatePath);
   const template = fs.readFileSync(templatePath, 'utf8');

   // Read and encode images to base64 with error handling
   let nhraLogo = '';
   let memberPhoto = '';
   let digitalSignature = '';
   let officialStamp = '';
   let stampBase64 = '';

   try {
      const nhraLogoPath = path.join(__dirname, '../public/images/logo.jpeg');
      if (fs.existsSync(nhraLogoPath)) {
         nhraLogo = fs.readFileSync(nhraLogoPath).toString('base64');
         console.log('✅ RMAS logo loaded');
      } else {
         console.log('⚠️ RMAS logo not found, using placeholder');
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
         console.log('⚠️ Member photo not found, using placeholder');
         memberPhoto = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
      }
   } catch (err) {
      console.error('❌ Error loading member photo:', err.message);
      memberPhoto = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
   }

   try {
      console.log('📝 Using placeholder for digital signature');
      digitalSignature = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
   } catch (err) {
      console.error('❌ Error creating digital signature placeholder:', err.message);
      digitalSignature = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
   }

   try {
      console.log('🏛️ Using placeholder for official stamp');
      officialStamp = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
   } catch (err) {
      console.error('❌ Error creating official stamp placeholder:', err.message);
      officialStamp = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
   }

   // Load stamp image for member photo overlay
   try {
      const stampPath = path.join(__dirname, '../public/images/stamp.png');
      if (fs.existsSync(stampPath)) {
         stampBase64 = fs.readFileSync(stampPath).toString('base64');
         console.log('✅ Stamp image loaded');
      } else {
         console.log('⚠️ Stamp image not found, using placeholder');
         stampBase64 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
      }
   } catch (err) {
      console.error('❌ Error loading stamp image:', err.message);
      stampBase64 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
   }

   // Format issue date in English
   const issueDateEnglish = formatDateEnglish(new Date());
   console.log('📅 Issue date in English:', issueDateEnglish);

   // Map primary assigned role into a simple member object for the template
   let primaryAssigned = (membership.assignedRoles && membership.assignedRoles[0]) ? membership.assignedRoles[0] : null;
   let memberForTemplate = {
     name: membership.fullName || 'N/A',
     email: membership.email || 'N/A',
     phone: membership.mobile || membership.phone || 'N/A',
     role: primaryAssigned ? (primaryAssigned.roleName || primaryAssigned.role) : (membership.jobRole || 'Member'),
     role_hin: null,
     team: primaryAssigned ? (primaryAssigned.teamType || membership.teamType) : (membership.teamType || '—'),
     level: primaryAssigned ? (primaryAssigned.level || '—') : '—'
   };

   // Try to resolve Hindi role name from roles_hierarchy if available
   try {
     const rolesPath = path.join(__dirname, '../public/locations/roles_hierarchy.json');
     if (fs.existsSync(rolesPath)) {
       const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
       if (primaryAssigned && primaryAssigned.role && !memberForTemplate.role_hin) {
         for (const catKey of Object.keys(rolesData.categories || {})) {
           const match = (rolesData.categories[catKey].roles || []).find(r => r.code === primaryAssigned.role || r.code === primaryAssigned.roleCode);
           if (match) {
             memberForTemplate.role_hin = match.name;
             break;
           }
         }
       }
     }
   } catch (e) {
     console.error('⚠️ roles_hierarchy lookup failed:', e.message);
   }
   if (!memberForTemplate.role_hin) memberForTemplate.role_hin = memberForTemplate.role || null;

   // Dates and membership metadata
   const date = issueDateEnglish;
   const startDate = issueDateEnglish;
   const endDate = formatDateEnglish(new Date(new Date().setFullYear(new Date().getFullYear() + 1)));
   const membershipIdVal = membership.membershipId || null;
   const verifyUrl = membershipIdVal ? `${process.env.APP_BASE_URL || 'http://localhost:3000'}/verify/${membershipIdVal}` : null;

   // Add member photo to memberForTemplate for template access
   memberForTemplate.photo = memberPhoto ? 'data:image/jpeg;base64,' + memberPhoto : null;

   // Render EJS template with aligned variables and base64 signature
   console.log('🔧 Rendering EJS template...');
   const html = ejs.render(template, {
      membership,
      member: memberForTemplate,
      qrDataUrl: qrCodeDataURL,
      qrCodeDataURL,
      rmasLogo: nhraLogo,
      nhraLogo,
      memberPhoto: memberPhoto ? 'data:image/jpeg;base64,' + memberPhoto : null,
      stampBase64,
      signatureUrl: 'data:image/png;base64,' + digitalSignature,
      officialStamp,
      issueDateEnglish,
      date,
      startDate,
      endDate,
      membershipId: membershipIdVal,
      refNo: membership.refNo || '',
      verifyUrl,
      signerName: process.env.SIGNER_NAME || 'State President',
      signerDesignation: process.env.SIGNER_DESIGNATION || 'RMAS Bihar',
      orgWebsite: process.env.ORG_WEBSITE || 'https://rmas.org.in',
      orgPhone: process.env.ORG_PHONE || 'N/A',
      orgAddress: process.env.ORG_ADDRESS || 'D-2, S/F, Gali No. 9, Best Jyoti Nagar, Shahdara, Delhi-94'
   });

   // Attempt to generate PDF with retries
   let launchExec = execPath || undefined;
   for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let browser = null;
      try {
         console.log(`Attempt ${attempt}/${maxAttempts}: launching browser (execPath: ${launchExec ? 'custom' : 'bundled'})`);
         // Use Windows-friendly flags and avoid single-process mode which can be unstable on some platforms
         const launchOpts = { headless: 'new', args: [ '--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-extensions' ] };
         if (launchExec) launchOpts.executablePath = launchExec;
         // Optional: enable Chromium stdout/stderr capture when debugging (set PUPPETEER_DUMPIO=true in env)
         if (process.env.PUPPETEER_DUMPIO === 'true') {
           console.log('🪵 Puppeteer dumpio enabled (dumping Chromium stdout/stderr to the server logs)');
           launchOpts.dumpio = true;
         }
         browser = await puppeteer.launch(launchOpts);

         const page = await browser.newPage();
         // Workaround for transient 'Requesting main frame too early' errors on some Chrome installations
         try {
           await page.goto('about:blank', { waitUntil: 'load', timeout: 5000 });
         } catch (gErr) {
           console.warn('⚠️ about:blank navigation failed or timed out:', gErr && gErr.message);
         }

         // Give the page a short moment to be usable
         try { await page.waitForTimeout(150); } catch (e) { /* ignore */ }

         console.log('📄 Setting page content...');
         // First try in-memory setContent
         let setContentSucceeded = false;
         try {
           await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
           setContentSucceeded = true;
         } catch (setErr) {
           console.error('❌ page.setContent failed:', setErr && setErr.message);
           // Attempt file-based fallback in the same attempt
           try {
             const os = require('os');
             const tmpDir = path.join(os.tmpdir(), 'rmas_pdf');
             if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
             const tmpFile = path.join(tmpDir, `joining_${membership._id || Date.now()}_${attempt}.html`);
             fs.writeFileSync(tmpFile, html, 'utf8');
             console.log('🗂️ Wrote fallback HTML to:', tmpFile);

             // Use file:// URL to load the content
             const fileUrl = `file:///${tmpFile.replace(/\\/g, '/')}`;
             console.log('📄 Navigating to fallback file URL:', fileUrl);
             await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 20000 });

             // Ensure DOM is fully ready
             try { await page.waitForFunction('document.readyState === "complete"', { timeout: 5000 }); } catch(e) {}

             setContentSucceeded = true;
           } catch (fileErr) {
             console.error('❌ File-based fallback failed:', fileErr && (fileErr.stack || fileErr.message));
           }
         }

         if (!setContentSucceeded) {
           throw new Error('Both setContent and file-based fallback failed');
         }

         console.log('📋 Generating PDF...');
         pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '15mm', bottom: '0mm', left: '15mm' } });
         console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
         await browser.close();
         break;
      } catch (err) {
         lastError = err;
         console.error(`❌ PDF attempt ${attempt} failed:`, err && err.message);
         if (err && err.stack) console.error(err.stack);

         // If we see frame/session related errors, try again without custom executable path
         try {
           const msg = (err && err.message) ? err.message.toString() : '';
           if (/Requesting main frame too early|Session closed/i.test(msg)) {
             if (launchExec) {
               console.warn('⚠️ Detected frame/session error - retrying without custom PUPPETEER_EXECUTABLE_PATH');
               launchExec = undefined; // next attempt will use bundled Chromium
             }
           }
         } catch (e) { /* ignore */ }

         try { if (browser) await browser.close(); } catch (closeErr) { console.error('Error closing browser after failure:', closeErr && closeErr.message); }
         if (attempt < maxAttempts) {
            const delay = baseBackoff * attempt;
            console.log(`⏳ Retrying PDF generation in ${delay}ms...`);
            await sleep(delay);
         }
      }
   }

   if (!pdfBuffer) {
      console.error('❌ All PDF generation attempts failed, attempting a minimal fallback PDF');
      try {
         const fallbackHtml = `<!doctype html><html><head><meta charset="utf-8"><title>RMAS Joining Letter (Fallback)</title></head><body><div style="font-family: Arial, sans-serif; padding: 20px;"><h1>RMAS Joining Letter</h1><p><strong>Name:</strong> ${membership.fullName || 'N/A'}</p><p><strong>Membership ID:</strong> ${membership.membershipId || membershipIdVal || 'N/A'}</p><p>This is a fallback joining letter generated because the full template failed to render.</p></div></body></html>`;

         const fbLaunchOpts = { headless: 'new', args: [ '--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote' ] };
         if (launchExec) fbLaunchOpts.executablePath = launchExec;

         const browserFb = await puppeteer.launch(fbLaunchOpts);
         const pageFb = await browserFb.newPage();
         try { await pageFb.goto('about:blank', { waitUntil: 'load', timeout: 5000 }); } catch (gErr) { console.warn('⚠️ about:blank nav in fallback failed:', gErr && gErr.message); }
         try { await pageFb.waitForTimeout(200); } catch(e) {}
         await pageFb.setContent(fallbackHtml, { waitUntil: 'networkidle0', timeout: 10000 });
         pdfBuffer = await pageFb.pdf({ format: 'A4', printBackground: true });
         await browserFb.close();
         console.log('✅ Fallback PDF generated successfully, size:', pdfBuffer && pdfBuffer.length);
      } catch (fbErr) {
         console.error('❌ Fallback PDF generation failed:', fbErr && (fbErr.stack || fbErr.message));
      }
   }

   if (!pdfBuffer) {
      console.error('❌ All PDF generation attempts (including fallback) failed');
      throw lastError || new Error('Unknown error generating PDF');
   }

   return pdfBuffer;
}

// Admin login redirect
router.get('/login', (req, res) => {
  res.redirect('/login');
});

// dashboard - show based on user role
router.get('/', ensureAuthenticated, (req, res) => {
  res.render('admin/dashboard');
});

// list users
router.get('/users', ensureRole('superadmin'), async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.render('admin/users', { users });
});

// ----- Forms management -----
// list forms scoped to current user/role
router.get('/forms', ensureAuthenticated, async (req, res) => {
  console.log('📋 Admin forms page accessed by:', req.user.email, 'Role:', req.user.role);

  const q = {};
  const qstatus = req.query.status;
  if (qstatus) q.status = qstatus;

  if (req.user.role === 'superadmin') {
    console.log('👑 Superadmin - no filters applied');
    // no additional filters
  } else {
    // Use cascade permissions to determine accessible entities
    const accessibleEntities = getAccessibleEntities(req.user);
    if (accessibleEntities.length === 0) {
      q._id = null; // no access
      console.log('❌ No accessible entities for user');
    } else {
      q.$or = accessibleEntities;
      console.log('🔍 User can access:', JSON.stringify(accessibleEntities, null, 2));
    }
  }

  console.log('🔍 Query:', JSON.stringify(q, null, 2));

  try {
    const forms = await Membership.find(q).sort({ createdAt: -1 }).populate('assignedTo', 'name email').lean();
    console.log('📊 Found', forms.length, 'forms');

    // Log first few forms for debugging
    if (forms.length > 0) {
      console.log('📄 First form sample:', {
        id: forms[0]._id,
        fullName: forms[0].fullName,
        status: forms[0].status,
        district: forms[0].district,
        createdAt: forms[0].createdAt
      });
    }

    res.render('admin/forms', { forms, qstatus });
  } catch (err) {
    console.error('❌ Error fetching forms:', err);
    res.render('admin/forms', { forms: [], qstatus, error: 'Failed to load forms' });
  }
});

// Claim a form (take ownership) - only if unassigned and user has scope
router.post('/forms/:id/claim', ensureAuthenticated, async (req, res) => {
  try {
    const form = await Membership.findById(req.params.id);
    if (!form) return res.redirect('/admin/forms');

    if (form.status !== 'pending') return res.status(400).send('Only pending forms can be claimed');
    if (form.assignedTo) return res.status(400).send('Form already assigned');

    const canClaim = canPerformActions(req.user, form);
    if (!canClaim) return res.status(403).send('Forbidden');

    form.assignedTo = req.user._id;
    form.history = form.history || [];
    form.history.push({ by: req.user._id, role: req.user.role, action: 'claimed', note: req.body.note || 'Claimed by user', date: new Date() });
    await form.save();

    // notify applicant that form is being processed (optional)
    const { sendMail } = require('../utils/mailer');
    if (form.email) {
      try {
        await sendMail({ from: process.env.EMAIL_USER, to: form.email, subject: 'आपका आवेदन अब प्रोसेस में है', text: `नमस्ते ${form.fullName},\n\nआपके आवेदन को ${req.user.name} (हमारे अधिकारी) द्वारा लिया गया है और अब प्रोसेस किया जा रहा है।\n\nधन्यवाद,\nRMAS` });
      } catch (e) { console.error('Claim email error:', e); }
    }

    res.redirect('/admin/forms');
  } catch (err) {
    console.error('Claim form error:', err);
    res.redirect('/admin/forms');
  }
});

// Quick accept from list
router.post('/forms/:id/accept-quick', ensureAuthenticated, async (req, res) => {
  try {
    const form = await Membership.findById(req.params.id);
    if (!form) return res.redirect('/admin/forms');
    const allowed = canPerformActions(req.user, form);
    if (!allowed) return res.status(403).send('Forbidden');
    form.status = 'accepted';
    form.history = form.history || [];
    form.history.push({ by: req.user._id, role: req.user.role, action: 'accepted', note: 'Accepted (quick)', date: new Date() });
    await form.save();
    const { sendMail } = require('../utils/mailer');
    if (form.email) {
      try { await sendMail({ from: process.env.EMAIL_USER, to: form.email, subject: 'आपका सदस्यता आवेदन स्वीकार किया गया', text: `नमस्ते ${form.fullName},\n\nआपका सदस्यता आवेदन स्वीकार कर लिया गया है।\n\nधन्यवाद,\nRMAS` }); } catch (e) { console.error('Quick accept email error:', e); }
    }
    res.redirect('/admin/forms');
  } catch (err) {
    console.error('Quick accept error:', err);
    res.redirect('/admin/forms');
  }
});

// Quick reject from list
router.post('/forms/:id/reject-quick', ensureAuthenticated, async (req, res) => {
  try {
    const form = await Membership.findById(req.params.id);
    if (!form) return res.redirect('/admin/forms');
    const allowed = canPerformActions(req.user, form);
    if (!allowed) return res.status(403).send('Forbidden');
    form.status = 'rejected';
    form.history = form.history || [];
    form.history.push({ by: req.user._id, role: req.user.role, action: 'rejected', note: 'Rejected (quick)', date: new Date() });
    await form.save();
    const { sendMail } = require('../utils/mailer');
    if (form.email) {
      try { await sendMail({ from: process.env.EMAIL_USER, to: form.email, subject: 'आपका सदस्यता आवेदन अस्वीकृत हुआ', text: `नमस्ते ${form.fullName},\n\nकृपया सूचित किया जाता है कि आपका सदस्यता आवेदन अस्वीकृत कर दिया गया है।\n\nधन्यवाद,\nRMAS` }); } catch (e) { console.error('Quick reject email error:', e); }
    }
    res.redirect('/admin/forms');
  } catch (err) {
    console.error('Quick reject error:', err);
    res.redirect('/admin/forms');
  }
});

// view single form and eligible users for assignment
router.get('/forms/:id', ensureAuthenticated, async (req,res) => {
  try {
    const form = await Membership.findById(req.params.id).populate('assignedTo').lean();
    if (!form) return res.redirect('/admin/forms');

    // Authorization: ensure current user can view/manage this form
    const canView = canPerformActions(req.user, form);
    if (!canView) return res.status(403).send('Forbidden');

    // Backfill assignedRoles from legacy fields if necessary so UI shows role immediately
    try {
      if (form.status === 'accepted' && (!form.assignedRoles || form.assignedRoles.length === 0) && form.jobRole && form.teamType) {
        console.log('🔁 Backfilling assignedRoles from legacy fields for form:', form._id.toString());
        form.assignedRoles = [{
          category: 'karyakarini',
          role: form.jobRole,
          roleName: form.jobRole,
          teamType: form.teamType,
          level: 'state',
          location: form.state || null,
          assignedBy: null,
          assignedAt: new Date(),
          reason: 'Backfilled from legacy fields on view'
        }];
        form.history = form.history || [];
        form.history.push({ by: req.user ? req.user._id : null, role: req.user ? req.user.role : 'system', action: 'role_assigned', note: `Backfilled legacy role: ${form.jobRole} / ${form.teamType}`, date: new Date() });
        await form.save();
        console.log('✅ Backfilled assignedRoles for form:', form._id.toString());
      }
    } catch (bfErr) {
      console.error('❌ Backfill on view error:', bfErr.message);
    }

    // Log document URLs to help debug missing Character Certificate in admin view
    try {
      const certUrl = form.documentsUrl || form.characterCertUrl || form.aadhaarUrl || null;
      console.log('Viewing form id:', form._id.toString(), 'documentsUrl:', form.documentsUrl, 'characterCertUrl:', form.characterCertUrl, 'aadhaarUrl:', form.aadhaarUrl);
      if (certUrl && certUrl.startsWith('/uploads/')) {
        const filePath = require('path').join(__dirname, '..', 'public', certUrl.replace(/^\//, ''));
        const fs = require('fs');
        console.log('Character certificate file exists on disk:', fs.existsSync(filePath), 'path:', filePath);
      }
    } catch (logErr) { console.error('Error logging certUrl for form view:', logErr); }

    // determine eligible users based on current user's cascade permissions
    let users = [];
    if (req.user.role === 'superadmin') {
      users = await User.find().lean();
    } else {
      // Users that the current user can assign to (within their cascade scope)
      const accessibleEntities = getAccessibleEntities(req.user);
      if (accessibleEntities.length > 0) {
        // Find users who have access to the same or lower levels
        const userQuery = { role: { $ne: 'superadmin' } };
        const orConditions = [];

        accessibleEntities.forEach(entity => {
          if (entity.state) {
            orConditions.push({ assignedLevel: 'state', assignedId: entity.state });
          }
          if (entity.division) {
            orConditions.push({ assignedLevel: 'division', assignedId: entity.division });
          }
          if (entity.district && entity.district.$in) {
            entity.district.$in.forEach(district => {
              orConditions.push({ assignedLevel: 'district', assignedId: district });
            });
          }
          if (entity.block && entity.block.$in) {
            entity.block.$in.forEach(block => {
              orConditions.push({ assignedLevel: 'block', assignedId: block });
            });
          }
        });

        if (orConditions.length > 0) {
          userQuery.$or = orConditions;
          users = await User.find(userQuery).lean();
        }
      }
    }

    res.render('admin/form_view', { form, users });
  } catch (err) {
    console.error('View form error:', err);
    res.redirect('/admin/forms');
  }
});

// assign form to a user (or clear assignment)
router.post('/forms/:id/assign', ensureAuthenticated, async (req, res) => {
  try {
    const form = await Membership.findById(req.params.id);
    if (!form) return res.redirect('/admin/forms');

    const userId = req.body.userId || null;

    // authorization: only allow assign if current user has scope over this form
    const canAssign = canPerformActions(req.user, form);
    if (!canAssign) return res.status(403).send('Forbidden');

    if (userId) {
      const u = await User.findById(userId);
      if (u) {
        form.assignedTo = u._id;
        form.history = form.history || [];
        form.history.push({ by: req.user._id, role: req.user.role, action: 'assigned', note: `Assigned to ${u.name} (${u.role})`, date: new Date() });
      }
    } else {
      // clear assignment
      form.assignedTo = null;
      form.history = form.history || [];
      form.history.push({ by: req.user._id, role: req.user.role, action: 'unassigned', note: 'Assignment cleared', date: new Date() });
    }

    await form.save();
    res.redirect('/admin/forms/' + req.params.id);
  } catch (err) {
    console.error('Assign form error:', err);
    res.redirect('/admin/forms');
  }
});

// Accept a form with comprehensive logging and error handling
router.post('/forms/:id/accept', ensureAuthenticated, async (req, res) => {
  console.log('🎯 ACCEPT ROUTE TRIGGERED');
  console.log('📋 Form ID:', req.params.id);
  console.log('👤 User:', req.user.email, 'Role:', req.user.role);

  try {
    // 1. Find the form
    console.log('🔍 Finding membership...');
    const form = await Membership.findById(req.params.id);
    if (!form) {
      console.log('❌ Form not found');
      return res.redirect('/admin/forms');
    }
    console.log('✅ Form found:', form.fullName, 'Status:', form.status);

    // 2. Check authorization
    console.log('🔐 Checking authorization...');
    const allowed = canPerformActions(req.user, form);

    console.log('📊 Authorization check result:', allowed);

    if (!allowed) {
      console.log('❌ Authorization failed');
      return res.status(403).send('Forbidden');
    }
    console.log('✅ Authorization passed');

    // 3. Generate membership ID
    console.log('🏷️ Generating membership ID...');
    const membershipId = await generateMembershipId(form.district);
    form.membershipId = membershipId;
    console.log('✅ Membership ID generated:', membershipId);

    // 4. Generate QR code
    console.log('📱 Generating QR code...');
    const qrCodeDataURL = await QRCode.toDataURL(`${req.protocol}://${req.get('host')}/verify/${membershipId}`);
    console.log('✅ QR code generated');

    // 5. Generate PDF (with error handling)
    let pdfGenerated = false;
    let pdfPath = null;
    try {
      console.log('📄 Generating PDF...');
      const pdfBuffer = await generateMembershipPDF(form, qrCodeDataURL);
      const pdfDir = path.join(__dirname, '../public/pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
        console.log('📁 Created pdfs directory');
      }

      const pdfFilename = membershipId.replace(/\//g, '_') + '.pdf';
      pdfPath = path.join(pdfDir, pdfFilename);
      fs.writeFileSync(pdfPath, pdfBuffer);
      form.pdfUrl = `/pdfs/${pdfFilename}`;
      pdfGenerated = true;
      console.log('✅ PDF saved:', form.pdfUrl, 'File path:', pdfPath, 'Exists:', fs.existsSync(pdfPath));
    } catch (pdfErr) {
      console.error('❌ PDF generation failed:', pdfErr.message);
      console.error('Stack trace:', pdfErr.stack);
      form.pdfUrl = null; // No PDF generated
    }

    // 6. Update form status and history
    console.log('💾 Updating form status...');
    form.status = 'accepted';

    // Assign role if provided (legacy form fields in the ACCEPT form). Convert into canonical assignedRoles so the public team page picks it up.
    if (req.body.jobRole && req.body.teamType) {
      const canAssign = canAssignRole(req.user, form, req.body.teamType);
      if (canAssign) {
        // Keep legacy fields for compatibility
        form.jobRole = req.body.jobRole;
        form.teamType = req.body.teamType;
        console.log('✅ Role assigned during acceptance (legacy fields):', req.body.jobRole, req.body.teamType);

        // Also create an assignedRoles entry so this member shows on the public team pages
        form.assignedRoles = [{
          category: 'karyakarini', // fallback category for legacy single-role assign
          role: req.body.jobRole, // use jobRole as role code/name for legacy data
          roleName: req.body.jobRole,
          teamType: req.body.teamType,
          level: 'state', // fallback level
          location: form.state || null,
          assignedBy: req.user._id,
          assignedAt: new Date(),
          reason: req.body.note || 'Assigned during acceptance'
        }];
        form.history = form.history || [];
        form.history.push({ by: req.user._id, role: req.user.role, action: 'role_assigned', note: `Assigned (legacy) ${req.body.jobRole} in ${req.body.teamType} team`, date: new Date() });

      } else {
        console.log('⚠️ Cannot assign role - insufficient permissions');
      }
    }

    // Backfill: if legacy fields already present on the form (e.g., older submissions) convert them into assignedRoles when accepting
    if ((!form.assignedRoles || form.assignedRoles.length === 0) && form.jobRole && form.teamType) {
      console.log('🔁 Backfilling legacy jobRole/teamType into assignedRoles');
      form.assignedRoles = [{
        category: 'karyakarini',
        role: form.jobRole,
        roleName: form.jobRole,
        teamType: form.teamType,
        level: 'state',
        location: form.state || null,
        assignedBy: req.user._id,
        assignedAt: new Date(),
        reason: 'Backfilled from legacy fields on accept'
      }];
      form.history = form.history || [];
      form.history.push({ by: req.user._id, role: req.user.role, action: 'role_assigned', note: `Backfilled role from legacy fields: ${form.jobRole} / ${form.teamType}`, date: new Date() });
      console.log('✅ Backfilled legacy role to assignedRoles');
    }

    form.history = form.history || [];
    form.history.push({
      by: req.user._id,
      role: req.user.role,
      action: 'accepted',
      note: req.body.note || 'Accepted',
      date: new Date()
    });

    await form.save();
    console.log('✅ Form status updated to accepted');

    // 7. Send email with PDF attachment (if generated)
    const { sendMail } = require('../utils/mailer');
    if (form.email) {
      console.log('📧 Sending acceptance email to:', form.email);
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: form.email,
          subject: '🎉 Congratulations! आपका RMAS सदस्यता स्वीकार किया गया',
          text: `नमस्ते ${form.fullName},\n\nबधाई हो! आपका RMAS सदस्यता आवेदन स्वीकार कर लिया गया है।\n\nआपका सदस्यता ID: ${membershipId}\n\n${pdfGenerated ? `आपका जॉइनिंग लेटर डाउनलोड करने के लिए यहाँ क्लिक करें: ${req.protocol}://${req.get('host')}${form.pdfUrl}\n\nQR कोड स्कैन करके अपनी सदस्यता को किसी भी समय वेरीफाई कर सकते हैं।` : 'जॉइनिंग लेटर जल्द ही उपलब्ध कराया जाएगा।'}\n\nधन्यवाद,\nRMAS Bihar Team`
        };

        if (pdfGenerated && pdfPath) {
          mailOptions.attachments = [{
            filename: `RMAS_Membership_${membershipId}.pdf`,
            path: pdfPath
          }];
        }

        await sendMail(mailOptions);
        console.log('✅ Acceptance email sent' + (pdfGenerated ? ' with PDF attachment' : ' (no PDF)'));
      } catch (mailErr) {
        console.error('❌ Email send error:', mailErr.message);
      }
    } else {
      console.log('⚠️ No email address - skipping email notification');
    }

    console.log('🎉 Application acceptance completed successfully');
    res.redirect('/admin/forms/' + req.params.id);

  } catch (err) {
    console.error('❌ Accept form error:', err.message);
    console.error('Stack trace:', err.stack);
    res.redirect('/admin/forms');
  }
});

// Resend Joining Letter - regenerate PDF if missing and resend email
router.post('/forms/:id/resend-joining-letter', ensureAuthenticated, async (req, res) => {
  console.log('✉️ RESEND JOINING LETTER TRIGGERED');
  try {
    const form = await Membership.findById(req.params.id);
    if (!form) {
      console.log('❌ Form not found for resend');
      return res.status(404).json({ ok: false, msg: 'Form not found' });
    }

    // authorization
    const allowed = canPerformActions(req.user, form);
    if (!allowed) {
      console.log('❌ Authorization failed for resend');
      return res.status(403).json({ ok: false, msg: 'Forbidden' });
    }

    if (!form.membershipId) {
      console.log('⚠️ Membership ID missing for form:', form._id);
      return res.status(400).json({ ok: false, msg: 'Membership ID missing. Accept the form first.' });
    }

    // Ensure PDF exists, else regenerate
    let pdfPath = null;
    const pdfRel = form.pdfUrl || '';
    if (pdfRel) {
      const candidate = path.join(__dirname, '..', 'public', pdfRel.replace(/^\/+/, ''));
      if (fs.existsSync(candidate)) {
        pdfPath = candidate;
        console.log('✅ Existing PDF found for resend:', pdfPath);
      } else {
        console.log('⚠️ PDF URL exists but file missing, will regenerate');
      }
    }

    // regenerate if missing
    if (!pdfPath) {
      console.log('🔧 Regenerating PDF for:', form.fullName);
      const membershipId = form.membershipId;
      const qrCodeDataURL = await QRCode.toDataURL(`${req.protocol}://${req.get('host')}/verify/${membershipId}`);
      const pdfBuffer = await generateMembershipPDF(form, qrCodeDataURL);
      const pdfDir = path.join(__dirname, '../public/pdfs');
      if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
      const pdfFilename = membershipId.replace(/\//g, '_') + '.pdf';
      pdfPath = path.join(pdfDir, pdfFilename);
      fs.writeFileSync(pdfPath, pdfBuffer);
      form.pdfUrl = `/pdfs/${pdfFilename}`;
      await form.save();
      console.log('✅ Regenerated and saved PDF:', form.pdfUrl);
    }

    // Send email
    const { sendMail } = require('../utils/mailer');
    if (!form.email) {
      console.log('⚠️ No email address to resend to');
      return res.status(400).json({ ok: false, msg: 'No email address for this member' });
    }

    const membershipId = form.membershipId;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: form.email,
      subject: '📨 RMAS Joining Letter - Resent',
      text: `नमस्ते ${form.fullName},\n\nयह आपका RMAS Joining Letter पुनः भेजा जा रहा है।\n\nMembership ID: ${membershipId}\n\nडाउनलोड करें: ${req.protocol}://${req.get('host')}${form.pdfUrl}\n\nधन्यवाद,\nRMAS Bihar Team`
    };

    if (pdfPath) {
      mailOptions.attachments = [{ filename: `RMAS_Membership_${membershipId}.pdf`, path: pdfPath }];
    }

    try {
      await sendMail(mailOptions);
      form.history = form.history || [];
      form.history.push({ by: req.user._id, role: req.user.role, action: 'resend_joining_letter', note: `Resent to ${form.email}`, date: new Date() });
      await form.save();
      console.log('✅ Resend email sent to:', form.email);
      return res.json({ ok: true, msg: 'Joining letter resent successfully' });
    } catch (mailErr) {
      console.error('❌ Error sending resend email:', mailErr);
      return res.status(500).json({ ok: false, msg: 'Failed to send email', error: mailErr.message });
    }

  } catch (err) {
    console.error('❌ Resend endpoint error:', err);
    return res.status(500).json({ ok: false, msg: 'Server error', error: err.message });
  }
});

// Reject a form
router.post('/forms/:id/reject', ensureAuthenticated, async (req, res) => {
  try {
    const form = await Membership.findById(req.params.id);
    if (!form) return res.redirect('/admin/forms');

    // authorization similar to accept
    const allowed = canPerformActions(req.user, form);
    if (!allowed) return res.status(403).send('Forbidden');

    form.status = 'rejected';
    form.history = form.history || [];
    form.history.push({ by: req.user._id, role: req.user.role, action: 'rejected', note: req.body.note || 'Rejected', date: new Date() });
    await form.save();

    // send notification to applicant if email available
    const { sendMail } = require('../utils/mailer');
    if (form.email) {
      try {
        await sendMail({
          from: process.env.EMAIL_USER,
          to: form.email,
          subject: 'आपका सदस्यता आवेदन अस्वीकृत हुआ',
          text: `नमस्ते ${form.fullName},\n\nकृपया सूचित किया जाता है कि आपका सदस्यता आवेदन अस्वीकृत कर दिया गया है।\n\nधन्यवाद,\nRMAS`
        });
      } catch (mailErr) { console.error('Reject email error:', mailErr); }
    }

    res.redirect('/admin/forms/' + req.params.id);
  } catch (err) {
    console.error('Reject form error:', err);
    res.redirect('/admin/forms');
  }
});

// GET manage role form
router.get('/forms/:id/manage-role', ensureAuthenticated, async (req, res) => {
  try {
    const form = await Membership.findById(req.params.id).lean();
    if (!form) return res.redirect('/admin/forms');
    if (form.status !== 'accepted') return res.status(400).send('Only accepted members can be assigned roles');

    // Authorization: ensure user has scope to manage/assign roles for this form
    const allowed = canPerformActions(req.user, form);
    if (!allowed) return res.status(403).send('Forbidden');

    res.render('admin/manage-role', { form });
  } catch (err) {
    console.error('Manage role GET error:', err);
    res.redirect('/admin/forms');
  }
});

// POST manage role assignment
router.post('/forms/:id/manage-role', ensureAuthenticated, async (req, res) => {
  try {
    const form = await Membership.findById(req.params.id);
    if (!form) return res.redirect('/admin/forms');
    if (form.status !== 'accepted') return res.status(400).send('Only accepted members can be assigned roles');

    const { category, role, level, state, division, district, block, teamType, reason, regeneratePdf } = req.body;
    if (!category || !role || !teamType || !level || !reason) {
      return res.status(400).send('Category, role, team, level, and reason are required');
    }

    // Determine location based on level
    let location = null;
    if (level === 'state' && state) location = state;
    else if (level === 'division' && division) location = division;
    else if (level === 'district' && district) location = district;
    else if (level === 'block' && block) location = block;

    // Load role details to get name
    const fs = require('fs');
    const path = require('path');
    const rolesPath = path.join(__dirname, '..', 'public', 'locations', 'roles_hierarchy.json');
    const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
    const roleData = rolesData.categories[category].roles.find(r => r.code === role);

    if (!roleData) return res.status(400).send('Invalid role selected');

    // Authorization: ensure current user can assign this role at the requested level
    const allowedAssign = canAssignRole(req.user, form, teamType);
    if (!allowedAssign) return res.status(403).send('Forbidden - insufficient permissions to assign this role');

    // Create assignedRoles array
    form.assignedRoles = [{
      category,
      role: roleData.code,
      roleName: roleData.name,
      teamType,
      level,
      location: location || null,
      assignedBy: req.user._id,
      assignedAt: new Date(),
      reason
    }];

    // Update history
    form.history = form.history || [];
    form.history.push({
      by: req.user._id,
      role: req.user.role,
      action: 'role_assigned',
      note: `Assigned: ${roleData.name} (${level}${location ? ` - ${location}` : ''}) - ${reason}`,
      date: new Date()
    });

    // Ensure membershipId exists
    if (!form.membershipId) {
      try {
        const membershipId = await generateMembershipId(form.district || form.city || 'UNKNOWN');
        form.membershipId = membershipId;
        form.history.push({ by: req.user._id, role: req.user.role, action: 'membership_id_generated', note: `Generated ID ${membershipId}`, date: new Date() });
      } catch (idErr) {
        console.error('❌ Error generating membership ID:', idErr.message);
      }
    }

    await form.save();

    // Ensure team pages see the update: set a simple cache-buster in app locals
    try {
      req.app.locals.teamCacheBuster = Date.now();
      console.log('🔁 teamCacheBuster updated:', req.app.locals.teamCacheBuster);
    } catch (e) { console.error('⚠️ Could not update app locals cache buster:', e.message); }

    // Notify member by email to download documents (no PDF generation)
    (async () => {
      try {
        if (!form.email) {
          await Membership.findByIdAndUpdate(form._id, { $push: { history: { by: req.user._id, role: req.user.role, action: 'no_email_for_download', note: 'No email to notify member for downloads', date: new Date() } } });
          console.log('⚠️ No email found; skipping download notification');
          return;
        }

        const { sendMail } = require('../utils/mailer');
        const link = `${process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`}/documents/request-download?email=${encodeURIComponent(form.email)}`;

        const assigned = (form.assignedRoles && form.assignedRoles[0]) ? form.assignedRoles[0] : null;
        const roleDisplay = assigned ? (assigned.roleName || assigned.role) : (form.jobRole || 'Assigned role');

        await sendMail({
          from: process.env.EMAIL_USER,
          to: form.email,
          subject: 'बधाई हो! आपका पद असाइन किया गया – RMAS',
          text: `नमस्ते ${form.fullName},\n\nआपको '${roleDisplay}' पद पर असाइन किया गया है। आप अपना ID Card और Joining Letter डाउनलोड करने के लिए इस लिंक पर जा सकते हैं:\n\n${link}\n\nधन्यवाद,\nRMAS Bihar Team`
        });

        await Membership.findByIdAndUpdate(form._id, { $push: { history: { by: req.user._id, role: req.user.role, action: 'download_notification_sent', note: `Notified ${form.email} to download documents`, date: new Date() } } });

        console.log('✅ Download notification sent to member');
      } catch (err) {
        console.error('❌ Error sending download notification:', err && err.message);
        try { await Membership.findByIdAndUpdate(form._id, { $push: { history: { by: req.user._id, role: req.user.role, action: 'download_notification_error', note: err && err.message, date: new Date() } } }); } catch (e) { console.error('❌ Error saving history for notification failure:', e && e.message); }
      }
    })();

    res.redirect('/admin/forms/' + req.params.id);
  } catch (err) {
    console.error('Manage role POST error:', err);
    res.redirect('/admin/forms');
  }
});

// Assign job role to accepted member (legacy - keep for backward compatibility)
router.post('/forms/:id/assign-role', ensureAuthenticated, async (req, res) => {
  try {
    const form = await Membership.findById(req.params.id);
    if (!form) return res.redirect('/admin/forms');
    if (form.status !== 'accepted') return res.status(400).send('Only accepted members can be assigned roles');

    const { jobRole, teamType } = req.body;
    if (!jobRole || !teamType) return res.status(400).send('Job role and team type are required');

    // Check if user can assign roles at this level and team
    const canAssign = canAssignRole(req.user, form, teamType);
    if (!canAssign) return res.status(403).send('Forbidden - cannot assign roles at this level or team');

    form.jobRole = jobRole;
    form.teamType = teamType;
    form.history = form.history || [];
    form.history.push({
      by: req.user._id,
      role: req.user.role,
      action: 'role_assigned',
      note: `Assigned role: ${jobRole} in ${teamType} team`,
      date: new Date()
    });

    // Ensure membershipId exists (generate if missing)
    if (!form.membershipId) {
      try {
        const membershipId = await generateMembershipId(form.district || form.city || 'UNKNOWN');
        form.membershipId = membershipId;
        form.history.push({ by: req.user._id, role: req.user.role, action: 'membership_id_generated', note: `Generated ID ${membershipId}`, date: new Date() });
        console.log('✅ Membership ID generated during role assignment:', membershipId);
      } catch (idErr) {
        console.error('❌ Error generating membership ID during role assign:', idErr.message);
      }
    }

    await form.save();

    // ensure team pages pick up this change
    try { req.app.locals.teamCacheBuster = Date.now(); console.log('🔁 teamCacheBuster updated (legacy assign):', req.app.locals.teamCacheBuster); } catch(e){}

    // Notify member by email to download documents (no PDF generation)
    (async () => {
      try {
        if (!form.email) {
          form.history = form.history || [];
          form.history.push({ by: req.user._id, role: req.user.role, action: 'no_email_for_download', note: 'No email to notify member for downloads', date: new Date() });
          await form.save();
          console.log('⚠️ No email found; skipping download notification (legacy assign)');
          return;
        }

        const { sendMail } = require('../utils/mailer');
        const link = `${process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`}/documents/request-download?email=${encodeURIComponent(form.email)}`;

        const roleDisplay = jobRole || form.jobRole || 'Assigned role';

        await sendMail({
          from: process.env.EMAIL_USER,
          to: form.email,
          subject: 'बधाई हो! आपका पद असाइन किया गया – RMAS',
          text: `नमस्ते ${form.fullName},\n\nआपको ${roleDisplay} पद पर असाइन किया गया है। आप अपना ID Card और Joining Letter डाउनलोड करने के लिए इस लिंक पर जा सकते हैं:\n\n${link}\n\nधन्यवाद,\nRMAS Bihar Team`
        });

        form.history = form.history || [];
        form.history.push({ by: req.user._id, role: req.user.role, action: 'download_notification_sent', note: `Notified ${form.email} to download documents (legacy assign)`, date: new Date() });
        await form.save();

        console.log('✅ Download notification sent to member (legacy assign)');
      } catch (err) {
        console.error('❌ Error sending download notification (legacy assign):', err && err.message);
        try { form.history = form.history || []; form.history.push({ by: req.user._id, role: req.user.role, action: 'download_notification_error', note: err && err.message, date: new Date() }); await form.save(); } catch (e) { console.error('❌ Error saving history for notification failure:', e && e.message); }
      }
    })();

    res.redirect('/admin/forms/' + req.params.id);
  } catch (err) {
    console.error('Assign role error:', err);
    res.redirect('/admin/forms');
  }
});

// Helper function to get accessible entities for a user based on cascade permissions
function getAccessibleEntities(user) {
  if (user.role === 'superadmin') return []; // no filters needed

  const entities = [];
  const level = user.assignedLevel;
  const entityId = user.assignedId;

  if (!level || !entityId) return [];

  if (level === 'state') {
    // Can access all applications in the state
    entities.push({ state: entityId });
  } else if (level === 'division') {
    // Can access applications in the division and its districts/blocks
    entities.push({ division: entityId });
    // Also include districts and blocks within this division
    try {
      const fs = require('fs');
      const path = require('path');
      const divisionsPath = path.join(__dirname, '..', 'public', 'locations', 'bihar_divisions.json');
      const divisionsData = JSON.parse(fs.readFileSync(divisionsPath, 'utf8'));

      if (divisionsData[entityId]) {
        entities.push({ district: { $in: divisionsData[entityId] } });
        // For blocks, we need to get all blocks in these districts
        const blocksPath = path.join(__dirname, '..', 'public', 'locations', 'bihar_blocks.json');
        const blocksData = JSON.parse(fs.readFileSync(blocksPath, 'utf8'));

        const allBlocks = [];
        divisionsData[entityId].forEach(district => {
          if (blocksData[district]) {
            allBlocks.push(...blocksData[district]);
          }
        });
        if (allBlocks.length > 0) {
          entities.push({ block: { $in: allBlocks } });
        }
      }
    } catch (err) {
      console.error('Error loading location data for division access:', err.message);
    }
  } else if (level === 'district') {
    // Can access applications in the district and its blocks
    entities.push({ district: entityId });
    entities.push({ assignedDistrict: entityId });

    try {
      const fs = require('fs');
      const path = require('path');
      const blocksPath = path.join(__dirname, '..', 'public', 'locations', 'bihar_blocks.json');
      const blocksData = JSON.parse(fs.readFileSync(blocksPath, 'utf8'));

      if (blocksData[entityId]) {
        entities.push({ block: { $in: blocksData[entityId] } });
      }
    } catch (err) {
      console.error('Error loading blocks data for district access:', err.message);
    }
  } else if (level === 'block') {
    // Can access applications in the specific block
    entities.push({ block: entityId });
  }

  return entities;
}

// AJAX endpoint for roles by category
router.get('/roles', ensureAuthenticated, (req, res) => {
  try {
    const category = req.query.category;
    if (!category) return res.status(400).json({ error: 'Category required' });

    const fs = require('fs');
    const path = require('path');
    const rolesPath = path.join(__dirname, '..', 'public', 'locations', 'roles_hierarchy.json');
    const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));

    if (!rolesData.categories || !rolesData.categories[category]) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(rolesData.categories[category].roles);
  } catch (err) {
    console.error('Error loading roles:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// AJAX endpoint for locations by level
router.get('/locations', ensureAuthenticated, (req, res) => {
  try {
    const level = req.query.level;
    const divisionQuery = req.query.division;
    const districtQuery = req.query.district;
    if (!level) return res.status(400).json({ error: 'Level required' });

    const fs = require('fs');
    const path = require('path');

    if (level === 'state') {
      res.json(['Bihar']); // Only Bihar supported
    } else if (level === 'division') {
      const divisionsPath = path.join(__dirname, '..', 'public', 'locations', 'bihar_divisions.json');
      const divisionsData = JSON.parse(fs.readFileSync(divisionsPath, 'utf8'));
      res.json(Object.keys(divisionsData));
    } else if (level === 'district') {
      const divisionsPath = path.join(__dirname, '..', 'public', 'locations', 'bihar_divisions.json');
      const divisionsData = JSON.parse(fs.readFileSync(divisionsPath, 'utf8'));
      if (divisionQuery) {
        // Return districts for the specific division if available
        const districts = divisionsData[divisionQuery] || [];
        return res.json(districts);
      }
      const allDistricts = Object.values(divisionsData).flat();
      res.json([...new Set(allDistricts)]); // Remove duplicates
    } else if (level === 'block') {
      const blocksPath = path.join(__dirname, '..', 'public', 'locations', 'bihar_blocks.json');
      const blocksData = JSON.parse(fs.readFileSync(blocksPath, 'utf8'));
      if (districtQuery) {
        // Return blocks for the specific district if available
        const blocks = blocksData[districtQuery] || [];
        return res.json(blocks);
      }
      const allBlocks = Object.values(blocksData).flat();
      res.json([...new Set(allBlocks)]); // Remove duplicates
    } else {
      res.status(400).json({ error: 'Invalid level' });
    }
  } catch (err) {
    console.error('Error loading locations:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to check if user can assign roles
function canAssignRole(user, membership, teamType) {
  if (user.role === 'superadmin') return true;

  // Determine the level of the membership
  let level = 'block'; // default
  let entityId = membership.block || membership.district;

  if (membership.district && !membership.block) {
    level = 'district';
    entityId = membership.district;
  } else if (membership.division && !membership.district) {
    level = 'division';
    entityId = membership.division;
  } else if (membership.state && !membership.division) {
    level = 'state';
    entityId = membership.state;
  }

  return canAssignRoleAtLevel(user, level, entityId);
}

// new user form
router.get('/users/new', ensureRole('superadmin'), (req, res) => {
  res.render('admin/user_form', { user: null, error: null });
});

// Debug: list recent memberships (superadmin only)
router.get('/debug/recent-memberships', ensureRole('superadmin'), async (req, res) => {
  try {
    const recents = await Membership.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json(recents.map(m => ({ _id: m._id, fullName: m.fullName, district: m.district, division: m.division, block: m.block, assignedDistrict: m.assignedDistrict, status: m.status, createdAt: m.createdAt })));
  } catch (err) {
    console.error('Debug recent memberships error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// create user
router.post('/users', ensureRole('superadmin'), async (req, res) => {
  const { name, email, password, role, assignedLevel, assignedId, active } = req.body || {};
  if (!name || !email || !role) return res.render('admin/user_form', { user: req.body, error: 'Name, email and role are required' });
  if (role !== 'superadmin' && (!assignedLevel || !assignedId)) return res.render('admin/user_form', { user: req.body, error: 'Level and assigned entity are required for non-superadmin roles' });

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.render('admin/user_form', { user: req.body, error: 'User with this email already exists' });

    const u = new User({
      name,
      email: email.toLowerCase().trim(),
      role,
      assignedLevel: role === 'superadmin' ? undefined : assignedLevel,
      assignedId: role === 'superadmin' ? undefined : assignedId,
      state: 'Bihar', // Default for Bihar
      active: active === 'on'
    });

    // Set backward compatibility fields based on assignedLevel
    if (role !== 'superadmin') {
      if (assignedLevel === 'state') {
        u.state = assignedId;
      } else if (assignedLevel === 'division') {
        u.division = assignedId;
        u.state = 'Bihar';
      } else if (assignedLevel === 'district') {
        u.districts = [assignedId];
        u.state = 'Bihar';
        // Auto-assign division based on district
        try {
          const fs = require('fs');
          const path = require('path');
          const divisionsPath = path.join(__dirname, '..', 'public', 'locations', 'bihar_divisions.json');
          const divisionsData = JSON.parse(fs.readFileSync(divisionsPath, 'utf8'));
          for (const [divisionName, districts] of Object.entries(divisionsData)) {
            if (districts.includes(assignedId)) {
              u.division = divisionName;
              break;
            }
          }
        } catch (err) {
          console.error('Error loading division mapping:', err.message);
        }
      }
    }

    if (password) await u.setPassword(password); else await u.setPassword('ChangeMe123!');
    await u.save();
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Create user error:', err);
    res.render('admin/user_form', { user: req.body, error: 'Server error while creating user' });
  }
});

// edit user form
router.get('/users/:id/edit', ensureRole('superadmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.redirect('/admin/users');
    res.render('admin/user_form', { user, error: null });
  } catch (err) {
    console.error('Edit user error:', err);
    res.redirect('/admin/users');
  }
});

// update user
router.post('/users/:id', ensureRole('superadmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.redirect('/admin/users');
    const { name, role, assignedLevel, assignedId, active, password } = req.body || {};

    user.name = name || user.name;
    user.role = role || user.role;

    if (role !== 'superadmin') {
      if (!assignedLevel || !assignedId) return res.render('admin/user_form', { user: Object.assign(req.body, { _id: req.params.id }), error: 'Level and assigned entity are required for non-superadmin roles' });
      user.assignedLevel = assignedLevel;
      user.assignedId = assignedId;

      // Update backward compatibility fields
      if (assignedLevel === 'state') {
        user.state = assignedId;
        user.division = undefined;
        user.districts = [];
      } else if (assignedLevel === 'division') {
        user.division = assignedId;
        user.state = 'Bihar';
        user.districts = [];
      } else if (assignedLevel === 'district') {
        user.districts = [assignedId];
        user.state = 'Bihar';
        // Auto-assign division based on district
        try {
          const fs = require('fs');
          const path = require('path');
          const divisionsPath = path.join(__dirname, '..', 'public', 'locations', 'bihar_divisions.json');
          const divisionsData = JSON.parse(fs.readFileSync(divisionsPath, 'utf8'));
          for (const [divisionName, districts] of Object.entries(divisionsData)) {
            if (districts.includes(assignedId)) {
              user.division = divisionName;
              break;
            }
          }
        } catch (err) {
          console.error('Error loading division mapping:', err.message);
        }
      }
    } else {
      user.assignedLevel = undefined;
      user.assignedId = undefined;
    }

    user.active = active === 'on';
    if (password && password.length > 3) await user.setPassword(password);
    await user.save();
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Update user error:', err);
    res.render('admin/user_form', { user: Object.assign(req.body, { _id: req.params.id }), error: 'Server error while updating user' });
  }
});

// Export router and helper functions used by scripts
module.exports = router
// Expose helper for on-demand generation by public routes
router.generateMembershipPDF = generateMembershipPDF;
module.exports.generateMembershipPDF = generateMembershipPDF;
