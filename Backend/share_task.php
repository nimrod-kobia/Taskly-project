<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

// Extract and verify JWT token
function getAuthenticatedUser() {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : 
                  (isset($headers['authorization']) ? $headers['authorization'] : null);
    
    if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }
    
    $token = $matches[1];
    $config = require __DIR__ . '/config.php';
    $secretKey = isset($config['jwt']['secret']) ? $config['jwt']['secret'] : 'your-secret-key-change-this-in-production';
    
    try {
        $decoded = JWT::decode($token, new Key($secretKey, 'HS256'));
        return [
            'user_id' => $decoded->user_id,
            'email' => $decoded->email
        ];
    } catch (Exception $e) {
        throw new Exception('Invalid or expired token');
    }
}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $user = getAuthenticatedUser();
    
    if ($method === 'GET') {
        // Get tasks shared with current user
        $userEmail = $user['email'];
        
        $stmt = $pdo->prepare("
            SELECT 
                st.id as share_id,
                st.task_id,
                st.shared_at,
                st.shared_with_email,
                t.title,
                t.description,
                t.due_date,
                t.priority,
                t.status,
                t.created_at,
                t.effort,
                t.urgency,
                t.reminder_enabled,
                t.reminder_time,
                u.full_name as shared_by_name,
                u.email as shared_by_email
            FROM shared_tasks st
            JOIN tasks t ON st.task_id = t.id
            JOIN users u ON st.shared_by_user_id = u.id
            WHERE st.shared_with_email = ?
            ORDER BY st.shared_at DESC
        ");
        
        $stmt->execute([$userEmail]);
        $sharedTasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format response
        $formattedTasks = array_map(function($row) {
            return [
                'share_id' => $row['share_id'],
                'shared_at' => $row['shared_at'],
                'shared_with_email' => $row['shared_with_email'],
                'shared_by_name' => $row['shared_by_name'],
                'shared_by_email' => $row['shared_by_email'],
                'task' => [
                    'id' => $row['task_id'],
                    'title' => $row['title'],
                    'description' => $row['description'],
                    'due_date' => $row['due_date'],
                    'priority' => $row['priority'],
                    'status' => $row['status'],
                    'created_at' => $row['created_at'],
                    'effort' => $row['effort'],
                    'urgency' => $row['urgency'],
                    'reminder_enabled' => $row['reminder_enabled'],
                    'reminder_time' => $row['reminder_time']
                ]
            ];
        }, $sharedTasks);
        
        echo json_encode([
            'success' => true,
            'shared_tasks' => $formattedTasks,
            'count' => count($formattedTasks)
        ]);
        
    } elseif ($method === 'POST') {
        // Share a task with one or multiple users
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!$data || !isset($data['task_id'])) {
            throw new Exception('task_id is required');
        }
        
        // Support both single email and array of emails
        $emails = [];
        if (isset($data['shared_with_emails']) && is_array($data['shared_with_emails'])) {
            $emails = $data['shared_with_emails'];
        } elseif (isset($data['shared_with_email'])) {
            $emails = [$data['shared_with_email']];
        } else {
            throw new Exception('shared_with_email or shared_with_emails is required');
        }
        
        $taskId = intval($data['task_id']);
        $userId = $user['user_id'];
        
        // Verify task exists and belongs to current user
        $stmt = $pdo->prepare("SELECT id, title, description, due_date, priority FROM tasks WHERE id = ? AND user_id = ?");
        $stmt->execute([$taskId, $userId]);
        $taskInfo = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$taskInfo) {
            throw new Exception('Task not found or you do not have permission to share it');
        }
        
        // Get sender info for emails
        $stmt = $pdo->prepare("SELECT full_name, email FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $senderInfo = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Process each email
        $results = [];
        $successCount = 0;
        $failureCount = 0;
        
        foreach ($emails as $sharedWithEmail) {
            $sharedWithEmail = trim($sharedWithEmail);
            $result = [
                'email' => $sharedWithEmail,
                'success' => false,
                'message' => '',
                'share_id' => null,
                'email_sent' => false
            ];
            
            // Validate email format
            if (!filter_var($sharedWithEmail, FILTER_VALIDATE_EMAIL)) {
                $result['message'] = 'Invalid email address format';
                $results[] = $result;
                $failureCount++;
                continue;
            }
            
            // Check if already shared with this email
            $stmt = $pdo->prepare("SELECT id FROM shared_tasks WHERE task_id = ? AND shared_with_email = ?");
            $stmt->execute([$taskId, $sharedWithEmail]);
            if ($stmt->fetch()) {
                $result['message'] = 'Task already shared with this email';
                $results[] = $result;
                $failureCount++;
                continue;
            }
            
            try {
                // Create share
                $stmt = $pdo->prepare("
                    INSERT INTO shared_tasks (task_id, shared_by_user_id, shared_with_email, shared_at)
                    VALUES (?, ?, ?, NOW())
                    RETURNING id
                ");
                $stmt->execute([$taskId, $userId, $sharedWithEmail]);
                $shareId = $stmt->fetchColumn();
                
                $result['share_id'] = $shareId;
                $result['success'] = true;
                
                // Send email notification
                try {
                    $config = require __DIR__ . '/config.php';
                    $mail = new PHPMailer(true);
                    
                    // SMTP Configuration
                    $mail->isSMTP();
                    $mail->Host = $config['smtp']['host'];
                    $mail->SMTPAuth = true;
                    $mail->Username = $config['smtp']['email'];
                    $mail->Password = $config['smtp']['password'];
                    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                    $mail->Port = $config['smtp']['port'];
                    
                    // Recipients
                    $mail->setFrom($config['smtp']['email'], 'Taskly');
                    $mail->addAddress($sharedWithEmail);
                    
                    // Content
                    $mail->isHTML(true);
                    $mail->Subject = 'Task Shared with You - ' . $taskInfo['title'];
                    $mail->Body = "
                        <h2>Task Shared with You</h2>
                        <p><strong>{$senderInfo['full_name']}</strong> ({$senderInfo['email']}) has shared a task with you.</p>
                        <h3>Task Details:</h3>
                        <ul>
                            <li><strong>Title:</strong> {$taskInfo['title']}</li>
                            <li><strong>Description:</strong> " . ($taskInfo['description'] ?: 'None') . "</li>
                            <li><strong>Priority:</strong> {$taskInfo['priority']}</li>
                            <li><strong>Due Date:</strong> " . ($taskInfo['due_date'] ?: 'Not set') . "</li>
                        </ul>
                        <p><a href='http://localhost/taskly-project/frontend/shared-with-me.html' style='display:inline-block; background-color:#007bff; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;'>View Shared Tasks</a></p>
                        <p style='margin-top:20px; font-size:12px; color:#666;'>Or copy this link: http://localhost/taskly-project/frontend/shared-with-me.html</p>
                    ";
                    
                    $mail->send();
                    $result['email_sent'] = true;
                    $result['message'] = 'Shared successfully and email sent';
                } catch (Exception $e) {
                    error_log('Email sending failed for ' . $sharedWithEmail . ': ' . $e->getMessage());
                    $result['email_sent'] = false;
                    $result['message'] = 'Shared successfully but email notification failed';
                }
                
                $successCount++;
            } catch (PDOException $e) {
                $result['message'] = 'Database error: ' . $e->getMessage();
                $failureCount++;
            }
            
            $results[] = $result;
        }
        
        echo json_encode([
            'success' => $successCount > 0,
            'message' => "Shared with {$successCount} out of " . count($emails) . " recipient(s)",
            'results' => $results,
            'success_count' => $successCount,
            'failure_count' => $failureCount,
            'total_count' => count($emails)
        ]);
        
    } elseif ($method === 'DELETE') {
        // Unshare a task
        if (!isset($_GET['id'])) {
            throw new Exception('Share ID is required');
        }
        
        $shareId = intval($_GET['id']);
        $userId = $user['user_id'];
        
        // Delete share (only if owned by current user)
        $stmt = $pdo->prepare("
            DELETE FROM shared_tasks 
            WHERE id = ? AND shared_by_user_id = ?
        ");
        $stmt->execute([$shareId, $userId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Share not found or you do not have permission to delete it');
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Task unshared successfully'
        ]);
        
    } else {
        throw new Exception('Method not allowed');
    }
    
} catch (PDOException $e) {
    error_log('Share Task Database Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log('Share Task Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
