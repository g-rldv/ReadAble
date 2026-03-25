// ============================================================
// Email Utility — OTP delivery via SMTP (nodemailer)
// Safe: never crashes the server.
// ============================================================

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_) {
  console.warn('[Email] nodemailer not installed — OTPs will be logged to console.');
}

/** Generate a 6-digit OTP string */
function generateOTP() {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

/**
 * Send a 6-digit OTP email.
 * type: 'register' | 'reset'
 */
async function sendOTPEmail(toEmail, otp, type) {
  console.log(`[OTP] ${type.toUpperCase()} code for ${toEmail}: ${otp}`);

  // ── Diagnostic: log exactly what is set ──────────────────
  console.log('[Email] nodemailer loaded:', !!nodemailer);
  console.log('[Email] SMTP_USER:', process.env.SMTP_USER ? `"${process.env.SMTP_USER}"` : 'MISSING');
  console.log('[Email] SMTP_PASS:', process.env.SMTP_PASS ? `SET (${process.env.SMTP_PASS.length} chars)` : 'MISSING');
  console.log('[Email] SMTP_HOST:', process.env.SMTP_HOST || 'MISSING');
  console.log('[Email] SMTP_PORT:', process.env.SMTP_PORT || 'MISSING');
  console.log('[Email] SMTP_SECURE:', process.env.SMTP_SECURE || 'MISSING');

  if (!nodemailer) {
    console.log('[Email] SKIP — nodemailer not installed.');
    return;
  }
  if (!process.env.SMTP_USER) {
    console.log('[Email] SKIP — SMTP_USER is not set.');
    return;
  }
  if (!process.env.SMTP_PASS) {
    console.log('[Email] SKIP — SMTP_PASS is not set.');
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
    console.log('[Email] Creating transporter...');
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log('[Email] Verifying transporter...');
    await transporter.verify();
    console.log('[Email] Transporter verified. Sending...');

    await transporter.sendMail({
      from:    process.env.SMTP_FROM || `"ReadAble" <${process.env.SMTP_USER}>`,
      to:      toEmail,
      subject,
      html,
    });

    console.log(`[Email] Sent to ${toEmail}`);
  } catch (err) {
    console.error('[Email] Send failed:', err.message);
    console.error('[Email] Error code:', err.code);
    console.error('[Email] Error details:', JSON.stringify(err, null, 2));
  }
}

module.exports = { generateOTP, sendOTPEmail };
