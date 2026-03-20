// ============================================================
// Auth Routes — /api/auth
// New endpoints: POST /send-otp, POST /reset-password
// Modified:      POST /register  (now requires otp_code)
// ============================================================
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../db');
const { requireAuth }              = require('../middleware/auth');
const { generateOTP, sendOTPEmail } = require('../utils/email');

const JWT_SECRET          = process.env.JWT_SECRET || 'readable-dev-secret-change-in-production';
const JWT_EXPIRES         = '7d';
const OTP_EXPIRY_MINUTES  = 10;

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, level: user.level },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// ── POST /api/auth/send-otp ──────────────────────────────────
// Generates and emails a 6-digit OTP.
// type = 'register' | 'reset'
// Rate-limited: max 3 sends per email per 15 minutes.
router.post('/send-otp', async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email || !type)
      return res.status(400).json({ error: 'Email and type are required.' });
    if (!['register', 'reset'].includes(type))
      return res.status(400).json({ error: 'Invalid type. Use "register" or "reset".' });

    const normalEmail = email.toLowerCase().trim();

    // ── Type-specific pre-checks ─────────────────────────────
    if (type === 'register') {
      const taken = await pool.query(
        'SELECT id FROM users WHERE email=$1', [normalEmail]
      );
      if (taken.rows.length > 0)
        return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    if (type === 'reset') {
      const exists = await pool.query(
        'SELECT id FROM users WHERE email=$1', [normalEmail]
      );
      // Intentionally vague to avoid account enumeration
      if (exists.rows.length === 0) {
        return res.json({
          message: 'If an account with that email exists, a reset code has been sent.',
        });
      }
    }

    // ── Rate limit: max 3 sends per email per 15 min ─────────
    const rateRow = await pool.query(
      `SELECT COUNT(*) AS cnt FROM otps
       WHERE email=$1 AND type=$2
         AND created_at > NOW() - INTERVAL '15 minutes'`,
      [normalEmail, type]
    );
    if (parseInt(rateRow.rows[0].cnt, 10) >= 3) {
      return res.status(429).json({
        error: 'Too many codes sent. Please wait 15 minutes before trying again.',
      });
    }

    // ── Invalidate old unused OTPs for this email + type ─────
    await pool.query(
      `UPDATE otps SET used=TRUE
       WHERE email=$1 AND type=$2 AND used=FALSE`,
      [normalEmail, type]
    );

    // ── Generate and store ───────────────────────────────────
    const otp       = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      `INSERT INTO otps (email, otp_code, type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [normalEmail, otp, type, expiresAt.toISOString()]
    );

    // ── Send email ───────────────────────────────────────────
    await sendOTPEmail(normalEmail, otp, type);

    res.json({
      message: type === 'reset'
        ? 'If an account with that email exists, a reset code has been sent.'
        : 'Verification code sent to your email.',
    });
  } catch (err) {
    console.error('[Auth/SendOTP]', err);
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
  }
});

// ── POST /api/auth/register ──────────────────────────────────
// Modified: requires otp_code — verifies email ownership before
// creating the account.
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, otp_code } = req.body;

    if (!username || !email || !password || !otp_code)
      return res.status(400).json({
        error: 'Username, email, password and verification code are all required.',
      });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    if (username.length < 3 || username.length > 30)
      return res.status(400).json({ error: 'Username must be 3–30 characters.' });

    const normalEmail = email.toLowerCase().trim();

    // ── Verify OTP ───────────────────────────────────────────
    const otpRow = await pool.query(
      `SELECT id FROM otps
       WHERE email=$1 AND type='register' AND otp_code=$2
         AND used=FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [normalEmail, otp_code.trim()]
    );

    if (!otpRow.rows[0])
      return res.status(400).json({
        error: 'Invalid or expired verification code. Please request a new one.',
      });

    // Mark OTP as used (prevents replay)
    await pool.query('UPDATE otps SET used=TRUE WHERE id=$1', [otpRow.rows[0].id]);

    // ── Check for existing user (second safety check) ────────
    const existing = await pool.query(
      'SELECT id FROM users WHERE email=$1 OR username=$2',
      [normalEmail, username]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'Username or email already taken.' });

    // ── Create user ──────────────────────────────────────────
    const password_hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, level, xp, streak, achievements, avatar`,
      [username, normalEmail, password_hash]
    );
    const user = result.rows[0];

    await pool.query(
      'INSERT INTO settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [user.id]
    );

    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('[Auth/Register]', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const result = await pool.query(
      'SELECT * FROM users WHERE email=$1', [email.toLowerCase()]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid email or password.' });

    await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);

    const token = signToken(user);
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('[Auth/Login]', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────
// Verifies the reset OTP and updates the password in one step.
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp_code, new_password } = req.body;

    if (!email || !otp_code || !new_password)
      return res.status(400).json({
        error: 'Email, verification code, and new password are required.',
      });

    if (new_password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const normalEmail = email.toLowerCase().trim();

    // ── Verify OTP ───────────────────────────────────────────
    const otpRow = await pool.query(
      `SELECT id FROM otps
       WHERE email=$1 AND type='reset' AND otp_code=$2
         AND used=FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [normalEmail, otp_code.trim()]
    );

    if (!otpRow.rows[0])
      return res.status(400).json({
        error: 'Invalid or expired code. Please go back and request a new one.',
      });

    // ── Look up user ─────────────────────────────────────────
    const userRow = await pool.query(
      'SELECT id FROM users WHERE email=$1', [normalEmail]
    );
    if (!userRow.rows[0])
      return res.status(404).json({ error: 'Account not found.' });

    // ── Update password + mark OTP used ─────────────────────
    const password_hash = await bcrypt.hash(new_password, 12);
    await pool.query(
      'UPDATE users SET password_hash=$1 WHERE id=$2',
      [password_hash, userRow.rows[0].id]
    );
    await pool.query('UPDATE otps SET used=TRUE WHERE id=$1', [otpRow.rows[0].id]);

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('[Auth/ResetPassword]', err);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, level, xp, streak, achievements, avatar, created_at, last_login
       FROM users WHERE id=$1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[Auth/Me]', err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// ── POST /api/auth/refresh ───────────────────────────────────
router.post('/refresh', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, level, xp FROM users WHERE id=$1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ token: signToken(user) });
  } catch (err) {
    res.status(500).json({ error: 'Token refresh failed.' });
  }
});

module.exports = router;
