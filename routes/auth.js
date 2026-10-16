/**
 * Ronviana — Auth Routes
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/me
 * PUT  /api/auth/profile
 * PUT  /api/auth/password
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requireAuth, logActivity, getDb, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// ─── LOGIN ─────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email.trim().toLowerCase());
  db.close();

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  logActivity(admin.id, 'Admin login', 'auth', null, `Logged in`, req);

  res.json({
    token,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      profile_image: admin.profile_image
    }
  });
});

// ─── LOGOUT ────────────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  logActivity(req.admin.id, 'Admin logout', 'auth', null, 'Logged out', req);
  res.json({ message: 'Logged out successfully' });
});

// ─── GET CURRENT ADMIN ─────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ admin: req.admin });
});

// ─── UPDATE PROFILE ────────────────────────────────────────
router.put('/profile', requireAuth, (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const db = getDb();
  try {
    db.prepare('UPDATE admins SET name = ?, email = ?, updated_at = datetime("now") WHERE id = ?')
      .run(name.trim(), email.trim().toLowerCase(), req.admin.id);

    const updated = db.prepare('SELECT id, name, email, profile_image, created_at FROM admins WHERE id = ?')
      .get(req.admin.id);
    db.close();

    logActivity(req.admin.id, 'Profile updated', 'admin', req.admin.id, `Updated profile`, req);
    res.json({ admin: updated });
  } catch (e) {
    db.close();
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─── CHANGE PASSWORD ───────────────────────────────────────
router.put('/password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const db = getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);

  if (!bcrypt.compareSync(current_password, admin.password_hash)) {
    db.close();
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = bcrypt.hashSync(new_password, 12);
  db.prepare('UPDATE admins SET password_hash = ?, updated_at = datetime("now") WHERE id = ?')
    .run(hash, req.admin.id);
  db.close();

  logActivity(req.admin.id, 'Password changed', 'admin', req.admin.id, 'Changed password', req);
  res.json({ message: 'Password updated successfully' });
});

module.exports = router;
