# 🚀 Taskly with Neon PostgreSQL & Production Server

## ✅ Yes, It Works with Neon PostgreSQL!

Your automated reminder system works perfectly with **Neon PostgreSQL** (cloud database). Here's everything you need to know.

---

## 📊 How It Works

### Data Flow:
```
Neon PostgreSQL (Cloud)
    ↓
    ↓ [Stores tasks with due_date]
    ↓
Windows Server (Your Computer)
    ↓
    ↓ [Runs automated_reminders.php every 5 min]
    ↓
Checks Neon Database
    ↓
    ↓ [Finds tasks due in 24h or 10min]
    ↓
Sends Email Reminders 📧
    ↓
Updates reminder flags in Neon
```

**Key Point:** The reminder script runs on **YOUR server** (Windows Task Scheduler), but it reads/writes to your **Neon database** in the cloud.

---

## 🔧 Setup Steps

### Step 1: Run Migration on Neon Database

**REQUIRED - Run this ONCE to add reminder columns:**

```bash
cd Backend
php run_migration.php
```

**What it does:**
- Connects to your Neon PostgreSQL database
- Adds 4 new columns to the `tasks` table:
  - `reminder_24h_sent` (tracks if 24h reminder was sent)
  - `reminder_24h_sent_at` (timestamp of when it was sent)
  - `reminder_10min_sent` (tracks if 10min reminder was sent)
  - `reminder_10min_sent_at` (timestamp of when it was sent)
- Creates an index for faster queries

**You'll see:**
```
=== Taskly Database Migration ===
Database: ep-xyz-123.us-east-2.aws.neon.tech
Database Name: taskly_db

Adding reminder tracking columns to tasks table...
✓ Added reminder_24h_sent column
✓ Added reminder_24h_sent_at column
✓ Added reminder_10min_sent column
✓ Added reminder_10min_sent_at column
✓ Created index for faster queries

✅ Database migration completed successfully!
```

---

### Step 2: Verify Your Config

Check `Backend/config.php` has your Neon credentials:

```php
return [
    'db' => [
        'host' => 'ep-your-project-123.us-east-2.aws.neon.tech',
        'dbname' => 'taskly_db',
        'user' => 'your-username',
        'pass' => 'your-neon-password'
    ],
    'smtp' => [
        'host' => 'smtp.gmail.com',
        'email' => 'your-email@gmail.com',
        'password' => 'your-app-password',
        'port' => 587
    ]
];
```

---

### Step 3: Set Up Automated Task

**Two options:**

#### Option A: Windows Task Scheduler (Recommended for Development)
```bash
# Run as Administrator
setup_task_scheduler.bat
```

**Runs on:** Your local Windows machine  
**Frequency:** Every 5 minutes  
**Requirement:** Your computer must be on

#### Option B: Production Server (For Deployment)
If deploying to a production server:

**Linux Server (Cron):**
```bash
# Edit crontab
crontab -e

# Add this line (runs every 5 minutes)
*/5 * * * * /usr/bin/php /path/to/Backend/automated_reminders.php >> /path/to/logs/cron.log 2>&1
```

**Windows Server (Task Scheduler):**
Same as Option A, but set up on the production server instead of your dev machine.

---

## 🌐 Server Deployment Scenarios

### Scenario 1: Development (Local)
```
Your Laptop
├── Frontend (Live Server on 127.0.0.1:5501)
├── Backend (php -S localhost:8000)
└── Reminder Script (Task Scheduler runs every 5 min)
     ↓
     Connects to → Neon PostgreSQL (Cloud)
```

**Requirements:**
- ✅ Run `php run_migration.php` ONCE
- ✅ Run `setup_task_scheduler.bat` as Admin
- ⚠️ Computer must stay on for reminders to work

---

### Scenario 2: Production (Deployed)

```
Production Server (e.g., AWS, DigitalOcean, Heroku)
├── Frontend (Static files served)
├── Backend (PHP running on Apache/Nginx)
└── Cron Job (runs automated_reminders.php every 5 min)
     ↓
     Connects to → Neon PostgreSQL (Cloud)
```

**Requirements:**
- ✅ Run `php run_migration.php` ONCE on production server
- ✅ Set up cron job on production server
- ✅ Server runs 24/7 (automatic)

