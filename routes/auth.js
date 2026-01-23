const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendMail, generateOtpEmailHTML, generateOtpEmailText } = require('../utils/mailer');
const { logAction } = require('../utils/auditLogger');

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.render('login', { error: 'Email and password required' });
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.render('login', { error: 'Invalid credentials' });
    if (!user.active) return res.render('login', { error: 'User disabled' });
    const ok = await user.validatePassword(password);
    if (!ok) return res.render('login', { error: 'Invalid credentials' });

    // login successful
    req.session.userId = user._id.toString();

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    // Log the login action
    await logAction({
      action: 'login',
      req,
      targetId: user._id,
      targetType: 'User',
      targetName: user.email,
      details: {
        email: user.email,
        role: user.role,
        loginTime: new Date()
      }
    });

    console.log('✅ Login successful for user:', user.email);
    console.log('🔐 User role:', user.role);
    console.log('📝 User passwordChanged:', user.passwordChanged);

    // Force password change only for first-time users (passwordChanged === false)
    if (!user.passwordChanged) {
      console.log('🔄 First login for user:', user.email, '- redirecting to change password');
      return res.redirect('/admin/change-password');
    }

    console.log('✅ Redirecting to dashboard');
    res.redirect('/admin');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'Server error' });
  }
});

router.get('/logout', async (req, res) => {
  const user = req.user;
  if (user) {
    await logAction({
      action: 'logout',
      req,
      targetId: user._id,
      targetType: 'User',
      targetName: user.email,
      details: { email: user.email, logoutTime: new Date() }
    });
  }
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Password strength validation helper
function validatePasswordStrength(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return {
    valid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
    errors: [
      !minLength && 'At least 8 characters required',
      !hasUpper && 'At least 1 uppercase letter required',
      !hasLower && 'At least 1 lowercase letter required',
      !hasNumber && 'At least 1 number required',
      !hasSpecial && 'At least 1 special character required'
    ].filter(Boolean)
  };
}

// Forgot password routes - See complete implementation below with OTP system

// =====================================================
// OTP-Based Password Reset Flow
// =====================================================

// Helper: Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Check rate limit (5 OTP requests per hour per email)
function isRateLimited(user) {
  if (!user.otpLastRequestTime) return false;
  const timeSinceLastRequest = Date.now() - user.otpLastRequestTime.getTime();
  const oneHour = 60 * 60 * 1000;
  const timeInHour = timeSinceLastRequest % oneHour;
  
  // If less than 1 hour has passed and attempts >= 5, rate limited
  if (timeInHour < oneHour && user.otpAttempts >= 5) {
    return true;
  }
  
  // Reset attempts if more than 1 hour has passed
  if (timeSinceLastRequest >= oneHour) {
    user.otpAttempts = 0;
    user.otpLastRequestTime = null;
  }
  
  return false;
}

// GET /forgot-password - Show email input form
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { 
    error: null, 
    success: null,
    email: '',
    layout: false
  });
});

// POST /forgot-password - Generate and send OTP
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  
  if (!email) {
    return res.render('forgot-password', { 
      error: 'Email is required',
      success: null,
      email: '',
      layout: false
    });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // Don't reveal if email exists or not (security)
    if (!user) {
      console.log('Forgot password request for non-existent email:', email);
      return res.render('forgot-password', { 
        error: null,
        success: 'If this email exists in our system, an OTP has been sent.',
        email: email,
        layout: false
      });
    }

    // Check rate limit
    if (isRateLimited(user)) {
      return res.render('forgot-password', { 
        error: 'Too many OTP requests. Please try again after 1 hour.',
        success: null,
        email: email,
        layout: false
      });
    }

    // Generate OTP and set expiry (10 minutes)
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    user.otpLastRequestTime = new Date();
    await user.save();

    // Send OTP email asynchronously (don't wait for it to avoid timeout)
    sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: '🔐 पासवर्ड रीसेट OTP - NHRA',
      html: generateOtpEmailHTML(otp, user.name),
      text: generateOtpEmailText(otp, user.name)
    }).then((result) => {
      if (result && result.id) {
        console.log('✅ OTP sent to:', user.email, '(Resend ID:', result.id + ')');
      }
    }).catch((err) => {
      console.error('❌ Failed to send OTP email to:', user.email, err.message);
    });

    console.log('✅ OTP generated and saved. Email sending in background...');
    
    res.render('forgot-password', { 
      error: null,
      success: 'OTP has been sent to your email. Please check your inbox and spam folder.',
      email: email,
      layout: false
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    console.error('Error details:', err.message);
    res.render('forgot-password', { 
      error: 'Server error. Please try again.',
      success: null,
      email: email,
      layout: false
    });
  }
});

