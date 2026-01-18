/**
 * Role Constants and Utilities
 * Centralized role management for the RMAS project
 */

// All allowed roles in the system
const ROLES = {
  SUPERADMIN: 'superadmin',
  STATE_PRESIDENT: 'state_president',
  STATE_SECRETARY: 'state_secretary',
  STATE_MEDIA_INCHARGE: 'state_media_incharge',
  DIVISION_PRESIDENT: 'division_president',
  DIVISION_SECRETARY: 'division_secretary',
  DIVISION_MEDIA_INCHARGE: 'division_media_incharge',
  DISTRICT_PRESIDENT: 'district_president',
  DISTRICT_SECRETARY: 'district_secretary',
  DISTRICT_MEDIA_INCHARGE: 'district_media_incharge',
  BLOCK_PRESIDENT: 'block_president',
  BLOCK_SECRETARY: 'block_secretary',
  BLOCK_MEDIA_INCHARGE: 'block_media_incharge'
};

// Levels mapping for roles
const ROLE_LEVELS = {
  [ROLES.SUPERADMIN]: 'global',
  [ROLES.STATE_PRESIDENT]: 'state',
  [ROLES.STATE_SECRETARY]: 'state',
  [ROLES.STATE_MEDIA_INCHARGE]: 'state',
  [ROLES.DIVISION_PRESIDENT]: 'division',
  [ROLES.DIVISION_SECRETARY]: 'division',
  [ROLES.DIVISION_MEDIA_INCHARGE]: 'division',
  [ROLES.DISTRICT_PRESIDENT]: 'district',
  [ROLES.DISTRICT_SECRETARY]: 'district',
  [ROLES.DISTRICT_MEDIA_INCHARGE]: 'district',
  [ROLES.BLOCK_PRESIDENT]: 'block',
  [ROLES.BLOCK_SECRETARY]: 'block',
  [ROLES.BLOCK_MEDIA_INCHARGE]: 'block'
};

// Roles that can assign/manage other roles
const ROLES_WITH_ASSIGN_PERMISSION = [
  ROLES.SUPERADMIN,
  ROLES.STATE_PRESIDENT,
  ROLES.DIVISION_PRESIDENT,
  ROLES.DISTRICT_PRESIDENT,
  ROLES.BLOCK_PRESIDENT
];

// Roles that have media/communication responsibilities
const MEDIA_INCHARGE_ROLES = [
  ROLES.STATE_MEDIA_INCHARGE,
  ROLES.DIVISION_MEDIA_INCHARGE,
  ROLES.DISTRICT_MEDIA_INCHARGE,
  ROLES.BLOCK_MEDIA_INCHARGE
];

// Roles that should NOT be able to assign/manage other roles
const ROLES_WITH_NO_ASSIGN_PERMISSION = MEDIA_INCHARGE_ROLES;

/**
 * Get array of all allowed role values
 * @returns {string[]} Array of role strings
 */
function getAllowedRoles() {
  return Object.values(ROLES);
}

/**
 * Check if a role is valid
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

/**
 * Check if a user with given role can assign/manage other users
 * @param {string} role - User's role
 * @returns {boolean}
 */
function canAssignRoles(role) {
  return ROLES_WITH_ASSIGN_PERMISSION.includes(role);
}

/**
 * Check if a role is a media/communication incharge
 * @param {string} role - Role to check
 * @returns {boolean}
 */
function isMediaIncharge(role) {
  return MEDIA_INCHARGE_ROLES.includes(role);
}

/**
 * Get the hierarchical level of a role
 * @param {string} role - Role to check
 * @returns {string|null} Level (global, state, division, district, block) or null if invalid
 */
function getRoleLevel(role) {
  return ROLE_LEVELS[role] || null;
}

/**
 * Get all roles at a specific level
 * @param {string} level - Level (state, division, district, block)
 * @returns {string[]} Array of roles at that level
 */
function getRolesByLevel(level) {
  return Object.entries(ROLE_LEVELS)
    .filter(([_, roleLevel]) => roleLevel === level)
    .map(([role, _]) => role);
}

/**
 * Get readable/display name for a role
 * @param {string} role - Role string
 * @returns {string} Readable role name
 */
function getRoleDisplayName(role) {
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

module.exports = {
  ROLES,
  ROLE_LEVELS,
  ROLES_WITH_ASSIGN_PERMISSION,
  ROLES_WITH_NO_ASSIGN_PERMISSION,
  MEDIA_INCHARGE_ROLES,
  getAllowedRoles,
  isValidRole,
  canAssignRoles,
  isMediaIncharge,
  getRoleLevel,
  getRolesByLevel,
  getRoleDisplayName
};
