/**
 * Ronviana — Homepage Management Routes (Admin)
 * Allows customizing sections, hero banner text, featured wallpaper lists, etc.
 */
const express = require('express');
const { requireAuth, logActivity, getDb } = require('../middleware/auth');
const router = express.Router();

// ─── GET HOMEPAGE SECTIONS ────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  try {
    const sections = db.prepare(`
      SELECT * FROM homepage_sections
      ORDER BY display_order ASC
    `).all();

    // Parse JSON config if string
    sections.forEach(s => {
      try {
        s.config = JSON.parse(s.config || '{}');
      } catch (e) {
        s.config = {};
      }
    });

    db.close();
    res.json({ sections });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE HOMEPAGE SECTION ──────────────────────────────
router.put('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { title, description, is_enabled, display_order, config } = req.body;

  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM homepage_sections WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return res.status(404).json({ error: 'Section not found' });
    }

    const configStr = config ? (typeof config === 'object' ? JSON.stringify(config) : config) : existing.config;

    db.prepare(`
      UPDATE homepage_sections SET
        title = ?,
        description = ?,
        is_enabled = ?,
        display_order = ?,
        config = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title !== undefined ? title : existing.title,
      description !== undefined ? description : existing.description,
      is_enabled !== undefined ? (is_enabled ? 1 : 0) : existing.is_enabled,
      display_order !== undefined ? display_order : existing.display_order,
      configStr,
      id
    );

    const updated = db.prepare('SELECT * FROM homepage_sections WHERE id = ?').get(id);
    try { updated.config = JSON.parse(updated.config); } catch (e) {}

    db.close();
    logActivity(req.admin.id, 'Homepage section updated', 'homepage', id, `Updated section "${updated.title}"`, req);

    res.json({ section: updated, message: 'Homepage section updated successfully' });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── BATCH REORDER SECTIONS ───────────────────────────────
router.put('/reorder/batch', requireAuth, (req, res) => {
  const { sections } = req.body; // Array of { id, display_order, is_enabled }
  if (!Array.isArray(sections)) {
    return res.status(400).json({ error: 'Sections array is required' });
  }

  const db = getDb();
  try {
    const updateStmt = db.prepare(`
      UPDATE homepage_sections SET
        display_order = ?,
        is_enabled = COALESCE(?, is_enabled),
        updated_at = datetime('now')
      WHERE id = ?
    `);

    db.transaction(() => {
      sections.forEach(s => {
        const enabled = s.is_enabled !== undefined ? (s.is_enabled ? 1 : 0) : null;
        updateStmt.run(s.display_order, enabled, s.id);
      });
    })();

    db.close();
    logActivity(req.admin.id, 'Homepage layout reordered', 'homepage', null, 'Batch reordered homepage sections', req);

    res.json({ message: 'Homepage sections reordered successfully' });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
