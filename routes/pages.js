const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Gmail transporter (email bhejne ke liye)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Try to require Membership model if available
let Membership = null;
try {
    Membership = require('../models/Membership');
    console.log('✅ Membership model loaded successfully');
} catch (err) {
    console.log('❌ Failed to load Membership model:', err.message);
    Membership = null;
}

// Multer setup for file uploads (photo)
let upload = null;
try {
    const multer = require('multer');
    const path = require('path');
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.join(__dirname, '..', 'public', 'uploads'));
        },
        filename: function (req, file, cb) {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, file.fieldname + '-' + unique + ext);
        }
    });

    const fileFilter = function (req, file, cb) {
        // accept images and PDFs
        if (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf') {
            return cb(new Error('Only image or PDF files are allowed!'), false);
        }
        cb(null, true);
    };

    // Limit per-file to 1MB (photo and combined documents must be under 1MB)
    upload = multer({ storage, fileFilter, limits: { fileSize: 1 * 1024 * 1024 } });
} catch (err) {
    upload = null; // multer not installed or failed; route will still work without file upload
}

// --------------------- sabhi get routes (jo pehle the) ---------------------
router.get('/', (req, res) => {
    res.render('index');
});

// Test route to check if routing works
router.get('/test-form', (req, res) => {
    res.render('test-form');
});

router.get('/about', (req, res) => {
    res.render('about');
});

router.get('/team', async (req, res) => {
    try {
        // Fetch team members grouped by level and teamType
        const teamMembers = await Membership.find({
            status: 'accepted',
            jobRole: { $exists: true, $ne: null }
        }).select('fullName jobRole teamType state division district block photo').lean();

        // Group by level and teamType
        const teamData = {
            state: { core: [], mahila: [], yuva: [], alpsankhyak: [], scst: [] },
            division: { core: [], mahila: [], yuva: [], alpsankhyak: [], scst: [] },
            district: { core: [], mahila: [], yuva: [], alpsankhyak: [], scst: [] },
            block: { core: [], mahila: [], yuva: [], alpsankhyak: [], scst: [] }
        };

        teamMembers.forEach(member => {
            // Determine level based on available fields
            let level = 'block'; // default
            if (member.district && !member.block) level = 'district';
            else if (member.division && !member.district) level = 'division';
            else if (member.state && !member.division) level = 'state';

            if (teamData[level] && teamData[level][member.teamType]) {
                teamData[level][member.teamType].push({
                    name: member.fullName,
                    role: member.jobRole,
                    photo: member.photo || '/images/default-avatar.jpg'
                });
            }
        });

        // Team type names in Hindi
        const teamNames = {
            'core': 'कोर टीम',
            'mahila': 'महिला टीम',
            'yuva': 'युवा टीम',
            'alpsankhyak': 'अल्पसंख्यक टीम',
            'scst': 'SC/ST टीम'
        };

        res.render('team', { teamData, teamNames });
    } catch (err) {
        console.error('Team page error:', err);
        // Fallback to static data if DB query fails
        const teamData = {
            state: { core: [], mahila: [], yuva: [], alpsankhyak: [], scst: [] },
            division: { core: [], mahila: [], yuva: [], alpsankhyak: [], scst: [] },
            district: { core: [], mahila: [], yuva: [], alpsankhyak: [], scst: [] },
            block: { core: [], mahila: [], yuva: [], alpsankhyak: [], scst: [] }
        };
        const teamNames = {
            'core': 'कोर टीम',
            'mahila': 'महिला टीम',
            'yuva': 'युवा टीम',
            'alpsankhyak': 'अल्पसंख्यक टीम',
            'scst': 'SC/ST टीम'
        };
        res.render('team', { teamData, teamNames });
    }
});

router.get('/activities', (req, res) => {
    res.render('activities');
});

router.get('/news', (req, res) => {
    res.render('news');
});

router.get('/gallery', (req, res) => {
    res.render('gallery');
});

router.get('/join', (req, res) => {
    res.render('join');
});

