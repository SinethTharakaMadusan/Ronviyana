<?php
/**
 * Ronviana — Router for PHP Built-in Web Server
 * Usage: php -S 127.0.0.1:8000 router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalize API calls
if (strpos($uri, '/api') !== false) {
    require __DIR__ . '/api/index.php';
    return true;
}

// Serve static file directly if exists
$file = __DIR__ . $uri;
if (file_exists($file) && !is_dir($file)) {
    return false;
}

// If accessing directory, check for index.html
if (is_dir($file)) {
    if (file_exists($file . '/index.html')) {
        require $file . '/index.html';
        return true;
    }
}

return false;
