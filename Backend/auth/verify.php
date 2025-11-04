<?php
// Backend/auth/verify.php
require __DIR__ . '/../cors.php';
require __DIR__ . '/../db.php';
$config = require __DIR__ . '/../config.php';

$token = $_GET['token'] ?? '';

if (!$token) {
    http_response_code(400);
    echo "Invalid verification link.";
    exit;
}

try {
    // Match correct column name: verify_token
    $stmt = $pdo->prepare("
        UPDATE users 
        SET verified = TRUE, verify_token = NULL 
        WHERE verify_token = ? AND verified = FALSE
    ");
    $stmt->execute([$token]);

    if ($stmt->rowCount() > 0) {
        // Success → redirect to login
        $loginPage = 'http://127.0.0.1:5501/Frontend/login.html';


        echo "<!doctype html><html><head><meta charset='utf-8'><title>Verified</title>
              <meta http-equiv='refresh' content='3;url={$loginPage}' />
              <style>
                body { font-family: Arial, Helvetica, sans-serif; text-align: center; padding: 40px; }
                h2 { color: #28a745; }
              </style>
              </head><body>
              <h2>Email Verified ✅</h2>
              <p>Your account has been activated. Redirecting to login...</p>
              <p><a href=\"{$loginPage}\">Click here if not redirected</a></p>
              </body></html>";
    } else {
        echo "<h2>Invalid or expired verification link</h2>";
    }
} catch (Exception $e) {
    http_response_code(500);
    echo "Server error: " . htmlspecialchars($e->getMessage());
}
