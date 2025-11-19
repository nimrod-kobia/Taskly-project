<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Load dependencies
require_once __DIR__ . '/vendor/autoload.php';
use Firebase\JWT\JWT;

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Invalid JSON input');
    }
    
    // Validate input
    if (empty($data['email']) || empty($data['password'])) {
        throw new Exception('Email and password are required');
    }
    
    $email = trim($data['email']);
    $password = $data['password'];
    
    // Load database connection and config
    require_once __DIR__ . '/db.php';
    $config = require __DIR__ . '/config.php';
    
    // Validate email format first
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Please enter a valid email address'
        ]);
        exit;
    }
    
    // Find user by email (include full_name)
    $stmt = $pdo->prepare("SELECT id, email, password, full_name FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'No account found with this email address'
        ]);
        exit;
    }
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Incorrect password. Please try again.'
        ]);
        exit;
    }
    
    // Generate JWT token
    $payload = [
        'user_id' => $user['id'],
        'email' => $user['email'],
        'iat' => time(),
        'exp' => time() + (86400 * 7) // 7 days
    ];
    
    $jwt = JWT::encode($payload, $config['jwt']['secret'], 'HS256');
    
    // Login successful
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'token' => $jwt,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'full_name' => $user['full_name']
        ]
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error occurred. Please try again later.'
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}