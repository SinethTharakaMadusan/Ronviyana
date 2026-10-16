/**
 * Ronviana — Database Seed
 * Populates the database with demo data: admin, categories, wallpapers,
 * collections, users, analytics, settings, and homepage sections.
 * Run: node db/seed.js
 */

const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const defaultDbPath = fs.existsSync(path.join(__dirname, '..', 'data', 'ronviana.db'))
  ? path.join(__dirname, '..', 'data', 'ronviana.db')
  : path.join(__dirname, '..', 'data', 'wallora.db');
const DB_PATH = process.env.DB_PATH || defaultDbPath;
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function img(seed, w, h) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

// ─── ADMIN ─────────────────────────────────────────────────
console.log('Seeding admin...');
const adminEmail = process.env.ADMIN_EMAIL || 'admin@ronviana.com';
const adminPass = process.env.ADMIN_PASSWORD || 'Ronviana2026!';
const hash = bcrypt.hashSync(adminPass, 12);

db.prepare(`DELETE FROM admins`).run();
db.prepare(`INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)`)
  .run('Ronviana Admin', adminEmail, hash);

// ─── CATEGORIES ────────────────────────────────────────────
console.log('Seeding categories...');
const CATEGORIES = [
  { name: 'Abstract',     desc: 'Bold shapes, fluid gradients and artistic expressions.' },
  { name: 'AMOLED',       desc: 'Deep blacks and vivid colors for OLED screens.' },
  { name: 'Nature',       desc: 'Landscapes, forests, oceans and natural beauty.' },
  { name: 'Mountains',    desc: 'Majestic peaks and alpine scenery.' },
  { name: 'Cars',         desc: 'Sports cars, supercars and automotive art.' },
  { name: 'Anime',        desc: 'Japanese anime and manga inspired art.' },
  { name: 'Minimal',      desc: 'Clean, simple and distraction-free designs.' },
  { name: 'Space',        desc: 'Galaxies, nebulae, planets and cosmic wonder.' },
  { name: 'Gaming',       desc: 'Game art, controllers and gaming culture.' },
  { name: 'Architecture', desc: 'Modern buildings, interiors and structural beauty.' },
  { name: 'Animals',      desc: 'Wildlife, pets and animal photography.' },
  { name: 'Technology',   desc: 'Circuits, code, neon tech and digital worlds.' },
  { name: 'Dark',         desc: 'Moody, dark and atmospheric visuals.' },
  { name: '4K',           desc: 'Ultra high-resolution wallpapers.' },
  { name: 'City',         desc: 'Urban landscapes, skylines and cityscapes.' },
  { name: 'Fantasy',      desc: 'Magical worlds, mythical creatures and wonder.' }
];

db.prepare(`DELETE FROM categories`).run();
const insertCat = db.prepare(`
  INSERT INTO categories (name, slug, description, cover_image, display_order, is_active)
  VALUES (?, ?, ?, ?, ?, 1)
`);

CATEGORIES.forEach((c, i) => {
  insertCat.run(c.name, slug(c.name), c.desc, img('cat-' + slug(c.name), 800, 600), i);
});

// Get category ID map
const catMap = {};
db.prepare(`SELECT id, name FROM categories`).all().forEach(r => { catMap[r.name] = r.id; });

