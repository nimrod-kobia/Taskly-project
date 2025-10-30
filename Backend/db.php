<?php
// Backend/db.php

$host = "ep-mute-cake-a40ghxlz-pooler.us-east-1.aws.neon.tech";
$dbname = "neondb";
$user = "neondb_owner";
$password = "npg_9kiH2baQhWNL";
$port = "5432";

$dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";

try {
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed', 'details' => $e->getMessage()]);
    exit;
}
