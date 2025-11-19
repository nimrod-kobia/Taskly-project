<?php
// run_migration.php - Adds reminder columns to database
// Works with both local PostgreSQL and Neon PostgreSQL (cloud)

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config.php';

echo "\n=== Taskly Database Migration ===\n";
echo "Database: {$config['db']['host']}\n";
echo "Database Name: {$config['db']['dbname']}\n\n";

try {
    echo "Adding reminder tracking columns to tasks table...\n";
    
    $pdo->exec("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE");
    echo "✓ Added reminder_24h_sent column\n";
    
    $pdo->exec("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP");
    echo "✓ Added reminder_24h_sent_at column\n";
    
    $pdo->exec("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_10min_sent BOOLEAN DEFAULT FALSE");
    echo "✓ Added reminder_10min_sent column\n";
    
    $pdo->exec("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_10min_sent_at TIMESTAMP");
    echo "✓ Added reminder_10min_sent_at column\n";
    
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_tasks_due_date_reminders ON tasks(due_date, reminder_24h_sent, reminder_10min_sent) WHERE due_date IS NOT NULL AND (status IS NULL OR status != 'done')");
    echo "✓ Created index for faster queries\n";
    
    // Verify columns were added
    $stmt = $pdo->query("
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name LIKE 'reminder%'
        ORDER BY column_name
    ");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "\n=== Verification ===\n";
    echo "Reminder columns in database:\n";
    foreach ($columns as $col) {
        echo "  ✓ $col\n";
    }
    
    echo "\n✅ Database migration completed successfully!\n";
    echo "\nYour Neon PostgreSQL database is now ready for automated reminders.\n\n";
    
} catch (PDOException $e) {
    echo "\n❌ Migration Error: " . $e->getMessage() . "\n";
    echo "\nTroubleshooting:\n";
    echo "1. Check your Neon database credentials in config.php\n";
    echo "2. Ensure your Neon database is accessible\n";
    echo "3. Verify you have ALTER TABLE permissions\n\n";
    exit(1);
}
