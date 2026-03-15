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
    console.error('[Settings/Get]', err.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ── PUT /api/settings ─────────────────────────────────────────
settingsRouter.put('/', requireAuth, async (req, res) => {
  try {
    const {
      text_size, theme,
      tts_enabled, tts_voice, tts_rate, tts_pitch,
      bg_music_enabled, bg_music_theme, bg_music_volume,
    } = req.body;

    // Step 1: ensure the row exists (safe for new users)
    await pool.query(
      'INSERT INTO settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [req.user.id]
    );

    // Step 2: update core columns that always exist
    await pool.query(
      `UPDATE settings SET
         text_size   = $2,
         theme       = $3,
         tts_enabled = $4,
         tts_voice   = $5,
         tts_rate    = $6,
         tts_pitch   = $7,
         updated_at  = NOW()
       WHERE user_id = $1`,
      [
        req.user.id,
        text_size   || 'medium',
        theme       || 'light',
        tts_enabled !== undefined ? tts_enabled : true,
        tts_voice   || '',
        tts_rate    !== undefined ? tts_rate   : 0.9,
        tts_pitch   !== undefined ? tts_pitch  : 1.0,
      ]
    );

    // Step 3: update music columns only if they exist in the schema
    // (idempotent: migration may not have run on older deploys)
    try {
      await pool.query(
        `UPDATE settings SET
           bg_music_enabled = $2,
           bg_music_theme   = $3,
           bg_music_volume  = $4
         WHERE user_id = $1`,
        [
          req.user.id,
          bg_music_enabled !== undefined ? bg_music_enabled : false,
          bg_music_theme   || 'calm',
          bg_music_volume  !== undefined ? bg_music_volume  : 0.7,
        ]
      );
    } catch (_) { /* columns not yet added — harmless */ }

    const result = await pool.query('SELECT * FROM settings WHERE user_id=$1', [req.user.id]);
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
      `SELECT username, level, xp, avatar, achievements FROM users ORDER BY xp DESC LIMIT 25`
    );
    res.json({ leaderboard: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ── GET /api/users/:username/stats — public profile for leaderboard modal ──
usersRouter.get('/:username/stats', async (req, res) => {
  try {
    const { username } = req.params;
    const userResult = await pool.query(
      `SELECT id, username, level, xp, streak, achievements, avatar, created_at
       FROM users WHERE username = $1`,
      [username]
    );
    if (!userResult.rows[0])
      return res.status(404).json({ error: 'User not found' });

    const user = userResult.rows[0];
    const statsResult = await pool.query(
      `SELECT
         COUNT(*)                                        AS total_activities,
         COUNT(*) FILTER (WHERE completed = TRUE)       AS completed_count,
         COALESCE(AVG(score), 0)                        AS avg_score
       FROM user_progress WHERE user_id = $1`,
      [user.id]
    );
    res.json({ user, stats: statsResult.rows[0] });
  } catch (err) {
    console.error('[Users/Stats]', err.message);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// ── PUT /api/users/avatar ─────────────────────────────────────
usersRouter.put('/avatar', requireAuth, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ error: 'Avatar is required' });
    if (avatar.length > 2_800_000)
      return res.status(400).json({ error: 'Image too large. Use a photo under 2 MB.' });
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
    if (username.length < 3)  return res.status(400).json({ error: 'Username must be at least 3 characters' });
    if (username.length > 30) return res.status(400).json({ error: 'Username must be 30 characters or less' });

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
