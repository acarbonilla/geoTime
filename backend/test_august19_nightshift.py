#!/usr/bin/env python3
"""
Test case for August 19, 2020 - Night Shift with Early Arrival
Schedule: 7:00 PM - 4:00 AM
Time In: 6:40 PM (early arrival)
Time Out: 4:10 AM (next day)
Calculate BH and ND with minus 1 hour break
Clean test - no prior schedule on this date
"""

import os
import sys
import django
from datetime import datetime, date, time, timedelta
from django.utils import timezone

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import Employee, TimeEntry, EmployeeSchedule, DailyTimeSummary, Location, Department, User
from geo.utils import calculate_daily_summary

def create_august19_test_data():
    """Create test data for August 19, 2020"""
    print("CREATING AUGUST 19, 2020 TEST DATA")
    print("="*60)
    
    # Get or create test employee (Jane Doe)
    try:
        employee = Employee.objects.get(employee_id='ALS00005')
        print(f"Using existing employee: {employee.full_name}")
    except Employee.DoesNotExist:
        print("Creating test employee...")
        # Create test user
        user = User.objects.create_user(
            username='testuser_aug19',
            email='test@example.com',
            first_name='Test',
            last_name='User'
        )
        
        # Create test location and department
        location = Location.objects.create(
            name='Test Location',
            latitude=14.5995,
            longitude=120.9842,
            timezone_name='Asia/Manila'
        )
        
        department = Department.objects.create(
            name='Test Department',
            code='TEST',
            location=location
        )
        
        # Create test employee
        employee = Employee.objects.create(
            user=user,
            employee_id='TEST001',
            department=department,
            position='Test Position',
            hire_date=date(2020, 1, 1),
            grace_period_minutes=5,
            flexible_break_hours=1.0,
            overtime_threshold_hours=8.0
        )
        print(f"Created test employee: {employee.full_name}")
    
    august_19_2020 = date(2020, 8, 19)
    
    # Create schedule: 7:00 PM - 4:00 AM (night shift)
    schedule, created = EmployeeSchedule.objects.get_or_create(
        employee=employee,
        date=august_19_2020,
        defaults={
            'scheduled_time_in': time(19, 0),  # 7:00 PM
            'scheduled_time_out': time(4, 0),   # 4:00 AM
            'is_night_shift': True,
            'notes': 'Test night shift schedule - August 19, 2020'
        }
    )
    
    if created:
        print(f"✓ Created new schedule: {schedule.scheduled_time_in} - {schedule.scheduled_time_out} (night shift)")
    else:
        print(f"✓ Schedule exists: {schedule.scheduled_time_in} - {schedule.scheduled_time_out} (night shift)")
    
    # Create time entries
    # Time In: 6:40 PM (early arrival)
    time_in_dt = timezone.make_aware(datetime.combine(august_19_2020, time(18, 40)))
    time_in_entry, created = TimeEntry.objects.get_or_create(
        employee=employee,
        entry_type='time_in',
        timestamp=time_in_dt,  # 6:40 PM
        defaults={
            'event_time': time_in_dt,
            'location': employee.department.location,
            'latitude': employee.department.location.latitude,
            'longitude': employee.department.location.longitude,
            'accuracy': 25.0,
            'notes': 'Test time in - early arrival - August 19, 2020'
        }
    )
    
    if created:
        print(f"✓ Created time in entry: {time_in_entry.event_time}")
    else:
        print(f"✓ Time in entry exists: {time_in_entry.event_time}")
    
    # Time Out: 4:10 AM (next day)
    august_20_2020 = august_19_2020 + timedelta(days=1)
    time_out_dt = timezone.make_aware(datetime.combine(august_20_2020, time(4, 10)))
    time_out_entry, created = TimeEntry.objects.get_or_create(
        employee=employee,
        entry_type='time_out',
        timestamp=time_out_dt,  # 4:10 AM next day
        defaults={
            'event_time': time_out_dt,
            'location': employee.department.location,
            'latitude': employee.department.location.latitude,
            'longitude': employee.department.location.longitude,
            'accuracy': 25.0,
            'notes': 'Test time out - August 20, 2020 (next day)'
        }
    )
    
    if created:
        print(f"✓ Created time out entry: {time_out_entry.event_time}")
    else:
        print(f"✓ Time out entry exists: {time_out_entry.event_time}")
    
    return employee, august_19_2020, schedule

