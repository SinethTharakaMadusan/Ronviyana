/**
 * Ronviana — Settings Routes (Admin)
 * Manages site configurations, SEO metadata, download rules, and storage options
 */
const express = require('express');
const { requireAuth, logActivity, getDb } = require('../middleware/auth');
const router = express.Router();

// ─── GET ALL SETTINGS ──────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  try {
    const rows = db.prepare('SELECT key, value, group_name, updated_at FROM settings ORDER BY group_name, key').all();
    db.close();

    const settings = {};
    const grouped = {};

    rows.forEach(r => {
      let val = r.value;
      // Parse JSON if possible
      try {
        if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
          val = JSON.parse(val);
        }
      } catch (e) {}

      settings[r.key] = val;
      if (!grouped[r.group_name]) grouped[r.group_name] = {};
      grouped[r.group_name][r.key] = val;
    });

    res.json({ settings, grouped });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// ─── BATCH UPDATE SETTINGS ────────────────────────────────
router.put('/', requireAuth, (req, res) => {
  const updates = req.body; // { key: value, ... } or { settings: { ... } }
  const data = updates.settings || updates;

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Settings object is required' });
  }

  const db = getDb();
  try {
    const updateStmt = db.prepare(`
      INSERT INTO settings (key, value, group_name, updated_at)
      VALUES (?, ?, COALESCE((SELECT group_name FROM settings WHERE key = ?), 'general'), datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now')
    `);

    db.transaction(() => {
      for (const [key, value] of Object.entries(data)) {
        const valStr = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
        updateStmt.run(key, valStr, key);
      }
    })();

    db.close();

    logActivity(
      req.admin.id,
      'Settings updated',
      'settings',
      null,
      `Updated ${Object.keys(data).length} configuration keys`,
      req
    );

    res.json({ message: 'Settings saved successfully' });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
