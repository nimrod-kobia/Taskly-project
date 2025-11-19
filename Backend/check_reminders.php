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
    // Include both owned tasks and tasks shared with the user
    $stmt = $pdo->prepare("
        SELECT DISTINCT t.id, t.title, t.description, t.due_date, t.priority, t.status, t.reminder_time,
               CASE WHEN t.user_id = ? THEN false ELSE true END as is_shared,
               u.full_name as shared_by
        FROM tasks t
        LEFT JOIN shared_tasks st ON t.id = st.task_id
        LEFT JOIN users u ON t.user_id = u.id
        WHERE (t.user_id = ? OR st.shared_with_email = (
            SELECT email FROM users WHERE id = ?
        ))
        AND t.reminder_enabled = true 
        AND t.reminder_time IS NOT NULL
        AND t.reminder_time <= ?
        AND t.status = 'todo'
        AND (
            t.last_notification_sent IS NULL 
            OR t.last_notification_sent < (NOW() - INTERVAL '1 hour')
        )
        ORDER BY t.reminder_time ASC
    ");
    
    $stmt->execute([$userId, $userId, $userId, $currentTime]);
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
