<?php

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Load dependencies
require_once __DIR__ . '/vendor/autoload.php';
use Firebase\JWT\JWT;

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
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
    
    // Validate input - full_name is optional
    if (empty($data['email']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Email and password are required'
        ]);
        exit;
    }
    
    $fullName = isset($data['full_name']) ? trim($data['full_name']) : null;
    $email = trim($data['email']);
    $password = $data['password'];
    
    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Please enter a valid email address'
        ]);
        exit;
    }
    
    // Validate password length
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Password must be at least 6 characters long'
        ]);
        exit;
    }
    
    // Validate full_name if provided
    if ($fullName && strlen($fullName) < 2) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Full name must be at least 2 characters long'
        ]);
        exit;
    }
    
    // Load database connection and config
    require_once __DIR__ . '/db.php';
    $config = require __DIR__ . '/config.php';
    
    // Check if user already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => 'This email is already registered. Please login instead.'
        ]);
        exit;
    }
    
    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Insert user with full_name
    $stmt = $pdo->prepare(
        "INSERT INTO users (email, password, full_name, created_at) 
         VALUES (?, ?, ?, NOW()) RETURNING id, email, full_name"
    );
    $stmt->execute([$email, $hashedPassword, $fullName]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Generate JWT token
    $payload = [
        'user_id' => $result['id'],
        'email' => $result['email'],
        'iat' => time(),
        'exp' => time() + (86400 * 7) // 7 days
    ];
    
    $jwt = JWT::encode($payload, $config['jwt']['secret'], 'HS256');
    
    // Success response
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful',
        'token' => $jwt,
        'user' => [
            'id' => $result['id'],
            'email' => $result['email'],
            'full_name' => $result['full_name']
        ]
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}