// ─── WALLPAPERS ────────────────────────────────────────────
console.log('Seeding wallpapers...');
const WALLPAPERS = [
  { title: 'Midnight Mountain',  cat: 'Nature',       dev: 'Desktop', res: '4K',  dl: 4820, fav: 1210, isNew: false, isPop: true,  seed: 'midnight-mountain' },
  { title: 'Neon Cyber City',    cat: 'Technology',   dev: 'Desktop', res: '4K',  dl: 6310, fav: 1880, isNew: false, isPop: true,  seed: 'neon-cyber-city' },
  { title: 'Dark Galaxy',        cat: 'Space',        dev: 'Mobile',  res: '4K',  dl: 3990, fav: 1440, isNew: false, isPop: true,  seed: 'dark-galaxy' },
  { title: 'Minimal Black',      cat: 'Minimal',      dev: 'Mobile',  res: '4K',  dl: 2760, fav: 910,  isNew: false, isPop: false, seed: 'minimal-black' },
  { title: 'Red Sports Car',     cat: 'Cars',         dev: 'Desktop', res: '4K',  dl: 5120, fav: 1520, isNew: false, isPop: true,  seed: 'red-sports-car' },
  { title: 'Amoled Depths',      cat: 'AMOLED',       dev: 'Mobile',  res: '2K',  dl: 3180, fav: 1050, isNew: true,  isPop: false, seed: 'amoled-depths' },
  { title: 'Fluid Abstract',     cat: 'Abstract',     dev: 'Desktop', res: '4K',  dl: 2440, fav: 780,  isNew: false, isPop: false, seed: 'fluid-abstract' },
  { title: 'Sakura Drift',       cat: 'Anime',        dev: 'Mobile',  res: '2K',  dl: 4470, fav: 1690, isNew: true,  isPop: true,  seed: 'sakura-drift' },
  { title: 'Arctic Ridge',       cat: 'Mountains',    dev: 'Desktop', res: '5K',  dl: 3620, fav: 1130, isNew: false, isPop: false, seed: 'arctic-ridge' },
  { title: 'Glass Tower',        cat: 'Architecture', dev: 'Desktop', res: '4K',  dl: 1980, fav: 640,  isNew: false, isPop: false, seed: 'glass-tower' },
  { title: 'Controller Glow',    cat: 'Gaming',       dev: 'Desktop', res: '4K',  dl: 5340, fav: 1720, isNew: true,  isPop: true,  seed: 'controller-glow' },
  { title: 'Wolf in Fog',        cat: 'Animals',      dev: 'Mobile',  res: '4K',  dl: 2890, fav: 980,  isNew: false, isPop: false, seed: 'wolf-in-fog' },
  { title: 'Harbour Lights',     cat: 'City',         dev: 'Desktop', res: '4K',  dl: 2210, fav: 720,  isNew: false, isPop: false, seed: 'harbour-lights' },
  { title: 'Floating Isles',     cat: 'Fantasy',      dev: 'Desktop', res: '4K',  dl: 3080, fav: 1160, isNew: true,  isPop: false, seed: 'floating-isles' },
  { title: 'Circuit Bloom',      cat: 'Technology',   dev: 'Mobile',  res: '2K',  dl: 1760, fav: 520,  isNew: true,  isPop: false, seed: 'circuit-bloom' },
  { title: 'Desert Dunes',       cat: 'Nature',       dev: 'Desktop', res: '5K',  dl: 4010, fav: 1340, isNew: false, isPop: true,  seed: 'desert-dunes' },
  { title: 'Void Black',         cat: 'AMOLED',       dev: 'Mobile',  res: '4K',  dl: 6720, fav: 2140, isNew: false, isPop: true,  seed: 'void-black' },
  { title: 'Pastel Waves',       cat: 'Abstract',     dev: 'Mobile',  res: '4K',  dl: 2330, fav: 860,  isNew: true,  isPop: false, seed: 'pastel-waves' },
  { title: 'Nebula Bloom',       cat: 'Space',        dev: 'Desktop', res: '5K',  dl: 4560, fav: 1610, isNew: false, isPop: true,  seed: 'nebula-bloom' },
  { title: 'Quiet Lines',        cat: 'Minimal',      dev: 'Desktop', res: '4K',  dl: 1540, fav: 470,  isNew: false, isPop: false, seed: 'quiet-lines' },
  { title: 'Night Drive',        cat: 'Cars',         dev: 'Mobile',  res: '4K',  dl: 3870, fav: 1290, isNew: true,  isPop: false, seed: 'night-drive' },
  { title: 'Tokyo Alley',        cat: 'City',         dev: 'Mobile',  res: '4K',  dl: 5210, fav: 1970, isNew: false, isPop: true,  seed: 'tokyo-alley' },
  { title: 'Sky Temple',         cat: 'Anime',        dev: 'Desktop', res: '4K',  dl: 2980, fav: 1020, isNew: true,  isPop: false, seed: 'sky-temple' },
  { title: 'Frozen Peaks',       cat: 'Mountains',    dev: 'Mobile',  res: '4K',  dl: 3410, fav: 1180, isNew: false, isPop: false, seed: 'frozen-peaks' },
  { title: 'Golden Hour',        cat: 'Nature',       dev: 'Desktop', res: '4K',  dl: 3920, fav: 1410, isNew: true,  isPop: false, seed: 'golden-hour' },
  { title: 'Pixel Rain',         cat: 'Gaming',       dev: 'Mobile',  res: '2K',  dl: 2650, fav: 890,  isNew: true,  isPop: false, seed: 'pixel-rain' },
  { title: 'Obsidian Core',      cat: 'Dark',         dev: 'Mobile',  res: '4K',  dl: 4180, fav: 1560, isNew: false, isPop: true,  seed: 'obsidian-core' },
  { title: 'Coral Reef',         cat: 'Animals',      dev: 'Desktop', res: '4K',  dl: 1890, fav: 620,  isNew: false, isPop: false, seed: 'coral-reef' },
  { title: 'Chrome Dragon',      cat: 'Fantasy',      dev: 'Mobile',  res: '4K',  dl: 3540, fav: 1330, isNew: true,  isPop: false, seed: 'chrome-dragon' },
  { title: 'Monolith',           cat: 'Architecture', dev: 'Desktop', res: '5K',  dl: 2120, fav: 710,  isNew: false, isPop: false, seed: 'monolith-arch' },
  { title: 'Starfield Echo',     cat: 'Space',        dev: 'Mobile',  res: '4K',  dl: 3780, fav: 1250, isNew: true,  isPop: false, seed: 'starfield-echo' },
  { title: 'Matte Gradient',     cat: 'Minimal',      dev: 'Mobile',  res: '2K',  dl: 2010, fav: 580,  isNew: false, isPop: false, seed: 'matte-gradient' }
];

