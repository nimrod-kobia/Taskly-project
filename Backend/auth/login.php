<?php
// Backend/auth/login.php

// --- CORS must run before anything else (even autoload) ---
require __DIR__ . '/../cors.php';

// --- Now continue ---
require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../db.php';
$config = require __DIR__ . '/../config.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Always return JSON
header('Content-Type: application/json');

// Decode incoming JSON
$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password required']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password']);
        exit;
    }

    if (!$user['verified']) {
        http_response_code(403);
        echo json_encode(['error' => 'Please verify your email first']);
        exit;
    }

    $secretKey = $config['jwt']['secret'] ?? 'taskly_secret_2025';
    $payload = [
        'user_id' => $user['id'],
        'email' => $user['email'],
        'iat' => time(),
        'exp' => time() + 86400 // 1 day
    ];

    $token = JWT::encode($payload, $secretKey, 'HS256');

    echo json_encode([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email']
        ]
    ]);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error', 'details' => $e->getMessage()]);
    exit;
}
