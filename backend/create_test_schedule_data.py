#!/usr/bin/env python
"""
Create test schedule data for debugging the schedule display issue.
This will populate the database with sample schedules and time entries.
"""
import os
import sys
import django
from datetime import datetime, date, time, timedelta
from django.utils import timezone

# Set environment to development
os.environ['ENVIRONMENT'] = 'development'

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Setup Django
django.setup()

from geo.models import Employee, EmployeeSchedule, TimeEntry, DailyTimeSummary

def create_test_schedule_data():
    """Create test schedule data for the current month"""
    try:
        print("=== CREATING TEST SCHEDULE DATA ===\n")
        
        # Get an employee
        employee = Employee.objects.first()
        if not employee:
            print("No employees found in database")
            return
        
        print(f"Creating data for employee: {employee.full_name} ({employee.employee_id})")
        
        # Set dates for current month
        today = date.today()
        start_date = date(today.year, today.month, 1)
        end_date = date(today.year, today.month, 28)
        
        print(f"Creating data for period: {start_date} to {end_date}")
        
        # Create schedules for weekdays (Monday = 0, Sunday = 6)
        schedules_created = 0
        current_date = start_date
        
        while current_date <= end_date:
            # Only create schedules for weekdays (Monday to Friday)
            if current_date.weekday() < 5:  # 0-4 = Monday to Friday
                # Create a schedule from 8:00 AM to 5:00 PM
                schedule, created = EmployeeSchedule.objects.get_or_create(
                    employee=employee,
                    date=current_date,
                    defaults={
                        'scheduled_in': time(8, 0),  # 8:00 AM
                        'scheduled_out': time(17, 0),  # 5:00 PM
                        'is_active': True
                    }
                )
                if created:
                    schedules_created += 1
                    print(f"  Created schedule for {current_date}: 8:00 AM - 5:00 PM")
            
            current_date += timedelta(days=1)
        
        print(f"\nCreated {schedules_created} schedules")
        
        # Create some time entries for the last few days
        time_entries_created = 0
        for i in range(5):  # Last 5 weekdays
            entry_date = today - timedelta(days=i+1)
            if entry_date.weekday() < 5:  # Weekday only
                # Time in at 8:05 AM (5 minutes late)
                time_in_entry, created = TimeEntry.objects.get_or_create(
                    employee=employee,
                    timestamp=datetime.combine(entry_date, time(8, 5)),
                    entry_type='time_in',
                    defaults={
                        'location': employee.department.location if employee.department else None,
                        'accuracy_meters': 10,
                        'latitude': 10.33301000,
                        'longitude': 123.94760000
                    }
                )
                if created:
                    time_entries_created += 1
                
                # Time out at 5:00 PM
                time_out_entry, created = TimeEntry.objects.get_or_create(
                    employee=employee,
                    timestamp=datetime.combine(entry_date, time(17, 0)),
                    entry_type='time_out',
                    defaults={
                        'location': employee.department.location if employee.department else None,
                        'accuracy_meters': 10,
                        'latitude': 10.33301000,
                        'longitude': 123.94760000
                    }
                )
                if created:
                    time_entries_created += 1
                
                print(f"  Created time entries for {entry_date}: 8:05 AM - 5:00 PM")
        
        print(f"\nCreated {time_entries_created} time entries")
        
        # Generate daily summaries for the period
        print("\nGenerating daily summaries...")
        from geo.utils import generate_daily_summaries_for_period
        summaries = generate_daily_summaries_for_period(start_date, end_date, employee)
        print(f"Generated {len(summaries)} daily summaries")
        
        print("\n=== TEST DATA CREATION COMPLETE ===")
        print("Now you can test the schedule display locally!")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_test_schedule_data()
