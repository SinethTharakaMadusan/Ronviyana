/**
 * Ronviana — Collection Routes (Admin)
 */
const express = require('express');
const { requireAuth, logActivity, getDb } = require('../middleware/auth');
const router = express.Router();

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── LIST COLLECTIONS ──────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  try {
    const collections = db.prepare(`
      SELECT c.*, COUNT(cw.wallpaper_id) as wallpaper_count
      FROM collections c
      LEFT JOIN collection_wallpapers cw ON cw.collection_id = c.id
      GROUP BY c.id
      ORDER BY c.display_order ASC, c.created_at DESC
    `).all();

    // Attach up to 4 thumbnail previews for each collection
    const getPreviews = db.prepare(`
      SELECT w.id, w.title, w.thumbnail_url, w.image_url
      FROM collection_wallpapers cw
      JOIN wallpapers w ON w.id = cw.wallpaper_id
      WHERE cw.collection_id = ?
      ORDER BY cw.display_order ASC
      LIMIT 4
    `);

    collections.forEach(col => {
      col.previews = getPreviews.all(col.id);
    });

    db.close();
    res.json({ collections });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── GET SINGLE COLLECTION ────────────────────────────────
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  try {
    const col = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
    if (!col) {
      db.close();
      return res.status(404).json({ error: 'Collection not found' });
    }

    const wallpapers = db.prepare(`
      SELECT w.*, cw.display_order as item_order
      FROM collection_wallpapers cw
      JOIN wallpapers w ON w.id = cw.wallpaper_id
      WHERE cw.collection_id = ?
      ORDER BY cw.display_order ASC
    `).all(req.params.id);

    col.wallpapers = wallpapers;
    col.wallpaper_count = wallpapers.length;
    db.close();
    res.json({ collection: col });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE COLLECTION ────────────────────────────────────
router.post('/', requireAuth, (req, res) => {
  const { name, description, cover_image, is_published, wallpapers } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Collection name is required' });

  const db = getDb();
  try {
    let baseSlug = slug(name.trim());
    let finalSlug = baseSlug;
    let count = 1;
    while (db.prepare('SELECT id FROM collections WHERE slug = ?').get(finalSlug)) {
      finalSlug = `${baseSlug}-${count++}`;
    }

    const maxOrder = db.prepare('SELECT MAX(display_order) as m FROM collections').get();
    const order = (maxOrder.m || 0) + 1;

    const insertStmt = db.prepare(`
      INSERT INTO collections (name, slug, description, cover_image, is_published, display_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      name.trim(),
      finalSlug,
      description || '',
      cover_image || null,
      is_published !== undefined ? (is_published ? 1 : 0) : 1,
      order
    );

    const collectionId = result.lastInsertRowid;

    // Attach wallpapers if supplied
    if (Array.isArray(wallpapers) && wallpapers.length > 0) {
      const insertCw = db.prepare(`
        INSERT OR IGNORE INTO collection_wallpapers (collection_id, wallpaper_id, display_order)
        VALUES (?, ?, ?)
      `);
      wallpapers.forEach((wId, idx) => {
        insertCw.run(collectionId, wId, idx + 1);
      });
    }

    const created = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId);
    db.close();

    logActivity(req.admin.id, 'Collection created', 'collection', collectionId, `Created collection "${name}"`, req);
    res.status(201).json({ collection: created, message: 'Collection created successfully' });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE COLLECTION ────────────────────────────────────
router.put('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, description, cover_image, is_published, display_order, wallpapers } = req.body;

  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return res.status(404).json({ error: 'Collection not found' });
    }

    let colSlug = existing.slug;
    if (name && name.trim() !== existing.name) {
      let baseSlug = slug(name.trim());
      colSlug = baseSlug;
      let count = 1;
      while (db.prepare('SELECT id FROM collections WHERE slug = ? AND id != ?').get(colSlug, id)) {
        colSlug = `${baseSlug}-${count++}`;
      }
    }

    db.prepare(`
      UPDATE collections SET
        name = ?,
        slug = ?,
        description = ?,
        cover_image = ?,
        is_published = ?,
        display_order = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ? name.trim() : existing.name,
      colSlug,
      description !== undefined ? description : existing.description,
      cover_image !== undefined ? cover_image : existing.cover_image,
      is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published,
      display_order !== undefined ? display_order : existing.display_order,
      id
    );

    // If wallpapers array is provided, replace relations
    if (Array.isArray(wallpapers)) {
      db.prepare('DELETE FROM collection_wallpapers WHERE collection_id = ?').run(id);
      const insertCw = db.prepare(`
        INSERT OR IGNORE INTO collection_wallpapers (collection_id, wallpaper_id, display_order)
        VALUES (?, ?, ?)
      `);
      wallpapers.forEach((wId, idx) => {
        insertCw.run(id, wId, idx + 1);
      });
    }

    const updated = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
    db.close();

    logActivity(req.admin.id, 'Collection updated', 'collection', id, `Updated collection "${updated.name}"`, req);
    res.json({ collection: updated, message: 'Collection updated successfully' });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE COLLECTION ────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return res.status(404).json({ error: 'Collection not found' });
    }

    db.prepare('DELETE FROM collection_wallpapers WHERE collection_id = ?').run(id);
    db.prepare('DELETE FROM collections WHERE id = ?').run(id);
    db.close();

    logActivity(req.admin.id, 'Collection deleted', 'collection', id, `Deleted collection "${existing.name}"`, req);
    res.json({ message: 'Collection deleted successfully' });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── BATCH REORDER COLLECTIONS ────────────────────────────
router.put('/reorder/batch', requireAuth, (req, res) => {
  const { order } = req.body; // Array of { id, display_order }
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'Order array required' });
  }

  const db = getDb();
  try {
    const updateStmt = db.prepare('UPDATE collections SET display_order = ? WHERE id = ?');
    db.transaction(() => {
      order.forEach(item => updateStmt.run(item.display_order, item.id));
    })();
    db.close();
    res.json({ message: 'Collections reordered successfully' });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