// GET /verify-otp - Show OTP input form
router.get('/verify-otp', (req, res) => {
  res.render('verify-otp', { 
    error: null,
    success: null,
    email: '',
    layout: false
  });
});

// POST /verify-otp - Verify OTP and set session flag
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body || {};
  
  if (!email || !otp) {
    return res.render('verify-otp', { 
      error: 'Email and OTP are required',
      success: null,
      email: email || '',
      layout: false
    });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user || !user.otp) {
      return res.render('verify-otp', { 
        error: 'Invalid email or OTP not found. Please request a new OTP.',
        success: null,
        email: email,
        layout: false
      });
    }

    // Check OTP expiry
    if (new Date() > user.otpExpiry) {
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res.render('verify-otp', { 
        error: 'OTP has expired. Please request a new OTP.',
        success: null,
        email: email,
        layout: false
      });
    }

    // Verify OTP
    if (user.otp !== otp.toString()) {
      return res.render('verify-otp', { 
        error: 'Invalid OTP. Please try again.',
        success: null,
        email: email,
        layout: false
      });
    }

    // OTP verified - set session flag and redirect to reset password
    req.session.otpVerified = true;
    req.session.otpEmail = user.email;
    req.session.otpUserId = user._id.toString();

    console.log('✅ OTP verified for:', user.email);
    
    res.redirect('/reset-password');
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.render('verify-otp', { 
      error: 'Server error. Please try again.',
      success: null,
      email: email,
      layout: false
    });
  }
});

// GET /reset-password - Show password reset form (only if OTP verified)
router.get('/reset-password', (req, res) => {
  if (!req.session.otpVerified) {
    return res.redirect('/verify-otp');
  }

  res.render('reset-password-otp', { 
    error: null,
    success: null,
    email: req.session.otpEmail,
    layout: false
  });
});

// POST /reset-password - Update password (OTP-based)
router.post('/reset-password', async (req, res) => {
  const { newPassword, confirmPassword } = req.body || {};
  
  if (!req.session.otpVerified || !req.session.otpUserId) {
    return res.redirect('/forgot-password');
  }

  if (!newPassword || !confirmPassword) {
    return res.render('reset-password-otp', { 
      error: 'Password and confirmation are required',
      success: null,
      email: req.session.otpEmail,
      layout: false
    });
  }

  if (newPassword !== confirmPassword) {
    return res.render('reset-password-otp', { 
      error: 'Passwords do not match',
      success: null,
      email: req.session.otpEmail,
      layout: false
    });
  }

  // Validate password strength
  const strengthCheck = validatePasswordStrength(newPassword);
  if (!strengthCheck.valid) {
    return res.render('reset-password-otp', { 
      error: `Password requirements not met: ${strengthCheck.errors.join(', ')}`,
      success: null,
      email: req.session.otpEmail,
      layout: false
    });
  }

  try {
    const user = await User.findById(req.session.otpUserId);
    
    if (!user) {
      return res.redirect('/forgot-password');
    }

    // Update password
    await user.setPassword(newPassword);
    user.passwordChanged = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    user.otpLastRequestTime = undefined;
    await user.save();

    // Log the password reset action
    await logAction({
      action: 'password_reset_via_otp',
      req,
      targetId: user._id,
      targetType: 'User',
      targetName: user.email,
      details: {
        email: user.email,
        method: 'otp',
        resetTime: new Date()
      },
      note: 'Password changed via OTP verification'
    });

    // Clear session
    req.session.otpVerified = false;
    req.session.otpEmail = null;
    req.session.otpUserId = null;

    console.log('✅ Password reset successfully for:', user.email);

    res.render('reset-password-otp', { 
      error: null,
      success: '✅ Password has been reset successfully! You can now login with your new password.',
      email: req.session.otpEmail,
      showLoginLink: true,
      layout: false
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.render('reset-password-otp', { 
      error: 'Server error. Please try again.',
      success: null,
      email: req.session.otpEmail,
      layout: false
    });
  }
});

module.exports = router;
