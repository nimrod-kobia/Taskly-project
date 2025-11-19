# Taskly Automated Reminders

This system automatically sends email reminders for tasks at two key times:
- **24 hours before** the due date
- **10 minutes before** the due date

## Setup Instructions

### Step 1: Database Setup
Run the SQL migration to add reminder tracking columns:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database -f setup_reminder_columns.sql
```

Or manually execute the SQL:
```sql
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reminder_10min_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_10min_sent_at TIMESTAMP;
```

### Step 2: Configure Email Settings
Make sure your `config.php` has valid SMTP credentials:

```php
return [
    'smtp' => [
        'host' => 'smtp.gmail.com',
        'email' => 'your-email@gmail.com',
        'password' => 'your-app-password',
        'port' => 587
    ]
];
```

### Step 3: Set Up Windows Task Scheduler

**Option A: Automatic Setup (Recommended)**
1. Right-click `setup_task_scheduler.bat`
2. Select **"Run as administrator"**
3. The script will automatically create a scheduled task

**Option B: Manual Setup**
1. Open **Task Scheduler** (search in Windows Start menu)
2. Click **Create Basic Task**
3. Name: `Taskly Automated Reminders`
4. Trigger: **Daily**, repeat every **5 minutes**
5. Action: **Start a program**
   - Program: `php`
   - Arguments: `"C:\path\to\Backend\automated_reminders.php"`
6. Finish and enable the task

### Step 4: Test the System

**Test manually:**
```bash
cd Backend
php automated_reminders.php
```

**Check the logs:**
```bash
# View the log file
type Backend\logs\reminders.log
```

**Create a test task:**
1. Create a task with due date = 24 hours from now
2. Wait 5 minutes for the scheduler to run
3. Check your email and the log file

## How It Works

### Reminder Logic

The script runs every 5 minutes and checks:

1. **24-Hour Reminder:**
   - Triggered when task is due in 23.5 - 24.5 hours
   - Sends only once (tracked by `reminder_24h_sent` flag)

2. **10-Minute Reminder:**
   - Triggered when task is due in 5 - 15 minutes
   - Sends only once (tracked by `reminder_10min_sent` flag)

### Email Content

Each reminder email includes:
- ⏰ Urgent notification (24 hours or 10 minutes)
- 📋 Task title and description
- 📅 Formatted due date and time
- 🎯 Priority badge (color-coded)
- 🔗 Direct link to Taskly

### Duplicate Prevention

- Each reminder type has its own sent flag
- Flags are reset when task is updated
- Only active tasks (not "done") receive reminders

## Troubleshooting

### Reminders Not Sending

1. **Check Task Scheduler is running:**
   ```bash
   schtasks /query /tn "Taskly Automated Reminders"
   ```

2. **Check the log file:**
   ```bash
   type Backend\logs\reminders.log
   ```

3. **Test email configuration:**
   ```bash
   php automated_reminders.php
   ```

4. **Verify database columns exist:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'tasks' AND column_name LIKE 'reminder%';
   ```

### Common Issues

**"Access Denied" error:**
- Run `setup_task_scheduler.bat` as Administrator

**"PHP not recognized":**
- Add PHP to system PATH or use full path in task:
  ```
  C:\php\php.exe "C:\path\to\Backend\automated_reminders.php"
  ```

**Emails not sending:**
- Check SMTP credentials in `config.php`
- For Gmail: Enable "App Passwords" in Google Account settings
- Check spam folder

**Database connection error:**
- Verify `db.php` has correct credentials
- Ensure PostgreSQL is running

## Management Commands

### View Task Status
```bash
schtasks /query /tn "Taskly Automated Reminders" /v /fo list
```

### Run Task Immediately
```bash
schtasks /run /tn "Taskly Automated Reminders"
```

### Disable Task
```bash
schtasks /change /tn "Taskly Automated Reminders" /disable
```

### Enable Task
```bash
schtasks /change /tn "Taskly Automated Reminders" /enable
```

### Delete Task
```bash
schtasks /delete /tn "Taskly Automated Reminders" /f
```

## Reset Reminder Flags

If you need to resend reminders for existing tasks:

```sql
-- Reset all reminder flags
UPDATE tasks 
SET reminder_24h_sent = FALSE, 
    reminder_10min_sent = FALSE,
    reminder_24h_sent_at = NULL,
    reminder_10min_sent_at = NULL
WHERE due_date > NOW();
```

## Production Deployment

For production servers:

1. Use a proper cron job instead of Task Scheduler
2. Set up proper logging with log rotation
3. Use environment variables for sensitive config
4. Monitor email sending success rates
5. Set up alerts for failed reminders

**Linux Cron Example:**
```bash
# Edit crontab
crontab -e

# Add this line (runs every 5 minutes)
*/5 * * * * /usr/bin/php /path/to/Backend/automated_reminders.php >> /path/to/logs/cron.log 2>&1
```
