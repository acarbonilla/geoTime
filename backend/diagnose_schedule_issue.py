#!/usr/bin/env python
"""
Diagnostic script to check the current state of schedule data in production.
This will help identify why scheduled times are not showing in the time attendance report.
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import Employee, DailyTimeSummary, EmployeeSchedule, TimeEntry
from django.utils import timezone
from django.db.models import Q

def diagnose_schedule_issue():
    """
    Diagnose the schedule display issue by checking the current state of the data.
    """
    print("🔍 Diagnosing Schedule Display Issue")
    print("=" * 60)
    
    # Get current date and a sample date range
    today = timezone.now().date()
    start_date = today - timedelta(days=7)
    end_date = today
    
    print(f"📅 Checking data from {start_date} to {end_date}")
    print()
    
    # Check if we have any employees
    employees = Employee.objects.all()
    print(f"👥 Total employees: {employees.count()}")
    
    if employees.count() == 0:
        print("❌ No employees found in the system")
        return
    
    # Check a sample employee
    sample_employee = employees.first()
    print(f"🔍 Sample employee: {sample_employee.full_name} (ID: {sample_employee.employee_id})")
    print()
    
    # Check EmployeeSchedule data
    schedules = EmployeeSchedule.objects.filter(
        employee=sample_employee,
        date__gte=start_date,
        date__lte=end_date
    ).order_by('date')
    
    print(f"📋 EmployeeSchedule records for sample employee: {schedules.count()}")
    for schedule in schedules[:5]:  # Show first 5
        print(f"  - {schedule.date}: {schedule.scheduled_time_in} - {schedule.scheduled_time_out}")
    
    if schedules.count() == 0:
        print("  ⚠️  No schedule records found for the sample period")
    
    print()
    
    # Check DailyTimeSummary data
    summaries = DailyTimeSummary.objects.filter(
        employee=sample_employee,
        date__gte=start_date,
        date__lte=end_date
    ).order_by('date')
    
    print(f"📊 DailyTimeSummary records for sample employee: {summaries.count()}")
    for summary in summaries[:5]:  # Show first 5
        print(f"  - {summary.date}: scheduled_in={summary.scheduled_time_in}, scheduled_out={summary.scheduled_time_out}")
        print(f"    actual_in={summary.time_in}, actual_out={summary.time_out}")
        print(f"    status={summary.status}")
    
    if summaries.count() == 0:
        print("  ⚠️  No daily summary records found for the sample period")
    
    print()
    
    # Check TimeEntry data
    time_entries = TimeEntry.objects.filter(
        employee=sample_employee,
        timestamp__date__gte=start_date,
        timestamp__date__lte=end_date
    ).order_by('timestamp')
    
    print(f"⏰ TimeEntry records for sample employee: {time_entries.count()}")
    for entry in time_entries[:5]:  # Show first 5
        print(f"  - {entry.timestamp}: {entry.entry_type} at {entry.location}")
    
    if time_entries.count() == 0:
        print("  ⚠️  No time entry records found for the sample period")
    
    print()
    
    # Check if daily summaries are being generated properly
    print("🔧 Checking Daily Summary Generation")
    print("-" * 40)
    
    # Check if there are any summaries with empty scheduled times
    empty_scheduled_summaries = DailyTimeSummary.objects.filter(
        Q(scheduled_time_in__isnull=True) | Q(scheduled_time_in=''),
        date__gte=start_date,
        date__lte=end_date
    ).count()
    
    print(f"📊 Summaries with empty scheduled times: {empty_scheduled_summaries}")
    
    # Check if there are any summaries with scheduled times
    with_scheduled_summaries = DailyTimeSummary.objects.filter(
        Q(scheduled_time_in__isnull=False) & ~Q(scheduled_time_in=''),
        date__gte=start_date,
        date__lte=end_date
    ).count()
    
    print(f"📊 Summaries with scheduled times: {with_scheduled_summaries}")
    
    # Check the total count
    total_summaries = DailyTimeSummary.objects.filter(
        date__gte=start_date,
        date__lte=end_date
    ).count()
    
    print(f"📊 Total summaries in period: {total_summaries}")
    
    if total_summaries > 0:
        percentage_with_schedules = (with_scheduled_summaries / total_summaries) * 100
        print(f"📊 Percentage with scheduled times: {percentage_with_schedules:.1f}%")
    
    print()
    
    # Recommendations
    print("💡 Recommendations")
    print("-" * 20)
    
    if empty_scheduled_summaries > 0:
        print("1. Run the fix script to regenerate daily summaries:")
        print("   python fix_schedule_display.py")
        print("   OR")
        print("   ./fix_schedule_display.ps1 (PowerShell)")
        print("   OR")
        print("   ./fix_schedule_display.sh (Bash)")
        print()
        print("2. Check if the signals are working properly in production")
        print("3. Verify that EmployeeSchedule data exists for the affected dates")
    
    if schedules.count() == 0:
        print("1. No schedule data found - create schedules first")
        print("2. Check if schedule templates are properly configured")
    
    if summaries.count() == 0:
        print("1. No daily summaries found - run the populate command:")
        print("   python manage.py populate_daily_summaries")
    
    print()
    print("=" * 60)
    print("🔍 Diagnosis complete!")

if __name__ == "__main__":
    try:
        diagnose_schedule_issue()
    except Exception as e:
        print(f"❌ Error during diagnosis: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