// Admin routes are now handled in routes/admin.js



router.get('/contact', (req, res) => {
    res.render('contact');
});

router.get('/donate', (req, res) => {
    res.render('donate');
});

// API endpoints for locations (Divisions / Districts / Blocks)
router.get('/api/locations/divisions', (req, res) => {
    try {
        const p = require('path');
        const fp = p.join(__dirname, '..', 'public', 'locations', 'bihar_divisions.json');
        const data = JSON.parse(require('fs').readFileSync(fp, 'utf8'));
        console.log('📍 /api/locations/divisions requested');
        return res.json(data);
    } catch (err) {
        console.error('❌ Error reading divisions file:', err.message);
        return res.status(500).json({ error: 'Failed to load divisions' });
    }
});

router.get('/api/locations/blocks', (req, res) => {
    try {
        const p = require('path');
        const fp = p.join(__dirname, '..', 'public', 'locations', 'bihar_blocks.json');
        const data = JSON.parse(require('fs').readFileSync(fp, 'utf8'));
        console.log('📍 /api/locations/blocks requested');
        return res.json(data);
    } catch (err) {
        console.error('❌ Error reading blocks file:', err.message);
        return res.status(500).json({ error: 'Failed to load blocks' });
    }
});

router.get('/api/locations/districts', (req, res) => {
    const division = req.query.division;
    try {
        const p = require('path');
        const fp = p.join(__dirname, '..', 'public', 'locations', 'bihar_divisions.json');
        const data = JSON.parse(require('fs').readFileSync(fp, 'utf8'));
        if (division) {
            if (!data[division]) return res.status(404).json({ error: 'Division not found' });
            return res.json({ division, districts: data[division] });
        }
        // return full mapping when no division specified
        return res.json(data);
    } catch (err) {
        console.error('❌ Error reading divisions file for districts:', err.message);
        return res.status(500).json({ error: 'Failed to load districts' });
    }
});



// --------------------- membership form submit (email wala) ---------------------
// If multer is configured, use it to handle 'photo', 'aadhaar', and 'characterCert' fields; otherwise fallback to body parsing
if (upload) {
    router.post('/join', upload.fields([
        { name: 'photo', maxCount: 1 },
        { name: 'documents', maxCount: 1 }
    ]), async (req, res) => {
        return await handleJoin(req, res);
    });
} else {
    router.post('/join', async (req, res) => {
        return await handleJoin(req, res);
    });
}

