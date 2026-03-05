// ============================================================
// ReadAble Backend - Express API Server
// ============================================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Route imports
const authRoutes = require('./routes/auth');
const activitiesRoutes = require('./routes/activities');
const progressRoutes = require('./routes/progress');
const settingsRoutes = require('./routes/settings');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ──────────────────────────────────────
app.use(helmet());

// CORS: allow frontend origin (set via env or wildcard in dev)
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ReadAble API', timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 ReadAble API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
