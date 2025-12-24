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
  return transporter.sendMail(opts);
}

module.exports = { transporter, sendMail };
