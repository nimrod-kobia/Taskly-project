<?php
// Backend/automated_reminders.php
// Run this script via Windows Task Scheduler every 5 minutes
// Command: php "C:\path\to\Backend\automated_reminders.php"

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

// Log file for debugging
$logFile = __DIR__ . '/logs/reminders.log';
if (!file_exists(dirname($logFile))) {
    mkdir(dirname($logFile), 0777, true);
}

function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
    echo "[$timestamp] $message\n";
}

logMessage("=== Starting Automated Reminder Check ===");

try {
    $now = new DateTime();
    $nowStr = $now->format('Y-m-d H:i:s');
    
    // Find tasks that need reminders
    // Criteria:
    // 1. Task has a due_date set
    // 2. Task is not completed (status != 'done')
    // 3. Due date is in the future or very soon
    // 4. Reminder hasn't been sent recently for this timeframe
    
    $stmt = $pdo->prepare("
        SELECT 
            t.id,
            t.user_id,
            t.title,
            t.description,
            t.due_date,
            t.priority,
            t.status,
            t.reminder_24h_sent,
            t.reminder_10min_sent,
            u.email,
            u.full_name,
            EXTRACT(EPOCH FROM (t.due_date::timestamp - NOW())) / 60 AS minutes_until_due
        FROM tasks t
        JOIN users u ON t.user_id = u.id
        WHERE t.due_date IS NOT NULL
        AND t.due_date > NOW()
        AND (t.status IS NULL OR t.status != 'done')
        ORDER BY t.due_date ASC
    ");
    
    $stmt->execute();
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    logMessage("Found " . count($tasks) . " active tasks with due dates");
    
    $reminders24hSent = 0;
    $reminders10minSent = 0;
    
    foreach ($tasks as $task) {
        $minutesUntilDue = (float)$task['minutes_until_due'];
        $taskId = $task['id'];
        $userId = $task['user_id'];
        
        // Check if we need to send 24-hour reminder
        // Send if: 23.5 hours < time until due < 24.5 hours AND not sent yet
        if ($minutesUntilDue >= 1410 && $minutesUntilDue <= 1470 && !$task['reminder_24h_sent']) {
            logMessage("Sending 24-hour reminder for task #{$taskId}: {$task['title']}");
            
            if (sendReminderEmail($task, '24 hours', $config)) {
                // Mark 24h reminder as sent
                $updateStmt = $pdo->prepare("
                    UPDATE tasks 
                    SET reminder_24h_sent = TRUE, reminder_24h_sent_at = NOW() 
                    WHERE id = ?
                ");
                $updateStmt->execute([$taskId]);
                $reminders24hSent++;
                logMessage("✓ 24-hour reminder sent for task #{$taskId}");
            } else {
                logMessage("✗ Failed to send 24-hour reminder for task #{$taskId}");
            }
        }
        
        // Check if we need to send 10-minute reminder
        // Send if: 5 minutes < time until due < 15 minutes AND not sent yet
        if ($minutesUntilDue >= 5 && $minutesUntilDue <= 15 && !$task['reminder_10min_sent']) {
            logMessage("Sending 10-minute reminder for task #{$taskId}: {$task['title']}");
            
            if (sendReminderEmail($task, '10 minutes', $config)) {
                // Mark 10min reminder as sent
                $updateStmt = $pdo->prepare("
                    UPDATE tasks 
                    SET reminder_10min_sent = TRUE, reminder_10min_sent_at = NOW() 
                    WHERE id = ?
                ");
                $updateStmt->execute([$taskId]);
                $reminders10minSent++;
                logMessage("✓ 10-minute reminder sent for task #{$taskId}");
            } else {
                logMessage("✗ Failed to send 10-minute reminder for task #{$taskId}");
            }
        }
    }
    
    logMessage("Summary: {$reminders24hSent} 24-hour reminders, {$reminders10minSent} 10-minute reminders sent");
    logMessage("=== Reminder Check Completed Successfully ===\n");
    
} catch (PDOException $e) {
    logMessage("Database Error: " . $e->getMessage());
    exit(1);
} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
    exit(1);
}

/**
 * Send reminder email to user
 */
function sendReminderEmail($task, $timeframe, $config) {
    try {
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
        $mail->setFrom($config['smtp']['email'], 'Taskly Reminders');
        $mail->addAddress($task['email'], $task['full_name']);
        
        // Format due date nicely
        $dueDate = new DateTime($task['due_date']);
        $dueDateFormatted = $dueDate->format('l, F j, Y \a\t g:i A');
        
        // Priority badge color
        $priorityColor = match(strtolower($task['priority'])) {
            'high' => '#dc3545',
            'medium' => '#ffc107',
            'low' => '#28a745',
            default => '#6c757d'
        };
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = "⏰ Reminder: Task Due in {$timeframe} - {$task['title']}";
        
        $mail->Body = "
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            </head>
            <body style='margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f7fb;'>
                <div style='max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>
                    <!-- Header -->
                    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;'>
                        <h1 style='color: white; margin: 0; font-size: 28px;'>⏰ Task Reminder</h1>
                    </div>
                    
                    <!-- Content -->
                    <div style='padding: 30px;'>
                        <div style='background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px;'>
                            <p style='margin: 0; color: #856404; font-weight: bold;'>⚠️ Your task is due in {$timeframe}!</p>
                        </div>
                        
                        <h2 style='color: #333; margin-top: 0;'>{$task['title']}</h2>
                        
                        <div style='background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                            <table style='width: 100%; border-collapse: collapse;'>
                                <tr>
                                    <td style='padding: 8px 0; color: #6c757d; width: 120px;'>
                                        <strong>📅 Due Date:</strong>
                                    </td>
                                    <td style='padding: 8px 0; color: #333;'>
                                        {$dueDateFormatted}
                                    </td>
                                </tr>
                                <tr>
                                    <td style='padding: 8px 0; color: #6c757d;'>
                                        <strong>🎯 Priority:</strong>
                                    </td>
                                    <td style='padding: 8px 0;'>
                                        <span style='background-color: {$priorityColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; text-transform: uppercase;'>
                                            {$task['priority']}
                                        </span>
                                    </td>
                                </tr>
                                " . ($task['description'] ? "
                                <tr>
                                    <td style='padding: 8px 0; color: #6c757d; vertical-align: top;'>
                                        <strong>📝 Description:</strong>
                                    </td>
                                    <td style='padding: 8px 0; color: #333;'>
                                        " . nl2br(htmlspecialchars($task['description'])) . "
                                    </td>
                                </tr>
                                " : "") . "
                            </table>
                        </div>
                        
                        <div style='text-align: center; margin-top: 30px;'>
                            <a href='http://127.0.0.1:5501/tasks.html' 
                               style='display: inline-block; 
                                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                      color: white; 
                                      padding: 14px 40px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold;
                                      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);'>
                                View Task in Taskly
                            </a>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style='background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;'>
                        <p style='margin: 0; color: #6c757d; font-size: 12px;'>
                            This is an automated reminder from Taskly<br>
                            You're receiving this because you have a task due soon
                        </p>
                    </div>
                </div>
            </body>
            </html>
        ";
        
        $mail->AltBody = "Reminder: Your task '{$task['title']}' is due in {$timeframe}.\n\n"
                       . "Due Date: {$dueDateFormatted}\n"
                       . "Priority: {$task['priority']}\n"
                       . ($task['description'] ? "Description: {$task['description']}\n\n" : "")
                       . "View your tasks at: http://127.0.0.1:5501/tasks.html";
        
        return $mail->send();
        
    } catch (MailException $e) {
        logMessage("Email Error: " . $mail->ErrorInfo);
        return false;
    } catch (Exception $e) {
        logMessage("Email Error: " . $e->getMessage());
        return false;
    }
}
