<?php
require __DIR__ . '/../cors.php';
require __DIR__ . '/../db.php';
require __DIR__ . '/../config.php';
require __DIR__ . '/../vendor/autoload.php';

header('Content-Type: application/json');

// JWT
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);
$secretKey = $config['jwt']['secret'] ?? 'taskly_secret_2025';

try {
    $payload = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($secretKey, 'HS256'));
    $userId = $payload->user_id;
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}

// Fetch user info from DB
$stmt = $pdo->prepare("SELECT id, email, full_name, created_at FROM users WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

// Return user object in a way profile.js expects
echo json_encode([
    'user' => [
        'id' => $user['id'],
        'name' => $user['full_name'],
        'email' => $user['email'],
        'registered_at' => $user['created_at']
    ]
]);
