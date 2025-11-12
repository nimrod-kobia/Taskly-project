<?php
// Backend/db.php
require_once __DIR__ . '/config.php';

try {
    $pdo = new PDO(
        "pgsql:host={$db_config['host']};dbname={$db_config['dbname']};sslmode=require",
        $db_config['user'],
        $db_config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_PERSISTENT => true, // Enable persistent connections
            PDO::ATTR_TIMEOUT => 5, // Set connection timeout
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit;
}