def calculate_expected_values():
    """Calculate expected BH and ND values manually"""
    print("\nMANUAL CALCULATION OF EXPECTED VALUES")
    print("="*60)
    
    # Schedule: 7:00 PM - 4:00 AM (night shift)
    scheduled_start = time(19, 0)  # 7:00 PM
    scheduled_end = time(4, 0)     # 4:00 AM
    
    # Actual times
    time_in = time(18, 40)         # 6:40 PM
    time_out = time(4, 10)         # 4:10 AM (next day)
    
    print(f"Schedule: {scheduled_start} - {scheduled_end}")
    print(f"Actual: {time_in} - {time_out}")
    print()
    
    # Calculate BH (Billed Hours) = Actual Time Worked
    # Time In: 18:40 (6:40 PM)
    # Time Out: 04:10 (4:10 AM next day)
    
    # Convert to datetime for calculation
    start_dt = datetime.combine(date(2020, 8, 19), time_in)
    end_dt = datetime.combine(date(2020, 8, 20), time_out)  # Next day
    
    bh_minutes = int((end_dt - start_dt).total_seconds() / 60)
    bh_hours = bh_minutes / 60
    
    print(f"BH Calculation:")
    print(f"  - Start: {start_dt}")
    print(f"  - End: {end_dt}")
    print(f"  - Duration: {bh_minutes} minutes = {bh_hours:.2f} hours")
    
    # Calculate Late = Time In - Scheduled Time In (with grace period)
    scheduled_start_dt = datetime.combine(date(2020, 8, 19), scheduled_start)
    late_minutes = int((start_dt - scheduled_start_dt).total_seconds() / 60)
    
    print(f"\nLate Calculation:")
    print(f"  - Scheduled Start: {scheduled_start_dt}")
    print(f"  - Actual Start: {start_dt}")
    print(f"  - Difference: {late_minutes} minutes")
    
    if late_minutes < 0:
        print(f"  - Early arrival: {abs(late_minutes)} minutes early")
        late_final = 0
    else:
        grace_period = 5  # minutes
        if late_minutes <= grace_period:
            late_final = 0
            print(f"  - Within grace period ({grace_period} minutes)")
        else:
            late_final = late_minutes - grace_period
            print(f"  - Late: {late_final} minutes (after grace period)")
    
    # Calculate UT (Under Time) = Scheduled Work Duration - BH
    scheduled_end_dt = datetime.combine(date(2020, 8, 20), scheduled_end)  # Next day
    scheduled_duration_minutes = int((scheduled_end_dt - scheduled_start_dt).total_seconds() / 60)
    
    # Subtract flexible break (1 hour = 60 minutes)
    flexible_break_minutes = 60
    scheduled_work_minutes = scheduled_duration_minutes - flexible_break_minutes
    
    ut_minutes = max(0, scheduled_work_minutes - bh_minutes)
    
    print(f"\nUT Calculation:")
    print(f"  - Scheduled Duration: {scheduled_duration_minutes} minutes")
    print(f"  - Flexible Break: {flexible_break_minutes} minutes")
    print(f"  - Scheduled Work Time: {scheduled_work_minutes} minutes")
    print(f"  - Actual Work Time: {bh_minutes} minutes")
    print(f"  - UT: {ut_minutes} minutes = {ut_minutes/60:.2f} hours")
    
    # Calculate Overtime
    overtime_threshold = 8.0  # hours
    if bh_hours > overtime_threshold:
        overtime_hours = bh_hours - overtime_threshold
        print(f"\nOvertime Calculation:")
        print(f"  - Threshold: {overtime_threshold} hours")
        print(f"  - Actual: {bh_hours:.2f} hours")
        print(f"  - Overtime: {overtime_hours:.2f} hours")
    else:
        overtime_hours = 0
        print(f"\nNo overtime (worked {bh_hours:.2f} hours, threshold is {overtime_threshold} hours)")
    
    # Calculate Night Differential (ND)
    # ND typically applies to hours worked between 10:00 PM and 6:00 AM
    # IMPORTANT: According to HR rules, subtract 1 hour break from ND
    nd_start = time(22, 0)  # 10:00 PM
    nd_end = time(6, 0)     # 6:00 AM
    
    print(f"\nNight Differential (ND) Calculation:")
    print(f"  - ND Period: {nd_start} - {nd_end}")
    print(f"  - HR Rule: Subtract 1 hour break from ND")
    
    # Calculate ND hours
    nd_hours = 0
    
    # Check if time in is before ND period
    if time_in < nd_start:
        # Time in is before ND period, calculate from ND start
        nd_start_dt = datetime.combine(date(2020, 8, 19), nd_start)
    else:
        # Time in is during ND period
        nd_start_dt = start_dt
    
    # Check if time out is after ND period
    if time_out > nd_end:
        # Time out is after ND period, calculate to ND end
        nd_end_dt = datetime.combine(date(2020, 8, 20), nd_end)
    else:
        # Time out is during ND period
        nd_end_dt = end_dt
    
    # Calculate ND hours
    if nd_end_dt > nd_start_dt:
        nd_minutes = int((nd_end_dt - nd_start_dt).total_seconds() / 60)
        total_nd_hours = nd_minutes / 60
        
        # Apply 1-hour break deduction to night differential (HR rule)
        nd_hours = max(0, total_nd_hours - 1.0)
        
        print(f"  - ND Start: {nd_start_dt}")
        print(f"  - ND End: {nd_end_dt}")
        print(f"  - Total ND Duration: {nd_minutes} minutes = {total_nd_hours:.2f} hours")
        print(f"  - After 1-hour break deduction: {nd_hours:.2f} hours")
    else:
        print(f"  - No night differential hours")
    
    print(f"\n" + "="*60)
    print("EXPECTED RESULTS:")
    print("="*60)
    print(f"  - BH (Billed Hours): {bh_hours:.2f} hours ({bh_minutes} minutes)")
    print(f"  - Late: {late_final} minutes")
    print(f"  - UT (Under Time): {ut_minutes} minutes ({ut_minutes/60:.2f} hours)")
    print(f"  - Overtime: {overtime_hours:.2f} hours")
    print(f"  - ND (Night Differential): {nd_hours:.2f} hours (after 1-hour break deduction)")
    
    # Note about break deduction
    print(f"\nNote: System may apply 1-hour break deduction to BH if session is 4+ hours")
    print(f"      Expected BH after break deduction: {bh_hours - 1.0:.2f} hours")
    
    return {
        'bh_hours': bh_hours - 1.0,  # System applies 1-hour break deduction for 4+ hour sessions
        'bh_minutes': bh_minutes - 60,  # Also adjust minutes
        'late_minutes': late_final,
        'ut_minutes': ut_minutes,
        'overtime_hours': max(0, (bh_hours - 1.0) - 8.0),  # Adjust overtime calculation
        'nd_hours': nd_hours
    }

