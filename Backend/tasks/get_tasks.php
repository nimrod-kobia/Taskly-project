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
            created_at,
            COALESCE(effort, 1) as effort,
            COALESCE(urgency, 1) as urgency,
            -- Calculate priority score (1-3)
            CASE 
                WHEN LOWER(priority) = 'high' THEN 3
                WHEN LOWER(priority) = 'medium' THEN 2
                ELSE 1
            END as priority_score,
            -- Calculate deadline urgency (0-5)
            CASE 
                WHEN due_date IS NULL THEN 0
                WHEN due_date < CURRENT_DATE THEN 5
                WHEN due_date = CURRENT_DATE THEN 4
                WHEN due_date <= CURRENT_DATE + INTERVAL '1 day' THEN 3
                WHEN due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 2
                WHEN due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1
                ELSE 0
            END as deadline_urgency,
            -- Total score: urgency + deadline_urgency + effort + priority_score
            COALESCE(urgency, 1) + 
            CASE 
                WHEN due_date IS NULL THEN 0
                WHEN due_date < CURRENT_DATE THEN 5
                WHEN due_date = CURRENT_DATE THEN 4
                WHEN due_date <= CURRENT_DATE + INTERVAL '1 day' THEN 3
                WHEN due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 2
                WHEN due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1
                ELSE 0
            END + 
            COALESCE(effort, 1) + 
            CASE 
                WHEN LOWER(priority) = 'high' THEN 3
                WHEN LOWER(priority) = 'medium' THEN 2
                ELSE 1
            END as score
        FROM tasks 
        WHERE user_id = ?
        ORDER BY created_at DESC
    ");
    $stmt->execute([$userId]);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Fetch shared recipients for each task
    foreach ($tasks as &$task) {
        // Convert numeric fields to integers
        $task['effort'] = isset($task['effort']) ? (int)$task['effort'] : 1;
        $task['urgency'] = isset($task['urgency']) ? (int)$task['urgency'] : 1;
        $task['priority_score'] = isset($task['priority_score']) ? (int)$task['priority_score'] : 1;
        $task['deadline_urgency'] = isset($task['deadline_urgency']) ? (int)$task['deadline_urgency'] : 0;
        $task['score'] = isset($task['score']) ? (int)$task['score'] : 0;
        
        $stmt = $pdo->prepare("
            SELECT shared_with_email, shared_at, id as share_id
            FROM shared_tasks
            WHERE task_id = ?
            ORDER BY shared_at DESC
        ");
        $stmt->execute([$task['id']]);
        $task['shared_with'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $task['shared_count'] = count($task['shared_with']);
        $task['has_been_shared'] = $task['shared_count'] > 0;
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
