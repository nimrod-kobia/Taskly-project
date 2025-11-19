@echo off
REM setup_task_scheduler.bat
REM Run this batch file as Administrator to set up Windows Task Scheduler

echo ========================================
echo Taskly Automated Reminder Setup
echo ========================================
echo.

REM Get the current directory (where this batch file is located)
set BACKEND_PATH=%~dp0
set PHP_PATH=php
set SCRIPT_PATH=%BACKEND_PATH%automated_reminders.php

echo Backend Path: %BACKEND_PATH%
echo Script Path: %SCRIPT_PATH%
echo.

REM Create the scheduled task
echo Creating scheduled task...
schtasks /create /tn "Taskly Automated Reminders" /tr "%PHP_PATH% \"%SCRIPT_PATH%\"" /sc minute /mo 5 /f /rl HIGHEST

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Task created successfully
    echo ========================================
    echo.
    echo The reminder script will now run every 5 minutes automatically.
    echo.
    echo To verify, run: schtasks /query /tn "Taskly Automated Reminders"
    echo To disable, run: schtasks /end /tn "Taskly Automated Reminders"
    echo To delete, run: schtasks /delete /tn "Taskly Automated Reminders" /f
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR! Failed to create task
    echo ========================================
    echo.
    echo Make sure you are running this as Administrator
    echo Right-click the file and select "Run as administrator"
    echo.
)

pause
