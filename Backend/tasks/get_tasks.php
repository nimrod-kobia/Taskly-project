<?php
// Backend/tasks/get_tasks.php

// === STEP 1: CORS must be the very first thing ===
require __DIR__ . '/../cors.php';

// === STEP 2: Include dependencies ===
require __DIR__ . '/../db.php';
require __DIR__ . '/../Controllers/TaskController.php'; // Note the capital "C"
require __DIR__ . '/../config.php';
require __DIR__ . '/../vendor/autoload.php';

// === STEP 3: Error handling ===
error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE);
ini_set('display_errors', 0);

header('Content-Type: application/json');

// === STEP 4: JWT Validation ===
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
    }
}

$token = str_replace('Bearer ', '', $authHeader);
$secretKey = $config['jwt']['secret'] ?? 'taskly_secret_2025';

try {
    $payload = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($secretKey, 'HS256'));
    $userId = $payload->user_id ?? null;
    if (!$userId) throw new Exception('Missing user ID in token');
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token', 'details' => $e->getMessage()]);
    exit;
}

// === STEP 5: Fetch tasks ===
try {
    $controller = new TaskController($pdo, $config['jwt'] ?? [], $config['smtp'] ?? []);
    $controller->getTasks($userId);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error fetching tasks',
        'details' => $e->getMessage()
    ]);
}
