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

def debug_bulk_schedule():
    print("=== Debugging Bulk Schedule Creation ===")
    
    # Check if we have employees and templates
    employees = Employee.objects.all()
    templates = ScheduleTemplate.objects.filter(is_active=True)
    
    print(f"Total employees: {employees.count()}")
    print(f"Total templates: {templates.count()}")
    
    if not employees.exists():
        print("No employees found!")
        return
    
    if not templates.exists():
        print("No templates found!")
        return
    
    # Get first employee and template
    employee = employees.first()
    template = templates.first()
    
    print(f"\nTesting with:")
    print(f"Employee: {employee.user.username} (ID: {employee.id})")
    print(f"Template: {template.name} (ID: {template.id})")
    
    # Check existing schedules
    existing_schedules = EmployeeSchedule.objects.filter(employee=employee)
    print(f"Existing schedules for this employee: {existing_schedules.count()}")
    
    # Test date range
    start_date = date(2024, 1, 15)
    end_date = date(2024, 1, 20)
    
    print(f"\nTesting bulk schedule creation for {start_date} to {end_date}")
    
    try:
        # Call the function
        result = apply_template_to_schedule(
            employee=employee,
            template=template,
            start_date=start_date,
            end_date=end_date,
            weekdays_only=False
        )
        
        print(f"\nFunction result: {result}")
        
        # Check if schedules were created
        new_schedules = EmployeeSchedule.objects.filter(
            employee=employee,
            date__gte=start_date,
            date__lte=end_date
        )
        
        print(f"Schedules in database for this range: {new_schedules.count()}")
        
        if new_schedules.exists():
            print("\nCreated schedules:")
            for schedule in new_schedules:
                print(f"- {schedule.date}: {schedule.scheduled_time_in} to {schedule.scheduled_time_out}")
        else:
            print("No schedules were created!")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_bulk_schedule() 