const Membership = require('../models/Membership');
const Audit = require('../models/Audit');

/**
 * Get membership statistics with cascade permissions
 */
async function getMembershipStats(user) {
  try {
    // Build base query for cascade permissions
    let matchQuery = {};
    
    if (user.role !== 'superadmin') {
      const orConditions = [];
      
      if (user.role.startsWith('state_')) {
        orConditions.push({ state: user.state });
      } else if (user.role.startsWith('division_')) {
        orConditions.push({ division: user.division });
        orConditions.push({ state: 'Bihar' });
      } else if (user.role.startsWith('district_')) {
        orConditions.push({ district: { $in: user.districts } });
      } else if (user.role.startsWith('block_')) {
        orConditions.push({ block: user._id.toString() });
      }
      
      if (orConditions.length > 0) {
        matchQuery.$or = orConditions;
      }
    }

    // Total members by status
    const statusCounts = await Membership.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly growth (last 12 months)
    const twelveMonsthsAgo = new Date();
    twelveMonsthsAgo.setMonth(twelveMonsthsAgo.getMonth() - 12);

    const monthlyGrowth = await Membership.aggregate([
      {
        $match: {
          ...matchQuery,
          status: 'accepted',
          createdAt: { $gte: twelveMonsthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Team distribution
    const teamDistribution = await Membership.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$teamType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Location-wise summary
    const locationSummary = await Membership.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            state: '$state',
            division: '$division',
            district: '$district'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    return {
      statusCounts,
      monthlyGrowth,
      teamDistribution,
      locationSummary
    };
  } catch (err) {
    console.error('❌ Error fetching membership stats:', err);
    return {
      statusCounts: [],
      monthlyGrowth: [],
      teamDistribution: [],
      locationSummary: []
    };
  }
}

/**
 * Get document download statistics from audit logs
 */
async function getDocumentDownloadStats(user) {
  try {
    // Build base query for cascade permissions
    let matchQuery = {
      $or: [
        { action: 'joining_letter_downloaded' },
        { action: 'id_card_downloaded' }
      ]
    };

    if (user.role !== 'superadmin') {
      let levelQuery = {};
      
      if (user.role.startsWith('state_')) {
        levelQuery = { level: 'state', levelId: user.state };
      } else if (user.role.startsWith('division_')) {
        levelQuery = { level: 'division', levelId: user.division };
      } else if (user.role.startsWith('district_')) {
        levelQuery = { level: 'district', levelId: { $in: user.districts } };
      }
      
      if (Object.keys(levelQuery).length > 0) {
        matchQuery.$and = [
          matchQuery.$or,
          levelQuery
        ];
        delete matchQuery.$or;
      }
    }

    // Total downloads by type
    const downloadsByType = await Audit.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);

    // Daily downloads (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyDownloads = await Audit.aggregate([
      {
        $match: {
          ...matchQuery,
          timestamp: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return {
      downloadsByType,
      dailyDownloads
    };
  } catch (err) {
    console.error('❌ Error fetching document download stats:', err);
    return {
      downloadsByType: [],
      dailyDownloads: []
    };
  }
}

/**
 * Get application status overview
 */
async function getApplicationStatus(user) {
  try {
    let matchQuery = {};

    if (user.role !== 'superadmin') {
      const orConditions = [];
      
      if (user.role.startsWith('state_')) {
        orConditions.push({ state: user.state });
      } else if (user.role.startsWith('division_')) {
        orConditions.push({ division: user.division });
      } else if (user.role.startsWith('district_')) {
        orConditions.push({ district: { $in: user.districts } });
      }
      
      if (orConditions.length > 0) {
        matchQuery.$or = orConditions;
      }
    }

    const statusOverview = await Membership.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          pending: [
            { $match: { status: 'pending' } },
            { $count: 'count' }
          ],
          claimed: [
            { $match: { status: 'pending', claimedBy: { $exists: true } } },
            { $count: 'count' }
          ],
          accepted: [
            { $match: { status: 'accepted' } },
            { $count: 'count' }
          ],
          rejected: [
            { $match: { status: 'rejected' } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    return {
      pending: statusOverview[0].pending[0]?.count || 0,
      claimed: statusOverview[0].claimed[0]?.count || 0,
      accepted: statusOverview[0].accepted[0]?.count || 0,
      rejected: statusOverview[0].rejected[0]?.count || 0
    };
  } catch (err) {
    console.error('❌ Error fetching application status:', err);
    return {
      pending: 0,
      claimed: 0,
      accepted: 0,
      rejected: 0
    };
  }
}

/**
 * Get total counts summary
 */
async function getTotalCounts(user) {
  try {
    let matchQuery = {};

    if (user.role !== 'superadmin') {
      const orConditions = [];
      
      if (user.role.startsWith('state_')) {
        orConditions.push({ state: user.state });
      } else if (user.role.startsWith('division_')) {
        orConditions.push({ division: user.division });
      } else if (user.role.startsWith('district_')) {
        orConditions.push({ district: { $in: user.districts } });
      }
      
      if (orConditions.length > 0) {
        matchQuery.$or = orConditions;
      }
    }

    const total = await Membership.countDocuments(matchQuery);
    const accepted = await Membership.countDocuments({ ...matchQuery, status: 'accepted' });
    const pending = await Membership.countDocuments({ ...matchQuery, status: 'pending' });
    const rejected = await Membership.countDocuments({ ...matchQuery, status: 'rejected' });

    return { total, accepted, pending, rejected };
  } catch (err) {
    console.error('❌ Error fetching total counts:', err);
    return { total: 0, accepted: 0, pending: 0, rejected: 0 };
  }
}

module.exports = {
  getMembershipStats,
  getDocumentDownloadStats,
  getApplicationStatus,
  getTotalCounts
};
