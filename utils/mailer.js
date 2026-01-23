// utils/mailer.js - Resend API integration (replaces Nodemailer)
const { Resend } = require('resend');
const https = require('https');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM || 'NHRA Bihar <no-reply@nhra-bihar.org>';

/**
 * Helper function to fetch file from URL as buffer
 * Used for Cloudinary URLs and remote attachments
 */
async function fetchFileFromUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch file: ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Main send mail function - compatible with previous Nodemailer usage
 * @param {Object} opts - Email options
 *   - to: recipient email
 *   - subject: email subject
 *   - text: plain text content
 *   - html: HTML content
 *   - attachments: [{filename, path, content (buffer)}, ...] or [{filename, url}]
 *   - from: (optional) sender email - defaults to EMAIL_FROM
 * @returns {Promise<Object>} - Resend response with id property
 */
async function sendMail(opts) {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️  Mailer: RESEND_API_KEY not configured, skipping send to:', opts.to);
      return { id: 'mock-id', success: false };
    }

    // Validate required fields
    if (!opts.to || !opts.subject) {
      console.warn('⚠️  Mailer: Missing to or subject');
      return null;
    }

    // Prepare email data
    const emailData = {
      from: opts.from || EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
    };

    // Add content - prefer HTML if available, fallback to text
    if (opts.html) {
      emailData.html = opts.html;
    } else if (opts.text) {
      emailData.text = opts.text;
    } else {
      console.warn('⚠️  Mailer: No HTML or text content provided');
      return null;
    }

    // Handle attachments
    if (opts.attachments && Array.isArray(opts.attachments) && opts.attachments.length > 0) {
      emailData.attachments = [];

      for (const attachment of opts.attachments) {
        try {
          let attachmentData = {
            filename: attachment.filename,
          };

          // Handle different attachment sources
          if (attachment.content) {
            // Direct buffer content
            attachmentData.content = attachment.content.toString('base64');
          } else if (attachment.path) {
            // Local file path
            const fs = require('fs');
            const fileContent = fs.readFileSync(attachment.path);
            attachmentData.content = fileContent.toString('base64');
          } else if (attachment.url) {
            // Remote URL (e.g., Cloudinary)
            const buffer = await fetchFileFromUrl(attachment.url);
            attachmentData.content = buffer.toString('base64');
          }

          emailData.attachments.push(attachmentData);
          console.log(`  📎 Attachment added: ${attachment.filename}`);
        } catch (attachErr) {
          console.error(`  ❌ Failed to process attachment "${attachment.filename}":`, attachErr.message);
          // Continue with other attachments
        }
      }
    }

    // Send email via Resend
    console.log(`📧 Sending email via Resend to: ${opts.to} (Subject: ${opts.subject})`);
    const response = await resend.emails.send(emailData);

    if (response.error) {
      console.error('❌ Resend API error:', response.error);
      return null;
    }

    console.log(`✅ Email sent to: ${opts.to} (ID: ${response.data.id})`);
    return response.data;
  } catch (error) {
    console.error('❌ Mailer error:', error.message);
    return null;
  }
}

// ============= EMAIL TEMPLATES =============

// OTP Email Template (HTML)
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
            <h2>🔐 पासवर्ड रीसेट अनुरोध</h2>
          </div>
          <div class="content">
            <p>नमस्ते ${userName || 'User'},</p>
            <p>आपने अपना पासवर्ड रीसेट करने के लिए अनुरोध किया है। कृपया पासवर्ड रीसेट प्रक्रिया जारी रखने के लिए नीचे दिया गया OTP का उपयोग करें।</p>
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; color: #666;">आपका One-Time Password (OTP) है:</p>
              <div class="otp-code">${otp}</div>
            </div>
            <p><strong>⏰ 10 मिनट के लिए वैध है।</strong></p>
            <p style="color: #d9534f;"><strong>⚠️ इस OTP को किसी के साथ शेयर न करें।</strong></p>
            <p>यदि आपने यह अनुरोध नहीं किया है, तो कृपया इस ईमेल को अनदेखा करें।</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 NHRA (राष्ट्रीय मानव अधिकार संगठन). सर्वाधिकार सुरक्षित।</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// OTP Email Template (Plain Text)
function generateOtpEmailText(otp, userName) {
  return `
पासवर्ड रीसेट अनुरोध

नमस्ते ${userName || 'User'},

आपने अपना पासवर्ड रीसेट करने के लिए अनुरोध किया है। कृपया पासवर्ड रीसेट प्रक्रिया जारी रखने के लिए नीचे दिया गया OTP का उपयोग करें।

आपका One-Time Password (OTP) है: ${otp}

10 मिनट के लिए वैध है।

इस OTP को किसी के साथ शेयर न करें।

यदि आपने यह अनुरोध नहीं किया है, तो कृपया इस ईमेल को अनदेखा करें।

---
NHRA (राष्ट्रीय मानव अधिकार संगठन)
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
            <h2>📄 अपने डॉक्यूमेंट्स डाउनलोड करें</h2>
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
            <p>&copy; 2026 NHRA (राष्ट्रीय मानव अधिकार संगठन). सर्वाधिकार सुरक्षित।</p>
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
            <h2>🎉 NHRA में आपका स्वागत है!</h2>
            <p>आपकी सदस्यता स्वीकार की गई</p>
          </div>
          <div class="content">
            <p>नमस्ते ${memberName || 'सदस्य'},</p>
            <div class="success-box">
              <p class="success-text">✅ बधाई हो! आपका NHRA सदस्यता आवेदन स्वीकार कर लिया गया है।</p>
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
            <p>&copy; 2026 NHRA (राष्ट्रीय मानव अधिकार संगठन). सर्वाधिकार सुरक्षित।</p>
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
            <p>NHRA - राष्ट्रीय मानव अधिकार संगठन</p>
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
            <p>धन्यवाद,<br>NHRA Bihar Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 NHRA (राष्ट्रीय मानव अधिकार संगठन). सर्वाधिकार सुरक्षित।</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Export functions
module.exports = {
  sendMail,
  generateOtpEmailHTML,
  generateOtpEmailText,
  generateDownloadOtpEmailHTML,
  generateAcceptanceEmailHTML,
  generateRoleAssignmentEmailHTML
};
