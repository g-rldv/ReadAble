// ============================================================
// Auth Middleware — validates JWT on protected routes
// ============================================================
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'readable-dev-secret-change-in-production';

/**
 * Middleware: requires valid Bearer token in Authorization header.
 * Attaches decoded user payload to req.user.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, email, level }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware: optionally attaches user if token present, but doesn't block.
 * Used for routes accessible to both guests and logged-in users.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (_) {
      // ignore invalid tokens for optional routes
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
