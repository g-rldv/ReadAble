// ============================================================
// Auth Routes — /api/auth  (fixed: 30d tokens, stable refresh)
// ============================================================
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
const { requireAuth } = require('../middleware/auth');

const JWT_SECRET  = process.env.JWT_SECRET || 'readable-dev-secret-change-in-production';
const JWT_EXPIRES = '30d'; // ← was 7d; 30 days prevents constant re-logins

// ── Helper: sign a token ──────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, level: user.level },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// ── Helper: safe user object (no password hash) ───────────────
function safeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: 'Username, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (username.length < 3 || username.length > 30)
      return res.status(400).json({ error: 'Username must be 3–30 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Please enter a valid email address' });

    const existing = await pool.query(
      'SELECT id FROM users WHERE email=$1 OR username=$2',
      [email.toLowerCase().trim(), username.trim()]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'Username or email already taken' });

    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, level, xp, streak, achievements, avatar, created_at`,
      [username.trim(), email.toLowerCase().trim(), password_hash]
    );
    const user = result.rows[0];

    // Create default settings row
    await pool.query(
      'INSERT INTO settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [user.id]
    );

    // Award first_star achievement on registration
    await pool.query(
      `UPDATE users SET achievements = achievements || '["first_star"]'::jsonb
       WHERE id=$1 AND NOT achievements @> '["first_star"]'::jsonb`,
      [user.id]
    );

    const token = signToken(user);
    console.log(`[Auth] Registered: ${user.username} (id=${user.id})`);
    res.status(201).json({ token, user: safeUser(user) });

  } catch (err) {
    console.error('[Auth/Register]', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const result = await pool.query(
      'SELECT * FROM users WHERE email=$1',
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid email or password' });

    await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);

    const token = signToken(user);
    console.log(`[Auth] Login: ${user.username} (id=${user.id})`);
    res.json({ token, user: safeUser(user) });

  } catch (err) {
    console.error('[Auth/Login]', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, level, xp, streak, achievements, avatar, created_at, last_login
       FROM users WHERE id=$1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[Auth/Me]', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────
// Issues a fresh 30-day token — called automatically by the frontend
// every 20 days so the session never expires during active use
router.post('/refresh', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, level, xp, streak, achievements, avatar
       FROM users WHERE id=$1`,
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error('[Auth/Refresh]', err.message);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

module.exports = router;
