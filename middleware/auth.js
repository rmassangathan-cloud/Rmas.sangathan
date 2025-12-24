const User = require('../models/User');

async function populateUser(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId).lean();
      if (user) {
        req.user = user;
        res.locals.currentUser = user;
      }
    } catch (err) {
      console.error('populateUser error:', err);
    }
  }
  next();
}

function ensureAuthenticated(req, res, next) {
  if (req.user && req.user.active) return next();
  return res.redirect('/login');
}

function ensureRole(...roles) {
  return function(req, res, next) {
    if (!req.user) return res.redirect('/login');
    if (roles.includes(req.user.role) || req.user.role === 'superadmin') return next();
    return res.status(403).send('Forbidden');
  };
}

module.exports = { populateUser, ensureAuthenticated, ensureRole };
