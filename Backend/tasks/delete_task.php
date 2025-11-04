<?php
// Backend/tasks/delete_task.php
// Must be the very first include so CORS headers are sent before anything else
require __DIR__ . '/../cors.php';

require __DIR__ . '/../db.php';
require __DIR__ . '/../Controllers/TaskController.php';
require __DIR__ . '/../config.php';
require __DIR__ . '/../vendor/autoload.php';

header('Content-Type: application/json');
error_reporting(E_ALL & ~E_NOTICE);
ini_set('display_errors', 0);

// Respond to preflight requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- JWT validation (robust) ---
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader && function_exists('apache_request_headers')) {
    $hdrs = apache_request_headers();
    if (!empty($hdrs['Authorization'])) $authHeader = $hdrs['Authorization'];
}
$token = str_replace('Bearer ', '', $authHeader);
$secretKey = $config['jwt']['secret'] ?? 'taskly_secret_2025';

try {
    $payload = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($secretKey, 'HS256'));
    $userId = $payload->user_id ?? null;
    if (!$userId) throw new Exception('Invalid token payload (no user_id)');
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid token', 'details' => $e->getMessage()]);
    exit;
}

// --- Get task id from multiple possible sources ---
$taskId = null;

// 1) Query string ?id=...
if (!empty($_GET['id'])) {
    $taskId = $_GET['id'];
}

// 2) POST JSON body or form POST
if (!$taskId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (is_array($body) && !empty($body['id'])) {
        $taskId = $body['id'];
    } elseif (!empty($_POST['id'])) {
        $taskId = $_POST['id'];
    }
}

// 3) DELETE raw body (JSON or urlencoded)
if (!$taskId && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $raw = file_get_contents('php://input');
    $parsed = json_decode($raw, true);
    if (is_array($parsed) && !empty($parsed['id'])) {
        $taskId = $parsed['id'];
    } else {
        parse_str($raw, $parsedStr);
        if (!empty($parsedStr['id'])) $taskId = $parsedStr['id'];
    }
}

// Validate taskId
if (!$taskId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Task ID required']);
    exit;
}

// optional: cast to int
$taskId = (int)$taskId;
if ($taskId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid Task ID']);
    exit;
}

// --- Perform deletion via controller ---
// Your controller method currently echoes JSON itself; call it and stop further output.
try {
    $controller = new TaskController($pdo);
    $controller->deleteTask($userId, $taskId);
    // controller already echoed JSON (success or 404). Ensure we don't echo further.
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error', 'details' => $e->getMessage()]);
    exit;
}
