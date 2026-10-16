/**
 * Ronviana — Upload Routes
 * POST /api/upload         — Upload wallpaper image + auto thumbnail
 * POST /api/upload/image   — Upload generic image (category cover, etc.)
 */

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const MAX_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE) || 20 * 1024 * 1024; // 20MB
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3000';

// Ensure directories exist
['wallpapers', 'thumbnails', 'images'].forEach(dir => {
  const p = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Multer config
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

// ─── UPLOAD WALLPAPER IMAGE ────────────────────────────────
// 'image' වෙනුවට 'file' හෝ upload.any() යොදන්න
router.post('/', requireAuth, upload.any(), async (req, res) => {
  try {
    // upload.any() භාවිතා කළ විට file එක ගන්නේ මෙහෙමයි:
    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const ext = file.mimetype === 'image/png' ? '.png' :
                file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const id = uuidv4();
    const filename = `${id}${ext}`;
    const thumbFilename = `${id}_thumb.jpg`;

    // Get image metadata
    const metadata = await sharp(file.buffer).metadata();

    // Save original image
    const imagePath = path.join(UPLOAD_DIR, 'wallpapers', filename);
    await sharp(file.buffer).toFile(imagePath);

    // Generate thumbnail
    const thumbPath = path.join(UPLOAD_DIR, 'thumbnails', thumbFilename);
    await sharp(file.buffer)
      .resize(600, null, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toFile(thumbPath);

    const imageUrl = `${PUBLIC_URL}/uploads/wallpapers/${filename}`;
    const thumbnailUrl = `${PUBLIC_URL}/uploads/thumbnails/${thumbFilename}`;
    const storageKey = `wallpapers/${filename}`;

    res.json({
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      storage_key: storageKey,
      width: metadata.width || 0,
      height: metadata.height || 0,
      file_size: file.size,
      file_type: ext.slice(1).toUpperCase()
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// ─── UPLOAD GENERIC IMAGE ──────────────────────────────────
router.post('/image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const ext = req.file.mimetype === 'image/png' ? '.png' :
                req.file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const id = uuidv4();
    const filename = `${id}${ext}`;

    const imagePath = path.join(UPLOAD_DIR, 'images', filename);
    await sharp(req.file.buffer)
      .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
      .toFile(imagePath);

    const imageUrl = `${PUBLIC_URL}/uploads/images/${filename}`;

    res.json({ image_url: imageUrl });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// ─── DELETE FILE ───────────────────────────────────────────
function deleteFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.error('File delete error:', e.message);
  }
}

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `File too large. Maximum size is ${MAX_SIZE / (1024 * 1024)}MB` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;
module.exports.deleteFile = deleteFile;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
