const { ensureAuthenticated } = require('./auth');

// Check if user has superadmin role
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'superadmin') return res.status(403).send('Forbidden');
  next();
};

// Check if user can manage district-level operations
const requireDistrictLevel = (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  const districtRoles = ['district_president', 'district_secretary', 'district_media_incharge'];
  if (!districtRoles.includes(req.user.role) && req.user.role !== 'superadmin') {
    return res.status(403).send('Forbidden');
  }
  next();
};

// Check if user can manage state-level operations
const requireStateLevel = (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  const stateRoles = ['state_president', 'state_secretary', 'state_media_incharge'];
  if (!stateRoles.includes(req.user.role) && req.user.role !== 'superadmin') {
    return res.status(403).send('Forbidden');
  }
  next();
};

// Helper function to check if user has access to a specific entity based on cascade
function hasCascadeAccess(user, targetLevel, targetId) {
  if (user.role === 'superadmin') return true;

  // Media incharge roles are view-only, no assign/accept authority
  if (user.role.includes('media_incharge')) return false;

  const userLevel = user.assignedLevel;
  const userId = user.assignedId;

  if (!userLevel || !userId) return false;

  // Same level check
  if (userLevel === targetLevel && userId === targetId) return true;

  // Cascade: higher level covers lower levels
  if (userLevel === 'state') {
    // State covers all divisions, districts, blocks in that state
    return targetLevel === 'division' || targetLevel === 'district' || targetLevel === 'block';
  } else if (userLevel === 'division') {
    // Division covers districts and blocks within that division
    if (targetLevel === 'district' || targetLevel === 'block') {
      // Check if target district/block belongs to user's division
      try {
        const fs = require('fs');
        const path = require('path');
        const divisionsPath = path.join(__dirname, '..', 'public', 'locations', 'bihar_divisions.json');
        const divisionsData = JSON.parse(fs.readFileSync(divisionsPath, 'utf8'));

        if (targetLevel === 'district') {
          return divisionsData[userId] && divisionsData[userId].includes(targetId);
        } else if (targetLevel === 'block') {
          // For blocks, we need to check which district the block belongs to, then check if that district is in user's division
          const blocksPath = path.join(__dirname, '..', 'public', 'locations', 'bihar_blocks.json');
          const blocksData = JSON.parse(fs.readFileSync(blocksPath, 'utf8'));

          for (const [district, blocks] of Object.entries(blocksData)) {
            if (blocks.includes(targetId)) {
              return divisionsData[userId] && divisionsData[userId].includes(district);
            }
          }
        }
      } catch (err) {
        console.error('Error checking cascade access:', err.message);
        return false;
      }
    }
  } else if (userLevel === 'district') {
    // District covers blocks within that district
    if (targetLevel === 'block') {
      try {
        const fs = require('fs');
        const path = require('path');
        const blocksPath = path.join(__dirname, '..', 'public', 'locations', 'bihar_blocks.json');
        const blocksData = JSON.parse(fs.readFileSync(blocksPath, 'utf8'));

        return blocksData[userId] && blocksData[userId].includes(targetId);
      } catch (err) {
        console.error('Error checking district to block access:', err.message);
        return false;
      }
    }
  }

  return false;
}

// Check if user can view/manage applications in their scope
const canAccessApplication = (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role === 'superadmin') return next();

  // For application access, we need to check based on the application context
  // This will be called from routes that have application data
  return next(); // Allow for now, specific checks will be in routes
};

// Check if user can assign roles at a specific level
const canAssignRoleAtLevel = (user, level, entityId) => {
  if (user.role === 'superadmin') return true;

  // Media incharge roles cannot assign roles
  if (user.role.includes('media_incharge')) return false;

  return hasCascadeAccess(user, level, entityId);
};

// Check if user can perform actions (accept/reject/assign) on applications
const canPerformActions = (user, application) => {
  if (user.role === 'superadmin') return true;

  // Media incharge roles are view-only
  if (user.role.includes('media_incharge')) return false;

  // Determine application level
  let appLevel = 'block'; // default
  let appEntityId = application.block || application.district;

  if (application.district && !application.block) {
    appLevel = 'district';
    appEntityId = application.district;
  } else if (application.division && !application.district) {
    appLevel = 'division';
    appEntityId = application.division;
  } else if (application.state && !application.division) {
    appLevel = 'state';
    appEntityId = application.state;
  }

  return hasCascadeAccess(user, appLevel, appEntityId);
};

module.exports = {
  requireSuperAdmin,
  requireDistrictLevel,
  requireStateLevel,
  canAccessApplication,
  canAssignRoleAtLevel,
  canPerformActions,
  hasCascadeAccess
};
