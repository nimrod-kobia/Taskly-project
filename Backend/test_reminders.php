<?php
// test_reminders.php - Create test tasks to verify reminder system
require_once __DIR__ . '/db.php';

echo "=== Taskly Reminder System Test ===\n\n";

try {
    // Get first user
    $stmt = $pdo->query("SELECT id, email, full_name FROM users LIMIT 1");
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo "❌ No users found. Please create a user first.\n";
        exit(1);
    }
    
    echo "Creating test tasks for user: {$user['full_name']} ({$user['email']})\n\n";
    
    // Test 1: Task due in 24 hours (should trigger 24h reminder)
    $dueIn24h = (new DateTime())->modify('+24 hours')->format('Y-m-d H:i:s');
    $stmt = $pdo->prepare("
        INSERT INTO tasks (user_id, title, description, due_date, priority, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
        RETURNING id
    ");
    $stmt->execute([
        $user['id'],
        "Test: 24-Hour Reminder Task",
        "This task is due in exactly 24 hours and should trigger a reminder email.",
        $dueIn24h,
        'high',
        'todo'
    ]);
    $taskId1 = $stmt->fetchColumn();
    echo "✅ Created Task #$taskId1: Due in 24 hours ($dueIn24h)\n";
    
    // Test 2: Task due in 10 minutes (should trigger 10min reminder)
    $dueIn10min = (new DateTime())->modify('+10 minutes')->format('Y-m-d H:i:s');
    $stmt->execute([
        $user['id'],
        "Test: 10-Minute Reminder Task",
        "This task is due in 10 minutes and should trigger an urgent reminder!",
        $dueIn10min,
        'high',
        'todo'
    ]);
    $taskId2 = $stmt->fetchColumn();
    echo "✅ Created Task #$taskId2: Due in 10 minutes ($dueIn10min)\n";
    
    // Test 3: Task due in 1 hour (should NOT trigger any reminder yet)
    $dueIn1h = (new DateTime())->modify('+1 hour')->format('Y-m-d H:i:s');
    $stmt->execute([
        $user['id'],
        "Test: 1-Hour Task (No Reminder Yet)",
        "This task is due in 1 hour. No reminder should be sent yet.",
        $dueIn1h,
        'medium',
        'todo'
    ]);
    $taskId3 = $stmt->fetchColumn();
    echo "✅ Created Task #$taskId3: Due in 1 hour ($dueIn1h)\n";
    
    echo "\n=== Test Setup Complete ===\n\n";
    echo "Next steps:\n";
    echo "1. Run: php automated_reminders.php\n";
    echo "2. Check your email: {$user['email']}\n";
    echo "3. Check logs: type logs\\reminders.log\n";
    echo "\nExpected results:\n";
    echo "- Task #$taskId1: Should send 24-hour reminder ✉️\n";
    echo "- Task #$taskId2: Should send 10-minute reminder ✉️\n";
    echo "- Task #$taskId3: Should NOT send any reminder yet ⏳\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
