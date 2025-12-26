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
    membershipId: new RegExp(`NHRA/BIH/${districtCode}/${year}/`)
  }).sort({ membershipId: -1 });

  let serial = 1;
  if (lastMembership && lastMembership.membershipId) {
    const parts = lastMembership.membershipId.split('/');
    if (parts.length === 5) {
      serial = parseInt(parts[4]) + 1;
    }
  }

  return `NHRA/BIH/${districtCode}/${year}/${String(serial).padStart(3, '0')}`;
}

// Helper function to format date in Hindi
function formatDateHindi(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('hi-IN', options);
}

// Helper function to generate PDF
async function generateMembershipPDF(membership, qrCodeDataURL) {
   console.log('🎨 Starting PDF generation for:', membership.fullName);

   const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
   });

   try {
      const page = await browser.newPage();

      // Read EJS template
      const templatePath = path.join(__dirname, '../views/pdf/joining-letter.ejs');
      console.log('📄 Reading template from:', templatePath);
      const template = fs.readFileSync(templatePath, 'utf8');

      // Read and encode images to base64 with error handling
      let nhraLogo = '';
      let memberPhoto = '';
      let digitalSignature = '';
      let officialStamp = '';

      try {
         // Use existing logo.jpeg as NHRA logo
         const nhraLogoPath = path.join(__dirname, '../public/images/logo.jpeg');
         if (fs.existsSync(nhraLogoPath)) {
            nhraLogo = fs.readFileSync(nhraLogoPath).toString('base64');
            console.log('✅ NHRA logo loaded');
         } else {
            console.log('⚠️ NHRA logo not found, using placeholder');
            nhraLogo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
         }
      } catch (err) {
         console.error('❌ Error loading NHRA logo:', err.message);
         nhraLogo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
      }

      try {
         // Member photo
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
         // Create placeholder for digital signature
         console.log('📝 Using placeholder for digital signature');
         digitalSignature = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
      } catch (err) {
         console.error('❌ Error creating digital signature placeholder:', err.message);
         digitalSignature = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
      }

      try {
         // Create placeholder for official stamp
         console.log('🏛️ Using placeholder for official stamp');
         officialStamp = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
      } catch (err) {
         console.error('❌ Error creating official stamp placeholder:', err.message);
         officialStamp = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
      }

      // Format issue date in Hindi
      const issueDateHindi = formatDateHindi(new Date());
      console.log('📅 Issue date in Hindi:', issueDateHindi);

      // Render EJS template
      console.log('🔧 Rendering EJS template...');
      const html = ejs.render(template, {
         membership,
         qrCodeDataURL,
         nhraLogo,
         memberPhoto,
         digitalSignature,
         officialStamp,
         issueDateHindi
      });

      console.log('📄 Setting page content...');
      await page.setContent(html, { waitUntil: 'networkidle0' });

      console.log('📋 Generating PDF...');
      const pdfBuffer = await page.pdf({
         format: 'A4',
         printBackground: true,
         margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm'
         }
      });

      console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
      await browser.close();
      return pdfBuffer;

   } catch (err) {
      console.error('❌ PDF generation error:', err.message);
      console.error('Stack trace:', err.stack);
      if (browser) {
         await browser.close();
      }
      throw err;
   }
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
        await sendMail({ from: process.env.EMAIL_USER, to: form.email, subject: 'आपका आवेदन अब प्रोसेस में है', text: `नमस्ते ${form.fullName},\n\nआपके आवेदन को ${req.user.name} (हमारे अधिकारी) द्वारा लिया गया है और अब प्रोसेस किया जा रहा है।\n\nधन्यवाद,\nNHRA` });
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
      try { await sendMail({ from: process.env.EMAIL_USER, to: form.email, subject: 'आपका सदस्यता आवेदन स्वीकार किया गया', text: `नमस्ते ${form.fullName},\n\nआपका सदस्यता आवेदन स्वीकार कर लिया गया है।\n\nधन्यवाद,\nNHRA` }); } catch (e) { console.error('Quick accept email error:', e); }
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
      try { await sendMail({ from: process.env.EMAIL_USER, to: form.email, subject: 'आपका सदस्यता आवेदन अस्वीकृत हुआ', text: `नमस्ते ${form.fullName},\n\nकृपया सूचित किया जाता है कि आपका सदस्यता आवेदन अस्वीकृत कर दिया गया है।\n\nधन्यवाद,\nNHRA` }); } catch (e) { console.error('Quick reject email error:', e); }
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

    // Assign role if provided
    if (req.body.jobRole && req.body.teamType) {
      const canAssign = canAssignRole(req.user, form, req.body.teamType);
      if (canAssign) {
        form.jobRole = req.body.jobRole;
        form.teamType = req.body.teamType;
        console.log('✅ Role assigned during acceptance:', req.body.jobRole, req.body.teamType);
      } else {
        console.log('⚠️ Cannot assign role - insufficient permissions');
      }
    }

    form.history = form.history || [];
    form.history.push({
      by: req.user._id,
      role: req.user.role,
      action: 'accepted',
      note: req.body.note || 'Accepted',
      timestamp: new Date()
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
          subject: '🎉 Congratulations! आपका NHRA सदस्यता स्वीकार किया गया',
          text: `नमस्ते ${form.fullName},\n\nबधाई हो! आपका NHRA सदस्यता आवेदन स्वीकार कर लिया गया है।\n\nआपका सदस्यता ID: ${membershipId}\n\n${pdfGenerated ? `आपका जॉइनिंग लेटर डाउनलोड करने के लिए यहाँ क्लिक करें: ${req.protocol}://${req.get('host')}${form.pdfUrl}\n\nQR कोड स्कैन करके अपनी सदस्यता को किसी भी समय वेरीफाई कर सकते हैं।` : 'जॉइनिंग लेटर जल्द ही उपलब्ध कराया जाएगा।'}\n\nधन्यवाद,\nNHRA Bihar Team`
        };

        if (pdfGenerated && pdfPath) {
          mailOptions.attachments = [{
            filename: `NHRA_Membership_${membershipId}.pdf`,
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
          text: `नमस्ते ${form.fullName},\n\nकृपया सूचित किया जाता है कि आपका सदस्यता आवेदन अस्वीकृत कर दिया गया है।\n\nधन्यवाद,\nNHRA`
        });
      } catch (mailErr) { console.error('Reject email error:', mailErr); }
    }

    res.redirect('/admin/forms/' + req.params.id);
  } catch (err) {
    console.error('Reject form error:', err);
    res.redirect('/admin/forms');
  }
});

// Assign job role to accepted member
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
      timestamp: new Date()
    });
    await form.save();

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

module.exports = router;