db.prepare(`DELETE FROM wallpapers`).run();
const insertWall = db.prepare(`
  INSERT INTO wallpapers (title, slug, description, image_url, thumbnail_url, storage_key,
    category_id, resolution, device, orientation, file_type, file_size, width, height,
    downloads, favorites, views, is_featured, is_popular, is_new, is_published, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'JPG', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
`);

WALLPAPERS.forEach((w, i) => {
  const isMobile = w.dev === 'Mobile';
  const orient = isMobile ? 'Portrait' : 'Landscape';
  const tw = isMobile ? 600 : 900;
  const th = isMobile ? 1066 : 563;
  const fw = isMobile ? 1440 : 2560;
  const fh = isMobile ? 2560 : 1440;
  const thumb = img(w.seed, tw, th);
  const full  = img(w.seed, fw, fh);
  const views = w.dl * randomInt(2, 5);
  const featured = (i < 12) ? 1 : 0;
  const created = daysAgo(randomInt(0, 60));

  insertWall.run(
    w.title, slug(w.title), `A stunning ${w.cat.toLowerCase()} wallpaper for your ${w.dev.toLowerCase()}.`,
    full, thumb, `wallpapers/${slug(w.title)}.jpg`,
    catMap[w.cat], w.res, w.dev, orient,
    randomInt(800000, 5000000), fw, fh,
    w.dl, w.fav, views, featured, w.isPop ? 1 : 0, w.isNew ? 1 : 0,
    created
  );
});

// ─── TAGS ──────────────────────────────────────────────────
console.log('Seeding tags...');
const TAGS = ['dark', 'vibrant', 'minimal', 'colorful', 'moody', 'warm', 'cold', 'neon',
              'gradient', 'texture', 'hdr', 'retro', 'futuristic', 'calm', 'dramatic'];

db.prepare(`DELETE FROM tags`).run();
const insertTag = db.prepare(`INSERT INTO tags (name, slug) VALUES (?, ?)`);
TAGS.forEach(t => insertTag.run(t, slug(t)));

// Assign random tags to wallpapers
const tagIds = db.prepare(`SELECT id FROM tags`).all().map(r => r.id);
const wallIds = db.prepare(`SELECT id FROM wallpapers`).all().map(r => r.id);
const insertWT = db.prepare(`INSERT OR IGNORE INTO wallpaper_tags (wallpaper_id, tag_id) VALUES (?, ?)`);

wallIds.forEach(wid => {
  const count = randomInt(2, 5);
  const shuffled = [...tagIds].sort(() => Math.random() - 0.5);
  for (let i = 0; i < count && i < shuffled.length; i++) {
    insertWT.run(wid, shuffled[i]);
  }
});

// ─── COLLECTIONS ───────────────────────────────────────────
console.log('Seeding collections...');
const COLLECTIONS = [
  { name: "Editor's Choice",   desc: 'Handpicked wallpapers by our editorial team.' },
  { name: 'Best AMOLED',       desc: 'Perfect deep blacks for OLED screens.' },
  { name: '4K Showcase',       desc: 'Ultra high-resolution wallpapers.' },
  { name: 'Minimal Collection', desc: 'Clean and distraction-free designs.' },
  { name: 'Gaming Collection', desc: 'For the gamer in you.' }
];

