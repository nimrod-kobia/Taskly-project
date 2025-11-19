<?php
// check_reminders.php - Check for tasks that need reminders and return them
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    if (!isset($_GET['user_id'])) {
        throw new Exception('user_id is required');
    }
    
    $userId = intval($_GET['user_id']);
    $currentTime = date('Y-m-d H:i:s');
    
    // Find tasks where:
    // 1. reminder_enabled is true
    // 2. reminder_time <= current time
    // 3. status is 'todo' (not started yet)
    // 4. last_notification_sent is NULL or was sent more than 1 hour ago
    $stmt = $pdo->prepare("
        SELECT id, title, description, due_date, priority, status, reminder_time
        FROM tasks 
        WHERE user_id = ? 
        AND reminder_enabled = true 
        AND reminder_time IS NOT NULL
        AND reminder_time <= ?
        AND status = 'todo'
        AND (
            last_notification_sent IS NULL 
            OR last_notification_sent < (NOW() - INTERVAL '1 hour')
        )
        ORDER BY reminder_time ASC
    ");
    
    $stmt->execute([$userId, $currentTime]);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Update last_notification_sent for these tasks
    if (!empty($tasks)) {
        $taskIds = array_column($tasks, 'id');
        $placeholders = implode(',', array_fill(0, count($taskIds), '?'));
        $updateStmt = $pdo->prepare("
            UPDATE tasks 
            SET last_notification_sent = NOW() 
            WHERE id IN ($placeholders)
        ");
        $updateStmt->execute($taskIds);
    }
    
    echo json_encode([
        'success' => true,
        'reminders' => $tasks,
        'count' => count($tasks)
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
