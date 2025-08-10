#!/usr/bin/env python
"""
Check what data actually exists in the database for schedules and time entries.
"""
import os
import sys
import django
from datetime import datetime, date
from django.utils import timezone

# Set environment to development
os.environ['ENVIRONMENT'] = 'development'

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Setup Django
django.setup()

from geo.models import Employee, DailyTimeSummary, TimeEntry, EmployeeSchedule

def check_database_data():
    """Check what data exists in the database"""
    try:
        print("=== DATABASE DATA CHECK ===\n")
        
        # Check employees
        employees = Employee.objects.all()
        print(f"Total employees: {employees.count()}")
        
        if employees.exists():
            employee = employees.first()
            print(f"Sample employee: {employee.full_name} ({employee.employee_id})")
            
            # Check DailyTimeSummary records
            summaries = DailyTimeSummary.objects.filter(employee=employee)
            print(f"\nDailyTimeSummary records for {employee.full_name}: {summaries.count()}")
            
            if summaries.exists():
                print("Sample summaries:")
                for summary in summaries[:5]:  # Show first 5
                    print(f"  {summary.date}: {summary.status} - {summary.time_in} to {summary.time_out}")
            else:
                print("  No DailyTimeSummary records found!")
            
            # Check TimeEntry records
            time_entries = TimeEntry.objects.filter(employee=employee)
            print(f"\nTimeEntry records for {employee.full_name}: {time_entries.count()}")
            
            if time_entries.exists():
                print("Sample time entries:")
                for entry in time_entries[:5]:  # Show first 5
                    print(f"  {entry.timestamp}: {entry.entry_type}")
            else:
                print("  No TimeEntry records found!")
            
            # Check EmployeeSchedule records
            schedules = EmployeeSchedule.objects.filter(employee=employee)
            print(f"\nEmployeeSchedule records for {employee.full_name}: {schedules.count()}")
            
            if schedules.exists():
                print("Sample schedules:")
                for schedule in schedules[:5]:  # Show first 5
                    print(f"  {schedule.date}: {schedule.scheduled_in} to {schedule.scheduled_out}")
            else:
                print("  No EmployeeSchedule records found!")
            
            # Check for any data in current month
            today = date.today()
            start_date = date(today.year, today.month, 1)
            end_date = date(today.year, today.month, 28)
            
            print(f"\n=== DATA FOR CURRENT MONTH ({start_date} to {end_date}) ===")
            
            month_summaries = DailyTimeSummary.objects.filter(
                employee=employee,
                date__gte=start_date,
                date__lte=end_date
            )
            print(f"DailyTimeSummary in current month: {month_summaries.count()}")
            
            month_entries = TimeEntry.objects.filter(
                employee=employee,
                timestamp__date__gte=start_date,
                timestamp__date__lte=end_date
            )
            print(f"TimeEntry in current month: {month_entries.count()}")
            
            month_schedules = EmployeeSchedule.objects.filter(
                employee=employee,
                date__gte=start_date,
                date__lte=end_date
            )
            print(f"EmployeeSchedule in current month: {month_schedules.count()}")
            
            if month_schedules.exists():
                print("\nSample schedules in current month:")
                for schedule in month_schedules[:3]:
                    print(f"  {schedule.date}: {schedule.scheduled_in} to {schedule.scheduled_out}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_database_data()
