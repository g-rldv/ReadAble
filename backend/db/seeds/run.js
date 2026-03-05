// ============================================================
// Seed Script — populates initial activities and achievements
// Run: node db/seeds/run.js
// ============================================================
require('dotenv').config({ path: '../../.env' });
const pool = require('../index');

// ── Achievements ─────────────────────────────────────────────
const achievements = [
  { key: 'first_star',   title: 'First Star!',      description: 'Complete your first activity',     icon: '⭐', condition: { type: 'activity_count', threshold: 1 } },
  { key: 'five_streak',  title: 'On Fire!',         description: 'Get 5 correct answers in a row',   icon: '🔥', condition: { type: 'streak', threshold: 5 } },
  { key: 'level_5',      title: 'Word Wizard',      description: 'Reach Level 5',                    icon: '🧙', condition: { type: 'level', threshold: 5 } },
  { key: 'level_10',     title: 'Reading Champion', description: 'Reach Level 10',                   icon: '🏆', condition: { type: 'level', threshold: 10 } },
  { key: 'xp_100',       title: 'Century Club',     description: 'Earn 100 XP',                      icon: '💯', condition: { type: 'xp', threshold: 100 } },
  { key: 'xp_500',       title: 'XP Legend',        description: 'Earn 500 XP',                      icon: '🌟', condition: { type: 'xp', threshold: 500 } },
  { key: 'perfect_3',    title: 'Perfectionist',    description: 'Get 3 perfect scores in a row',    icon: '💎', condition: { type: 'perfect_streak', threshold: 3 } },
  { key: 'night_owl',    title: 'Night Owl',        description: 'Play 5 activities after 8 PM',     icon: '🦉', condition: { type: 'night_sessions', threshold: 5 } },
];

