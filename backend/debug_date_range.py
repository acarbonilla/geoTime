#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import Employee, ScheduleTemplate, EmployeeSchedule
from geo.utils import apply_template_to_schedule
from datetime import datetime, date

def debug_date_range():
    print("=== Debugging Date Range Issue ===")
    
    # Check if we have employees and templates
    employees = Employee.objects.all()
    templates = ScheduleTemplate.objects.filter(is_active=True)
    
    if not employees.exists() or not templates.exists():
        print("No employees or templates found!")
        return
    
    employee = employees.first()
    template = templates.first()
    
    print(f"Testing with employee: {employee.user.username}")
    print(f"Template: {template.name}")
    
    # Test with a specific date range
    start_date = date(2024, 1, 15)
    end_date = date(2024, 1, 20)
    
    print(f"\nTesting date range: {start_date} to {end_date}")
    print(f"Start date type: {type(start_date)}")
    print(f"End date type: {type(end_date)}")
    
    # Check existing schedules before
    existing_before = EmployeeSchedule.objects.filter(
        employee=employee,
        date__gte=start_date,
        date__lte=end_date
    ).count()
    print(f"Existing schedules in range before: {existing_before}")
    
    # Check all schedules for this employee
    all_schedules = EmployeeSchedule.objects.filter(employee=employee).order_by('date')
    print(f"Total schedules for employee: {all_schedules.count()}")
    
    if all_schedules.exists():
        print("All schedules:")
        for schedule in all_schedules[:10]:  # Show first 10
            print(f"- {schedule.date}: {schedule.scheduled_time_in} to {schedule.scheduled_time_out}")
    
    # Test the function
    try:
        result = apply_template_to_schedule(
            employee=employee,
            template=template,
            start_date=start_date,
            end_date=end_date,
            weekdays_only=False,
            overwrite_existing=False
        )
        
        print(f"\nFunction result: {result}")
        
        # Check schedules after
        existing_after = EmployeeSchedule.objects.filter(
            employee=employee,
            date__gte=start_date,
            date__lte=end_date
        ).count()
        print(f"Existing schedules in range after: {existing_after}")
        
        # Check if schedules were created outside the range
        all_schedules_after = EmployeeSchedule.objects.filter(employee=employee).order_by('date')
        print(f"Total schedules for employee after: {all_schedules_after.count()}")
        
        # Show schedules in the range
        range_schedules = EmployeeSchedule.objects.filter(
            employee=employee,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')
        
        print(f"\nSchedules in the specified range:")
        for schedule in range_schedules:
            print(f"- {schedule.date}: {schedule.scheduled_time_in} to {schedule.scheduled_time_out}")
        
        # Check if any schedules were created outside the range
        outside_range = EmployeeSchedule.objects.filter(
            employee=employee,
            date__lt=start_date
        ).count() + EmployeeSchedule.objects.filter(
            employee=employee,
            date__gt=end_date
        ).count()
        
        print(f"Schedules outside the range: {outside_range}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_date_range() 