#!/usr/bin/env python
"""
Test script for TimeEntry signals
Run this script from the backend directory to test the signal functionality
"""

import os
import sys
import django
from datetime import datetime, date
import pytz

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import Employee, TimeEntry, DailyTimeSummary
from geo.utils import generate_daily_time_summary_from_entries

def test_signal():
    """Test the signal functionality for TimeEntry and DailyTimeSummary"""
    
    print("🔍 Testing TimeEntry signals...")
    
    # Test with employee 'doejane' or any existing employee
    employee_id = 'doejane'
    test_date = date.today()
    
    try:
        # Get employee
        employee = Employee.objects.get(employee_id=employee_id)
        print(f"✅ Found employee: {employee.user.first_name} {employee.user.last_name} ({employee.employee_id})")
    except Employee.DoesNotExist:
        # Try to find any employee
        employees = Employee.objects.all()
        if employees.exists():
            employee = employees.first()
            print(f"⚠️ Employee {employee_id} not found, using first available employee: {employee.user.first_name} {employee.user.last_name} ({employee.employee_id})")
        else:
            print(f"❌ No employees found in database")
            return False
    
    # Check current daily summary
    try:
        existing_summary = DailyTimeSummary.objects.get(
            employee=employee,
            date=test_date
        )
        print(f"📅 Existing daily summary for {test_date}:")
        print(f"   - Time In: {existing_summary.formatted_time_in or 'None'}")
        print(f"   - Time Out: {existing_summary.formatted_time_out or 'None'}")
        print(f"   - Status: {existing_summary.status}")
    except DailyTimeSummary.DoesNotExist:
        print(f"📅 No existing daily summary found for {test_date}")
    
    # Check existing time entries
    existing_entries = TimeEntry.objects.filter(
        employee=employee,
        timestamp__date=test_date
    ).order_by('timestamp')
    
    if existing_entries.exists():
        print(f"⏰ Found {existing_entries.count()} existing time entries for {test_date}:")
        for entry in existing_entries:
            print(f"   - {entry.timestamp.strftime('%H:%M:%S')} ({entry.entry_type})")
    else:
        print(f"⏰ No existing time entries found for {test_date}")
    
    # Create a test time entry
    manila_tz = pytz.timezone('Asia/Manila')
    test_time = datetime.combine(test_date, datetime.min.time().replace(hour=9, minute=0))
    test_time = manila_tz.localize(test_time)
    
    print(f"\n🔄 Creating test time entry at {test_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check if a time entry already exists for this time
    existing_entry = TimeEntry.objects.filter(
        employee=employee,
        timestamp__date=test_date,
        entry_type='time_in'
    ).first()
    
    if existing_entry:
        print(f"📝 Updating existing time entry (ID: {existing_entry.id})")
        existing_entry.timestamp = test_time
        existing_entry.save()
        print("✅ Updated existing time entry")
    else:
        # Create a new time entry
        time_entry = TimeEntry.objects.create(
            employee=employee,
            timestamp=test_time,
            entry_type='time_in',
            location=None,  # Set to None for now
            latitude=14.5995,
            longitude=120.9842
        )
        print(f"✅ Created new time entry with ID: {time_entry.id}")
    
    # Wait a moment for the signal to process
    import time
    time.sleep(1)
    
    # Check if the daily summary was updated
    try:
        updated_summary = DailyTimeSummary.objects.get(
            employee=employee,
            date=test_date
        )
        print(f"\n📊 Daily summary updated successfully:")
        print(f"   - Time In: {updated_summary.formatted_time_in or 'None'}")
        print(f"   - Time Out: {updated_summary.formatted_time_out or 'None'}")
        print(f"   - Status: {updated_summary.status}")
        print(f"   - Total Hours: {updated_summary.billed_hours or 'None'}")
        
        # Check if the time entry is reflected in the summary
        if updated_summary.formatted_time_in:
            print("🎉 Signal test PASSED - Time entry is reflected in daily summary")
            return True
        else:
            print("⚠️ Signal test PARTIAL - Daily summary exists but time_in not set")
            return False
            
    except DailyTimeSummary.DoesNotExist:
        print("❌ Signal test FAILED - Daily summary was not created/updated")
        return False

if __name__ == "__main__":
    success = test_signal()
    if success:
        print("\n🎯 Signal test completed successfully!")
    else:
        print("\n💥 Signal test failed!")
        sys.exit(1)
