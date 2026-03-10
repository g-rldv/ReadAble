// ============================================================
// Progress Routes — /api/progress
// ============================================================
const router = require('express').Router();
const pool   = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/progress — user's full progress with activity details
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

// GET /api/progress/stats — all-time + today aggregate stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await pool.query(
      `SELECT
         -- All-time
         COUNT(*)                                               AS total_activities,
         COUNT(*) FILTER (WHERE completed = TRUE)              AS completed_count,
         COALESCE(AVG(score), 0)                               AS avg_score,
         -- Today (using AT TIME ZONE avoids timezone edge cases)
         COUNT(*)        FILTER (WHERE last_played::date = CURRENT_DATE) AS today_played,
         COUNT(*)        FILTER (WHERE last_played::date = CURRENT_DATE AND completed = TRUE) AS today_completed,
         COALESCE(AVG(score) FILTER (WHERE last_played::date = CURRENT_DATE), 0) AS today_avg_score
       FROM user_progress
       WHERE user_id = $1`,
      [req.user.id]
    );
    const user = await pool.query(
      'SELECT level, xp, streak, achievements, last_activity_date FROM users WHERE id=$1',
      [req.user.id]
    );
    res.json({ stats: stats.rows[0], user: user.rows[0] });
  } catch (err) {
    console.error('[Progress/Stats]', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
