// ============================================================
// email.js — sends OTP emails via SendGrid HTTP API
// Set SENDGRID_API_KEY in your environment variables.
// Set SMTP_FROM to your sender email address.
// ============================================================

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_ADDRESS     = process.env.SMTP_FROM || 'noreply@yourdomain.com';

function generateOTP() {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

async function sendOTPEmail(toEmail, otp, type) {
  console.log(`[OTP] ${type.toUpperCase()} code for ${toEmail}: ${otp}`);

  if (!SENDGRID_API_KEY) {
    console.warn('[Email] SENDGRID_API_KEY not set — OTP logged above but NOT sent.');
    return;
  }

  const isReset  = type === 'reset';
  const subject  = isReset
    ? '🔑 Reset your ReadAble password'
    : '✉️ Verify your ReadAble account';
  const headline = isReset ? 'Reset Your Password' : 'Verify Your Email';
  const bodyLine = isReset
    ? 'Use the code below to reset your ReadAble password:'
    : 'Use the code below to verify your email and complete sign-up:';

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
      If you did not request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from:             { email: FROM_ADDRESS },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (response.ok) {
      console.log(`[Email] Sent ${type} OTP to ${toEmail}`);
    } else {
      const data = await response.json();
      console.error('[Email] SendGrid error:', JSON.stringify(data));
    }
  } catch (err) {
    console.error('[Email] SendGrid fetch failed:', err.message);
  }
}

module.exports = { generateOTP, sendOTPEmail };
