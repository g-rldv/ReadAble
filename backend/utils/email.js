// ============================================================
// Email Utility — OTP delivery via SMTP (nodemailer)
// If SMTP_USER / SMTP_PASS are not set, OTPs are printed to
// console instead — perfect for local development.
// ============================================================
const nodemailer = require('nodemailer');

/** Generate a cryptographically reasonable 6-digit OTP */
function generateOTP() {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT  || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',  // true = port 465 SSL, false = 587 STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send a 6-digit OTP email.
 * type: 'register' | 'reset'
 *
 * Dev mode (no SMTP creds): logs OTP to console, skips email.
 */
async function sendOTPEmail(toEmail, otp, type) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`\n[EMAIL DEV] ── OTP for ${toEmail} (type: ${type}) ──`);
    console.log(`[EMAIL DEV]    Code: ${otp}`);
    console.log(`[EMAIL DEV]    (No SMTP configured — code logged here instead)\n`);
    return;
  }

  const transporter = createTransporter();
  const isReset     = type === 'reset';

  const subject  = isReset
    ? '🔑 Reset your ReadAble password'
    : '✉️ Verify your ReadAble account';
  const headline = isReset ? 'Reset Your Password' : 'Verify Your Email';
  const bodyText = isReset
    ? 'We received a request to reset your ReadAble password. Use the code below to continue:'
    : 'Thanks for joining ReadAble! Use the code below to verify your email address:';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:24px 16px;background:#FFF8F2;
             font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:480px;margin:auto;background:#ffffff;
              border-radius:20px;padding:40px 36px;
              box-shadow:0 4px 24px rgba(0,0,0,0.08)">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:28px">
      <span style="font-size:30px;font-weight:bold;color:#60B8F5">📚 ReadAble</span>
    </div>

    <h2 style="color:#2C1810;font-size:22px;margin:0 0 12px;font-weight:bold">
      ${headline}
    </h2>
    <p style="color:#8C6060;font-size:15px;line-height:1.7;margin:0 0 28px">
      ${bodyText}
    </p>

    <!-- OTP box -->
    <div style="text-align:center;margin:0 0 28px">
      <div style="display:inline-block;background:#F0F8FF;
                  border:2px solid #60B8F5;border-radius:16px;
                  padding:20px 48px">
        <span style="font-family:'Courier New',monospace;
                     font-size:42px;font-weight:bold;
                     letter-spacing:12px;color:#1A1A2E">
          ${otp}
        </span>
      </div>
    </div>

    <p style="color:#8C6060;font-size:14px;text-align:center;margin:0 0 28px">
      This code expires in <strong>10 minutes</strong>.
      Do not share it with anyone.
    </p>

    <hr style="border:none;border-top:1px solid #F0D8D0;margin:0 0 20px"/>

    <p style="color:#C0B0B0;font-size:12px;text-align:center;margin:0">
      If you didn't request this email, you can safely ignore it.
    </p>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from:    process.env.SMTP_FROM || `"ReadAble" <${process.env.SMTP_USER}>`,
    to:      toEmail,
    subject,
    html,
  });
}

module.exports = { generateOTP, sendOTPEmail };
