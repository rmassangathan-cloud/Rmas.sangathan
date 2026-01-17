require('dotenv').config();
const mongoose = require('mongoose');
(async function(){
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/human-right');
  const M = require('../models/Membership');
  const res = await M.aggregate([
    { $unwind: '$history' },
    { $match: { 'history.action': 'role_assigned' } },
    { $addFields: { histDate: { $ifNull: ['$history.timestamp', '$history.date'] } } },
    { $sort: { histDate: -1 } },
    { $limit: 1 },
    { $project: { membershipId:1, fullName:1, email:1, assignedRoles:1, history:1, latestRoleNote:'$history.note', latestRoleDate:'$history.timestamp' } }
  ]);
  if (!res || res.length === 0) {
    console.log('No role_assigned history found');
  } else {
    console.log(JSON.stringify(res[0], null, 2));
  }
  await mongoose.disconnect();
})();
