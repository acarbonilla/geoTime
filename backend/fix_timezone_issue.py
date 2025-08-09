#!/usr/bin/env python
"""
Script to fix the timezone issue and properly handle time in/out entries
"""
import os
import sys
import django
from datetime import datetime
import pytz

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import Employee, TimeEntry, EmployeeSchedule, DailyTimeSummary

def fix_timezone_and_regenerate():
    """Fix timezone issue and regenerate DailyTimeSummary records"""
    print("🔧 Fixing Timezone Issue and Regenerating")
    print("=" * 50)
    
    # Get the employee
    employee = Employee.objects.get(employee_id='ALS0002')
    print(f"👤 Employee: {employee.full_name} ({employee.employee_id})")
    
    # Get all TimeEntries for this employee
    time_entries = TimeEntry.objects.filter(employee=employee).order_by('timestamp')
    print(f"📝 Found {time_entries.count()} TimeEntries:")
    
    # Convert to Manila timezone
    manila_tz = pytz.timezone('Asia/Manila')
    
    time_in_entry = None
    time_out_entry = None
    time_in = None
    time_out = None
    schedule_date = None
    
    for entry in time_entries:
        manila_timestamp = entry.timestamp.astimezone(manila_tz)
        print(f"  - {entry.entry_type}: {entry.timestamp} -> {manila_timestamp}")
        
        if entry.entry_type == 'time_in' and not time_in_entry:
            time_in_entry = entry
            time_in = manila_timestamp.time()
            schedule_date = manila_timestamp.date()
        elif entry.entry_type == 'time_out' and not time_out_entry:
            time_out_entry = entry
            time_out = manila_timestamp.time()
    
    print(f"\n📅 Schedule Date: {schedule_date}")
    print(f"🕐 Time In: {time_in}")
    print(f"🕐 Time Out: {time_out}")
    
    # Get the EmployeeSchedule for the correct date
    try:
        schedule = EmployeeSchedule.objects.get(employee=employee, date=schedule_date)
        print(f"📅 Schedule found for: {schedule.date}")
        print(f"🕐 Scheduled Time In: {schedule.scheduled_time_in}")
        print(f"🕐 Scheduled Time Out: {schedule.scheduled_time_out}")
    except EmployeeSchedule.DoesNotExist:
        print(f"❌ No schedule found for {schedule_date}")
        return
    
    # Delete existing DailyTimeSummary
    DailyTimeSummary.objects.filter(employee=employee).delete()
    print("🗑️ Deleted existing DailyTimeSummary")
    
    # Determine status
    if time_in and time_out:
        if time_in > schedule.scheduled_time_in:
            status = 'late'
        else:
            status = 'present'
    elif time_in and not time_out:
        status = 'half_day'
    else:
        status = 'absent'
    
    # Create new DailyTimeSummary with correct data
    summary = DailyTimeSummary.objects.create(
        employee=employee,
        date=schedule_date,
        time_in=time_in,
        time_out=time_out,
        time_in_entry=time_in_entry,
        time_out_entry=time_out_entry,
        scheduled_time_in=schedule.scheduled_time_in,
        scheduled_time_out=schedule.scheduled_time_out,
        schedule_reference=schedule,
        status=status,
        is_weekend=schedule_date.weekday() >= 5
    )
    
    # Calculate metrics
    summary.calculate_metrics()
    summary.save()
    
    print(f"\n✅ Created DailyTimeSummary for {summary.date}")
    print(f"🕐 Time In: {summary.time_in}")
    print(f"🕐 Time Out: {summary.time_out}")
    print(f"🕐 Scheduled Time In: {summary.scheduled_time_in}")
    print(f"🕐 Scheduled Time Out: {summary.scheduled_time_out}")
    print(f"📊 Status: {summary.status}")
    print(f"📊 Late Minutes: {summary.late_minutes}")
    print(f"📊 Billed Hours: {summary.billed_hours}")
    print(f"📊 Undertime Minutes: {summary.undertime_minutes}")

if __name__ == "__main__":
    fix_timezone_and_regenerate() 