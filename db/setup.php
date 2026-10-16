<?php
/**
 * Ronviana — Database Setup & Seeder (PHP / WAMP)
 * Creates data/ronviana.db with all tables, triggers, and demo data.
 */

$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

$uploadsDir = __DIR__ . '/../uploads';
$dirs = [$uploadsDir, $uploadsDir . '/wallpapers', $uploadsDir . '/thumbnails', $uploadsDir . '/categories'];
foreach ($dirs as $d) {
    if (!is_dir($d)) mkdir($d, 0777, true);
}

$dbPath = file_exists($dataDir . '/ronviana.db') ? $dataDir . '/ronviana.db' : (file_exists($dataDir . '/wallora.db') ? $dataDir . '/wallora.db' : $dataDir . '/ronviana.db');
$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('PRAGMA journal_mode = WAL;');
$pdo->exec('PRAGMA foreign_keys = ON;');

// Create Tables
$pdo->exec("
CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL DEFAULT 'Admin',
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    profile_image TEXT    DEFAULT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS tags (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL UNIQUE,
    slug  TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS wallpaper_tags (
    wallpaper_id INTEGER NOT NULL,
    tag_id       INTEGER NOT NULL,
    PRIMARY KEY (wallpaper_id, tag_id),
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)       REFERENCES tags(id)       ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS collection_wallpapers (
    collection_id INTEGER NOT NULL,
    wallpaper_id  INTEGER NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_id, wallpaper_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (wallpaper_id)  REFERENCES wallpapers(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    username      TEXT    DEFAULT NULL,
    password_hash TEXT    DEFAULT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_favorites (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER DEFAULT NULL,
    session_id   TEXT    DEFAULT NULL,
    wallpaper_id INTEGER NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE,
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS download_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    wallpaper_id INTEGER NOT NULL,
    user_id      INTEGER DEFAULT NULL,
    session_id   TEXT    DEFAULT NULL,
    ip_address   TEXT    DEFAULT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS view_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    wallpaper_id INTEGER NOT NULL,
    session_id   TEXT    DEFAULT NULL,
    ip_address   TEXT    DEFAULT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL DEFAULT '',
    group_name TEXT NOT NULL DEFAULT 'general',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id   INTEGER DEFAULT NULL,
    action     TEXT    NOT NULL,
    entity     TEXT    DEFAULT NULL,
    entity_id  INTEGER DEFAULT NULL,
    details    TEXT    DEFAULT NULL,
    ip_address TEXT    DEFAULT NULL,
    user_agent TEXT    DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

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
");

// Insert Admin
$adminEmail = 'admin@ronviana.com';
$adminPass = password_hash('Ronviana2026!', PASSWORD_BCRYPT);
$stmt = $pdo->prepare("INSERT OR IGNORE INTO admins (name, email, password_hash) VALUES (?, ?, ?)");
$stmt->execute(['Administrator', $adminEmail, $adminPass]);

// Insert Categories
$categories = [
    ['Nature', 'nature', 'Breathtaking landscapes, mountains, and wilderness.', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', 1],
    ['Technology', 'technology', 'Cyberpunk, hardware, digital patterns and circuits.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80', 2],
    ['Space', 'space', 'Deep galaxies, nebulas, stars and cosmic wonders.', 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&q=80', 3],
    ['Minimal', 'minimal', 'Clean lines, uncluttered negative space and silence.', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', 4],
    ['Cars', 'cars', 'Exotic supercars, hypercars and vintage automotive beauty.', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80', 5],
    ['AMOLED', 'amoled', 'True pitch-black backgrounds tailored for OLED panels.', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80', 6],
    ['Abstract', 'abstract', 'Mesmerizing shapes, fluid colors and 3D geometries.', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80', 7],
    ['Anime', 'anime', 'Artistic anime aesthetics, cyberpunk Tokyo and dreamscapes.', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80', 8],
    ['Gaming', 'gaming', 'Atmospheric game worlds, setups, and virtual art.', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&q=80', 9],
    ['Architecture', 'architecture', 'Futuristic towers, brutalism and modern design.', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80', 10],
    ['City', 'city', 'Dazzling skylines, illuminated nights and urban life.', 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=800&q=80', 11],
    ['Fantasy', 'fantasy', 'Mythical realms, floating islands and magical wonders.', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80', 12]
];

$catStmt = $pdo->prepare("INSERT OR IGNORE INTO categories (name, slug, description, cover_image, display_order) VALUES (?, ?, ?, ?, ?)");
foreach ($categories as $cat) {
    $catStmt->execute($cat);
}

// Fetch category map
$catMap = [];
foreach ($pdo->query("SELECT id, name FROM categories") as $row) {
    $catMap[$row['name']] = $row['id'];
}

// Sample Wallpapers
$wallpapers = [
    ["Midnight Mountain", "midnight-mountain", "Starry peaks under deep indigo aurora night sky", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2560&q=85", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80", "Nature", "4K", "Desktop", "Landscape", 5820, 1420, 1, 1],
    ["Neon Cyber City", "neon-cyber-city", "Rain-slicked neon metropolitan streets reflecting violet and blue", "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=2560&q=85", "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80", "Technology", "4K", "Desktop", "Landscape", 7340, 2190, 1, 1],
    ["Dark Galaxy", "dark-galaxy", "Deep purple spiral galaxy swirling with cosmic stardust", "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1440&q=85", "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&q=80", "Space", "4K", "Mobile", "Portrait", 4120, 1680, 0, 1],
    ["Minimal Black", "minimal-black", "Subtle metallic curve cutting through deep shadow", "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1440&q=85", "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&q=80", "AMOLED", "4K", "Mobile", "Portrait", 3140, 1120, 0, 0],
    ["Red Sports Car", "red-sports-car", "Aerodynamic red hypercar cruising through neon illuminated tunnel", "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=2560&q=85", "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80", "Cars", "4K", "Desktop", "Landscape", 6210, 1890, 1, 1],
    ["Fluid Abstract", "fluid-abstract", "Silky iridescent liquid folds with violet and indigo refractions", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=2560&q=85", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80", "Abstract", "4K", "Desktop", "Landscape", 3540, 980, 0, 0],
    ["Tokyo Alley", "tokyo-alley", "Luminous lanterns and misty reflections in an evening backstreet", "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=1440&q=85", "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=600&q=80", "City", "4K", "Mobile", "Portrait", 5620, 2040, 1, 1],
    ["Amoled Depths", "amoled-depths", "Pure 0% black OLED wallpaper with subtle glowing glass crystal", "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1440&q=85", "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80", "AMOLED", "4K", "Mobile", "Portrait", 4380, 1510, 0, 1]
];

$wStmt = $pdo->prepare("
INSERT OR IGNORE INTO wallpapers (
    title, slug, description, image_url, thumbnail_url, storage_key, category_id,
    resolution, device, orientation, file_type, file_size, width, height,
    downloads, favorites, views, is_featured, is_popular, is_new, is_published
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'JPG', 2450000, 3840, 2160, ?, ?, ?, ?, ?, 1, 1)
");

foreach ($wallpapers as $w) {
    $catId = $catMap[$w[5]] ?? 1;
    $views = $w[9] * 3 + rand(100, 500);
    $storageKey = 'local:' . $w[1];
    $wStmt->execute([
        $w[0], $w[1], $w[2], $w[3], $w[4], $storageKey, $catId,
        $w[6], $w[7], $w[8], $w[9], $w[10], $views, $w[11], $w[12]
    ]);
}

// Generate realistic download logs & view logs for the last 14 days
$wIds = $pdo->query("SELECT id FROM wallpapers")->fetchAll(PDO::FETCH_COLUMN);
$dlLog = $pdo->prepare("INSERT INTO download_logs (wallpaper_id, ip_address, created_at) VALUES (?, '127.0.0.1', ?)");
$vwLog = $pdo->prepare("INSERT INTO view_logs (wallpaper_id, ip_address, created_at) VALUES (?, '127.0.0.1', ?)");

for ($d = 14; $d >= 0; $d--) {
    $dateStr = date('Y-m-d H:i:s', strtotime("-$d days") + rand(1000, 80000));
    $dailyCount = rand(8, 25);
    for ($i = 0; $i < $dailyCount; $i++) {
        $wId = $wIds[array_rand($wIds)];
        $dlLog->execute([$wId, $dateStr]);
        $vwLog->execute([$wId, $dateStr]);
        if (rand(0, 1)) {
            $vwLog->execute([$wId, $dateStr]);
        }
    }
}

// Seed Collections
$colStmt = $pdo->prepare("INSERT OR IGNORE INTO collections (name, slug, description, cover_image, is_published, display_order) VALUES (?, ?, ?, ?, 1, ?)");
$colStmt->execute(['Neon Nights', 'neon-nights', 'Electric cyberpunk and glowing dark cityscapes', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80', 1]);
$colStmt->execute(['OLED Deep Space', 'oled-deep-space', 'Pure blacks and high-contrast cosmic vistas', 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&q=80', 2]);
$colStmt->execute(['Hyper Minimalist', 'hyper-minimalist', 'Ultra-clean textures for zero-distraction setups', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', 3]);

$colIds = $pdo->query("SELECT id FROM collections")->fetchAll(PDO::FETCH_COLUMN);
$cwStmt = $pdo->prepare("INSERT OR IGNORE INTO collection_wallpapers (collection_id, wallpaper_id, display_order) VALUES (?, ?, ?)");
foreach ($colIds as $cid) {
    foreach (array_slice($wIds, 0, 4) as $idx => $wid) {
        $cwStmt->execute([$cid, $wid, $idx + 1]);
    }
}

// Seed Settings
$settings = [
    ['site_title', 'Ronviana — Curated 4K & OLED Wallpapers', 'general'],
    ['site_description', 'Discover handcrafted, ultra-high-resolution wallpapers for desktop and mobile.', 'general'],
    ['contact_email', 'support@ronviana.com', 'general'],
    ['items_per_page', '24', 'appearance'],
    ['max_upload_size', '20971520', 'upload'],
    ['watermark_enabled', 'false', 'media']
];
$setStmt = $pdo->prepare("INSERT OR REPLACE INTO settings (key, value, group_name) VALUES (?, ?, ?)");
foreach ($settings as $s) {
    $setStmt->execute($s);
}

// Seed Homepage Sections
$sections = [
    ['hero', 'Hero Banner', 'Top search & animated header display', 'hero', 1, 1],
    ['featured', 'Featured Wallpapers', 'Curated editorial wallpapers', 'wallpapers', 1, 2],
    ['categories', 'Explore Categories', 'Category browser with visual covers', 'categories', 1, 3],
    ['popular_rail', 'Trending & Popular', 'Top downloaded horizontal scroll rail', 'wallpapers', 1, 4],
    ['new_rail', 'New Releases', 'Recently added wallpapers rail', 'wallpapers', 1, 5]
];
$secStmt = $pdo->prepare("INSERT OR IGNORE INTO homepage_sections (section_key, title, description, type, is_enabled, display_order) VALUES (?, ?, ?, ?, ?, ?)");
foreach ($sections as $sec) {
    $secStmt->execute($sec);
}

// Log initial activity
$actStmt = $pdo->prepare("INSERT INTO activity_logs (admin_id, action, entity, details) VALUES (1, 'System Initialized', 'system', 'Database initialized and seeded with demo wallpapers and categories')");
$actStmt->execute();

echo "SUCCESS: Ronviana SQLite database successfully initialized and seeded at: " . realpath($dbPath) . "\n";
