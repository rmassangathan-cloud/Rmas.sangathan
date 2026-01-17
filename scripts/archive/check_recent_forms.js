require('dotenv').config();
const mongoose = require('mongoose');
const Membership = require('../models/Membership');

async function checkRecentForms() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check forms from last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const recentForms = await Membership.find({
      createdAt: { $gte: twoHoursAgo }
    }).sort({ createdAt: -1 });

    console.log(`\n📋 Forms submitted in last 2 hours (${twoHoursAgo.toISOString()}):`);
    console.log('='.repeat(80));

    if (recentForms.length === 0) {
      console.log('⚠️ No forms submitted in the last 2 hours');
    } else {
      recentForms.forEach((form, index) => {
        console.log(`${index + 1}. ${form.fullName}`);
        console.log(`   - Created: ${form.createdAt}`);
        console.log(`   - Status: ${form.status}`);
        console.log(`   - District: ${form.district}`);
        console.log(`   - Division: ${form.division}`);
        console.log(`   - Block: ${form.block}`);
        console.log('');
      });
    }

    // Check all forms in database
    const totalForms = await Membership.countDocuments();
    const pendingForms = await Membership.countDocuments({ status: 'pending' });

    console.log('📊 Database Summary:');
    console.log(`   - Total forms: ${totalForms}`);
    console.log(`   - Pending forms: ${pendingForms}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkRecentForms();
