<?php
require __DIR__ . '/../cors.php';
require __DIR__ . '/../db.php';
require __DIR__ . '/../Controllers/TaskController.php';
require __DIR__ . '/../config.php';
require __DIR__ . '/../vendor/autoload.php';

error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json');

// === JWT Validation ===
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

// === Get Task ID from query ===
$taskId = $_GET['id'] ?? null;
if (!$taskId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Task ID required']);
    exit;
}

// === Get POST data ===
$data = json_decode(file_get_contents('php://input'), true) ?? [];

// Validate required fields
$requiredFields = ['title', 'due_date', 'priority', 'status'];
foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || trim($data[$field]) === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Missing field: $field"]);
        exit;
    }
}

// Optional: sanitize inputs
$title = htmlspecialchars(trim($data['title']));
$description = htmlspecialchars(trim($data['description'] ?? ''));
$due_date = $data['due_date'];
$priority = $data['priority'];
$status = $data['status'];
$effort = isset($data['effort']) ? (int)$data['effort'] : 1;

// === Update Task ===
try {
    $controller = new TaskController($pdo, $config['jwt'], $config['smtp']);
    $updatedTask = $controller->updateTask($userId, $taskId, [
        'title' => $title,
        'description' => $description,
        'due_date' => $due_date,
        'priority' => $priority,
        'status' => $status,
        'effort' => $effort
    ]);

    // Return the updated task object for instant JS refresh
    echo json_encode([
        'success' => true,
        'task' => $updatedTask
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
