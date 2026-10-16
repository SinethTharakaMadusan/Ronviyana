/**
 * Ronviana — Auth Middleware
 * Verifies JWT tokens and attaches admin data to requests.
 */

const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const defaultDbPath = fs.existsSync(path.join(__dirname, '..', 'data', 'ronviana.db'))
  ? path.join(__dirname, '..', 'data', 'ronviana.db')
  : path.join(__dirname, '..', 'data', 'wallora.db');
const DB_PATH = process.env.DB_PATH || defaultDbPath;
const JWT_SECRET = process.env.JWT_SECRET || 'ronviana-dev-secret-change-me';

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  return db;
}

/**
 * Middleware that requires a valid JWT token.
 * Attaches `req.admin` with the admin record.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const admin = db.prepare('SELECT id, name, email, profile_image, created_at FROM admins WHERE id = ?').get(payload.adminId);
    db.close();

    if (!admin) {
      return res.status(401).json({ error: 'Admin not found' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Logs an admin action to the activity_logs table.
 */
function logActivity(adminId, action, entity, entityId, details, req) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO activity_logs (admin_id, action, entity, entity_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId, action, entity || null, entityId || null,
      details || null,
      req ? (req.ip || req.connection?.remoteAddress || null) : null,
      req ? (req.headers['user-agent'] || null) : null
    );
    db.close();
  } catch (e) {
    console.error('Activity log error:', e.message);
  }
}

module.exports = { requireAuth, logActivity, getDb, JWT_SECRET };
