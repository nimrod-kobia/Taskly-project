<?php


// Enable error reporting for debugging (remove in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');



// Include DB, config, and controller
require __DIR__ . '/../db.php';
require __DIR__ . '/../config.php';
require __DIR__ . '/../Controllers/TaskController.php';
require __DIR__ . '/../vendor/autoload.php';

// Read JSON input
$input = json_decode(file_get_contents('php://input'), true);
file_put_contents('php://stderr', "Input: " . print_r($input, true) . "\n");

// === JWT AUTH ===
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
    if (!$userId) throw new Exception("No user_id in token");
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token', 'details' => $e->getMessage()]);
    exit;
}

// === CREATE TASK ===
// Pass PDO and table-accurate columns to the controller
$controller = new TaskController($pdo);

// Only include columns that exist in your DB table
$taskData = [
    'title'       => $input['title'] ?? null,
    'description' => $input['description'] ?? null,
    'priority'    => $input['priority'] ?? null,
    'due_date'    => $input['due_date'] ?? null,
    'effort'      => $input['effort'] ?? null
];

$result = $controller->createTask($userId, $taskData);

echo json_encode($result);
