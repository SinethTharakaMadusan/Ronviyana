/**
 * Ronviana — Analytics Routes (Admin)
 * Powers charts, overview cards, and trend breakdowns
 */
const express = require('express');
const { requireAuth, getDb } = require('../middleware/auth');
const router = express.Router();

// ─── DASHBOARD OVERVIEW ───────────────────────────────────
router.get('/dashboard', requireAuth, (req, res) => {
  const db = getDb();
  try {
    const totalWallpapers = db.prepare('SELECT COUNT(*) as count FROM wallpapers WHERE is_published = 1').get().count;
    const totalDrafts = db.prepare('SELECT COUNT(*) as count FROM wallpapers WHERE is_published = 0').get().count;
    const totalCategories = db.prepare('SELECT COUNT(*) as count FROM categories WHERE is_active = 1').get().count;
    const totalCollections = db.prepare('SELECT COUNT(*) as count FROM collections').get().count;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(downloads), 0) as totalDownloads,
        COALESCE(SUM(views), 0) as totalViews,
        COALESCE(SUM(favorites), 0) as totalFavorites,
        COALESCE(SUM(file_size), 0) as totalStorageBytes
      FROM wallpapers
    `).get();

    // Today's stats
    const todayDownloads = db.prepare(`
      SELECT COUNT(*) as count FROM download_logs
      WHERE date(created_at) = date('now')
    `).get().count;

    const todayViews = db.prepare(`
      SELECT COUNT(*) as count FROM view_logs
      WHERE date(created_at) = date('now')
    `).get().count;

    // Recent 5 uploads
    const recentWallpapers = db.prepare(`
      SELECT w.id, w.title, w.slug, w.thumbnail_url, w.resolution, w.downloads, w.views, w.created_at,
             c.name as category_name
      FROM wallpapers w
      LEFT JOIN categories c ON c.id = w.category_id
      ORDER BY w.created_at DESC
      LIMIT 5
    `).all();

    // Recent 5 activity logs
    const recentActivity = db.prepare(`
      SELECT a.*, adm.name as admin_name
      FROM activity_logs a
      LEFT JOIN admins adm ON adm.id = a.admin_id
      ORDER BY a.created_at DESC
      LIMIT 6
    `).all();

    db.close();

    res.json({
      overview: {
        totalWallpapers,
        totalDrafts,
        totalCategories,
        totalCollections,
        totalUsers,
        totalDownloads: totals.totalDownloads,
        totalViews: totals.totalViews,
        totalFavorites: totals.totalFavorites,
        totalStorageBytes: totals.totalStorageBytes,
        todayDownloads,
        todayViews
      },
      recentWallpapers,
      recentActivity
    });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── TIME SERIES TRENDS (DOWNLOADS & VIEWS) ───────────────
router.get('/trends', requireAuth, (req, res) => {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days) || 14));
  const db = getDb();

  try {
    // Generate dates for the past N days
    const downloadTrends = db.prepare(`
      SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count
      FROM download_logs
      WHERE created_at >= date('now', '-' || ? || ' days')
      GROUP BY strftime('%Y-%m-%d', created_at)
      ORDER BY date ASC
    `).all(days);

    const viewTrends = db.prepare(`
      SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count
      FROM view_logs
      WHERE created_at >= date('now', '-' || ? || ' days')
      GROUP BY strftime('%Y-%m-%d', created_at)
      ORDER BY date ASC
    `).all(days);

    db.close();

    res.json({
      days,
      downloads: downloadTrends,
      views: viewTrends
    });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── TOP PERFORMING WALLPAPERS ────────────────────────────
router.get('/popular', requireAuth, (req, res) => {
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit) || 10));
  const metric = req.query.metric || 'downloads'; // downloads | views | favorites
  const allowedMetrics = ['downloads', 'views', 'favorites'];
  const sortCol = allowedMetrics.includes(metric) ? metric : 'downloads';

  const db = getDb();
  try {
    const items = db.prepare(`
      SELECT w.id, w.title, w.slug, w.thumbnail_url, w.downloads, w.views, w.favorites, w.resolution,
             c.name as category_name
      FROM wallpapers w
      LEFT JOIN categories c ON c.id = w.category_id
      WHERE w.is_published = 1
      ORDER BY w.${sortCol} DESC
      LIMIT ?
    `).all(limit);

    db.close();
    res.json({ metric: sortCol, items });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── CATEGORY & DEVICE BREAKDOWN ──────────────────────────
router.get('/breakdown', requireAuth, (req, res) => {
  const db = getDb();
  try {
    const categories = db.prepare(`
      SELECT c.name, COUNT(w.id) as count, COALESCE(SUM(w.downloads), 0) as total_downloads
      FROM categories c
      LEFT JOIN wallpapers w ON w.category_id = c.id
      GROUP BY c.id
      ORDER BY count DESC
      LIMIT 10
    `).all();

    const devices = db.prepare(`
      SELECT device, COUNT(*) as count
      FROM wallpapers
      GROUP BY device
      ORDER BY count DESC
    `).all();

    const resolutions = db.prepare(`
      SELECT resolution, COUNT(*) as count
      FROM wallpapers
      GROUP BY resolution
      ORDER BY count DESC
    `).all();

    db.close();
    res.json({ categories, devices, resolutions });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
