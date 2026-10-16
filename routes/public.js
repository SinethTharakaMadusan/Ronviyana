/**
 * Ronviana — Public API Routes
 * No authentication required. Serves the public website (Ronviana/index.html).
 */
const express = require('express');
const { getDb } = require('../middleware/auth');
const router = express.Router();

// ─── GET PUBLIC WALLPAPERS ────────────────────────────────
router.get('/wallpapers', (req, res) => {
  const db = getDb();
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 24));
    const offset = (page - 1) * limit;

    const categorySlug = req.query.category;
    const device = req.query.device;
    const resolution = req.query.resolution;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const sort = req.query.sort || 'newest'; // newest, popular, downloads, featured

    let whereClauses = ['w.is_published = 1'];
    let params = [];

    if (categorySlug && categorySlug !== 'all') {
      whereClauses.push('c.slug = ?');
      params.push(categorySlug);
    }
    if (device && device !== 'all') {
      whereClauses.push('w.device = ?');
      params.push(device);
    }
    if (resolution && resolution !== 'all') {
      whereClauses.push('w.resolution = ?');
      params.push(resolution);
    }
    if (search) {
      whereClauses.push('(w.title LIKE ? OR w.description LIKE ? OR c.name LIKE ?)');
      params.push(search, search, search);
    }

    let orderBy = 'w.created_at DESC';
    if (sort === 'popular') orderBy = 'w.is_popular DESC, w.downloads DESC';
    else if (sort === 'downloads') orderBy = 'w.downloads DESC';
    else if (sort === 'views') orderBy = 'w.views DESC';
    else if (sort === 'featured') orderBy = 'w.is_featured DESC, w.created_at DESC';

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM wallpapers w
      LEFT JOIN categories c ON c.id = w.category_id
      ${whereSql}
    `).get(...params);

    const wallpapers = db.prepare(`
      SELECT w.id, w.title, w.slug, w.description, w.image_url, w.thumbnail_url,
             w.resolution, w.device, w.orientation, w.file_type, w.file_size,
             w.width, w.height, w.downloads, w.favorites, w.views,
             w.is_featured, w.is_popular, w.is_new, w.created_at,
             c.name as category_name, c.slug as category_slug
      FROM wallpapers w
      LEFT JOIN categories c ON c.id = w.category_id
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    db.close();

    res.json({
      wallpapers,
      pagination: {
        page,
        limit,
        total: countRow.total,
        totalPages: Math.ceil(countRow.total / limit)
      }
    });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── GET SINGLE PUBLIC WALLPAPER ──────────────────────────
