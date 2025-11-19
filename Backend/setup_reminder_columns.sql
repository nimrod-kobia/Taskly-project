-- Add reminder tracking columns to tasks table
-- Run this SQL in your PostgreSQL database

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reminder_10min_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_10min_sent_at TIMESTAMP;

-- Create index for faster reminder queries
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_reminders 
ON tasks(due_date, reminder_24h_sent, reminder_10min_sent) 
WHERE due_date IS NOT NULL AND (status IS NULL OR status != 'done');

-- Update existing tasks to reset reminder flags (optional)
-- UPDATE tasks SET reminder_24h_sent = FALSE, reminder_10min_sent = FALSE 
-- WHERE due_date > NOW();
