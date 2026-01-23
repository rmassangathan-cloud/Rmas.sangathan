// scripts/migrate_files_to_cloudinary.js
// Load environment variables first
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const Membership = require('../models/Membership');
const fs = require('fs');
const path = require('path');

async function migrateFiles() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
        
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
        
        console.log('🔍 Searching for memberships with local file paths...');
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
        
        let successCount = 0;
        let errorCount = 0;
        const filesToMigrate = [];

        // Helper function to upload a single file
        async function uploadFileToCloudinary(localPath, folder) {
            try {
                const result = await cloudinary.uploader.upload(localPath, {
                    folder: folder,
                    resource_type: 'auto'
                });
                return result.secure_url;
            } catch (err) {
                console.error(`   ❌ Upload failed: ${err.message}`);
                return null;
            }
        }
        
        for (const member of memberships) {
            console.log(`\n📄 Processing: ${member.fullName} (ID: ${member._id})`);
            let memberUpdated = false;
            
            // Migrate photo
            if (member.photo && member.photo.startsWith('/uploads/')) {
                const localPath = path.join(__dirname, '..', 'public', member.photo.replace(/^\//, ''));
                console.log(`   📸 Photo: ${path.basename(member.photo)}`);
                if (fs.existsSync(localPath)) {
                    const newUrl = await uploadFileToCloudinary(localPath, 'RMAS/uploads');
                    if (newUrl) {
                        member.photo = newUrl;
                        memberUpdated = true;
                        console.log(`   ✅ Photo migrated`);
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } else {
                    console.log(`   ⚠️ Photo file not found at: ${localPath}`);
                    errorCount++;
                }
            }
            
            // Migrate documents
            if (member.documentsUrl && member.documentsUrl.startsWith('/uploads/')) {
                const localPath = path.join(__dirname, '..', 'public', member.documentsUrl.replace(/^\//, ''));
                console.log(`   📄 Documents: ${path.basename(member.documentsUrl)}`);
                if (fs.existsSync(localPath)) {
                    const newUrl = await uploadFileToCloudinary(localPath, 'RMAS/documents');
                    if (newUrl) {
                        member.documentsUrl = newUrl;
                        member.aadhaarUrl = newUrl;
                        member.characterCertUrl = newUrl;
                        memberUpdated = true;
                        console.log(`   ✅ Documents migrated`);
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } else {
                    console.log(`   ⚠️ Documents file not found at: ${localPath}`);
                    errorCount++;
                }
            }
            
            // Migrate PDF separately
            if (member.pdfUrl && member.pdfUrl.startsWith('/pdfs/')) {
                const localPath = path.join(__dirname, '..', 'public', member.pdfUrl.replace(/^\//, ''));
                console.log(`   📋 PDF: ${path.basename(member.pdfUrl)}`);
                if (fs.existsSync(localPath)) {
                    const newUrl = await uploadFileToCloudinary(localPath, 'RMAS/certificates');
                    if (newUrl) {
                        member.pdfUrl = newUrl;
                        memberUpdated = true;
                        console.log(`   ✅ PDF migrated`);
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } else {
                    console.log(`   ⚠️ PDF file not found at: ${localPath}`);
                    errorCount++;
                }
            }
            
            if (memberUpdated) {
                await member.save();
            }
        }
        
        console.log(`\n\n🎉 Migration completed!`);
        console.log(`✅ Successfully migrated: ${successCount} files`);
        console.log(`❌ Errors: ${errorCount}`);
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

migrateFiles();