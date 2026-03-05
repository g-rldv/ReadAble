// ============================================================
// Activities Routes — /api/activities
// ============================================================
const router = require('express').Router();
const pool = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// ── GET /api/activities ───────────────────────────────────────
// List all activities (filtered by difficulty/type if provided)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { difficulty, type } = req.query;
    let query = 'SELECT id, title, description, type, difficulty, xp_reward FROM activities';
    const params = [];
    const conditions = [];

    if (difficulty) {
      params.push(difficulty);
      conditions.push(`difficulty=$${params.length}`);
    }
    if (type) {
      params.push(type);
      conditions.push(`type=$${params.length}`);
    }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY difficulty ASC, id ASC';

    const result = await pool.query(query, params);
    res.json({ activities: result.rows });
  } catch (err) {
    console.error('[Activities/List]', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// ── GET /api/activities/:id ───────────────────────────────────
// Get full activity including game content
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM activities WHERE id=$1',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Activity not found' });

    // If logged in, also return user's progress on this activity
    let userProgress = null;
    if (req.user) {
      const prog = await pool.query(
        'SELECT score, attempts, completed FROM user_progress WHERE user_id=$1 AND activity_id=$2',
        [req.user.id, req.params.id]
      );
      userProgress = prog.rows[0] || null;
    }

    res.json({ activity: result.rows[0], userProgress });
  } catch (err) {
    console.error('[Activities/Get]', err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// ── POST /api/activities/:id/submit ──────────────────────────
// Submit an answer and get feedback + XP
router.post('/:id/submit', requireAuth, async (req, res) => {
  try {
    const { answer } = req.body;
    const activityId = parseInt(req.params.id);
    const userId = req.user.id;

    // Fetch activity
    const actResult = await pool.query('SELECT * FROM activities WHERE id=$1', [activityId]);
    if (!actResult.rows[0]) return res.status(404).json({ error: 'Activity not found' });

    const activity = actResult.rows[0];
    const { score, feedback, isCorrect } = evaluateAnswer(activity, answer);

    // Upsert progress record
    const existingProg = await pool.query(
      'SELECT id, attempts, score FROM user_progress WHERE user_id=$1 AND activity_id=$2',
      [userId, activityId]
    );

    let progressId;
    const attempts = (existingProg.rows[0]?.attempts || 0) + 1;
    const bestScore = Math.max(score, existingProg.rows[0]?.score || 0);

    if (existingProg.rows[0]) {
      await pool.query(
        `UPDATE user_progress SET score=$1, attempts=$2, completed=$3, feedback=$4, last_played=NOW()
         WHERE id=$5`,
        [bestScore, attempts, score >= 80, feedback, existingProg.rows[0].id]
      );
      progressId = existingProg.rows[0].id;
    } else {
      const ins = await pool.query(
        `INSERT INTO user_progress (user_id, activity_id, score, attempts, completed, feedback)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [userId, activityId, score, 1, score >= 80, feedback]
      );
      progressId = ins.rows[0].id;
    }

    // Award XP if at least partially correct
    let xpAwarded = 0;
    let newAchievements = [];
    if (score > 0) {
      xpAwarded = Math.round((score / 100) * activity.xp_reward);
      const userResult = await pool.query(
        `UPDATE users SET xp = xp + $1 WHERE id = $2
         RETURNING id, xp, level, achievements`,
        [xpAwarded, userId]
      );
      const updatedUser = userResult.rows[0];

      // Level up: every 50 XP = 1 level
      const newLevel = Math.floor(updatedUser.xp / 50) + 1;
      if (newLevel > updatedUser.level) {
        await pool.query('UPDATE users SET level=$1 WHERE id=$2', [newLevel, userId]);
      }

      // Check achievement unlocks
      newAchievements = await checkAchievements(userId, updatedUser);
    }

    res.json({ score, feedback, isCorrect, xpAwarded, newAchievements });
  } catch (err) {
    console.error('[Activities/Submit]', err);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// ── Evaluate Answer ───────────────────────────────────────────
function evaluateAnswer(activity, answer) {
  const correct = activity.correct_answer;
  let score = 0;
  let isCorrect = false;
  let feedback = '';

  switch (activity.type) {
    case 'word_match': {
      const pairs = Object.entries(correct);
      const correctCount = pairs.filter(([k, v]) => answer?.[k] === v).length;
      score = Math.round((correctCount / pairs.length) * 100);
      isCorrect = score === 100;
      feedback = isCorrect
        ? '🌟 Perfect! You matched every pair correctly!'
        : score >= 60
        ? `👍 Good effort! You got ${correctCount}/${pairs.length} pairs right. Try the ones you missed!`
        : `Keep practising! You got ${correctCount}/${pairs.length}. Look carefully at each pair.`;
      break;
    }
    case 'fill_blank': {
      const expected = correct.answers;
      const given = answer?.answers || [];
      const correctCount = expected.filter((a, i) => a?.toLowerCase() === given[i]?.toLowerCase()).length;
      score = Math.round((correctCount / expected.length) * 100);
      isCorrect = score === 100;
      feedback = isCorrect
        ? '🎉 Amazing! Every blank filled correctly!'
        : score >= 60
        ? `Well done! ${correctCount}/${expected.length} correct. Review the tricky ones!`
        : `You got ${correctCount}/${expected.length}. Read each sentence carefully and try again!`;
      break;
    }
    case 'sentence_sort': {
      const expected = correct.order;
      const given = answer?.order || [];
      const correctCount = expected.filter((s, i) => s === given[i]).length;
      score = Math.round((correctCount / expected.length) * 100);
      isCorrect = score === 100;
      feedback = isCorrect
        ? '🏆 Brilliant! The story is in perfect order!'
        : score >= 60
        ? `Good thinking! ${correctCount}/${expected.length} sentences in the right place. Think about what happens first!`
        : `${correctCount}/${expected.length} correct. Think about the beginning, middle, and end of the story!`;
      break;
    }
    case 'picture_word': {
      const expected = correct.answers;
      const given = answer?.answers || [];
      const correctCount = expected.filter((a, i) => a === given[i]).length;
      score = Math.round((correctCount / expected.length) * 100);
      isCorrect = score === 100;
      feedback = isCorrect
        ? '⭐ Super star! All pictures matched!'
        : score >= 60
        ? `Great job! ${correctCount}/${expected.length} correct. Look at the pictures again!`
        : `You got ${correctCount}/${expected.length}. Look very carefully at each picture!`;
      break;
    }
    default:
      score = 0;
      feedback = 'Unknown activity type.';
  }
  return { score, feedback, isCorrect };
}

// ── Check and Award Achievements ─────────────────────────────
async function checkAchievements(userId, user) {
  const newOnes = [];
  try {
    const allAch = await pool.pool?.query('SELECT * FROM achievements') ||
                   { rows: [] }; // fallback
    // Check XP thresholds
    if (user.xp >= 100 && !(user.achievements || []).includes('xp_100')) {
      await grantAchievement(userId, 'xp_100');
      newOnes.push({ key: 'xp_100', title: 'Century Club', icon: '💯' });
    }
    if (user.xp >= 500 && !(user.achievements || []).includes('xp_500')) {
      await grantAchievement(userId, 'xp_500');
      newOnes.push({ key: 'xp_500', title: 'XP Legend', icon: '🌟' });
    }
    if (user.level >= 5 && !(user.achievements || []).includes('level_5')) {
      await grantAchievement(userId, 'level_5');
      newOnes.push({ key: 'level_5', title: 'Word Wizard', icon: '🧙' });
    }
  } catch (_) {}
  return newOnes;
}

async function grantAchievement(userId, key) {
  await pool.query(
    `UPDATE users SET achievements = achievements || $1::jsonb WHERE id=$2
     AND NOT achievements @> $1::jsonb`,
    [JSON.stringify([key]), userId]
  );
}

module.exports = router;
