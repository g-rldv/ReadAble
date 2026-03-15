// ============================================================
// Activities Routes — /api/activities
// ============================================================
const router = require('express').Router();
const pool   = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// ── GET /api/activities ───────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { difficulty, type } = req.query;
    let query  = 'SELECT id, title, description, type, difficulty, xp_reward FROM activities';
    const params = [];
    const conds  = [];
    if (difficulty) { params.push(difficulty); conds.push(`difficulty=$${params.length}`); }
    if (type)       { params.push(type);       conds.push(`type=$${params.length}`);       }
    if (conds.length) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY difficulty ASC, id ASC';
    const result = await pool.query(query, params);
    res.json({ activities: result.rows });
  } catch (err) {
    console.error('[Activities/List]', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// ── GET /api/activities/:id ───────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM activities WHERE id=$1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Activity not found' });

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
router.post('/:id/submit', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { answer }     = req.body;
    const activityId     = parseInt(req.params.id);
    const userId         = req.user.id;

    // 1. Fetch activity
    const actResult = await client.query('SELECT * FROM activities WHERE id=$1', [activityId]);
    if (!actResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Activity not found' });
    }
    const activity          = actResult.rows[0];
    const { score, feedback, isCorrect, details } = evaluateAnswer(activity, answer);

    // 2. Upsert progress
    const existingProg = await client.query(
      'SELECT id, attempts, score FROM user_progress WHERE user_id=$1 AND activity_id=$2',
      [userId, activityId]
    );
    const attempts  = (existingProg.rows[0]?.attempts || 0) + 1;
    const bestScore = Math.max(score, existingProg.rows[0]?.score || 0);

    if (existingProg.rows[0]) {
      await client.query(
        `UPDATE user_progress SET score=$1, attempts=$2, completed=$3, feedback=$4, last_played=NOW()
         WHERE id=$5`,
        [bestScore, attempts, score >= 80, feedback, existingProg.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO user_progress (user_id, activity_id, score, attempts, completed, feedback, last_played)
         VALUES ($1,$2,$3,$4,$5,$6, NOW())`,
        [userId, activityId, score, 1, score >= 80, feedback]
      );
    }

    // 3. Streak — update every time user submits (regardless of score)
    const userRow = await client.query(
      'SELECT xp, level, achievements, streak, last_activity_date FROM users WHERE id=$1',
      [userId]
    );
    const userData  = userRow.rows[0];
    const todayDate = new Date().toISOString().split('T')[0];            // YYYY-MM-DD
    const yday      = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    const lastDate  = userData.last_activity_date
      ? new Date(userData.last_activity_date).toISOString().split('T')[0]
      : null;

    let newStreak = userData.streak || 0;
    if (lastDate === todayDate) {
      // Already played today — streak unchanged
    } else if (lastDate === yday) {
      // Consecutive day — increment
      newStreak = (userData.streak || 0) + 1;
    } else {
      // First ever, or broke the chain
      newStreak = 1;
    }

    // 4. XP & level
    let xpAwarded    = 0;
    let newAchievements = [];
    if (score > 0) {
      xpAwarded = Math.round((score / 100) * activity.xp_reward);
    }

    // 5. Single UPDATE for XP + streak + last_activity_date
    const updateResult = await client.query(
      `UPDATE users
         SET xp                 = xp + $1,
             streak             = $2,
             last_activity_date = $3
       WHERE id = $4
       RETURNING id, xp, level, achievements, streak`,
      [xpAwarded, newStreak, todayDate, userId]
    );
    const updatedUser = updateResult.rows[0];

    // 6. Level up check (every 50 XP = 1 level)
    const newLevel = Math.floor(updatedUser.xp / 50) + 1;
    if (newLevel > updatedUser.level) {
      await client.query('UPDATE users SET level=$1 WHERE id=$2', [newLevel, userId]);
      updatedUser.level = newLevel;
    }

    // 7. Achievement checks
    newAchievements = await checkAchievements(client, userId, updatedUser);

    await client.query('COMMIT');

    res.json({
      score,
      feedback,
      isCorrect,
      details,
      xpAwarded,
      newAchievements,
      streak: newStreak,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Activities/Submit]', err);
    res.status(500).json({ error: 'Failed to submit answer' });
  } finally {
    client.release();
  }
});

// ── Evaluate Answer ───────────────────────────────────────────
// Returns { score, feedback, isCorrect, details }
// details is an array of per-item results shown in the result card.
function evaluateAnswer(activity, answer) {
  const correct = activity.correct_answer;
  let score = 0, isCorrect = false, feedback = '', details = [];

  switch (activity.type) {
    case 'word_match': {
      const pairs = Object.entries(correct);
      details = pairs.map(([left, rightCorrect]) => ({
        label:   left,
        given:   answer?.[left] ?? null,
        correct: rightCorrect,
        ok:      answer?.[left] === rightCorrect,
      }));
      const correctCount = details.filter(d => d.ok).length;
      score     = Math.round((correctCount / pairs.length) * 100);
      isCorrect = score === 100;
      feedback  = isCorrect
        ? 'Perfect! You matched every pair correctly!'
        : score >= 60
        ? `Good effort! You got ${correctCount}/${pairs.length} pairs right.`
        : `Keep practising! You got ${correctCount}/${pairs.length}.`;
      break;
    }
    case 'fill_blank': {
      const expected = correct.answers;
      const given    = answer?.answers || [];
      const sentences = activity.content?.sentences || [];
      details = expected.map((rightAns, i) => ({
        label:   sentences[i]?.text?.replace('___', `[${given[i] || '?'}]`) || `Blank ${i+1}`,
        given:   given[i] ?? null,
        correct: rightAns,
        ok:      rightAns?.toLowerCase() === given[i]?.toLowerCase(),
      }));
      const correctCount = details.filter(d => d.ok).length;
      score     = Math.round((correctCount / expected.length) * 100);
      isCorrect = score === 100;
      feedback  = isCorrect
        ? 'Amazing! Every blank filled correctly!'
        : score >= 60
        ? `Well done! ${correctCount}/${expected.length} correct.`
        : `You got ${correctCount}/${expected.length}. Read each sentence carefully!`;
      break;
    }
    case 'sentence_sort': {
      const expected = correct.order;
      const given    = answer?.order || [];
      details = expected.map((sentence, i) => ({
        label:   `Step ${i + 1}`,
        given:   given[i] ?? null,
        correct: sentence,
        ok:      sentence === given[i],
      }));
      const correctCount = details.filter(d => d.ok).length;
      score     = Math.round((correctCount / expected.length) * 100);
      isCorrect = score === 100;
      feedback  = isCorrect
        ? 'Brilliant! The story is in perfect order!'
        : score >= 60
        ? `Good thinking! ${correctCount}/${expected.length} in the right place.`
        : `${correctCount}/${expected.length} correct. Think about beginning, middle, end!`;
      break;
    }
    case 'picture_word': {
      const expected = correct.answers;
      const given    = answer?.answers || [];
      const items    = activity.content?.items || [];
      details = expected.map((rightAns, i) => ({
        label:   items[i]?.picture || `Picture ${i+1}`,
        given:   given[i] ?? null,
        correct: rightAns,
        ok:      rightAns === given[i],
      }));
      const correctCount = details.filter(d => d.ok).length;
      score     = Math.round((correctCount / expected.length) * 100);
      isCorrect = score === 100;
      feedback  = isCorrect
        ? 'Super star! All pictures matched!'
        : score >= 60
        ? `Great job! ${correctCount}/${expected.length} correct.`
        : `You got ${correctCount}/${expected.length}. Look carefully at each picture!`;
      break;
    }
    default:
      score    = 0;
      feedback = 'Unknown activity type.';
  }
  return { score, feedback, isCorrect, details };
}

// ── Achievement checks ────────────────────────────────────────
async function checkAchievements(client, userId, user) {
  const newOnes = [];
  try {
    const unlocked = user.achievements || [];

    // Count completed activities
    const countRes = await client.query(
      'SELECT COUNT(*) AS cnt FROM user_progress WHERE user_id=$1 AND completed=TRUE',
      [userId]
    );
    const completedCount = parseInt(countRes.rows[0]?.cnt || 0);

    // Count perfect scores (score = 100)
    const perfectRes = await client.query(
      'SELECT COUNT(*) AS cnt FROM user_progress WHERE user_id=$1 AND score=100',
      [userId]
    );
    const perfectCount = parseInt(perfectRes.rows[0]?.cnt || 0);

    const checks = [
      // ── First activity ─────────────────────────────────────
      { key: 'first_star',   cond: () => true,                    title: 'First Star',       icon: '⭐' },
      // ── XP milestones ──────────────────────────────────────
      { key: 'xp_100',       cond: () => user.xp >= 100,          title: 'Century Club',     icon: '💯' },
      { key: 'xp_500',       cond: () => user.xp >= 500,          title: 'XP Legend',        icon: '🌟' },
      { key: 'xp_1000',      cond: () => user.xp >= 1000,         title: 'XP Master',        icon: '🏅' },
      // ── Level milestones ───────────────────────────────────
      { key: 'level_3',      cond: () => user.level >= 3,         title: 'Rising Reader',    icon: '📖' },
      { key: 'level_5',      cond: () => user.level >= 5,         title: 'Word Wizard',      icon: '🧙' },
      { key: 'level_10',     cond: () => user.level >= 10,        title: 'Reading Champion', icon: '🏆' },
      { key: 'level_20',     cond: () => user.level >= 20,        title: 'Scholar',          icon: '🎓' },
      // ── Streak milestones ──────────────────────────────────
      { key: 'streak_3',     cond: () => user.streak >= 3,        title: 'Consistent!',      icon: '📅' },
      { key: 'five_streak',  cond: () => user.streak >= 5,        title: 'On Fire!',         icon: '🔥' },
      { key: 'streak_7',     cond: () => user.streak >= 7,        title: 'Weekly Warrior',   icon: '⚡' },
      { key: 'ten_streak',   cond: () => user.streak >= 10,       title: 'Unstoppable',      icon: '💪' },
      // ── Activity completion milestones ─────────────────────
      { key: 'complete_5',   cond: () => completedCount >= 5,     title: 'Getting Started',  icon: '✅' },
      { key: 'complete_10',  cond: () => completedCount >= 10,    title: 'On a Roll',        icon: '🎯' },
      { key: 'complete_25',  cond: () => completedCount >= 25,    title: 'Dedicated Learner',icon: '📚' },
      { key: 'completionist',cond: () => completedCount >= 48,    title: 'Completionist',    icon: '🌈' },
      // ── Perfect score milestone ────────────────────────────
      { key: 'perfect_3',    cond: () => perfectCount >= 3,       title: 'Perfectionist',    icon: '💎' },
    ];

    for (const { key, cond, title, icon } of checks) {
      if (!unlocked.includes(key) && cond()) {
        await client.query(
          `UPDATE users SET achievements = achievements || $1::jsonb
           WHERE id=$2 AND NOT achievements @> $1::jsonb`,
          [JSON.stringify([key]), userId]
        );
        newOnes.push({ key, title, icon });
      }
    }
  } catch (err) {
    console.error('[Achievements]', err.message);
  }
  return newOnes;
}

module.exports = router;
