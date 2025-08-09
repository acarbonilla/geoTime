#!/usr/bin/env python
"""
Test script to demonstrate TIME ATTENDANCE report generation
This script shows how TimeEntry data connects with EmployeeSchedule data
to generate DailyTimeSummary records for the TIME ATTENDANCE report.
"""

import os
import sys
import django
from datetime import date, time, datetime
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import Employee, TimeEntry, EmployeeSchedule, DailyTimeSummary, Location
from geo.utils import generate_daily_time_summary_from_entries, get_employee_time_attendance_report


def create_test_data():
    """Create test TimeEntry and EmployeeSchedule data"""
    print("Creating test data...")
    
    # Get or create a test employee
    try:
        employee = Employee.objects.first()
        if not employee:
            print("No employees found. Please create an employee first.")
            return None
    except Exception as e:
        print(f"Error getting employee: {e}")
        return None
    
    # Get or create a location
    location, created = Location.objects.get_or_create(
        name="Test Office",
        defaults={
            'latitude': 14.5995,
            'longitude': 120.9842,
            'timezone_name': 'Asia/Manila',
            'timezone_offset': 28800,
        }
    )
    
    # Create test schedule for today
    today = date.today()
    schedule, created = EmployeeSchedule.objects.get_or_create(
        employee=employee,
        date=today,
        defaults={
            'scheduled_time_in': time(9, 0),  # 9:00 AM
            'scheduled_time_out': time(18, 0),  # 6:00 PM
            'is_night_shift': False,
        }
    )
    
    # Create test time entries for today
    time_in_entry, created = TimeEntry.objects.get_or_create(
        employee=employee,
        entry_type='time_in',
        timestamp__date=today,
        defaults={
            'timestamp': datetime.combine(today, time(9, 15)),  # 15 minutes late
            'location': location,
        }
    )
    
    time_out_entry, created = TimeEntry.objects.get_or_create(
        employee=employee,
        entry_type='time_out',
        timestamp__date=today,
        defaults={
            'timestamp': datetime.combine(today, time(18, 30)),  # 30 minutes overtime
            'location': location,
        }
    )
    
    print(f"Created test data for {employee.full_name} on {today}")
    print(f"Schedule: {schedule.scheduled_time_in} - {schedule.scheduled_time_out}")
    print(f"Time In: {time_in_entry.timestamp.time()}")
    print(f"Time Out: {time_out_entry.timestamp.time()}")
    
    return employee


def test_daily_summary_generation(employee):
    """Test generating DailyTimeSummary from TimeEntry and EmployeeSchedule data"""
    print("\n" + "="*60)
    print("TESTING DAILY SUMMARY GENERATION")
    print("="*60)
    
    today = date.today()
    
    # Generate daily summary
    result = generate_daily_time_summary_from_entries(employee, today)
    
    print(f"Generation Result: {result}")
    
    # Get the generated summary
    try:
        summary = DailyTimeSummary.objects.get(employee=employee, date=today)
        print(f"\nGenerated Summary:")
        print(f"  Status: {summary.status}")
        print(f"  Time In: {summary.time_in}")
        print(f"  Time Out: {summary.time_out}")
        print(f"  Scheduled In: {summary.scheduled_time_in}")
        print(f"  Scheduled Out: {summary.scheduled_time_out}")
        print(f"  Billed Hours: {summary.billed_hours}")
        print(f"  Late Minutes: {summary.late_minutes}")
        print(f"  Undertime Minutes: {summary.undertime_minutes}")
        print(f"  Night Differential: {summary.night_differential_hours}")
        print(f"  Overtime Hours: {summary.overtime_hours}")
        
    except DailyTimeSummary.DoesNotExist:
        print("No summary found!")


def test_time_attendance_report(employee):
    """Test generating TIME ATTENDANCE report"""
    print("\n" + "="*60)
    print("TESTING TIME ATTENDANCE REPORT")
    print("="*60)
    
    today = date.today()
    
    # Generate report
    report = get_employee_time_attendance_report(employee, today, today)
    
    print(f"Employee: {report['employee']['name']} ({report['employee']['employee_id']})")
    print(f"Department: {report['employee']['department']}")
    print(f"Period: {report['period']['start_date']} to {report['period']['end_date']}")
    print("-" * 60)
    
    # Display daily records
    for record in report['daily_records']:
        print(f"{record['date']} {record['day']} | "
              f"Status: {record['status']} | "
              f"Time In: {record['time_in']} | "
              f"Time Out: {record['time_out']} | "
              f"BH: {record['billed_hours']} | "
              f"LT: {record['late_minutes']} | "
              f"UT: {record['undertime_minutes']} | "
              f"ND: {record['night_differential']}")
    
    print("-" * 60)
    print(f"Days Work: {report['summary']['days_worked']}")
    print(f"Total BH: {report['summary']['total_billed_hours']}")
    print(f"Total LT: {report['summary']['total_late_minutes']}")
    print(f"Total UT: {report['summary']['total_undertime_minutes']}")
    print(f"Total ND: {report['summary']['total_night_differential']}")


def main():
    """Main test function"""
    print("TIME ATTENDANCE SYSTEM TEST")
    print("="*60)
    print("This test demonstrates how TimeEntry data connects with EmployeeSchedule data")
    print("to generate DailyTimeSummary records for the TIME ATTENDANCE report.")
    print()
    
    # Create test data
    employee = create_test_data()
    if not employee:
        return
    
    # Test daily summary generation
    test_daily_summary_generation(employee)
    
    # Test time attendance report
    test_time_attendance_report(employee)
    
    print("\n" + "="*60)
    print("TEST COMPLETE!")
    print("="*60)
    print("The system now connects:")
    print("1. TimeEntry data (actual time in/out)")
    print("2. EmployeeSchedule data (scheduled time in/out)")
    print("3. DailyTimeSummary data (calculated metrics: BH, LT, UT, ND)")
    print()
    print("This creates the TIME ATTENDANCE report format shown in the image!")


if __name__ == "__main__":
    main() 