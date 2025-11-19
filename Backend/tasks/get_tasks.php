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
            t.id,
            t.title,
            t.description,
            t.priority,
            t.status,
            t.due_date,
            t.created_at,
            t.reminder_enabled,
            t.reminder_time,
            COALESCE(CAST(t.effort AS INTEGER), 1) as effort,
            COALESCE(CAST(t.urgency AS INTEGER), 1) as urgency,
            -- Calculate priority score (1-3)
            CASE 
                WHEN LOWER(t.priority) = 'high' THEN 3
                WHEN LOWER(t.priority) = 'medium' THEN 2
                ELSE 1
            END as priority_score,
            -- Calculate deadline urgency (0-5)
            CASE 
                WHEN t.due_date IS NULL THEN 0
                WHEN t.due_date < CURRENT_DATE THEN 5
                WHEN t.due_date = CURRENT_DATE THEN 4
                WHEN t.due_date <= CURRENT_DATE + INTERVAL '1 day' THEN 3
                WHEN t.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 2
                WHEN t.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1
                ELSE 0
            END as deadline_urgency,
            -- Total score
            (COALESCE(CAST(t.urgency AS INTEGER), 1) + 
            CASE 
                WHEN t.due_date IS NULL THEN 0
                WHEN t.due_date < CURRENT_DATE THEN 5
                WHEN t.due_date = CURRENT_DATE THEN 4
                WHEN t.due_date <= CURRENT_DATE + INTERVAL '1 day' THEN 3
                WHEN t.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 2
                WHEN t.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1
                ELSE 0
            END + 
            COALESCE(CAST(t.effort AS INTEGER), 1) + 
            CASE 
                WHEN LOWER(t.priority) = 'high' THEN 3
                WHEN LOWER(t.priority) = 'medium' THEN 2
                ELSE 1
            END) as score,
            -- Get share count in a single query
            COALESCE((SELECT COUNT(*) FROM shared_tasks WHERE task_id = t.id), 0) as shared_count,
            CASE WHEN EXISTS(SELECT 1 FROM shared_tasks WHERE task_id = t.id) THEN true ELSE false END as has_been_shared
        FROM tasks t
        WHERE t.user_id = ?
        ORDER BY t.created_at DESC
    ");
    $stmt->execute([$userId]);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert numeric fields to proper types
    foreach ($tasks as &$task) {
        $task['effort'] = (int)$task['effort'];
        $task['urgency'] = (int)$task['urgency'];
        $task['priority_score'] = (int)$task['priority_score'];
        $task['deadline_urgency'] = (int)$task['deadline_urgency'];
        $task['score'] = (int)$task['score'];
        $task['shared_count'] = (int)$task['shared_count'];
        $task['has_been_shared'] = (bool)$task['has_been_shared'];
        $task['reminder_enabled'] = (bool)$task['reminder_enabled'];
        $task['shared_with'] = []; // Empty array for compatibility
    }
    unset($task);
    
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
