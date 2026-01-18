const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendMail(opts) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Mailer: credentials not configured, skipping send', opts);
    return null;
  }

  // Ensure HTML content is properly handled
  const mailOptions = {
    from: opts.from || process.env.EMAIL_USER,
    to: opts.to,
    subject: opts.subject,
    ...opts
  };

  // If HTML is provided, use it; otherwise fall back to text
  if (opts.html) {
    mailOptions.html = opts.html;
  } else if (opts.text) {
    mailOptions.text = opts.text;
  }

  return transporter.sendMail(mailOptions);
}

// OTP Email Template
function generateOtpEmailHTML(otp, userName) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
          .header { text-align: center; color: #2b235f; margin-bottom: 20px; }
          .content { color: #333; line-height: 1.6; }
          .otp-box { background-color: #e7f3ff; border: 2px solid #17a2b8; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #17a2b8; letter-spacing: 5px; }
          .expiry { color: #d9534f; font-weight: bold; margin-top: 15px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔐 Password Reset Request</h2>
          </div>
          <div class="content">
            <p>Hi ${userName || 'User'},</p>
            <p>You have requested to reset your password. Please use the OTP below to proceed with the password reset process.</p>
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; color: #666;">Your One-Time Password (OTP) is:</p>
              <div class="otp-code">${otp}</div>
            </div>
            <p><strong>⏰ Valid for 10 minutes only.</strong></p>
            <p style="color: #d9534f;"><strong>⚠️ Do not share this OTP with anyone.</strong></p>
            <p>If you did not request a password reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 RMAS (Rashtriya Manav Adhikar Sangathan). All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Plain text OTP email
function generateOtpEmailText(otp, userName) {
  return `
Password Reset Request

Hi ${userName || 'User'},

You have requested to reset your password. Please use the OTP below to proceed with the password reset process.

Your One-Time Password (OTP) is: ${otp}

Valid for 10 minutes only.

Do not share this OTP with anyone.

If you did not request a password reset, please ignore this email.

---
RMAS (Rashtriya Manav Adhikar Sangathan)
  `.trim();
}

module.exports = { transporter, sendMail, generateOtpEmailHTML, generateOtpEmailText };