router.get('/wallpapers/:idOrSlug', (req, res) => {
  const { idOrSlug } = req.params;
  const db = getDb();
  try {
    const isNum = /^\d+$/.test(idOrSlug);
    const wallpaper = db.prepare(`
      SELECT w.*, c.name as category_name, c.slug as category_slug
      FROM wallpapers w
      LEFT JOIN categories c ON c.id = w.category_id
      WHERE ${isNum ? 'w.id = ?' : 'w.slug = ?'} AND w.is_published = 1
    `).get(idOrSlug);

    if (!wallpaper) {
      db.close();
      return res.status(404).json({ error: 'Wallpaper not found' });
    }

    // Get tags
    const tags = db.prepare(`
      SELECT t.name, t.slug
      FROM tags t
      JOIN wallpaper_tags wt ON wt.tag_id = t.id
      WHERE wt.wallpaper_id = ?
    `).all(wallpaper.id);

    wallpaper.tags = tags;

    // Get related wallpapers from same category
    const related = db.prepare(`
      SELECT id, title, slug, thumbnail_url, resolution, downloads
      FROM wallpapers
      WHERE category_id = ? AND id != ? AND is_published = 1
      ORDER BY downloads DESC
      LIMIT 4
    `).all(wallpaper.category_id, wallpaper.id);

    wallpaper.related = related;

    db.close();
    res.json({ wallpaper });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── GET PUBLIC CATEGORIES ────────────────────────────────
router.get('/categories', (req, res) => {
  const db = getDb();
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(w.id) as wallpaper_count
      FROM categories c
      LEFT JOIN wallpapers w ON w.category_id = c.id AND w.is_published = 1
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.display_order ASC
    `).all();

    db.close();
    res.json({ categories });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── GET PUBLIC COLLECTIONS ───────────────────────────────
router.get('/collections', (req, res) => {
  const db = getDb();
  try {
    const collections = db.prepare(`
      SELECT c.*, COUNT(cw.wallpaper_id) as wallpaper_count
      FROM collections c
      LEFT JOIN collection_wallpapers cw ON cw.collection_id = c.id
      JOIN wallpapers w ON w.id = cw.wallpaper_id AND w.is_published = 1
      WHERE c.is_published = 1
      GROUP BY c.id
      ORDER BY c.display_order ASC
    `).all();

    const getPreviews = db.prepare(`
      SELECT w.id, w.title, w.thumbnail_url, w.slug
      FROM collection_wallpapers cw
      JOIN wallpapers w ON w.id = cw.wallpaper_id
      WHERE cw.collection_id = ? AND w.is_published = 1
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

// ─── GET PUBLIC HOMEPAGE CONFIG ───────────────────────────
router.get('/homepage', (req, res) => {
  const db = getDb();
  try {
    const sections = db.prepare(`
      SELECT * FROM homepage_sections
      WHERE is_enabled = 1
      ORDER BY display_order ASC
    `).all();

    sections.forEach(s => {
      try { s.config = JSON.parse(s.config || '{}'); } catch (e) { s.config = {}; }
    });

    // Site settings
    const settingsRows = db.prepare(`
      SELECT key, value FROM settings
      WHERE group_name IN ('general', 'appearance')
    `).all();

    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    db.close();
    res.json({ sections, settings });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── TRACK DOWNLOAD ───────────────────────────────────────
router.post('/download/:id', (req, res) => {
  const wallpaperId = parseInt(req.params.id);
  const { sessionId, userId } = req.body || {};
  const ip = req.ip || req.connection?.remoteAddress || null;

  const db = getDb();
  try {
    // Increment wallpaper count
    db.prepare('UPDATE wallpapers SET downloads = downloads + 1 WHERE id = ?').run(wallpaperId);

    // Insert log
    db.prepare(`
      INSERT INTO download_logs (wallpaper_id, user_id, session_id, ip_address)
      VALUES (?, ?, ?, ?)
    `).run(wallpaperId, userId || null, sessionId || null, ip);

    const updated = db.prepare('SELECT id, downloads, image_url FROM wallpapers WHERE id = ?').get(wallpaperId);
    db.close();

    res.json({ success: true, downloads: updated?.downloads, downloadUrl: updated?.image_url });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── TRACK VIEW ───────────────────────────────────────────
router.post('/view/:id', (req, res) => {
  const wallpaperId = parseInt(req.params.id);
  const { sessionId } = req.body || {};
  const ip = req.ip || req.connection?.remoteAddress || null;

  const db = getDb();
  try {
    db.prepare('UPDATE wallpapers SET views = views + 1 WHERE id = ?').run(wallpaperId);
    db.prepare(`
      INSERT INTO view_logs (wallpaper_id, session_id, ip_address)
      VALUES (?, ?, ?)
    `).run(wallpaperId, sessionId || null, ip);

    db.close();
    res.json({ success: true });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── TOGGLE FAVORITE ──────────────────────────────────────
router.post('/favorite/:id', (req, res) => {
  const wallpaperId = parseInt(req.params.id);
  const { sessionId, userId } = req.body || {};

  if (!sessionId && !userId) {
    return res.status(400).json({ error: 'Session ID or User ID is required' });
  }

  const db = getDb();
  try {
    // Check if favorited
    let existing;
    if (userId) {
      existing = db.prepare('SELECT id FROM user_favorites WHERE user_id = ? AND wallpaper_id = ?').get(userId, wallpaperId);
    } else {
      existing = db.prepare('SELECT id FROM user_favorites WHERE session_id = ? AND wallpaper_id = ?').get(sessionId, wallpaperId);
    }

    let isFavorited = false;
    if (existing) {
      // Remove favorite
      db.prepare('DELETE FROM user_favorites WHERE id = ?').run(existing.id);
      db.prepare('UPDATE wallpapers SET favorites = MAX(0, favorites - 1) WHERE id = ?').run(wallpaperId);
      isFavorited = false;
    } else {
      // Add favorite
      db.prepare(`
        INSERT INTO user_favorites (user_id, session_id, wallpaper_id)
        VALUES (?, ?, ?)
      `).run(userId || null, sessionId || null, wallpaperId);
      db.prepare('UPDATE wallpapers SET favorites = favorites + 1 WHERE id = ?').run(wallpaperId);
      isFavorited = true;
    }

    const updated = db.prepare('SELECT favorites FROM wallpapers WHERE id = ?').get(wallpaperId);
    db.close();

    res.json({ success: true, isFavorited, totalFavorites: updated?.favorites });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
