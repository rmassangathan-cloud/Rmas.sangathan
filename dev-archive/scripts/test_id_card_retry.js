// Simple manual test for ID card retry logic. Run with: node scripts/test_id_card_retry.js
require('dotenv').config();
const puppeteer = require('puppeteer');
const Membership = require('../models/Membership');
const fs = require('fs');

// Tiny mocks
Membership.findOne = async () => ({
  membershipId: 'TEST/ID/0001',
  fullName: 'Test User',
  photo: '/uploads/test.jpg',
  assignedAt: new Date(),
  assignedRoles: [{ role: 'secretary', level: 'district', location: 'Test District' }],
  save: async function () { console.log('membership.save called'); return this; }
});

const originalReadFileSync = fs.readFileSync;
const originalExistsSync = fs.existsSync;
fs.existsSync = (p) => true;
// Only override readFileSync for templates/images later to avoid breaking require();
fs.readFileSync = (p, enc) => {
  if (typeof p === 'string' && p.includes('id-card.ejs')) return '<html></html>';
  return originalReadFileSync(p, enc);
};

let callCount = 0;
puppeteer.launch = async () => {
  callCount++;
  if (callCount < 3) throw new Error('simulated launch failure');
  return {
    newPage: async () => ({ setContent: async () => {}, pdf: async () => Buffer.from('PDFDATA') }),
    close: async () => {}
  };
};

(async () => {
  try {
    const { generateIdCard } = require('./generate_id_card_correct');
    await generateIdCard('TEST/ID/0001');
    console.log('Manual test completed');
  } catch (err) {
    console.error('Manual test failed:', err);
  }
})();
