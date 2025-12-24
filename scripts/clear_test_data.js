require('dotenv').config();
const mongoose = require('mongoose');
const Membership = require('../models/Membership');

const MONGO = process.env.MONGO_URI;
if (!MONGO) {
  console.error('MONGO_URI not set in environment. Set it and retry.');
  process.exit(1);
}

async function clearTestData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️ Deleting test membership data...');

    // Delete memberships that look like test data
    const result = await Membership.deleteMany({
      $or: [
        { fullName: 'Test User' },
        { fullName: /test/i },
        { email: /test@/i },
        { reason: /testing/i }
      ]
    });

    console.log(`🗑️ Deleted ${result.deletedCount} test membership(s)`);

    // Count remaining memberships
    const count = await Membership.countDocuments();
    console.log(`📊 Remaining memberships in database: ${count}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

clearTestData();
