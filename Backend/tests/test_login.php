<?php
// Test login with existing user

require_once __DIR__ . '/db.php';

// Try to login with one of the existing users
$email = "louisngatia47@gmail.com"; // From our schema check
$password = "password123"; // Common test password

echo "Testing login for: $email\n";
echo "========================================\n\n";

// Find user
$stmt = $pdo->prepare("SELECT id, email, password, full_name FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo "❌ User not found\n";
    exit;
}

echo "✅ User found:\n";
echo "ID: " . $user['id'] . "\n";
echo "Email: " . $user['email'] . "\n";
echo "Full Name: " . $user['full_name'] . "\n";
echo "Password Hash: " . substr($user['password'], 0, 20) . "...\n\n";

// Check if password hash looks valid
if (strpos($user['password'], '$2y$') === 0) {
    echo "✅ Password is hashed with bcrypt\n";
} else {
    echo "❌ Password doesn't look like a bcrypt hash\n";
}

// Now get tasks for this user
echo "\n========================================\n";
echo "Tasks for user_id=" . $user['id'] . ":\n";
echo "========================================\n\n";

$stmt = $pdo->prepare("SELECT id, title, status, priority FROM tasks WHERE user_id = ? LIMIT 5");
$stmt->execute([$user['id']]);
$tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

if ($tasks) {
    echo "✅ Found " . count($tasks) . " tasks:\n";
    foreach ($tasks as $task) {
        echo "  - Task #{$task['id']}: {$task['title']} [{$task['status']}] [{$task['priority']}]\n";
    }
} else {
    echo "ℹ️ No tasks found for this user\n";
}
