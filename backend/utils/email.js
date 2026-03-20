// ============================================================
// Email Utility — OTP delivery via SMTP (nodemailer)
// Safe: never crashes the server.
// Falls back to console.log if nodemailer isn't installed
// or SMTP credentials are not configured.
// ============================================================

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_) {
  console.warn('[Email] nodemailer not installed — OTPs will be logged to console.');
  console.warn('[Email] Run: npm install nodemailer --prefix backend');
}

/** Generate a 6-digit OTP string */
function generateOTP() {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

/**
 * Send a 6-digit OTP email.
 * type: 'register' | 'reset'
 * Never throws — email failure is logged but does NOT break the request.
 */
async function sendOTPEmail(toEmail, otp, type) {
  // Always log to console (great for dev, also a fallback record)
  console.log(`[OTP] ${type.toUpperCase()} code for ${toEmail}: ${otp}`);

  // If no SMTP or nodemailer missing, just use the console log above
  if (!nodemailer || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[Email] No SMTP configured — use the code logged above.');
    return;
  }

  const isReset  = type === 'reset';
  const subject  = isReset
    ? '🔑 Reset your ReadAble password'
    : '✉️ Verify your ReadAble account';
  const headline = isReset ? 'Reset Your Password' : 'Verify Your Email';
  const bodyLine = isReset
    ? 'Use the code below to reset your ReadAble password:'
    : 'Use the code below to verify your email address:';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:24px 16px;background:#FFF8F2;font-family:Arial,sans-serif">
  <div style="max-width:480px;margin:auto;background:#fff;border-radius:20px;
              padding:40px 36px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:28px;font-weight:bold;color:#60B8F5">📚 ReadAble</span>
    </div>
    <h2 style="color:#2C1810;font-size:20px;margin:0 0 10px">${headline}</h2>
    <p style="color:#8C6060;font-size:15px;line-height:1.7;margin:0 0 24px">${bodyLine}</p>
    <div style="text-align:center;margin:0 0 24px">
      <div style="display:inline-block;background:#F0F8FF;border:2px solid #60B8F5;
                  border-radius:16px;padding:18px 44px">
        <span style="font-family:'Courier New',monospace;font-size:40px;font-weight:bold;
                     letter-spacing:10px;color:#1A1A2E">${otp}</span>
      </div>
    </div>
    <p style="color:#8C6060;font-size:14px;text-align:center;margin:0 0 24px">
      This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
    </p>
    <hr style="border:none;border-top:1px solid #F0D8D0;margin:0 0 16px"/>
    <p style="color:#C0B0B0;font-size:12px;text-align:center;margin:0">
      If you did not request this, you can safely ignore it.
    </p>
  </div>
</body>
</html>`;

  try {
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from:    process.env.SMTP_FROM || `"ReadAble" <${process.env.SMTP_USER}>`,
      to:      toEmail,
      subject,
      html,
    });

    console.log(`[Email] Sent to ${toEmail}`);
  } catch (err) {
    // Log but never throw — OTP is already saved in DB and logged above
    console.error('[Email] Send failed:', err.message);
  }
}

module.exports = { generateOTP, sendOTPEmail };
