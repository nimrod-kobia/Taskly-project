<?php
include 'config.php';
session_start();

// --- Ensure user is logged in ---
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$user_id = $_SESSION['user_id'];
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'createTask':
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $conn->prepare("INSERT INTO tasks (user_id, title, description, priority, due_date, reminder_time) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("isssss", $user_id, $data['title'], $data['description'], $data['priority'], $data['due_date'], $data['reminder_time']);
        $stmt->execute();
        echo json_encode(["message" => "Task created successfully"]);
        break;

    case 'updateTask':
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $conn->prepare("UPDATE tasks SET title=?, description=?, priority=?, status=?, due_date=?, reminder_time=? WHERE id=? AND user_id=?");
        $stmt->bind_param("ssssssii", $data['title'], $data['description'], $data['priority'], $data['status'], $data['due_date'], $data['reminder_time'], $data['id'], $user_id);
        $stmt->execute();
        echo json_encode(["message" => "Task updated successfully"]);
        break;

    case 'deleteTask':
        $id = $_GET['id'];
        $stmt = $conn->prepare("DELETE FROM tasks WHERE id=? AND user_id=?");
        $stmt->bind_param("ii", $id, $user_id);
        $stmt->execute();
        echo json_encode(["message" => "Task deleted successfully"]);
        break;

    case 'getTasks':
        $result = $conn->query("SELECT * FROM tasks WHERE user_id = $user_id ORDER BY due_date ASC");
        $tasks = $result->fetch_all(MYSQLI_ASSOC);
        echo json_encode($tasks);
        break;

    default:
        http_response_code(400);
        echo json_encode(["error" => "Invalid action"]);
}
?>
