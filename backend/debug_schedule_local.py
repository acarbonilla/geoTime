#!/usr/bin/env python
"""
Local debug script for schedule data.
This script tests the backend function directly to see what data is being returned.
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

from geo.models import Employee
from geo.utils import get_employee_time_attendance_report

def test_schedule_data():
    """Test the schedule data function locally"""
    try:
        # Get an employee
        employee = Employee.objects.first()
        if not employee:
            print("No employees found in database")
            return
        
        print(f"Testing with employee: {employee.full_name} ({employee.employee_id})")
        
        # Set test dates (current month)
        today = date.today()
        start_date = date(today.year, today.month, 1)
        end_date = date(today.year, today.month, 28)
        
        print(f"Testing period: {start_date} to {end_date}")
        
        # Call the function
        result = get_employee_time_attendance_report(employee, start_date, end_date)
        
        print("\n=== RESULT STRUCTURE ===")
        print(f"Result type: {type(result)}")
        print(f"Result keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
        
        if isinstance(result, dict):
            print(f"\nEmployee: {result.get('employee', 'Not found')}")
            print(f"Period: {result.get('period', 'Not found')}")
            print(f"Summary: {result.get('summary', 'Not found')}")
            
            daily_records = result.get('daily_records', [])
            print(f"\nDaily Records:")
            print(f"  Type: {type(daily_records)}")
            print(f"  Length: {len(daily_records) if daily_records else 0}")
            
            if daily_records:
                print(f"  First record: {daily_records[0]}")
                print(f"  Sample keys: {list(daily_records[0].keys()) if daily_records[0] else 'No keys'}")
            else:
                print("  No daily records found!")
                
                # Check if there are any DailyTimeSummary records
                from geo.models import DailyTimeSummary
                summaries = DailyTimeSummary.objects.filter(
                    employee=employee,
                    date__gte=start_date,
                    date__lte=end_date
                )
                print(f"\nDailyTimeSummary records found: {summaries.count()}")
                
                if summaries.exists():
                    print("Sample summary:")
                    sample = summaries.first()
                    print(f"  Date: {sample.date}")
                    print(f"  Status: {sample.status}")
                    print(f"  Time in: {sample.time_in}")
                    print(f"  Time out: {sample.time_out}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_schedule_data()
