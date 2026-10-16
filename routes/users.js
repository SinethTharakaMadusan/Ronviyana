/**
 * Ronviana — User Management Routes (Admin)
 */
const express = require('express');
const { requireAuth, logActivity, getDb } = require('../middleware/auth');
const router = express.Router();

// ─── LIST USERS ───────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const status = req.query.status !== undefined && req.query.status !== '' ? parseInt(req.query.status) : null;

    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push('(u.email LIKE ? OR u.username LIKE ?)');
      params.push(search, search);
    }
    if (status !== null && !isNaN(status)) {
      whereClauses.push('u.is_active = ?');
      params.push(status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM users u ${whereSql}`).get(...params);
    const total = countRow.total;

    const query = `
      SELECT u.id, u.email, u.username, u.is_active, u.created_at, u.updated_at,
             COUNT(DISTINCT f.id) as favorites_count,
             COUNT(DISTINCT d.id) as downloads_count
      FROM users u
      LEFT JOIN user_favorites f ON f.user_id = u.id
      LEFT JOIN download_logs d ON d.user_id = u.id
      ${whereSql}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const users = db.prepare(query).all(...params, limit, offset);
    db.close();

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── GET SINGLE USER DETAILS ──────────────────────────────
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  try {
    const user = db.prepare(`
      SELECT u.id, u.email, u.username, u.is_active, u.created_at, u.updated_at,
             COUNT(DISTINCT f.id) as favorites_count,
             COUNT(DISTINCT d.id) as downloads_count
      FROM users u
      LEFT JOIN user_favorites f ON f.user_id = u.id
      LEFT JOIN download_logs d ON d.user_id = u.id
      WHERE u.id = ?
      GROUP BY u.id
    `).get(req.params.id);

    if (!user) {
      db.close();
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's recent favorites
    const favorites = db.prepare(`
      SELECT w.id, w.title, w.thumbnail_url, w.slug, f.created_at as favorited_at
      FROM user_favorites f
      JOIN wallpapers w ON w.id = f.wallpaper_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT 10
    `).all(user.id);

    // Get user's recent downloads
    const downloads = db.prepare(`
      SELECT w.id, w.title, w.thumbnail_url, w.slug, d.created_at as downloaded_at
      FROM download_logs d
      JOIN wallpapers w ON w.id = d.wallpaper_id
      WHERE d.user_id = ?
      ORDER BY d.created_at DESC
      LIMIT 10
    `).all(user.id);

    user.recent_favorites = favorites;
    user.recent_downloads = downloads;

    db.close();
    res.json({ user });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── TOGGLE USER ACTIVE STATUS ────────────────────────────
router.put('/:id/status', requireAuth, (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  const db = getDb();
  try {
    const user = db.prepare('SELECT id, email, is_active FROM users WHERE id = ?').get(id);
    if (!user) {
      db.close();
      return res.status(404).json({ error: 'User not found' });
    }

    const newStatus = is_active !== undefined ? (is_active ? 1 : 0) : (user.is_active ? 0 : 1);

    db.prepare('UPDATE users SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(newStatus, id);

    db.close();
    logActivity(
      req.admin.id,
      newStatus ? 'User activated' : 'User deactivated',
      'user',
      id,
      `${newStatus ? 'Activated' : 'Deactivated'} user ${user.email}`,
      req
    );

    res.json({ message: `User status changed to ${newStatus ? 'active' : 'inactive'}`, is_active: newStatus });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE USER ──────────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  try {
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(id);
    if (!user) {
      db.close();
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('DELETE FROM user_favorites WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM download_logs WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    db.close();

    logActivity(req.admin.id, 'User deleted', 'user', id, `Deleted user ${user.email}`, req);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
