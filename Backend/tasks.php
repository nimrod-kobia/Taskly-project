<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers - MUST be at the very top
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Get all tasks for a user with optimized query
            if (!isset($_GET['user_id'])) {
                throw new Exception('user_id is required');
            }
            
            $userId = intval($_GET['user_id']);
            
            // Optimized query with limit (prevent loading thousands of tasks)
            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
            $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
            
            $stmt = $pdo->prepare("
                SELECT id, user_id, title, description, due_date, 
                       priority, completed, created_at
                FROM tasks 
                WHERE user_id = ? 
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$userId, $limit, $offset]);
            $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get total count for pagination
            $countStmt = $pdo->prepare("SELECT COUNT(*) as total FROM tasks WHERE user_id = ?");
            $countStmt->execute([$userId]);
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            echo json_encode([
                'success' => true,
                'tasks' => $tasks,
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset
            ]);
            break;
            
        case 'POST':
            // Create new task
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (!$data) {
                throw new Exception('Invalid JSON input');
            }
            
            // Validate required fields
            if (empty($data['user_id']) || empty($data['title'])) {
                throw new Exception('user_id and title are required');
            }
            
            $userId = intval($data['user_id']);
            $title = trim($data['title']);
            $description = isset($data['description']) ? trim($data['description']) : null;
            $dueDate = isset($data['due_date']) ? $data['due_date'] : null;
            $priority = isset($data['priority']) ? $data['priority'] : 'Medium';
            $completed = isset($data['completed']) ? (bool)$data['completed'] : false;
            
            // Validate priority
            $validPriorities = ['Low', 'Medium', 'High'];
            if (!in_array($priority, $validPriorities)) {
                $priority = 'Medium';
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO tasks (user_id, title, description, due_date, priority, completed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
                RETURNING id, user_id, title, description, due_date, priority, completed, created_at
            ");
            $stmt->execute([$userId, $title, $description, $dueDate, $priority, $completed]);
            $task = $stmt->fetch(PDO::FETCH_ASSOC);
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Task created successfully',
                'task' => $task
            ]);
            break;
            
        case 'PUT':
            // Update task
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (!$data || !isset($data['id'])) {
                throw new Exception('Task ID is required');
            }
            
            $taskId = intval($data['id']);
            
            // Build update query dynamically
            $updates = [];
            $params = [];
            
            if (isset($data['title'])) {
                $updates[] = "title = ?";
                $params[] = trim($data['title']);
            }
            if (isset($data['description'])) {
                $updates[] = "description = ?";
                $params[] = trim($data['description']);
            }
            if (isset($data['due_date'])) {
                $updates[] = "due_date = ?";
                $params[] = $data['due_date'];
            }
            if (isset($data['priority'])) {
                $updates[] = "priority = ?";
                $params[] = $data['priority'];
            }
            if (isset($data['completed'])) {
                $updates[] = "completed = ?";
                $params[] = (bool)$data['completed'];
            }
            
            if (empty($updates)) {
                throw new Exception('No fields to update');
            }
            
            $params[] = $taskId;
            
            $sql = "UPDATE tasks SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            // Fetch only necessary fields
            $stmt = $pdo->prepare("
                SELECT id, user_id, title, description, due_date, priority, completed, created_at 
                FROM tasks WHERE id = ?
            ");
            $stmt->execute([$taskId]);
            $task = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => 'Task updated successfully',
                'task' => $task
            ]);
            break;
            
        case 'DELETE':
            // Delete task
            if (!isset($_GET['id'])) {
                throw new Exception('Task ID is required');
            }
            
            $taskId = intval($_GET['id']);
            
            $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = ?");
            $stmt->execute([$taskId]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Task deleted successfully'
            ]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
            break;
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
