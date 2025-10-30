<?php
require __DIR__ . '/../db.php';
require __DIR__ . '/../controllers/TaskController.php';
require __DIR__ . '/../config.php';
require __DIR__ . '/../vendor/autoload.php'; // in case JWT lib is needed

// Always return JSON
header('Content-Type: application/json');

// Hide PHP warnings from output to keep JSON valid
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php-errors.log');
error_reporting(E_ALL);

// === JWT validation ===
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);
$secretKey = $config['jwt']['secret'] ?? 'taskly_secret_2025';

try {
    $payload = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($secretKey, 'HS256'));
    $userId = $payload->user_id;
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid token']);
    exit;
}

// === Get Task ID ===
$taskId = $_GET['id'] ?? null;
if (!$taskId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Task ID required']);
    exit;
}

// === Delete Task ===
try {
    $controller = new TaskController($pdo, $config['jwt'], $config['smtp']);
    $controller->deleteTask($userId, $taskId);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
