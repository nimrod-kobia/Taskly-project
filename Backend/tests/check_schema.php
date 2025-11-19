<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/db.php';

echo "Database Schema Information:\n\n";

// Check users table structure
echo "=== USERS TABLE ===\n";
$stmt = $pdo->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($columns as $col) {
    echo "{$col['column_name']}: {$col['data_type']}\n";
}

echo "\n=== TASKS TABLE ===\n";
$stmt = $pdo->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position");
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($columns as $col) {
    echo "{$col['column_name']}: {$col['data_type']}\n";
}

echo "\n=== SAMPLE DATA ===\n";
$stmt = $pdo->query("SELECT * FROM users LIMIT 1");
$user = $stmt->fetch(PDO::FETCH_ASSOC);
echo "Sample user: " . json_encode($user) . "\n";

$stmt = $pdo->query("SELECT * FROM tasks LIMIT 1");
$task = $stmt->fetch(PDO::FETCH_ASSOC);
echo "Sample task: " . json_encode($task) . "\n";
