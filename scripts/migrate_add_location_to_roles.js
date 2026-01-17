require('dotenv').config();
const mongoose = require('mongoose');
const Membership = require('../models/Membership');

(async function() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/human-right', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find all memberships with assignedRoles but without location
    const memberships = await Membership.find({
      'assignedRoles': { $exists: true, $not: { $size: 0 } },
      'assignedRoles.0.location': { $in: [null, undefined, ''] }
    });

    console.log(`📊 Found ${memberships.length} memberships to update`);

    let updated = 0;

    for (const membership of memberships) {
      if (membership.assignedRoles && membership.assignedRoles[0]) {
        const ar = membership.assignedRoles[0];
        let location = null;

        // Set location based on level and available data
        if (ar.level === 'state' || ar.level === 'pradesh') {
          location = membership.state || null;
        } else if (ar.level === 'division') {
          location = membership.division || null;
        } else if (ar.level === 'district') {
          location = membership.district || null;
        } else if (ar.level === 'block') {
          location = membership.block || null;
        }

        if (location) {
          membership.assignedRoles[0].location = location;
          await membership.save();
          console.log(`✅ Updated ${membership.membershipId} - Added location: ${location}`);
          updated++;
        } else {
          console.log(`⚠️ Skipped ${membership.membershipId} - No location data available for level: ${ar.level}`);
        }
      }
    }

    console.log(`\n📈 Migration complete! Updated ${updated} memberships.`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during migration:', err);
    process.exit(1);
  }
})();
