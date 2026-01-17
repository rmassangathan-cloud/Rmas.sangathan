require('dotenv').config();
const mongoose = require('mongoose');
const Membership = require('../models/Membership');

(async ()=>{
  const id = process.argv[2];
  if (!id) { console.error('Usage: node inspect_membership.js <membershipId|_id>'); process.exit(1); }

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/human-right');
    const mById = await Membership.findById(id).lean();
    const mByMid = mById ? mById : await Membership.findOne({ membershipId: id }).lean();
    if (!mByMid) { console.error('Membership not found:', id); await mongoose.disconnect(); process.exit(0); }

    const m = mByMid;
    console.log('Found membership:');
    console.log('  _id:', m._id);
    console.log('  fullName:', m.fullName);
    console.log('  email:', m.email);
    console.log('  mobile:', m.mobile);
    console.log('  membershipId:', m.membershipId);
    console.log('  assignedRoles:', JSON.stringify(m.assignedRoles || [], null, 2));
    console.log('  pdfUrl:', m.pdfUrl);
    console.log('  idCardUrl:', m.idCardUrl);
    console.log('  lastHistory (up to 10):');
    (m.history || []).slice(-10).forEach(h => console.log('   -', JSON.stringify(h)));
  } catch (err) {
    console.error('Error inspecting membership:', err.message);
  } finally {
    await mongoose.disconnect();
  }
})();