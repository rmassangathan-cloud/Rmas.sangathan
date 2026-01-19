const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,  // 10 seconds
  socketTimeout: 10000       // 10 seconds
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

// Download OTP Email Template (ID Card / Joining Letter)
function generateDownloadOtpEmailHTML(otp, memberName, ttlMinutes = 10) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
          .header { text-align: center; color: #2b235f; margin-bottom: 20px; }
          .logo { max-width: 100px; margin-bottom: 10px; }
          .content { color: #333; line-height: 1.6; }
          .otp-box { background-color: #e7f3ff; border: 2px solid #17a2b8; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #17a2b8; letter-spacing: 5px; }
          .info-box { background-color: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📄 डाउनलोड आपका डॉक्यूमेंट्स</h2>
            <p>ID Card / Joining Letter</p>
          </div>
          <div class="content">
            <p>नमस्ते ${memberName || 'सदस्य'},</p>
            <p>आपने अपने ID Card या Joining Letter को डाउनलोड करने के लिए अनुरोध किया है। कृपया नीचे दिए गए OTP का उपयोग करें।</p>
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; color: #666;">आपका One-Time Password (OTP):</p>
              <div class="otp-code">${otp}</div>
            </div>
            <div class="info-box">
              <strong>⏰ समय सीमा:</strong> यह OTP ${ttlMinutes} मिनट के लिए वैध है।<br>
              <strong>⚠️ महत्वपूर्ण:</strong> इस OTP को किसी के साथ साझा न करें।
            </div>
            <p>यदि आपने यह अनुरोध नहीं किया है, तो कृपया इस ईमेल को अनदेखा करें।</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 RMAS (Rashtriya Manav Adhikar Sangathan). All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Acceptance Email Template
function generateAcceptanceEmailHTML(memberName, membershipId, pdfUrl, pdfGenerated) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
          .header { text-align: center; color: #2b235f; margin-bottom: 20px; }
          .content { color: #333; line-height: 1.6; }
          .success-box { background-color: #d4edda; border: 2px solid #28a745; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
          .success-text { color: #155724; font-weight: bold; font-size: 18px; }
          .info-box { background-color: #e2e3e5; border: 1px solid #d6d8db; padding: 12px; border-radius: 5px; margin: 15px 0; }
          .cta-button { display: inline-block; background-color: #17a2b8; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; margin: 10px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎉 स्वागत है RMAS में!</h2>
            <p>आपकी सदस्यता स्वीकार की गई</p>
          </div>
          <div class="content">
            <p>नमस्ते ${memberName || 'सदस्य'},</p>
            <div class="success-box">
              <p class="success-text">✅ बधाई हो! आपका RMAS सदस्यता आवेदन स्वीकार कर लिया गया है।</p>
            </div>
            <div class="info-box">
              <strong>आपका सदस्यता ID:</strong> ${membershipId}
            </div>
            ${pdfGenerated ? `
            <p>अपना जॉइनिंग लेटर डाउनलोड करने के लिए नीचे दिए गए लिंक पर क्लिक करें:</p>
            <p style="text-align: center;">
              <a href="${pdfUrl}" class="cta-button">📄 जॉइनिंग लेटर डाउनलोड करें</a>
            </p>
            <p>आप QR कोड स्कैन करके अपनी सदस्यता को किसी भी समय वेरीफाई कर सकते हैं।</p>
            ` : `<p>आपका जॉइनिंग लेटर जल्द ही उपलब्ध कराया जाएगा।</p>`}
            <p>यदि आपको कोई प्रश्न है, तो कृपया हमसे संपर्क करें।</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 RMAS (Rashtriya Manav Adhikar Sangathan). All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Role Assignment Email Template
function generateRoleAssignmentEmailHTML(memberName, roleDisplay, downloadLink) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
          .header { text-align: center; color: #2b235f; margin-bottom: 20px; }
          .content { color: #333; line-height: 1.6; }
          .role-box { background-color: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
          .role-title { color: #856404; font-weight: bold; font-size: 18px; }
          .info-box { background-color: #e2e3e5; border: 1px solid #d6d8db; padding: 12px; border-radius: 5px; margin: 15px 0; }
          .cta-button { display: inline-block; background-color: #17a2b8; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; margin: 10px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎯 आपको एक पद असाइन किया गया है!</h2>
            <p>RMAS - राष्ट्रीय मानव अधिकार संगठन</p>
          </div>
          <div class="content">
            <p>नमस्ते ${memberName || 'सदस्य'},</p>
            <p>आपको निम्नलिखित पद पर असाइन किया गया है:</p>
            <div class="role-box">
              <p class="role-title">${roleDisplay}</p>
            </div>
            <p>अपने ID Card और Joining Letter को डाउनलोड करने के लिए नीचे दिए गए लिंक पर क्लिक करें:</p>
            <p style="text-align: center;">
              <a href="${downloadLink}" class="cta-button">📥 डाउनलोड पेज खोलें</a>
            </p>
            <div class="info-box">
              <strong>अगला चरण:</strong> डाउनलोड पेज पर अपना नाम और ईमेल दर्ज करें। आपको एक OTP प्राप्त होगा जिससे आप अपने दस्तावेज़ डाउनलोड कर सकते हैं।
            </div>
            <p>धन्यवाद,<br>RMAS Bihar Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 RMAS (Rashtriya Manav Adhikar Sangathan). All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

module.exports = { transporter, sendMail, generateOtpEmailHTML, generateOtpEmailText, generateDownloadOtpEmailHTML, generateAcceptanceEmailHTML, generateRoleAssignmentEmailHTML };
