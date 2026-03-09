// ============================================================
// Settings & Users Routes
// ============================================================
const settingsRouter  = require('express').Router();
const usersRouter     = require('express').Router();
const bcrypt          = require('bcryptjs');
const pool            = require('../db');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/settings ─────────────────────────────────────────
settingsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE user_id=$1', [req.user.id]);
    if (!result.rows[0]) {
      const ins = await pool.query(
        'INSERT INTO settings (user_id) VALUES ($1) RETURNING *',
        [req.user.id]
      );
      return res.json({ settings: ins.rows[0] });
    }
    res.json({ settings: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ── PUT /api/settings ─────────────────────────────────────────
settingsRouter.put('/', requireAuth, async (req, res) => {
  try {
    const { text_size, theme, tts_enabled, tts_voice, tts_rate, tts_pitch } = req.body;
    const result = await pool.query(
      `INSERT INTO settings (user_id, text_size, theme, tts_enabled, tts_voice, tts_rate, tts_pitch, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         text_size   = EXCLUDED.text_size,
         theme       = EXCLUDED.theme,
         tts_enabled = EXCLUDED.tts_enabled,
         tts_voice   = EXCLUDED.tts_voice,
         tts_rate    = EXCLUDED.tts_rate,
         tts_pitch   = EXCLUDED.tts_pitch,
         updated_at  = NOW()
       RETURNING *`,
      [req.user.id, text_size, theme, tts_enabled, tts_voice, tts_rate, tts_pitch]
    );
    res.json({ settings: result.rows[0] });
  } catch (err) {
    console.error('[Settings/Update]', err.message);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ── GET /api/users/leaderboard ────────────────────────────────
usersRouter.get('/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT username, level, xp, avatar, achievements FROM users ORDER BY xp DESC LIMIT 10`
    );
    res.json({ leaderboard: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ── PUT /api/users/avatar ─────────────────────────────────────
// Accepts an emoji string OR a base64 data URL from an uploaded image.
// Avatar column is TEXT so any length is fine; 2 MB guard below for safety.
usersRouter.put('/avatar', requireAuth, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ error: 'Avatar is required' });
    if (avatar.length > 2_800_000)
      return res.status(400).json({ error: 'Image is too large. Please use a photo under 2 MB.' });
    await pool.query('UPDATE users SET avatar=$1 WHERE id=$2', [avatar, req.user.id]);
    res.json({ avatar });
  } catch (err) {
    console.error('[Users/Avatar]', err.message);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// ── PUT /api/users/username ───────────────────────────────────
usersRouter.put('/username', requireAuth, async (req, res) => {
  try {
    const raw = req.body?.username;
    if (!raw) return res.status(400).json({ error: 'Username is required' });
    const username = raw.trim();
    if (username.length < 3)
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    if (username.length > 30)
      return res.status(400).json({ error: 'Username must be 30 characters or less' });

    const conflict = await pool.query(
      'SELECT id FROM users WHERE username=$1 AND id != $2',
      [username, req.user.id]
    );
    if (conflict.rows.length > 0)
      return res.status(409).json({ error: 'That username is already taken' });

    const result = await pool.query(
      `UPDATE users SET username=$1 WHERE id=$2
       RETURNING id, username, email, level, xp, streak, achievements, avatar`,
      [username, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[Users/Username]', err.message);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

// ── DELETE /api/users/me ──────────────────────────────────────
usersRouter.delete('/me', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password)
      return res.status(400).json({ error: 'Password is required to delete your account' });

    const result = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    const user   = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Incorrect password. Account not deleted.' });

    await pool.query('DELETE FROM users WHERE id=$1', [req.user.id]);
    console.log(`[Users] Deleted account id=${req.user.id}`);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('[Users/Delete]', err.message);
    res.status(500).json({ error: 'Failed to delete account. Please try again.' });
  }
});

module.exports = { settingsRouter, usersRouter };
