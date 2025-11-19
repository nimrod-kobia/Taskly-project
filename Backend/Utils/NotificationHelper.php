<?php
// filepath: backend/Utils/NotificationHelper.php

class NotificationHelper {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * Create a notification
     */
    public function createNotification($userId, $taskId, $type, $title, $message, $sendEmail = true) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO notifications (user_id, task_id, type, title, message, sent_email)
                VALUES (:user_id, :task_id, :type, :title, :message, :sent_email)
                RETURNING id, created_at
            ");
            
            $stmt->execute([
                ':user_id' => $userId,
                ':task_id' => $taskId,
                ':type' => $type,
                ':title' => $title,
                ':message' => $message,
                ':sent_email' => $sendEmail ? 'true' : 'false'
            ]);
            
            $notification = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Send email notification if enabled
            if ($sendEmail && $notification) {
                $this->sendEmailNotification($userId, $title, $message);
            }
            
            return $notification;
        } catch (PDOException $e) {
            error_log("Error creating notification: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Check for tasks due within 24 hours
     */
    public function checkDueTasks() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT t.*, u.id as user_id 
                FROM tasks t
                JOIN users u ON t.user_id = u.id
                WHERE t.status != 'Done' 
                AND t.due_date IS NOT NULL
                AND t.due_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
                AND NOT EXISTS (
                    SELECT 1 FROM notifications n 
                    WHERE n.task_id = t.id 
                    AND n.type = 'due_soon'
                    AND n.created_at > NOW() - INTERVAL '23 hours'
                )
            ");
            
            $stmt->execute();
            $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($tasks as $task) {
                $dueDate = date('M j, Y g:i A', strtotime($task['due_date']));
                $this->createNotification(
                    $task['user_id'],
                    $task['id'],
                    'due_soon',
                    'Task Due Soon',
                    "Task '{$task['title']}' is due on {$dueDate}",
                    true
                );
            }
            
            return count($tasks);
        } catch (PDOException $e) {
            error_log("Error checking due tasks: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Check for overdue tasks
     */
    public function checkOverdueTasks() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT t.*, u.id as user_id 
                FROM tasks t
                JOIN users u ON t.user_id = u.id
                WHERE t.status != 'Done' 
                AND t.due_date IS NOT NULL
                AND t.due_date < NOW()
                AND NOT EXISTS (
                    SELECT 1 FROM notifications n 
                    WHERE n.task_id = t.id 
                    AND n.type = 'overdue'
                    AND n.created_at > NOW() - INTERVAL '23 hours'
                )
            ");
            
            $stmt->execute();
            $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($tasks as $task) {
                $dueDate = date('M j, Y g:i A', strtotime($task['due_date']));
                $this->createNotification(
                    $task['user_id'],
                    $task['id'],
                    'overdue',
                    'Task Overdue',
                    "Task '{$task['title']}' was due on {$dueDate}",
                    true
                );
            }
            
            return count($tasks);
        } catch (PDOException $e) {
            error_log("Error checking overdue tasks: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Send email notification
     */
    private function sendEmailNotification($userId, $title, $message) {
        try {
            // Get user email
            $stmt = $this->pdo->prepare("SELECT email, full_name FROM users WHERE id = :id");
            $stmt->execute([':id' => $userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                return false;
            }
            
            // Create PHPMailer instance
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            
            // SMTP configuration
            $mail->isSMTP();
            $mail->Host = 'smtp.gmail.com';
            $mail->SMTPAuth = true;
            $mail->Username = 'YOUR_GMAIL@gmail.com'; // TODO: Update with your Gmail
            $mail->Password = 'YOUR_APP_PASSWORD'; // TODO: Update with your App Password
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = 587;
            
            // Email configuration
            $mail->setFrom('YOUR_GMAIL@gmail.com', 'Taskly App');
            $mail->addAddress($user['email'], $user['full_name']);
            $mail->isHTML(true);
            $mail->Subject = "Taskly Notification: " . $title;
            
            $mail->Body = "
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <div style='background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center;'>
                        <h1 style='color: white; margin: 0;'>📋 Taskly</h1>
                    </div>
                    <div style='padding: 30px; background: #f8fafc;'>
                        <h2 style='color: #1e293b;'>{$title}</h2>
                        <p style='color: #64748b; line-height: 1.6;'>{$message}</p>
                        <a href='http://localhost:5500/frontend/tasks.html' 
                           style='display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                                  color: white; padding: 12px 30px; text-decoration: none; 
                                  border-radius: 50px; margin-top: 20px;'>
                            View Tasks
                        </a>
                    </div>
                    <div style='text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;'>
                        <p>This is an automated notification from Taskly</p>
                    </div>
                </div>
            ";
            
            return $mail->send();
        } catch (\Exception $e) {
            error_log("Email notification error: " . $e->getMessage());
            return false;
        }
    }
}
