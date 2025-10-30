<?php
// Backend/controllers/TaskController.php

class TaskController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    // Create Task
    public function createTask($userId, $data) {
        if (empty($data['title'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Title required']);
            return;
        }

        $title = trim($data['title']);
        $description = isset($data['description']) ? trim($data['description']) : null;
        $due_date = $data['due_date'] ?? null;
        $priority = $data['priority'] ?? null;
        $effort = isset($data['effort']) ? (int)$data['effort'] : 1;
        $status = $data['status'] ?? 'To Do';

        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO tasks (user_id, title, description, due_date, priority, effort, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                RETURNING id
            ");
            $stmt->execute([$userId, $title, $description, $due_date, $priority, $effort, $status]);

            $taskId = $stmt->fetchColumn();
            echo json_encode(['success' => true, 'task_id' => $taskId]);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    // Update Task
    public function updateTask($userId, $taskId, $data) {
        $stmt = $this->pdo->prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?");
        $stmt->execute([$taskId, $userId]);
        $task = $stmt->fetch();
        if (!$task) {
            http_response_code(404);
            
            return;
        }

        $fields = [];
        $values = [];
        $allowed = ['title', 'description', 'due_date', 'priority', 'effort', 'status'];

        foreach ($allowed as $f) {
            if (isset($data[$f])) {
                $fields[] = "$f = ?";
                $values[] = ($f === 'effort') ? (int)$data[$f] : $data[$f];
            }
        }

        if (empty($fields)) {
            return;
        }

        $values[] = $taskId;
        $sql = "UPDATE tasks SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);

    }

    // Delete Task
    public function deleteTask($userId, $taskId) {
        $stmt = $this->pdo->prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?");
        $stmt->execute([$taskId, $userId]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Task not found']);
            return;
        }
        echo json_encode(['success' => true]);
    }

    // Get Tasks
    public function getTasks($userId, $filters = []) {
    $sql = "SELECT * FROM tasks WHERE user_id = ?";
    $params = [$userId];

    // optional status filter
    if (isset($filters['status'])) {
        $sql .= " AND status = ?";
        $params[] = $filters['status'];
    }

    $stmt = $this->pdo->prepare($sql);
    $stmt->execute($params);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // simple sorting: priority (High > Medium > Low), then due_date ascending
    $priorityOrder = ['High' => 3, 'Medium' => 2, 'Low' => 1];

    usort($tasks, function($a, $b) use ($priorityOrder) {
        $pa = $priorityOrder[$a['priority']] ?? 0;
        $pb = $priorityOrder[$b['priority']] ?? 0;

        if ($pa === $pb) {
            $da = $a['due_date'] ? strtotime($a['due_date']) : PHP_INT_MAX;
            $db = $b['due_date'] ? strtotime($b['due_date']) : PHP_INT_MAX;
            return $da <=> $db; // earliest due date first
        }

        return $pb <=> $pa; // higher priority first
    });

    echo json_encode(['tasks' => $tasks]);
}

}
