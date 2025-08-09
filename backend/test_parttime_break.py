#!/usr/bin/env python
"""
Test script to demonstrate part-time break calculation
"""
import os
import sys
import django
from datetime import datetime, date, time
import pytz

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import Employee, TimeEntry, DailyTimeSummary, EmployeeSchedule
from geo.utils import generate_daily_time_summary_from_entries

def test_parttime_break_calculation():
    """Test break calculation for part-time employees"""
    
    # Get first employee
    employee = Employee.objects.first()
    if not employee:
        print("❌ No employee found")
        return
    
    print(f"🧪 Testing part-time break calculation for: {employee.full_name}")
    
    # Test scenarios
    test_scenarios = [
        {
            'name': 'Full-Time (8 hours)',
            'daily_work_hours': 8.00,
            'total_schedule_hours': 9.00,
            'flexible_break_hours': 1.00,
            'expected_billed_hours': 8.0
        },
        {
            'name': 'Part-Time (4 hours, no break)',
            'daily_work_hours': 4.00,
            'total_schedule_hours': 4.00,
            'flexible_break_hours': 0.00,
            'expected_billed_hours': 4.0
        },
        {
            'name': 'Part-Time (6 hours, no break)',
            'daily_work_hours': 6.00,
            'total_schedule_hours': 6.00,
            'flexible_break_hours': 0.00,
            'expected_billed_hours': 6.0
        },
        {
            'name': 'Part-Time (4 hours, 30-min break)',
            'daily_work_hours': 4.00,
            'total_schedule_hours': 4.50,
            'flexible_break_hours': 0.50,
            'expected_billed_hours': 4.0
        }
    ]
    
    for i, scenario in enumerate(test_scenarios):
        print(f"\n{'='*60}")
        print(f"📋 TEST SCENARIO {i+1}: {scenario['name']}")
        print(f"{'='*60}")
        
        # Configure employee for this scenario
        employee.daily_work_hours = scenario['daily_work_hours']
        employee.total_schedule_hours = scenario['total_schedule_hours']
        employee.flexible_break_hours = scenario['flexible_break_hours']
        employee.save()
        
        print(f"✅ Employee configured:")
        print(f"   Daily Work Hours: {employee.daily_work_hours}")
        print(f"   Total Schedule Hours: {employee.total_schedule_hours}")
        print(f"   Flexible Break Hours: {employee.flexible_break_hours}")
        
        # Test date
        test_date = date(2025, 8, 5 + i)  # Different date for each test
        
        # Create test schedule based on scenario
        if scenario['name'] == 'Full-Time (8 hours)':
            schedule_in = time(7, 0)  # 7:00 AM
            schedule_out = time(16, 0)  # 4:00 PM
        elif scenario['name'] == 'Part-Time (4 hours, no break)':
            schedule_in = time(9, 0)  # 9:00 AM
            schedule_out = time(13, 0)  # 1:00 PM
        elif scenario['name'] == 'Part-Time (6 hours, no break)':
            schedule_in = time(9, 0)  # 9:00 AM
            schedule_out = time(15, 0)  # 3:00 PM
        elif scenario['name'] == 'Part-Time (4 hours, 30-min break)':
            schedule_in = time(9, 0)  # 9:00 AM
            schedule_out = time(13, 30)  # 1:30 PM
        
        # Create test schedule
        schedule, created = EmployeeSchedule.objects.get_or_create(
            employee=employee,
            date=test_date,
            defaults={
                'scheduled_time_in': schedule_in,
                'scheduled_time_out': schedule_out,
                'is_night_shift': False
            }
        )
        
        if created:
            print(f"✅ Created test schedule: {schedule.scheduled_time_in} - {schedule.scheduled_time_out}")
        else:
            print(f"📅 Using existing schedule: {schedule.scheduled_time_in} - {schedule.scheduled_time_out}")
        
        # Create test time entries
        manila_tz = pytz.timezone('Asia/Manila')
        
        # Delete existing time entries for this date
        TimeEntry.objects.filter(
            employee=employee,
            timestamp__date=test_date
        ).delete()
        
        # Create time in entry
        manila_time_in = manila_tz.localize(datetime.combine(test_date, schedule_in))
        utc_time_in = manila_time_in.astimezone(pytz.UTC)
        
        time_in_entry = TimeEntry.objects.create(
            employee=employee,
            entry_type='time_in',
            timestamp=utc_time_in,
            event_time=utc_time_in
        )
        
        # Create time out entry
        manila_time_out = manila_tz.localize(datetime.combine(test_date, schedule_out))
        utc_time_out = manila_time_out.astimezone(pytz.UTC)
        
        time_out_entry = TimeEntry.objects.create(
            employee=employee,
            entry_type='time_out',
            timestamp=utc_time_out,
            event_time=utc_time_out
        )
        
        print(f"⏰ Created time entries:")
        print(f"   Time In: {time_in_entry.timestamp.astimezone(manila_tz).strftime('%I:%M %p')}")
        print(f"   Time Out: {time_out_entry.timestamp.astimezone(manila_tz).strftime('%I:%M %p')}")
        
        # Generate daily summary
        print(f"\n🔄 Generating daily summary...")
        result = generate_daily_time_summary_from_entries(employee, test_date, test_date)
        print(f"✅ Summary generation result: {result}")
        
        # Get the generated summary
        try:
            summary = DailyTimeSummary.objects.get(employee=employee, date=test_date)
            
            print(f"\n📊 BREAK CALCULATION RESULTS:")
            print(f"   Schedule: {summary.scheduled_time_in} - {summary.scheduled_time_out}")
            print(f"   Actual Time: {summary.time_in} - {summary.time_out}")
            print(f"   Total Break Minutes: {summary.total_break_minutes}")
            print(f"   Billed Hours: {summary.billed_hours}")
            print(f"   Status: {summary.status}")
            
            # Check if calculation is correct
            expected_billed_hours = scenario['expected_billed_hours']
            actual_billed_hours = float(summary.billed_hours)
            
            if abs(actual_billed_hours - expected_billed_hours) < 0.01:
                print(f"\n🎉 SUCCESS! Billed hours is {summary.billed_hours} (expected {expected_billed_hours})")
                print(f"✅ Part-time break calculation is working correctly!")
            else:
                print(f"\n❌ FAILED! Billed hours is {summary.billed_hours} (expected {expected_billed_hours})")
                print(f"❌ Part-time break calculation is not working correctly!")
                
        except DailyTimeSummary.DoesNotExist:
            print("❌ Daily summary was not created")
        
        # Clean up test data
        TimeEntry.objects.filter(
            employee=employee,
            timestamp__date=test_date
        ).delete()
        
        EmployeeSchedule.objects.filter(
            employee=employee,
            date=test_date
        ).delete()
        
        DailyTimeSummary.objects.filter(
            employee=employee,
            date=test_date
        ).delete()
    
    # Reset employee to original settings
    employee.daily_work_hours = 8.00
    employee.total_schedule_hours = 9.00
    employee.flexible_break_hours = 1.00
    employee.save()
    
    print(f"\n✅ All part-time break tests completed")

if __name__ == "__main__":
    test_parttime_break_calculation() 