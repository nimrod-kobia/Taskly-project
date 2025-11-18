<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/db.php';

try {
    echo json_encode(['step' => 'Testing database connection']) . "\n";
    
    // Test 1: Check if users table exists
    $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users'");
    $usersExists = $stmt->fetchColumn() > 0;
    echo json_encode(['users_table_exists' => $usersExists]) . "\n";
    
    // Test 2: Check if tasks table exists
    $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tasks'");
    $tasksExists = $stmt->fetchColumn() > 0;
    echo json_encode(['tasks_table_exists' => $tasksExists]) . "\n";
    
    // Test 3: Check if shared_tasks table exists
    $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'shared_tasks'");
    $sharedTasksExists = $stmt->fetchColumn() > 0;
    echo json_encode(['shared_tasks_table_exists' => $sharedTasksExists]) . "\n";
    
    // Test 4: Count records
    if ($usersExists) {
        $stmt = $pdo->query("SELECT COUNT(*) FROM users");
        echo json_encode(['users_count' => $stmt->fetchColumn()]) . "\n";
    }
    
    if ($tasksExists) {
        $stmt = $pdo->query("SELECT COUNT(*) FROM tasks");
        echo json_encode(['tasks_count' => $stmt->fetchColumn()]) . "\n";
    }
    
    if ($sharedTasksExists) {
        $stmt = $pdo->query("SELECT COUNT(*) FROM shared_tasks");
        echo json_encode(['shared_tasks_count' => $stmt->fetchColumn()]) . "\n";
    }
    
    // Test 5: Check table structures
    if ($tasksExists) {
        $stmt = $pdo->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['tasks_columns' => $columns]) . "\n";
    }
    
    echo json_encode(['status' => 'All tests completed successfully']) . "\n";
    
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]) . "\n";
}
