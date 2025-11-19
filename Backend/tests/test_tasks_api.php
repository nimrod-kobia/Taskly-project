<?php
// Simple test to check tasks.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Testing tasks.php API...\n\n";

// Test 1: Include db.php
try {
    require_once __DIR__ . '/db.php';
    echo "✓ Database connected\n";
} catch (Exception $e) {
    echo "✗ Database connection failed: " . $e->getMessage() . "\n";
    exit;
}

// Test 2: Query tasks for user 1
try {
    $stmt = $pdo->prepare("SELECT * FROM tasks WHERE user_id = ? LIMIT 5");
    $stmt->execute([1]);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "✓ Found " . count($tasks) . " tasks for user 1\n";
    
    if (count($tasks) > 0) {
        echo "\nSample task:\n";
        print_r($tasks[0]);
    }
} catch (Exception $e) {
    echo "✗ Query failed: " . $e->getMessage() . "\n";
}
