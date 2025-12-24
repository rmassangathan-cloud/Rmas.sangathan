const mongoose = require('mongoose');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

async function migrateUsers() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/human-rights');

    console.log('🔄 Starting user migration to cascade permissions...');

    // Load location data
    const divisionsPath = path.join(__dirname, '..', 'public', 'locations', 'bihar_divisions.json');
    const divisionsData = JSON.parse(fs.readFileSync(divisionsPath, 'utf8'));

    // Get all users except superadmin
    const users = await User.find({ role: { $ne: 'superadmin' } });

    console.log(`📊 Found ${users.length} users to migrate`);

    for (const user of users) {
      let assignedLevel = null;
      let assignedId = null;

      if (user.role.startsWith('state_')) {
        assignedLevel = 'state';
        assignedId = user.state || 'Bihar';
      } else if (user.role.startsWith('division_')) {
        assignedLevel = 'division';
        assignedId = user.division;
      } else if (user.role.startsWith('district_')) {
        assignedLevel = 'district';
        assignedId = user.districts && user.districts.length > 0 ? user.districts[0] : null;
      }

      if (assignedLevel && assignedId) {
        user.assignedLevel = assignedLevel;
        user.assignedId = assignedId;
        await user.save();
        console.log(`✅ Migrated ${user.name} (${user.role}) to ${assignedLevel}: ${assignedId}`);
      } else {
        console.log(`⚠️ Could not migrate ${user.name} (${user.role}) - missing location data`);
      }
    }

    console.log('🎉 Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers();