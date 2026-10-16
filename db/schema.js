/**
 * Ronviana — Database Schema
 * Creates all tables, indexes, and triggers for the Ronviana platform.
 * Run: node db/schema.js
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Ensure data directory exists
const DB_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const defaultDbPath = fs.existsSync(path.join(DB_DIR, 'ronviana.db'))
  ? path.join(DB_DIR, 'ronviana.db')
  : path.join(DB_DIR, 'wallora.db');
const DB_PATH = process.env.DB_PATH || defaultDbPath;
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── ADMINS ────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL DEFAULT 'Admin',
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    profile_image TEXT    DEFAULT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── CATEGORIES ────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL UNIQUE,
    slug          TEXT    NOT NULL UNIQUE,
    description   TEXT    DEFAULT '',
    cover_image   TEXT    DEFAULT NULL,
    icon          TEXT    DEFAULT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
  CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(display_order);
`);

// ─── WALLPAPERS ────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS wallpapers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT    NOT NULL,
    slug          TEXT    NOT NULL UNIQUE,
    description   TEXT    DEFAULT '',
    image_url     TEXT    NOT NULL,
    thumbnail_url TEXT    NOT NULL,
    storage_key   TEXT    NOT NULL,
    category_id   INTEGER NOT NULL,
    resolution    TEXT    NOT NULL DEFAULT 'HD',
    device        TEXT    NOT NULL DEFAULT 'Universal',
    orientation   TEXT    NOT NULL DEFAULT 'Portrait',
    file_type     TEXT    NOT NULL DEFAULT 'JPG',
    file_size     INTEGER NOT NULL DEFAULT 0,
    width         INTEGER NOT NULL DEFAULT 0,
    height        INTEGER NOT NULL DEFAULT 0,
    downloads     INTEGER NOT NULL DEFAULT 0,
    favorites     INTEGER NOT NULL DEFAULT 0,
    views         INTEGER NOT NULL DEFAULT 0,
    is_featured   INTEGER NOT NULL DEFAULT 0,
    is_popular    INTEGER NOT NULL DEFAULT 0,
    is_new        INTEGER NOT NULL DEFAULT 1,
    is_published  INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
  );
  CREATE INDEX IF NOT EXISTS idx_wallpapers_slug ON wallpapers(slug);
  CREATE INDEX IF NOT EXISTS idx_wallpapers_category ON wallpapers(category_id);
  CREATE INDEX IF NOT EXISTS idx_wallpapers_published ON wallpapers(is_published);
  CREATE INDEX IF NOT EXISTS idx_wallpapers_featured ON wallpapers(is_featured);
  CREATE INDEX IF NOT EXISTS idx_wallpapers_popular ON wallpapers(is_popular);
  CREATE INDEX IF NOT EXISTS idx_wallpapers_new ON wallpapers(is_new);
  CREATE INDEX IF NOT EXISTS idx_wallpapers_downloads ON wallpapers(downloads DESC);
  CREATE INDEX IF NOT EXISTS idx_wallpapers_created ON wallpapers(created_at DESC);
`);

// ─── TAGS ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL UNIQUE,
    slug  TEXT    NOT NULL UNIQUE
  );
  CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
`);

// ─── WALLPAPER_TAGS ────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS wallpaper_tags (
    wallpaper_id INTEGER NOT NULL,
    tag_id       INTEGER NOT NULL,
    PRIMARY KEY (wallpaper_id, tag_id),
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)       REFERENCES tags(id)       ON DELETE CASCADE
  );
`);

// ─── COLLECTIONS ───────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    slug          TEXT    NOT NULL UNIQUE,
    description   TEXT    DEFAULT '',
    cover_image   TEXT    DEFAULT NULL,
    is_published  INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── COLLECTION_WALLPAPERS ─────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS collection_wallpapers (
    collection_id INTEGER NOT NULL,
    wallpaper_id  INTEGER NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_id, wallpaper_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (wallpaper_id)  REFERENCES wallpapers(id)  ON DELETE CASCADE
  );
`);

// ─── USERS ─────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    username      TEXT    DEFAULT NULL,
    password_hash TEXT    DEFAULT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

// ─── FAVORITES ─────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS user_favorites (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER DEFAULT NULL,
    session_id   TEXT    DEFAULT NULL,
    wallpaper_id INTEGER NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE,
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_favorites_wallpaper ON user_favorites(wallpaper_id);
  CREATE INDEX IF NOT EXISTS idx_favorites_user ON user_favorites(user_id);
`);

// ─── DOWNLOADS ─────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS download_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    wallpaper_id INTEGER NOT NULL,
    user_id      INTEGER DEFAULT NULL,
    session_id   TEXT    DEFAULT NULL,
    ip_address   TEXT    DEFAULT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_downloads_wallpaper ON download_logs(wallpaper_id);
  CREATE INDEX IF NOT EXISTS idx_downloads_date ON download_logs(created_at);
`);

// ─── VIEWS ─────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS view_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    wallpaper_id INTEGER NOT NULL,
    session_id   TEXT    DEFAULT NULL,
    ip_address   TEXT    DEFAULT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_views_wallpaper ON view_logs(wallpaper_id);
  CREATE INDEX IF NOT EXISTS idx_views_date ON view_logs(created_at);
`);

// ─── SETTINGS ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL DEFAULT '',
    group_name TEXT NOT NULL DEFAULT 'general',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── ACTIVITY LOGS ─────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS activity_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id   INTEGER DEFAULT NULL,
    action     TEXT    NOT NULL,
    entity     TEXT    DEFAULT NULL,
    entity_id  INTEGER DEFAULT NULL,
    details    TEXT    DEFAULT NULL,
    ip_address TEXT    DEFAULT NULL,
    user_agent TEXT    DEFAULT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_activity_admin ON activity_logs(admin_id);
`);

// ─── HOMEPAGE SECTIONS ─────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS homepage_sections (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    section_key   TEXT    NOT NULL UNIQUE,
    title         TEXT    NOT NULL DEFAULT '',
    description   TEXT    DEFAULT '',
    type          TEXT    NOT NULL DEFAULT 'wallpapers',
    is_enabled    INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    config        TEXT    DEFAULT '{}',
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

db.close();
console.log('✅ Database schema created successfully at', DB_PATH);
