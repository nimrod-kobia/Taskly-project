<?php
// Test script to verify notifications setup

require __DIR__ . '/../db.php';

echo "Testing Notifications Setup...\n\n";

try {
    // Check if notifications table exists
    $stmt = $pdo->query("
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'notifications'
        )
    ");
    $exists = $stmt->fetchColumn();
    
    if ($exists) {
        echo "✓ Notifications table exists\n";
        
        // Get table structure
        $stmt = $pdo->query("
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'notifications'
            ORDER BY ordinal_position
        ");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "\nTable structure:\n";
        foreach ($columns as $col) {
            echo "  - {$col['column_name']} ({$col['data_type']})\n";
        }
        
        // Count notifications
        $stmt = $pdo->query("SELECT COUNT(*) FROM notifications");
        $count = $stmt->fetchColumn();
        echo "\nTotal notifications: {$count}\n";
        
    } else {
        echo "✗ Notifications table does NOT exist\n";
        echo "\nRun this SQL to create it:\n\n";
        echo "CREATE TABLE notifications (\n";
        echo "    id SERIAL PRIMARY KEY,\n";
        echo "    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n";
        echo "    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,\n";
        echo "    type VARCHAR(50) NOT NULL,\n";
        echo "    title VARCHAR(255) NOT NULL,\n";
        echo "    message TEXT NOT NULL,\n";
        echo "    is_read BOOLEAN DEFAULT FALSE,\n";
        echo "    sent_email BOOLEAN DEFAULT FALSE,\n";
        echo "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n";
        echo "    read_at TIMESTAMP\n";
        echo ");\n\n";
        echo "CREATE INDEX idx_notifications_user ON notifications(user_id);\n";
        echo "CREATE INDEX idx_notifications_read ON notifications(is_read);\n";
        echo "CREATE INDEX idx_notifications_created ON notifications(created_at);\n";
    }
    
} catch (PDOException $e) {
    echo "✗ Database error: " . $e->getMessage() . "\n";
}
