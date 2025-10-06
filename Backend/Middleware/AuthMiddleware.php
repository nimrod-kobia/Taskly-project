<?php
// Backend/middleware/AuthMiddleware.php
require_once __DIR__ . '/../vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

class AuthMiddleware {
    private $jwtConfig;
    private $pdo;

    public function __construct($pdo, $jwtConfig) {
        $this->jwtConfig = $jwtConfig;
        $this->pdo = $pdo;
    }

    public function authenticate() {
        $headers = apache_request_headers();
        $auth = null;
        if (isset($headers['Authorization'])) $auth = $headers['Authorization'];
        // also accept lower-case key
        if (!$auth) {
            foreach ($headers as $k => $v) {
                if (strtolower($k) === 'authorization') {
                    $auth = $v; break;
                }
            }
        }
        if (!$auth) {
            http_response_code(401);
            echo json_encode(['error'=>'Missing Authorization header']);
            exit;
        }
        if (strpos($auth, 'Bearer ') !== 0) {
            http_response_code(401);
            echo json_encode(['error'=>'Invalid Authorization header']);
            exit;
        }
        $token = substr($auth, 7);
        try {
            $decoded = JWT::decode($token, new Key($this->jwtConfig['secret'], 'HS256'));
            // Attach user info to global context
            return (int)$decoded->sub;
        } catch (Exception $e) {
            http_response_code(401);
            echo json_encode(['error'=>'Invalid token']);
            exit;
        }
    }
}
