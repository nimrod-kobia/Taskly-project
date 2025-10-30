<?php
require 'db.php';

$stmt = $pdo->query("SELECT NOW()");
echo json_encode($stmt->fetch());
