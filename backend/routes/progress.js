// ============================================================
// Progress Routes — /api/progress
// ============================================================
const router = require('express').Router();
const pool   = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/progress — full history with activity details
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT up.*, a.title, a.type, a.difficulty, a.xp_reward
       FROM user_progress up
       JOIN activities a ON up.activity_id = a.id
       WHERE up.user_id = $1
       ORDER BY up.last_played DESC`,
      [req.user.id]
    );
    res.json({ progress: result.rows });
  } catch (err) {
    console.error('[Progress]', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// GET /api/progress/stats
// Accepts optional ?from=<ISO>&to=<ISO> query params for "today" window.
// The frontend passes the client's local midnight boundaries so the stats
// are always anchored to the user's actual calendar day, not the server's UTC day.
// Falls back to UTC date_trunc if params are missing.
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // Parse client-supplied boundaries (ISO strings from the browser)
    const rawFrom = req.query.from;
    const rawTo   = req.query.to;

    let todayFrom, todayTo;
    if (rawFrom && rawTo) {
      // Validate they look like ISO timestamps; if not fall back
      const f = new Date(rawFrom);
      const t = new Date(rawTo);
      if (!isNaN(f.getTime()) && !isNaN(t.getTime()) && t > f) {
        todayFrom = f.toISOString();
        todayTo   = t.toISOString();
      }
    }
    // Fallback: server UTC day
    if (!todayFrom) {
      const now = new Date();
      const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
      todayFrom = new Date(Date.UTC(y, m, d)).toISOString();
      todayTo   = new Date(Date.UTC(y, m, d + 1)).toISOString();
    }

    const stats = await pool.query(
      `SELECT
         COUNT(*)                                            AS total_activities,
         COUNT(*) FILTER (WHERE completed = TRUE)           AS completed_count,
         COALESCE(AVG(score), 0)                            AS avg_score,

         COUNT(*) FILTER (
           WHERE last_played >= $2::timestamptz
             AND last_played <  $3::timestamptz
         )                                                  AS today_played,

         COUNT(*) FILTER (
           WHERE completed = TRUE
             AND last_played >= $2::timestamptz
             AND last_played <  $3::timestamptz
         )                                                  AS today_completed,

         COALESCE(
           AVG(score) FILTER (
             WHERE last_played >= $2::timestamptz
               AND last_played <  $3::timestamptz
           ), 0
         )                                                  AS today_avg_score

       FROM user_progress
       WHERE user_id = $1`,
      [req.user.id, todayFrom, todayTo]
    );

    const user = await pool.query(
      `SELECT level, xp, streak, achievements, last_activity_date
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    res.json({ stats: stats.rows[0], user: user.rows[0] });
  } catch (err) {
    console.error('[Progress/Stats]', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
