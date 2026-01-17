require('dotenv').config();
const mongoose = require('mongoose');
const Membership = require('../models/Membership');

const MONGO = process.env.MONGO_URI;
if (!MONGO) {
  console.error('MONGO_URI not set in environment. Set it and retry.');
  process.exit(1);
}

async function backfill() {
  try {
    await mongoose.connect(MONGO);
    console.log('🔌 Connected to MongoDB');

    const query = { status: 'accepted', $or: [{ assignedRoles: { $exists: false } }, { assignedRoles: { $size: 0 } }], jobRole: { $exists: true, $ne: '' }, teamType: { $exists: true, $ne: '' } };
    const cursor = Membership.find(query).cursor();
    let count = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      console.log('🔧 Backfilling member:', doc._id.toString(), doc.fullName);
      doc.assignedRoles = [{
        category: 'karyakarini',
        role: doc.jobRole,
        roleName: doc.jobRole,
        teamType: doc.teamType,
        level: 'state',
        location: doc.state || null,
        assignedBy: null,
        assignedAt: new Date(),
        reason: 'Backfilled from legacy fields by backfill script'
      }];
      doc.history = doc.history || [];
      doc.history.push({ by: null, role: 'system', action: 'role_assigned', note: `Backfilled legacy role: ${doc.jobRole} / ${doc.teamType}`, date: new Date() });
      await doc.save();
      console.log('✅ Updated:', doc._id.toString());
      count++;
    }

    console.log(`🎉 Backfill complete. Updated ${count} documents.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  }
}

backfill();