db.prepare(`DELETE FROM collections`).run();
db.prepare(`DELETE FROM collection_wallpapers`).run();
const insertColl = db.prepare(`
  INSERT INTO collections (name, slug, description, cover_image, is_published, display_order)
  VALUES (?, ?, ?, ?, 1, ?)
`);
const insertCW = db.prepare(`
  INSERT INTO collection_wallpapers (collection_id, wallpaper_id, display_order) VALUES (?, ?, ?)
`);

COLLECTIONS.forEach((c, i) => {
  const cover = img('coll-' + slug(c.name), 800, 600);
  insertColl.run(c.name, slug(c.name), c.desc, cover, i);
  const collId = db.prepare(`SELECT id FROM collections WHERE slug = ?`).get(slug(c.name)).id;
  // Add 4-8 random wallpapers
  const shuffled = [...wallIds].sort(() => Math.random() - 0.5).slice(0, randomInt(4, 8));
  shuffled.forEach((wid, j) => insertCW.run(collId, wid, j));
});

// ─── USERS ─────────────────────────────────────────────────
console.log('Seeding users...');
db.prepare(`DELETE FROM users`).run();
const insertUser = db.prepare(`
  INSERT INTO users (email, username, is_active, created_at) VALUES (?, ?, 1, ?)
`);
const demoUsers = [
  'alex@example.com', 'maria@example.com', 'james@example.com',
  'sarah@example.com', 'chen@example.com', 'aisha@example.com',
  'lucas@example.com', 'priya@example.com', 'omar@example.com',
  'emma@example.com', 'kenji@example.com', 'sofia@example.com'
];
demoUsers.forEach((email, i) => {
  const name = email.split('@')[0];
  insertUser.run(email, name, daysAgo(randomInt(1, 90)));
});

// ─── FAVORITES & DOWNLOADS (demo analytics) ────────────────
console.log('Seeding analytics data...');
const userIds = db.prepare(`SELECT id FROM users`).all().map(r => r.id);

db.prepare(`DELETE FROM user_favorites`).run();
db.prepare(`DELETE FROM download_logs`).run();
db.prepare(`DELETE FROM view_logs`).run();

const insertFav = db.prepare(`INSERT INTO user_favorites (user_id, wallpaper_id, created_at) VALUES (?, ?, ?)`);
const insertDL = db.prepare(`INSERT INTO download_logs (wallpaper_id, user_id, created_at) VALUES (?, ?, ?)`);
const insertView = db.prepare(`INSERT INTO view_logs (wallpaper_id, session_id, created_at) VALUES (?, ?, ?)`);

// Generate realistic analytics over the past 90 days
for (let day = 0; day < 90; day++) {
  const date = daysAgo(day);
  const numDownloads = randomInt(5, 40);
  const numViews = randomInt(20, 120);

  for (let i = 0; i < numDownloads; i++) {
    const wid = wallIds[randomInt(0, wallIds.length - 1)];
    const uid = userIds[randomInt(0, userIds.length - 1)];
    insertDL.run(wid, uid, date);
  }

  for (let i = 0; i < numViews; i++) {
    const wid = wallIds[randomInt(0, wallIds.length - 1)];
    insertView.run(wid, `session-${randomInt(1000, 9999)}`, date);
  }
}

// Add some favorites
userIds.forEach(uid => {
  const count = randomInt(3, 10);
  const shuffled = [...wallIds].sort(() => Math.random() - 0.5).slice(0, count);
  shuffled.forEach(wid => {
    insertFav.run(uid, wid, daysAgo(randomInt(0, 60)));
  });
});

// ─── SETTINGS ──────────────────────────────────────────────
console.log('Seeding settings...');
db.prepare(`DELETE FROM settings`).run();
const insertSetting = db.prepare(`INSERT INTO settings (key, value, group_name) VALUES (?, ?, ?)`);

