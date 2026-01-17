require('dotenv').config();
const mongoose = require('mongoose');
const Membership = require('../models/Membership');

async function checkRecentMemberships() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get recent 10 memberships
    const recentMemberships = await Membership.find()
      .sort({ createdAt: -1 })
      .limit(10);

    console.log('\n📋 Recent 10 Membership Applications:');
    console.log('=' .repeat(80));

    if (recentMemberships.length === 0) {
      console.log('⚠️ No membership applications found');
      return;
    }

    recentMemberships.forEach((membership, index) => {
      console.log(`${index + 1}. ${membership.fullName}`);
      console.log(`   - Email: ${membership.email}`);
      console.log(`   - Mobile: ${membership.mobile}`);
      console.log(`   - District: ${membership.district}`);
      console.log(`   - Status: ${membership.status}`);
      console.log(`   - Membership ID: ${membership.membershipId || 'Not assigned'}`);
      console.log(`   - Created: ${membership.createdAt}`);
      console.log(`   - Assigned To: ${membership.assignedTo || 'Not assigned'}`);
      console.log('');
    });

    // Check pending applications specifically
    const pendingCount = await Membership.countDocuments({ status: 'pending' });
    const acceptedCount = await Membership.countDocuments({ status: 'accepted' });
    const rejectedCount = await Membership.countDocuments({ status: 'rejected' });

    console.log('📊 Summary:');
    console.log(`   - Pending: ${pendingCount}`);
    console.log(`   - Accepted: ${acceptedCount}`);
    console.log(`   - Rejected: ${rejectedCount}`);
    console.log(`   - Total: ${recentMemberships.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkRecentMemberships();
