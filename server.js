/**
 * Ronviana — Main Express API Server
 * Full-stack backend providing REST APIs for public site and admin panel
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directories exist
const uploadDir = path.join(__dirname, 'uploads');
const wallpaperUploadDir = path.join(uploadDir, 'wallpapers');
const thumbnailUploadDir = path.join(uploadDir, 'thumbnails');
const categoryUploadDir = path.join(uploadDir, 'categories');

[uploadDir, wallpaperUploadDir, thumbnailUploadDir, categoryUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Security headers with relaxed cross-origin resource policy for media
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // Allow inline scripts/styles for Admin SPA
}));

// CORS configuration (allow WAMP localhost and any local development port)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing with generous size limit for metadata & uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Serve root static files (for standalone Node running if preferred)
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Ronviana Core API',
    version: '1.0.0'
  });
});

// Mount API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallpapers', require('./routes/wallpapers'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/users', require('./routes/users'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/homepage', require('./routes/homepage'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/public', require('./routes/public'));

// 404 Handler for undefined API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Ronviana Server Error]:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'SERVER_ERROR'
  });
});

// Start listening
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`  ✦ RONVIANA API & ADMIN SERVER RUNNING ✦`);
  console.log(`  • Local API:   http://localhost:${PORT}/api/health`);
  console.log(`  • Admin Panel: http://localhost:${PORT}/admin/`);
  console.log(`  • Public Site: http://localhost:${PORT}/`);
  console.log(`  • WAMP Admin:  http://localhost/Ronviana/admin/`);
  console.log('====================================================');
});

module.exports = app;
