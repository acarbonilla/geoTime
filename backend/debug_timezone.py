#!/usr/bin/env python
"""
Script to debug timezone issues between TimeEntry and DailyTimeSummary
"""
import os
import sys
import django
from datetime import datetime
import pytz

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings
from geo.models import Employee, TimeEntry, EmployeeSchedule, DailyTimeSummary

def debug_timezone_issue():
    """Debug timezone issues between TimeEntry and DailyTimeSummary"""
    print("🔍 Debugging Timezone Issues")
    print("=" * 50)
    
    # Check Django settings
    print(f"📅 Django TIME_ZONE: {settings.TIME_ZONE}")
    print(f"🌍 USE_TZ: {settings.USE_TZ}")
    print(f"🕐 Current timezone: {datetime.now().astimezone()}")
    
    # Get Manila timezone
    manila_tz = pytz.timezone('Asia/Manila')
    print(f"🇵🇭 Manila timezone: {manila_tz}")
    print(f"🕐 Manila current time: {datetime.now(manila_tz)}")
    
    print("\n" + "=" * 50)
    print("📊 Checking TimeEntry Records:")
    
    time_entries = TimeEntry.objects.all()
    for entry in time_entries:
        print(f"\n👤 Employee: {entry.employee.full_name} ({entry.employee.employee_id})")
        print(f"📝 Entry Type: {entry.entry_type}")
        print(f"🕐 Original timestamp: {entry.timestamp}")
        print(f"🕐 Timestamp (naive): {entry.timestamp.replace(tzinfo=None)}")
        print(f"🕐 Timestamp (Manila): {entry.timestamp.astimezone(manila_tz)}")
        print(f"📅 Date: {entry.timestamp.date()}")
        print(f"⏰ Time: {entry.timestamp.time()}")
    
    print("\n" + "=" * 50)
    print("📊 Checking EmployeeSchedule Records:")
    
    schedules = EmployeeSchedule.objects.all()
    for schedule in schedules:
        print(f"\n👤 Employee: {schedule.employee.full_name} ({schedule.employee.employee_id})")
        print(f"📅 Date: {schedule.date}")
        print(f"🕐 Scheduled Time In: {schedule.scheduled_time_in}")
        print(f"🕐 Scheduled Time Out: {schedule.scheduled_time_out}")
    
    print("\n" + "=" * 50)
    print("📊 Checking DailyTimeSummary Records:")
    
    summaries = DailyTimeSummary.objects.all()
    for summary in summaries:
        print(f"\n👤 Employee: {summary.employee.full_name} ({summary.employee.employee_id})")
        print(f"📅 Date: {summary.date}")
        print(f"🕐 Time In: {summary.time_in}")
        print(f"🕐 Time Out: {summary.time_out}")
        print(f"🕐 Scheduled Time In: {summary.scheduled_time_in}")
        print(f"🕐 Scheduled Time Out: {summary.scheduled_time_out}")
        
        # Check the linked TimeEntry records
        if summary.time_in_entry:
            print(f"🔗 Time In Entry: {summary.time_in_entry.timestamp}")
            print(f"🔗 Time In Entry (Manila): {summary.time_in_entry.timestamp.astimezone(manila_tz)}")
        if summary.time_out_entry:
            print(f"🔗 Time Out Entry: {summary.time_out_entry.timestamp}")
            print(f"🔗 Time Out Entry (Manila): {summary.time_out_entry.timestamp.astimezone(manila_tz)}")

def fix_timezone_issue():
    """Fix timezone issues by regenerating DailyTimeSummary records"""
    print("\n🔧 Fixing Timezone Issues")
    print("=" * 50)
    
    # Delete existing DailyTimeSummary records
    count = DailyTimeSummary.objects.count()
    DailyTimeSummary.objects.all().delete()
    print(f"🗑️ Deleted {count} existing DailyTimeSummary records")
    
    # Regenerate using the utility function
    from geo.utils import generate_daily_time_summary_from_entries
    
    employees = Employee.objects.all()
    for employee in employees:
        print(f"\n👤 Regenerating for: {employee.full_name} ({employee.employee_id})")
        
        # Get date range from TimeEntries
        time_entries = TimeEntry.objects.filter(employee=employee)
        if time_entries.exists():
            earliest_date = time_entries.earliest('timestamp').timestamp.date()
            latest_date = time_entries.latest('timestamp').timestamp.date()
            
            print(f"📅 Date range: {earliest_date} to {latest_date}")
            
            try:
                result = generate_daily_time_summary_from_entries(
                    employee=employee,
                    start_date=earliest_date,
                    end_date=latest_date
                )
                print(f"✅ Regenerated: {result}")
            except Exception as e:
                print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🚀 Timezone Debug Tool")
    print("=" * 50)
    
    debug_timezone_issue()
    
    print("\n" + "=" * 50)
    print("Choose an option:")
    print("1. Debug timezone issues (show current data)")
    print("2. Fix timezone issues (regenerate DailyTimeSummary)")
    print("3. Exit")
    
    choice = input("\nEnter your choice (1-3): ").strip()
    
    if choice == "1":
        debug_timezone_issue()
    elif choice == "2":
        fix_timezone_issue()
        print("\n✅ Timezone fix completed! Run option 1 again to verify.")
    elif choice == "3":
        print("👋 Goodbye!")
    else:
        print("❌ Invalid choice!") 