<?php
// Backend/controllers/AuthController.php
require_once __DIR__ . '/../vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

class AuthController {
    private $pdo;
    private $jwtConfig;

    public function __construct($pdo, $jwtConfig) {
        $this->pdo = $pdo;
        $this->jwtConfig = $jwtConfig;
    }

    public function register($data) {
        if (empty($data['email']) || empty($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Email and password required']);
            return;
        }
        $email = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
        if (!$email) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid email']);
            return;
        }

        $name = isset($data['name']) ? trim($data['name']) : null;
        $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);

        // check if exists
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Email already registered']);
            return;
        }

        $stmt = $this->pdo->prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
        $stmt->execute([$name, $email, $password_hash]);
        $id = $this->pdo->lastInsertId();

        $token = $this->generateJWT($id, $email);
        echo json_encode(['token' => $token, 'user' => ['id'=>$id,'email'=>$email,'name'=>$name]]);
    }

    public function login($data) {
        if (empty($data['email']) || empty($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Email and password required']);
            return;
        }
        $stmt = $this->pdo->prepare("SELECT id, password_hash, name FROM users WHERE email = ?");
        $stmt->execute([$data['email']]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
            return;
        }
        $token = $this->generateJWT($user['id'], $data['email']);
        echo json_encode(['token'=>$token, 'user'=>['id'=>$user['id'],'email'=>$data['email'],'name'=>$user['name']]]);
    }

    private function generateJWT($userId, $email) {
        $now = time();
        $payload = [
            'iss' => $this->jwtConfig['issuer'],
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + $this->jwtConfig['expire_seconds'],
            'sub' => $userId,
            'email' => $email
        ];
        return JWT::encode($payload, $this->jwtConfig['secret'], 'HS256');
    }
}
