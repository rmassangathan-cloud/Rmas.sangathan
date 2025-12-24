const express = require('express');
const router = express.Router();
const Membership = require('../models/Membership');
const QRCode = require('qrcode');

// GET /verify/:membershipId - Public verification page
router.get('/verify/:membershipId', async (req, res) => {
  try {
    const membership = await Membership.findOne({ membershipId: req.params.membershipId });

    if (!membership || membership.status !== 'accepted') {
      return res.render('verify', {
        valid: false,
        membership: null,
        qrCode: null
      });
    }

    // Generate QR code for this verification page
    const qrCodeDataURL = await QRCode.toDataURL(`${req.protocol}://${req.get('host')}/verify/${membership.membershipId}`);

    res.render('verify', {
      valid: true,
      membership: membership,
      qrCode: qrCodeDataURL
    });
  } catch (err) {
    console.error('Verification error:', err);
    res.render('verify', {
      valid: false,
      membership: null,
      qrCode: null
    });
  }
});

module.exports = router;
