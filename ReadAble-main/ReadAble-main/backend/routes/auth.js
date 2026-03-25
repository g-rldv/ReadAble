// ============================================================
// Auth Routes — /api/auth
// ============================================================
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'readable-dev-secret-change-in-production';
const JWT_EXPIRES = '7d';

// Helper: create a signed JWT
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, level: user.level },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3–30 characters' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE email=$1 OR username=$2',
      [email.toLowerCase(), username]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, level, xp, streak, achievements, avatar,
                 COALESCE(coins,0) as coins, wardrobe, equipped`,
      [username, email.toLowerCase(), password_hash]
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

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email=$1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);

    const token = signToken(user);
    const { password_hash, ...safeUser } = user;
    // Ensure coins is always present
    safeUser.coins = safeUser.coins ?? 0;
    safeUser.wardrobe = safeUser.wardrobe ?? [];
    safeUser.equipped = safeUser.equipped ?? {};
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('[Auth/Login]', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, level, xp, streak, achievements, avatar,
              COALESCE(coins,0) as coins,
              COALESCE(wardrobe, '[]'::jsonb) as wardrobe,
              COALESCE(equipped, '{}'::jsonb) as equipped,
              created_at, last_login
       FROM users WHERE id=$1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[Auth/Me]', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────
router.post('/refresh', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, level, xp FROM users WHERE id=$1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ token: signToken(user) });
  } catch (err) {
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

const crypto = require('crypto');
const { generateOTP, sendOTPEmail } = require('../utils/email');

// ── POST /api/auth/send-otp ───────────────────────────────────
// type: 'reset' | 'register'
router.post('/send-otp', async (req, res) => {
  const { email, type } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Always respond 200 — prevents email enumeration
  res.json({ message: 'If that email exists, a code was sent.' });

  try {
    if (type === 'register') {
      // For registration, check email isn't already taken
      const existing = await pool.query(
        'SELECT id FROM users WHERE email=$1', [email.toLowerCase().trim()]
      );
      if (existing.rows[0]) return; // silently do nothing
    } else {
      // For reset, only send if account exists
      const existing = await pool.query(
        'SELECT id FROM users WHERE email=$1', [email.toLowerCase().trim()]
      );
      if (!existing.rows[0]) return;
    }

    const otp       = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Upsert OTP (invalidates previous)
    await pool.query(
      `INSERT INTO otp_tokens (email, otp, type, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email, type) DO UPDATE
         SET otp=$2, expires_at=$4, used=FALSE, created_at=NOW()`,
      [email.toLowerCase().trim(), otp, type || 'reset', expiresAt]
    );

    await sendOTPEmail(email.toLowerCase().trim(), otp, type || 'reset');
  } catch (err) {
    console.error('[Auth/SendOTP]', err.message);
  }
});

// ── POST /api/auth/reset-password ────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp_code, new_password } = req.body;
    if (!email || !otp_code || !new_password)
      return res.status(400).json({ error: 'Email, code, and new password are required.' });
    if (new_password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const result = await pool.query(
      `SELECT id FROM otp_tokens
       WHERE email=$1 AND otp=$2 AND type='reset'
         AND used=FALSE AND expires_at > NOW()`,
      [email.toLowerCase().trim(), otp_code]
    );
    if (!result.rows[0])
      return res.status(400).json({ error: 'Invalid or expired code. Please request a new one.' });

    const password_hash = await bcrypt.hash(new_password, 12);
    await pool.query(
      'UPDATE users SET password_hash=$1 WHERE email=$2',
      [password_hash, email.toLowerCase().trim()]
    );
    await pool.query(
      'UPDATE otp_tokens SET used=TRUE WHERE email=$1 AND type=$2',
      [email.toLowerCase().trim(), 'reset']
    );

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error('[Auth/ResetPassword]', err.message);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

module.exports = router;
