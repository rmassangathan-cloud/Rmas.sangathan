require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const Membership = require('../models/Membership');

async function main() {
  const membershipId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!membershipId) {
    console.error('Usage: node backfill_single_membership.js <membershipId> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/human-right');

  const m = await Membership.findOne({ membershipId });
  if (!m) {
    console.error('Membership not found:', membershipId);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('Found membership:', m.fullName, '-', m.membershipId);

  // Choose the most recent 'role_assigned' history entry that contains an 'Assigned:' note (ignore system backfills)
  const roleHistory = (m.history || []).filter(h => h.action === 'role_assigned' && /Assigned:\s*/i.test(h.note)).sort((a,b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
  if (!roleHistory || roleHistory.length === 0) {
    console.log('No role_assigned history entries found. Nothing to backfill.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const latest = roleHistory[0];
  console.log('Latest role_assigned entry:', latest.note, 'at', latest.timestamp || latest.date);

  // Try to parse note like: "Assigned: उपाध्यक्ष (state - Bihar) - accepted"
  const note = latest.note || '';
  const mNote = note.match(/Assigned:\s*([^\(]+)\(\s*([^\)]+)\)/i);
  if (!mNote) {
    console.warn('Could not parse role/note from history note. Showing raw note.');
    console.log('Note:', note);
    await mongoose.disconnect();
    process.exit(0);
  }

  const roleNameRaw = mNote[1].trim();
  const inside = mNote[2].trim();
  // inside expected like "state - Bihar" or "district - Katihar"
  const parts = inside.split(/\s*-\s*/);
  const level = parts[0] ? parts[0].trim().toLowerCase() : null;
  const location = parts[1] ? parts[1].trim() : null;

  // Load roles_hierarchy to resolve role code and category
  const rolesPath = path.join(__dirname, '..', 'public', 'locations', 'roles_hierarchy.json');
  let rolesData = null;
  try {
    rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
  } catch (e) {
    console.error('Failed to read roles_hierarchy.json:', e.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  let found = null;
  for (const catKey of Object.keys(rolesData.categories || {})) {
    const roles = rolesData.categories[catKey].roles || [];
    const match = roles.find(r => r.name === roleNameRaw || r.name.replace(/\s+/g,'') === roleNameRaw.replace(/\s+/g,'') || r.code === roleNameRaw || r.code === roleNameRaw.toLowerCase());
    if (match) {
      found = { category: catKey, role: match.code, roleName: match.name };
      break;
    }
  }

  if (!found) {
    console.warn('Role name not found in roles_hierarchy. Will use raw role name as roleName and leave code null.');
    found = { category: 'unknown', role: roleNameRaw, roleName: roleNameRaw };
  }

  const assigned = {
    category: found.category,
    role: found.role,
    roleName: found.roleName,
    teamType: m.teamType || 'core',
    level: level || 'state',
    location: location || null,
    assignedBy: latest.by || null,
    assignedAt: latest.timestamp || latest.date || new Date(),
    reason: 'Backfilled from role_assigned history'
  };

  console.log('Proposed assignedRoles payload:');
  console.log(JSON.stringify(assigned, null, 2));

  if (apply) {
    console.log('Applying change to DB...');
    m.assignedRoles = [assigned];
    m.history = m.history || [];
    // Use 'role_assigned' action (allowed enum) and indicate this is a system backfill
    m.history.push({ by: null, role: 'system', action: 'role_assigned', note: `Backfilled assignedRoles from history: ${latest._id} (system backfill)`, date: new Date() });
    try {
      const saved = await m.save();
      console.log('✅ assignedRoles saved to membership. Current assignedRoles:');
      console.log(JSON.stringify(saved.assignedRoles, null, 2));
    } catch (saveErr) {
      console.error('❌ Error saving membership:', saveErr);
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });