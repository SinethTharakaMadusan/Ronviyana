/**
 * Ronviana — Category Routes (Admin)
 */
const express = require('express');
const { requireAuth, logActivity, getDb } = require('../middleware/auth');
const router = express.Router();

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── LIST CATEGORIES ───────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const cats = db.prepare(`
    SELECT c.*, COUNT(w.id) as wallpaper_count
    FROM categories c
    LEFT JOIN wallpapers w ON w.category_id = c.id
    GROUP BY c.id
    ORDER BY c.display_order ASC
  `).all();
  db.close();
  res.json({ categories: cats });
});

// ─── GET SINGLE CATEGORY ──────────────────────────────────
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const cat = db.prepare(`
    SELECT c.*, COUNT(w.id) as wallpaper_count
    FROM categories c
    LEFT JOIN wallpapers w ON w.category_id = c.id
    WHERE c.id = ?
    GROUP BY c.id
  `).get(req.params.id);
  db.close();
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  res.json({ category: cat });
});

// ─── CREATE CATEGORY ───────────────────────────────────────
router.post('/', requireAuth, (req, res) => {
  const { name, description, cover_image, icon, is_active } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const db = getDb();
  try {
    const maxOrder = db.prepare('SELECT MAX(display_order) as m FROM categories').get();
    const order = (maxOrder.m || 0) + 1;

    const result = db.prepare(`
      INSERT INTO categories (name, slug, description, cover_image, icon, display_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name.trim(), slug(name), description || '', cover_image || null,
           icon || null, order, is_active !== false ? 1 : 0);

    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    db.close();

    logActivity(req.admin.id, 'Category created', 'category', created.id, `Created "${name}"`, req);
    res.status(201).json({ category: created });
  } catch (err) {
    db.close();
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ─── UPDATE CATEGORY ───────────────────────────────────────
router.put('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) { db.close(); return res.status(404).json({ error: 'Category not found' }); }

  const { name, description, cover_image, icon, is_active } = req.body;

  try {
    db.prepare(`
      UPDATE categories SET name = ?, slug = ?, description = ?, cover_image = ?,
        icon = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      (name || existing.name).trim(),
      slug(name || existing.name),
      description !== undefined ? description : existing.description,
      cover_image !== undefined ? cover_image : existing.cover_image,
      icon !== undefined ? icon : existing.icon,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    db.close();

    logActivity(req.admin.id, 'Category edited', 'category', updated.id, `Edited "${updated.name}"`, req);
    res.json({ category: updated });
  } catch (err) {
    db.close();
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// ─── DELETE CATEGORY ───────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) { db.close(); return res.status(404).json({ error: 'Category not found' }); }

  const count = db.prepare('SELECT COUNT(*) as c FROM wallpapers WHERE category_id = ?').get(req.params.id);

  if (count.c > 0 && !req.body.force) {
    // If move_to_category_id is provided, move wallpapers there
    if (req.body.move_to_category_id) {
      const target = db.prepare('SELECT id FROM categories WHERE id = ?').get(req.body.move_to_category_id);
      if (!target) { db.close(); return res.status(400).json({ error: 'Target category not found' }); }
      db.prepare('UPDATE wallpapers SET category_id = ? WHERE category_id = ?')
        .run(req.body.move_to_category_id, req.params.id);
    } else {
      db.close();
      return res.status(409).json({
        error: 'Category has wallpapers',
        wallpaper_count: count.c,
        message: `This category contains ${count.c} wallpaper(s). Move them to another category or force delete.`
      });
    }
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  db.close();

  logActivity(req.admin.id, 'Category deleted', 'category', cat.id, `Deleted "${cat.name}"`, req);
  res.json({ message: 'Category deleted successfully' });
});

// ─── REORDER CATEGORIES ───────────────────────────────────
router.put('/reorder/batch', requireAuth, (req, res) => {
  const { order } = req.body; // Array of { id, display_order }
  if (!order || !Array.isArray(order)) {
    return res.status(400).json({ error: 'Order array is required' });
  }

  const db = getDb();
  const stmt = db.prepare('UPDATE categories SET display_order = ? WHERE id = ?');
  const update = db.transaction((items) => {
    items.forEach(item => stmt.run(item.display_order, item.id));
  });
  update(order);
  db.close();

  logActivity(req.admin.id, 'Categories reordered', 'category', null, 'Reordered categories', req);
  res.json({ message: 'Categories reordered' });
});

module.exports = router;
