# Schedule Display Issue Fix Guide

## 🚨 Problem Description

The "Scheduled In" and "Scheduled Out" columns in the Time Attendance Report are showing dashes (`-`) instead of actual scheduled times in the production environment, while working correctly in development.

## 🔍 Root Cause

The issue occurs because the `DailyTimeSummary` records in production are missing the `scheduled_time_in` and `scheduled_time_out` data. This happens when:

1. **Daily summaries are not generated properly** - The system relies on signals to automatically update daily summaries when schedules change
2. **Signals are not working in production** - The automatic data synchronization between `EmployeeSchedule` and `DailyTimeSummary` models may be disabled or failing
3. **Data migration issues** - Existing data may not have been properly migrated when the system was deployed to production

## 🏗️ System Architecture

The scheduled times flow through this data pipeline:

```
EmployeeSchedule → DailyTimeSummary → Time Attendance Report
     ↓                    ↓                    ↓
Scheduled times    Scheduled times    Display in UI
are set here       are copied here    from here
```

## 🛠️ Solution

### Step 1: Diagnose the Issue

First, run the diagnostic script to understand the current state of your data:

**PowerShell (Windows):**
```powershell
.\diagnose_schedule_issue.ps1
```

**Bash (Linux/Mac):**
```bash
./diagnose_schedule_issue.sh
```

**Direct Python:**
```bash
python diagnose_schedule_issue.py
```

### Step 2: Fix the Data

If the diagnostic shows missing scheduled times, run the fix script:

**PowerShell (Windows):**
```powershell
.\fix_schedule_display.ps1
```

**Bash (Linux/Mac):**
```bash
./fix_schedule_display.sh
```

**Direct Python:**
```bash
python fix_schedule_display.py
```

### Step 3: Verify the Fix

After running the fix, the scheduled times should appear in the Time Attendance Report. You can verify by:

1. Refreshing the report in the frontend
2. Running the diagnostic script again to confirm the data is fixed
3. Checking the database directly

## 📋 What the Fix Script Does

The `fix_schedule_display.py` script:

1. **Identifies affected records** - Finds `DailyTimeSummary` records with missing scheduled times
2. **Regenerates daily summaries** - Uses the existing utility functions to properly populate scheduled times
3. **Preserves existing data** - Only updates the missing scheduled time fields, doesn't overwrite other data
4. **Handles date ranges** - Processes data for the last 30 days by default (configurable)
5. **Provides detailed logging** - Shows exactly what was fixed and any issues encountered

## 🔧 Manual Fix (Alternative)

If you prefer to fix this manually, you can:

1. **Run the Django management command:**
   ```bash
   python manage.py populate_daily_summaries
   ```

2. **Use Django shell:**
   ```python
   python manage.py shell
   
   from geo.utils import generate_daily_summaries_for_period
   from geo.models import Employee
   from datetime import date, timedelta
   
   # Get all employees
   employees = Employee.objects.all()
   
   # Generate summaries for the last 30 days
   end_date = date.today()
   start_date = end_date - timedelta(days=30)
   
   for employee in employees:
       generate_daily_summaries_for_period(employee, start_date, end_date)
   ```

## 🚀 Prevention

To prevent this issue from recurring:

1. **Enable signals in production** - Ensure Django signals are properly configured
2. **Set up automated daily summary generation** - Use cron jobs or Celery tasks
3. **Monitor data integrity** - Regular checks to ensure scheduled times are populated
4. **Database backups** - Regular backups before running data fixes

## 📊 Monitoring

After fixing, monitor these metrics:

- **Daily summary generation success rate**
- **Scheduled time population rate**
- **Report generation performance**
- **User feedback on report accuracy**

## 🆘 Troubleshooting

### Common Issues

1. **Permission denied errors:**
   - Ensure the script has proper database access
   - Check Django user permissions

2. **Virtual environment issues:**
   - Verify `.venv` exists and is properly configured
   - Check Python version compatibility

3. **Database connection errors:**
   - Verify database settings in `settings.py`
   - Check network connectivity to database

4. **Memory issues with large datasets:**
   - The script processes data in batches
   - Monitor system resources during execution

### Getting Help

If you encounter issues:

1. **Check the logs** - Look for error messages in the script output
2. **Run the diagnostic** - Use `diagnose_schedule_issue.py` to identify specific problems
3. **Check Django logs** - Look for errors in your application logs
4. **Verify data manually** - Check the database directly to confirm the issue

## 📝 Files Created

- `fix_schedule_display.py` - Main Python fix script
- `fix_schedule_display.ps1` - PowerShell wrapper script
- `fix_schedule_display.sh` - Bash wrapper script
- `diagnose_schedule_issue.py` - Diagnostic script
- `diagnose_schedule_issue.ps1` - PowerShell diagnostic wrapper
- `diagnose_schedule_issue.sh` - Bash diagnostic wrapper
- `SCHEDULE_DISPLAY_FIX_README.md` - This documentation

## ✅ Success Criteria

The fix is successful when:

1. **Scheduled times appear** in the Time Attendance Report
2. **No more dashes** (`-`) in the Scheduled In/Out columns
3. **Data consistency** between `EmployeeSchedule` and `DailyTimeSummary`
4. **Reports generate correctly** for all date ranges
5. **Performance is maintained** - no significant slowdown in report generation

---

**Note:** Always backup your database before running data fix scripts in production!
