<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/db.php';

echo "Checking users and their tasks:\n\n";

// Get all users
$stmt = $pdo->query("SELECT id, name, email FROM users ORDER BY id");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Total users: " . count($users) . "\n\n";

foreach ($users as $user) {
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM tasks WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    $taskCount = $stmt->fetchColumn();
    
    echo "User #{$user['id']}: {$user['name']} ({$user['email']}) - {$taskCount} tasks\n";
}

// Show all tasks
echo "\n\nAll tasks in database:\n";
$stmt = $pdo->query("SELECT id, user_id, title, status FROM tasks ORDER BY user_id, id");
$allTasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($allTasks as $task) {
    echo "Task #{$task['id']} - User #{$task['user_id']}: {$task['title']} [{$task['status']}]\n";
}
