require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Database Pool ─────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Make pool available globally for routes
global.dbPool = pool;

// ── Auto Migration + Seed on Startup ─────────────────────────
async function setupDatabase() {
  const client = await pool.connect();
  try {
    console.log('[DB] Running migrations...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        achievements JSONB DEFAULT '[]',
        avatar VARCHAR(50) DEFAULT 'star',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        difficulty VARCHAR(20) DEFAULT 'easy',
        content JSONB NOT NULL,
        correct_answer JSONB NOT NULL,
        xp_reward INTEGER DEFAULT 10,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
        score INTEGER DEFAULT 0,
        attempts INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        feedback TEXT,
        last_played TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, activity_id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        text_size VARCHAR(20) DEFAULT 'medium',
        theme VARCHAR(20) DEFAULT 'light',
        tts_enabled BOOLEAN DEFAULT TRUE,
        tts_voice VARCHAR(100) DEFAULT '',
        tts_rate FLOAT DEFAULT 0.9,
        tts_pitch FLOAT DEFAULT 1.0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        key VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(10) NOT NULL,
        condition JSONB NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_progress_activity_id ON user_progress(activity_id);
      CREATE INDEX IF NOT EXISTS idx_activities_difficulty ON activities(difficulty);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    console.log('[DB] ✅ Tables ready');

    // ── Seed Achievements ────────────────────────────────────
    const achievements = [
      { key: 'first_star',  title: 'First Star!',       description: 'Complete your first activity',   icon: '⭐', condition: { type: 'activity_count', threshold: 1 } },
      { key: 'five_streak', title: 'On Fire!',          description: 'Get 5 correct answers in a row', icon: '🔥', condition: { type: 'streak', threshold: 5 } },
      { key: 'level_5',     title: 'Word Wizard',       description: 'Reach Level 5',                  icon: '🧙', condition: { type: 'level', threshold: 5 } },
      { key: 'level_10',    title: 'Reading Champion',  description: 'Reach Level 10',                 icon: '🏆', condition: { type: 'level', threshold: 10 } },
      { key: 'xp_100',      title: 'Century Club',      description: 'Earn 100 XP',                    icon: '💯', condition: { type: 'xp', threshold: 100 } },
      { key: 'xp_500',      title: 'XP Legend',         description: 'Earn 500 XP',                    icon: '🌟', condition: { type: 'xp', threshold: 500 } },
      { key: 'perfect_3',   title: 'Perfectionist',     description: 'Get 3 perfect scores in a row',  icon: '💎', condition: { type: 'perfect_streak', threshold: 3 } },
      { key: 'night_owl',   title: 'Night Owl',         description: 'Play 5 activities after 8 PM',   icon: '🦉', condition: { type: 'night_sessions', threshold: 5 } },
    ];

    for (const a of achievements) {
      await client.query(
        `INSERT INTO achievements (key, title, description, icon, condition)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (key) DO NOTHING`,
        [a.key, a.title, a.description, a.icon, JSON.stringify(a.condition)]
      );
    }

    // ── Seed Activities ──────────────────────────────────────
    const activities = [
      {
        title: 'Animals & Their Sounds',
        description: 'Match each animal to the sound it makes!',
        type: 'word_match', difficulty: 'easy', xp_reward: 10,
        content: {
          instruction: 'Drag each animal name to its matching sound!',
          pairs: [
            { left: '🐶 Dog', right: 'Woof' }, { left: '🐱 Cat', right: 'Meow' },
            { left: '🐄 Cow', right: 'Moo' },  { left: '🐸 Frog', right: 'Ribbit' },
            { left: '🐝 Bee', right: 'Buzz' },
          ],
        },
        correct_answer: { '🐶 Dog': 'Woof', '🐱 Cat': 'Meow', '🐄 Cow': 'Moo', '🐸 Frog': 'Ribbit', '🐝 Bee': 'Buzz' },
      },
      {
        title: 'The Hungry Caterpillar',
        description: 'Fill in the missing words from this classic story!',
        type: 'fill_blank', difficulty: 'easy', xp_reward: 15,
        content: {
          instruction: 'Pick the right word to complete each sentence!',
          sentences: [
            { text: 'The caterpillar was very ___.', options: ['hungry','tired','cold','fast'], answer: 'hungry' },
            { text: 'On Monday he ate through one ___.', options: ['orange','apple','banana','pear'], answer: 'apple' },
            { text: 'He felt much ___ after eating.', options: ['better','worse','sleepy','full'], answer: 'better' },
            { text: 'The caterpillar built a ___ around himself.', options: ['cocoon','shell','nest','web'], answer: 'cocoon' },
            { text: 'Finally, he became a beautiful ___.', options: ['butterfly','bird','beetle','bee'], answer: 'butterfly' },
          ],
        },
        correct_answer: { answers: ['hungry','apple','better','cocoon','butterfly'] },
      },
      {
        title: 'Build a Story!',
        description: 'Put these sentences in the right order to make a story.',
        type: 'sentence_sort', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Drag the sentences into the correct order!',
          sentences: [
            'Sam woke up early in the morning.',
            'Outside, big dark clouds filled the sky.',
            'She put on her raincoat and boots.',
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
      {
        title: 'Opposite Words',
        description: 'Match each word to its opposite!',
        type: 'word_match', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Match each word on the left to its opposite on the right!',
          pairs: [
            { left: 'Hot', right: 'Cold' }, { left: 'Fast', right: 'Slow' },
            { left: 'Big', right: 'Small' }, { left: 'Happy', right: 'Sad' },
            { left: 'Light', right: 'Dark' }, { left: 'Up', right: 'Down' },
          ],
        },
        correct_answer: { Hot: 'Cold', Fast: 'Slow', Big: 'Small', Happy: 'Sad', Light: 'Dark', Up: 'Down' },
      },
      {
        title: 'Weather Words',
        description: 'Complete the sentences about different kinds of weather!',
        type: 'fill_blank', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Choose the best word to complete each sentence!',
          sentences: [
            { text: 'When it rains and is sunny, you might see a ___.', options: ['rainbow','tornado','blizzard','fog'], answer: 'rainbow' },
            { text: 'A ___ is a very strong, spinning column of wind.', options: ['tornado','breeze','drizzle','sleet'], answer: 'tornado' },
            { text: 'Snow that falls heavily and blows strongly is a ___.', options: ['blizzard','drizzle','shower','hail'], answer: 'blizzard' },
            { text: 'Tiny drops of water that float in the air are called ___.', options: ['fog','steam','smoke','cloud'], answer: 'fog' },
            { text: '___ is frozen rain that falls as balls of ice.', options: ['Hail','Sleet','Snow','Frost'], answer: 'Hail' },
          ],
        },
        correct_answer: { answers: ['rainbow','tornado','blizzard','fog','Hail'] },
      },
      {
        title: 'The Ocean Explorer',
        description: 'Read the passage and fill in the missing words!',
        type: 'fill_blank', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Read carefully and pick the correct word for each blank!',
          sentences: [
            { text: 'The ocean covers more than ___ of the Earth\'s surface.', options: ['70%','50%','30%','90%'], answer: '70%' },
            { text: 'The deepest part is called the Mariana ___.', options: ['Trench','Ridge','Basin','Valley'], answer: 'Trench' },
            { text: 'Oceans are home to millions of ___.', options: ['species','people','plants','rocks'], answer: 'species' },
            { text: 'Many deep-sea creatures have never been ___.', options: ['discovered','eaten','named','counted'], answer: 'discovered' },
            { text: 'Oceans help ___ the Earth\'s temperature.', options: ['regulate','raise','lower','measure'], answer: 'regulate' },
          ],
        },
        correct_answer: { answers: ['70%','Trench','species','discovered','regulate'] },
      },
      {
        title: 'The Life of a Star',
        description: 'Arrange the stages of a star\'s life in the correct order!',
        type: 'sentence_sort', difficulty: 'hard', xp_reward: 35,
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
      {
        title: 'What Do You See? 🌈',
        description: 'Look at each emoji and pick the correct word!',
        type: 'picture_word', difficulty: 'easy', xp_reward: 10,
        content: {
          instruction: 'What word matches each picture? Tap the right answer!',
          items: [
            { picture: '🌞', options: ['Sun','Moon','Star','Cloud'], answer: 'Sun' },
            { picture: '🌊', options: ['River','Lake','Ocean','Pond'], answer: 'Ocean' },
            { picture: '🌈', options: ['Rainbow','Sunset','Storm','Cloud'], answer: 'Rainbow' },
            { picture: '🦁', options: ['Tiger','Lion','Bear','Wolf'], answer: 'Lion' },
            { picture: '🍎', options: ['Pear','Plum','Apple','Peach'], answer: 'Apple' },
            { picture: '🚀', options: ['Plane','Rocket','Balloon','Kite'], answer: 'Rocket' },
          ],
        },
        correct_answer: { answers: ['Sun','Ocean','Rainbow','Lion','Apple','Rocket'] },
      },
    ];

    for (const act of activities) {
      await client.query(
        `INSERT INTO activities (title, description, type, difficulty, content, correct_answer, xp_reward)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [act.title, act.description, act.type, act.difficulty,
         JSON.stringify(act.content), JSON.stringify(act.correct_answer), act.xp_reward]
      );
    }

    console.log('[DB] ✅ Seed data ready');
  } catch (err) {
    console.error('[DB] Setup error:', err.message);
  } finally {
    client.release();
  }
}

// ── Security Middleware ───────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET','POST','PUT','DELETE','PATCH'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ReadAble API', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/progress',   require('./routes/progress'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/users',      require('./routes/users'));

// ── Error Handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Start ─────────────────────────────────────────────────────
setupDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 ReadAble API running on port ${PORT}`);
  });
});

module.exports = app;
