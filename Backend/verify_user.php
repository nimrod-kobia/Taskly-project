<?php
// Set all users to verified

require __DIR__ . '/db.php';

echo "Setting all users to verified...\n\n";

$stmt = $pdo->prepare("UPDATE users SET verified = true WHERE verified = false OR verified IS NULL");
$stmt->execute();
$count = $stmt->rowCount();

echo "✅ Updated $count users to verified status\n\n";

// Show all users
echo "Current users:\n";
$stmt = $pdo->query("SELECT id, email, full_name, verified FROM users ORDER BY id");
while ($user = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $verified = $user['verified'] ? '✅' : '❌';
    echo "  $verified ID: {$user['id']}, Email: {$user['email']}, Name: {$user['full_name']}\n";
}