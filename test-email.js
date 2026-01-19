require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Testing Email Configuration...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***hidden***' : 'NOT SET');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('\n✅ Verifying transporter connection...');
    await transporter.verify();
    console.log('✅ Connection verified! Nodemailer is ready to send emails.');

    console.log('\n📧 Sending test email...');
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: '🧪 Test Email - RMAS System',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
              .header { text-align: center; color: #2b235f; margin-bottom: 20px; }
              .content { color: #333; line-height: 1.6; }
              .success-box { background-color: #d4edda; border: 2px solid #28a745; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
              .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>🧪 Test Email</h2>
              </div>
              <div class="content">
                <div class="success-box">
                  <p><strong>✅ Email System Working!</strong></p>
                </div>
                <p>नमस्ते!</p>
                <p>यह एक test email है। अगर आपको यह मिल गया है, तो आपकी email configuration सही है।</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 RMAS System Test</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: 'Test email - if you received this, email is working!'
    });

    console.log('✅ Test email sent successfully!');
    console.log('Response:', result.response);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
  }

  process.exit(0);
}

testEmail();
