/**
 * Migration Script: Fix invalid user roles
 * 
 * This script does the following:
 * 1. Maps common role typos/old names to new enum values
 * 2. Creates audit log of changes
 * 3. Removes invalid assignedLevel/assignedId from superadmin users
 * 
 * Usage: node scripts/migrate_fix_user_roles.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Mapping of old/invalid roles to new valid roles
const ROLE_MAPPING = {
  'district_presdent': 'district_president',      // Common typo
  'district_president': 'district_president',
  'state_presient': 'state_president',            // Common typo
  'state_president': 'state_president',
  'division_presient': 'division_president',      // Common typo
  'division_president': 'division_president',
  'block_presient': 'block_president',            // Common typo
  'block_president': 'block_president',
};

const ALLOWED_ROLES = [
  'superadmin',
  'state_president',
  'state_secretary',
  'state_media_incharge',
  'division_president',
  'division_secretary',
  'division_media_incharge',
  'district_president',
  'district_secretary',
  'district_media_incharge',
  'block_president',
  'block_secretary',
  'block_media_incharge'
];

async function migrateRoles() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✓ Connected to MongoDB');

    // Track changes
    let fixedCount = 0;
    let invalidCount = 0;
    let superadminCleanupCount = 0;
    const auditLog = [];

    // 1. Fix typos and map old roles to new ones
    console.log('\n--- Step 1: Fixing role typos and mappings ---');
    
    for (const [oldRole, newRole] of Object.entries(ROLE_MAPPING)) {
      if (oldRole !== newRole) {
        const result = await User.updateMany(
          { role: oldRole },
          { role: newRole },
          { runValidators: false } // Skip validation during migration
        );

        if (result.modifiedCount > 0) {
          fixedCount += result.modifiedCount;
          console.log(`  Fixed ${result.modifiedCount} users: '${oldRole}' → '${newRole}'`);
          auditLog.push({
            action: 'fixed_typo',
            oldRole,
            newRole,
            count: result.modifiedCount,
            timestamp: new Date()
          });
        }
      }
    }

    // 2. Find and log invalid roles (not in enum)
    console.log('\n--- Step 2: Finding invalid roles ---');
    
    const invalidUsers = await User.find({
      role: { $nin: ALLOWED_ROLES }
    });

    if (invalidUsers.length > 0) {
      invalidCount = invalidUsers.length;
      console.log(`  Found ${invalidCount} users with invalid roles:`);
      invalidUsers.forEach(user => {
        console.log(`    - ${user.email}: '${user.role}'`);
        auditLog.push({
          action: 'invalid_role_found',
          userId: user._id,
          email: user.email,
          role: user.role,
          timestamp: new Date()
        });
      });
    } else {
      console.log('  ✓ No invalid roles found');
    }

    // 3. Clean up superadmin records (remove assignedLevel and assignedId)
    console.log('\n--- Step 3: Cleaning up superadmin assignments ---');
    
    const superadminWithAssignments = await User.find({
      role: 'superadmin',
      $or: [
        { assignedLevel: { $exists: true, $ne: null } },
        { assignedId: { $exists: true, $ne: null } }
      ]
    });

    if (superadminWithAssignments.length > 0) {
      const result = await User.updateMany(
        {
          role: 'superadmin',
          $or: [
            { assignedLevel: { $exists: true, $ne: null } },
            { assignedId: { $exists: true, $ne: null } }
          ]
        },
        {
          $unset: {
            assignedLevel: '',
            assignedId: ''
          }
        }
      );

      superadminCleanupCount = result.modifiedCount;
      console.log(`  Cleaned up ${superadminCleanupCount} superadmin users`);
      auditLog.push({
        action: 'superadmin_cleanup',
        count: superadminCleanupCount,
        timestamp: new Date()
      });
    } else {
      console.log('  ✓ No superadmin cleanup needed');
    }

    // 4. Verify all users now have valid roles
    console.log('\n--- Step 4: Verification ---');
    
    const totalUsers = await User.countDocuments();
    const validUsers = await User.countDocuments({
      role: { $in: ALLOWED_ROLES }
    });

    console.log(`  Total users: ${totalUsers}`);
    console.log(`  Valid roles: ${validUsers}`);

    if (validUsers === totalUsers) {
      console.log('  ✓ All users have valid roles!');
    } else {
      console.log(`  ⚠️  ${totalUsers - validUsers} users still have invalid roles`);
    }

    // 5. Summary
    console.log('\n--- Migration Summary ---');
    console.log(`  Fixed typos/mappings: ${fixedCount}`);
    console.log(`  Invalid roles found: ${invalidCount}`);
    console.log(`  Superadmin cleanup: ${superadminCleanupCount}`);
    console.log(`  Total changes: ${fixedCount + superadminCleanupCount}`);

    // Save audit log
    const auditLogPath = `./logs/migration_fix_user_roles_${Date.now()}.json`;
    const fs = require('fs');
    fs.writeFileSync(auditLogPath, JSON.stringify(auditLog, null, 2));
    console.log(`  ✓ Audit log saved to: ${auditLogPath}`);

    console.log('\n✓ Migration completed successfully!');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Run migration
migrateRoles();
