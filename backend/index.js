require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool }  = require('pg');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Database Pool ─────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ── Migrations + Seed ─────────────────────────────────────────
async function setupDatabase() {
  const client = await pool.connect();
  try {
    console.log('[DB] Running migrations…');

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

      CREATE INDEX IF NOT EXISTS idx_user_progress_user_id    ON user_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_progress_activity_id ON user_progress(activity_id);
      CREATE INDEX IF NOT EXISTS idx_activities_difficulty     ON activities(difficulty);
      CREATE INDEX IF NOT EXISTS idx_users_email               ON users(email);
    `);

    console.log('[DB] ✅ Tables ready');

    // ── Achievements ─────────────────────────────────────────
    const achievements = [
      { key: 'first_star',  title: 'First Star!',      description: 'Complete your first activity',   icon: '⭐', condition: { type: 'activity_count', threshold: 1  } },
      { key: 'five_streak', title: 'On Fire!',         description: 'Get 5 correct in a row',         icon: '🔥', condition: { type: 'streak',         threshold: 5  } },
      { key: 'level_5',     title: 'Word Wizard',      description: 'Reach Level 5',                  icon: '🧙', condition: { type: 'level',          threshold: 5  } },
      { key: 'level_10',    title: 'Reading Champion', description: 'Reach Level 10',                 icon: '🏆', condition: { type: 'level',          threshold: 10 } },
      { key: 'xp_100',      title: 'Century Club',     description: 'Earn 100 XP',                    icon: '💯', condition: { type: 'xp',             threshold: 100} },
      { key: 'xp_500',      title: 'XP Legend',        description: 'Earn 500 XP',                    icon: '🌟', condition: { type: 'xp',             threshold: 500} },
      { key: 'perfect_3',   title: 'Perfectionist',    description: 'Get 3 perfect scores in a row',  icon: '💎', condition: { type: 'perfect_streak',  threshold: 3  } },
      { key: 'night_owl',   title: 'Night Owl',        description: 'Play 5 activities after 8 PM',   icon: '🦉', condition: { type: 'night_sessions',  threshold: 5  } },
    ];
    for (const a of achievements) {
      await client.query(
        `INSERT INTO achievements (key, title, description, icon, condition)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (key) DO NOTHING`,
        [a.key, a.title, a.description, a.icon, JSON.stringify(a.condition)]
      );
    }

    // ── Activities — 3 per game type, genuinely different ────
    // Ordered: word_match (easy, medium, hard)
    //          fill_blank (easy, medium, hard)
    //          sentence_sort (easy, medium, hard)
    //          picture_word (easy, medium, hard)
    const activities = [

      // ── WORD MATCH ─────────────────────────────────────────

      // WM-1 | easy | Animals & Their Sounds
      {
        title: 'Animals & Their Sounds',
        description: 'Match each animal to the sound it makes.',
        type: 'word_match', difficulty: 'easy', xp_reward: 10,
        content: {
          instruction: 'Match each animal on the left to its sound on the right.',
          pairs: [
            { left: 'Dog',   right: 'Woof'   },
            { left: 'Cat',   right: 'Meow'   },
            { left: 'Cow',   right: 'Moo'    },
            { left: 'Frog',  right: 'Ribbit' },
            { left: 'Bee',   right: 'Buzz'   },
          ],
        },
        correct_answer: { Dog: 'Woof', Cat: 'Meow', Cow: 'Moo', Frog: 'Ribbit', Bee: 'Buzz' },
      },

      // WM-2 | medium | Opposites
      {
        title: 'Opposite Words',
        description: 'Match each word to its exact opposite.',
        type: 'word_match', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Drag each word on the left to its opposite on the right.',
          pairs: [
            { left: 'Hot',    right: 'Cold'  },
            { left: 'Fast',   right: 'Slow'  },
            { left: 'Big',    right: 'Small' },
            { left: 'Happy',  right: 'Sad'   },
            { left: 'Light',  right: 'Dark'  },
            { left: 'Up',     right: 'Down'  },
          ],
        },
        correct_answer: { Hot: 'Cold', Fast: 'Slow', Big: 'Small', Happy: 'Sad', Light: 'Dark', Up: 'Down' },
      },

      // WM-3 | hard | Body Parts & Their Jobs
      {
        title: 'Body Parts & Their Jobs',
        description: 'Match each body part to what it does.',
        type: 'word_match', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Match each body part on the left to its function on the right.',
          pairs: [
            { left: 'Heart',   right: 'Pumps blood'       },
            { left: 'Lungs',   right: 'Breathe air'       },
            { left: 'Brain',   right: 'Controls thinking' },
            { left: 'Stomach', right: 'Digests food'      },
            { left: 'Eyes',    right: 'See things'        },
            { left: 'Ears',    right: 'Hear sounds'       },
          ],
        },
        correct_answer: {
          Heart:   'Pumps blood',
          Lungs:   'Breathe air',
          Brain:   'Controls thinking',
          Stomach: 'Digests food',
          Eyes:    'See things',
          Ears:    'Hear sounds',
        },
      },

      // ── FILL IN THE BLANK ───────────────────────────────────

      // FB-1 | easy | The Hungry Caterpillar
      {
        title: 'The Hungry Caterpillar',
        description: 'Fill in the missing words from this classic story.',
        type: 'fill_blank', difficulty: 'easy', xp_reward: 15,
        content: {
          instruction: 'Pick the right word to fill each blank.',
          sentences: [
            { text: 'The caterpillar was very ___.', options: ['hungry','tired','cold','fast'], answer: 'hungry' },
            { text: 'On Monday he ate through one ___.', options: ['apple','orange','banana','pear'], answer: 'apple' },
            { text: 'He felt much ___ after eating.', options: ['better','worse','sleepy','full'], answer: 'better' },
            { text: 'The caterpillar built a ___ around himself.', options: ['cocoon','shell','nest','web'], answer: 'cocoon' },
            { text: 'Finally he became a beautiful ___.', options: ['butterfly','bird','beetle','bee'], answer: 'butterfly' },
          ],
        },
        correct_answer: { answers: ['hungry', 'apple', 'better', 'cocoon', 'butterfly'] },
      },

      // FB-2 | medium | Weather Words
      {
        title: 'Weather Words',
        description: 'Complete sentences about different kinds of weather.',
        type: 'fill_blank', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Choose the best word to complete each weather sentence.',
          sentences: [
            { text: 'When it rains and is sunny you might see a ___.', options: ['rainbow','tornado','blizzard','fog'], answer: 'rainbow' },
            { text: 'A ___ is a very strong spinning column of wind.', options: ['tornado','breeze','drizzle','sleet'], answer: 'tornado' },
            { text: 'Snow that falls heavily and blows strongly is a ___.', options: ['blizzard','drizzle','shower','hail'], answer: 'blizzard' },
            { text: 'Tiny drops of water floating in the air are called ___.', options: ['fog','steam','smoke','cloud'], answer: 'fog' },
            { text: '___ is frozen rain that falls as small balls of ice.', options: ['Hail','Sleet','Snow','Frost'], answer: 'Hail' },
          ],
        },
        correct_answer: { answers: ['rainbow', 'tornado', 'blizzard', 'fog', 'Hail'] },
      },

      // FB-3 | hard | The Ocean Explorer
      {
        title: 'The Ocean Explorer',
        description: 'Read carefully and fill in the ocean science facts.',
        type: 'fill_blank', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Pick the correct word to complete each ocean fact.',
          sentences: [
            { text: 'The ocean covers more than ___ of Earth\'s surface.', options: ['70%','50%','30%','90%'], answer: '70%' },
            { text: 'The deepest part of the ocean is the Mariana ___.', options: ['Trench','Ridge','Basin','Valley'], answer: 'Trench' },
            { text: 'Oceans are home to millions of different ___.', options: ['species','people','plants','rocks'], answer: 'species' },
            { text: 'Many deep-sea creatures have never been ___.', options: ['discovered','eaten','named','counted'], answer: 'discovered' },
            { text: 'Oceans help ___ the temperature of the Earth.', options: ['regulate','raise','lower','measure'], answer: 'regulate' },
          ],
        },
        correct_answer: { answers: ['70%', 'Trench', 'species', 'discovered', 'regulate'] },
      },

      // ── SENTENCE SORT ───────────────────────────────────────

      // SS-1 | easy | Making a Sandwich
      {
        title: 'Making a Sandwich',
        description: 'Put the steps for making a sandwich in the right order.',
        type: 'sentence_sort', difficulty: 'easy', xp_reward: 15,
        content: {
          instruction: 'Drag the steps into the correct order to make a sandwich.',
          sentences: [
            'Get two slices of bread from the bag.',
            'Spread butter on one side of each slice.',
            'Place your filling — like cheese or ham — on one slice.',
            'Press the two slices together.',
            'Cut the sandwich in half and enjoy!',
          ],
          shuffled: [
            'Press the two slices together.',
            'Get two slices of bread from the bag.',
            'Cut the sandwich in half and enjoy!',
            'Spread butter on one side of each slice.',
            'Place your filling — like cheese or ham — on one slice.',
          ],
        },
        correct_answer: {
          order: [
            'Get two slices of bread from the bag.',
            'Spread butter on one side of each slice.',
            'Place your filling — like cheese or ham — on one slice.',
            'Press the two slices together.',
            'Cut the sandwich in half and enjoy!',
          ],
        },
      },

      // SS-2 | medium | Sam's Rainy Day
      {
        title: "Sam's Rainy Day",
        description: 'Put these story sentences in the right order.',
        type: 'sentence_sort', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Drag the sentences to tell the story in the right order.',
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

      // SS-3 | hard | Life of a Star
      {
        title: 'Life of a Star',
        description: "Arrange the stages of a star's life cycle in the correct order.",
        type: 'sentence_sort', difficulty: 'hard', xp_reward: 35,
        content: {
          instruction: "Put the stages of a star's life cycle in the correct scientific order.",
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

      // ── PICTURE & WORD ──────────────────────────────────────

      // PW-1 | easy | What Do You See?
      {
        title: 'What Do You See?',
        description: 'Look at each picture and pick the correct word.',
        type: 'picture_word', difficulty: 'easy', xp_reward: 10,
        content: {
          instruction: 'Tap the word that matches each picture.',
          items: [
            { picture: '🌞', options: ['Sun',     'Moon',   'Star',      'Cloud'  ], answer: 'Sun'      },
            { picture: '🌊', options: ['River',   'Lake',   'Ocean',     'Pond'   ], answer: 'Ocean'    },
            { picture: '🌈', options: ['Rainbow', 'Sunset', 'Storm',     'Cloud'  ], answer: 'Rainbow'  },
            { picture: '🦁', options: ['Tiger',   'Lion',   'Bear',      'Wolf'   ], answer: 'Lion'     },
            { picture: '🍎', options: ['Pear',    'Plum',   'Apple',     'Peach'  ], answer: 'Apple'    },
            { picture: '🚀', options: ['Plane',   'Rocket', 'Balloon',   'Kite'   ], answer: 'Rocket'   },
          ],
        },
        correct_answer: { answers: ['Sun', 'Ocean', 'Rainbow', 'Lion', 'Apple', 'Rocket'] },
      },

      // PW-2 | medium | Action Words
      {
        title: 'Action Words',
        description: "Look at each picture and choose the action it shows.",
        type: 'picture_word', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Choose the action word that best matches each picture.',
          items: [
            { picture: '🏃', options: ['Walking',  'Running',  'Jumping',  'Sleeping' ], answer: 'Running'  },
            { picture: '💃', options: ['Singing',  'Dancing',  'Drawing',  'Reading'  ], answer: 'Dancing'  },
            { picture: '🤸', options: ['Tumbling', 'Jumping',  'Swimming', 'Climbing' ], answer: 'Jumping'  },
            { picture: '😴', options: ['Resting',  'Thinking', 'Sleeping', 'Waiting'  ], answer: 'Sleeping' },
            { picture: '🍳', options: ['Eating',   'Cooking',  'Baking',   'Grilling' ], answer: 'Cooking'  },
            { picture: '📖', options: ['Writing',  'Drawing',  'Reading',  'Learning' ], answer: 'Reading'  },
          ],
        },
        correct_answer: { answers: ['Running', 'Dancing', 'Jumping', 'Sleeping', 'Cooking', 'Reading'] },
      },

      // PW-3 | hard | Science & Nature
      {
        title: 'Science & Nature',
        description: 'Match each nature symbol to the correct scientific term.',
        type: 'picture_word', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Pick the correct scientific word for each picture.',
          items: [
            { picture: '🌋', options: ['Earthquake',  'Volcano',    'Geyser',    'Crater'    ], answer: 'Volcano'    },
            { picture: '⚡', options: ['Thunder',     'Lightning',  'Static',    'Energy'    ], answer: 'Lightning'  },
            { picture: '🔭', options: ['Microscope',  'Periscope',  'Telescope', 'Binoculars'], answer: 'Telescope'  },
            { picture: '🧲', options: ['Battery',     'Conductor',  'Magnet',    'Circuit'   ], answer: 'Magnet'     },
            { picture: '🌡️', options: ['Barometer',   'Thermometer','Compass',   'Scale'     ], answer: 'Thermometer'},
            { picture: '🦠', options: ['Cell',        'Virus',      'Bacteria',  'Microbe'   ], answer: 'Bacteria'   },
          ],
        },
        correct_answer: { answers: ['Volcano', 'Lightning', 'Telescope', 'Magnet', 'Thermometer', 'Bacteria'] },
      },

    ]; // end activities

    // Clear old seed data and reinsert so changes take effect on redeploy
    await client.query(`DELETE FROM user_progress`);
    await client.query(`DELETE FROM activities`);
    for (const act of activities) {
      await client.query(
        `INSERT INTO activities (title, description, type, difficulty, content, correct_answer, xp_reward)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [act.title, act.description, act.type, act.difficulty,
         JSON.stringify(act.content), JSON.stringify(act.correct_answer), act.xp_reward]
      );
    }

    console.log(`[DB] ✅ ${activities.length} activities seeded`);
  } catch (err) {
    console.error('[DB] Setup error:', err.message);
  } finally {
    client.release();
  }
}

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health ────────────────────────────────────────────────────
app.get('/health', (_, res) =>
  res.json({ status: 'ok', service: 'ReadAble API', timestamp: new Date().toISOString() })
);

// ── Routes ────────────────────────────────────────────────────
const { settingsRouter, usersRouter } = require('./routes/settings');
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/progress',   require('./routes/progress'));
app.use('/api/settings',   settingsRouter);
app.use('/api/users',      usersRouter);

// ── Error handlers ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Start ─────────────────────────────────────────────────────
setupDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 ReadAble API on port ${PORT}`);
    console.log(`   Origins: ${allowedOrigins.join(', ')}`);
  });
});

module.exports = app;
