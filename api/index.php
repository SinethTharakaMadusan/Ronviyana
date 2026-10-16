<?php
/**
 * Ronviana — Native High-Performance REST API Router (PHP / WAMP)
 * Zero-dependency, cloud-ready RESTful backend interfacing directly with SQLite/MySQL
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

// ─── DATABASE CONNECTION ──────────────────────────────────
$dbDir = __DIR__ . '/../data';
$dbPath = file_exists($dbDir . '/ronviana.db') ? $dbDir . '/ronviana.db' : (file_exists($dbDir . '/wallora.db') ? $dbDir . '/wallora.db' : $dbDir . '/ronviana.db');
if (!file_exists($dbPath)) {
    require_once __DIR__ . '/../db/setup.php';
}

try {
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys = ON;');
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// ─── JWT & SECURITY HELPERS ───────────────────────────────
define('JWT_SECRET', 'ronviana-super-secret-key-change-in-production-2026!');

function base64UrlEncode($data) {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
}

function base64UrlDecode($data) {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
}

function generateJwt($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload['exp'] = time() + (7 * 86400); // 7 days
    $base64Header = base64UrlEncode($header);
    $base64Payload = base64UrlEncode(json_encode($payload));
    $signature = hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true);
    $base64Signature = base64UrlEncode($signature);
    return "$base64Header.$base64Payload.$base64Signature";
}

function verifyJwt($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    list($header, $payload, $sig) = $parts;
    $validSig = base64UrlEncode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if (!hash_equals($validSig, $sig)) return null;
    $data = json_decode(base64UrlDecode($payload), true);
    if (!$data || ($data['exp'] ?? 0) < time()) return null;
    return $data;
}

function getAuthAdmin($pdo) {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!preg_match('/Bearer\s(\S+)/', $auth, $matches)) {
        return null;
    }
    $tokenData = verifyJwt($matches[1]);
    if (!$tokenData || empty($tokenData['adminId'])) {
        return null;
    }
    $stmt = $pdo->prepare("SELECT id, name, email, profile_image, created_at FROM admins WHERE id = ?");
    $stmt->execute([$tokenData['adminId']]);
    return $stmt->fetch() ?: null;
}

function requireAuth($pdo) {
    $admin = getAuthAdmin($pdo);
    if (!$admin) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }
    return $admin;
}

function logActivity($pdo, $adminId, $action, $entity = null, $details = null) {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $stmt = $pdo->prepare("INSERT INTO activity_logs (admin_id, action, entity, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$adminId, $action, $entity, $details, $ip, $ua]);
    } catch (Exception $e) {}
}

function slugify($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    return strtolower($text ?: 'n-a');
}

// ─── REQUEST PARSING ──────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true) ?: [];
if (empty($body) && !empty($_POST)) {
    $body = $_POST;
}

// Parse URI path
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Normalize uri removing prefix e.g. /ronviana/api, /wallora/api or /api
$prefixPattern = '~^.*?/api/?~';
$route = preg_replace($prefixPattern, '', $uri);
$route = trim($route, '/');
$segments = explode('/', $route);
$resource = $segments[0] ?? '';
$param1 = $segments[1] ?? null;
$param2 = $segments[2] ?? null;

// ─── ROUTES ───────────────────────────────────────────────

// 1. Health check
if ($resource === 'health') {
    echo json_encode(['status' => 'healthy', 'timestamp' => date('c'), 'service' => 'Ronviana Core API (PHP/WAMP)', 'version' => '1.0.0']);
    exit;
}

// 2. Auth routes
if ($resource === 'auth') {
    if ($param1 === 'login' && $method === 'POST') {
        $email = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';
        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Email and password required']);
            exit;
        }
        $stmt = $pdo->prepare("SELECT * FROM admins WHERE email = ?");
        $stmt->execute([$email]);
        $admin = $stmt->fetch();
        if (!$admin || !password_verify($password, $admin['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid email or password']);
            exit;
        }
        $token = generateJwt(['adminId' => $admin['id'], 'email' => $admin['email']]);
        unset($admin['password_hash']);
        logActivity($pdo, $admin['id'], 'Admin Login', 'auth', 'Successful sign in');
        echo json_encode(['token' => $token, 'admin' => $admin]);
        exit;
    }

    if ($param1 === 'me' && $method === 'GET') {
        $admin = requireAuth($pdo);
        echo json_encode(['admin' => $admin]);
        exit;
    }

    if ($param1 === 'profile' && $method === 'PUT') {
        $admin = requireAuth($pdo);
        $name = trim($body['name'] ?? $admin['name']);
        $email = trim($body['email'] ?? $admin['email']);
        $stmt = $pdo->prepare("UPDATE admins SET name = ?, email = ?, updated_at = datetime('now') WHERE id = ?");
        $stmt->execute([$name, $email, $admin['id']]);
        $admin['name'] = $name;
        $admin['email'] = $email;
        logActivity($pdo, $admin['id'], 'Profile Updated', 'admin', "Updated name to {$name}");
        echo json_encode(['admin' => $admin, 'message' => 'Profile updated']);
        exit;
    }

    if ($param1 === 'password' && $method === 'PUT') {
        $admin = requireAuth($pdo);
        $curr = $body['currentPassword'] ?? '';
        $new = $body['newPassword'] ?? '';
        $stmt = $pdo->prepare("SELECT password_hash FROM admins WHERE id = ?");
        $stmt->execute([$admin['id']]);
        $row = $stmt->fetch();
        if (!password_verify($curr, $row['password_hash'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Current password incorrect']);
            exit;
        }
        $newHash = password_hash($new, PASSWORD_BCRYPT);
        $pdo->prepare("UPDATE admins SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")->execute([$newHash, $admin['id']]);
        logActivity($pdo, $admin['id'], 'Password Changed', 'admin', 'Admin password changed');
        echo json_encode(['message' => 'Password changed successfully']);
        exit;
    }
}

// 3. Analytics
if ($resource === 'analytics') {
    $admin = requireAuth($pdo);
    if ($param1 === 'dashboard') {
        $totalWallpapers = $pdo->query("SELECT COUNT(*) FROM wallpapers WHERE is_published = 1")->fetchColumn();
        $totalDrafts = $pdo->query("SELECT COUNT(*) FROM wallpapers WHERE is_published = 0")->fetchColumn();
        $totalCategories = $pdo->query("SELECT COUNT(*) FROM categories WHERE is_active = 1")->fetchColumn();
        $totalCollections = $pdo->query("SELECT COUNT(*) FROM collections")->fetchColumn();
        $totalUsers = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();

        $sums = $pdo->query("SELECT COALESCE(SUM(downloads), 0) as dl, COALESCE(SUM(views), 0) as vw, COALESCE(SUM(favorites), 0) as fav, COALESCE(SUM(file_size), 0) as sz FROM wallpapers")->fetch();

        $todayDl = $pdo->query("SELECT COUNT(*) FROM download_logs WHERE date(created_at) = date('now')")->fetchColumn();
        $todayVw = $pdo->query("SELECT COUNT(*) FROM view_logs WHERE date(created_at) = date('now')")->fetchColumn();

        $recentWallpapers = $pdo->query("SELECT w.id, w.title, w.slug, w.thumbnail_url, w.resolution, w.downloads, w.views, w.created_at, c.name as category_name FROM wallpapers w LEFT JOIN categories c ON c.id = w.category_id ORDER BY w.created_at DESC LIMIT 5")->fetchAll();

        $recentActivity = $pdo->query("SELECT a.*, adm.name as admin_name FROM activity_logs a LEFT JOIN admins adm ON adm.id = a.admin_id ORDER BY a.created_at DESC LIMIT 6")->fetchAll();

        echo json_encode([
            'overview' => [
                'totalWallpapers' => (int)$totalWallpapers,
                'totalDrafts' => (int)$totalDrafts,
                'totalCategories' => (int)$totalCategories,
                'totalCollections' => (int)$totalCollections,
                'totalUsers' => (int)$totalUsers,
                'totalDownloads' => (int)$sums['dl'],
                'totalViews' => (int)$sums['vw'],
                'totalFavorites' => (int)$sums['fav'],
                'totalStorageBytes' => (int)$sums['sz'],
                'todayDownloads' => (int)$todayDl,
                'todayViews' => (int)$todayVw
            ],
            'recentWallpapers' => $recentWallpapers,
            'recentActivity' => $recentActivity
        ]);
        exit;
    }

    if ($param1 === 'trends') {
        $days = min(90, max(7, (int)($_GET['days'] ?? 14)));
        $downloads = $pdo->query("SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count FROM download_logs WHERE created_at >= date('now', '-$days days') GROUP BY strftime('%Y-%m-%d', created_at) ORDER BY date ASC")->fetchAll();
        $views = $pdo->query("SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count FROM view_logs WHERE created_at >= date('now', '-$days days') GROUP BY strftime('%Y-%m-%d', created_at) ORDER BY date ASC")->fetchAll();
        echo json_encode(['days' => $days, 'downloads' => $downloads, 'views' => $views]);
        exit;
    }

    if ($param1 === 'popular') {
        $limit = min(50, max(5, (int)($_GET['limit'] ?? 10)));
        $items = $pdo->query("SELECT w.id, w.title, w.slug, w.thumbnail_url, w.downloads, w.views, w.favorites, w.resolution, c.name as category_name FROM wallpapers w LEFT JOIN categories c ON c.id = w.category_id WHERE w.is_published = 1 ORDER BY w.downloads DESC LIMIT $limit")->fetchAll();
        echo json_encode(['metric' => 'downloads', 'items' => $items]);
        exit;
    }

    if ($param1 === 'breakdown') {
        $cats = $pdo->query("SELECT c.name, COUNT(w.id) as count, COALESCE(SUM(w.downloads), 0) as total_downloads FROM categories c LEFT JOIN wallpapers w ON w.category_id = c.id GROUP BY c.id ORDER BY count DESC LIMIT 10")->fetchAll();
        $devices = $pdo->query("SELECT device, COUNT(*) as count FROM wallpapers GROUP BY device ORDER BY count DESC")->fetchAll();
        $resolutions = $pdo->query("SELECT resolution, COUNT(*) as count FROM wallpapers GROUP BY resolution ORDER BY count DESC")->fetchAll();
        echo json_encode(['categories' => $cats, 'devices' => $devices, 'resolutions' => $resolutions]);
        exit;
    }
}

// 4. File Upload Route
if ($resource === 'upload' && $method === 'POST') {
    $admin = requireAuth($pdo);
    if (empty($_FILES['wallpaper'])) {
        http_response_code(400);
        echo json_encode(['error' => 'No wallpaper file uploaded']);
        exit;
    }

    $file = $_FILES['wallpaper'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'Upload failed with code: ' . $file['error']]);
        exit;
    }

    $allowed = ['image/jpeg', 'image/png', 'image/webp'];
    $mime = mime_content_type($file['tmp_name']);
    if (!in_array($mime, $allowed)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file format. Only JPG, PNG, and WebP are allowed.']);
        exit;
    }

    $ext = ($mime === 'image/png') ? 'png' : (($mime === 'image/webp') ? 'webp' : 'jpg');
    $uuid = bin2hex(random_bytes(8));
    $origName = preg_replace('/[^a-zA-Z0-9_-]/', '', pathinfo($file['name'], PATHINFO_FILENAME));
    $filename = "{$origName}-{$uuid}.{$ext}";
    $thumbName = "{$origName}-{$uuid}-thumb.{$ext}";

    $uploadDir = __DIR__ . '/../uploads/wallpapers';
    $thumbDir = __DIR__ . '/../uploads/thumbnails';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
    if (!is_dir($thumbDir)) mkdir($thumbDir, 0777, true);

    $destPath = "$uploadDir/$filename";
    move_uploaded_file($file['tmp_name'], $destPath);

    list($w, $h) = getimagesize($destPath);

    // Create thumbnail via GD
    $thumbPath = "$thumbDir/$thumbName";
    $thumbW = 480;
    $thumbH = (int)round(($h / $w) * $thumbW);

    if ($mime === 'image/png') $src = imagecreatefrompng($destPath);
    elseif ($mime === 'image/webp') $src = imagecreatefromwebp($destPath);
    else $src = imagecreatefromjpeg($destPath);

    if ($src) {
        $dst = imagecreatetruecolor($thumbW, $thumbH);
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $thumbW, $thumbH, $w, $h);
        if ($mime === 'image/png') imagepng($dst, $thumbPath, 8);
        elseif ($mime === 'image/webp') imagewebp($dst, $thumbPath, 85);
        else imagejpeg($dst, $thumbPath, 85);
        imagedestroy($dst);
        imagedestroy($src);
    } else {
        copy($destPath, $thumbPath);
    }

    $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'];
    $subDir = dirname(dirname($_SERVER['SCRIPT_NAME']));
    $prefix = rtrim($subDir, '/\\');

    echo json_encode([
        'image_url' => "$prefix/uploads/wallpapers/$filename",
        'thumbnail_url' => "$prefix/uploads/thumbnails/$thumbName",
        'storage_key' => "local:$filename",
        'width' => (int)$w,
        'height' => (int)$h,
        'file_size' => filesize($destPath),
        'file_type' => strtoupper($ext)
    ]);
    exit;
}

// 5. Wallpapers CRUD
if ($resource === 'wallpapers') {
    if (!$param1 && $method === 'GET') {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 15)));
        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [];

        if (!empty($_GET['category'])) {
            $where[] = 'w.category_id = ?';
            $params[] = (int)$_GET['category'];
        }
        if (!empty($_GET['device'])) {
            $where[] = 'w.device = ?';
            $params[] = $_GET['device'];
        }
        if (!empty($_GET['search'])) {
            $where[] = '(w.title LIKE ? OR w.description LIKE ?)';
            $s = '%' . trim($_GET['search']) . '%';
            $params[] = $s;
            $params[] = $s;
        }
        if (!empty($_GET['status'])) {
            if ($_GET['status'] === 'published') $where[] = 'w.is_published = 1';
            elseif ($_GET['status'] === 'draft') $where[] = 'w.is_published = 0';
            elseif ($_GET['status'] === 'featured') $where[] = 'w.is_featured = 1';
            elseif ($_GET['status'] === 'popular') $where[] = 'w.is_popular = 1';
            elseif ($_GET['status'] === 'new') $where[] = 'w.is_new = 1';
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM wallpapers w $whereSql");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $query = "SELECT w.*, c.name as category_name FROM wallpapers w LEFT JOIN categories c ON c.id = w.category_id $whereSql ORDER BY w.created_at DESC LIMIT $limit OFFSET $offset";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $wallpapers = $stmt->fetchAll();

        echo json_encode([
            'wallpapers' => $wallpapers,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => ceil($total / $limit)
            ]
        ]);
        exit;
    }

    if (is_numeric($param1) && $method === 'GET') {
        $stmt = $pdo->prepare("SELECT w.*, c.name as category_name FROM wallpapers w LEFT JOIN categories c ON c.id = w.category_id WHERE w.id = ?");
        $stmt->execute([(int)$param1]);
        $w = $stmt->fetch();
        if (!$w) { http_response_code(404); echo json_encode(['error' => 'Not found']); exit; }
        echo json_encode(['wallpaper' => $w]);
        exit;
    }

    if (!$param1 && $method === 'POST') {
        $admin = requireAuth($pdo);
        $title = trim($body['title'] ?? '');
        $catId = (int)($body['category_id'] ?? 1);
        $imgUrl = $body['image_url'] ?? '';
        $thumbUrl = $body['thumbnail_url'] ?? $imgUrl;
        $storageKey = $body['storage_key'] ?? ('local:' . slugify($title));

        $slug = slugify($title);
        $cnt = 1;
        $finalSlug = $slug;
        while ($pdo->query("SELECT COUNT(*) FROM wallpapers WHERE slug = '$finalSlug'")->fetchColumn() > 0) {
            $finalSlug = "$slug-" . $cnt++;
        }

        $stmt = $pdo->prepare("
            INSERT INTO wallpapers (
                title, slug, description, image_url, thumbnail_url, storage_key, category_id,
                resolution, device, orientation, file_type, file_size, width, height,
                is_published, is_featured, is_popular, is_new
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $title, $finalSlug, $body['description'] ?? '', $imgUrl, $thumbUrl, $storageKey, $catId,
            $body['resolution'] ?? '4K', $body['device'] ?? 'Universal', $body['orientation'] ?? 'Portrait',
            $body['file_type'] ?? 'JPG', (int)($body['file_size'] ?? 0), (int)($body['width'] ?? 0), (int)($body['height'] ?? 0),
            !empty($body['is_published']) ? 1 : 0, !empty($body['is_featured']) ? 1 : 0,
            !empty($body['is_popular']) ? 1 : 0, !empty($body['is_new']) ? 1 : 0
        ]);
        $newId = $pdo->lastInsertId();
        logActivity($pdo, $admin['id'], 'Wallpaper Uploaded', 'wallpaper', "Published wallpaper: {$title}");
        echo json_encode(['id' => $newId, 'message' => 'Wallpaper created successfully']);
        exit;
    }

    if (is_numeric($param1) && $param2 === 'status' && $method === 'PUT') {
        $admin = requireAuth($pdo);
        $wId = (int)$param1;
        $updates = [];
        $vals = [];
        foreach (['is_published', 'is_featured', 'is_popular', 'is_new'] as $flag) {
            if (isset($body[$flag])) {
                $updates[] = "$flag = ?";
                $vals[] = $body[$flag] ? 1 : 0;
            }
        }
        if ($updates) {
            $vals[] = $wId;
            $pdo->prepare("UPDATE wallpapers SET " . implode(', ', $updates) . ", updated_at = datetime('now') WHERE id = ?")->execute($vals);
        }
        echo json_encode(['message' => 'Status updated']);
        exit;
    }

    if (is_numeric($param1) && $method === 'PUT') {
        $admin = requireAuth($pdo);
        $wId = (int)$param1;
        $stmt = $pdo->prepare("
            UPDATE wallpapers SET
                title = ?, description = ?, category_id = ?, resolution = ?,
                is_published = ?, is_featured = ?, is_popular = ?, is_new = ?,
                updated_at = datetime('now')
            WHERE id = ?
        ");
        $stmt->execute([
            $body['title'] ?? '', $body['description'] ?? '', (int)($body['category_id'] ?? 1),
            $body['resolution'] ?? 'HD', !empty($body['is_published']) ? 1 : 0,
            !empty($body['is_featured']) ? 1 : 0, !empty($body['is_popular']) ? 1 : 0,
            !empty($body['is_new']) ? 1 : 0, $wId
        ]);
        logActivity($pdo, $admin['id'], 'Wallpaper Updated', 'wallpaper', "Updated wallpaper ID: {$wId}");
        echo json_encode(['message' => 'Wallpaper updated successfully']);
        exit;
    }

    if (is_numeric($param1) && $method === 'DELETE') {
        $admin = requireAuth($pdo);
        $wId = (int)$param1;
        $pdo->prepare("DELETE FROM wallpapers WHERE id = ?")->execute([$wId]);
        logActivity($pdo, $admin['id'], 'Wallpaper Deleted', 'wallpaper', "Deleted wallpaper ID: {$wId}");
        echo json_encode(['message' => 'Wallpaper deleted']);
        exit;
    }
}

// 6. Categories
if ($resource === 'categories') {
    if (!$param1 && $method === 'GET') {
        $cats = $pdo->query("SELECT c.*, COUNT(w.id) as wallpaper_count FROM categories c LEFT JOIN wallpapers w ON w.category_id = c.id GROUP BY c.id ORDER BY c.display_order ASC")->fetchAll();
        echo json_encode(['categories' => $cats]);
        exit;
    }

    if (is_numeric($param1) && $method === 'GET') {
        $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
        $stmt->execute([(int)$param1]);
        $cat = $stmt->fetch();
        if (!$cat) { http_response_code(404); echo json_encode(['error' => 'Not found']); exit; }
        echo json_encode(['category' => $cat]);
        exit;
    }

    if (!$param1 && $method === 'POST') {
        $admin = requireAuth($pdo);
        $name = trim($body['name'] ?? '');
        $slug = slugify($name);
        $maxOrder = (int)$pdo->query("SELECT MAX(display_order) FROM categories")->fetchColumn();
        $stmt = $pdo->prepare("INSERT INTO categories (name, slug, description, cover_image, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $slug, $body['description'] ?? '', $body['cover_image'] ?? null, $maxOrder + 1, !empty($body['is_active']) ? 1 : 0]);
        logActivity($pdo, $admin['id'], 'Category Created', 'category', "Created category: {$name}");
        echo json_encode(['message' => 'Category created']);
        exit;
    }

    if (is_numeric($param1) && $method === 'PUT') {
        $admin = requireAuth($pdo);
        $cId = (int)$param1;
        $name = trim($body['name'] ?? '');
        $stmt = $pdo->prepare("UPDATE categories SET name = ?, description = ?, cover_image = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?");
        $stmt->execute([$name, $body['description'] ?? '', $body['cover_image'] ?? null, !empty($body['is_active']) ? 1 : 0, $cId]);
        logActivity($pdo, $admin['id'], 'Category Updated', 'category', "Updated category ID: {$cId}");
        echo json_encode(['message' => 'Category updated']);
        exit;
    }

    if (is_numeric($param1) && $method === 'DELETE') {
        $admin = requireAuth($pdo);
        $cId = (int)$param1;
        $count = $pdo->query("SELECT COUNT(*) FROM wallpapers WHERE category_id = $cId")->fetchColumn();
        if ($count > 0) {
            http_response_code(400);
            echo json_encode(['error' => "Cannot delete category with $count assigned wallpapers. Reassign them first."]);
            exit;
        }
        $pdo->prepare("DELETE FROM categories WHERE id = ?")->execute([$cId]);
        logActivity($pdo, $admin['id'], 'Category Deleted', 'category', "Deleted category ID: {$cId}");
        echo json_encode(['message' => 'Category deleted']);
        exit;
    }
}

// 7. Collections
if ($resource === 'collections') {
    if (!$param1 && $method === 'GET') {
        $cols = $pdo->query("SELECT c.*, COUNT(cw.wallpaper_id) as wallpaper_count FROM collections c LEFT JOIN collection_wallpapers cw ON cw.collection_id = c.id GROUP BY c.id ORDER BY c.display_order ASC")->fetchAll();
        $prevStmt = $pdo->prepare("SELECT w.id, w.title, w.thumbnail_url FROM collection_wallpapers cw JOIN wallpapers w ON w.id = cw.wallpaper_id WHERE cw.collection_id = ? LIMIT 4");
        foreach ($cols as &$c) {
            $prevStmt->execute([$c['id']]);
            $c['previews'] = $prevStmt->fetchAll();
        }
        echo json_encode(['collections' => $cols]);
        exit;
    }

    if (is_numeric($param1) && $method === 'DELETE') {
        $admin = requireAuth($pdo);
        $pdo->prepare("DELETE FROM collections WHERE id = ?")->execute([(int)$param1]);
        logActivity($pdo, $admin['id'], 'Collection Deleted', 'collection', "Deleted collection ID: {$param1}");
        echo json_encode(['message' => 'Collection deleted']);
        exit;
    }
}

// 8. Users
if ($resource === 'users') {
    $admin = requireAuth($pdo);
    if (!$param1 && $method === 'GET') {
        $users = $pdo->query("SELECT u.id, u.email, u.username, u.is_active, u.created_at, COUNT(DISTINCT f.id) as favorites_count, COUNT(DISTINCT d.id) as downloads_count FROM users u LEFT JOIN user_favorites f ON f.user_id = u.id LEFT JOIN download_logs d ON d.user_id = u.id GROUP BY u.id ORDER BY u.created_at DESC")->fetchAll();
        echo json_encode(['users' => $users]);
        exit;
    }

    if (is_numeric($param1) && $param2 === 'status' && $method === 'PUT') {
        $pdo->prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?")->execute([!empty($body['is_active']) ? 1 : 0, (int)$param1]);
        echo json_encode(['message' => 'User status updated']);
        exit;
    }

    if (is_numeric($param1) && $method === 'DELETE') {
        $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([(int)$param1]);
        echo json_encode(['message' => 'User deleted']);
        exit;
    }
}

// 9. Settings
if ($resource === 'settings') {
    $admin = requireAuth($pdo);
    if ($method === 'GET') {
        $rows = $pdo->query("SELECT key, value FROM settings")->fetchAll();
        $settings = [];
        foreach ($rows as $r) $settings[$r['key']] = $r['value'];
        echo json_encode(['settings' => $settings]);
        exit;
    }

    if ($method === 'PUT') {
        $stmt = $pdo->prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')");
        foreach ($body as $k => $v) {
            $stmt->execute([$k, (string)$v]);
        }
        logActivity($pdo, $admin['id'], 'Settings Saved', 'settings', 'Updated site settings');
        echo json_encode(['message' => 'Settings saved']);
        exit;
    }
}

// 10. Homepage Manager
if ($resource === 'homepage') {
    $admin = requireAuth($pdo);
    if ($method === 'GET') {
        $sections = $pdo->query("SELECT * FROM homepage_sections ORDER BY display_order ASC")->fetchAll();
        echo json_encode(['sections' => $sections]);
        exit;
    }

    if (is_numeric($param1) && $method === 'PUT') {
        $stmt = $pdo->prepare("UPDATE homepage_sections SET is_enabled = ?, updated_at = datetime('now') WHERE id = ?");
        $stmt->execute([!empty($body['is_enabled']) ? 1 : 0, (int)$param1]);
        echo json_encode(['message' => 'Section updated']);
        exit;
    }
}

// 11. Activity Log
if ($resource === 'activity') {
    $admin = requireAuth($pdo);
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 15)));
    $offset = ($page - 1) * $limit;
    $total = (int)$pdo->query("SELECT COUNT(*) FROM activity_logs")->fetchColumn();
    $logs = $pdo->query("SELECT a.*, adm.name as admin_name FROM activity_logs a LEFT JOIN admins adm ON adm.id = a.admin_id ORDER BY a.created_at DESC LIMIT $limit OFFSET $offset")->fetchAll();
    echo json_encode([
        'logs' => $logs,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'totalPages' => ceil($total / $limit)
        ]
    ]);
    exit;
}

// 12. Public API (No Auth)
if ($resource === 'public') {
    if ($param1 === 'wallpapers') {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 24)));
        $offset = ($page - 1) * $limit;

        $where = ['w.is_published = 1'];
        $params = [];
        if (!empty($_GET['category']) && $_GET['category'] !== 'all') {
            $where[] = 'c.slug = ?';
            $params[] = $_GET['category'];
        }

        $whereSql = 'WHERE ' . implode(' AND ', $where);
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM wallpapers w LEFT JOIN categories c ON c.id = w.category_id $whereSql");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT w.*, c.name as category_name, c.slug as category_slug FROM wallpapers w LEFT JOIN categories c ON c.id = w.category_id $whereSql ORDER BY w.created_at DESC LIMIT $limit OFFSET $offset");
        $stmt->execute($params);
        $items = $stmt->fetchAll();

        echo json_encode(['wallpapers' => $items, 'total' => $total]);
        exit;
    }

    if ($param1 === 'categories') {
        $cats = $pdo->query("SELECT c.*, COUNT(w.id) as wallpaper_count FROM categories c LEFT JOIN wallpapers w ON w.category_id = c.id AND w.is_published = 1 WHERE c.is_active = 1 GROUP BY c.id ORDER BY c.display_order ASC")->fetchAll();
        echo json_encode(['categories' => $cats]);
        exit;
    }

    if ($param1 === 'download' && is_numeric($param2) && $method === 'POST') {
        $wId = (int)$param2;
        $pdo->prepare("UPDATE wallpapers SET downloads = downloads + 1 WHERE id = ?")->execute([$wId]);
        $pdo->prepare("INSERT INTO download_logs (wallpaper_id, ip_address) VALUES (?, ?)")->execute([$wId, $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($param1 === 'view' && is_numeric($param2) && $method === 'POST') {
        $wId = (int)$param2;
        $pdo->prepare("UPDATE wallpapers SET views = views + 1 WHERE id = ?")->execute([$wId]);
        $pdo->prepare("INSERT INTO view_logs (wallpaper_id, ip_address) VALUES (?, ?)")->execute([$wId, $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);
        echo json_encode(['success' => true]);
        exit;
    }
}

// 404 Fallback
http_response_code(404);
echo json_encode(['error' => "API route not found: $method $uri"]);
