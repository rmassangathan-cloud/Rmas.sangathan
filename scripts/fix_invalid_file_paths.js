// scripts/fix_invalid_file_paths.js
// Simple script to set invalid file paths to null
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Membership = require('../models/Membership');
const fs = require('fs');
const path = require('path');

async function fixInvalidPaths() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
        
        console.log('🔍 Searching for memberships with file paths...');
        const memberships = await Membership.find({
            $or: [
                { photo: /^\/uploads\// },
                { documentsUrl: /^\/uploads\// },
                { characterCertUrl: /^\/uploads\// },
                { aadhaarUrl: /^\/uploads\// },
                { pdfUrl: /^\/pdfs\// }
            ]
        });
        
        console.log(`\n📊 Found ${memberships.length} memberships with local file paths\n`);
        
        let fixedCount = 0;

        for (const member of memberships) {
            console.log(`\n📄 Processing: ${member.fullName} (ID: ${member._id})`);
            let memberUpdated = false;
            
            // Check and fix photo
            if (member.photo && member.photo.startsWith('/uploads/')) {
                const localPath = path.join(__dirname, '..', 'public', member.photo.replace(/^\//, ''));
                if (!fs.existsSync(localPath)) {
                    console.log(`   ❌ Photo file not found: ${member.photo} → Setting to null`);
                    member.photo = null;
                    memberUpdated = true;
                    fixedCount++;
                } else {
                    console.log(`   ✅ Photo file exists: ${member.photo}`);
                }
            }
            
            // Check and fix documentsUrl
            if (member.documentsUrl && member.documentsUrl.startsWith('/uploads/')) {
                const localPath = path.join(__dirname, '..', 'public', member.documentsUrl.replace(/^\//, ''));
                if (!fs.existsSync(localPath)) {
                    console.log(`   ❌ Documents file not found: ${member.documentsUrl} → Setting to null`);
                    member.documentsUrl = null;
                    member.aadhaarUrl = null;
                    member.characterCertUrl = null;
                    memberUpdated = true;
                    fixedCount++;
                } else {
                    console.log(`   ✅ Documents file exists: ${member.documentsUrl}`);
                }
            }
            
            // Check and fix pdfUrl
            if (member.pdfUrl && member.pdfUrl.startsWith('/pdfs/')) {
                const localPath = path.join(__dirname, '..', 'public', member.pdfUrl.replace(/^\//, ''));
                if (!fs.existsSync(localPath)) {
                    console.log(`   ❌ PDF file not found: ${member.pdfUrl} → Setting to null`);
                    member.pdfUrl = null;
                    memberUpdated = true;
                    fixedCount++;
                } else {
                    console.log(`   ✅ PDF file exists: ${member.pdfUrl}`);
                }
            }
            
            if (memberUpdated) {
                await member.save();
                console.log(`   💾 Updated in database`);
            }
        }
        
        console.log(`\n\n🎉 Fix completed!`);
        console.log(`✅ Fixed invalid paths: ${fixedCount}`);
    } catch (error) {
        console.error('❌ Fix failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

fixInvalidPaths();
