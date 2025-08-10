#!/usr/bin/env python
"""
Script to fix the issue where scheduled times are not showing in the production environment.
This script regenerates the daily summaries to ensure scheduled times are properly populated.
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import Employee, DailyTimeSummary, EmployeeSchedule
from geo.utils import generate_daily_summaries_for_period
from django.utils import timezone

def fix_schedule_display():
    """
    Fix the issue where scheduled times are not showing in the production environment.
    """
    print("🔧 Fixing Schedule Display Issue in Production")
    print("=" * 60)
    
    # Get current date and date range for fixing (last 30 days)
    today = timezone.now().date()
    start_date = today - timedelta(days=30)
    end_date = today
    
    print(f"📅 Fixing data from {start_date} to {end_date}")
    print()
    
    # Get all employees
    employees = Employee.objects.all()
    print(f"👥 Found {employees.count()} employees to process")
    
    if employees.count() == 0:
        print("❌ No employees found in the system")
        return
    
    total_fixed = 0
    total_processed = 0
    
    # Process each employee
    for i, employee in enumerate(employees, 1):
        print(f"🔧 Processing employee {i}/{employees.count()}: {employee.full_name}")
        
        try:
            # Check current state
            summaries_before = DailyTimeSummary.objects.filter(
                employee=employee,
                date__gte=start_date,
                date__lte=end_date
            ).count()
            
            empty_scheduled_before = DailyTimeSummary.objects.filter(
                employee=employee,
                date__gte=start_date,
                date__lte=end_date
            ).filter(
                scheduled_time_in__isnull=True
            ).count()
            
            print(f"  📊 Found {summaries_before} daily summaries, {empty_scheduled_before} with empty scheduled times")
            
            # Generate daily summaries for this employee
            print(f"  🔧 Regenerating daily summaries...")
            generate_daily_summaries_for_period(employee, start_date, end_date)
            
            # Check the result
            summaries_after = DailyTimeSummary.objects.filter(
                employee=employee,
                date__gte=start_date,
                date__lte=end_date
            ).count()
            
            empty_scheduled_after = DailyTimeSummary.objects.filter(
                employee=employee,
                date__gte=start_date,
                date__lte=end_date
            ).filter(
                scheduled_time_in__isnull=True
            ).count()
            
            fixed_count = empty_scheduled_before - empty_scheduled_after
            total_fixed += fixed_count
            total_processed += summaries_after
            
            print(f"  ✅ Fixed {fixed_count} summaries with scheduled times")
            print(f"  📊 Total summaries: {summaries_after}, Empty scheduled: {empty_scheduled_after}")
            
        except Exception as e:
            print(f"  ❌ Error processing employee {employee.full_name}: {str(e)}")
            continue
        
        print()
    
    # Summary
    print("=" * 60)
    print("🎉 Fix Summary")
    print("-" * 20)
    print(f"👥 Employees processed: {employees.count()}")
    print(f"📊 Total summaries processed: {total_processed}")
    print(f"🔧 Summaries fixed: {total_fixed}")
    print(f"📅 Date range: {start_date} to {end_date}")
    
    if total_fixed > 0:
        print()
        print("✅ The scheduled times should now appear in your Time Attendance Report!")
        print("🔄 Refresh the report in the frontend to see the changes.")
    else:
        print()
        print("ℹ️  No summaries needed fixing. The issue might be elsewhere.")
        print("🔍 Check the diagnostic output for more details.")
    
    print()
    print("=" * 60)
    print("🔧 Fix script execution completed!")

if __name__ == "__main__":
    try:
        fix_schedule_display()
    except Exception as e:
        print(f"❌ Error during fix execution: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
