require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool }  = require('pg');

const app  = express();
const PORT = process.env.PORT || 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ── Database setup ────────────────────────────────────────────
async function setupDatabase() {
  const client = await pool.connect();
  try {
    console.log('[DB] Running migrations…');

    // ── Core tables ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(50) UNIQUE NOT NULL,
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        level         INTEGER DEFAULT 1,
        xp            INTEGER DEFAULT 0,
        streak        INTEGER DEFAULT 0,
        achievements  JSONB DEFAULT '[]',
        avatar        TEXT DEFAULT 'star',
        created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='avatar'
            AND data_type='character varying'
        ) THEN
          ALTER TABLE users ALTER COLUMN avatar TYPE TEXT;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='last_activity_date'
        ) THEN
          ALTER TABLE users ADD COLUMN last_activity_date DATE;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='coins'
        ) THEN
          ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='wardrobe'
        ) THEN
          ALTER TABLE users ADD COLUMN wardrobe JSONB DEFAULT '[]';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='equipped'
        ) THEN
          ALTER TABLE users ADD COLUMN equipped JSONB DEFAULT '{}';
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='settings' AND column_name='bg_music_enabled'
        ) THEN
          ALTER TABLE settings ADD COLUMN bg_music_enabled BOOLEAN DEFAULT FALSE;
          ALTER TABLE settings ADD COLUMN bg_music_theme   VARCHAR(20) DEFAULT 'calm';
          ALTER TABLE settings ADD COLUMN bg_music_volume  FLOAT DEFAULT 0.7;
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id            SERIAL PRIMARY KEY,
        title         VARCHAR(255) NOT NULL,
        description   TEXT,
        type          VARCHAR(50) NOT NULL,
        difficulty    VARCHAR(20) DEFAULT 'easy',
        content       JSONB NOT NULL,
        correct_answer JSONB NOT NULL,
        xp_reward     INTEGER DEFAULT 10,
        created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
        score       INTEGER DEFAULT 0,
        attempts    INTEGER DEFAULT 0,
        completed   BOOLEAN DEFAULT FALSE,
        feedback    TEXT,
        last_played TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, activity_id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        text_size   VARCHAR(20) DEFAULT 'medium',
        theme       VARCHAR(20) DEFAULT 'light',
        tts_enabled BOOLEAN DEFAULT TRUE,
        tts_voice   VARCHAR(100) DEFAULT '',
        tts_rate    FLOAT DEFAULT 0.9,
        tts_pitch   FLOAT DEFAULT 1.0,
        updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id          SERIAL PRIMARY KEY,
        key         VARCHAR(50) UNIQUE NOT NULL,
        title       VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        icon        VARCHAR(10) NOT NULL,
        condition   JSONB NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_up_user     ON user_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_up_activity ON user_progress(activity_id);
      CREATE INDEX IF NOT EXISTS idx_act_diff    ON activities(difficulty);
      CREATE INDEX IF NOT EXISTS idx_act_type    ON activities(type);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_tokens (
        id         SERIAL PRIMARY KEY,
        email      VARCHAR(255) NOT NULL,
        otp        VARCHAR(10)  NOT NULL,
        type       VARCHAR(20)  NOT NULL DEFAULT 'reset',
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used       BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(email, type)
      );
    `);

    console.log('[DB] ✅ Tables ready');

    // ── Achievements ─────────────────────────────────────────
    const ach = [
      { key:'first_star',   title:'First Star',        desc:'Complete your first activity',  icon:'⭐', cond:{type:'activity_count',threshold:1   }},
      { key:'complete_5',   title:'Getting Started',   desc:'Complete 5 activities',         icon:'✅', cond:{type:'activity_count',threshold:5   }},
      { key:'complete_10',  title:'On a Roll',         desc:'Complete 10 activities',        icon:'🎯', cond:{type:'activity_count',threshold:10  }},
      { key:'complete_25',  title:'Dedicated Learner', desc:'Complete 25 activities',        icon:'📚', cond:{type:'activity_count',threshold:25  }},
      { key:'completionist',title:'Completionist',     desc:'Complete all activities',       icon:'🌈', cond:{type:'activity_count',threshold:48  }},
      { key:'xp_100',       title:'Century Club',      desc:'Earn 100 XP',                   icon:'💯', cond:{type:'xp',            threshold:100 }},
      { key:'xp_500',       title:'XP Legend',         desc:'Earn 500 XP',                   icon:'🌟', cond:{type:'xp',            threshold:500 }},
      { key:'xp_1000',      title:'XP Master',         desc:'Earn 1,000 XP',                icon:'🏅', cond:{type:'xp',            threshold:1000}},
      { key:'level_5',      title:'Word Wizard',       desc:'Reach Level 5',                 icon:'🧙', cond:{type:'level',         threshold:5   }},
      { key:'level_10',     title:'Reading Champion',  desc:'Reach Level 10',                icon:'🏆', cond:{type:'level',         threshold:10  }},
      { key:'level_20',     title:'Scholar',           desc:'Reach Level 20',                icon:'🎓', cond:{type:'level',         threshold:20  }},
      { key:'five_streak',  title:'On Fire',           desc:'Reach a 5-day streak',          icon:'🔥', cond:{type:'streak',        threshold:5   }},
      { key:'ten_streak',   title:'Unstoppable',       desc:'Reach a 10-day streak',         icon:'⚡', cond:{type:'streak',        threshold:10  }},
      { key:'perfect_3',    title:'Perfectionist',     desc:'3 perfect scores in a row',     icon:'💎', cond:{type:'perfect_streak', threshold:3  }},
      { key:'night_owl',    title:'Night Owl',         desc:'Play 5 sessions after 8 PM',    icon:'🦉', cond:{type:'night_sessions', threshold:5  }},
      { key:'early_bird',   title:'Early Bird',        desc:'Play 5 sessions before 9 AM',   icon:'🌅', cond:{type:'early_sessions', threshold:5  }},
      { key:'xp_1500',      title:'XP Titan',          desc:'Earn 1,500 XP',                 icon:'☀️', cond:{type:'xp',            threshold:1500}},
      { key:'complete_all_picture', title:'Picture Perfect', desc:'Complete all Picture Word & Picture Choice activities', icon:'🔬', cond:{type:'picture_completion', threshold:1} },
    ];
    for (const a of ach) {
      await client.query(
        `INSERT INTO achievements (key,title,description,icon,condition) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (key) DO UPDATE SET title=$2, description=$3, icon=$4, condition=$5`,
        [a.key, a.title, a.desc, a.icon, JSON.stringify(a.cond)]
      );
    }
    console.log(`[DB] ✅ ${ach.length} achievements ready`);

    // ── Activities ────────────────────────────────────────────
    const acts = [

      /* ===== WORD MATCH ===== */
      {t:'Animals & Their Sounds',d:'Match each animal to the sound it makes.',type:'word_match',diff:'easy',xp:10,
        content:{instruction:'Match each animal on the left to its sound on the right.',pairs:[{left:'Dog',right:'Woof'},{left:'Cat',right:'Meow'},{left:'Cow',right:'Moo'},{left:'Frog',right:'Ribbit'},{left:'Bee',right:'Buzz'}]},
        ans:{Dog:'Woof',Cat:'Meow',Cow:'Moo',Frog:'Ribbit',Bee:'Buzz'}},
      {t:'Colours & Objects',d:'Match each object to the colour associated with it.',type:'word_match',diff:'easy',xp:10,
        content:{instruction:'Match each object to the colour it is usually associated with.',pairs:[{left:'Sky',right:'Blue'},{left:'Grass',right:'Green'},{left:'Sun',right:'Yellow'},{left:'Fire',right:'Red'},{left:'Elephant',right:'Grey'}]},
        ans:{Sky:'Blue',Grass:'Green',Sun:'Yellow',Fire:'Red',Elephant:'Grey'}},
      {t:'Numbers & Words',d:'Match each numeral to the word that spells it out.',type:'word_match',diff:'easy',xp:10,
        content:{instruction:'Match each number on the left to its written word on the right.',pairs:[{left:'1',right:'One'},{left:'2',right:'Two'},{left:'3',right:'Three'},{left:'4',right:'Four'},{left:'5',right:'Five'}]},
        ans:{'1':'One','2':'Two','3':'Three','4':'Four','5':'Five'}},
      {t:'Fruits & Their Colours',d:'Match each fruit to the colour it is when ripe.',type:'word_match',diff:'easy',xp:10,
        content:{instruction:'Match each fruit on the left to its ripe colour on the right.',pairs:[{left:'Apple',right:'Red'},{left:'Banana',right:'Yellow'},{left:'Grapes',right:'Purple'},{left:'Lime',right:'Green'},{left:'Tangerine',right:'Orange'}]},
        ans:{Apple:'Red',Banana:'Yellow',Grapes:'Purple',Lime:'Green',Tangerine:'Orange'}},
      {t:'Opposite Words',d:'Match each word to its exact opposite.',type:'word_match',diff:'medium',xp:20,
        content:{instruction:'Drag each word on the left to its opposite on the right.',pairs:[{left:'Hot',right:'Cold'},{left:'Fast',right:'Slow'},{left:'Big',right:'Small'},{left:'Happy',right:'Sad'},{left:'Light',right:'Dark'},{left:'Up',right:'Down'}]},
        ans:{Hot:'Cold',Fast:'Slow',Big:'Small',Happy:'Sad',Light:'Dark',Up:'Down'}},
      {t:'Countries & Their Capitals',d:'Match each country to its capital city.',type:'word_match',diff:'medium',xp:20,
        content:{instruction:'Match each country on the left to its capital city on the right.',pairs:[{left:'France',right:'Paris'},{left:'Japan',right:'Tokyo'},{left:'Egypt',right:'Cairo'},{left:'Brazil',right:'Brasília'},{left:'Germany',right:'Berlin'}]},
        ans:{France:'Paris',Japan:'Tokyo',Egypt:'Cairo',Brazil:'Brasília',Germany:'Berlin'}},
      {t:'Synonyms',d:'Match each word to another word that means the same thing.',type:'word_match',diff:'medium',xp:20,
        content:{instruction:'Match each word to its synonym.',pairs:[{left:'Happy',right:'Joyful'},{left:'Sad',right:'Unhappy'},{left:'Big',right:'Large'},{left:'Smart',right:'Clever'},{left:'Angry',right:'Furious'},{left:'Fast',right:'Quick'}]},
        ans:{Happy:'Joyful',Sad:'Unhappy',Big:'Large',Smart:'Clever',Angry:'Furious',Fast:'Quick'}},
      {t:'Jobs & What They Do',d:'Match each job title to what that person does.',type:'word_match',diff:'medium',xp:20,
        content:{instruction:'Match each job on the left to its description on the right.',pairs:[{left:'Doctor',right:'Treats sick people'},{left:'Teacher',right:'Educates students'},{left:'Chef',right:'Cooks food'},{left:'Pilot',right:'Flies aircraft'},{left:'Architect',right:'Designs buildings'}]},
        ans:{Doctor:'Treats sick people',Teacher:'Educates students',Chef:'Cooks food',Pilot:'Flies aircraft',Architect:'Designs buildings'}},
      {t:'Body Parts & Their Jobs',d:'Match each body part to what it does.',type:'word_match',diff:'hard',xp:30,
        content:{instruction:'Match each body part on the left to its function on the right.',pairs:[{left:'Heart',right:'Pumps blood'},{left:'Lungs',right:'Breathe air'},{left:'Brain',right:'Controls thinking'},{left:'Stomach',right:'Digests food'},{left:'Eyes',right:'See things'},{left:'Ears',right:'Hear sounds'}]},
        ans:{Heart:'Pumps blood',Lungs:'Breathe air',Brain:'Controls thinking',Stomach:'Digests food',Eyes:'See things',Ears:'Hear sounds'}},
      {t:'Science Terms & Definitions',d:'Match each science word to its correct definition.',type:'word_match',diff:'hard',xp:30,
        content:{instruction:'Match each scientific term on the left to its definition on the right.',pairs:[{left:'Photosynthesis',right:'Plants making food from sunlight'},{left:'Gravity',right:'Force that pulls objects downward'},{left:'Evaporation',right:'Liquid turning into gas'},{left:'Orbit',right:'Path of an object around another'},{left:'Erosion',right:'Wearing away of land by water'}]},
        ans:{Photosynthesis:'Plants making food from sunlight',Gravity:'Force that pulls objects downward',Evaporation:'Liquid turning into gas',Orbit:'Path of an object around another',Erosion:'Wearing away of land by water'}},
      {t:'Literary Terms',d:'Match each literary term to its meaning.',type:'word_match',diff:'hard',xp:30,
        content:{instruction:'Match each literary term on the left to its meaning on the right.',pairs:[{left:'Metaphor',right:'Saying one thing IS another'},{left:'Simile',right:'Comparing using like or as'},{left:'Alliteration',right:'Repeating the same first sound'},{left:'Protagonist',right:'The main character of the story'},{left:'Foreshadowing',right:'Hinting at what will happen next'}]},
        ans:{Metaphor:'Saying one thing IS another',Simile:'Comparing using like or as',Alliteration:'Repeating the same first sound',Protagonist:'The main character of the story',Foreshadowing:'Hinting at what will happen next'}},
      {t:'World Records',d:'Match each record-holder to its world record.',type:'word_match',diff:'hard',xp:30,
        content:{instruction:'Match each record-holder on the left to its record on the right.',pairs:[{left:'Mount Everest',right:'Tallest mountain on Earth'},{left:'Nile River',right:'Longest river in the world'},{left:'Cheetah',right:'Fastest land animal'},{left:'Blue Whale',right:'Largest animal on Earth'},{left:'Vatican City',right:'Smallest country in the world'}]},
        ans:{'Mount Everest':'Tallest mountain on Earth','Nile River':'Longest river in the world','Cheetah':'Fastest land animal','Blue Whale':'Largest animal on Earth','Vatican City':'Smallest country in the world'}},

      /* ===== FILL IN THE BLANK ===== */
      {t:'The Hungry Caterpillar',d:'Fill in the missing words from this classic story.',type:'fill_blank',diff:'easy',xp:15,
        content:{instruction:'Pick the right word to fill each blank.',sentences:[
          {text:'The caterpillar was very ___.',options:['hungry','tired','cold','fast'],answer:'hungry'},
          {text:'On Monday he ate through one ___.',options:['apple','orange','banana','pear'],answer:'apple'},
          {text:'He felt much ___ after eating.',options:['better','worse','sleepy','full'],answer:'better'},
          {text:'The caterpillar built a ___ around himself.',options:['cocoon','shell','nest','web'],answer:'cocoon'},
          {text:'Finally he became a beautiful ___.',options:['butterfly','bird','beetle','bee'],answer:'butterfly'},
        ]},ans:{answers:['hungry','apple','better','cocoon','butterfly']}},
      {t:'At the Farm',d:'Complete these sentences about life on a farm.',type:'fill_blank',diff:'easy',xp:15,
        content:{instruction:'Choose the right word to complete each farm sentence.',sentences:[
          {text:'The farmer wakes up very ___ in the morning.',options:['early','late','slowly','quickly'],answer:'early'},
          {text:'Hens lay ___ in their nests every day.',options:['eggs','milk','honey','wool'],answer:'eggs'},
          {text:'Cows give us ___ to drink.',options:['milk','juice','water','butter'],answer:'milk'},
          {text:'The farmer uses a ___ to cut the grass.',options:['tractor','hammer','shovel','rake'],answer:'tractor'},
          {text:'Wool comes from ___.',options:['sheep','pigs','horses','cows'],answer:'sheep'},
        ]},ans:{answers:['early','eggs','milk','tractor','sheep']}},
      {t:'My School Day',d:'Fill in the blanks about a typical school day.',type:'fill_blank',diff:'easy',xp:15,
        content:{instruction:'Pick the correct word to complete each sentence about school.',sentences:[
          {text:'I carry my books in a ___.',options:['backpack','bucket','basket','briefcase'],answer:'backpack'},
          {text:'We use ___ to write on the board.',options:['chalk','pen','crayon','marker'],answer:'chalk'},
          {text:'At lunch I eat in the school ___.',options:['canteen','library','gym','office'],answer:'canteen'},
          {text:'Our teacher writes on the ___.',options:['blackboard','window','floor','wall'],answer:'blackboard'},
          {text:'We go to the ___ to borrow books.',options:['library','kitchen','garden','hall'],answer:'library'},
        ]},ans:{answers:['backpack','chalk','canteen','blackboard','library']}},
      {t:'The Four Seasons',d:'Complete these sentences about the four seasons.',type:'fill_blank',diff:'easy',xp:15,
        content:{instruction:'Choose the correct season to complete each sentence.',sentences:[
          {text:'In ___ the flowers begin to bloom.',options:['Spring','Summer','Autumn','Winter'],answer:'Spring'},
          {text:'The hottest season of the year is ___.',options:['Summer','Spring','Autumn','Winter'],answer:'Summer'},
          {text:'Leaves turn red and gold in ___.',options:['Autumn','Spring','Summer','Winter'],answer:'Autumn'},
          {text:'Snow falls during ___.',options:['Winter','Autumn','Spring','Summer'],answer:'Winter'},
          {text:'Children like to swim at the beach in ___.',options:['Summer','Spring','Autumn','Winter'],answer:'Summer'},
        ]},ans:{answers:['Spring','Summer','Autumn','Winter','Summer']}},
      {t:'Weather Words',d:'Complete sentences about different kinds of weather.',type:'fill_blank',diff:'medium',xp:20,
        content:{instruction:'Choose the best word to complete each weather sentence.',sentences:[
          {text:'When it rains and is sunny you might see a ___.',options:['rainbow','tornado','blizzard','fog'],answer:'rainbow'},
          {text:'A ___ is a very strong spinning column of wind.',options:['tornado','breeze','drizzle','sleet'],answer:'tornado'},
          {text:'Snow that falls heavily and blows strongly is a ___.',options:['blizzard','drizzle','shower','hail'],answer:'blizzard'},
          {text:'Tiny drops of water floating in the air are called ___.',options:['fog','steam','smoke','cloud'],answer:'fog'},
          {text:'___ is frozen rain that falls as small balls of ice.',options:['Hail','Sleet','Snow','Frost'],answer:'Hail'},
        ]},ans:{answers:['rainbow','tornado','blizzard','fog','Hail']}},
      {t:'Space Adventure',d:'Fill in the blanks with space science facts.',type:'fill_blank',diff:'medium',xp:20,
        content:{instruction:'Pick the correct word to complete each space fact.',sentences:[
          {text:'The planet closest to the Sun is ___.',options:['Mercury','Venus','Mars','Earth'],answer:'Mercury'},
          {text:'Earth has one natural ___ called the Moon.',options:['satellite','planet','star','comet'],answer:'satellite'},
          {text:'The Milky Way is a type of ___.',options:['galaxy','nebula','asteroid','comet'],answer:'galaxy'},
          {text:'Astronauts travel to space in a ___.',options:['spacecraft','submarine','helicopter','balloon'],answer:'spacecraft'},
          {text:'The Sun is actually a giant ___.',options:['star','planet','moon','comet'],answer:'star'},
        ]},ans:{answers:['Mercury','satellite','galaxy','spacecraft','star']}},
      {t:'Under the Sea',d:'Complete these sentences about life in the ocean.',type:'fill_blank',diff:'medium',xp:20,
        content:{instruction:'Choose the correct word to complete each ocean sentence.',sentences:[
          {text:'A shark uses its ___ to breathe underwater.',options:['gills','lungs','fins','scales'],answer:'gills'},
          {text:'An octopus has ___ arms.',options:['eight','six','four','ten'],answer:'eight'},
          {text:'Coral ___ are found in warm shallow waters.',options:['reefs','forests','caves','fields'],answer:'reefs'},
          {text:'The ___ is the largest creature in the ocean.',options:['blue whale','great white','dolphin','squid'],answer:'blue whale'},
          {text:'Seahorses are unique because the ___ carries the babies.',options:['male','female','oldest','youngest'],answer:'male'},
        ]},ans:{answers:['gills','eight','reefs','blue whale','male']}},
      {t:'The Human Body',d:'Fill in the blanks about how the human body works.',type:'fill_blank',diff:'medium',xp:20,
        content:{instruction:'Pick the correct word to complete each body fact.',sentences:[
          {text:'The human body has ___ bones when fully grown.',options:['206','108','312','150'],answer:'206'},
          {text:'Blood is pumped around the body by the ___.',options:['heart','brain','liver','kidney'],answer:'heart'},
          {text:'The ___ protects your brain inside your head.',options:['skull','spine','ribcage','kneecap'],answer:'skull'},
          {text:'We use our ___ to taste food.',options:['tongue','teeth','lips','nose'],answer:'tongue'},
          {text:'The largest organ in the body is the ___.',options:['skin','liver','brain','lung'],answer:'skin'},
        ]},ans:{answers:['206','heart','skull','tongue','skin']}},
      {t:'The Ocean Explorer',d:'Read carefully and fill in the ocean science facts.',type:'fill_blank',diff:'hard',xp:30,
        content:{instruction:'Pick the correct word to complete each ocean fact.',sentences:[
          {text:'The ocean covers more than ___ of the Earth\'s surface.',options:['70%','50%','30%','90%'],answer:'70%'},
          {text:'The deepest part of the ocean is the Mariana ___.',options:['Trench','Ridge','Basin','Valley'],answer:'Trench'},
          {text:'Oceans are home to millions of different ___.',options:['species','people','plants','rocks'],answer:'species'},
          {text:'Many deep-sea creatures have never been ___.',options:['discovered','eaten','named','counted'],answer:'discovered'},
          {text:'Oceans help ___ the temperature of the Earth.',options:['regulate','raise','lower','measure'],answer:'regulate'},
        ]},ans:{answers:['70%','Trench','species','discovered','regulate']}},
      {t:'History of Inventions',d:'Complete facts about famous inventions throughout history.',type:'fill_blank',diff:'hard',xp:30,
        content:{instruction:'Choose the correct word to complete each invention fact.',sentences:[
          {text:'The printing press was invented by Johannes ___.',options:['Gutenberg','Edison','Newton','Darwin'],answer:'Gutenberg'},
          {text:'Alexander Graham Bell invented the ___.',options:['telephone','television','radio','computer'],answer:'telephone'},
          {text:'The World Wide Web was created by Tim Berners-___.',options:['Lee','King','Young','Black'],answer:'Lee'},
          {text:'Thomas Edison is credited with inventing the light ___.',options:['bulb','switch','socket','wire'],answer:'bulb'},
          {text:'The Wright Brothers made the first successful airplane ___ in 1903.',options:['flight','landing','design','engine'],answer:'flight'},
        ]},ans:{answers:['Gutenberg','telephone','Lee','bulb','flight']}},
      {t:'World Geography',d:'Fill in the blanks to complete these world geography facts.',type:'fill_blank',diff:'hard',xp:30,
        content:{instruction:'Pick the correct word to complete each geography fact.',sentences:[
          {text:'The Amazon rainforest is mostly located in ___.',options:['Brazil','Peru','Colombia','Venezuela'],answer:'Brazil'},
          {text:'The Sahara is the world\'s largest hot ___.',options:['desert','forest','plain','plateau'],answer:'desert'},
          {text:'The ___ is the longest mountain range in the world.',options:['Andes','Himalayas','Rockies','Alps'],answer:'Andes'},
          {text:'Lake Baikal holds about 20% of the world\'s fresh ___.',options:['water','ice','fish','minerals'],answer:'water'},
          {text:'The continent with the most countries is ___.',options:['Africa','Asia','Europe','Americas'],answer:'Africa'},
        ]},ans:{answers:['Brazil','desert','Andes','water','Africa']}},
      {t:'Environmental Science',d:'Complete these sentences about the environment and ecology.',type:'fill_blank',diff:'hard',xp:30,
        content:{instruction:'Choose the correct word to complete each environmental fact.',sentences:[
          {text:'The process by which trees absorb carbon dioxide is called ___.',options:['photosynthesis','respiration','evaporation','combustion'],answer:'photosynthesis'},
          {text:'The layer of the atmosphere that protects us from UV rays is the ___ layer.',options:['ozone','carbon','nitrogen','oxygen'],answer:'ozone'},
          {text:'Burning fossil fuels releases ___ dioxide into the atmosphere.',options:['carbon','sulfur','nitrogen','hydrogen'],answer:'carbon'},
          {text:'A ___ is an area where many species live and depend on each other.',options:['ecosystem','biome','habitat','climate'],answer:'ecosystem'},
          {text:'When a species no longer exists anywhere on Earth it is called ___.',options:['extinct','endangered','threatened','rare'],answer:'extinct'},
        ]},ans:{answers:['photosynthesis','ozone','carbon','ecosystem','extinct']}},

      /* ===== SENTENCE SORT ===== */
      {t:'Making a Sandwich',d:'Put the steps for making a sandwich in the right order.',type:'sentence_sort',diff:'easy',xp:15,
        content:{instruction:'Drag the steps into the correct order to make a sandwich.',
          sentences:['Get two slices of bread from the bag.','Spread butter on one side of each slice.','Place your filling on one slice.','Press the two slices together.','Cut the sandwich in half and enjoy!'],
          shuffled:['Press the two slices together.','Get two slices of bread from the bag.','Cut the sandwich in half and enjoy!','Spread butter on one side of each slice.','Place your filling on one slice.']},
        ans:{order:['Get two slices of bread from the bag.','Spread butter on one side of each slice.','Place your filling on one slice.','Press the two slices together.','Cut the sandwich in half and enjoy!']}},
      {t:'Brushing Your Teeth',d:'Put the steps for brushing your teeth in the right order.',type:'sentence_sort',diff:'easy',xp:15,
        content:{instruction:'Drag the steps into the correct order to brush your teeth.',
          sentences:['Pick up your toothbrush.','Put a small amount of toothpaste on the brush.','Brush all your teeth gently for two minutes.','Rinse your mouth with water.','Put your toothbrush away.'],
          shuffled:['Rinse your mouth with water.','Pick up your toothbrush.','Put your toothbrush away.','Put a small amount of toothpaste on the brush.','Brush all your teeth gently for two minutes.']},
        ans:{order:['Pick up your toothbrush.','Put a small amount of toothpaste on the brush.','Brush all your teeth gently for two minutes.','Rinse your mouth with water.','Put your toothbrush away.']}},
      {t:'Growing a Plant',d:'Put the steps for growing a plant from seed in the right order.',type:'sentence_sort',diff:'easy',xp:15,
        content:{instruction:'Drag the steps into the correct order to grow a plant.',
          sentences:['Fill a pot with soil.','Make a small hole in the soil.','Drop a seed into the hole and cover it.','Water the soil gently every day.','Watch the seedling sprout and grow!'],
          shuffled:['Water the soil gently every day.','Fill a pot with soil.','Watch the seedling sprout and grow!','Drop a seed into the hole and cover it.','Make a small hole in the soil.']},
        ans:{order:['Fill a pot with soil.','Make a small hole in the soil.','Drop a seed into the hole and cover it.','Water the soil gently every day.','Watch the seedling sprout and grow!']}},
      {t:'Getting Ready for School',d:'Put the morning routine steps in the correct order.',type:'sentence_sort',diff:'easy',xp:15,
        content:{instruction:'Drag the morning routine steps into the correct order.',
          sentences:['Wake up when the alarm rings.','Wash your face and brush your teeth.','Get dressed in your school uniform.','Eat a healthy breakfast.','Pack your bag and head to school.'],
          shuffled:['Eat a healthy breakfast.','Wake up when the alarm rings.','Pack your bag and head to school.','Wash your face and brush your teeth.','Get dressed in your school uniform.']},
        ans:{order:['Wake up when the alarm rings.','Wash your face and brush your teeth.','Get dressed in your school uniform.','Eat a healthy breakfast.','Pack your bag and head to school.']}},
      {t:"Sam's Rainy Day",d:'Put these story sentences in the right order.',type:'sentence_sort',diff:'medium',xp:20,
        content:{instruction:'Drag the sentences to tell the story in the right order.',
          sentences:['Sam woke up early in the morning.','Outside, big dark clouds filled the sky.','She put on her raincoat and boots.','Sam splashed happily in every puddle she found.','When she got home, her mum made hot chocolate.'],
          shuffled:['She put on her raincoat and boots.','Sam splashed happily in every puddle she found.','Sam woke up early in the morning.','When she got home, her mum made hot chocolate.','Outside, big dark clouds filled the sky.']},
        ans:{order:['Sam woke up early in the morning.','Outside, big dark clouds filled the sky.','She put on her raincoat and boots.','Sam splashed happily in every puddle she found.','When she got home, her mum made hot chocolate.']}},
      {t:'The Lost Puppy',d:'Arrange these sentences to tell the story of a lost puppy.',type:'sentence_sort',diff:'medium',xp:20,
        content:{instruction:'Drag the sentences into the correct order to tell the story.',
          sentences:['A small puppy wandered away from its home.','It walked through the park, sniffing at everything.','A kind girl named Maya saw the puppy alone.','Maya looked at its collar and found the owner\'s address.','She walked the puppy home and the owner was very grateful.'],
          shuffled:['Maya looked at its collar and found the owner\'s address.','A small puppy wandered away from its home.','She walked the puppy home and the owner was very grateful.','It walked through the park, sniffing at everything.','A kind girl named Maya saw the puppy alone.']},
        ans:{order:['A small puppy wandered away from its home.','It walked through the park, sniffing at everything.','A kind girl named Maya saw the puppy alone.','Maya looked at its collar and found the owner\'s address.','She walked the puppy home and the owner was very grateful.']}},
      {t:'Baking a Cake',d:'Put the cake-baking steps in the correct order.',type:'sentence_sort',diff:'medium',xp:20,
        content:{instruction:'Drag the steps into the correct order to bake a cake.',
          sentences:['Gather your ingredients: flour, eggs, butter, and sugar.','Mix all the ingredients together in a large bowl.','Pour the batter into a greased baking tin.','Bake in the oven at 180°C for 30 minutes.','Let the cake cool before adding icing.'],
          shuffled:['Bake in the oven at 180°C for 30 minutes.','Gather your ingredients: flour, eggs, butter, and sugar.','Let the cake cool before adding icing.','Pour the batter into a greased baking tin.','Mix all the ingredients together in a large bowl.']},
        ans:{order:['Gather your ingredients: flour, eggs, butter, and sugar.','Mix all the ingredients together in a large bowl.','Pour the batter into a greased baking tin.','Bake in the oven at 180°C for 30 minutes.','Let the cake cool before adding icing.']}},
      {t:'A Trip to the Library',d:'Put these sentences about a library visit in the right order.',type:'sentence_sort',diff:'medium',xp:20,
        content:{instruction:'Drag the sentences into the correct order for a library visit.',
          sentences:['Leo and his dad arrived at the local library.','They walked through the shelves looking at book covers.','Leo picked out a book about dinosaurs.','He sat at a quiet table and read the first chapter.','They borrowed the book and walked home happy.'],
          shuffled:['He sat at a quiet table and read the first chapter.','Leo and his dad arrived at the local library.','They borrowed the book and walked home happy.','Leo picked out a book about dinosaurs.','They walked through the shelves looking at book covers.']},
        ans:{order:['Leo and his dad arrived at the local library.','They walked through the shelves looking at book covers.','Leo picked out a book about dinosaurs.','He sat at a quiet table and read the first chapter.','They borrowed the book and walked home happy.']}},
      {t:'Life of a Star',d:"Arrange the stages of a star's life cycle in the correct order.",type:'sentence_sort',diff:'hard',xp:35,
        content:{instruction:"Put the stages of a star's life cycle in the correct scientific order.",
          sentences:['A cloud of gas and dust called a nebula begins to collapse under gravity.','A protostar forms as the cloud heats up and begins to spin.','Nuclear fusion ignites and the star enters its main sequence phase.','The star expands into a red giant as it runs out of hydrogen fuel.','The outer layers are expelled, leaving behind a dense white dwarf.'],
          shuffled:['The outer layers are expelled, leaving behind a dense white dwarf.','A protostar forms as the cloud heats up and begins to spin.','The star expands into a red giant as it runs out of hydrogen fuel.','A cloud of gas and dust called a nebula begins to collapse under gravity.','Nuclear fusion ignites and the star enters its main sequence phase.']},
        ans:{order:['A cloud of gas and dust called a nebula begins to collapse under gravity.','A protostar forms as the cloud heats up and begins to spin.','Nuclear fusion ignites and the star enters its main sequence phase.','The star expands into a red giant as it runs out of hydrogen fuel.','The outer layers are expelled, leaving behind a dense white dwarf.']}},
      {t:'The Water Cycle',d:'Arrange the stages of the water cycle in the correct scientific order.',type:'sentence_sort',diff:'hard',xp:35,
        content:{instruction:'Put the stages of the water cycle in the correct order.',
          sentences:['Heat from the Sun causes water in rivers and oceans to evaporate.','Water vapour rises into the atmosphere and cools down.','The cooled vapour condenses to form clouds and water droplets.','Water droplets fall back to Earth as rain, snow, or hail.','The water flows into rivers and oceans, and the cycle begins again.'],
          shuffled:['The cooled vapour condenses to form clouds and water droplets.','The water flows into rivers and oceans, and the cycle begins again.','Heat from the Sun causes water in rivers and oceans to evaporate.','Water droplets fall back to Earth as rain, snow, or hail.','Water vapour rises into the atmosphere and cools down.']},
        ans:{order:['Heat from the Sun causes water in rivers and oceans to evaporate.','Water vapour rises into the atmosphere and cools down.','The cooled vapour condenses to form clouds and water droplets.','Water droplets fall back to Earth as rain, snow, or hail.','The water flows into rivers and oceans, and the cycle begins again.']}},
      {t:'How Volcanoes Erupt',d:'Arrange the stages of a volcanic eruption in the correct order.',type:'sentence_sort',diff:'hard',xp:35,
        content:{instruction:'Put the stages of a volcanic eruption in the correct order.',
          sentences:['Magma forms deep inside the Earth where temperatures are extremely high.','Pressure builds up as more magma collects in the magma chamber.','The pressure forces magma upward through cracks in the crust.','Magma reaches the surface and is now called lava.','The lava cools and hardens, forming new rock and land.'],
          shuffled:['The lava cools and hardens, forming new rock and land.','Pressure builds up as more magma collects in the magma chamber.','Magma forms deep inside the Earth where temperatures are extremely high.','Magma reaches the surface and is now called lava.','The pressure forces magma upward through cracks in the crust.']},
        ans:{order:['Magma forms deep inside the Earth where temperatures are extremely high.','Pressure builds up as more magma collects in the magma chamber.','The pressure forces magma upward through cracks in the crust.','Magma reaches the surface and is now called lava.','The lava cools and hardens, forming new rock and land.']}},
      {t:'The History of Writing',d:'Arrange the milestones in the history of writing in chronological order.',type:'sentence_sort',diff:'hard',xp:35,
        content:{instruction:'Put these milestones in the history of writing in the correct chronological order.',
          sentences:['Ancient Sumerians developed cuneiform, one of the earliest writing systems.','Egyptians created hieroglyphics using pictorial symbols.','The Phoenician alphabet was developed, using letters for sounds.','The Greek alphabet was adapted from Phoenician, adding vowel letters.','Johannes Gutenberg invented the printing press, making books widely available.'],
          shuffled:['The Greek alphabet was adapted from Phoenician, adding vowel letters.','Ancient Sumerians developed cuneiform, one of the earliest writing systems.','Johannes Gutenberg invented the printing press, making books widely available.','Egyptians created hieroglyphics using pictorial symbols.','The Phoenician alphabet was developed, using letters for sounds.']},
        ans:{order:['Ancient Sumerians developed cuneiform, one of the earliest writing systems.','Egyptians created hieroglyphics using pictorial symbols.','The Phoenician alphabet was developed, using letters for sounds.','The Greek alphabet was adapted from Phoenician, adding vowel letters.','Johannes Gutenberg invented the printing press, making books widely available.']}},

      /* ===== PICTURE WORD ===== */
      {t:'What Do You See?',d:'Look at each picture and pick the correct word.',type:'picture_word',diff:'easy',xp:10,
        content:{instruction:'Tap the word that matches each picture.',items:[
          {picture:'Sun.png',options:['Sun','Moon','Star','Cloud'],answer:'Sun'},
          {picture:'Ocean.png',options:['River','Lake','Ocean','Pond'],answer:'Ocean'},
          {picture:'4_0_rainbow.png',options:['Rainbow','Sunset','Storm','Cloud'],answer:'Rainbow'},
          {picture:'1_2_lion.png',options:['Tiger','Lion','Bear','Wolf'],answer:'Lion'},
          {picture:'3_0_apple.png',options:['Pear','Plum','Apple','Peach'],answer:'Apple'},
          {picture:'8_0_rocket.png',options:['Plane','Rocket','Balloon','Kite'],answer:'Rocket'},
        ]},ans:{answers:['Sun','Ocean','Rainbow','Lion','Apple','Rocket']}},
      {t:'Things at Home',d:'Name the everyday objects you find at home.',type:'picture_word',diff:'easy',xp:10,
        content:{instruction:'Tap the word that names each household object.',items:[
          {picture:'8_5_sofa.png',options:['Sofa','Table','Chair','Desk'],answer:'Sofa'},
          {picture:'Bathtub.png',options:['Shower','Bathtub','Sink','Basin'],answer:'Bathtub'},
          {picture:'8_3_window.png',options:['Door','Window','Wall','Roof'],answer:'Window'},
          {picture:'8_1_bulb.png',options:['Lamp','Bulb','Torch','Candle'],answer:'Bulb'},
          {picture:'8_4_tv.png',options:['Radio','Monitor','TV','Screen'],answer:'TV'},
          {picture:'8_2_plant.png',options:['Flower','Bush','Plant','Tree'],answer:'Plant'},
        ]},ans:{answers:['Sofa','Bathtub','Window','Bulb','TV','Plant']}},
      {t:'Food & Drinks',d:'Identify these common foods and drinks.',type:'picture_word',diff:'easy',xp:10,
        content:{instruction:'Tap the correct name for each food or drink.',items:[
          {picture:'3_3_pizza.png',options:['Burger','Taco','Pizza','Wrap'],answer:'Pizza'},
          {picture:'3_4_noodles.png',options:['Soup','Noodles','Rice','Porridge'],answer:'Noodles'},
          {picture:'Milk.png',options:['Water','Juice','Milk','Smoothie'],answer:'Milk'},
          {picture:'3_1_donut.png',options:['Bagel','Donut','Cookie','Muffin'],answer:'Donut'},
          {picture:'3_5_salad.png',options:['Stew','Salad','Sandwich','Wrap'],answer:'Salad'},
          {picture:'3_2_ice_cream.png',options:['Cake','Sorbet','Ice Cream','Yogurt'],answer:'Ice Cream'},
        ]},ans:{answers:['Pizza','Noodles','Milk','Donut','Salad','Ice Cream']}},
      {t:'Animals Around Us',d:'Name these common animals from the pictures.',type:'picture_word',diff:'easy',xp:10,
        content:{instruction:'Tap the correct animal name for each picture.',items:[
          {picture:'1_0_elephant.png',options:['Hippo','Rhino','Elephant','Giraffe'],answer:'Elephant'},
          {picture:'1_1_giraffe.png',options:['Camel','Giraffe','Horse','Deer'],answer:'Giraffe'},
          {picture:'1_3_penguin.png',options:['Toucan','Pelican','Penguin','Parrot'],answer:'Penguin'},
          {picture:'1_5_crocodile.png',options:['Lizard','Crocodile','Monitor','Gecko'],answer:'Crocodile'},
          {picture:'1_4_butterfly.png',options:['Moth','Dragonfly','Butterfly','Bee'],answer:'Butterfly'},
          {picture:'Dolphin.png',options:['Shark','Whale','Porpoise','Dolphin'],answer:'Dolphin'},
        ]},ans:{answers:['Elephant','Giraffe','Penguin','Crocodile','Butterfly','Dolphin']}},
      {t:'Action Words',d:'Look at each picture and choose the action it shows.',type:'picture_word',diff:'medium',xp:20,
        content:{instruction:'Choose the action word that best matches each picture.',items:[
          {picture:'7_1_running.png',options:['Walking','Running','Jumping','Sleeping'],answer:'Running'},
          {picture:'7_0_dancing.png',options:['Singing','Dancing','Drawing','Reading'],answer:'Dancing'},
          {picture:'7_5_jumping.png',options:['Tumbling','Jumping','Swimming','Climbing'],answer:'Jumping'},
          {picture:'Sleeping.png',options:['Resting','Thinking','Sleeping','Waiting'],answer:'Sleeping'},
          {picture:'Cooking.png',options:['Eating','Cooking','Baking','Grilling'],answer:'Cooking'},
          {picture:'Reading.png',options:['Writing','Drawing','Reading','Learning'],answer:'Reading'},
        ]},ans:{answers:['Running','Dancing','Jumping','Sleeping','Cooking','Reading']}},
      {t:'Feelings & Emotions',d:'Match each facial expression to the emotion it shows.',type:'picture_word',diff:'medium',xp:20,
        content:{instruction:'Tap the emotion that best describes each face.',items:[
          {picture:'2_0_happy.png',options:['Sad','Happy','Scared','Angry'],answer:'Happy'},
          {picture:'2_1_sad.png',options:['Happy','Sad','Shocked','Bored'],answer:'Sad'},
          {picture:'2_2_angry.png',options:['Jealous','Confused','Angry','Worried'],answer:'Angry'},
          {picture:'2_3_scared.png',options:['Anxious','Tired','Scared','Shy'],answer:'Scared'},
          {picture:'2_4_surprised.png',options:['Excited','Surprised','Confused','Happy'],answer:'Surprised'},
          {picture:'2_5_thinking.png',options:['Thinking','Worried','Bored','Sleepy'],answer:'Thinking'},
        ]},ans:{answers:['Happy','Sad','Angry','Scared','Surprised','Thinking']}},
      {t:'Weather Symbols',d:'Match each weather symbol to its correct weather type.',type:'picture_word',diff:'medium',xp:20,
        content:{instruction:'Tap the correct weather word for each symbol.',items:[
          {picture:'4_3_sunny.png',options:['Cloudy','Sunny','Windy','Foggy'],answer:'Sunny'},
          {picture:'4_1_rainy.png',options:['Drizzle','Hail','Rainy','Stormy'],answer:'Rainy'},
          {picture:'4_2_snowy.png',options:['Frosty','Snowy','Icy','Hailing'],answer:'Snowy'},
          {picture:'4_6_thunder.png',options:['Windy','Foggy','Thunder','Tornado'],answer:'Thunder'},
          {picture:'4_5_windy.png',options:['Breezy','Stormy','Windy','Gusty'],answer:'Windy'},
          {picture:'4_4_foggy.png',options:['Smoggy','Foggy','Misty','Cloudy'],answer:'Foggy'},
        ]},ans:{answers:['Sunny','Rainy','Snowy','Thunder','Windy','Foggy']}},
      {t:'Sports & Activities',d:'Name the sport or activity shown in each picture.',type:'picture_word',diff:'medium',xp:20,
        content:{instruction:'Tap the name of the sport or activity in each picture.',items:[
          {picture:'7_8_football.png',options:['Rugby','Football','Basketball','Volleyball'],answer:'Football'},
          {picture:'7_2_swimming.png',options:['Diving','Surfing','Swimming','Rowing'],answer:'Swimming'},
          {picture:'7_6_tennis.png',options:['Badminton','Squash','Tennis','Ping Pong'],answer:'Tennis'},
          {picture:'7_3_cycling.png',options:['Skating','Running','Cycling','Jogging'],answer:'Cycling'},
          {picture:'7_4_boxing.png',options:['Karate','Boxing','Wrestling','Judo'],answer:'Boxing'},
          {picture:'7_7_archery.png',options:['Javelin','Fencing','Archery','Shooting'],answer:'Archery'},
        ]},ans:{answers:['Football','Swimming','Tennis','Cycling','Boxing','Archery']}},
      {t:'Science & Nature',d:'Match each nature symbol to the correct scientific term.',type:'picture_word',diff:'hard',xp:30,
        content:{instruction:'Pick the correct scientific word for each picture.',items:[
          {picture:'8_7_volcano.png',options:['Earthquake','Volcano','Geyser','Crater'],answer:'Volcano'},
          {picture:'4_7_lightning.png',options:['Thunder','Lightning','Static','Energy'],answer:'Lightning'},
          {picture:'8_6_telescope.png',options:['Microscope','Periscope','Telescope','Binoculars'],answer:'Telescope'},
          {picture:'Magnet.png',options:['Battery','Conductor','Magnet','Circuit'],answer:'Magnet'},
          {picture:'Thermometer.png',options:['Barometer','Thermometer','Compass','Scale'],answer:'Thermometer'},
          {picture:'Bacteria.png',options:['Cell','Virus','Bacteria','Microbe'],answer:'Bacteria'},
        ]},ans:{answers:['Volcano','Lightning','Telescope','Magnet','Thermometer','Bacteria']}},
      {t:'Musical Instruments',d:'Identify each musical instrument from its picture.',type:'picture_word',diff:'hard',xp:30,
        content:{instruction:'Tap the correct instrument name for each picture.',items:[
          {picture:'5_0_guitar.png',options:['Banjo','Ukulele','Guitar','Mandolin'],answer:'Guitar'},
          {picture:'5_4_violin.png',options:['Cello','Viola','Violin','Fiddle'],answer:'Violin'},
          {picture:'5_2_drums.png',options:['Bongos','Drums','Timbales','Snare'],answer:'Drums'},
          {picture:'5_3_trumpet.png',options:['Trombone','Bugle','Trumpet','Flugelhorn'],answer:'Trumpet'},
          {picture:'5_1_piano.png',options:['Organ','Keyboard','Piano','Harpsichord'],answer:'Piano'},
          {picture:'Accordion.png',options:['Concertina','Harmonica','Accordion','Melodeon'],answer:'Accordion'},
        ]},ans:{answers:['Guitar','Violin','Drums','Trumpet','Piano','Accordion']}},
      {t:'World Landmarks',d:'Identify these famous world landmarks from their pictures.',type:'picture_word',diff:'hard',xp:30,
        content:{instruction:'Pick the correct name for each world landmark.',items:[
          {picture:'6_2_eiffel_tower.png',options:['Big Ben','Eiffel Tower','Burj Khalifa','Tokyo Tower'],answer:'Eiffel Tower'},
          {picture:'6_3_statue_of_liberty.png',options:['Angel of North','Christ Redeemer','Statue of Liberty','Colossus'],answer:'Statue of Liberty'},
          {picture:'6_0_castle.png',options:['Palace','Temple','Castle','Fortress'],answer:'Castle'},
          {picture:'6_5_torri_gate.png',options:['Pagoda','Shrine','Torii Gate','Temple Gate'],answer:'Torii Gate'},
          {picture:'6_1_mosque.png',options:['Cathedral','Mosque','Synagogue','Basilica'],answer:'Mosque'},
          {picture:'6_4_temple.png',options:['Museum','Parliament','Temple','Library'],answer:'Temple'},
        ]},ans:{answers:['Eiffel Tower','Statue of Liberty','Castle','Torii Gate','Mosque','Temple']}},
      {t:'Maths & Symbols',d:'Match each maths symbol to its correct name.',type:'picture_word',diff:'hard',xp:30,
        content:{instruction:'Tap the correct name for each mathematical symbol.',items:[
          {picture:'9_0_plus.png',options:['Minus','Plus','Multiply','Divide'],answer:'Plus'},
          {picture:'9_1_minus.png',options:['Plus','Minus','Divide','Equals'],answer:'Minus'},
          {picture:'9_2_multiply.png',options:['Divide','Add','Multiply','Power'],answer:'Multiply'},
          {picture:'9_3_divide.png',options:['Minus','Fraction','Divide','Ratio'],answer:'Divide'},
          {picture:'9_4_equals.png',options:['Similar','Equals','Identical','Approx'],answer:'Equals'},
          {picture:'9_5_set_square.png',options:['Compass','Protractor','Set Square','Ruler'],answer:'Set Square'},
        ]},ans:{answers:['Plus','Minus','Multiply','Divide','Equals','Set Square']}},

      /* ===== PICTURE CHOICE — all options use { picture: 'filename.png', label: '...' } ===== */

      // easy
      {t:'What Lives There?',d:'Look at the question and choose the correct picture answer.',type:'picture_choice',diff:'easy',xp:12,
        content:{
          instruction:'Read the question carefully, then tap the correct picture!',
          questions:[
            {text:'Which animal lives in the ocean?',
              options:[
                {picture:'Dolphin.png',       label:'Dolphin'},
                {picture:'1_0_elephant.png',  label:'Elephant'},
                {picture:'1_2_lion.png',      label:'Lion'},
                {picture:'1_1_giraffe.png',   label:'Giraffe'},
              ],
              answer:'Dolphin.png'},
            {text:'Which animal lives in the forest?',
              options:[
                {picture:'3_0_apple.png',     label:'Apple'},
                {picture:'1_2_lion.png',      label:'Lion'},
                {picture:'Dolphin.png',       label:'Dolphin'},
                {picture:'1_5_crocodile.png', label:'Crocodile'},
              ],
              answer:'1_2_lion.png'},
            {text:'Which animal can fly?',
              options:[
                {picture:'1_5_crocodile.png', label:'Crocodile'},
                {picture:'1_0_elephant.png',  label:'Elephant'},
                {picture:'1_4_butterfly.png', label:'Butterfly'},
                {picture:'1_1_giraffe.png',   label:'Giraffe'},
              ],
              answer:'1_4_butterfly.png'},
            {text:'Which animal is the largest land animal?',
              options:[
                {picture:'Dolphin.png',       label:'Dolphin'},
                {picture:'1_2_lion.png',      label:'Lion'},
                {picture:'1_0_elephant.png',  label:'Elephant'},
                {picture:'1_5_crocodile.png', label:'Crocodile'},
              ],
              answer:'1_0_elephant.png'},
          ],
        },
        ans:{answers:['Dolphin.png','1_2_lion.png','1_4_butterfly.png','1_0_elephant.png']}},

      // medium
      {t:'Science Pictures',d:'Answer science questions by choosing the correct image.',type:'picture_choice',diff:'medium',xp:22,
        content:{
          instruction:'Read each science question and pick the correct picture!',
          questions:[
            {text:'Which shows rain falling from clouds?',
              options:[
                {picture:'4_1_rainy.png',    label:'Rainy'},
                {picture:'4_3_sunny.png',    label:'Sunny'},
                {picture:'4_2_snowy.png',    label:'Snowy'},
                {picture:'4_7_lightning.png',label:'Lightning'},
              ],
              answer:'4_1_rainy.png'},
            {text:'What do plants need to make food through photosynthesis?',
              options:[
                {picture:'4_3_sunny.png',    label:'Sunlight'},
                {picture:'4_4_foggy.png',    label:'Fog'},
                {picture:'4_7_lightning.png',label:'Lightning'},
                {picture:'4_2_snowy.png',    label:'Snow'},
              ],
              answer:'4_3_sunny.png'},
            {text:'Which picture shows a solid state of matter?',
              options:[
                {picture:'Milk.png',         label:'Liquid'},
                {picture:'4_2_snowy.png',    label:'Ice / Solid'},
                {picture:'4_5_windy.png',    label:'Gas'},
                {picture:'4_1_rainy.png',    label:'Rain'},
              ],
              answer:'4_2_snowy.png'},
            {text:'What do you use to measure temperature?',
              options:[
                {picture:'Thermometer.png',  label:'Thermometer'},
                {picture:'8_0_rocket.png',   label:'Rocket'},
                {picture:'8_2_plant.png',    label:'Plant'},
                {picture:'9_5_set_square.png',label:'Set Square'},
              ],
              answer:'Thermometer.png'},
            {text:'Which shows a source of natural light and energy?',
              options:[
                {picture:'4_3_sunny.png',    label:'Sun'},
                {picture:'4_4_foggy.png',    label:'Fog'},
                {picture:'4_2_snowy.png',    label:'Snow'},
                {picture:'Milk.png',         label:'Milk'},
              ],
              answer:'4_3_sunny.png'},
          ],
        },
        ans:{answers:['4_1_rainy.png','4_3_sunny.png','4_2_snowy.png','Thermometer.png','4_3_sunny.png']}},

      // hard
      {t:'Geography & World',d:'Identify places and things in the world from descriptions.',type:'picture_choice',diff:'hard',xp:32,
        content:{
          instruction:'Read each geography question and pick the correct picture!',
          questions:[
            {text:'Which shows a volcanic eruption — a tectonic event?',
              options:[
                {picture:'4_0_rainbow.png',          label:'Rainbow'},
                {picture:'8_7_volcano.png',          label:'Volcano'},
                {picture:'4_1_rainy.png',            label:'Rain'},
                {picture:'4_5_windy.png',            label:'Wind'},
              ],
              answer:'8_7_volcano.png'},
            {text:'Which famous landmark is a giant tower in Paris?',
              options:[
                {picture:'6_1_mosque.png',           label:'Mosque'},
                {picture:'6_0_castle.png',           label:'Castle'},
                {picture:'6_2_eiffel_tower.png',     label:'Eiffel Tower'},
                {picture:'6_3_statue_of_liberty.png',label:'Statue of Liberty'},
              ],
              answer:'6_2_eiffel_tower.png'},
            {text:'Which shows a place of Islamic worship?',
              options:[
                {picture:'6_4_temple.png',           label:'Temple'},
                {picture:'6_0_castle.png',           label:'Castle'},
                {picture:'6_5_torri_gate.png',       label:'Torii Gate'},
                {picture:'6_1_mosque.png',           label:'Mosque'},
              ],
              answer:'6_1_mosque.png'},
            {text:'Which landmark is found in New York, USA?',
              options:[
                {picture:'6_2_eiffel_tower.png',     label:'Eiffel Tower'},
                {picture:'6_3_statue_of_liberty.png',label:'Statue of Liberty'},
                {picture:'6_5_torri_gate.png',       label:'Torii Gate'},
                {picture:'6_0_castle.png',           label:'Castle'},
              ],
              answer:'6_3_statue_of_liberty.png'},
            {text:'Which shows the traditional Japanese gate?',
              options:[
                {picture:'6_4_temple.png',           label:'Temple'},
                {picture:'6_1_mosque.png',           label:'Mosque'},
                {picture:'6_5_torri_gate.png',       label:'Torii Gate'},
                {picture:'6_0_castle.png',           label:'Castle'},
              ],
              answer:'6_5_torri_gate.png'},
          ],
        },
        ans:{answers:['8_7_volcano.png','6_2_eiffel_tower.png','6_1_mosque.png','6_3_statue_of_liberty.png','6_5_torri_gate.png']}},

      // hard 2
      {t:'History & Culture',d:'Choose the correct picture for each history and culture question.',type:'picture_choice',diff:'hard',xp:32,
        content:{
          instruction:'Read each history or culture question and pick the right picture!',
          questions:[
            {text:'Which instrument is played in classical orchestras with a bow?',
              options:[
                {picture:'5_0_guitar.png',   label:'Guitar'},
                {picture:'5_2_drums.png',    label:'Drums'},
                {picture:'5_4_violin.png',   label:'Violin'},
                {picture:'5_1_piano.png',    label:'Piano'},
              ],
              answer:'5_4_violin.png'},
            {text:'Which instrument has black and white keys?',
              options:[
                {picture:'5_3_trumpet.png',  label:'Trumpet'},
                {picture:'5_1_piano.png',    label:'Piano'},
                {picture:'5_0_guitar.png',   label:'Guitar'},
                {picture:'Accordion.png',    label:'Accordion'},
              ],
              answer:'5_1_piano.png'},
            {text:'Which instrument uses a mouthpiece and is made of brass?',
              options:[
                {picture:'5_4_violin.png',   label:'Violin'},
                {picture:'5_0_guitar.png',   label:'Guitar'},
                {picture:'5_3_trumpet.png',  label:'Trumpet'},
                {picture:'5_2_drums.png',    label:'Drums'},
              ],
              answer:'5_3_trumpet.png'},
            {text:'Which famous landmark represents freedom in the USA?',
              options:[
                {picture:'6_2_eiffel_tower.png',     label:'Eiffel Tower'},
                {picture:'6_0_castle.png',           label:'Castle'},
                {picture:'6_1_mosque.png',           label:'Mosque'},
                {picture:'6_3_statue_of_liberty.png',label:'Statue of Liberty'},
              ],
              answer:'6_3_statue_of_liberty.png'},
            {text:'Which instrument do you hit with sticks?',
              options:[
                {picture:'5_4_violin.png',   label:'Violin'},
                {picture:'5_1_piano.png',    label:'Piano'},
                {picture:'5_2_drums.png',    label:'Drums'},
                {picture:'Accordion.png',    label:'Accordion'},
              ],
              answer:'5_2_drums.png'},
          ],
        },
        ans:{answers:['5_4_violin.png','5_1_piano.png','5_3_trumpet.png','6_3_statue_of_liberty.png','5_2_drums.png']}},

    ]; // end acts

    await client.query('DELETE FROM activities');
    for (const a of acts) {
      await client.query(
        `INSERT INTO activities (title,description,type,difficulty,content,correct_answer,xp_reward)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [a.t, a.d, a.type, a.diff, JSON.stringify(a.content), JSON.stringify(a.ans), a.xp]
      );
    }
    console.log(`[DB] ✅ ${acts.length} activities seeded`);

  } catch (err) {
    console.error('[DB] Setup error:', err.message);
    throw err;
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
}).catch(err => {
  console.error('[Fatal] DB setup failed:', err.message);
  process.exit(1);
});

module.exports = app;