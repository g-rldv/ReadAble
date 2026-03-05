// ============================================================
// Settings Routes — /api/settings
// ============================================================
const settingsRouter = require('express').Router();
const usersRouter = require('express').Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/settings ─────────────────────────────────────────
settingsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM settings WHERE user_id=$1',
      [req.user.id]
    );
    // Auto-create if missing
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

// Export both routers
module.exports = settingsRouter;
module.exports.settingsRouter = settingsRouter;
module.exports.usersRouter = usersRouter;
