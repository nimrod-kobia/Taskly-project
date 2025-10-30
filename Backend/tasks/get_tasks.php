<?php
// get_tasks.php

// === Setup ===
require __DIR__ . '/../db.php';
require __DIR__ . '/../controllers/TaskController.php';
require __DIR__ . '/../config.php';
require __DIR__ . '/../vendor/autoload.php';

// Turn off warnings so JSON is not broken
error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE);
ini_set('display_errors', 0);

header('Content-Type: application/json');

// === JWT Validation ===
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);

// Ensure $config exists
$secretKey = isset($config['jwt']['secret']) ? $config['jwt']['secret'] : 'taskly_secret_2025';

try {
    $payload = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($secretKey, 'HS256'));
    $userId = $payload->user_id;
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}

// === Fetch tasks ===
try {
    $controller = new TaskController($pdo, $config['jwt'] ?? [], $config['smtp'] ?? []);
    $controller->getTasks($userId);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error fetching tasks', 'details' => $e->getMessage()]);
}
