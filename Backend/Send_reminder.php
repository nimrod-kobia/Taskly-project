<?php
// Backend/send_reminder.php
require_once __DIR__ . '/db.php';
$config = require __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php';
use PHPMailer\PHPMailer\PHPMailer;

try {
    $nowStr = (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
    // find tasks with reminder_at <= now and not sent
    $stmt = $pdo->prepare("SELECT t.*, u.email, u.name FROM tasks t JOIN users u ON u.id = t.user_id WHERE t.reminder_at IS NOT NULL AND t.reminder_sent = 0 AND t.reminder_at <= ?");
    $stmt->execute([$nowStr]);
    $tasks = $stmt->fetchAll();

    foreach ($tasks as $task) {
        // send email
        $mail = new PHPMailer(true);
        // configure SMTP if present
        if (!empty($config['mail']['smtp_host'])) {
            $mail->isSMTP();
            $mail->Host = $config['mail']['smtp_host'];
            $mail->SMTPAuth = true;
            $mail->Username = $config['mail']['smtp_user'];
            $mail->Password = $config['mail']['smtp_pass'];
            $mail->SMTPSecure = $config['mail']['smtp_secure'];
            $mail->Port = $config['mail']['smtp_port'];
        }
        $mail->setFrom($config['mail']['from_email'], $config['mail']['from_name']);
        $mail->addAddress($task['email'], $task['name']);
        $mail->isHTML(true);
        $mail->Subject = "Task Reminder: " . $task['title'];
        $body = "<p>Hi " . htmlspecialchars($task['name']) . ",</p>"
              . "<p>This is a reminder for your task: <strong>" . htmlspecialchars($task['title']) . "</strong></p>"
              . "<p>Due: " . ($task['due_date'] ?: 'No due date') . "</p>"
              . "<p>Description: " . nl2br(htmlspecialchars($task['description'])) . "</p>";
        $mail->Body = $body;
        try {
            $mail->send();
            // mark reminder_sent
            $upd = $pdo->prepare("UPDATE tasks SET reminder_sent = 1 WHERE id = ?");
            $upd->execute([$task['id']]);
        } catch (Exception $e) {
            // log the error somewhere - file or DB
            error_log("Failed sending reminder for task {$task['id']}: " . $mail->ErrorInfo);
        }
    }
    echo "done\n";
} catch (Exception $e) {
    error_log("Reminder job error: " . $e->getMessage());
    echo "error\n";
}
