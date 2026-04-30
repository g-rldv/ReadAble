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

    // FIX: was `const { answers: answer } = req.body` which always gave undefined
    const { answer } = req.body;
    const activityId     = parseInt(req.params.id);
    const userId         = req.user.id;

    // 1. Fetch activity
    const actResult = await client.query('SELECT * FROM activities WHERE id=$1', [activityId]);
    if (!actResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Activity not found' });
    }
    const activity = actResult.rows[0];
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

    // 3. Streak — update every time user submits
    const userRow = await client.query(
      'SELECT xp, level, achievements, streak, last_activity_date, coins FROM users WHERE id=$1',
      [userId]
    );
    const userData  = userRow.rows[0];
    const todayDate = new Date().toISOString().split('T')[0];
    const yday      = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    const lastDate  = userData.last_activity_date
      ? new Date(userData.last_activity_date).toISOString().split('T')[0]
      : null;

    let newStreak = userData.streak || 0;
    if (lastDate === todayDate) {
      // no change
    } else if (lastDate === yday) {
      newStreak = (userData.streak || 0) + 1;
    } else {
      newStreak = 1;
    }

    // 4. XP & coins
    let xpAwarded    = 0;
    let coinsAwarded = 0;
    if (score > 0) {
      xpAwarded    = Math.round((score / 100) * activity.xp_reward);
      coinsAwarded = Math.round(xpAwarded * 1.5);  // coins = 1.5× XP
    }

    // 5. Update XP + streak + coins
    const updateResult = await client.query(
      `UPDATE users
         SET xp                 = xp + $1,
             streak             = $2,
             last_activity_date = $3,
             coins              = COALESCE(coins,0) + $4
       WHERE id = $5
       RETURNING id, xp, level, achievements, streak, coins`,
      [xpAwarded, newStreak, todayDate, coinsAwarded, userId]
    );
    const updatedUser = updateResult.rows[0];

    // 6. Level up check (every 50 XP = 1 level)
    const newLevel = Math.floor(updatedUser.xp / 50) + 1;
    if (newLevel > updatedUser.level) {
      await client.query('UPDATE users SET level=$1 WHERE id=$2', [newLevel, userId]);
      updatedUser.level = newLevel;
    }

    // 7. Achievement checks
    const newAchievements = await checkAchievements(client, userId, updatedUser);

    // 8. Bonus coins for new achievements
    if (newAchievements.length > 0) {
      const achBonus = newAchievements.length * 25;
      await client.query('UPDATE users SET coins = COALESCE(coins,0) + $1 WHERE id=$2',
        [achBonus, userId]);
      coinsAwarded += achBonus;
    }

    // 9. Auto-unlock characters from new achievements
    if (newAchievements.length > 0) {
      const ACHIEVEMENT_CHARACTER_UNLOCKS = {
        first_star:    ['char_common_blue'],
        complete_5:    ['char_common_dalmatian'],
        xp_100:        ['char_uncommon_greenglass'],
        level_3:       ['char_uncommon_student'],
        five_streak:   ['char_uncommon_hero'],
        complete_10:   ['char_uncommon_ranger'],
        xp_500:        ['char_rare_painter'],
        complete_25:   ['char_rare_baker'],
        ten_streak:    ['char_rare_bluebonnet'],
        level_10:      ['char_rare_guitar'],
        completionist: ['char_mythic_shadowmonarch'],
        xp_1000:       ['char_mythic_sunarmor'],
      };

      const achKeys = newAchievements.map(a => a.key);
      const currentWardrobe = await client.query(
        'SELECT wardrobe FROM users WHERE id=$1', [userId]
      );
      const alreadyOwned = currentWardrobe.rows[0]?.wardrobe || [];

      const toUnlock = [];
      achKeys.forEach(k => {
        (ACHIEVEMENT_CHARACTER_UNLOCKS[k] || []).forEach(charId => {
          if (!alreadyOwned.includes(charId)) toUnlock.push(charId);
        });
      });

      if (toUnlock.length > 0) {
        await client.query(
          `UPDATE users SET wardrobe = wardrobe || $1::jsonb WHERE id=$2`,
          [JSON.stringify(toUnlock), userId]
        );
      }
    }

    // ── COMMIT the transaction ────────────────────────────────
    await client.query('COMMIT');

    res.json({
      score,
      feedback,
      isCorrect,
      details,          // per-answer breakdown for UI
      xpAwarded,
      coinsAwarded,
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
function evaluateAnswer(activity, answer) {
  let correct = activity.correct_answer;
  // Parse JSON string if needed
  if (typeof correct === 'string') {
    try { correct = JSON.parse(correct); } catch (_) {}
  }
  let score = 0, isCorrect = false, feedback = '', details = [];

  switch (activity.type) {
    case 'word_match': {
      const pairs        = Object.entries(correct);
      const correctCount = pairs.filter(([k, v]) => answer?.[k]?.trim() === v?.trim()).length;
      score     = Math.round((correctCount / pairs.length) * 100);
      isCorrect = score === 100;
      feedback  = isCorrect
        ? 'Perfect! You matched every pair correctly!'
        : score >= 60
        ? `Good effort! You got ${correctCount}/${pairs.length} pairs right.`
        : `Keep practising! You got ${correctCount}/${pairs.length}.`;
      details   = pairs.map(([k, v]) => ({
        label: k, correct: v,
        given: answer?.[k] || '', ok: answer?.[k]?.trim() === v?.trim(),
      }));
      break;
    }
    case 'fill_blank': {
      const expected     = correct.answers;
      const given        = answer?.answers || [];
      const correctCount = expected.filter((a, i) => a?.toLowerCase().trim() === given[i]?.toLowerCase().trim()).length;
      score     = Math.round((correctCount / expected.length) * 100);
      isCorrect = score === 100;
      feedback  = isCorrect
        ? 'Amazing! Every blank filled correctly!'
        : score >= 60
        ? `Well done! ${correctCount}/${expected.length} correct.`
        : `You got ${correctCount}/${expected.length}. Read each sentence carefully!`;
      details   = expected.map((a, i) => ({
        label: `Blank ${i+1}`, correct: a,
        given: given[i] || '', ok: a?.toLowerCase().trim() === given[i]?.toLowerCase().trim(),
      }));
      break;
    }
    case 'sentence_sort': {
      const expected     = correct.order;
      const given        = answer?.order || [];
      const correctCount = expected.filter((s, i) => s === given[i]).length;
      score     = Math.round((correctCount / expected.length) * 100);
      isCorrect = score === 100;
      feedback  = isCorrect
        ? 'Brilliant! The story is in perfect order!'
        : score >= 60
        ? `Good thinking! ${correctCount}/${expected.length} in the right place.`
        : `${correctCount}/${expected.length} correct. Think about beginning, middle, end!`;
      details   = expected.map((s, i) => ({
        label: `Step ${i+1}`, correct: s,
        given: given[i] || '', ok: s === given[i],
      }));
      break;
    }
    case 'picture_word': {
      const expected     = correct.answers;
      const given        = answer?.answers || [];
      const parsedContent = typeof activity.content === 'string' ? JSON.parse(activity.content) : activity.content;
      const items        = parsedContent?.items || [];
      const correctCount = expected.filter((a, i) => a?.trim() === given[i]?.trim()).length;
      score     = Math.round((correctCount / expected.length) * 100);
      isCorrect = score === 100;
      feedback  = isCorrect
        ? 'Super star! All pictures matched!'
        : score >= 60
        ? `Great job! ${correctCount}/${expected.length} correct.`
        : `You got ${correctCount}/${expected.length}. Look carefully at each picture!`;
      details   = expected.map((a, i) => ({
        label: items[i]?.picture || `Q${i+1}`, correct: a,
        given: given[i] || '', ok: a?.trim() === given[i]?.trim(),
      }));
      break;
    }
    case 'picture_choice': {
      const expected     = correct.answers;
      const given        = answer?.answers || [];
      const questions    = typeof activity.content === 'string' ? JSON.parse(activity.content)?.questions || [] : activity.content?.questions || [];
      const correctCount = expected.filter((a, i) => a?.trim() === given[i]?.trim()).length;
      score     = Math.round((correctCount / expected.length) * 100);
      isCorrect = score === 100;
      feedback  = isCorrect
        ? 'Excellent! You chose every correct picture!'
        : score >= 60
        ? `Nice work! ${correctCount}/${expected.length} pictures correct.`
        : `You got ${correctCount}/${expected.length}. Read each question carefully!`;
      details   = expected.map((a, i) => {
        const q           = questions[i];
        const correct_opt = q?.options?.find(o => o.emoji === a);
        const given_opt   = q?.options?.find(o => o.emoji === given[i]);
        return {
          label: `Q${i+1}`, correct: `${a} ${correct_opt?.label || ''}`,
          given: given[i] ? `${given[i]} ${given_opt?.label || ''}` : '',
          ok: a?.trim() === given[i]?.trim(),
        };
      });
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

    const countRes = await client.query(
      'SELECT COUNT(*) AS cnt FROM user_progress WHERE user_id=$1 AND completed=TRUE',
      [userId]
    );
    const completedCount = parseInt(countRes.rows[0]?.cnt || 0);

    const perfectRes = await client.query(
      'SELECT COUNT(*) AS cnt FROM user_progress WHERE user_id=$1 AND score=100',
      [userId]
    );
    const perfectCount = parseInt(perfectRes.rows[0]?.cnt || 0);

    const checks = [
      { key: 'first_star',   cond: () => true,                    title: 'First Star',       icon: '⭐' },
      { key: 'xp_100',       cond: () => user.xp >= 100,          title: 'Century Club',     icon: '💯' },
      { key: 'xp_500',       cond: () => user.xp >= 500,          title: 'XP Legend',        icon: '🌟' },
      { key: 'xp_1000',      cond: () => user.xp >= 1000,         title: 'XP Master',        icon: '🏅' },
      { key: 'level_3',      cond: () => user.level >= 3,         title: 'Rising Reader',    icon: '📖' },
      { key: 'level_5',      cond: () => user.level >= 5,         title: 'Word Wizard',      icon: '🧙' },
      { key: 'level_10',     cond: () => user.level >= 10,        title: 'Reading Champion', icon: '🏆' },
      { key: 'level_20',     cond: () => user.level >= 20,        title: 'Scholar',          icon: '🎓' },
      { key: 'streak_3',     cond: () => user.streak >= 3,        title: 'Consistent!',      icon: '📅' },
      { key: 'five_streak',  cond: () => user.streak >= 5,        title: 'On Fire!',         icon: '🔥' },
      { key: 'streak_7',     cond: () => user.streak >= 7,        title: 'Weekly Warrior',   icon: '⚡' },
      { key: 'ten_streak',   cond: () => user.streak >= 10,       title: 'Unstoppable',      icon: '💪' },
      { key: 'complete_5',   cond: () => completedCount >= 5,     title: 'Getting Started',  icon: '✅' },
      { key: 'complete_10',  cond: () => completedCount >= 10,    title: 'On a Roll',        icon: '🎯' },
      { key: 'complete_25',  cond: () => completedCount >= 25,    title: 'Dedicated Learner',icon: '📚' },
      { key: 'completionist',cond: () => completedCount >= 48,    title: 'Completionist',    icon: '🌈' },
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

// ── Export ACHIEVEMENT_CHARACTER_UNLOCKS for use by other modules ─
const ACHIEVEMENT_CHARACTER_UNLOCKS = {
  first_star:    ['char_common_blue'],
  complete_5:    ['char_common_dalmatian'],
  xp_100:        ['char_uncommon_greenglass'],
  level_3:       ['char_uncommon_student'],
  five_streak:   ['char_uncommon_hero'],
  complete_10:   ['char_uncommon_ranger'],
  xp_500:        ['char_rare_painter'],
  complete_25:   ['char_rare_baker'],
  ten_streak:    ['char_rare_bluebonnet'],
  level_10:      ['char_rare_guitar'],
  completionist: ['char_mythic_shadowmonarch'],
  xp_1000:       ['char_mythic_sunarmor'],
};

module.exports = router;
module.exports.ACHIEVEMENT_CHARACTER_UNLOCKS = ACHIEVEMENT_CHARACTER_UNLOCKS;
