require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Membership = require('../models/Membership');

const MONGO = process.env.MONGO_URI;
if (!MONGO) {
  console.error('❌ MONGO_URI not set in environment. Set it and retry.');
  process.exit(1);
}

async function cleanDatabaseAndFiles() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO);
    console.log('✅ Connected to MongoDB');

    // 1. Delete ALL documents from Membership collection
    console.log('🗑️ Deleting all membership documents...');
    const membershipDeleteResult = await Membership.deleteMany({});
    console.log(`✅ Deleted ${membershipDeleteResult.deletedCount} membership documents`);

    // 2. Delete ALL users EXCEPT superadmin
    console.log('👥 Finding superadmin user...');
    const superadmin = await User.findOne({
      $or: [
        { email: 'human2394right@gmail.com' },
        { role: 'superadmin' }
      ]
    });

    if (!superadmin) {
      console.log('⚠️ No superadmin user found! Skipping user deletion to be safe.');
    } else {
      console.log(`👑 Found superadmin: ${superadmin.email} (${superadmin.role})`);
      console.log('🗑️ Deleting all users except superadmin...');

      const userDeleteResult = await User.deleteMany({
        _id: { $ne: superadmin._id }
      });
      console.log(`✅ Deleted ${userDeleteResult.deletedCount} users (kept superadmin)`);
    }

    // 3. Clean public/uploads folder
    console.log('🧹 Cleaning public/uploads folder...');
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
    let uploadsDeleted = 0;

    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          uploadsDeleted++;
        }
      }
      console.log(`✅ Deleted ${uploadsDeleted} files from uploads folder`);
    } else {
      console.log('⚠️ uploads folder does not exist');
    }

    // 4. Clean public/pdfs folder
    console.log('🧹 Cleaning public/pdfs folder...');
    const pdfsDir = path.join(__dirname, '..', 'public', 'pdfs');
    let pdfsDeleted = 0;

    if (fs.existsSync(pdfsDir)) {
      const files = fs.readdirSync(pdfsDir);
      for (const file of files) {
        const filePath = path.join(pdfsDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          pdfsDeleted++;
        }
      }
      console.log(`✅ Deleted ${pdfsDeleted} files from pdfs folder`);
    } else {
      console.log('⚠️ pdfs folder does not exist');
    }

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('📊 Summary:');
    console.log(`   • Memberships deleted: ${membershipDeleteResult.deletedCount}`);
    console.log(`   • Users deleted: ${superadmin ? 'All except superadmin' : 'None (no superadmin found)'}`);
    console.log(`   • Upload files deleted: ${uploadsDeleted}`);
    console.log(`   • PDF files deleted: ${pdfsDeleted}`);

    if (superadmin) {
      console.log(`   • Superadmin preserved: ${superadmin.email}`);
    }

    process.exit(0);

  } catch (err) {
    console.error('❌ Cleanup error:', err.message);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  }
}

cleanDatabaseAndFiles();
