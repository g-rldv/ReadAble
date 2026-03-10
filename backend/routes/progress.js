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

// GET /api/progress/stats — all-time + today counts
// Uses explicit date arithmetic to avoid timezone edge cases:
// last_played >= start of today (UTC midnight) AND < start of tomorrow
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await pool.query(
      `SELECT
         COUNT(*)                                                          AS total_activities,
         COUNT(*)     FILTER (WHERE completed = TRUE)                     AS completed_count,
         COALESCE(AVG(score), 0)                                          AS avg_score,

         -- "today" = last_played is within the current calendar day UTC
         -- We use date_trunc to get a clean midnight boundary — no ::date cast ambiguity
         COUNT(*)     FILTER (
           WHERE last_played >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
             AND last_played <  date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day'
         )                                                                AS today_played,

         COUNT(*)     FILTER (
           WHERE completed = TRUE
             AND last_played >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
             AND last_played <  date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day'
         )                                                                AS today_completed,

         COALESCE(
           AVG(score) FILTER (
             WHERE last_played >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
               AND last_played <  date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day'
           ), 0
         )                                                                AS today_avg_score

       FROM user_progress
       WHERE user_id = $1`,
      [req.user.id]
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