// centralized handler to support both upload and non-upload flows
async function handleJoin(req, res) {
    console.log('🔄 Form submission received');
    console.log('📄 Raw body:', JSON.stringify(req.body, null, 2));
    console.log('📎 Files received:', req.files ? Object.keys(req.files) : 'No files');

    const data = req.body || {};

    // if files were uploaded, attach their paths and sizes
    if (req.files) {
        console.log('📁 Processing uploaded files...');

        if (req.files.photo && req.files.photo[0]) {
            const f = req.files.photo[0];
            console.log('📸 Photo file:', f.filename, 'Size:', f.size);
            data.photoUrl = '/uploads/' + f.filename;
            if (f.size > 1 * 1024 * 1024) {
                // enforce 1MB for photo specifically
                (data.__fileErrors = data.__fileErrors || []).push('Passport-size photo must be less than 1MB');
            }
        } else {
            console.log('⚠️ No photo file uploaded');
        }

        if (req.files.documents && req.files.documents[0]) {
            const f = req.files.documents[0];
            console.log('📄 Documents file:', f.filename, 'Type:', f.mimetype, 'Size:', f.size);
            // must be a PDF containing both documents
            if (f.mimetype !== 'application/pdf') {
                (data.__fileErrors = data.__fileErrors || []).push('Combined documents must be a PDF file containing Aadhaar and Character Certificate');
                console.log('❌ Documents file type invalid - not PDF');
            } else {
                data.documentsUrl = '/uploads/' + f.filename;
                console.log('✅ Documents URL set to:', data.documentsUrl);
                // for backward compatibility (email template), set aadhaarUrl and characterCertUrl to same file
                data.aadhaarUrl = data.documentsUrl;
                data.characterCertUrl = data.documentsUrl;
                if (f.size > 1 * 1024 * 1024) {
                    (data.__fileErrors = data.__fileErrors || []).push('Combined documents PDF too large (max 1MB)');
                    console.log('❌ Documents file too large');
                }
            }
        } else {
            console.log('⚠️ No documents file uploaded - req.files.documents is empty');
        }
    } else {
        console.log('⚠️ No files object in request');
    }

    console.log('📋 Processed data:', JSON.stringify(data, null, 2));

    // Basic server-side validation
    console.log('🔍 Starting validation...');
    const errors = [];
    if (!data.fullName || data.fullName.trim().length < 2) errors.push('Full name is required');
    if (!data.mobile || !/\d{6,15}/.test(data.mobile.replace(/\D/g, ''))) errors.push('Valid mobile number is required');
    // address not required when using structured location fields, but require at least one contact/address info
    // if address provided, check length
    if (data.address && data.address.trim().length < 5) errors.push('If provided, address should be at least 5 characters');

    // Check reason field
    console.log('📝 Reason field check:', { reason: data.reason, length: data.reason ? data.reason.trim().length : 0 });
    if (!data.reason || data.reason.trim().length < 10) {
        errors.push('Please provide a brief reason for joining (min 10 chars)');
        console.log('❌ Reason validation failed');
    }

    // Photo required
    console.log('📸 Photo validation check:', { photoUrl: data.photoUrl, hasPhoto: !!data.photoUrl });
    if (!data.photoUrl) {
        // if multer not used, req.file might not be set; this will catch missing photo
        errors.push('Passport-size photo is required (max 1 MB)');
        console.log('❌ Photo validation failed - no photoUrl');
    } else {
        console.log('✅ Photo validation passed - photoUrl exists');
    }
    // Combined documents required
    if (!data.documentsUrl) {
        errors.push('Combined Aadhaar + Character Certificate PDF is required (max 1MB)');
        console.log('❌ Documents validation failed - no documentsUrl');
    }
    // Include any file-specific size errors
    if (data.__fileErrors && data.__fileErrors.length) errors.push(data.__fileErrors.join('. '));
    // State validation
    if (!data.state || data.state.trim().length === 0) {
        errors.push('State is required');
    }
    // If state is Bihar, enforce district/block selection
    if (data.state === 'Bihar') {
        if (!data.district || data.district.trim().length === 0) errors.push('District is required for Bihar');
        if (!data.block || data.block.trim().length === 0) errors.push('Block is required for Bihar');
        // show panchayat/village optional but accept if provided
    }

    console.log('📋 Validation errors found:', errors.length, errors);

    // Auto-assign division based on district for Bihar state
    if (data.state === 'Bihar' && data.district) {
        try {
            const fs = require('fs');
            const path = require('path');
            const divisionsPath = path.join(__dirname, '..', 'public', 'locations', 'bihar_divisions.json');
            const divisionsData = JSON.parse(fs.readFileSync(divisionsPath, 'utf8'));

            // Find which division contains this district
            for (const [divisionName, districts] of Object.entries(divisionsData)) {
                if (districts.includes(data.district)) {
                    data.division = divisionName;
                    console.log('🏛️ Auto-assigned division:', divisionName, 'for district:', data.district);
                    break;
                }
            }

            if (!data.division) {
                console.log('⚠️ Could not find division for district:', data.district);
            }
        } catch (err) {
            console.error('❌ Error loading division mapping:', err.message);
        }
    }

    if (errors.length > 0) {
        console.log('❌ Validation failed, returning error response');
        return res.render('join', Object.assign({ error: errors.join('. '), success: null }, data));
    }

    console.log('✅ Validation passed, proceeding to save');

    // Occupation whitelist enforcement - allow only known options
    const allowedOccupations = [
        'Student', 'Unemployed', 'Farmer / Agriculture', 'Labour / Daily Wage Worker',
        'Private Job', 'Government Job', 'Self Employed', 'Business / Trader',
        'Teacher / Professor', 'Doctor / Medical Professional', 'Engineer / IT Professional',
        'Lawyer', 'Journalist / Media', 'Social Worker / NGO', 'Artist / Writer',
        'Driver', 'Housewife / Homemaker', 'Retired', 'Other'
    ];
    if (data.occupation && !allowedOccupations.includes(data.occupation)) {
        // invalid occupation selection
        return res.render('join', Object.assign({ error: 'Invalid occupation selection.', success: null }, data));
    }

    // Prepare email
    const mailOptions = {
        from: process.env.EMAIL_USER || 'no-reply@example.com',
        to: process.env.EMAIL_USER || process.env.ADMIN_EMAIL || 'admin@example.com',
        replyTo: data.email || data.mobile,
        subject: 'नया सदस्यता आवेदन - NHRA',
        text: `नया सदस्यता आवेदन प्राप्त हुआ!\n\nपूर्ण नाम: ${data.fullName}\nपिता का नाम: ${data.fatherName || 'N/A'}\nमोबाइल: ${data.mobile}\nईमेल: ${data.email || 'N/A'}\nपूरा पता: ${data.address}\nगाँव/मोहल्ला: ${data.village || 'N/A'}\nप्रखंड: ${data.block || 'N/A'}\nजिला: ${data.district || 'N/A'}\nपिन कोड: ${data.pincode || 'N/A'}\nव्यवसाय: ${data.occupation || 'N/A'}\nAadhaar: ${data.aadhaarUrl || 'N/A'}\nCharacter Certificate: ${data.characterCertUrl || 'N/A'}\nजुड़ने का कारण: ${data.reason}\n\nआवेदन तिथि: ${new Date().toLocaleString('hi-IN')}`
    };

    // Save to DB if Membership model is available
    let savedMembership = null;
    if (Membership) {
        try {
            console.log('📝 Attempting to save membership data...');
            console.log('Form data received:', JSON.stringify(data, null, 2));

            savedMembership = await Membership.create({
                fullName: data.fullName,
                fatherName: data.fatherName,
                dob: data.dob || undefined,
                gender: data.gender || undefined,
                mobile: data.mobile,
                email: data.email,
                bloodGroup: data.bloodGroup,
                education: data.education,
                occupation: data.occupation,
                idNumber: data.idNumber,
                state: data.state,
                houseNo: data.houseNo,
                street: data.street,
                panchayat: data.panchayat,
                village: data.village,
                pincode: data.pincode,
                district: data.district,
                division: data.division, // Auto-assigned based on district
                block: data.block,
                photo: data.photoUrl, // Map photoUrl to photo field
                documentsUrl: data.documentsUrl,
                characterCertUrl: data.characterCertUrl,
                reason: data.reason,
                agreedToTerms: data.agreedToTerms === 'on' || data.agreedToTerms === 'true' || data.agreedToTerms === true,
                // workflow fields
                assignedDistrict: data.district,
                history: [{
                    by: null,
                    role: 'applicant',
                    action: 'submitted',
                    note: 'Form submitted by applicant',
                    timestamp: new Date()
                }]
            });

            console.log('✅ Membership saved successfully:', savedMembership._id);
        } catch (dbErr) {
            console.error('❌ Membership save error:', dbErr);
            console.error('Error details:', dbErr.message);
        }
    } else {
        console.log('⚠️ Membership model not available');
    }

    try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail(mailOptions);
        } else {
            console.log('Email not sent: EMAIL_USER/PASS not configured');
        }

        res.render('join', Object.assign({ success: 'आपका सदस्यता आवेदन जमा हो गया है! हम शीघ्र ही आपसे संपर्क करेंगे।', error: null }, {}));
    } catch (error) {
        console.error('Email send error:', error);
        res.render('join', Object.assign({ error: 'कुछ त्रुटि हुई। कृपया बाद में पुनः प्रयास करें।', success: null }, data));
    }

}

module.exports = router;
