<?php
// Backend/controllers/TaskController.php

class TaskController {
    private $pdo;
    private $jwtConfig;
    private $mailConfig;

    public function __construct($pdo, $jwtConfig = [], $mailConfig = []) {
        $this->pdo = $pdo;
        $this->jwtConfig = $jwtConfig;
        $this->mailConfig = $mailConfig;
    }

    // Create
    public function createTask($userId, $data) {
        // basic validation
        if (empty($data['title'])) {
            http_response_code(400);
            echo json_encode(['error'=>'Title required']);
            return;
        }
        $title = trim($data['title']);
        $description = isset($data['description']) ? trim($data['description']) : null;
        $priority = isset($data['priority']) ? (int)$data['priority'] : 2;
        $importance = isset($data['importance']) ? max(1,min(5,(int)$data['importance'])) : 3;
        $status = isset($data['status']) ? $data['status'] : 'pending';
        $due_date = isset($data['due_date']) ? $data['due_date'] : null;
        $reminder_at = isset($data['reminder_at']) ? $data['reminder_at'] : null;

        $stmt = $this->pdo->prepare("INSERT INTO tasks (user_id, title, description, priority, importance, status, due_date, reminder_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $title, $description, $priority, $importance, $status, $due_date, $reminder_at]);

        $id = $this->pdo->lastInsertId();
        echo json_encode(['success'=>true, 'task_id'=>$id]);
    }

    // Update
    public function updateTask($userId, $taskId, $data) {
        // ensure task belongs to user
        $stmt = $this->pdo->prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?");
        $stmt->execute([$taskId, $userId]);
        $task = $stmt->fetch();
        if (!$task) {
            http_response_code(404);
            echo json_encode(['error'=>'Task not found']);
            return;
        }

        $fields = [];
        $values = [];

        $allowed = ['title','description','priority','importance','status','due_date','reminder_at'];
        foreach ($allowed as $f) {
            if (isset($data[$f])) {
                $fields[] = "$f = ?";
                $values[] = $data[$f];
            }
        }
        if (empty($fields)) {
            echo json_encode(['success'=>true]); return;
        }
        $values[] = $taskId;
        $sql = "UPDATE tasks SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);

        echo json_encode(['success'=>true]);
    }

    // Delete
    public function deleteTask($userId, $taskId) {
        $stmt = $this->pdo->prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?");
        $stmt->execute([$taskId, $userId]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error'=>'Task not found']);
            return;
        }
        echo json_encode(['success'=>true]);
    }

    // Get tasks (with prioritization score)
    public function getTasks($userId, $filters = []) {
        // Basic fetch - you can support filters via $filters (status, due range etc.)
        $sql = "SELECT * FROM tasks WHERE user_id = ?";
        $params = [$userId];

        if (isset($filters['status'])) {
            $sql .= " AND status = ?";
            $params[] = $filters['status'];
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $tasks = $stmt->fetchAll();

        // compute priority score for each
        $now = new DateTime('now', new DateTimeZone('UTC'));
        foreach ($tasks as &$t) {
            $t['priority_score'] = $this->computePriorityScore($t, $now);
            // set reminder_due boolean
            $t['reminder_due'] = ($t['reminder_at'] && !$t['reminder_sent'] && (new DateTime($t['reminder_at'])) <= $now) ? 1 : 0;
        }
        // sort descending by score then by due_date ascending
        usort($tasks, function($a,$b){
            if ($a['priority_score'] == $b['priority_score']) {
                $da = $a['due_date'] ? strtotime($a['due_date']) : PHP_INT_MAX;
                $db = $b['due_date'] ? strtotime($b['due_date']) : PHP_INT_MAX;
                return $da <=> $db;
            }
            return $b['priority_score'] <=> $a['priority_score'];
        });

        echo json_encode(['tasks'=>$tasks]);
    }

    // Simple scoring algorithm (adjust weights as needed)
    private function computePriorityScore($task, $now) {
        $score = 0;
        // priority (1..3) weight
        $score += ($task['priority'] ?? 2) * 10;
        // importance 1..5
        $score += ($task['importance'] ?? 3) * 3;
        // due date proximity
        if (!empty($task['due_date'])) {
            try {
                $due = new DateTime($task['due_date']);
                $diffSeconds = $due->getTimestamp() - $now->getTimestamp();
                // if overdue -> big boost
                if ($diffSeconds <= 0) {
                    $score += 50;
                } else {
                    // closer due dates get higher boost
                    $days = $diffSeconds / (60*60*24);
                    if ($days <= 1) $score += 30;
                    elseif ($days <= 3) $score += 20;
                    elseif ($days <= 7) $score += 10;
                }
            } catch (Exception $e) {
                // ignore bad date
            }
        }
        // status reduces score if done
        if (isset($task['status']) && $task['status'] === 'done') $score -= 100;

        return $score;
    }
}
