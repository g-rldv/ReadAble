// ============================================================
// Settings & Users Routes — merged with delete account
// ============================================================
const settingsRouter = require('express').Router();
const usersRouter    = require('express').Router();
const bcrypt         = require('bcryptjs');
const pool           = require('../db');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/settings ─────────────────────────────────────────
settingsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM settings WHERE user_id=$1',
      [req.user.id]
    );
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
         text_size=EXCLUDED.text_size, theme=EXCLUDED.theme,
         tts_enabled=EXCLUDED.tts_enabled, tts_voice=EXCLUDED.tts_voice,
         tts_rate=EXCLUDED.tts_rate, tts_pitch=EXCLUDED.tts_pitch,
         updated_at=NOW()
       RETURNING *`,
      [req.user.id, text_size, theme, tts_enabled, tts_voice, tts_rate, tts_pitch]
    );
    res.json({ settings: result.rows[0] });
  } catch (err) {
    console.error('[Settings/Update]', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ── GET /api/users/leaderboard ────────────────────────────────
usersRouter.get('/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT username, level, xp, avatar, achievements
       FROM users ORDER BY xp DESC LIMIT 10`
    );
    res.json({ leaderboard: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ── PUT /api/users/avatar ─────────────────────────────────────
usersRouter.put('/avatar', requireAuth, async (req, res) => {
  try {
    const { avatar } = req.body;
    await pool.query('UPDATE users SET avatar=$1 WHERE id=$2', [avatar, req.user.id]);
    res.json({ avatar });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// ── DELETE /api/users/me ──────────────────────────────────────
// Permanently deletes the account after password verification.
// CASCADE in the DB schema removes all related rows automatically
// (user_progress, settings, etc.)
usersRouter.delete('/me', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password)
      return res.status(400).json({ error: 'Password is required to delete your account' });

    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id=$1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Incorrect password. Account not deleted.' });

    // This single DELETE cascades to user_progress, settings, and all linked rows
    await pool.query('DELETE FROM users WHERE id=$1', [req.user.id]);
    console.log(`[Users] Deleted account id=${req.user.id}`);
    res.json({ message: 'Account deleted successfully' });

  } catch (err) {
    console.error('[Users/Delete]', err.message);
    res.status(500).json({ error: 'Failed to delete account. Please try again.' });
  }
});

module.exports = { settingsRouter, usersRouter };
