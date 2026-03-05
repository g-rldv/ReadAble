// ============================================================
// Database Connection Pool (PostgreSQL via pg)
// ============================================================
const { Pool } = require('pg');

// Render.com provides DATABASE_URL as a connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false } // Render uses self-signed certs
    : false,
  max: 10,          // max pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection errors without crashing
pool.on('error', (err) => {
  console.error('[DB Pool Error]', err.message);
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('[DB] Failed to connect:', err.message);
  } else {
    console.log('[DB] PostgreSQL connected successfully');
    release();
  }
});

module.exports = pool;
