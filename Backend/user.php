<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Extract and verify JWT token
function getAuthenticatedUserId() {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : 
                  (isset($headers['authorization']) ? $headers['authorization'] : null);
    
    if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }
    
    $token = $matches[1];
    $config = require __DIR__ . '/config.php';
    $secretKey = isset($config['jwt']['secret']) ? $config['jwt']['secret'] : 'your-secret-key-change-this-in-production';
    
    try {
        $decoded = JWT::decode($token, new Key($secretKey, 'HS256'));
        return $decoded->user_id;
    } catch (Exception $e) {
        throw new Exception('Invalid or expired token');
    }
}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        // Get user profile
        $userId = getAuthenticatedUserId();
        
        $stmt = $pdo->prepare("SELECT id, name, email, created_at FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            throw new Exception('User not found');
        }
        
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'name' => $user['full_name'],
                'email' => $user['email'],
                'registered_at' => $user['created_at']
            ]
        ]);
        
    } elseif ($method === 'PUT' || $method === 'POST') {
        // Update user profile
        $userId = getAuthenticatedUserId();
        
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!$data) {
            throw new Exception('Invalid JSON input');
        }
        
        $updates = [];
        $params = [];
        
        // Update name if provided
        if (isset($data['fullName']) && !empty(trim($data['fullName']))) {
            $updates[] = "full_name = ?";
            $params[] = trim($data['fullName']);
        } elseif (isset($data['name']) && !empty(trim($data['name']))) {
            $updates[] = "full_name = ?";
            $params[] = trim($data['name']);
        }
        
        // Update email if provided
        if (isset($data['email']) && !empty(trim($data['email']))) {
            $email = trim($data['email']);
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new Exception('Invalid email format');
            }
            
            // Check if email is already taken by another user
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
            $stmt->execute([$email, $userId]);
            if ($stmt->fetch()) {
                throw new Exception('Email already in use');
            }
            
            $updates[] = "email = ?";
            $params[] = $email;
        }
        
        // Update password if provided
        if (isset($data['password']) && !empty($data['password'])) {
            if (strlen($data['password']) < 6) {
                throw new Exception('Password must be at least 6 characters long');
            }
            $updates[] = "password = ?";
            $params[] = password_hash($data['password'], PASSWORD_BCRYPT);
        }
        
        if (empty($updates)) {
            throw new Exception('No fields to update');
        }
        
        // Add user ID to params for WHERE clause
        $params[] = $userId;
        
        // Build and execute update query
        $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // Get updated user data
        $stmt = $pdo->prepare("SELECT id, full_name, email, created_at FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => $user['id'],
                'name' => $user['full_name'],
                'email' => $user['email'],
                'registered_at' => $user['created_at']
            ]
        ]);
        
    } else {
        throw new Exception('Method not allowed');
    }
    
} catch (PDOException $e) {
    error_log('User API Database Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error occurred',
        'message' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log('User API Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'message' => $e->getMessage()
    ]);
}
