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
      CREATE INDEX IF NOT EXISTS idx_up_user     ON user_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_up_activity ON user_progress(activity_id);
      CREATE INDEX IF NOT EXISTS idx_act_diff    ON activities(difficulty);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    console.log('[DB] ✅ Tables ready');

    // ── Achievements ─────────────────────────────────────────
    const achievements = [
      { key: 'first_star',  title: 'First Star!',      description: 'Complete your first activity',  icon: '⭐', condition: { type: 'activity_count', threshold: 1   } },
      { key: 'five_streak', title: 'On Fire!',         description: 'Get 5 correct in a row',        icon: '🔥', condition: { type: 'streak',         threshold: 5   } },
      { key: 'level_5',     title: 'Word Wizard',      description: 'Reach Level 5',                 icon: '🧙', condition: { type: 'level',          threshold: 5   } },
      { key: 'level_10',    title: 'Reading Champion', description: 'Reach Level 10',                icon: '🏆', condition: { type: 'level',          threshold: 10  } },
      { key: 'xp_100',      title: 'Century Club',     description: 'Earn 100 XP',                   icon: '💯', condition: { type: 'xp',             threshold: 100 } },
      { key: 'xp_500',      title: 'XP Legend',        description: 'Earn 500 XP',                   icon: '🌟', condition: { type: 'xp',             threshold: 500 } },
      { key: 'perfect_3',   title: 'Perfectionist',    description: 'Get 3 perfect scores in a row', icon: '💎', condition: { type: 'perfect_streak',  threshold: 3   } },
      { key: 'night_owl',   title: 'Night Owl',        description: 'Play 5 activities after 8 PM',  icon: '🦉', condition: { type: 'night_sessions',  threshold: 5   } },
    ];
    for (const a of achievements) {
      await client.query(
        `INSERT INTO achievements (key,title,description,icon,condition) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (key) DO NOTHING`,
        [a.key, a.title, a.description, a.icon, JSON.stringify(a.condition)]
      );
    }

    // ── 48 Activities — 4 per difficulty per type ────────────
    // Layout: word_match ×12, fill_blank ×12, sentence_sort ×12, picture_word ×12
    // Each block: 4 easy, 4 medium, 4 hard
    const activities = [

      // ════════════════════════════════════════════════════════
      // WORD MATCH
      // ════════════════════════════════════════════════════════

      // ── Easy ───────────────────────────────────────────────

      {
        title: 'Animals & Their Sounds',
        description: 'Match each animal to the sound it makes.',
        type: 'word_match', difficulty: 'easy', xp_reward: 10,
        content: {
          instruction: 'Match each animal on the left to its sound on the right.',
          pairs: [
            { left: 'Dog',  right: 'Woof'   },
            { left: 'Cat',  right: 'Meow'   },
            { left: 'Cow',  right: 'Moo'    },
            { left: 'Frog', right: 'Ribbit' },
            { left: 'Bee',  right: 'Buzz'   },
          ],
        },
        correct_answer: { Dog: 'Woof', Cat: 'Meow', Cow: 'Moo', Frog: 'Ribbit', Bee: 'Buzz' },
      },

      {
        title: 'Colours & Objects',
        description: 'Match each object to the colour we usually see it in.',
        type: 'word_match', difficulty: 'easy', xp_reward: 10,
        content: {
          instruction: 'Match each object to the colour it is usually associated with.',
          pairs: [
            { left: 'Sky',      right: 'Blue'   },
            { left: 'Grass',    right: 'Green'  },
            { left: 'Sun',      right: 'Yellow' },
            { left: 'Fire',     right: 'Red'    },
            { left: 'Elephant', right: 'Grey'   },
          ],
        },
        correct_answer: { Sky: 'Blue', Grass: 'Green', Sun: 'Yellow', Fire: 'Red', Elephant: 'Grey' },
      },

      {
        title: 'Numbers & Words',
        description: 'Match each numeral to the word that spells it out.',
        type: 'word_match', difficulty: 'easy', xp_reward: 10,
        content: {
          instruction: 'Match each number on the left to its written word on the right.',
          pairs: [
            { left: '1', right: 'One'   },
            { left: '2', right: 'Two'   },
            { left: '3', right: 'Three' },
            { left: '4', right: 'Four'  },
            { left: '5', right: 'Five'  },
          ],
        },
        correct_answer: { '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five' },
      },

      {
        title: 'Fruits & Their Colours',
        description: 'Match each fruit to the colour it is when ripe.',
        type: 'word_match', difficulty: 'easy', xp_reward: 10,
        content: {
          instruction: 'Match each fruit on the left to its colour when ripe on the right.',
          pairs: [
            { left: 'Apple',      right: 'Red'    },
            { left: 'Banana',     right: 'Yellow' },
            { left: 'Grapes',     right: 'Purple' },
            { left: 'Lime',       right: 'Green'  },
            { left: 'Tangerine',  right: 'Orange' },
          ],
        },
        correct_answer: { Apple: 'Red', Banana: 'Yellow', Grapes: 'Purple', Lime: 'Green', Tangerine: 'Orange' },
      },

      // ── Medium ─────────────────────────────────────────────

      {
        title: 'Opposite Words',
        description: 'Match each word to its exact opposite.',
        type: 'word_match', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Drag each word on the left to its opposite on the right.',
          pairs: [
            { left: 'Hot',   right: 'Cold'  },
            { left: 'Fast',  right: 'Slow'  },
            { left: 'Big',   right: 'Small' },
            { left: 'Happy', right: 'Sad'   },
            { left: 'Light', right: 'Dark'  },
            { left: 'Up',    right: 'Down'  },
          ],
        },
        correct_answer: { Hot: 'Cold', Fast: 'Slow', Big: 'Small', Happy: 'Sad', Light: 'Dark', Up: 'Down' },
      },

      {
        title: 'Countries & Their Capitals',
        description: 'Match each country to its capital city.',
        type: 'word_match', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Match each country on the left to its capital city on the right.',
          pairs: [
            { left: 'France',  right: 'Paris'    },
            { left: 'Japan',   right: 'Tokyo'    },
            { left: 'Egypt',   right: 'Cairo'    },
            { left: 'Brazil',  right: 'Brasília' },
            { left: 'Germany', right: 'Berlin'   },
          ],
        },
        correct_answer: { France: 'Paris', Japan: 'Tokyo', Egypt: 'Cairo', Brazil: 'Brasília', Germany: 'Berlin' },
      },

      {
        title: 'Synonyms',
        description: 'Match each word to another word that means the same thing.',
        type: 'word_match', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Match each word to its synonym — a word with the same meaning.',
          pairs: [
            { left: 'Happy',  right: 'Joyful'  },
            { left: 'Sad',    right: 'Unhappy' },
            { left: 'Big',    right: 'Large'   },
            { left: 'Smart',  right: 'Clever'  },
            { left: 'Angry',  right: 'Furious' },
            { left: 'Fast',   right: 'Quick'   },
          ],
        },
        correct_answer: { Happy: 'Joyful', Sad: 'Unhappy', Big: 'Large', Smart: 'Clever', Angry: 'Furious', Fast: 'Quick' },
      },

      {
        title: 'Jobs & What They Do',
        description: 'Match each job title to what that person does.',
        type: 'word_match', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Match each job on the left to its description on the right.',
          pairs: [
            { left: 'Doctor',    right: 'Treats sick people'  },
            { left: 'Teacher',   right: 'Educates students'   },
            { left: 'Chef',      right: 'Cooks food'          },
            { left: 'Pilot',     right: 'Flies aircraft'      },
            { left: 'Architect', right: 'Designs buildings'   },
          ],
        },
        correct_answer: {
          Doctor: 'Treats sick people', Teacher: 'Educates students',
          Chef: 'Cooks food', Pilot: 'Flies aircraft', Architect: 'Designs buildings',
        },
      },

      // ── Hard ───────────────────────────────────────────────

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
          Heart: 'Pumps blood', Lungs: 'Breathe air', Brain: 'Controls thinking',
          Stomach: 'Digests food', Eyes: 'See things', Ears: 'Hear sounds',
        },
      },

      {
        title: 'Science Terms & Definitions',
        description: 'Match each science word to its correct definition.',
        type: 'word_match', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Match each scientific term on the left to its definition on the right.',
          pairs: [
            { left: 'Photosynthesis', right: 'Plants making food from sunlight' },
            { left: 'Gravity',        right: 'Force that pulls objects downward' },
            { left: 'Evaporation',    right: 'Liquid turning into gas'           },
            { left: 'Orbit',          right: 'Path of an object around another'  },
            { left: 'Erosion',        right: 'Wearing away of land by water'     },
          ],
        },
        correct_answer: {
          Photosynthesis: 'Plants making food from sunlight',
          Gravity:        'Force that pulls objects downward',
          Evaporation:    'Liquid turning into gas',
          Orbit:          'Path of an object around another',
          Erosion:        'Wearing away of land by water',
        },
      },

      {
        title: 'Literary Terms',
        description: 'Match each literary term to what it means in writing.',
        type: 'word_match', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Match each literary term on the left to its meaning on the right.',
          pairs: [
            { left: 'Metaphor',     right: 'Saying one thing IS another'     },
            { left: 'Simile',       right: 'Comparing using like or as'      },
            { left: 'Alliteration', right: 'Repeating the same first sound'  },
            { left: 'Protagonist',  right: 'The main character of the story' },
            { left: 'Foreshadowing',right: 'Hinting at what will happen next'},
          ],
        },
        correct_answer: {
          Metaphor:      'Saying one thing IS another',
          Simile:        'Comparing using like or as',
          Alliteration:  'Repeating the same first sound',
          Protagonist:   'The main character of the story',
          Foreshadowing: 'Hinting at what will happen next',
        },
      },

      {
        title: 'World Records',
        description: 'Match each world record fact to the correct subject.',
        type: 'word_match', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Match each record-holder on the left to its world record on the right.',
          pairs: [
            { left: 'Mount Everest', right: 'Tallest mountain on Earth'    },
            { left: 'Nile River',    right: 'Longest river in the world'   },
            { left: 'Cheetah',       right: 'Fastest land animal'          },
            { left: 'Blue Whale',    right: 'Largest animal on Earth'      },
            { left: 'Vatican City',  right: 'Smallest country in the world'},
          ],
        },
        correct_answer: {
          'Mount Everest': 'Tallest mountain on Earth',
          'Nile River':    'Longest river in the world',
          Cheetah:         'Fastest land animal',
          'Blue Whale':    'Largest animal on Earth',
          'Vatican City':  'Smallest country in the world',
        },
      },

      // ════════════════════════════════════════════════════════
      // FILL IN THE BLANK
      // ════════════════════════════════════════════════════════

      // ── Easy ───────────────────────────────────────────────

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
        correct_answer: { answers: ['hungry','apple','better','cocoon','butterfly'] },
      },

      {
        title: 'At the Farm',
        description: 'Complete these sentences about life on a farm.',
        type: 'fill_blank', difficulty: 'easy', xp_reward: 15,
        content: {
          instruction: 'Choose the right word to complete each farm sentence.',
          sentences: [
            { text: 'The farmer wakes up very ___ in the morning.', options: ['early','late','slowly','quickly'], answer: 'early' },
            { text: 'Hens lay ___ in their nests every day.', options: ['eggs','milk','honey','wool'], answer: 'eggs' },
            { text: 'Cows give us ___ to drink.', options: ['milk','juice','water','butter'], answer: 'milk' },
            { text: 'The farmer uses a ___ to cut the grass.', options: ['tractor','hammer','shovel','rake'], answer: 'tractor' },
            { text: 'Wool comes from ___.', options: ['sheep','pigs','horses','cows'], answer: 'sheep' },
          ],
        },
        correct_answer: { answers: ['early','eggs','milk','tractor','sheep'] },
      },

      {
        title: 'My School Day',
        description: 'Fill in the blanks about a typical school day.',
        type: 'fill_blank', difficulty: 'easy', xp_reward: 15,
        content: {
          instruction: 'Pick the correct word to complete each sentence about school.',
          sentences: [
            { text: 'I carry my books in a ___.', options: ['backpack','bucket','basket','briefcase'], answer: 'backpack' },
            { text: 'We use a ___ to write on the board.', options: ['chalk','pen','crayon','marker'], answer: 'chalk' },
            { text: 'At lunch I eat in the school ___.', options: ['canteen','library','gym','office'], answer: 'canteen' },
            { text: 'Our teacher writes on the ___.', options: ['blackboard','window','floor','wall'], answer: 'blackboard' },
            { text: 'We go to the ___ to borrow books.', options: ['library','kitchen','garden','hall'], answer: 'library' },
          ],
        },
        correct_answer: { answers: ['backpack','chalk','canteen','blackboard','library'] },
      },

      {
        title: 'The Four Seasons',
        description: 'Complete these sentences about the four seasons.',
        type: 'fill_blank', difficulty: 'easy', xp_reward: 15,
        content: {
          instruction: 'Choose the correct word to complete each season sentence.',
          sentences: [
            { text: 'In ___ the flowers begin to bloom.', options: ['Spring','Summer','Autumn','Winter'], answer: 'Spring' },
            { text: 'The hottest season of the year is ___.', options: ['Summer','Spring','Autumn','Winter'], answer: 'Summer' },
            { text: 'Leaves turn red and gold in ___.', options: ['Autumn','Spring','Summer','Winter'], answer: 'Autumn' },
            { text: 'Snow falls during ___.', options: ['Winter','Autumn','Spring','Summer'], answer: 'Winter' },
            { text: 'Children like to swim at the beach in ___.', options: ['Summer','Spring','Autumn','Winter'], answer: 'Summer' },
          ],
        },
        correct_answer: { answers: ['Spring','Summer','Autumn','Winter','Summer'] },
      },

      // ── Medium ─────────────────────────────────────────────

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
        correct_answer: { answers: ['rainbow','tornado','blizzard','fog','Hail'] },
      },

      {
        title: 'Space Adventure',
        description: 'Fill in the blanks to complete these facts about space.',
        type: 'fill_blank', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Pick the correct word to complete each space fact.',
          sentences: [
            { text: 'The planet closest to the Sun is ___.', options: ['Mercury','Venus','Mars','Earth'], answer: 'Mercury' },
            { text: 'Earth has one natural ___ called the Moon.', options: ['satellite','planet','star','comet'], answer: 'satellite' },
            { text: 'The Milky Way is a type of ___.', options: ['galaxy','nebula','asteroid','comet'], answer: 'galaxy' },
            { text: 'Astronauts travel to space in a ___.', options: ['spacecraft','submarine','helicopter','balloon'], answer: 'spacecraft' },
            { text: 'The Sun is actually a giant ___.', options: ['star','planet','moon','comet'], answer: 'star' },
          ],
        },
        correct_answer: { answers: ['Mercury','satellite','galaxy','spacecraft','star'] },
      },

      {
        title: 'Under the Sea',
        description: 'Complete these sentences about life in the ocean.',
        type: 'fill_blank', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Choose the correct word to complete each ocean sentence.',
          sentences: [
            { text: 'A shark uses its ___ to breathe underwater.', options: ['gills','lungs','fins','scales'], answer: 'gills' },
            { text: 'An octopus has ___ arms.', options: ['eight','six','four','ten'], answer: 'eight' },
            { text: 'Coral ___ are found in warm shallow waters.', options: ['reefs','forests','caves','fields'], answer: 'reefs' },
            { text: 'The ___ is the largest creature in the ocean.', options: ['blue whale','great white','dolphin','squid'], answer: 'blue whale' },
            { text: 'Seahorses are unique because the ___ carries the babies.', options: ['male','female','oldest','youngest'], answer: 'male' },
          ],
        },
        correct_answer: { answers: ['gills','eight','reefs','blue whale','male'] },
      },

      {
        title: 'The Human Body',
        description: 'Fill in the blanks about how the human body works.',
        type: 'fill_blank', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Pick the correct word to complete each body fact.',
          sentences: [
            { text: 'The human body has ___ bones when fully grown.', options: ['206','108','312','150'], answer: '206' },
            { text: 'Blood is pumped around the body by the ___.', options: ['heart','brain','liver','kidney'], answer: 'heart' },
            { text: 'The ___ protects your brain inside your head.', options: ['skull','spine','ribcage','kneecap'], answer: 'skull' },
            { text: 'We use our ___ to taste food.', options: ['tongue','teeth','lips','nose'], answer: 'tongue' },
            { text: 'The largest organ in the body is the ___.', options: ['skin','liver','brain','lung'], answer: 'skin' },
          ],
        },
        correct_answer: { answers: ['206','heart','skull','tongue','skin'] },
      },

      // ── Hard ───────────────────────────────────────────────

      {
        title: 'The Ocean Explorer',
        description: 'Read carefully and fill in the ocean science facts.',
        type: 'fill_blank', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Pick the correct word to complete each ocean fact.',
          sentences: [
            { text: "The ocean covers more than ___ of Earth's surface.", options: ['70%','50%','30%','90%'], answer: '70%' },
            { text: 'The deepest part of the ocean is the Mariana ___.', options: ['Trench','Ridge','Basin','Valley'], answer: 'Trench' },
            { text: 'Oceans are home to millions of different ___.', options: ['species','people','plants','rocks'], answer: 'species' },
            { text: 'Many deep-sea creatures have never been ___.', options: ['discovered','eaten','named','counted'], answer: 'discovered' },
            { text: "Oceans help ___ the temperature of the Earth.", options: ['regulate','raise','lower','measure'], answer: 'regulate' },
          ],
        },
        correct_answer: { answers: ['70%','Trench','species','discovered','regulate'] },
      },

      {
        title: 'History of Inventions',
        description: 'Complete these facts about famous inventions throughout history.',
        type: 'fill_blank', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Choose the correct word to complete each invention fact.',
          sentences: [
            { text: 'The printing press was invented by Johannes ___.', options: ['Gutenberg','Edison','Newton','Darwin'], answer: 'Gutenberg' },
            { text: 'Alexander Graham Bell invented the ___.', options: ['telephone','television','radio','computer'], answer: 'telephone' },
            { text: 'The World Wide Web was created by Tim Berners-___.', options: ['Lee','King','Young','Black'], answer: 'Lee' },
            { text: 'Thomas Edison is credited with inventing the light ___.', options: ['bulb','switch','socket','wire'], answer: 'bulb' },
            { text: 'The Wright Brothers made the first successful airplane ___ in 1903.', options: ['flight','landing','design','engine'], answer: 'flight' },
          ],
        },
        correct_answer: { answers: ['Gutenberg','telephone','Lee','bulb','flight'] },
      },

      {
        title: 'World Geography',
        description: 'Fill in the blanks to complete these world geography facts.',
        type: 'fill_blank', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Pick the correct word to complete each geography fact.',
          sentences: [
            { text: 'The Amazon rainforest is mostly located in ___.', options: ['Brazil','Peru','Colombia','Venezuela'], answer: 'Brazil' },
            { text: 'The Sahara is the world\'s largest hot ___.', options: ['desert','forest','plain','plateau'], answer: 'desert' },
            { text: 'The ___ is the longest mountain range in the world.', options: ['Andes','Himalayas','Rockies','Alps'], answer: 'Andes' },
            { text: 'Lake Baikal in Russia holds about 20% of the world\'s fresh ___.', options: ['water','ice','fish','minerals'], answer: 'water' },
            { text: 'The continent with the most countries is ___.', options: ['Africa','Asia','Europe','Americas'], answer: 'Africa' },
          ],
        },
        correct_answer: { answers: ['Brazil','desert','Andes','water','Africa'] },
      },

      {
        title: 'Environmental Science',
        description: 'Complete these sentences about the environment and ecology.',
        type: 'fill_blank', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Choose the correct word to complete each environmental fact.',
          sentences: [
            { text: 'The process by which carbon dioxide is absorbed by trees is called ___.', options: ['photosynthesis','respiration','evaporation','combustion'], answer: 'photosynthesis' },
            { text: 'The layer of the atmosphere that protects us from UV rays is the ___ layer.', options: ['ozone','carbon','nitrogen','oxygen'], answer: 'ozone' },
            { text: 'Burning fossil fuels releases ___ dioxide into the atmosphere.', options: ['carbon','sulfur','nitrogen','hydrogen'], answer: 'carbon' },
            { text: 'A ___ is an area where many different species live and depend on each other.', options: ['ecosystem','biome','habitat','climate'], answer: 'ecosystem' },
            { text: 'When a species no longer exists anywhere on Earth it is called ___.', options: ['extinct','endangered','threatened','rare'], answer: 'extinct' },
          ],
        },
        correct_answer: { answers: ['photosynthesis','ozone','carbon','ecosystem','extinct'] },
      },

      // ════════════════════════════════════════════════════════
      // SENTENCE SORT
      // ════════════════════════════════════════════════════════

      // ── Easy ───────────────────────────────────────────────

      {
        title: 'Making a Sandwich',
        description: 'Put the steps for making a sandwich in the right order.',
        type: 'sentence_sort', difficulty: 'easy', xp_reward: 15,
        content: {
          instruction: 'Drag the steps into the correct order to make a sandwich.',
          sentences: [
            'Get two slices of bread from the bag.',
            'Spread butter on one side of each slice.',
            'Place your filling on one slice.',
            'Press the two slices together.',
            'Cut the sandwich in half and enjoy!',
          ],
          shuffled: [
            'Press the two slices together.',
            'Get two slices of bread from the bag.',
            'Cut the sandwich in half and enjoy!',
            'Spread butter on one side of each slice.',
            'Place your filling on one slice.',
          ],
        },
        correct_answer: {
          order: [
            'Get two slices of bread from the bag.',
            'Spread butter on one side of each slice.',
            'Place your filling on one slice.',
            'Press the two slices together.',
            'Cut the sandwich in half and enjoy!',
          ],
        },
      },

      {
        title: 'Brushing Your Teeth',
        description: 'Put the steps for brushing your teeth in the right order.',
        type: 'sentence_sort', difficulty: 'easy', xp_reward: 15,
        content: {
          instruction: 'Drag the steps into the correct order to brush your teeth.',
          sentences: [
            'Pick up your toothbrush.',
            'Put a small amount of toothpaste on the brush.',
            'Brush all your teeth gently for two minutes.',
            'Rinse your mouth with water.',
            'Put your toothbrush away.',
          ],
          shuffled: [
            'Rinse your mouth with water.',
            'Pick up your toothbrush.',
            'Put your toothbrush away.',
            'Put a small amount of toothpaste on the brush.',
            'Brush all your teeth gently for two minutes.',
          ],
        },
        correct_answer: {
          order: [
            'Pick up your toothbrush.',
            'Put a small amount of toothpaste on the brush.',
            'Brush all your teeth gently for two minutes.',
            'Rinse your mouth with water.',
            'Put your toothbrush away.',
          ],
        },
      },

      {
        title: 'Growing a Plant',
        description: 'Put the steps for growing a plant from seed in the right order.',
        type: 'sentence_sort', difficulty: 'easy', xp_reward: 15,
        content: {
          instruction: 'Drag the steps into the correct order to grow a plant.',
          sentences: [
            'Fill a pot with soil.',
            'Make a small hole in the soil.',
            'Drop a seed into the hole and cover it.',
            'Water the soil gently every day.',
            'Watch the seedling sprout and grow!',
          ],
          shuffled: [
            'Water the soil gently every day.',
            'Fill a pot with soil.',
            'Watch the seedling sprout and grow!',
            'Drop a seed into the hole and cover it.',
            'Make a small hole in the soil.',
          ],
        },
        correct_answer: {
          order: [
            'Fill a pot with soil.',
            'Make a small hole in the soil.',
            'Drop a seed into the hole and cover it.',
            'Water the soil gently every day.',
            'Watch the seedling sprout and grow!',
          ],
        },
      },

      {
        title: 'Getting Ready for School',
        description: 'Put the morning routine steps in the correct order.',
        type: 'sentence_sort', difficulty: 'easy', xp_reward: 15,
        content: {
          instruction: 'Drag the morning routine steps into the correct order.',
          sentences: [
            'Wake up when the alarm rings.',
            'Wash your face and brush your teeth.',
            'Get dressed in your school uniform.',
            'Eat a healthy breakfast.',
            'Pack your bag and head to school.',
          ],
          shuffled: [
            'Eat a healthy breakfast.',
            'Wake up when the alarm rings.',
            'Pack your bag and head to school.',
            'Wash your face and brush your teeth.',
            'Get dressed in your school uniform.',
          ],
        },
        correct_answer: {
          order: [
            'Wake up when the alarm rings.',
            'Wash your face and brush your teeth.',
            'Get dressed in your school uniform.',
            'Eat a healthy breakfast.',
            'Pack your bag and head to school.',
          ],
        },
      },

      // ── Medium ─────────────────────────────────────────────

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

      {
        title: 'The Lost Puppy',
        description: 'Arrange these sentences to tell the story of a lost puppy.',
        type: 'sentence_sort', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Drag the sentences into the correct order to tell the story.',
          sentences: [
            'A small puppy wandered away from its home.',
            'It walked through the park, sniffing at everything.',
            'A kind girl named Maya saw the puppy alone.',
            'Maya looked at its collar and found its owner\'s address.',
            'She walked the puppy home and its owner was very grateful.',
          ],
          shuffled: [
            'Maya looked at its collar and found its owner\'s address.',
            'A small puppy wandered away from its home.',
            'She walked the puppy home and its owner was very grateful.',
            'It walked through the park, sniffing at everything.',
            'A kind girl named Maya saw the puppy alone.',
          ],
        },
        correct_answer: {
          order: [
            'A small puppy wandered away from its home.',
            'It walked through the park, sniffing at everything.',
            'A kind girl named Maya saw the puppy alone.',
            'Maya looked at its collar and found its owner\'s address.',
            'She walked the puppy home and its owner was very grateful.',
          ],
        },
      },

      {
        title: 'Baking a Cake',
        description: 'Put the cake-baking steps in the correct order.',
        type: 'sentence_sort', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Drag the steps into the correct order to bake a cake.',
          sentences: [
            'Gather your ingredients: flour, eggs, butter, and sugar.',
            'Mix all the ingredients together in a large bowl.',
            'Pour the batter into a greased baking tin.',
            'Bake in the oven at 180°C for 30 minutes.',
            'Let the cake cool before adding icing.',
          ],
          shuffled: [
            'Bake in the oven at 180°C for 30 minutes.',
            'Gather your ingredients: flour, eggs, butter, and sugar.',
            'Let the cake cool before adding icing.',
            'Pour the batter into a greased baking tin.',
            'Mix all the ingredients together in a large bowl.',
          ],
        },
        correct_answer: {
          order: [
            'Gather your ingredients: flour, eggs, butter, and sugar.',
            'Mix all the ingredients together in a large bowl.',
            'Pour the batter into a greased baking tin.',
            'Bake in the oven at 180°C for 30 minutes.',
            'Let the cake cool before adding icing.',
          ],
        },
      },

      {
        title: 'A Trip to the Library',
        description: 'Put these sentences about a library visit in the right order.',
        type: 'sentence_sort', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Drag the sentences into the correct order for a library visit.',
          sentences: [
            'Leo and his dad arrived at the local library.',
            'They walked through the shelves looking at book covers.',
            'Leo picked out a book about dinosaurs.',
            'He sat at a quiet table and read the first chapter.',
            'They borrowed the book and walked home happy.',
          ],
          shuffled: [
            'He sat at a quiet table and read the first chapter.',
            'Leo and his dad arrived at the local library.',
            'They borrowed the book and walked home happy.',
            'Leo picked out a book about dinosaurs.',
            'They walked through the shelves looking at book covers.',
          ],
        },
        correct_answer: {
          order: [
            'Leo and his dad arrived at the local library.',
            'They walked through the shelves looking at book covers.',
            'Leo picked out a book about dinosaurs.',
            'He sat at a quiet table and read the first chapter.',
            'They borrowed the book and walked home happy.',
          ],
        },
      },

      // ── Hard ───────────────────────────────────────────────

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

      {
        title: 'The Water Cycle',
        description: 'Arrange the stages of the water cycle in the correct scientific order.',
        type: 'sentence_sort', difficulty: 'hard', xp_reward: 35,
        content: {
          instruction: 'Put the stages of the water cycle in the correct order.',
          sentences: [
            'Heat from the Sun causes water in rivers and oceans to evaporate.',
            'Water vapour rises into the atmosphere and cools down.',
            'The cooled vapour condenses to form clouds and water droplets.',
            'Water droplets fall back to Earth as rain, snow, or hail.',
            'The water flows into rivers and oceans, and the cycle begins again.',
          ],
          shuffled: [
            'The cooled vapour condenses to form clouds and water droplets.',
            'The water flows into rivers and oceans, and the cycle begins again.',
            'Heat from the Sun causes water in rivers and oceans to evaporate.',
            'Water droplets fall back to Earth as rain, snow, or hail.',
            'Water vapour rises into the atmosphere and cools down.',
          ],
        },
        correct_answer: {
          order: [
            'Heat from the Sun causes water in rivers and oceans to evaporate.',
            'Water vapour rises into the atmosphere and cools down.',
            'The cooled vapour condenses to form clouds and water droplets.',
            'Water droplets fall back to Earth as rain, snow, or hail.',
            'The water flows into rivers and oceans, and the cycle begins again.',
          ],
        },
      },

      {
        title: 'How Volcanoes Erupt',
        description: 'Arrange the stages of a volcanic eruption in the correct order.',
        type: 'sentence_sort', difficulty: 'hard', xp_reward: 35,
        content: {
          instruction: 'Put the stages of a volcanic eruption in the correct order.',
          sentences: [
            'Magma forms deep inside the Earth where temperatures are extremely high.',
            'Pressure builds up as more magma collects in the magma chamber.',
            'The pressure forces magma upward through cracks in the Earth\'s crust.',
            'Magma reaches the surface and is now called lava.',
            'The lava cools and hardens, forming new rock and land.',
          ],
          shuffled: [
            'The lava cools and hardens, forming new rock and land.',
            'Pressure builds up as more magma collects in the magma chamber.',
            'Magma forms deep inside the Earth where temperatures are extremely high.',
            'Magma reaches the surface and is now called lava.',
            'The pressure forces magma upward through cracks in the Earth\'s crust.',
          ],
        },
        correct_answer: {
          order: [
            'Magma forms deep inside the Earth where temperatures are extremely high.',
            'Pressure builds up as more magma collects in the magma chamber.',
            'The pressure forces magma upward through cracks in the Earth\'s crust.',
            'Magma reaches the surface and is now called lava.',
            'The lava cools and hardens, forming new rock and land.',
          ],
        },
      },

      {
        title: 'The History of Writing',
        description: 'Arrange the milestones in the history of writing in chronological order.',
        type: 'sentence_sort', difficulty: 'hard', xp_reward: 35,
        content: {
          instruction: 'Put these milestones in the history of writing in the correct chronological order.',
          sentences: [
            'Ancient Sumerians developed cuneiform, one of the earliest writing systems.',
            'Egyptians created hieroglyphics using pictorial symbols.',
            'The Phoenician alphabet was developed, using letters for sounds.',
            'The Greek alphabet was adapted from Phoenician, adding vowel letters.',
            'Johannes Gutenberg invented the printing press, making books widely available.',
          ],
          shuffled: [
            'The Greek alphabet was adapted from Phoenician, adding vowel letters.',
            'Ancient Sumerians developed cuneiform, one of the earliest writing systems.',
            'Johannes Gutenberg invented the printing press, making books widely available.',
            'Egyptians created hieroglyphics using pictorial symbols.',
            'The Phoenician alphabet was developed, using letters for sounds.',
          ],
        },
        correct_answer: {
          order: [
            'Ancient Sumerians developed cuneiform, one of the earliest writing systems.',
            'Egyptians created hieroglyphics using pictorial symbols.',
            'The Phoenician alphabet was developed, using letters for sounds.',
            'The Greek alphabet was adapted from Phoenician, adding vowel letters.',
            'Johannes Gutenberg invented the printing press, making books widely available.',
          ],
        },
      },

      // ════════════════════════════════════════════════════════
      // PICTURE & WORD
      // ════════════════════════════════════════════════════════

      // ── Easy ───────────────────────────────────────────────

      {
        title: 'What Do You See?',
        description: 'Look at each picture and pick the correct word.',
        type: 'picture_word', difficulty: 'easy', xp_reward: 10,
        content: {
          instruction: 'Tap the word that matches each picture.',
          items: [
            { picture: '🌞', options: ['Sun',     'Moon',   'Star',    'Cloud'  ], answer: 'Sun'     },
            { picture: '🌊', options: ['River',   'Lake',   'Ocean',   'Pond'   ], answer: 'Ocean'   },
            { picture: '🌈', options: ['Rainbow', 'Sunset', 'Storm',   'Cloud'  ], answer: 'Rainbow' },
            { picture: '🦁', options: ['Tiger',   'Lion',   'Bear',    'Wolf'   ], answer: 'Lion'    },
            { picture: '🍎', options: ['Pear',    'Plum',   'Apple',   'Peach'  ], answer: 'Apple'   },
            { picture: '🚀', options: ['Plane',   'Rocket', 'Balloon', 'Kite'   ], answer: 'Rocket'  },
          ],
        },
        correct_answer: { answers: ['Sun','Ocean','Rainbow','Lion','Apple','Rocket'] },
      },

      {
        title: 'Things at Home',
        description: 'Name the everyday objects you find at home.',
        type: 'picture_word', difficulty: 'easy', xp_reward: 10,
        content: {
          instruction: 'Tap the word that names each household object.',
          items: [
            { picture: '🛋️', options: ['Sofa',   'Table',  'Chair', 'Desk'  ], answer: 'Sofa'  },
            { picture: '🛁', options: ['Shower', 'Bathtub','Sink',  'Basin' ], answer: 'Bathtub'},
            { picture: '🪟', options: ['Door',   'Window', 'Wall',  'Roof'  ], answer: 'Window'},
            { picture: '💡', options: ['Lamp',   'Bulb',   'Torch', 'Candle'], answer: 'Bulb'  },
            { picture: '📺', options: ['Radio',  'Monitor','TV',    'Screen'], answer: 'TV'    },
            { picture: '🪴', options: ['Flower', 'Bush',   'Plant', 'Tree'  ], answer: 'Plant' },
          ],
        },
        correct_answer: { answers: ['Sofa','Bathtub','Window','Bulb','TV','Plant'] },
      },

      {
        title: 'Food & Drinks',
        description: 'Identify these common foods and drinks.',
        type: 'picture_word', difficulty: 'easy', xp_reward: 10,
        content: {
          instruction: 'Tap the correct name for each food or drink.',
          items: [
            { picture: '🍕', options: ['Burger', 'Taco',  'Pizza',   'Wrap'   ], answer: 'Pizza'   },
            { picture: '🍜', options: ['Soup',   'Noodles','Rice',   'Porridge'], answer: 'Noodles' },
            { picture: '🥛', options: ['Water',  'Juice', 'Milk',    'Smoothie'], answer: 'Milk'    },
            { picture: '🍩', options: ['Bagel',  'Donut', 'Cookie',  'Muffin' ], answer: 'Donut'   },
            { picture: '🥗', options: ['Stew',   'Salad', 'Sandwich','Wrap'   ], answer: 'Salad'   },
            { picture: '🍦', options: ['Cake',   'Sorbet','Ice Cream','Yogurt' ], answer: 'Ice Cream'},
          ],
        },
        correct_answer: { answers: ['Pizza','Noodles','Milk','Donut','Salad','Ice Cream'] },
      },

      {
        title: 'Animals Around Us',
        description: 'Name these common animals from the pictures.',
        type: 'picture_word', difficulty: 'easy', xp_reward: 10,
        content: {
          instruction: 'Tap the correct animal name for each picture.',
          items: [
            { picture: '🐘', options: ['Hippo',   'Rhino',    'Elephant','Giraffe'], answer: 'Elephant'},
            { picture: '🦒', options: ['Camel',   'Giraffe',  'Horse',   'Deer'   ], answer: 'Giraffe' },
            { picture: '🐧', options: ['Toucan',  'Pelican',  'Penguin', 'Parrot' ], answer: 'Penguin' },
            { picture: '🐊', options: ['Lizard',  'Crocodile','Monitor', 'Gecko'  ], answer: 'Crocodile'},
            { picture: '🦋', options: ['Moth',    'Dragonfly','Butterfly','Bee'   ], answer: 'Butterfly'},
            { picture: '🐬', options: ['Shark',   'Whale',    'Porpoise','Dolphin'], answer: 'Dolphin' },
          ],
        },
        correct_answer: { answers: ['Elephant','Giraffe','Penguin','Crocodile','Butterfly','Dolphin'] },
      },

      // ── Medium ─────────────────────────────────────────────

      {
        title: 'Action Words',
        description: "Look at each picture and choose the action it shows.",
        type: 'picture_word', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Choose the action word that best matches each picture.',
          items: [
            { picture: '🏃', options: ['Walking', 'Running',  'Jumping', 'Sleeping'], answer: 'Running'  },
            { picture: '💃', options: ['Singing', 'Dancing',  'Drawing', 'Reading' ], answer: 'Dancing'  },
            { picture: '🤸', options: ['Tumbling','Jumping',  'Swimming','Climbing' ], answer: 'Jumping'  },
            { picture: '😴', options: ['Resting', 'Thinking', 'Sleeping','Waiting'  ], answer: 'Sleeping' },
            { picture: '🍳', options: ['Eating',  'Cooking',  'Baking',  'Grilling' ], answer: 'Cooking'  },
            { picture: '📖', options: ['Writing', 'Drawing',  'Reading', 'Learning' ], answer: 'Reading'  },
          ],
        },
        correct_answer: { answers: ['Running','Dancing','Jumping','Sleeping','Cooking','Reading'] },
      },

      {
        title: 'Feelings & Emotions',
        description: 'Match each facial expression to the emotion it shows.',
        type: 'picture_word', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Tap the emotion that best describes each face.',
          items: [
            { picture: '😊', options: ['Sad',     'Happy',    'Scared',  'Angry'   ], answer: 'Happy'   },
            { picture: '😢', options: ['Happy',   'Sad',      'Shocked', 'Bored'   ], answer: 'Sad'     },
            { picture: '😠', options: ['Jealous', 'Confused', 'Angry',   'Worried' ], answer: 'Angry'   },
            { picture: '😨', options: ['Anxious', 'Tired',    'Scared',  'Shy'     ], answer: 'Scared'  },
            { picture: '😲', options: ['Excited', 'Surprised','Confused','Happy'   ], answer: 'Surprised'},
            { picture: '🤔', options: ['Thinking','Worried',  'Bored',   'Sleepy'  ], answer: 'Thinking'},
          ],
        },
        correct_answer: { answers: ['Happy','Sad','Angry','Scared','Surprised','Thinking'] },
      },

      {
        title: 'Weather Symbols',
        description: 'Match each weather symbol to its correct weather type.',
        type: 'picture_word', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Tap the correct weather word for each symbol.',
          items: [
            { picture: '☀️', options: ['Cloudy',  'Sunny',  'Windy',  'Foggy'   ], answer: 'Sunny'   },
            { picture: '🌧️', options: ['Drizzle', 'Hail',   'Rainy',  'Stormy'  ], answer: 'Rainy'   },
            { picture: '❄️', options: ['Frosty',  'Snowy',  'Icy',    'Hailing' ], answer: 'Snowy'   },
            { picture: '⛈️', options: ['Windy',   'Foggy',  'Thunder','Tornado'  ], answer: 'Thunder' },
            { picture: '🌬️', options: ['Breezy',  'Stormy', 'Windy',  'Gusty'   ], answer: 'Windy'   },
            { picture: '🌫️', options: ['Smoggy',  'Foggy',  'Misty',  'Cloudy'  ], answer: 'Foggy'   },
          ],
        },
        correct_answer: { answers: ['Sunny','Rainy','Snowy','Thunder','Windy','Foggy'] },
      },

      {
        title: 'Sports & Activities',
        description: 'Name the sport or activity shown in each picture.',
        type: 'picture_word', difficulty: 'medium', xp_reward: 20,
        content: {
          instruction: 'Tap the name of the sport or activity in each picture.',
          items: [
            { picture: '⚽', options: ['Rugby',   'Football','Basketball','Volleyball'], answer: 'Football'  },
            { picture: '🏊', options: ['Diving',  'Surfing', 'Swimming',  'Rowing'    ], answer: 'Swimming'  },
            { picture: '🎾', options: ['Badminton','Squash', 'Tennis',    'Ping Pong' ], answer: 'Tennis'    },
            { picture: '🚴', options: ['Skating', 'Running','Cycling',   'Jogging'   ], answer: 'Cycling'   },
            { picture: '🥊', options: ['Karate',  'Boxing', 'Wrestling', 'Judo'      ], answer: 'Boxing'    },
            { picture: '🏹', options: ['Javelin', 'Fencing','Archery',   'Shooting'  ], answer: 'Archery'   },
          ],
        },
        correct_answer: { answers: ['Football','Swimming','Tennis','Cycling','Boxing','Archery'] },
      },

      // ── Hard ───────────────────────────────────────────────

      {
        title: 'Science & Nature',
        description: 'Match each nature symbol to the correct scientific term.',
        type: 'picture_word', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Pick the correct scientific word for each picture.',
          items: [
            { picture: '🌋', options: ['Earthquake', 'Volcano',     'Geyser',     'Crater'     ], answer: 'Volcano'     },
            { picture: '⚡', options: ['Thunder',    'Lightning',   'Static',     'Energy'     ], answer: 'Lightning'   },
            { picture: '🔭', options: ['Microscope', 'Periscope',   'Telescope',  'Binoculars' ], answer: 'Telescope'   },
            { picture: '🧲', options: ['Battery',    'Conductor',   'Magnet',     'Circuit'    ], answer: 'Magnet'      },
            { picture: '🌡️', options: ['Barometer',  'Thermometer', 'Compass',    'Scale'      ], answer: 'Thermometer' },
            { picture: '🦠', options: ['Cell',       'Virus',       'Bacteria',   'Microbe'    ], answer: 'Bacteria'    },
          ],
        },
        correct_answer: { answers: ['Volcano','Lightning','Telescope','Magnet','Thermometer','Bacteria'] },
      },

      {
        title: 'Musical Instruments',
        description: 'Identify each musical instrument from its picture.',
        type: 'picture_word', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Tap the correct instrument name for each picture.',
          items: [
            { picture: '🎸', options: ['Banjo',   'Ukulele', 'Guitar',    'Mandolin'], answer: 'Guitar'    },
            { picture: '🎻', options: ['Cello',   'Viola',   'Violin',    'Fiddle'  ], answer: 'Violin'    },
            { picture: '🥁', options: ['Bongos',  'Drums',   'Timbales',  'Snare'   ], answer: 'Drums'     },
            { picture: '🎺', options: ['Trombone','Bugle',   'Trumpet',   'Flugelhorn'], answer: 'Trumpet'  },
            { picture: '🎹', options: ['Organ',   'Keyboard','Piano',     'Harpsichord'], answer: 'Piano'  },
            { picture: '🪗', options: ['Concertina','Harmonica','Accordion','Melodeon'], answer: 'Accordion'},
          ],
        },
        correct_answer: { answers: ['Guitar','Violin','Drums','Trumpet','Piano','Accordion'] },
      },

      {
        title: 'World Landmarks',
        description: 'Identify these famous world landmarks from their symbols.',
        type: 'picture_word', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Pick the correct name for each world landmark symbol.',
          items: [
            { picture: '🗼', options: ['Big Ben',      'Eiffel Tower',   'Burj Khalifa',  'Tokyo Tower'  ], answer: 'Eiffel Tower'   },
            { picture: '🗽', options: ['Angel of North','Christ Redeemer','Statue of Liberty','Colossus' ], answer: 'Statue of Liberty'},
            { picture: '🏯', options: ['Palace',       'Temple',         'Castle',         'Fortress'   ], answer: 'Castle'          },
            { picture: '⛩️', options: ['Pagoda',       'Shrine',         'Torii Gate',     'Temple Gate'], answer: 'Torii Gate'      },
            { picture: '🕌', options: ['Cathedral',    'Mosque',         'Synagogue',      'Basilica'   ], answer: 'Mosque'          },
            { picture: '🏛️', options: ['Museum',       'Parliament',     'Temple',         'Library'    ], answer: 'Temple'          },
          ],
        },
        correct_answer: { answers: ['Eiffel Tower','Statue of Liberty','Castle','Torii Gate','Mosque','Temple'] },
      },

      {
        title: 'Maths & Symbols',
        description: 'Match each maths symbol to its correct name.',
        type: 'picture_word', difficulty: 'hard', xp_reward: 30,
        content: {
          instruction: 'Tap the correct name for each mathematical symbol.',
          items: [
            { picture: '➕', options: ['Minus',  'Plus',    'Multiply', 'Divide'  ], answer: 'Plus'     },
            { picture: '➖', options: ['Plus',   'Minus',   'Divide',   'Equals'  ], answer: 'Minus'    },
            { picture: '✖️', options: ['Divide', 'Add',     'Multiply', 'Power'   ], answer: 'Multiply' },
            { picture: '➗', options: ['Minus',  'Fraction','Divide',   'Ratio'   ], answer: 'Divide'   },
            { picture: '🟰', options: ['Similar','Equals',  'Identical','Approx'  ], answer: 'Equals'   },
            { picture: '📐', options: ['Compass','Protractor','Set Square','Ruler' ], answer: 'Set Square'},
          ],
        },
        correct_answer: { answers: ['Plus','Minus','Multiply','Divide','Equals','Set Square'] },
      },

    ]; // end activities array — 48 total

    // Re-seed cleanly on every deploy so changes take effect
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
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_, res) =>
  res.json({ status: 'ok', service: 'ReadAble API', timestamp: new Date().toISOString() })
);

const { settingsRouter, usersRouter } = require('./routes/settings');
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/progress',   require('./routes/progress'));
app.use('/api/settings',   settingsRouter);
app.use('/api/users',      usersRouter);

app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

setupDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 ReadAble API on port ${PORT}`);
    console.log(`   Origins: ${allowedOrigins.join(', ')}`);
  });
});

module.exports = app;
