#!/usr/bin/env python
"""
Script to fix the specific timezone case
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

def fix_specific_case():
    """Fix the specific timezone case"""
    print("🔧 Fixing Specific Timezone Case")
    print("=" * 50)
    
    # Get the employee
    employee = Employee.objects.get(employee_id='ALS0002')
    print(f"👤 Employee: {employee.full_name} ({employee.employee_id})")
    
    # Get the TimeEntry
    time_entry = TimeEntry.objects.filter(employee=employee).first()
    print(f"📝 TimeEntry: {time_entry.timestamp}")
    
    # Convert to Manila timezone
    manila_tz = pytz.timezone('Asia/Manila')
    manila_timestamp = time_entry.timestamp.astimezone(manila_tz)
    print(f"🕐 Manila time: {manila_timestamp}")
    print(f"📅 Manila date: {manila_timestamp.date()}")
    print(f"⏰ Manila time: {manila_timestamp.time()}")
    
    # Get the EmployeeSchedule for the correct date
    schedule_date = manila_timestamp.date()
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
    
    # Create new DailyTimeSummary with correct data
    summary = DailyTimeSummary.objects.create(
        employee=employee,
        date=schedule_date,
        time_in=manila_timestamp.time(),
        time_out=None,
        time_in_entry=time_entry,
        time_out_entry=None,
        scheduled_time_in=schedule.scheduled_time_in,
        scheduled_time_out=schedule.scheduled_time_out,
        schedule_reference=schedule,
        status='late' if manila_timestamp.time() > schedule.scheduled_time_in else 'present',
        is_weekend=schedule_date.weekday() >= 5
    )
    
    # Calculate metrics
    summary.calculate_metrics()
    summary.save()
    
    print(f"✅ Created DailyTimeSummary for {summary.date}")
    print(f"🕐 Time In: {summary.time_in}")
    print(f"🕐 Scheduled Time In: {summary.scheduled_time_in}")
    print(f"📊 Status: {summary.status}")
    print(f"📊 Late Minutes: {summary.late_minutes}")
    print(f"📊 Billed Hours: {summary.billed_hours}")

if __name__ == "__main__":
    fix_specific_case() 