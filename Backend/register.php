<?php

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

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
        throw new Exception('Email and password are required');
    }
    
    $fullName = isset($data['full_name']) ? trim($data['full_name']) : null;
    $email = trim($data['email']);
    $password = $data['password'];
    
    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }
    
    // Validate password length
    if (strlen($password) < 6) {
        throw new Exception('Password must be at least 6 characters');
    }
    
    // Validate full_name if provided
    if ($fullName && strlen($fullName) < 2) {
        throw new Exception('Full name must be at least 2 characters');
    }
    
    // Load database connection
    require_once __DIR__ . '/db.php';
    
    // Check if user already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->fetch()) {
        throw new Exception('Email already registered');
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
    
    // Success response
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful',
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