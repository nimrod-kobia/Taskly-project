# TaskFlow
Group project for our Software engineering class.
-Nimrod Kobia 168357
-Louis Ngatia 191603
-Emmanuel Kipkirui 184697
-Sean Muthomi 190119
-Alex Muriithi 177298
-Brian Kipngeno 168049
-Brian Kipkoech 172431
-Ryan Ngugi 192561

---

## 🚀 Quick Start Guide

### Prerequisites
- PHP 8.0+ installed
- Neon PostgreSQL database (cloud)
- Gmail account (for email reminders)
- VS Code with Live Server extension

---

## 📋 First-Time Setup (Do Once)

### 1. Configure Database
Edit `Backend/config.php` with your Neon PostgreSQL credentials:
```php
'db' => [
    'host' => 'your-neon-host.aws.neon.tech',
    'dbname' => 'your-database-name',
    'user' => 'your-username',
    'pass' => 'your-password'
]
```

### 2. Run Database Migration
```bash
cd Backend
php run_migration.php
```
✅ This adds reminder tracking columns to your Neon database.

### 3. Configure Email (Optional - for reminders)
Edit `Backend/config.php`:
```php
'smtp' => [
    'host' => 'smtp.gmail.com',
    'email' => 'your-email@gmail.com',
    'password' => 'your-app-password',  // Get from Google Account Settings
    'port' => 587
]
```

**Get Gmail App Password:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification (if not enabled)
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Generate password for "Mail"
5. Copy the 16-character password

### 4. Set Up Automated Reminders (Optional)
**Run as Administrator:**
- Right-click `Backend\setup_task_scheduler.bat`
- Click **"Run as administrator"**
- Wait for "SUCCESS!" message

✅ Reminders will now run automatically every 5 minutes in the background!

---

## 💻 Running the Application (Daily Use)

### Terminal 1: Start Backend Server
```bash
cd Backend
php -S localhost:8000
```
✅ Keep this terminal open while developing.

### Terminal 2 (or VS Code): Start Frontend
**Option A - VS Code Live Server (Recommended):**
- Open `frontend/index.html` in VS Code
- Click **"Go Live"** button (bottom right)
- Opens at `http://127.0.0.1:5501`

**Option B - Python HTTP Server:**
```bash
cd frontend
python -m http.server 5501
```

**Option C - Node.js http-server:**
```bash
cd frontend
npx http-server -p 5501
```

### Access the Application
- **Frontend:** http://127.0.0.1:5501
- **Backend API:** http://localhost:8000

---

## ✅ Verification Checklist

### Check Backend is Running
```bash
# Should return JSON with database info
curl http://localhost:8000/
```

### Check Frontend is Accessible
Open browser: http://127.0.0.1:5501

### Check Automated Reminders (if enabled)
```bash
# View the log file
type Backend\logs\reminders.log

# Or check Task Scheduler status
schtasks /query /tn "Taskly Automated Reminders"
```

---

## 🛑 Stopping the Application

### Stop Backend
Press `Ctrl + C` in the terminal running `php -S localhost:8000`

### Stop Frontend
- **Live Server:** Click "Port: 5501" in VS Code status bar
- **Python/Node:** Press `Ctrl + C` in the terminal

### Stop Automated Reminders (Optional)
```bash
# Disable the scheduled task
schtasks /change /tn "Taskly Automated Reminders" /disable

# Or delete it completely
schtasks /delete /tn "Taskly Automated Reminders" /f
```

## 🔔 Setting Up Automated Reminders

Taskly can automatically send email reminders **24 hours before** and **10 minutes before** task deadlines!

**✅ Works with Neon PostgreSQL (Cloud Database)**

### Quick Setup (3 Steps):

1. **Run Database Migration (Required for Neon):**
   ```bash
   cd Backend
   php run_migration.php
   ```
   This adds reminder tracking columns to your Neon PostgreSQL database.

2. **Configure Email in `config.php`:**
   ```php
   'smtp' => [
       'host' => 'smtp.gmail.com',
       'email' => 'your-email@gmail.com',
       'password' => 'your-app-password',  // Get from Google Account
       'port' => 587
   ]
   ```

3. **Set Up Automated Task (Run as Administrator):**
   ```bash
   # Double-click setup_task_scheduler.bat (Run as Administrator)
   # OR manually:
   cd Backend
   setup_task_scheduler.bat
   ```

✅ Done! Reminders will now send automatically every 5 minutes by querying your Neon database.

📖 **Detailed instructions:**  
- General: `Backend/REMINDERS_SETUP.md`  
- Neon PostgreSQL: `Backend/NEON_SETUP_GUIDE.md`

## Features

- ✅ Task management with priorities and due dates
- ✅ Calendar view with FullCalendar integration
- ✅ Share tasks with multiple people
- ✅ Dark/Light theme toggle
- ✅ Automated email reminders (24h & 10min before deadline)
- ✅ Priority scoring system
- ✅ Real-time notifications
- ✅ Task statistics and analytics
