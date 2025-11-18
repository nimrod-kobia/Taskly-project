<?php
// Create a test user with known credentials

require_once __DIR__ . '/db.php';

$email = "test@example.com";
$password = "test123";
$fullName = "Test User";

echo "Creating test user...\n";
echo "Email: $email\n";
echo "Password: $password\n";
echo "Full Name: $fullName\n\n";

// Check if user already exists
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);

if ($stmt->fetch()) {
    echo "❌ User already exists. Deleting...\n";
    $stmt = $pdo->prepare("DELETE FROM users WHERE email = ?");
    $stmt->execute([$email]);
    echo "✅ Deleted existing user\n\n";
}

// Hash password
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Insert new user
$stmt = $pdo->prepare("
    INSERT INTO users (email, password, full_name, created_at) 
    VALUES (?, ?, ?, NOW()) 
    RETURNING id, email, full_name
");
$stmt->execute([$email, $hashedPassword, $fullName]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user) {
    echo "✅ Test user created successfully!\n";
    echo "User ID: " . $user['id'] . "\n";
    echo "Email: " . $user['email'] . "\n";
    echo "Full Name: " . $user['full_name'] . "\n\n";
    
    // Create a test task
    echo "Creating test task...\n";
    $stmt = $pdo->prepare("
        INSERT INTO tasks (user_id, title, description, priority, status, created_at)
        VALUES (?, 'Test Task', 'This is a test task', 'medium', 'todo', NOW())
        RETURNING id, title
    ");
    $stmt->execute([$user['id']]);
    $task = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($task) {
        echo "✅ Test task created!\n";
        echo "Task ID: " . $task['id'] . "\n";
        echo "Title: " . $task['title'] . "\n";
    }
} else {
    echo "❌ Failed to create user\n";
}
