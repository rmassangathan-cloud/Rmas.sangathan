/**
 * Cleanup Script for Render Deployment
 * Deletes all users except superadmin, all members, and PDF files
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const User = require('../models/User');
const Membership = require('../models/Membership');
const Audit = require('../models/Audit');
const DownloadOtp = require('../models/DownloadOtp');

async function cleanupDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Delete all users except superadmin
    console.log('\n🗑️  Deleting all non-superadmin users...');
    const deleteUsersResult = await User.deleteMany({ role: { $ne: 'superadmin' } });
    console.log(`✅ Deleted ${deleteUsersResult.deletedCount} users`);

    // 2. Delete all memberships
    console.log('\n🗑️  Deleting all memberships...');
    const deleteMembersResult = await Membership.deleteMany({});
    console.log(`✅ Deleted ${deleteMembersResult.deletedCount} memberships`);

    // 3. Delete all audit logs
    console.log('\n🗑️  Deleting all audit logs...');
    const deleteAuditResult = await Audit.deleteMany({});
    console.log(`✅ Deleted ${deleteAuditResult.deletedCount} audit logs`);

    // 4. Delete all download OTPs
    console.log('\n🗑️  Deleting all download OTPs...');
    const deleteOtpResult = await DownloadOtp.deleteMany({});
    console.log(`✅ Deleted ${deleteOtpResult.deletedCount} download OTPs`);

    // 5. Delete all PDF files
    console.log('\n🗑️  Deleting all PDF files...');
    const pdfDir = path.join(__dirname, '../public/pdfs');
    if (fs.existsSync(pdfDir)) {
      const files = fs.readdirSync(pdfDir);
      files.forEach(file => {
        const filePath = path.join(pdfDir, file);
        if (fs.lstatSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          console.log(`  ✓ Deleted: ${file}`);
        }
      });
      console.log(`✅ Deleted ${files.length} PDF files`);
    } else {
      console.log('⚠️  PDF directory not found');
    }

    // 6. Delete uploaded media files
    console.log('\n🗑️  Deleting all media files...');
    const mediaDir = path.join(__dirname, '../public/uploads/media');
    if (fs.existsSync(mediaDir)) {
      const mediaFiles = fs.readdirSync(mediaDir);
      mediaFiles.forEach(file => {
        const filePath = path.join(mediaDir, file);
        if (fs.lstatSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          console.log(`  ✓ Deleted: ${file}`);
        }
      });
      console.log(`✅ Deleted ${mediaFiles.length} media files`);
    }

    // 7. Show remaining users
    console.log('\n📋 Remaining users:');
    const remainingUsers = await User.find({}, 'name email role');
    remainingUsers.forEach(user => {
      console.log(`  • ${user.name} (${user.email}) - ${user.role}`);
    });

    console.log('\n✅ ✅ ✅ Database cleaned up successfully!');
    console.log('Ready for Render deployment.\n');

    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during cleanup:', err.message);
    process.exit(1);
  }
}

// Run cleanup
cleanupDatabase();
