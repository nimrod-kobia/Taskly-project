<?php
// Always return JSON and suppress HTML errors
header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(0);
$input = json_decode(file_get_contents('php://input'), true) ?? [];
file_put_contents(__DIR__ . '/debug.log', print_r($input, true), FILE_APPEND);


require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../db.php';
$config = require __DIR__ . '/../config.php';
$smtp = $config['smtp'] ?? [];

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

try {
    // Read JSON input
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    $fullName = trim($input['fullName'] ?? '');
    $email    = trim($input['email'] ?? '');
    $password = trim($input['password'] ?? '');

    if (!$fullName || !$email || !$password) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'All fields are required']);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid email format']);
        exit;
    }

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $token = bin2hex(random_bytes(32));

    // Start transaction
    $pdo->beginTransaction();

    // Insert user into database
    $sql = "INSERT INTO users (full_name, email, password, verify_token) VALUES (?, ?, ?, ?) RETURNING id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$fullName, $email, $passwordHash, $token]);

    $userId = $stmt->fetchColumn();

    // Build verification URL
    $base = rtrim($config['app_base_url'] ?? 'http://localhost:8000', '/');
    $verifyUrl = $base . '/Backend/auth/verify.php?token=' . $token;

    // Send verification email
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = $smtp['host'] ?? 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = $smtp['email'] ?? '';
    $mail->Password   = $smtp['password'] ?? '';
    $mail->SMTPSecure = ($smtp['secure'] ?? 'tls') === 'ssl'
                        ? PHPMailer::ENCRYPTION_SMTPS
                        : PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = $smtp['port'] ?? 587;

    $mail->setFrom($smtp['email'], 'Taskly');
    $mail->addAddress($email);
    $mail->isHTML(true);
    $mail->Subject = 'Verify your Taskly account';
    $mail->Body    = "
        <p>Hi {$fullName},</p>
        <p>Thanks for signing up. Click below to verify your email:</p>
        <p><a href='{$verifyUrl}'>Verify my Taskly account</a></p>
        <p>If the link does not work, paste this URL into your browser:</p>
        <p>{$verifyUrl}</p>
    ";

    $mail->send();

    // Commit transaction only after mail sent
    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Registration successful! Please check your email to verify your account.'
    ]);
    exit;

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Registration failed', 'details' => $e->getMessage()]);
    exit;
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to send verification email', 'details' => $e->getMessage()]);
    exit;
}


// For debugging: log input data (remove in production)
$input = json_decode(file_get_contents('php://input'), true) ?? [];
file_put_contents(__DIR__ . '/debug.log', print_r($input, true), FILE_APPEND);

