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
            
            // Get sort parameter (default: score)
            $sort = isset($_GET['sort']) ? $_GET['sort'] : 'score';
            
            $stmt = $pdo->prepare("
                SELECT id, user_id, title, description, due_date, 
                       priority, status, effort, urgency, created_at,
                       reminder_enabled, reminder_time,
                       -- Calculate priority score (1-3)
                       CASE 
                           WHEN LOWER(priority) = 'high' THEN 3
                           WHEN LOWER(priority) = 'medium' THEN 2
                           ELSE 1
                       END as priority_score,
                       -- Calculate deadline urgency (0-5): closer = higher score
                       CASE 
                           WHEN due_date IS NULL THEN 0
                           WHEN due_date < CURRENT_DATE THEN 5
                           WHEN due_date = CURRENT_DATE THEN 4
                           WHEN due_date <= CURRENT_DATE + INTERVAL '1 day' THEN 3
                           WHEN due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 2
                           WHEN due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1
                           ELSE 0
                       END as deadline_urgency,
                       -- Total score: urgency (1-10) + deadline_urgency (0-5) + effort (1-10) + priority_score (1-3)
                       COALESCE(CAST(urgency AS INTEGER), 1) + 
                       CASE 
                           WHEN due_date IS NULL THEN 0
                           WHEN due_date < CURRENT_DATE THEN 5
                           WHEN due_date = CURRENT_DATE THEN 4
                           WHEN due_date <= CURRENT_DATE + INTERVAL '1 day' THEN 3
                           WHEN due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 2
                           WHEN due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1
                           ELSE 0
                       END + 
                       COALESCE(effort, 1) + 
                       CASE 
                           WHEN LOWER(priority) = 'high' THEN 3
                           WHEN LOWER(priority) = 'medium' THEN 2
                           ELSE 1
                       END as score
                FROM tasks 
                WHERE user_id = ? 
                ORDER BY 
                    CASE WHEN ? = 'score' THEN (
                        COALESCE(CAST(urgency AS INTEGER), 1) + 
                        CASE 
                            WHEN due_date IS NULL THEN 0
                            WHEN due_date < CURRENT_DATE THEN 5
                            WHEN due_date = CURRENT_DATE THEN 4
                            WHEN due_date <= CURRENT_DATE + INTERVAL '1 day' THEN 3
                            WHEN due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 2
                            WHEN due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1
                            ELSE 0
                        END + 
                        COALESCE(effort, 1) + 
                        CASE 
                            WHEN LOWER(priority) = 'high' THEN 3
                            WHEN LOWER(priority) = 'medium' THEN 2
                            ELSE 1
                        END
                    ) END DESC,
                    CASE WHEN ? = 'due_date' THEN due_date END ASC,
                    CASE WHEN ? = 'priority' THEN 
                        CASE 
                            WHEN LOWER(priority) = 'high' THEN 1
                            WHEN LOWER(priority) = 'medium' THEN 2
                            ELSE 3
                        END 
                    END ASC,
                    CASE WHEN ? = 'created_at' THEN created_at END DESC,
                    created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$userId, $sort, $sort, $sort, $sort, $limit, $offset]);
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
            $dueDate = (isset($data['due_date']) && !empty($data['due_date'])) ? $data['due_date'] : null;
            $priority = isset($data['priority']) ? strtolower($data['priority']) : 'medium';
            $status = isset($data['status']) ? strtolower($data['status']) : 'todo';
            $effort = isset($data['effort']) ? intval($data['effort']) : 1;
            $urgency = isset($data['urgency']) ? intval($data['urgency']) : 1;
            $reminderEnabled = isset($data['reminder_enabled']) ? (bool)$data['reminder_enabled'] : false;
            $reminderTime = (isset($data['reminder_time']) && !empty($data['reminder_time'])) ? $data['reminder_time'] : null;
            
            // Validate priority
            $validPriorities = ['low', 'medium', 'high'];
            if (!in_array($priority, $validPriorities)) {
                $priority = 'medium';
            }
            
            // Validate status
            $validStatuses = ['todo', 'inprogress', 'done'];
            if (!in_array($status, $validStatuses)) {
                $status = 'todo';
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO tasks (user_id, title, description, due_date, priority, status, effort, urgency, reminder_enabled, reminder_time, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                RETURNING id, user_id, title, description, due_date, priority, status, effort, urgency, reminder_enabled, reminder_time, created_at
            ");
            $stmt->execute([$userId, $title, $description, $dueDate, $priority, $status, $effort, $urgency, $reminderEnabled, $reminderTime]);
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
                $params[] = !empty($data['due_date']) ? $data['due_date'] : null;
            }
            if (isset($data['priority'])) {
                $updates[] = "priority = ?";
                $params[] = $data['priority'];
            }
            if (isset($data['status'])) {
                $updates[] = "status = ?";
                $params[] = strtolower($data['status']);
            }
            if (isset($data['effort'])) {
                $updates[] = "effort = ?";
                $params[] = intval($data['effort']);
            }
            if (isset($data['reminder_enabled'])) {
                $updates[] = "reminder_enabled = ?";
                $params[] = (bool)$data['reminder_enabled'];
            }
            if (isset($data['reminder_time'])) {
                $updates[] = "reminder_time = ?";
                $params[] = !empty($data['reminder_time']) ? $data['reminder_time'] : null;
            }
            // When status changes to 'inprogress', reset last_notification_sent
            if (isset($data['status']) && strtolower($data['status']) === 'inprogress') {
                $updates[] = "last_notification_sent = NULL";
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
                SELECT id, user_id, title, description, due_date, priority, status, effort, urgency, reminder_enabled, reminder_time, last_notification_sent, created_at 
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
