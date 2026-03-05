// ============================================================
// Database Migration Runner
// Run: node db/migrations/run.js
// ============================================================
require('dotenv').config({ path: '../../.env' });
const pool = require('../index');

const MIGRATION_SQL = `
-- ============================================================
-- ReadAble Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users Table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(50) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  level       INTEGER DEFAULT 1,
  xp          INTEGER DEFAULT 0,          -- experience points
  streak      INTEGER DEFAULT 0,          -- daily login streak
  achievements JSONB DEFAULT '[]',        -- array of achievement IDs
  avatar      VARCHAR(50) DEFAULT 'star', -- emoji avatar key
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Activities Table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  type          VARCHAR(50) NOT NULL,     -- 'word_match','fill_blank','sentence_sort','picture_word'
  difficulty    VARCHAR(20) DEFAULT 'easy', -- 'easy','medium','hard'
  content       JSONB NOT NULL,           -- game-specific data (words, options, etc.)
  correct_answer JSONB NOT NULL,          -- expected answer(s)
  xp_reward     INTEGER DEFAULT 10,       -- XP granted on correct answer
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── User Progress Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_progress (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
  score       INTEGER DEFAULT 0,          -- percentage 0-100
  attempts    INTEGER DEFAULT 0,
  completed   BOOLEAN DEFAULT FALSE,
  feedback    TEXT,
  last_played TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, activity_id)            -- one progress row per user per activity
);

-- ── Settings Table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  text_size   VARCHAR(20) DEFAULT 'medium', -- 'small','medium','large','xlarge'
  theme       VARCHAR(20) DEFAULT 'light',  -- 'light','dark','high-contrast'
  tts_enabled BOOLEAN DEFAULT TRUE,
  tts_voice   VARCHAR(100) DEFAULT '',
  tts_rate    FLOAT DEFAULT 0.9,
  tts_pitch   FLOAT DEFAULT 1.0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Badges / Achievements Table ──────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id          SERIAL PRIMARY KEY,
  key         VARCHAR(50) UNIQUE NOT NULL, -- internal identifier
  title       VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon        VARCHAR(10) NOT NULL,        -- emoji
  condition   JSONB NOT NULL               -- { type: 'xp'|'streak'|'level', threshold: N }
);

-- ── Indexes for Performance ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_activity_id ON user_progress(activity_id);
CREATE INDEX IF NOT EXISTS idx_activities_difficulty ON activities(difficulty);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`;

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('[Migration] Running database migrations...');
    await client.query(MIGRATION_SQL);
    console.log('[Migration] ✅ Schema created successfully');
  } catch (err) {
    console.error('[Migration] ❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
