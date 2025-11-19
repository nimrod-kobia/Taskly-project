<?php
require __DIR__ . '/db.php';

echo "Checking priority values in database:\n";
$stmt = $pdo->query('SELECT DISTINCT priority FROM tasks ORDER BY priority');
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "  - " . $row['priority'] . "\n";
}

echo "\nChecking status values in database:\n";
$stmt = $pdo->query('SELECT DISTINCT status FROM tasks ORDER BY status');
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "  - " . $row['status'] . "\n";
}
