/*
 Run this script to create a superadmin user.
 Usage:
   node scripts/create_superadmin.js
 Ensure MONGO_URI, SUPERADMIN_EMAIL and SUPERADMIN_PASS (or EMAIL_USER/EMAIL_PASS) are set in your environment or .env
*/
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO = process.env.MONGO_URI;
const email = process.env.SUPERADMIN_EMAIL || process.env.EMAIL_USER;
const pass = process.env.SUPERADMIN_PASS || process.env.EMAIL_PASS;
const name = process.env.SUPERADMIN_NAME || 'Super Admin';

if (!MONGO) {
  console.error('MONGO_URI not set in environment. Set it and retry.');
  process.exit(1);
}
if (!email || !pass) {
  console.error('SUPERADMIN_EMAIL or SUPERADMIN_PASS (or EMAIL_USER / EMAIL_PASS) are not set.');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to Mongo');

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      console.log('User already exists. Updating role to superadmin and activating.');
      user.role = 'superadmin';
      user.active = true;
      await user.setPassword(pass);
      await user.save();
      console.log('Updated existing user:', user.email);
    } else {
      user = new User({ name, email: email.toLowerCase().trim(), role: 'superadmin', active: true });
      await user.setPassword(pass);
      await user.save();
      console.log('Created superadmin:', user.email);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error creating superadmin:', err);
    process.exit(1);
  }
})();