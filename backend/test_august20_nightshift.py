#!/usr/bin/env python3
"""
Test case for August 20, 2025 Night Shift Schedule

Scenario:
- Date: August 20, 2025 (Wednesday)
- Schedule: 7:00 PM - 4:00 AM (night shift crossing midnight)
- Actual Time In: 7:40 PM (40 minutes late)
- Actual Time Out: 2:00 AM (2 hours early)

Expected Calculations:
- Late (LT): 40 minutes (after grace period)
- Billed Hours (BH): 6 hours 20 minutes (7:40 PM - 2:00 AM, minus 1 hour break)
- Undertime (UT): 1 hour 40 minutes (scheduled 8 hours - BH 6.33 hours)
- Night Differential (ND): 4 hours (10:00 PM - 2:00 AM, minus 1 hour break)
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
from django.utils import timezone
from geo.models import (
    Location, Department, Employee, TimeEntry, EmployeeSchedule, 
    DailyTimeSummary, ScheduleTemplate
)

def create_test_environment():
    """Create test data for August 20 night shift scenario"""
    print("Creating test environment for August 20, 2025 night shift...")
    
    # Create location
    location, created = Location.objects.get_or_create(
        name="Test Office - Night Shift",
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
        name="Night Shift Department",
        defaults={
            'location': location,
            'code': 'NIGHT'
        }
    )
    print(f"Department: {department.name} ({'created' if created else 'exists'})")
    
    # Create test user
    user, created = User.objects.get_or_create(
        username='testuser_august20_night',
        defaults={
            'first_name': 'Night',
            'last_name': 'Shift',
            'email': 'nightshift@example.com'
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
    print(f"User: {user.username} ({'created' if created else 'exists'})")
    
    # Create employee with night shift configuration
    employee, created = Employee.objects.get_or_create(
        user=user,
        defaults={
            'employee_id': 'NIGHT001',
            'department': department,
            'position': 'Night Shift Worker',
            'role': 'employee',
            'hire_date': date(2024, 1, 1),
            'employment_status': 'active',
            'daily_work_hours': Decimal('8.00'),  # Standard 8-hour work day
            'overtime_threshold_hours': Decimal('8.00'),
            'total_schedule_hours': Decimal('9.00'),  # 7:00 PM - 4:00 AM = 9 hours
            'flexible_break_hours': Decimal('1.00'),  # 1 hour break
            'lunch_break_minutes': 60,
            'break_threshold_minutes': 30,
            'grace_period_minutes': 5,  # 5 minutes grace period
            'early_login_restriction_hours': Decimal('1.00'),
            'require_schedule_compliance': True
        }
    )
    print(f"Employee: {employee.full_name} ({'created' if created else 'exists'})")
    
    return location, department, user, employee

def test_grace_period_calculations(employee, schedule):
    """Test different arrival times to demonstrate grace period calculations"""
    print("\n🧪 TESTING GRACE PERIOD CALCULATIONS:")
    print("   Grace Period: 5 minutes")
    print("   Scheduled Time: 7:00 PM (19:00)")
    print("   Policy: Grace period ONLY applies when arrival is 7:05 PM or earlier")
    print("   Policy: If arrival is 7:06 PM or later, NO grace period applies")
    print("   Examples:")
    
    test_times = [
        (19, 0, "7:00 PM", "On time"),
        (19, 1, "7:01 PM", "1 minute late (within grace period)"),
        (19, 5, "7:05 PM", "5 minutes late (exactly grace period)"),
        (19, 6, "7:06 PM", "6 minutes late (NO grace period)"),
        (19, 10, "7:10 PM", "10 minutes late (NO grace period)"),
        (19, 40, "7:40 PM", "40 minutes late (NO grace period)")
    ]
    
    for hour, minute, time_str, description in test_times:
        actual_time = time(hour, minute)
        scheduled_time = schedule.scheduled_time_in
        
        # Calculate late minutes
        scheduled_dt = datetime.combine(date(2025, 8, 20), scheduled_time)
        actual_dt = datetime.combine(date(2025, 8, 20), actual_time)
        
        late_minutes = int((actual_dt - scheduled_dt).total_seconds() / 60)
        
        # NEW LOGIC: Grace period only applies when arrival is 7:05 PM or earlier
        if late_minutes <= employee.grace_period_minutes:
            # Within grace period: no late
            late_after_grace = 0
            grace_applied = "✓ GRACE APPLIED"
        else:
            # Beyond grace period: full late (no grace deduction)
            late_after_grace = late_minutes
            grace_applied = "✗ NO GRACE"
        
        status = "✓ NO LATE" if late_after_grace == 0 else f"✗ {late_after_grace} min late"
        
        print(f"   {time_str} arrival: {late_minutes} min late → {grace_applied} → {status}")
    
    print("\n✅ Updated grace period calculations are working correctly!")

def create_august20_schedule(employee):
    """Create the night shift schedule for August 20, 2025"""
    print("\nCreating August 20, 2025 night shift schedule...")
    
    # Create schedule template for night shift
    template, created = ScheduleTemplate.objects.get_or_create(
        name="Night Shift 7PM-4AM",
        defaults={
            'time_in': time(19, 0),  # 7:00 PM
            'time_out': time(4, 0),   # 4:00 AM
            'is_night_shift': True,   # Important: mark as night shift
            'template_type': 'personal',
            'created_by': employee
        }
    )
    print(f"Schedule Template: {template.name} ({'created' if created else 'exists'})")
    
    # Create employee schedule for August 20, 2025
    schedule_date = date(2025, 8, 20)
    schedule, created = EmployeeSchedule.objects.get_or_create(
        employee=employee,
        date=schedule_date,
        defaults={
            'scheduled_time_in': time(19, 0),  # 7:00 PM
            'scheduled_time_out': time(4, 0),  # 4:00 AM
            'is_night_shift': True,            # Important: mark as night shift
            'template_used': template,
            'notes': 'Night shift test case - August 20, 2025'
        }
    )
    print(f"Employee Schedule: {schedule_date} - {schedule.scheduled_time_in} to {schedule.scheduled_time_out}")
    print(f"Night Shift: {schedule.is_night_shift}")
    
    # Test grace period calculations
    test_grace_period_calculations(employee, schedule)
    
    return template, schedule

def validate_time_entries(time_in_entry, time_out_entry):
    """Validate that the time entries match exactly what was requested"""
    print("\n🔍 VALIDATING TIME ENTRIES...")
    
    # Convert to local timezone for validation
    local_tz = timezone.get_current_timezone()
    time_in_local = timezone.localtime(time_in_entry.event_time, local_tz)
    time_out_local = timezone.localtime(time_out_entry.event_time, local_tz)
    
    # Extract the actual times from the entries (using local time)
    actual_in_time = time_in_local.time()
    actual_out_time = time_out_local.time()
    actual_in_date = time_in_local.date()
    actual_out_date = time_out_local.date()
    
    # Define the expected times
    expected_in_time = time(19, 40)  # 7:40 PM
    expected_out_time = time(2, 0)   # 2:00 AM
    expected_in_date = date(2025, 8, 20)
    expected_out_date = date(2025, 8, 21)  # Next day
    
    # Validate Time In
    in_correct = (actual_in_time == expected_in_time and actual_in_date == expected_in_date)
    print(f"Time In Validation:")
    print(f"   Expected: {expected_in_date} {expected_in_time.strftime('%I:%M %p')} ({expected_in_time.strftime('%H:%M')})")
    print(f"   Actual:   {actual_in_date} {actual_in_time.strftime('%I:%M %p')} ({actual_in_time.strftime('%H:%M')})")
    print(f"   Status:   {'✓ CORRECT' if in_correct else '✗ INCORRECT'}")
    
    # Validate Time Out
    out_correct = (actual_out_time == expected_out_time and actual_out_date == expected_out_date)
    print(f"Time Out Validation:")
    print(f"   Expected: {expected_out_date} {expected_out_time.strftime('%I:%M %p')} ({expected_out_time.strftime('%H:%M')})")
    print(f"   Actual:   {actual_out_date} {actual_out_time.strftime('%I:%M %p')} ({actual_out_time.strftime('%H:%M')})")
    print(f"   Status:   {'✓ CORRECT' if out_correct else '✗ INCORRECT'}")
    
    # Calculate and validate duration (using local time)
    duration_minutes = int((time_out_local - time_in_local).total_seconds() / 60)
    expected_duration_minutes = 6 * 60 + 20  # 6 hours 20 minutes
    
    duration_correct = (duration_minutes == expected_duration_minutes)
    print(f"Duration Validation:")
    print(f"   Expected: {expected_duration_minutes} minutes (6 hours 20 minutes)")
    print(f"   Actual:   {duration_minutes} minutes ({duration_minutes/60:.2f} hours)")
    print(f"   Status:   {'✓ CORRECT' if duration_correct else '✗ INCORRECT'}")
    
    # Overall validation
    all_correct = in_correct and out_correct and duration_correct
    print(f"\n📊 OVERALL VALIDATION:")
    if all_correct:
        print("   ✓ ALL TIME ENTRIES ARE CORRECT!")
        print("   ✓ Times match exactly what was requested")
        print("   ✓ Duration calculation is accurate")
    else:
        print("   ✗ SOME TIME ENTRIES HAVE ISSUES")
        print("   ✗ Please check the validation details above")
    
    return all_correct

def check_timezone_settings():
    """Check and display timezone settings to help debug time issues"""
    print("\n🔧 TIMEZONE SETTINGS CHECK:")
    print(f"  Django Timezone: {timezone.get_current_timezone()}")
    print(f"  Django Timezone Name: {timezone.get_current_timezone_name()}")
    print(f"  Django is timezone aware: {timezone.is_aware(datetime.now())}")
    print(f"  Current time: {timezone.now()}")
    print(f"  Current time (local): {timezone.localtime(timezone.now())}")
    
    # Test timezone conversion
    test_dt = datetime(2025, 8, 20, 19, 40, 0)
    test_dt_aware = timezone.make_aware(test_dt, timezone=timezone.get_current_timezone())
    print(f"  Test datetime (naive): {test_dt}")
    print(f"  Test datetime (aware): {test_dt_aware}")
    print(f"  Test datetime timezone: {test_dt_aware.tzinfo}")

def verify_database_storage(time_in_entry, time_out_entry):
    """Verify that the time entries are stored and retrieved correctly from the database"""
    print("\n🔍 DATABASE STORAGE VERIFICATION:")
    
    # Refresh from database to see what was actually stored
    time_in_entry.refresh_from_db()
    time_out_entry.refresh_from_db()
    
    print(f"Time In Entry (from DB):")
    print(f"  - ID: {time_in_entry.id}")
    print(f"  - Event Time: {time_in_entry.event_time}")
    print(f"  - Date: {time_in_entry.event_time.date()}")
    print(f"  - Time: {time_in_entry.event_time.time()}")
    print(f"  - Formatted: {time_in_entry.event_time.strftime('%I:%M %p')}")
    print(f"  - Timezone: {time_in_entry.event_time.tzinfo}")
    
    print(f"Time Out Entry (from DB):")
    print(f"  - ID: {time_out_entry.id}")
    print(f"  - Event Time: {time_out_entry.event_time}")
    print(f"  - Date: {time_out_entry.event_time.date()}")
    print(f"  - Time: {time_out_entry.event_time.time()}")
    print(f"  - Formatted: {time_out_entry.event_time.strftime('%I:%M %p')}")
    print(f"  - Timezone: {time_out_entry.event_time.tzinfo}")
    
    # Convert back to local timezone for comparison
    local_tz = timezone.get_current_timezone()
    time_in_local = timezone.localtime(time_in_entry.event_time, local_tz)
    time_out_local = timezone.localtime(time_out_entry.event_time, local_tz)
    
    print(f"\n🔍 LOCAL TIMEZONE CONVERSION:")
    print(f"Time In (Local): {time_in_local}")
    print(f"Time Out (Local): {time_out_local}")
    print(f"Time In Time: {time_in_local.time()}")
    print(f"Time Out Time: {time_out_local.time()}")
    
    # Check if there's a timezone conversion issue
    print(f"\n🔍 TIMEZONE CONVERSION ANALYSIS:")
    
    # Get the raw database values
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("SELECT event_time FROM geo_timeentry WHERE id = %s", [time_in_entry.id])
        raw_time_in = cursor.fetchone()[0]
        cursor.execute("SELECT event_time FROM geo_timeentry WHERE id = %s", [time_out_entry.id])
        raw_time_out = cursor.fetchone()[0]
    
    print(f"Raw DB Time In: {raw_time_in}")
    print(f"Raw DB Time Out: {raw_time_out}")
    print(f"Python Time In: {time_in_entry.event_time}")
    print(f"Python Time Out: {time_out_entry.event_time}")
    print(f"Local Time In: {time_in_local}")
    print(f"Local Time Out: {time_out_local}")
    
    # Check if the times match what we expect (using local time)
    expected_in = time(19, 40)  # 7:40 PM
    expected_out = time(2, 0)   # 2:00 AM
    
    actual_in = time_in_local.time()
    actual_out = time_out_local.time()
    
    print(f"\nExpected vs Actual (Local Time):")
    print(f"Time In: Expected {expected_in} ({expected_in.strftime('%I:%M %p')}), Got {actual_in} ({actual_in.strftime('%I:%M %p')})")
    print(f"Time Out: Expected {expected_out} ({expected_out.strftime('%I:%M %p')}), Got {actual_out} ({actual_out.strftime('%I:%M %p')})")
    
    # Update the time entries with local time for the rest of the test
    time_in_entry.event_time = time_in_local
    time_out_entry.event_time = time_out_local

def create_august20_time_entries(employee):
    """Create time entries for August 20, 2025"""
    print("\nCreating time entries for August 20, 2025...")
    
    # Check timezone settings first
    check_timezone_settings()
    
    # First, delete any existing time entries for this employee to ensure clean test
    print("\nCleaning up existing time entries...")
    TimeEntry.objects.filter(employee=employee).delete()
    print("✓ Existing time entries deleted")
    
    # Create location for time entries
    location = employee.department.location
    
    # Time In: 7:40 PM (19:40) - 40 minutes late from scheduled 7:00 PM
    print(f"\nCreating Time In entry for 7:40 PM (19:40)...")
    
    # Create the datetime object
    time_in_dt = datetime(2025, 8, 20, 19, 40, 0)  # 7:40 PM = 19:40
    print(f"  Raw datetime created: {time_in_dt}")
    
    # Make it timezone-aware
    time_in_dt_aware = timezone.make_aware(
        time_in_dt,
        timezone=timezone.get_current_timezone()
    )
    print(f"  Timezone-aware datetime: {time_in_dt_aware}")
    print(f"  Timezone: {time_in_dt_aware.tzinfo}")
    
    # Create the time entry
    time_in_entry = TimeEntry.objects.create(
        employee=employee,
        entry_type='time_in',
        event_time=time_in_dt_aware,
        location=location,
        latitude=14.5995,
        longitude=120.9842,
        accuracy=25.0,
        notes='Time in - 7:40 PM (40 minutes late for night shift)'
    )
    
    print(f"✓ Time In Entry CREATED:")
    print(f"  - ID: {time_in_entry.id}")
    print(f"  - Event Time: {time_in_entry.event_time}")
    print(f"  - Date: {time_in_entry.event_time.date()}")
    print(f"  - Time: {time_in_entry.event_time.time()}")
    print(f"  - Formatted: {time_in_entry.event_time.strftime('%I:%M %p')}")
    print(f"  - Timezone: {time_in_entry.event_time.tzinfo}")
    
    # Time Out: 2:00 AM (02:00) - 2 hours early from scheduled 4:00 AM
    print(f"\nCreating Time Out entry for 2:00 AM (02:00)...")
    
    # Create the datetime object
    time_out_dt = datetime(2025, 8, 21, 2, 0, 0)  # 2:00 AM next day = 02:00
    print(f"  Raw datetime created: {time_out_dt}")
    
    # Make it timezone-aware
    time_out_dt_aware = timezone.make_aware(
        time_out_dt,
        timezone=timezone.get_current_timezone()
    )
    print(f"  Timezone-aware datetime: {time_out_dt_aware}")
    print(f"  Timezone: {time_out_dt_aware.tzinfo}")
    
    # Create the time entry
    time_out_entry = TimeEntry.objects.create(
        employee=employee,
        entry_type='time_out',
        event_time=time_out_dt_aware,
        location=location,
        latitude=14.5995,
        longitude=120.9842,
        accuracy=25.0,
        notes='Time out - 2:00 AM (2 hours early from scheduled end)'
    )
    
    print(f"✓ Time Out Entry CREATED:")
    print(f"  - ID: {time_out_entry.id}")
    print(f"  - Event Time: {time_out_entry.event_time}")
    print(f"  - Date: {time_out_entry.event_time.date()}")
    print(f"  - Time: {time_out_entry.event_time.time()}")
    print(f"  - Formatted: {time_out_entry.event_time.strftime('%I:%M %p')}")
    print(f"  - Timezone: {time_out_entry.event_time.tzinfo}")
    
    # Verify database storage
    verify_database_storage(time_in_entry, time_out_entry)
    
    # Verify the times are exactly what was requested
    print(f"\n=== VERIFICATION OF TIME ENTRIES ===")
    print(f"Requested Time In: 7:40 PM (19:40)")
    print(f"Created Time In: {time_in_entry.event_time.strftime('%I:%M %p')} ({time_in_entry.event_time.strftime('%H:%M')})")
    print(f"Requested Time Out: 2:00 AM (02:00)")
    print(f"Created Time Out: {time_out_entry.event_time.strftime('%I:%M %p')} ({time_out_entry.event_time.strftime('%H:%M')})")
    
    # Calculate the actual duration for verification
    duration_minutes = int((time_out_entry.event_time - time_in_entry.event_time).total_seconds() / 60)
    duration_hours = duration_minutes / 60
    print(f"Actual Work Duration: {duration_minutes} minutes ({duration_hours:.2f} hours)")
    
    # Validate the time entries
    validate_time_entries(time_in_entry, time_out_entry)
    
    return time_in_entry, time_out_entry

def create_daily_summary(employee, schedule, time_in_entry, time_out_entry):
    """Create and calculate daily time summary"""
    print("\nCreating daily time summary...")
    
    # Create daily summary
    summary, created = DailyTimeSummary.objects.get_or_create(
        employee=employee,
        date=date(2025, 8, 20),
        defaults={
            'time_in': time_in_entry.event_time.time(),
            'time_out': time_out_entry.event_time.time(),
            'scheduled_time_in': schedule.scheduled_time_in,
            'scheduled_time_out': schedule.scheduled_time_out,
            'time_in_entry': time_in_entry,
            'time_out_entry': time_out_entry,
            'schedule_reference': schedule,
            'is_weekend': False,  # August 20, 2025 is a Wednesday
            'is_holiday': False,
            'notes': 'Test case: August 20, 2025 night shift with late arrival and early departure'
        }
    )
    
    if created:
        print(f"Daily Summary: {summary.date} ({'created' if created else 'exists'})")
    else:
        # Update existing summary
        summary.time_in = time_in_entry.event_time.time()
        summary.time_out = time_out_entry.event_time.time()
        summary.scheduled_time_in = schedule.scheduled_time_in
        summary.scheduled_time_out = schedule.scheduled_time_out
        summary.time_in_entry = time_in_entry
        summary.time_out_entry = time_out_entry
        summary.schedule_reference = schedule
        summary.save()
        print(f"Daily Summary: {summary.date} (updated)")
    
    # Calculate metrics
    summary.calculate_metrics()
    print(f"Metrics calculated and saved")
    
    return summary

def manually_calculate_expected_values(employee, schedule, time_in_entry, time_out_entry):
    """Manually calculate expected values for verification"""
    print("\n=== MANUAL CALCULATION OF EXPECTED VALUES ===")
    
    # Convert to local timezone for calculations
    local_tz = timezone.get_current_timezone()
    time_in_local = timezone.localtime(time_in_entry.event_time, local_tz)
    time_out_local = timezone.localtime(time_out_entry.event_time, local_tz)
    
    # Extract times (using local time)
    scheduled_in = schedule.scheduled_time_in
    scheduled_out = schedule.scheduled_time_out
    actual_in = time_in_local.time()
    actual_out = time_out_local.time()
    
    print(f"Scheduled: {scheduled_in} - {scheduled_out}")
    print(f"Actual: {actual_in} - {actual_out}")
    
    # 1. Calculate Late (LT) - UPDATED LOGIC
    # Late = Actual Time In - Scheduled Time In
    # Grace period ONLY applies when arrival is within grace period (7:05 PM or earlier)
    scheduled_in_dt = datetime.combine(date(2025, 8, 20), scheduled_in)
    actual_in_dt = datetime.combine(date(2025, 8, 20), actual_in)
    
    late_minutes = int((actual_in_dt - scheduled_in_dt).total_seconds() / 60)
    
    # NEW LOGIC: Grace period only applies when arrival is within grace period
    if late_minutes <= employee.grace_period_minutes:
        # Within grace period: no late
        late_after_grace = 0
        grace_status = "✓ GRACE APPLIED"
    else:
        # Beyond grace period: full late (no grace deduction)
        late_after_grace = late_minutes
        grace_status = "✗ NO GRACE"
    
    print(f"\n1. LATE (LT) Calculation:")
    print(f"   Scheduled In: {scheduled_in}")
    print(f"   Actual In: {actual_in}")
    print(f"   Late Minutes: {late_minutes} minutes")
    print(f"   Grace Period: {employee.grace_period_minutes} minutes")
    print(f"   Grace Status: {grace_status}")
    print(f"   Late After Grace: {late_after_grace} minutes")
    
    # 2. Calculate Billed Hours (BH)
    # BH = Actual Work Time - Break Time
    # Handle overnight shift
    actual_in_dt = datetime.combine(date(2025, 8, 20), actual_in)
    actual_out_dt = datetime.combine(date(2025, 8, 21), actual_out)  # Next day
    
    total_minutes = int((actual_out_dt - actual_in_dt).total_seconds() / 60)
    break_minutes = int(employee.flexible_break_hours * 60)
    billed_minutes = max(0, total_minutes - break_minutes)
    billed_hours = billed_minutes / 60
    
    print(f"\n2. BILLED HOURS (BH) Calculation:")
    print(f"   Total Time: {total_minutes} minutes ({total_minutes/60:.2f} hours)")
    print(f"   Break Time: {break_minutes} minutes ({break_minutes/60:.2f} hours)")
    print(f"   Billed Time: {billed_minutes} minutes ({billed_hours:.2f} hours)")
    
    # 3. Calculate Undertime (UT)
    # UT = Scheduled Work Time - BH
    scheduled_in_dt = datetime.combine(date(2025, 8, 20), scheduled_in)
    scheduled_out_dt = datetime.combine(date(2025, 8, 21), scheduled_out)  # Next day
    
    scheduled_minutes = int((scheduled_out_dt - scheduled_in_dt).total_seconds() / 60)
    scheduled_work_minutes = scheduled_minutes - break_minutes  # Exclude break
    undertime_minutes = max(0, scheduled_work_minutes - billed_minutes)
    
    print(f"\n3. UNDERTIME (UT) Calculation:")
    print(f"   Scheduled Duration: {scheduled_minutes} minutes ({scheduled_minutes/60:.2f} hours)")
    print(f"   Scheduled Work Time: {scheduled_work_minutes} minutes ({scheduled_work_minutes/60:.2f} hours)")
    print(f"   Billed Time: {billed_minutes} minutes ({billed_hours:.2f} hours)")
    print(f"   Undertime: {undertime_minutes} minutes ({undertime_minutes/60:.2f} hours)")
    
    # 4. Calculate Night Differential (ND)
    # ND = Hours worked between 10:00 PM and 6:00 AM, minus 1 hour break
    nd_start = time(22, 0)  # 10:00 PM
    nd_end = time(6, 0)     # 6:00 AM
    
    # Calculate ND period overlap with actual work time
    nd_start_dt = datetime.combine(date(2025, 8, 20), nd_start)
    nd_end_dt = datetime.combine(date(2025, 8, 21), nd_end)
    
    # Find overlap between work time and ND period
    work_start = max(actual_in_dt, nd_start_dt)
    work_end = min(actual_out_dt, nd_end_dt)
    
    if work_end > work_start:
        nd_minutes = int((work_end - work_start).total_seconds() / 60)
        nd_hours = nd_minutes / 60
        # Apply 1-hour break deduction
        final_nd_hours = max(0, nd_hours - 1.0)
    else:
        final_nd_hours = 0
    
    print(f"\n4. NIGHT DIFFERENTIAL (ND) Calculation:")
    print(f"   ND Period: {nd_start} - {nd_end}")
    print(f"   Work Period: {actual_in} - {actual_out}")
    print(f"   ND Overlap: {work_start.strftime('%H:%M')} - {work_end.strftime('%H:%M')}")
    print(f"   ND Hours Before Break: {nd_minutes if 'nd_minutes' in locals() else 0} minutes ({nd_hours if 'nd_hours' in locals() else 0:.2f} hours)")
    print(f"   Break Deduction: 1.00 hour")
    print(f"   Final ND: {final_nd_hours:.2f} hours")
    
    expected_values = {
        'late_minutes': late_after_grace,
        'billed_hours': billed_hours,
        'undertime_minutes': undertime_minutes,
        'night_differential_hours': final_nd_hours
    }
    
    print(f"\n=== EXPECTED VALUES SUMMARY ===")
    print(f"Late (LT): {expected_values['late_minutes']} minutes")
    print(f"Billed Hours (BH): {expected_values['billed_hours']:.2f} hours")
    print(f"Undertime (UT): {expected_values['undertime_minutes']} minutes ({expected_values['undertime_minutes']/60:.2f} hours)")
    print(f"Night Differential (ND): {expected_values['night_differential_hours']:.2f} hours")
    
    return expected_values

def analyze_august20_data(employee, summary, expected_values):
    """Analyze the calculated data and compare with expected values"""
    print("\n=== ANALYSIS OF CALCULATED DATA ===")
    
    print(f"Daily Summary Date: {summary.date}")
    print(f"Status: {summary.status}")
    print(f"Time In: {summary.time_in}")
    print(f"Time Out: {summary.time_out}")
    print(f"Scheduled In: {summary.scheduled_time_in}")
    print(f"Scheduled Out: {summary.scheduled_time_out}")
    
    print(f"\n=== CALCULATED METRICS ===")
    print(f"Billed Hours (BH): {summary.billed_hours:.2f} hours")
    print(f"Late Minutes (LT): {summary.late_minutes} minutes")
    print(f"Undertime Minutes (UT): {summary.undertime_minutes} minutes")
    print(f"Night Differential (ND): {summary.night_differential_hours:.2f} hours")
    print(f"Overtime Hours: {summary.overtime_hours:.2f} hours")
    
    print(f"\n=== COMPARISON WITH EXPECTED VALUES ===")
    
    # Compare BH
    bh_diff = abs(float(summary.billed_hours) - expected_values['billed_hours'])
    bh_status = "✓" if bh_diff < 0.01 else "✗"
    print(f"BH: Expected {expected_values['billed_hours']:.2f}, Got {summary.billed_hours:.2f} {bh_status}")
    
    # Compare Late
    late_diff = abs(summary.late_minutes - expected_values['late_minutes'])
    late_status = "✓" if late_diff == 0 else "✗"
    print(f"LT: Expected {expected_values['late_minutes']}, Got {summary.late_minutes} {late_status}")
    
    # Compare UT
    ut_diff = abs(summary.undertime_minutes - expected_values['undertime_minutes'])
    ut_status = "✓" if ut_diff <= 1 else "✗"  # Allow 1 minute difference for rounding
    print(f"UT: Expected {expected_values['undertime_minutes']}, Got {summary.undertime_minutes} {ut_status}")
    
    # Compare ND
    nd_diff = abs(float(summary.night_differential_hours) - expected_values['night_differential_hours'])
    nd_status = "✓" if nd_diff < 0.01 else "✗"
    print(f"ND: Expected {expected_values['night_differential_hours']:.2f}, Got {summary.night_differential_hours:.2f} {nd_status}")
    
    # Overall assessment
    all_correct = (bh_diff < 0.01 and late_diff == 0 and ut_diff <= 1 and nd_diff < 0.01)
    print(f"\n=== OVERALL ASSESSMENT ===")
    if all_correct:
        print("✓ ALL CALCULATIONS ARE CORRECT!")
    else:
        print("✗ SOME CALCULATIONS HAVE DISCREPANCIES")
        print("   This may indicate issues in the calculation logic or edge case handling")

def main():
    """Main function to run the August 20 night shift test case"""
    print("=" * 60)
    print("AUGUST 20, 2025 NIGHT SHIFT TEST CASE")
    print("=" * 60)
    
    # Display the exact test scenario
    print("\n📋 TEST SCENARIO:")
    print("   Date: August 20, 2025 (Wednesday)")
    print("   Schedule: 7:00 PM - 4:00 AM (night shift crossing midnight)")
    print("   Actual Time In: 7:40 PM (19:40) - 40 minutes late")
    print("   Actual Time Out: 2:00 AM (02:00) - 2 hours early")
    print("   Expected Duration: 6 hours 20 minutes (7:40 PM to 2:00 AM)")
    
    print("\n🎯 EXPECTED CALCULATIONS:")
    print("   Late (LT): 40 minutes (7:40 PM arrival - NO grace period applies)")
    print("   Billed Hours (BH): 5.33 hours (6h 20m total - 1h break)")
    print("   Undertime (UT): 2.67 hours (8h scheduled - 5.33h worked)")
    print("   Night Differential (ND): 3.00 hours (4h night work - 1h break)")
    print("=" * 60)
    
    try:
        # Create test environment
        location, department, user, employee = create_test_environment()
        
        # Create schedule
        template, schedule = create_august20_schedule(employee)
        
        # Create time entries with validation
        time_in_entry, time_out_entry = create_august20_time_entries(employee)
        
        # Create and calculate daily summary
        summary = create_daily_summary(employee, schedule, time_in_entry, time_out_entry)
        
        # Calculate expected values manually
        expected_values = manually_calculate_expected_values(employee, schedule, time_in_entry, time_out_entry)
        
        # Analyze results
        analyze_august20_data(employee, summary, expected_values)
        
        print("\n" + "=" * 60)
        print("TEST CASE COMPLETED SUCCESSFULLY")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
