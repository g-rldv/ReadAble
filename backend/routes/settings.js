// ============================================================
// Settings & Users Routes — includes wardrobe & shop endpoints
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

    const result = await pool.query(
      `INSERT INTO settings (
         user_id, text_size, theme,
         tts_enabled, tts_voice, tts_rate, tts_pitch,
         bg_music_enabled, bg_music_theme, bg_music_volume,
         updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         text_size        = EXCLUDED.text_size,
         theme            = EXCLUDED.theme,
         tts_enabled      = EXCLUDED.tts_enabled,
         tts_voice        = EXCLUDED.tts_voice,
         tts_rate         = EXCLUDED.tts_rate,
         tts_pitch        = EXCLUDED.tts_pitch,
         bg_music_enabled = EXCLUDED.bg_music_enabled,
         bg_music_theme   = EXCLUDED.bg_music_theme,
         bg_music_volume  = EXCLUDED.bg_music_volume,
         updated_at       = NOW()
       RETURNING *`,
      [
        req.user.id, text_size || 'medium', theme || 'light',
        tts_enabled !== undefined ? tts_enabled : true,
        tts_voice || '', tts_rate || 0.9, tts_pitch || 1.0,
        bg_music_enabled !== undefined ? bg_music_enabled : false,
        bg_music_theme || 'calm', bg_music_volume || 0.7,
      ]
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
      `SELECT username, level, xp, avatar, achievements FROM users ORDER BY xp DESC LIMIT 25`
    );
    res.json({ leaderboard: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ── GET /api/users/wardrobe — fetch wardrobe + equipped ───────
usersRouter.get('/wardrobe', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT wardrobe, equipped FROM users WHERE id=$1',
      [req.user.id]
    );
    const { wardrobe, equipped } = result.rows[0] || {};
    res.json({ wardrobe: wardrobe || [], equipped: equipped || {} });
  } catch (err) {
    console.error('[Users/Wardrobe]', err.message);
    res.status(500).json({ error: 'Failed to fetch wardrobe' });
  }
});

// ── POST /api/users/buy-item ──────────────────────────────────
usersRouter.post('/buy-item', requireAuth, async (req, res) => {
  try {
    const { itemId, cost } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId required' });

    const userResult = await pool.query(
      'SELECT coins, wardrobe FROM users WHERE id=$1', [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const itemCost = parseInt(cost) || 0;
    const owned    = user.wardrobe || [];

    if (owned.includes(itemId)) {
      return res.status(409).json({ error: 'Item already owned' });
    }
    if ((user.coins || 0) < itemCost) {
      return res.status(402).json({ error: 'Not enough coins' });
    }

    await pool.query(
      `UPDATE users
         SET coins    = COALESCE(coins,0) - $1,
             wardrobe = wardrobe || $2::jsonb
       WHERE id=$3`,
      [itemCost, JSON.stringify([itemId]), req.user.id]
    );

    const updated = await pool.query('SELECT coins FROM users WHERE id=$1', [req.user.id]);
    res.json({ success: true, itemId, coins: updated.rows[0].coins });
  } catch (err) {
    console.error('[Users/BuyItem]', err.message);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

// ── POST /api/users/equip-item ────────────────────────────────
usersRouter.post('/equip-item', requireAuth, async (req, res) => {
  try {
    const { category, itemId } = req.body;
    if (!category || !itemId) return res.status(400).json({ error: 'category and itemId required' });

    // Merge into existing equipped JSONB
    await pool.query(
      `UPDATE users
         SET equipped = COALESCE(equipped, '{}'::jsonb) || jsonb_build_object($1::text, $2::text)
       WHERE id=$3`,
      [category, itemId, req.user.id]
    );
    res.json({ success: true, category, itemId });
  } catch (err) {
    console.error('[Users/EquipItem]', err.message);
    res.status(500).json({ error: 'Failed to equip item' });
  }
});

// ── GET /api/users/:username/stats ───────────────────────────
usersRouter.get('/:username/stats', async (req, res) => {
  try {
    const { username } = req.params;
    const userResult = await pool.query(
      `SELECT id, username, level, xp, streak, achievements, avatar, equipped, created_at
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
