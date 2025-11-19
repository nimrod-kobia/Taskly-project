<?php
// Backend/tasks/get_tasks.php

// === STEP 1: CORS must be the very first thing ===
require __DIR__ . '/../cors.php';

// === STEP 2: Include dependencies ===
require __DIR__ . '/../db.php';
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

if (!$token) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No token provided']);
    exit;
}

$secretKey = $config['jwt']['secret'] ?? 'taskly_secret_2025';

try {
    $payload = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($secretKey, 'HS256'));
    $userId = $payload->user_id ?? null;
    
    if (!$userId) {
        throw new Exception('Invalid token payload');
    }
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid token: ' . $e->getMessage()]);
    exit;
}

// === STEP 5: Fetch tasks ===
try {
    // Check if database connection exists
    if (!isset($pdo)) {
        throw new Exception('Database connection not available');
    }
    
    $stmt = $pdo->prepare("
        SELECT 
            id,
            title,
            description,
            priority,
            status,
            due_date,
            created_at
        FROM tasks 
        WHERE user_id = ?
        ORDER BY created_at DESC
    ");
    $stmt->execute([$userId]);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'tasks' => $tasks ?? []
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error',
        'details' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error',
        'details' => $e->getMessage()
    ]);
}
