/**
 * Ronviana — Activity Logs Route (Admin)
 * Provides audit trail for administrative actions
 */
const express = require('express');
const { requireAuth, getDb } = require('../middleware/auth');
const router = express.Router();

// ─── LIST ACTIVITY LOGS ───────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const action = req.query.action ? req.query.action.trim() : null;
    const entity = req.query.entity ? req.query.entity.trim() : null;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;

    let whereClauses = [];
    let params = [];

    if (action) {
      whereClauses.push('a.action LIKE ?');
      params.push(`%${action}%`);
    }
    if (entity) {
      whereClauses.push('a.entity = ?');
      params.push(entity);
    }
    if (search) {
      whereClauses.push('(a.details LIKE ? OR a.action LIKE ? OR adm.name LIKE ? OR a.ip_address LIKE ?)');
      params.push(search, search, search, search);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM activity_logs a
      LEFT JOIN admins adm ON adm.id = a.admin_id
      ${whereSql}
    `).get(...params);

    const total = countRow.total;

    const logs = db.prepare(`
      SELECT a.*, adm.name as admin_name, adm.email as admin_email, adm.profile_image as admin_avatar
      FROM activity_logs a
      LEFT JOIN admins adm ON adm.id = a.admin_id
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    db.close();

    res.json({
      logs,
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

module.exports = router;