const settings = [
  // General
  ['site_name', 'Ronviana', 'general'],
  ['site_description', 'Premium Wallpapers for Every Screen', 'general'],
  ['contact_email', 'hello@ronviana.com', 'general'],
  ['logo_url', '', 'general'],
  ['favicon_url', '', 'general'],

  // Appearance
  ['accent_color', '#7c5cff', 'appearance'],
  ['default_theme', 'dark', 'appearance'],
  ['border_radius', '22', 'appearance'],

  // Wallpaper defaults
  ['default_quality', '4K', 'wallpaper'],
  ['allowed_formats', 'jpg,jpeg,png,webp', 'wallpaper'],
  ['max_upload_size', '20', 'wallpaper'],
  ['default_category', 'Abstract', 'wallpaper'],
  ['default_device', 'Universal', 'wallpaper'],
  ['default_resolution', 'HD', 'wallpaper'],
  ['new_badge_days', '7', 'wallpaper'],

  // Homepage
  ['hero_title', 'Beautiful Wallpapers\nfor Every Screen', 'homepage'],
  ['hero_description', 'Discover stunning high-quality wallpapers designed for phones, desktops, tablets and more.', 'homepage'],
  ['hero_cta_text', 'Explore wallpapers', 'homepage'],
  ['hero_cta_link', '#wallpapers', 'homepage'],
  ['hero_image', '', 'homepage'],
  ['featured_count', '12', 'homepage'],
  ['popular_count', '8', 'homepage'],
  ['new_count', '8', 'homepage'],

  // Social
  ['social_instagram', '#', 'social'],
  ['social_youtube', '#', 'social'],
  ['social_pinterest', '#', 'social'],
  ['social_x', '#', 'social'],

  // SEO
  ['meta_title', 'Ronviana — Premium Wallpapers for Every Screen', 'seo'],
  ['meta_description', 'Hand-picked high-quality wallpapers for phones, desktops and tablets.', 'seo'],
  ['og_image', '', 'seo'],
  ['meta_keywords', 'wallpapers, 4K wallpapers, AMOLED wallpapers, desktop wallpapers, phone wallpapers', 'seo']
];

settings.forEach(s => insertSetting.run(s[0], s[1], s[2]));

// ─── HOMEPAGE SECTIONS ─────────────────────────────────────
console.log('Seeding homepage sections...');
db.prepare(`DELETE FROM homepage_sections`).run();
const insertSection = db.prepare(`
  INSERT INTO homepage_sections (section_key, title, description, type, is_enabled, display_order, config)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const sections = [
  ['hero', 'Hero Banner', '', 'hero', 1, 0, '{}'],
  ['featured', 'Featured wallpapers', 'Hand-picked wallpapers for your devices.', 'wallpapers', 1, 1, '{"filter":"featured","limit":12}'],
  ['popular', 'Popular this week', 'What everyone is putting on their screens.', 'wallpapers', 1, 2, '{"filter":"popular","limit":8}'],
  ['new', 'Just added', 'Fresh uploads from the last few days.', 'wallpapers', 1, 3, '{"filter":"new","limit":8}'],
  ['categories', 'Browse categories', 'Pick a mood, get a matching screen.', 'categories', 1, 4, '{}']
];

sections.forEach(s => insertSection.run(...s));

// ─── ACTIVITY LOG SEED ─────────────────────────────────────
console.log('Seeding activity logs...');
db.prepare(`DELETE FROM activity_logs`).run();
const insertLog = db.prepare(`
  INSERT INTO activity_logs (admin_id, action, entity, entity_id, details, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const logEntries = [
  ['Wallpaper uploaded', 'wallpaper', 1, 'Uploaded "Midnight Mountain"'],
  ['Category created', 'category', 1, 'Created category "Abstract"'],
  ['Settings updated', 'settings', null, 'Updated homepage settings'],
  ['Wallpaper uploaded', 'wallpaper', 5, 'Uploaded "Red Sports Car"'],
  ['Collection created', 'collection', 1, 'Created "Editor\'s Choice"'],
  ['Wallpaper uploaded', 'wallpaper', 8, 'Uploaded "Sakura Drift"'],
  ['Admin login', 'auth', null, 'Logged in from Chrome/Windows'],
  ['Settings updated', 'settings', null, 'Updated SEO settings'],
  ['Wallpaper edited', 'wallpaper', 3, 'Updated "Dark Galaxy" metadata'],
  ['Category created', 'category', 5, 'Created category "Cars"'],
];

logEntries.forEach((entry, i) => {
  insertLog.run(1, entry[0], entry[1], entry[2], entry[3], daysAgo(logEntries.length - i));
});

db.close();
console.log('✅ Database seeded successfully!');
console.log(`   Admin: ${adminEmail} / ${adminPass}`);
