/**
 * Ronviana — Wallpaper Routes (Admin)
 * GET    /api/wallpapers          — List with pagination/filters
 * GET    /api/wallpapers/:id      — Single wallpaper
 * POST   /api/wallpapers          — Create
 * PUT    /api/wallpapers/:id      — Update
 * DELETE /api/wallpapers/:id      — Delete + cleanup
 * PUT    /api/wallpapers/:id/status — Toggle flags
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireAuth, logActivity, getDb } = require('../middleware/auth');
const { UPLOAD_DIR } = require('./upload');

const router = express.Router();

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── LIST WALLPAPERS ───────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const device = req.query.device || '';
    const resolution = req.query.resolution || '';
    const status = req.query.status || '';
    const sort = req.query.sort || 'newest';

    let where = [];
    let params = [];

    if (search) {
      where.push(`(w.title LIKE ? OR w.description LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      where.push(`c.name = ?`);
      params.push(category);
    }
    if (device) {
      where.push(`w.device = ?`);
      params.push(device);
    }
    if (resolution) {
      where.push(`w.resolution = ?`);
      params.push(resolution);
    }
    if (status === 'published') where.push(`w.is_published = 1`);
    if (status === 'draft') where.push(`w.is_published = 0`);
    if (status === 'featured') where.push(`w.is_featured = 1`);
    if (status === 'popular') where.push(`w.is_popular = 1`);
    if (status === 'new') where.push(`w.is_new = 1`);

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const orderMap = {
      newest: 'w.created_at DESC',
      oldest: 'w.created_at ASC',
      title: 'w.title ASC',
      downloads: 'w.downloads DESC',
      favorites: 'w.favorites DESC',
      views: 'w.views DESC'
    };
    const orderBy = orderMap[sort] || orderMap.newest;

    const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM wallpapers w
      LEFT JOIN categories c ON w.category_id = c.id
      ${whereClause}
    `).get(...params);

    const rows = db.prepare(`
      SELECT w.*, c.name as category_name, c.slug as category_slug
      FROM wallpapers w
      LEFT JOIN categories c ON w.category_id = c.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    // Get tags for each wallpaper
    const getTagsStmt = db.prepare(`
      SELECT t.name FROM tags t
      JOIN wallpaper_tags wt ON t.id = wt.tag_id
      WHERE wt.wallpaper_id = ?
    `);

    const wallpapers = rows.map(w => ({
      ...w,
      tags: getTagsStmt.all(w.id).map(t => t.name)
    }));

    db.close();

    res.json({
      wallpapers,
      pagination: {
        page,
        limit,
        total: countRow.total,
        pages: Math.ceil(countRow.total / limit)
      }
    });
  } catch (err) {
    db.close();
    console.error('List wallpapers error:', err);
    res.status(500).json({ error: 'Failed to fetch wallpapers' });
  }
});

// ─── GET SINGLE WALLPAPER ──────────────────────────────────
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const w = db.prepare(`
    SELECT w.*, c.name as category_name
    FROM wallpapers w
    LEFT JOIN categories c ON w.category_id = c.id
    WHERE w.id = ?
  `).get(req.params.id);

  if (!w) { db.close(); return res.status(404).json({ error: 'Wallpaper not found' }); }

  const tags = db.prepare(`
    SELECT t.id, t.name FROM tags t
    JOIN wallpaper_tags wt ON t.id = wt.tag_id
    WHERE wt.wallpaper_id = ?
  `).all(w.id);

  db.close();
  res.json({ wallpaper: { ...w, tags } });
});

// ─── CREATE WALLPAPER ──────────────────────────────────────
router.post('/', requireAuth, (req, res) => {
  const { title, description, image_url, thumbnail_url, storage_key,
          category_id, resolution, device, orientation, file_type,
          file_size, width, height, is_featured, is_popular, is_new,
          is_published, tags } = req.body;

  if (!title || !image_url || !thumbnail_url || !category_id) {
    return res.status(400).json({ error: 'Title, image, thumbnail, and category are required' });
  }

  const db = getDb();
  try {
    // Check category exists
    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!cat) { db.close(); return res.status(400).json({ error: 'Category not found' }); }

    const wallSlug = slug(title) + '-' + Date.now().toString(36);

    const result = db.prepare(`
      INSERT INTO wallpapers (title, slug, description, image_url, thumbnail_url, storage_key,
        category_id, resolution, device, orientation, file_type, file_size, width, height,
        is_featured, is_popular, is_new, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(), wallSlug, description || '', image_url, thumbnail_url,
      storage_key || '', category_id, resolution || 'HD', device || 'Universal',
      orientation || 'Portrait', file_type || 'JPG', file_size || 0,
      width || 0, height || 0, is_featured ? 1 : 0, is_popular ? 1 : 0,
      is_new !== false ? 1 : 0, is_published !== false ? 1 : 0
    );

    // Handle tags
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const findTag = db.prepare(`SELECT id FROM tags WHERE name = ?`);
      const createTag = db.prepare(`INSERT INTO tags (name, slug) VALUES (?, ?)`);
      const linkTag = db.prepare(`INSERT OR IGNORE INTO wallpaper_tags (wallpaper_id, tag_id) VALUES (?, ?)`);

      tags.forEach(tagName => {
        let tag = findTag.get(tagName.trim().toLowerCase());
        if (!tag) {
          const r = createTag.run(tagName.trim().toLowerCase(), slug(tagName));
          tag = { id: r.lastInsertRowid };
        }
        linkTag.run(result.lastInsertRowid, tag.id);
      });
    }

    const created = db.prepare(`
      SELECT w.*, c.name as category_name
      FROM wallpapers w
      LEFT JOIN categories c ON w.category_id = c.id
      WHERE w.id = ?
    `).get(result.lastInsertRowid);

    db.close();

    logActivity(req.admin.id, 'Wallpaper uploaded', 'wallpaper', created.id, `Uploaded "${title}"`, req);
    res.status(201).json({ wallpaper: created });
  } catch (err) {
    db.close();
    console.error('Create wallpaper error:', err);
    res.status(500).json({ error: 'Failed to create wallpaper' });
  }
});

// ─── UPDATE WALLPAPER ──────────────────────────────────────
router.put('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM wallpapers WHERE id = ?').get(req.params.id);
  if (!existing) { db.close(); return res.status(404).json({ error: 'Wallpaper not found' }); }

  const { title, description, image_url, thumbnail_url, storage_key,
          category_id, resolution, device, orientation, file_type,
          file_size, width, height, is_featured, is_popular, is_new,
          is_published, tags } = req.body;

  try {
    db.prepare(`
      UPDATE wallpapers SET
        title = ?, description = ?, image_url = ?, thumbnail_url = ?,
        storage_key = ?, category_id = ?, resolution = ?, device = ?,
        orientation = ?, file_type = ?, file_size = ?, width = ?, height = ?,
        is_featured = ?, is_popular = ?, is_new = ?, is_published = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      (title || existing.title).trim(),
      description !== undefined ? description : existing.description,
      image_url || existing.image_url,
      thumbnail_url || existing.thumbnail_url,
      storage_key || existing.storage_key,
      category_id || existing.category_id,
      resolution || existing.resolution,
      device || existing.device,
      orientation || existing.orientation,
      file_type || existing.file_type,
      file_size !== undefined ? file_size : existing.file_size,
      width !== undefined ? width : existing.width,
      height !== undefined ? height : existing.height,
      is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
      is_popular !== undefined ? (is_popular ? 1 : 0) : existing.is_popular,
      is_new !== undefined ? (is_new ? 1 : 0) : existing.is_new,
      is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published,
      req.params.id
    );

    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      db.prepare(`DELETE FROM wallpaper_tags WHERE wallpaper_id = ?`).run(req.params.id);
      const findTag = db.prepare(`SELECT id FROM tags WHERE name = ?`);
      const createTag = db.prepare(`INSERT INTO tags (name, slug) VALUES (?, ?)`);
      const linkTag = db.prepare(`INSERT OR IGNORE INTO wallpaper_tags (wallpaper_id, tag_id) VALUES (?, ?)`);

      tags.forEach(tagName => {
        let tag = findTag.get(tagName.trim().toLowerCase());
        if (!tag) {
          const r = createTag.run(tagName.trim().toLowerCase(), slug(tagName));
          tag = { id: r.lastInsertRowid };
        }
        linkTag.run(parseInt(req.params.id), tag.id);
      });
    }

    // If image was replaced, delete old files
    if (image_url && image_url !== existing.image_url && existing.storage_key) {
      const oldPath = path.join(UPLOAD_DIR, existing.storage_key);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      // Old thumbnail
      const oldThumb = existing.thumbnail_url.split('/').pop();
      const oldThumbPath = path.join(UPLOAD_DIR, 'thumbnails', oldThumb);
      if (fs.existsSync(oldThumbPath)) fs.unlinkSync(oldThumbPath);
    }

    const updated = db.prepare(`
      SELECT w.*, c.name as category_name
      FROM wallpapers w LEFT JOIN categories c ON w.category_id = c.id
      WHERE w.id = ?
    `).get(req.params.id);

    db.close();

    logActivity(req.admin.id, 'Wallpaper edited', 'wallpaper', updated.id, `Edited "${updated.title}"`, req);
    res.json({ wallpaper: updated });
  } catch (err) {
    db.close();
    console.error('Update wallpaper error:', err);
    res.status(500).json({ error: 'Failed to update wallpaper' });
  }
});

// ─── DELETE WALLPAPER ──────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const w = db.prepare('SELECT * FROM wallpapers WHERE id = ?').get(req.params.id);
  if (!w) { db.close(); return res.status(404).json({ error: 'Wallpaper not found' }); }

  try {
    // Delete from database (cascades to tags, collections, favorites, etc.)
    db.prepare('DELETE FROM wallpapers WHERE id = ?').run(req.params.id);
    db.close();

    // Delete files
    if (w.storage_key) {
      const imgPath = path.join(UPLOAD_DIR, w.storage_key);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    if (w.thumbnail_url) {
      const thumbFile = w.thumbnail_url.split('/').pop();
      const thumbPath = path.join(UPLOAD_DIR, 'thumbnails', thumbFile);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    }

    logActivity(req.admin.id, 'Wallpaper deleted', 'wallpaper', w.id, `Deleted "${w.title}"`, req);
    res.json({ message: 'Wallpaper deleted successfully' });
  } catch (err) {
    db.close();
    console.error('Delete wallpaper error:', err);
    res.status(500).json({ error: 'Failed to delete wallpaper' });
  }
});

// ─── TOGGLE STATUS FLAGS ───────────────────────────────────
router.put('/:id/status', requireAuth, (req, res) => {
  const { field, value } = req.body;
  const allowed = ['is_featured', 'is_popular', 'is_new', 'is_published'];
  if (!allowed.includes(field)) {
    return res.status(400).json({ error: 'Invalid status field' });
  }

  const db = getDb();
  const w = db.prepare('SELECT * FROM wallpapers WHERE id = ?').get(req.params.id);
  if (!w) { db.close(); return res.status(404).json({ error: 'Wallpaper not found' }); }

  db.prepare(`UPDATE wallpapers SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(value ? 1 : 0, req.params.id);

  const updated = db.prepare('SELECT * FROM wallpapers WHERE id = ?').get(req.params.id);
  db.close();

  const label = field.replace('is_', '');
  logActivity(req.admin.id, `Wallpaper ${label} ${value ? 'enabled' : 'disabled'}`,
    'wallpaper', w.id, `${value ? 'Set' : 'Removed'} ${label} on "${w.title}"`, req);

  res.json({ wallpaper: updated });
});

module.exports = router;