**Production Cron Setup:**
```bash
# SSH into your server
ssh user@your-server.com

# Edit crontab
crontab -e

# Add this line
*/5 * * * * cd /var/www/taskly/Backend && /usr/bin/php automated_reminders.php >> /var/www/taskly/Backend/logs/cron.log 2>&1
```

---

## 🧪 Testing with Neon

### Test Database Connection
```bash
cd Backend
php -r "require 'db.php'; echo 'Connected to Neon PostgreSQL successfully!'; print_r(\$pdo->query('SELECT version()')->fetch());"
```

### Test Migration
```bash
cd Backend
php run_migration.php
```

### Create Test Tasks
```bash
cd Backend
php test_reminders.php
```

### Run Reminder Check Manually
```bash
cd Backend
php automated_reminders.php
```

**Check the output:**
```
[2025-11-19 10:51:20] === Starting Automated Reminder Check ===
[2025-11-19 10:51:21] Found 6 active tasks with due dates
[2025-11-19 10:51:21] Sending 24-hour reminder for task #123: Project Presentation
[2025-11-19 10:51:22] ✓ 24-hour reminder sent for task #123
[2025-11-19 10:51:22] Summary: 1 24-hour reminders, 0 10-minute reminders sent
[2025-11-19 10:51:22] === Reminder Check Completed Successfully ===
```

---

## 💡 Important Notes for Neon PostgreSQL

### ✅ Advantages
- Cloud-based - accessible from anywhere
- Automatic backups
- High availability
- No local PostgreSQL installation needed

### ⚠️ Considerations

1. **Connection Limits:**
   - Neon free tier: Limited connections
   - Script uses persistent connections (`PDO::ATTR_PERSISTENT`)
   - Each reminder run opens 1 connection briefly

2. **SSL Required:**
   - Neon requires `sslmode=require` (already set in `db.php`)
   - No changes needed on your part

3. **Timezone:**
   - Neon uses UTC by default
   - Your local times are converted automatically
   - Reminder timing is based on database NOW()

4. **Network Dependency:**
   - Reminder script needs internet to reach Neon
   - If offline, reminders won't send (will catch up when online)

---

## 🔄 Migration: Local PostgreSQL → Neon

Already using Neon? Great! Just run the migration:

```bash
cd Backend
php run_migration.php
```

Switching from local to Neon?

1. Export local database:
   ```bash
   pg_dump -U postgres taskly_db > backup.sql
   ```

2. Import to Neon:
   ```bash
   psql -h ep-xyz.neon.tech -U username -d taskly_db < backup.sql
   ```

3. Update `config.php` with Neon credentials

4. Run migration:
   ```bash
   php run_migration.php
   ```

---

## 📋 Checklist

Before going live with automated reminders:

- [ ] Run `php run_migration.php` (adds columns to Neon)
- [ ] Verify `config.php` has correct Neon credentials
- [ ] Test with `php test_reminders.php`
- [ ] Run `php automated_reminders.php` manually
- [ ] Check email inbox for test reminder
- [ ] Set up Task Scheduler / Cron job
- [ ] Verify logs directory is writable
- [ ] Test with actual task due in 24 hours

---

## 🆘 Troubleshooting

### "Connection failed" error
```bash
# Test Neon connection
php -r "require 'db.php'; echo 'OK';"
```
**Fix:** Check Neon credentials in `config.php`

### "Column already exists" error
**Fix:** Columns were already added - this is normal! Skip migration.

### Reminders not sending
1. Check Task Scheduler is running:
   ```bash
   schtasks /query /tn "Taskly Automated Reminders"
   ```

2. Check logs:
   ```bash
   type Backend\logs\reminders.log
   ```

3. Test manually:
   ```bash
   php automated_reminders.php
   ```

### Emails going to spam
- Add sender email to contacts
- Check SPF/DKIM records (for production)
- Use reputable SMTP service (Gmail, SendGrid)

---

## 🎯 Summary

**Do you need to run migration?**  
✅ **YES** - Run `php run_migration.php` ONCE

**Does it read from Neon?**  
✅ **YES** - Every 5 minutes, script queries your Neon database

**Do I need a server running 24/7?**  
- **Development:** No, just keep computer on
- **Production:** Yes, use cloud server with cron

**Will it work with my current Neon setup?**  
✅ **YES** - No changes needed to existing data!

---

**Ready to go?** Run the migration and you're set! 🚀

```bash
cd Backend
php run_migration.php
php test_reminders.php
php automated_reminders.php
```
