require('dotenv').config();
const mongoose = require('mongoose');
const Membership = require('../models/Membership');

const MONGO = process.env.MONGO_URI;
if (!MONGO) {
  console.error('MONGO_URI not set in environment. Set it and retry.');
  process.exit(1);
}

async function testMembershipSave() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO);
    console.log('✅ Connected to MongoDB');

    console.log('📝 Creating test membership...');
const testData = {
  fullName: 'Test User',
  fatherName: 'Test Father',
  mobile: '9876543210',
  email: 'test@example.com',
  state: 'Bihar',
  district: 'Patna',
  block: 'Test Block',
  village: 'Test Village',
  reason: 'Testing membership save functionality',
  agreedToTerms: true,
  photo: '/uploads/test-photo.jpg',
  documentsUrl: '/uploads/test-documents.pdf',
  assignedDistrict: 'Patna',
  history: [{
    by: null,
    role: 'applicant',
    action: 'submitted',
    note: 'Test submission',
    timestamp: new Date()
  }]
};

    const membership = await Membership.create(testData);
    console.log('✅ Test membership saved successfully!');
    console.log('📄 Membership ID:', membership._id);
    console.log('🏷️ Membership ID String:', membership.membershipId);

    // Count total memberships
    const count = await Membership.countDocuments();
    console.log(`📊 Total memberships in database: ${count}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testMembershipSave();
