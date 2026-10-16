# Ronviana — Premium Wallpaper Platform & Admin Control Center

A modern, production-ready wallpaper platform with a full-featured Admin Panel. Built with a dark luxury aesthetic (`#080808` surfaces, `#7c5cff` accent glows, Sora/Inter typography, smooth glassmorphism, responsive data grids, and Canvas telemetry).

---

## 🌟 Architecture & Tech Stack

- **Frontend Public Site**: Semantic HTML5, Vanilla CSS, Vanilla JavaScript (zero frontend build dependencies).
- **Admin Control Center**: Single Page Application (SPA), Vanilla CSS with exact Ronviana design tokens, Canvas-based charting engine.
- **Backend API**: Node.js & Express RESTful API with CORS, Helmet, and Rate Limiting.
- **Database**: SQLite3 (`better-sqlite3`) with WAL-mode for high concurrency. Zero database daemon required. Easily swappable to PostgreSQL or MySQL.
- **Storage**: Local asset storage (`uploads/` directory) with Sharp-powered automatic thumbnail generation and dimension calculation. Swappable to AWS S3, Cloudflare R2, or Azure Blob.
- **Security**: JWT (JSON Web Tokens) with bcrypt password hashing and an immutable audit trail (`activity_logs`).

---

## 🚀 Quick Start Guide

### 1. Install Node Dependencies
Make sure [Node.js](https://nodejs.org/) (v16+) is installed:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```ini
PORT=3000
JWT_SECRET=ronviana-super-secret-key-change-in-production
ADMIN_EMAIL=admin@ronviana.com
ADMIN_PASSWORD=Ronviana2026!
DB_PATH=./data/ronviana.db
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=20971520
```

### 3. Initialize & Seed Database
Create all tables, triggers, indexes, and populate initial wallpaper categories, collections, and the default admin account:
```bash
npm run db:init
npm run db:seed
```

### 4. Start the Application Server
```bash
npm start
```
Or for development with automatic reload:
```bash
npm run dev
```

The application will be accessible at:
- **Admin Login**: [http://localhost:3000/admin/](http://localhost:3000/admin/)
- **Public Website**: [http://localhost:3000/](http://localhost:3000/)
- **API Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- **WAMP Virtual Host / Localhost**: If serving via Apache/WAMP on port 80, the public site and admin panel are also accessible at `http://localhost/Ronviana/` and `http://localhost/Ronviana/admin/` with automatic API synchronization.

---

## 🔐 Default Admin Credentials

- **Email**: `admin@ronviana.com`
- **Password**: `Ronviana2026!`

*(You can change your password and email at any time under the **Admin Profile** section).*

---

## 📑 Admin Control Center Features

1. **Dashboard Overview**:
   - Total Wallpapers, Total Downloads, Total Views, Categories, and Storage usage.
   - Canvas-rendered 14-day interactive traffic trend line chart.
   - Category distribution bar chart.
   - Real-time audit logs & recent uploads table.

2. **Wallpaper Management**:
   - Filter by Category, Target Device (Mobile, Desktop, Tablet, Universal), Resolution (4K, 8K, 1080p, OLED), and Status (Published, Draft, Featured, Popular, New).
   - Quick one-click status toggles (Publish/Unpublish).
   - Inline full-res preview, metadata editing, and deletion with file cleanup.

3. **Add / Upload Wallpaper**:
   - Drag-and-drop dropzone with live preview, file size calculation, and resolution auto-detection.
   - Tag management and category assignment.
   - Automatic thumbnail generation via Sharp.

4. **Category & Collection Management**:
   - Full CRUD for wallpaper categories with cover images and ordering.
   - Themed curated bundles with multiple thumbnail previews.

5. **Popular & New Releases**:
   - Metric-based rankings (Downloads vs Views vs Favorites).
   - Manage "New" badges on recent additions.

6. **User Accounts & Activity Log**:
   - User favorites and downloads tracking, account activation/deactivation.
   - Searchable, immutable administrative audit trail recording all changes, timestamps, and IP addresses.

7. **Homepage Layout Manager & Settings**:
   - Reorder and toggle homepage sections and hero text.
   - Configure site branding, max upload limits, and SEO metadata.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Service health status | No |
| `POST` | `/api/auth/login` | Administrator authentication (returns JWT) | No |
| `GET` | `/api/auth/me` | Current admin user details | Yes (Bearer) |
| `PUT` | `/api/auth/profile` | Update admin display name or email | Yes (Bearer) |
| `PUT` | `/api/auth/password` | Change admin password | Yes (Bearer) |
| `GET` | `/api/wallpapers` | List wallpapers with filters & pagination | Yes (Bearer) |
| `POST` | `/api/wallpapers` | Create wallpaper record | Yes (Bearer) |
| `PUT` | `/api/wallpapers/:id` | Update wallpaper metadata | Yes (Bearer) |
| `DELETE` | `/api/wallpapers/:id` | Delete wallpaper and storage files | Yes (Bearer) |
| `POST` | `/api/upload` | Upload wallpaper image and create thumbnail | Yes (Bearer) |
| `GET` | `/api/categories` | List categories with wallpaper counts | Yes (Bearer) |
| `POST` | `/api/categories` | Create category | Yes (Bearer) |
| `GET` | `/api/collections` | List curated collections | Yes (Bearer) |
| `GET` | `/api/analytics/dashboard` | High-level platform statistics | Yes (Bearer) |
| `GET` | `/api/analytics/trends` | Time-series download and view metrics | Yes (Bearer) |
| `GET` | `/api/public/wallpapers` | Public published wallpapers catalog | No |
| `POST` | `/api/public/download/:id` | Increment download counter | No |
| `POST` | `/api/public/view/:id` | Increment view counter | No |

---

## 🛡️ Production Deployment Notes

1. Change `JWT_SECRET` in `.env` to a secure random string (64+ characters).
2. Set `NODE_ENV=production`.
3. Use a process manager like **PM2** to run the server as a background service:
   ```bash
   npm install -g pm2
   pm2 start server.js --name ronviana-api
   pm2 save
   ```
4. For S3/Cloudflare R2 cloud storage, swap `routes/upload.js` destination from disk to an S3 SDK client.
