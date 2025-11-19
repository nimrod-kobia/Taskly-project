<?php
// filepath: backend/Utils/check_tasks_cron.php
// Run this script hourly via cron/Task Scheduler to check for due/overdue tasks

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../db.php';
require __DIR__ . '/NotificationHelper.php';

try {
    $helper = new NotificationHelper($pdo);
    
    // Check for tasks due within 24 hours
    $dueCount = $helper->checkDueTasks();
    echo "Found {$dueCount} tasks due within 24 hours\n";
    
    // Check for overdue tasks
    $overdueCount = $helper->checkOverdueTasks();
    echo "Found {$overdueCount} overdue tasks\n";
    
    echo "Task check completed successfully\n";
} catch (Exception $e) {
    error_log("Cron job error: " . $e->getMessage());
    echo "Error: " . $e->getMessage() . "\n";
}

