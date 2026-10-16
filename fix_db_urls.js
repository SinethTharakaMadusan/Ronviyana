/**
 * Fix wallpaper URL paths in ALL databases
 * Ensure image_url and thumbnail_url point directly to relative /uploads/ paths
 */
const Database = require('better-sqlite3');
const path = require('path');

function fixDb(dbFile) {
  console.log(`\nFixing: ${dbFile}`);
  try {
    const db = new Database(dbFile);
    
    // Clean up unnecessary domain prefixes or project folder prefixes (/Ronviana/, /wallora/)
    db.prepare("UPDATE wallpapers SET image_url = REPLACE(image_url, '/Ronviana/', '/')").run();
    db.prepare("UPDATE wallpapers SET image_url = REPLACE(image_url, '/wallora/', '/')").run();
    db.prepare("UPDATE wallpapers SET image_url = REPLACE(image_url, '/Wallora/', '/')").run();
    
    db.prepare("UPDATE wallpapers SET thumbnail_url = REPLACE(thumbnail_url, '/Ronviana/', '/')").run();
    db.prepare("UPDATE wallpapers SET thumbnail_url = REPLACE(thumbnail_url, '/wallora/', '/')").run();
    db.prepare("UPDATE wallpapers SET thumbnail_url = REPLACE(thumbnail_url, '/Wallora/', '/')").run();

    // Ensure leading slash is present before uploads if missing
    db.prepare("UPDATE wallpapers SET image_url = '/' || image_url WHERE image_url NOT LIKE '/%'").run();
    db.prepare("UPDATE wallpapers SET thumbnail_url = '/' || thumbnail_url WHERE thumbnail_url NOT LIKE '/%'").run();

    // Clean up any double slashes created
    db.prepare("UPDATE wallpapers SET image_url = REPLACE(image_url, '//', '/')").run();
    db.prepare("UPDATE wallpapers SET thumbnail_url = REPLACE(thumbnail_url, '//', '/')").run();

    const walls = db.prepare('SELECT id, image_url, thumbnail_url FROM wallpapers').all();
    console.log('  Final check (first 2):');
    walls.slice(0, 2).forEach(w => console.log('   ', w.id, '| Image:', w.image_url, '| Thumb:', w.thumbnail_url));
    
    db.close();
    console.log('  Done!');
  } catch (e) {
    console.error('  Error:', e.message);
  }
}

fixDb('./data/ronviana.db');
fixDb('./data/wallora.db');