// ── Activities ────────────────────────────────────────────────
// Types: word_match | fill_blank | sentence_sort | picture_word
const activities = [
  // ── EASY WORD MATCH ─────────────────────────────────────
  {
    title: 'Animals & Their Sounds',
    description: 'Match each animal to the sound it makes!',
    type: 'word_match',
    difficulty: 'easy',
    xp_reward: 10,
    content: {
      instruction: 'Drag each animal name to its matching sound!',
      pairs: [
        { left: '🐶 Dog',   right: 'Woof' },
        { left: '🐱 Cat',   right: 'Meow' },
        { left: '🐄 Cow',   right: 'Moo' },
        { left: '🐸 Frog',  right: 'Ribbit' },
        { left: '🐝 Bee',   right: 'Buzz' },
      ],
    },
    correct_answer: {
      '🐶 Dog': 'Woof',
      '🐱 Cat': 'Meow',
      '🐄 Cow': 'Moo',
      '🐸 Frog': 'Ribbit',
      '🐝 Bee': 'Buzz',
    },
  },
  // ── EASY FILL IN THE BLANK ───────────────────────────────
  {
    title: 'The Hungry Caterpillar',
    description: 'Fill in the missing words from this classic story!',
    type: 'fill_blank',
    difficulty: 'easy',
    xp_reward: 15,
    content: {
      instruction: 'Pick the right word to complete each sentence!',
      sentences: [
        { text: 'The caterpillar was very ___.',         options: ['hungry', 'tired', 'cold', 'fast'],   answer: 'hungry' },
        { text: 'On Monday he ate through one ___.',     options: ['orange', 'apple', 'banana', 'pear'], answer: 'apple' },
        { text: 'He felt much ___ after eating.',        options: ['better', 'worse', 'sleepy', 'full'], answer: 'better' },
        { text: 'The caterpillar built a ___ around himself.', options: ['cocoon', 'shell', 'nest', 'web'], answer: 'cocoon' },
        { text: 'Finally, he became a beautiful ___.',   options: ['butterfly', 'bird', 'beetle', 'bee'], answer: 'butterfly' },
      ],
    },
    correct_answer: { answers: ['hungry', 'apple', 'better', 'cocoon', 'butterfly'] },
  },
  // ── MEDIUM SENTENCE SORT ─────────────────────────────────
  {
    title: 'Build a Story!',
    description: 'Put these sentences in the right order to make a story.',
    type: 'sentence_sort',
    difficulty: 'medium',
    xp_reward: 20,
    content: {
      instruction: 'Drag the sentences into the correct order!',
      sentences: [
        'Sam woke up early in the morning.',
        'She put on her raincoat and boots.',
        'Outside, big dark clouds filled the sky.',
        'Sam splashed happily in every puddle she found.',
        'When she got home, her mum made hot chocolate.',
      ],
      shuffled: [
        'She put on her raincoat and boots.',
        'Sam splashed happily in every puddle she found.',
        'Sam woke up early in the morning.',
        'When she got home, her mum made hot chocolate.',
        'Outside, big dark clouds filled the sky.',
      ],
    },
    correct_answer: {
      order: [
        'Sam woke up early in the morning.',
        'Outside, big dark clouds filled the sky.',
        'She put on her raincoat and boots.',
        'Sam splashed happily in every puddle she found.',
        'When she got home, her mum made hot chocolate.',
      ],
    },
  },
  // ── MEDIUM WORD MATCH ────────────────────────────────────
  {
    title: 'Opposite Words',
    description: 'Match each word to its opposite!',
    type: 'word_match',
    difficulty: 'medium',
    xp_reward: 20,
    content: {
      instruction: 'Match each word on the left to its opposite on the right!',
      pairs: [
        { left: 'Hot',   right: 'Cold' },
        { left: 'Fast',  right: 'Slow' },
        { left: 'Big',   right: 'Small' },
        { left: 'Happy', right: 'Sad' },
        { left: 'Light', right: 'Dark' },
        { left: 'Up',    right: 'Down' },
      ],
    },
    correct_answer: { Hot: 'Cold', Fast: 'Slow', Big: 'Small', Happy: 'Sad', Light: 'Dark', Up: 'Down' },
  },
  // ── MEDIUM FILL IN THE BLANK ─────────────────────────────
  {
    title: 'Weather Words',
    description: 'Complete the sentences about different kinds of weather!',
    type: 'fill_blank',
    difficulty: 'medium',
    xp_reward: 20,
    content: {
      instruction: 'Choose the best word to complete each sentence!',
      sentences: [
        { text: 'When it rains and is sunny, you might see a ___.',          options: ['rainbow', 'tornado', 'blizzard', 'fog'], answer: 'rainbow' },
        { text: 'A ___ is a very strong, spinning column of wind.',          options: ['tornado', 'breeze', 'drizzle', 'sleet'], answer: 'tornado' },
        { text: 'Snow that falls heavily and blows strongly is a ___.',      options: ['blizzard', 'drizzle', 'shower', 'hail'], answer: 'blizzard' },
        { text: 'Tiny drops of water that float in the air are called ___.',  options: ['fog', 'steam', 'smoke', 'cloud'], answer: 'fog' },
        { text: '___ is frozen rain that falls as balls of ice.',             options: ['Hail', 'Sleet', 'Snow', 'Frost'], answer: 'Hail' },
      ],
    },
    correct_answer: { answers: ['rainbow', 'tornado', 'blizzard', 'fog', 'Hail'] },
  },
  // ── HARD FILL IN THE BLANK ───────────────────────────────
  {
    title: 'The Ocean Explorer',
    description: 'Read the passage and fill in the missing words!',
    type: 'fill_blank',
    difficulty: 'hard',
    xp_reward: 30,
    content: {
      instruction: 'Read carefully and pick the correct word for each blank!',
      passage: 'The ocean covers more than ___ of Earth\'s surface. The deepest part, called the Mariana ___, is over 11 kilometres deep. Oceans are home to millions of ___ including fish, whales, and tiny plankton. Scientists believe there are many creatures in the deep ocean that have never been ___. Oceans also help ___ the Earth\'s temperature by absorbing heat from the sun.',
      sentences: [
        { text: 'The ocean covers more than ___ of Earth\'s surface.',         options: ['70%', '50%', '30%', '90%'],                answer: '70%' },
        { text: 'The deepest part, called the Mariana ___.',                   options: ['Trench', 'Ridge', 'Basin', 'Valley'],       answer: 'Trench' },
        { text: 'Oceans are home to millions of ___.',                         options: ['species', 'people', 'plants', 'rocks'],     answer: 'species' },
        { text: '...creatures that have never been ___.',                      options: ['discovered', 'eaten', 'named', 'counted'],  answer: 'discovered' },
        { text: 'Oceans also help ___ the Earth\'s temperature.',              options: ['regulate', 'raise', 'lower', 'measure'],    answer: 'regulate' },
      ],
    },
    correct_answer: { answers: ['70%', 'Trench', 'species', 'discovered', 'regulate'] },
  },
  // ── HARD SENTENCE SORT ───────────────────────────────────
  {
    title: 'The Life of a Star',
    description: 'Arrange the stages of a star\'s life in the correct scientific order!',
    type: 'sentence_sort',
    difficulty: 'hard',
    xp_reward: 35,
    content: {
      instruction: 'Put the stages of a star\'s life cycle in the correct order!',
      sentences: [
        'A cloud of gas and dust called a nebula begins to collapse under gravity.',
        'A protostar forms as the cloud heats up and begins to spin.',
        'Nuclear fusion ignites and the star enters its main sequence phase.',
        'The star expands into a red giant as it runs out of hydrogen fuel.',
        'The outer layers are expelled, leaving behind a dense white dwarf.',
      ],
      shuffled: [
        'The outer layers are expelled, leaving behind a dense white dwarf.',
        'A protostar forms as the cloud heats up and begins to spin.',
        'The star expands into a red giant as it runs out of hydrogen fuel.',
        'A cloud of gas and dust called a nebula begins to collapse under gravity.',
        'Nuclear fusion ignites and the star enters its main sequence phase.',
      ],
    },
    correct_answer: {
      order: [
        'A cloud of gas and dust called a nebula begins to collapse under gravity.',
        'A protostar forms as the cloud heats up and begins to spin.',
        'Nuclear fusion ignites and the star enters its main sequence phase.',
        'The star expands into a red giant as it runs out of hydrogen fuel.',
        'The outer layers are expelled, leaving behind a dense white dwarf.',
      ],
    },
  },
  // ── EASY PICTURE WORD ────────────────────────────────────
  {
    title: 'What Do You See? 🌈',
    description: 'Look at each emoji and pick the correct word!',
    type: 'picture_word',
    difficulty: 'easy',
    xp_reward: 10,
    content: {
      instruction: 'What word matches each picture? Tap the right answer!',
      items: [
        { picture: '🌞', options: ['Sun', 'Moon', 'Star', 'Cloud'], answer: 'Sun' },
        { picture: '🌊', options: ['River', 'Lake', 'Ocean', 'Pond'], answer: 'Ocean' },
        { picture: '🌈', options: ['Rainbow', 'Sunset', 'Storm', 'Cloud'], answer: 'Rainbow' },
        { picture: '🦁', options: ['Tiger', 'Lion', 'Bear', 'Wolf'], answer: 'Lion' },
        { picture: '🍎', options: ['Pear', 'Plum', 'Apple', 'Peach'], answer: 'Apple' },
        { picture: '🚀', options: ['Plane', 'Rocket', 'Balloon', 'Kite'], answer: 'Rocket' },
      ],
    },
    correct_answer: { answers: ['Sun', 'Ocean', 'Rainbow', 'Lion', 'Apple', 'Rocket'] },
  },
];

async function runSeeds() {
  const client = await pool.connect();
  try {
    console.log('[Seed] Inserting achievements...');
    for (const ach of achievements) {
      await client.query(
        `INSERT INTO achievements (key, title, description, icon, condition)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (key) DO UPDATE SET title=$2, description=$3, icon=$4, condition=$5`,
        [ach.key, ach.title, ach.description, ach.icon, JSON.stringify(ach.condition)]
      );
    }
    console.log(`[Seed] ✅ ${achievements.length} achievements inserted`);

    console.log('[Seed] Inserting activities...');
    for (const act of activities) {
      await client.query(
        `INSERT INTO activities (title, description, type, difficulty, content, correct_answer, xp_reward)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [act.title, act.description, act.type, act.difficulty,
         JSON.stringify(act.content), JSON.stringify(act.correct_answer), act.xp_reward]
      );
    }
    console.log(`[Seed] ✅ ${activities.length} activities inserted`);
    console.log('[Seed] 🎉 Seeding complete!');
  } catch (err) {
    console.error('[Seed] ❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeds().catch((err) => {
  console.error(err);
  process.exit(1);
});