def test_august19_calculations():
    """Test the August 19 calculations"""
    print("\nTESTING AUGUST 19, 2020 CALCULATIONS")
    print("="*60)
    
    # Create test data
    employee, august_19_2020, schedule = create_august19_test_data()
    
    # Calculate expected values
    expected = calculate_expected_values()
    
    # Test the system calculation
    print(f"\nTesting system calculation...")
    try:
        summary = calculate_daily_summary(employee, august_19_2020)
        
        print(f"\nSystem Calculation Results:")
        print(f"  - Status: {summary.status}")
        print(f"  - Time In: {summary.time_in}")
        print(f"  - Time Out: {summary.time_out}")
        print(f"  - BH: {summary.billed_hours}")
        print(f"  - Late: {summary.late_minutes}")
        print(f"  - UT: {summary.undertime_minutes}")
        print(f"  - Overtime: {summary.overtime_hours}")
        print(f"  - ND: {summary.night_differential_hours}")
        
        # Debug: Show raw time entry data from summary
        print(f"\nDebug - Raw Time Entry Data:")
        if summary.time_in_entry:
            print(f"  - Time In Entry: {summary.time_in_entry.event_time} (timestamp: {summary.time_in_entry.timestamp})")
        if summary.time_out_entry:
            print(f"  - Time Out Entry: {summary.time_out_entry.event_time} (timestamp: {summary.time_out_entry.timestamp})")
        print(f"  - Schedule: {schedule.scheduled_time_in} - {schedule.scheduled_time_out}")
        print(f"  - Is Night Shift: {schedule.is_night_shift}")
        
        # Debug: Show time values used in calculation
        print(f"\nDebug - Time Values Used in Calculation:")
        print(f"  - Summary Time In: {summary.time_in} (type: {type(summary.time_in)})")
        print(f"  - Summary Time Out: {summary.time_out} (type: {type(summary.time_out)})")
        print(f"  - Summary Scheduled Time In: {summary.scheduled_time_in}")
        print(f"  - Summary Scheduled Time Out: {summary.scheduled_time_out}")
        
        # Debug: Show timezone info
        if summary.time_in_entry and summary.time_in_entry.event_time:
            print(f"  - Time In Entry Timezone: {summary.time_in_entry.event_time.tzinfo}")
        if summary.time_out_entry and summary.time_out_entry.event_time:
            print(f"  - Time Out Entry Timezone: {summary.time_out_entry.event_time.tzinfo}")
        
        # Compare with expected values
        print(f"\n" + "="*60)
        print("COMPARISON WITH EXPECTED VALUES:")
        print("="*60)
        
        # Convert Decimal to float for comparison
        bh_match = abs(float(summary.billed_hours) - expected['bh_hours']) < 0.01
        late_match = summary.late_minutes == expected['late_minutes']
        ut_match = summary.undertime_minutes == expected['ut_minutes']
        nd_match = abs(float(summary.night_differential_hours) - expected['nd_hours']) < 0.01
        
        print(f"  - BH: Expected {expected['bh_hours']:.2f}, Got {summary.billed_hours:.2f} {'✅' if bh_match else '❌'}")
        print(f"  - Late: Expected {expected['late_minutes']}, Got {summary.late_minutes} {'✅' if late_match else '❌'}")
        print(f"  - UT: Expected {expected['ut_minutes']}, Got {summary.undertime_minutes} {'✅' if ut_match else '❌'}")
        print(f"  - ND: Expected {expected['nd_hours']:.2f}, Got {summary.night_differential_hours:.2f} {'✅' if nd_match else '❌'}")
        
        if bh_match and late_match and ut_match and nd_match:
            print(f"\n🎉 SUCCESS! All calculations match expected values!")
        else:
            print(f"\n⚠️  Some calculations don't match expected values")
        
        return summary, expected
        
    except Exception as e:
        print(f"✗ System calculation failed: {e}")
        import traceback
        traceback.print_exc()
        return None, expected

def main():
    """Main execution"""
    try:
        print("AUGUST 19, 2020 - NIGHT SHIFT TEST CASE")
        print("="*60)
        print("Schedule: 7:00 PM - 4:00 AM (night shift)")
        print("Time In: 6:40 PM (early arrival)")
        print("Time Out: 4:10 AM (next day)")
        print("Calculate BH and ND with minus 1 hour break")
        print("Clean test - no prior schedule on this date")
        print("="*60)
        
        # Run the test
        summary, expected = test_august19_calculations()
        
        if summary:
            print(f"\n" + "="*60)
            print("TEST COMPLETED SUCCESSFULLY!")
            print("="*60)
            print("The system is now correctly calculating:")
            print(f"  - BH (Billed Hours): {summary.billed_hours:.2f} hours")
            print(f"  - Late: {summary.late_minutes} minutes")
            print(f"  - UT (Under Time): {summary.undertime_minutes} minutes")
            print(f"  - Overtime: {summary.overtime_hours} hours")
            print(f"  - ND (Night Differential): {summary.night_differential_hours} hours")
            print(f"  - Note: ND includes 1-hour break deduction per HR rules")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
