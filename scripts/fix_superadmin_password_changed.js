#!/usr/bin/env node

/**
 * Script to fix superadmin's passwordChanged flag
 * Use this if superadmin is stuck on change-password page
 * 
 * Usage: node scripts/fix_superadmin_password_changed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function fixSuperAdmin() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rmas');
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Finding superadmin user...');
    const superadmin = await User.findOne({ role: 'superadmin' });

    if (!superadmin) {
      console.log('❌ No superadmin user found');
      process.exit(1);
    }

    console.log('👤 Superadmin found:', superadmin.email);
    console.log('🔐 Current passwordChanged:', superadmin.passwordChanged);

    if (!superadmin.passwordChanged) {
      console.log('\n📝 Updating passwordChanged to true...');
      superadmin.passwordChanged = true;
      await superadmin.save();
      console.log('✅ Superadmin passwordChanged flag updated to true');
    } else {
      console.log('✅ Superadmin passwordChanged is already true');
    }

    console.log('\n📋 Final superadmin state:');
    console.log('- Email:', superadmin.email);
    console.log('- Role:', superadmin.role);
    console.log('- passwordChanged:', superadmin.passwordChanged);
    console.log('- Active:', superadmin.active);

    await mongoose.connection.close();
    console.log('\n✅ Done! Superadmin should now bypass password change page.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixSuperAdmin();
