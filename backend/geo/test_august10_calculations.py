#!/usr/bin/env python3
"""
Test case to debug why BH (Billed Hours), UT (Under Time), and Late calculations 
are not working for August 10, 2024.

This test case recreates the exact scenario from the image:
- Date: August 10 (Sunday)
- Actual In: 11:58 PM
- Actual Out: 12:16 AM (next day)
- Scheduled In: 11:00 PM
- Scheduled Out: 8:00 AM (next day)
- Expected BH: Should be calculated (around 0.30 hours = 18 minutes)
- Expected UT: Should be calculated (scheduled work time - BH)
- Expected Late: Should be calculated (58 minutes late)
"""

import os
import sys
import django
from datetime import datetime, date, time, timedelta
from decimal import Decimal

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from geo.models import (
    Location, Department, Employee, TimeEntry, EmployeeSchedule, 
    DailyTimeSummary, ScheduleTemplate
)

def create_test_environment():
    """Create test data for August 10 scenario"""
    print("Creating test environment...")
    
    # Create location
    location, created = Location.objects.get_or_create(
        name="Test Office",
        defaults={
            'latitude': 14.5995,
            'longitude': 120.9842,
            'timezone_name': 'Asia/Manila',
            'timezone_offset': 8,
            'geofence_radius': 100,
            'min_accuracy_meters': 50,
            'city': 'Manila',
            'country': 'Philippines'
        }
    )
    print(f"Location: {location.name} ({'created' if created else 'exists'})")
    
    # Create department
    department, created = Department.objects.get_or_create(
        name="Test Department",
        defaults={
            'location': location,
            'code': 'TEST'
        }
    )
    print(f"Department: {department.name} ({'created' if created else 'exists'})")
    
    # Create test user
    user, created = User.objects.get_or_create(
        username='testuser_august10',
        defaults={
            'first_name': 'Test',
            'last_name': 'User',
            'email': 'test@example.com'
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
    print(f"User: {user.username} ({'created' if created else 'exists'})")
    
    # Create employee
    employee, created = Employee.objects.get_or_create(
        user=user,
        defaults={
            'employee_id': 'EMP001',
            'department': department,
            'position': 'Test Position',
            'role': 'employee',
            'hire_date': date(2024, 1, 1),
            'employment_status': 'active',
            'daily_work_hours': Decimal('8.00'),
            'overtime_threshold_hours': Decimal('8.00'),
            'total_schedule_hours': Decimal('9.00'),
            'flexible_break_hours': Decimal('1.00'),
            'lunch_break_minutes': 60,
            'break_threshold_minutes': 30,
            'grace_period_minutes': 5,
            'early_login_restriction_hours': Decimal('1.00'),
            'require_schedule_compliance': True
        }
    )
    print(f"Employee: {employee.full_name} ({'created' if created else 'exists'})")
    
    return location, department, user, employee

def create_august10_schedule(employee):
    """Create the August 10 schedule for the employee"""
    print("\nCreating August 10 schedule...")
    
    # August 10, 2024 is a Sunday
    august_10 = date(2024, 8, 10)
    
    # Create schedule template for night shift
    template, created = ScheduleTemplate.objects.get_or_create(
        name="Night Shift Template",
        defaults={
            'time_in': time(23, 0),  # 11:00 PM
            'time_out': time(8, 0),   # 8:00 AM
            'is_night_shift': True,
            'template_type': 'personal',
            'created_by': employee
        }
    )
    print(f"Template: {template.name} ({'created' if created else 'exists'})")
    
    # Create employee schedule for August 10
    schedule, created = EmployeeSchedule.objects.get_or_create(
        employee=employee,
        date=august_10,
        defaults={
            'scheduled_time_in': time(23, 0),  # 11:00 PM
            'scheduled_time_out': time(8, 0),  # 8:00 AM
            'is_night_shift': True,
            'template_used': template
        }
    )
    print(f"Schedule for {august_10}: {schedule.scheduled_time_in} - {schedule.scheduled_time_out}")
    print(f"  Is night shift: {schedule.is_night_shift}")
    print(f"  Duration: {schedule.duration_hours} hours")
    
    return schedule

def create_august10_time_entries(employee):
    """Create time entries for August 10"""
    print("\nCreating August 10 time entries...")
    
    august_10 = date(2024, 8, 10)
    location = employee.department.location
    
    # Time In: August 10, 11:58 PM (58 minutes late)
    time_in_dt = datetime.combine(august_10, time(23, 58))
    time_in_entry, created = TimeEntry.objects.get_or_create(
        employee=employee,
        entry_type='time_in',
        timestamp=time_in_dt,
        defaults={
            'event_time': time_in_dt,
            'location': location,
            'latitude': location.latitude,
            'longitude': location.longitude,
            'accuracy': 25.0,
            'notes': 'Test time in for August 10'
        }
    )
    print(f"Time In: {time_in_entry.timestamp} ({'created' if created else 'exists'})")
    
    # Time Out: August 11, 12:16 AM (next day, 18 minutes worked)
    time_out_dt = datetime.combine(august_10 + timedelta(days=1), time(0, 16))
    time_out_entry, created = TimeEntry.objects.get_or_create(
        employee=employee,
        entry_type='time_out',
        timestamp=time_out_dt,
        defaults={
            'event_time': time_out_dt,
            'location': location,
            'latitude': location.latitude,
            'longitude': location.longitude,
            'accuracy': 25.0,
            'notes': 'Test time out for August 10 (next day)'
        }
    )
    print(f"Time Out: {time_out_entry.timestamp} ({'created' if created else 'exists'})")
    
    return time_in_entry, time_out_entry

def analyze_august10_data(employee):
    """Analyze the August 10 data to understand the issue"""
    print("\n" + "="*60)
    print("ANALYZING AUGUST 10 DATA")
    print("="*60)
    
    august_10 = date(2024, 8, 10)
    
    # Check schedule
    try:
        schedule = EmployeeSchedule.objects.get(employee=employee, date=august_10)
        print(f"✓ Schedule found:")
        print(f"  - Scheduled In: {schedule.scheduled_time_in}")
        print(f"  - Scheduled Out: {schedule.scheduled_time_out}")
        print(f"  - Is Night Shift: {schedule.is_night_shift}")
        print(f"  - Duration: {schedule.duration_hours} hours")
    except EmployeeSchedule.DoesNotExist:
        print("✗ No schedule found for August 10")
        return
    
    # Check time entries
    start_of_day = datetime.combine(august_10, datetime.min.time())
    end_of_day = start_of_day + timedelta(days=1)
    
    time_entries = TimeEntry.objects.filter(
        employee=employee,
        timestamp__gte=start_of_day,
        timestamp__lt=end_of_day
    ).order_by('timestamp')
    
    print(f"\n✓ Time entries found: {time_entries.count()}")
    for entry in time_entries:
        print(f"  - {entry.entry_type}: {entry.timestamp} ({entry.event_time})")
    
    # Check daily summary
    try:
        summary = DailyTimeSummary.objects.get(employee=employee, date=august_10)
        print(f"\n✓ Daily summary found:")
        print(f"  - Status: {summary.status}")
        print(f"  - Time In: {summary.time_in}")
        print(f"  - Time Out: {summary.time_out}")
        print(f"  - Scheduled In: {summary.scheduled_time_in}")
        print(f"  - Scheduled Out: {summary.scheduled_time_out}")
        print(f"  - BH (Billed Hours): {summary.billed_hours}")
        print(f"  - Late Minutes: {summary.late_minutes}")
        print(f"  - UT (Under Time): {summary.undertime_minutes}")
        print(f"  - Night Differential: {summary.night_differential_hours}")
        print(f"  - Overtime: {summary.overtime_hours}")
    except DailyTimeSummary.DoesNotExist:
        print("✗ No daily summary found for August 10")
        return
    
    return summary

def manually_calculate_expected_values(employee, schedule, time_in_entry, time_out_entry):
    """Manually calculate what the values should be"""
    print("\n" + "="*60)
    print("MANUAL CALCULATION OF EXPECTED VALUES")
    print("="*60)
    
    august_10 = date(2024, 8, 10)
    
    # Expected BH calculation
    scheduled_start = datetime.combine(august_10, schedule.scheduled_time_in)
    time_out_dt = time_out_entry.timestamp
    
    if time_out_dt < scheduled_start:
        time_out_dt += timedelta(days=1)
    
    bh_minutes = int((time_out_dt - scheduled_start).total_seconds() / 60)
    bh_hours = bh_minutes / 60
    
    print(f"Expected BH calculation:")
    print(f"  - Scheduled start: {scheduled_start}")
    print(f"  - Time out: {time_out_dt}")
    print(f"  - BH minutes: {bh_minutes}")
    print(f"  - BH hours: {bh_hours:.2f}")
    
    # Expected Late calculation
    time_in_dt = time_in_entry.timestamp
    grace_period_end = scheduled_start + timedelta(minutes=employee.grace_period_minutes)
    
    if time_in_dt > grace_period_end:
        late_minutes = int((time_in_dt - scheduled_start).total_seconds() / 60)
    else:
        late_minutes = 0
    
    print(f"\nExpected Late calculation:")
    print(f"  - Time in: {time_in_dt}")
    print(f"  - Grace period end: {grace_period_end}")
    print(f"  - Late minutes: {late_minutes}")
    
    # Expected UT calculation
    scheduled_end = datetime.combine(august_10, schedule.scheduled_time_out)
    if scheduled_end < scheduled_start:
        scheduled_end += timedelta(days=1)
    
    scheduled_duration_minutes = int((scheduled_end - scheduled_start).total_seconds() / 60)
    
    # For flexible break system: calculate actual work time (excluding breaks)
    if scheduled_duration_minutes >= 240:  # 4 hours or more
        flexible_break_minutes = int(employee.flexible_break_hours * 60)
        scheduled_work_minutes = scheduled_duration_minutes - flexible_break_minutes
    else:
        scheduled_work_minutes = scheduled_duration_minutes
    
    ut_minutes = max(0, scheduled_work_minutes - bh_minutes)
    
    print(f"\nExpected UT calculation:")
    print(f"  - Scheduled duration: {scheduled_duration_minutes} minutes")
    print(f"  - Flexible break: {employee.flexible_break_hours} hours")
    print(f"  - Scheduled work time: {scheduled_work_minutes} minutes")
    print(f"  - UT minutes: {ut_minutes}")
    
    return {
        'bh_hours': bh_hours,
        'late_minutes': late_minutes,
        'ut_minutes': ut_minutes
    }

def force_recalculate_summary(summary):
    """Force recalculation of the summary metrics"""
    print("\n" + "="*60)
    print("FORCING RECALCULATION OF METRICS")
    print("="*60)
    
    print("Before recalculation:")
    print(f"  - BH: {summary.billed_hours}")
    print(f"  - Late: {summary.late_minutes}")
    print(f"  - UT: {summary.undertime_minutes}")
    
    # Force recalculation
    summary.calculate_metrics()
    summary.save()
    
    print("\nAfter recalculation:")
    print(f"  - BH: {summary.billed_hours}")
    print(f"  - Late: {summary.late_minutes}")
    print(f"  - UT: {summary.undertime_minutes}")
    
    return summary

def debug_calculation_issues(summary, expected_values):
    """Debug why calculations might be failing"""
    print("\n" + "="*60)
    print("DEBUGGING CALCULATION ISSUES")
    print("="*60)
    
    # Check if required fields are present
    print("Field validation:")
    print(f"  - Time in present: {summary.time_in is not None}")
    print(f"  - Time out present: {summary.time_out is not None}")
    print(f"  - Scheduled time in present: {summary.scheduled_time_in is not None}")
    print(f"  - Scheduled time out present: {summary.scheduled_time_out is not None}")
    
    # Check if calculate_metrics was called
    print(f"\nCalculation status:")
    print(f"  - BH calculated: {summary.billed_hours != 0}")
    print(f"  - Late calculated: {summary.late_minutes != 0}")
    print(f"  - UT calculated: {summary.undertime_minutes != 0}")
    
    # Check for potential issues
    if summary.billed_hours == 0 and expected_values['bh_hours'] > 0:
        print(f"\n⚠️  BH calculation issue detected!")
        print(f"   Expected: {expected_values['bh_hours']:.2f} hours")
        print(f"   Actual: {summary.billed_hours}")
    
    if summary.late_minutes == 0 and expected_values['late_minutes'] > 0:
        print(f"\n⚠️  Late calculation issue detected!")
        print(f"   Expected: {expected_values['late_minutes']} minutes")
        print(f"   Actual: {summary.late_minutes}")
    
    if summary.undertime_minutes == 0 and expected_values['ut_minutes'] > 0:
        print(f"\n⚠️  UT calculation issue detected!")
        print(f"   Expected: {expected_values['ut_minutes']} minutes")
        print(f"   Actual: {summary.undertime_minutes}")

def main():
    """Main test execution"""
    print("AUGUST 10 CALCULATION DEBUG TEST")
    print("="*60)
    
    try:
        # Create test environment
        location, department, user, employee = create_test_environment()
        
        # Create August 10 schedule
        schedule = create_august10_schedule(employee)
        
        # Create time entries
        time_in_entry, time_out_entry = create_august10_time_entries(employee)
        
        # Analyze existing data
        summary = analyze_august10_data(employee)
        
        if summary:
            # Calculate expected values manually
            expected_values = manually_calculate_expected_values(
                employee, schedule, time_in_entry, time_out_entry
            )
            
            # Force recalculation
            summary = force_recalculate_summary(summary)
            
            # Debug issues
            debug_calculation_issues(summary, expected_values)
            
            print("\n" + "="*60)
            print("TEST COMPLETED")
            print("="*60)
            print("Check the output above to identify why calculations are failing.")
        else:
            print("\n✗ Cannot proceed without daily summary. Please run the populate command first.")
            print("Command: python manage.py populate_daily_summaries --employee-id EMP001 --start-date 2024-08-10 --end-date 2024-08-10")
    
    except Exception as e:
        print(f"\n✗ Error during test execution: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
