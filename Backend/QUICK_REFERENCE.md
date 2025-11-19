# 📋 Taskly Automated Reminders - Quick Reference

## ⚡ Quick Start

### 1️⃣ Database Setup
```bash
cd Backend
php run_migration.php
```

### 2️⃣ Set Up Windows Task Scheduler
Right-click `setup_task_scheduler.bat` → **Run as Administrator**

### 3️⃣ Test It
```bash
php test_reminders.php    # Create test tasks
php automated_reminders.php # Run manually to test
```

---

## 📧 How It Works

| Time Before Due | Action | Example |
|-----------------|--------|---------|
| **24 hours** | Send email reminder | Task due Nov 20 at 2pm → Email sent Nov 19 at 2pm |
| **10 minutes** | Send urgent email | Task due Nov 20 at 2pm → Email sent Nov 20 at 1:50pm |

- ✅ Runs **every 5 minutes** automatically
- ✅ Sends **only once** per reminder type
- ✅ Only for **active tasks** (not completed)

---

## 🔧 Commands

### Check if Task Scheduler is Running
```bash
schtasks /query /tn "Taskly Automated Reminders"
```

### Run Reminder Script Manually
```bash
cd Backend
php automated_reminders.php
```

### View Logs
```bash
type Backend\logs\reminders.log
```

### Reset All Reminder Flags (SQL)
```sql
UPDATE tasks 
SET reminder_24h_sent = FALSE, 
    reminder_10min_sent = FALSE
WHERE due_date > NOW();
```

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| No emails sent | Check `config.php` SMTP settings |
| "Access Denied" | Run batch file as Administrator |
| "PHP not recognized" | Add PHP to system PATH |
| Emails in spam | Whitelist sender email |

---

## 📂 Files Overview

| File | Purpose |
|------|---------|
| `automated_reminders.php` | Main script (runs every 5 min) |
| `run_migration.php` | Adds database columns |
| `setup_task_scheduler.bat` | Creates Windows scheduled task |
| `test_reminders.php` | Creates test tasks |
| `REMINDERS_SETUP.md` | Full documentation |

---

## 🎯 Email Configuration (Gmail)

In `Backend/config.php`:
```php
'smtp' => [
    'host' => 'smtp.gmail.com',
    'email' => 'your-email@gmail.com',
    'password' => 'your-app-password',  // NOT your Gmail password!
    'port' => 587
]
```

**Get App Password:**
1. Google Account → Security
2. 2-Step Verification (enable if not already)
3. App passwords → Generate
4. Copy 16-character password

---

## ✅ Verify Setup

1. **Database:**
   ```sql
   SELECT * FROM tasks WHERE due_date > NOW() LIMIT 1;
   ```

2. **Task Scheduler:**
   ```bash
   schtasks /query /tn "Taskly Automated Reminders" /v
   ```

3. **Test Email:**
   ```bash
   cd Backend
   php test_reminders.php
   php automated_reminders.php
   # Check email inbox
   ```

---

**Need help?** See `REMINDERS_SETUP.md` for detailed instructions.
