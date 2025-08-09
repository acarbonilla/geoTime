#!/usr/bin/env python
"""
Test script to verify EmployeeSchedule signals are working correctly.
This script will test the automatic regeneration of DailyTimeSummary records
when EmployeeSchedule records are created, updated, or deleted.
"""

import os
import sys
import django
from datetime import date, time
from django.utils import timezone

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import Employee, EmployeeSchedule, DailyTimeSummary
from geo.utils import generate_daily_time_summary_from_entries

def test_schedule_signals():
    """Test the EmployeeSchedule signals"""
    print("🧪 Testing EmployeeSchedule signals...")
    
    # Get the test employee
    try:
        employee = Employee.objects.get(employee_id='ALS00005')
        print(f"✅ Found employee: {employee.full_name} ({employee.employee_id})")
    except Employee.DoesNotExist:
        print("❌ Employee with ID ALS00005 not found")
        return
    
    # Test date
    test_date = date(2025, 8, 25)  # Use a future date that doesn't have a schedule
    
    # Clean up any existing test data
    EmployeeSchedule.objects.filter(employee=employee, date=test_date).delete()
    DailyTimeSummary.objects.filter(employee=employee, date=test_date).delete()
    
    print(f"\n📅 Testing with date: {test_date}")
    
    # Check initial state
    initial_summary = DailyTimeSummary.objects.filter(employee=employee, date=test_date).first()
    print(f"📊 Initial DailyTimeSummary: {initial_summary}")
    
    # Test 1: Create a new schedule
    print(f"\n🔵 Test 1: Creating new schedule for {test_date}")
    new_schedule = EmployeeSchedule.objects.create(
        employee=employee,
        date=test_date,
        scheduled_time_in=time(9, 0),  # 9:00 AM
        scheduled_time_out=time(18, 0),  # 6:00 PM
        is_night_shift=False
    )
    print(f"✅ Created schedule: {new_schedule}")
    
    # Check if DailyTimeSummary was updated
    updated_summary = DailyTimeSummary.objects.filter(employee=employee, date=test_date).first()
    if updated_summary:
        print(f"✅ DailyTimeSummary updated: status={updated_summary.status}, scheduled_in={updated_summary.scheduled_time_in}, scheduled_out={updated_summary.scheduled_time_out}")
    else:
        print("❌ DailyTimeSummary not updated")
    
    # Test 2: Update the schedule
    print(f"\n🟡 Test 2: Updating schedule for {test_date}")
    new_schedule.scheduled_time_in = time(8, 0)  # 8:00 AM
    new_schedule.scheduled_time_out = time(17, 0)  # 5:00 PM
    new_schedule.save()
    print(f"✅ Updated schedule: {new_schedule}")
    
    # Check if DailyTimeSummary was updated again
    reupdated_summary = DailyTimeSummary.objects.filter(employee=employee, date=test_date).first()
    if reupdated_summary:
        print(f"✅ DailyTimeSummary reupdated: status={reupdated_summary.status}, scheduled_in={reupdated_summary.scheduled_time_in}, scheduled_out={reupdated_summary.scheduled_time_out}")
    else:
        print("❌ DailyTimeSummary not reupdated")
    
    # Test 3: Delete the schedule
    print(f"\n🔴 Test 3: Deleting schedule for {test_date}")
    schedule_id = new_schedule.id
    new_schedule.delete()
    print(f"✅ Deleted schedule with ID: {schedule_id}")
    
    # Check if DailyTimeSummary was updated after deletion
    final_summary = DailyTimeSummary.objects.filter(employee=employee, date=test_date).first()
    if final_summary:
        print(f"✅ DailyTimeSummary after deletion: status={final_summary.status}, scheduled_in={final_summary.scheduled_time_in}, scheduled_out={final_summary.scheduled_time_out}")
    else:
        print("❌ DailyTimeSummary not updated after deletion")
    
    print(f"\n🎯 Signal testing completed!")

if __name__ == "__main__":
    test_schedule_signals()
