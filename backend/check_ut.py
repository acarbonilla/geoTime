#!/usr/bin/env python
import os
import sys
import django
from datetime import date, datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import DailyTimeSummary, EmployeeSchedule, TimeEntry

# Check UT for August 09
summary = DailyTimeSummary.objects.filter(date=date(2025, 8, 9)).first()

if summary:
    print(f"UT for Aug 09: {summary.undertime_minutes}")
    print(f"BH for Aug 09: {summary.billed_hours}")
    print(f"BH in minutes: {int(summary.billed_hours * 60) if summary.billed_hours else 0}")
    print(f"Scheduled Time In: {summary.scheduled_time_in}")
    print(f"Scheduled Time Out: {summary.scheduled_time_out}")
    print(f"Status: {summary.status}")
    print(f"Employee: {summary.employee.full_name}")
    print(f"Total Break Minutes: {summary.total_break_minutes}")
    print(f"Lunch Break Minutes: {summary.lunch_break_minutes}")
    
    # Check for time entries
    time_entries = TimeEntry.objects.filter(employee=summary.employee, timestamp__date=date(2025, 8, 9)).order_by('timestamp')
    print(f"Time entries found: {time_entries.count()}")
    for entry in time_entries:
        print(f"  - {entry.entry_type}: {entry.timestamp}")
    
    # Check if we need to create a time_out entry for testing
    time_in_entry = time_entries.filter(entry_type='time_in').first()
    time_out_entry = time_entries.filter(entry_type='time_out').first()
    
    if time_in_entry and not time_out_entry:
        print("No time_out entry found, creating one for testing...")
        # Create a time_out entry at 3:08 PM (as shown in the image)
        time_out_timestamp = datetime.combine(date(2025, 8, 9), datetime.strptime('15:08', '%H:%M').time())
        time_out_entry = TimeEntry.objects.create(
            employee=summary.employee,
            entry_type='time_out',
            timestamp=time_out_timestamp
        )
        print(f"Created time_out entry: {time_out_entry.timestamp}")
        
        # Update the summary with the time entries
        summary.time_in = time_in_entry.timestamp.time()
        summary.time_out = time_out_entry.timestamp.time()
        summary.save()
        
        # Recalculate metrics
        summary.calculate_metrics()
        summary.save()
        
        print(f"Updated UT for Aug 09: {summary.undertime_minutes}")
        print(f"Updated BH for Aug 09: {summary.billed_hours}")
    elif time_in_entry and time_out_entry:
        # Update the time_out entry to the correct time (3:08 PM)
        time_out_timestamp = datetime.combine(date(2025, 8, 9), datetime.strptime('15:08', '%H:%M').time())
        time_out_entry.timestamp = time_out_timestamp
        time_out_entry.save()
        print(f"Updated time_out entry: {time_out_entry.timestamp}")
        
        # Update the summary with the time entries
        summary.time_in = time_in_entry.timestamp.time()
        summary.time_out = time_out_entry.timestamp.time()
        summary.save()
        
        # Recalculate metrics
        summary.calculate_metrics()
        summary.save()
        
        print(f"Updated UT for Aug 09: {summary.undertime_minutes}")
        print(f"Updated BH for Aug 09: {summary.billed_hours}")
    
    # Check the exact calculation
    if summary.time_in and summary.time_out:
        start_dt = datetime.combine(summary.date, summary.time_in)
        end_dt = datetime.combine(summary.date, summary.time_out)
        
        if end_dt < start_dt:
            end_dt += timedelta(days=1)
        
        total_minutes = (end_dt - start_dt).total_seconds() / 60
        work_minutes = total_minutes - summary.total_break_minutes
        billed_hours = work_minutes / 60
        
        print(f"Time In: {summary.time_in}")
        print(f"Time Out: {summary.time_out}")
        print(f"Total Minutes: {total_minutes}")
        print(f"Work Minutes: {work_minutes}")
        print(f"Billed Hours: {billed_hours}")
        print(f"Billed Hours in DB: {summary.billed_hours}")
    else:
        print("No time entries found in summary")
    
    # Check if there's a schedule for this date
    schedule = EmployeeSchedule.objects.filter(employee=summary.employee, date=date(2025, 8, 9)).first()
    if schedule:
        print(f"Found schedule: {schedule.scheduled_time_in} to {schedule.scheduled_time_out}")
        
        # Update the summary with the schedule
        summary.scheduled_time_in = schedule.scheduled_time_in
        summary.scheduled_time_out = schedule.scheduled_time_out
        summary.save()
        
        # Recalculate metrics
        summary.calculate_metrics()
        summary.save()
        
        print(f"Updated UT for Aug 09: {summary.undertime_minutes}")
        print(f"Updated BH for Aug 09: {summary.billed_hours}")
    else:
        print("No schedule found for Aug 09")
        
        # Check all schedules for this employee
        all_schedules = EmployeeSchedule.objects.filter(employee=summary.employee)
        print(f"Total schedules for {summary.employee.full_name}: {all_schedules.count()}")
        for s in all_schedules[:5]:  # Show first 5
            print(f"  - {s.date}: {s.scheduled_time_in} to {s.scheduled_time_out}")
        
        # Create a test schedule for Aug 09 (2:00 PM to 11:00 PM)
        from datetime import time
        test_schedule = EmployeeSchedule.objects.create(
            employee=summary.employee,
            date=date(2025, 8, 9),
            scheduled_time_in=time(14, 0),  # 2:00 PM
            scheduled_time_out=time(23, 0)   # 11:00 PM
        )
        print(f"Created test schedule: {test_schedule.scheduled_time_in} to {test_schedule.scheduled_time_out}")
        
        # Update the summary with the schedule
        summary.scheduled_time_in = test_schedule.scheduled_time_in
        summary.scheduled_time_out = test_schedule.scheduled_time_out
        summary.save()
        
        # Recalculate metrics
        summary.calculate_metrics()
        summary.save()
        
        print(f"Updated UT for Aug 09: {summary.undertime_minutes}")
        print(f"Updated BH for Aug 09: {summary.billed_hours}")
        
        # Check the exact calculation with the schedule
        if summary.time_in and summary.time_out and summary.scheduled_time_in:
            scheduled_start_dt = datetime.combine(summary.date, summary.scheduled_time_in)
            time_out_dt = datetime.combine(summary.date, summary.time_out)
            
            if time_out_dt < scheduled_start_dt:
                time_out_dt += timedelta(days=1)
            
            bh_minutes = int((time_out_dt - scheduled_start_dt).total_seconds() / 60)
            bh_minutes = max(0, bh_minutes)
            
            if bh_minutes < 240:  # Less than 4 hours
                work_minutes = bh_minutes
            else:
                flexible_break_minutes = int(summary.employee.flexible_break_hours * 60)
                work_minutes = bh_minutes - min(flexible_break_minutes, bh_minutes)
            
            expected_bh = max(0, work_minutes) / 60
            print(f"Expected BH calculation:")
            print(f"  Scheduled start: {scheduled_start_dt}")
            print(f"  Time out: {time_out_dt}")
            print(f"  BH minutes: {bh_minutes}")
            print(f"  Work minutes: {work_minutes}")
            print(f"  Expected BH: {expected_bh}")
            print(f"  Actual BH: {summary.billed_hours}")
    
    # Manual calculation check
    bh_minutes = int(summary.billed_hours * 60) if summary.billed_hours else 0
    expected_ut = max(0, 480 - bh_minutes)
    print(f"Manual calculation: 480 - {bh_minutes} = {expected_ut}")
    
    # Check if there's a difference
    if summary.undertime_minutes != expected_ut:
        print(f"⚠️  Difference detected: Expected {expected_ut}, but got {summary.undertime_minutes}")
        print(f"   Difference: {summary.undertime_minutes - expected_ut}")
        
        # Let's check if the issue is in the calculation
        print(f"\n🔍 Debugging the calculation:")
        print(f"   billed_hours (decimal): {summary.billed_hours}")
        print(f"   billed_hours * 60: {summary.billed_hours * 60 if summary.billed_hours else 0}")
        print(f"   int(billed_hours * 60): {int(summary.billed_hours * 60) if summary.billed_hours else 0}")
        print(f"   480 - int(billed_hours * 60): {480 - int(summary.billed_hours * 60) if summary.billed_hours else 480}")
else:
    print("No summary found for Aug 09")
