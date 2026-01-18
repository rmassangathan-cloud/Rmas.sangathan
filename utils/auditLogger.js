const Audit = require('../models/Audit');
const useragent = require('useragent');

/**
 * Log an audit action
 * @param {Object} params - Audit parameters
 * @param {String} params.action - Action type (required)
 * @param {Object} params.req - Express request object (required)
 * @param {ObjectId} params.targetId - ID of affected resource
 * @param {String} params.targetType - Type of affected resource (User, Membership, Form, Document, Other)
 * @param {String} params.targetName - Name/description of affected resource
 * @param {Object} params.details - Additional details (mixed data)
 * @param {String} params.note - Optional note
 */
async function logAction(params) {
  try {
    const {
      action,
      req,
      targetId = null,
      targetType = null,
      targetName = null,
      details = {},
      note = ''
    } = params;

    if (!action || !req) {
      console.error('⚠️ Audit log missing required params: action or req');
      return null;
    }

    // Extract user info from request
    const user = req.user;
    const performedByEmail = user?.email || 'anonymous';
    const performedByName = user?.name || 'Unknown';
    const performedByRole = user?.role || 'guest';
    
    // Determine level info from user
    let performedByLevel = 'block'; // default
    let performedByLevelId = '';
    let level = 'block';
    let levelId = '';

    if (user?.role === 'superadmin') {
      performedByLevel = 'superadmin';
      level = 'superadmin';
    } else if (user?.assignedLevel) {
      performedByLevel = user.assignedLevel;
      level = user.assignedLevel;
      performedByLevelId = user.assignedId;
      levelId = user.assignedId;
    } else if (user?.state) {
      performedByLevel = 'state';
      performedByLevelId = user.state;
      level = 'state';
      levelId = user.state;
    } else if (user?.division) {
      performedByLevel = 'division';
      performedByLevelId = user.division;
      level = 'division';
      levelId = user.division;
    } else if (user?.districts && user.districts.length > 0) {
      performedByLevel = 'district';
      performedByLevelId = user.districts[0];
      level = 'district';
      levelId = user.districts[0];
    }

    // Extract IP address
    const ipAddress = req.ip || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress || 
                     req.connection.socket?.remoteAddress ||
                     'unknown';

    // Extract and parse user agent
    let userAgent = req.get('user-agent') || 'unknown';
    try {
      const ua = useragent.parse(req.get('user-agent'));
      userAgent = ua.toString();
    } catch (err) {
      // Keep original if parsing fails
    }

    // Create audit log entry
    const auditEntry = new Audit({
      action,
      performedBy: user?._id || null,
      performedByEmail,
      performedByName,
      performedByRole,
      performedByLevel,
      performedByLevelId,
      targetId,
      targetType,
      targetName,
      details,
      ipAddress,
      userAgent,
      level,
      levelId,
      note,
      timestamp: new Date()
    });

    await auditEntry.save();
    console.log(`✅ Audit logged: ${action} by ${performedByEmail}`);
    return auditEntry;
  } catch (err) {
    console.error('❌ Error logging audit:', err.message);
    return null;
  }
}

/**
 * Get audit logs with cascade permissions
 * @param {Object} user - Current user object
 * @param {Object} filters - Query filters
 * @param {Number} page - Page number (default 1)
 * @param {Number} limit - Records per page (default 50)
 */
async function getAuditLogs(user, filters = {}, page = 1, limit = 50) {
  try {
    const query = {};

    // Apply cascade permissions
    if (user.role !== 'superadmin') {
      if (user.role === 'state_president' || user.role === 'state_secretary' || user.role === 'state_media_incharge') {
        // State users can see state and below
        query.$or = [
          { level: 'state', levelId: user.state },
          { performedByLevel: 'state', performedByLevelId: user.state },
          { level: 'division', levelId: user.division },
          { level: 'district' },
          { level: 'block' }
        ];
      } else if (user.division) {
        // Division users can see division and below
        query.$or = [
          { level: 'division', levelId: user.division },
          { performedByLevel: 'division', performedByLevelId: user.division },
          { level: 'district' },
          { level: 'block' }
        ];
      } else if (user.districts && user.districts.length > 0) {
        // District users can see their district
        query.$or = [
          { level: 'district', levelId: { $in: user.districts } },
          { performedByLevel: 'district', performedByLevelId: { $in: user.districts } },
          { level: 'block' }
        ];
      } else {
        // Block level - only their own logs
        query.levelId = user._id.toString();
      }
    }

    // Apply additional filters
    if (filters.action) {
      query.action = filters.action;
    }
    if (filters.performedBy) {
      query.performedBy = filters.performedBy;
    }
    if (filters.targetType) {
      query.targetType = filters.targetType;
    }
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.timestamp.$lte = endDate;
      }
    }
    if (filters.level) {
      query.level = filters.level;
    }
    if (filters.search) {
      query.$or = [
        { performedByEmail: new RegExp(filters.search, 'i') },
        { targetName: new RegExp(filters.search, 'i') },
        { performedByName: new RegExp(filters.search, 'i') }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count
    const total = await Audit.countDocuments(query);

    // Get logs with pagination
    const logs = await Audit.find(query)
      .populate('performedBy', 'name email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  } catch (err) {
    console.error('❌ Error fetching audit logs:', err.message);
    return {
      logs: [],
      pagination: { page, limit, total: 0, pages: 0, hasNext: false, hasPrev: false }
    };
  }
}

module.exports = {
  logAction,
  getAuditLogs,
  Audit
};
