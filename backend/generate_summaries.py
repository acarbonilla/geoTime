#!/usr/bin/env python
"""
Script to generate DailyTimeSummary records from existing TimeEntry and EmployeeSchedule data
"""
import os
import sys
import django
from datetime import date, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import Employee, TimeEntry, EmployeeSchedule, DailyTimeSummary
from geo.utils import generate_daily_time_summary_from_entries

def generate_summaries_for_all_employees():
    """Generate DailyTimeSummary records for all employees"""
    print("🔍 Finding all employees...")
    employees = Employee.objects.all()
    print(f"Found {employees.count()} employees")
    
    # Get date range from existing data
    time_entries = TimeEntry.objects.all()
    if time_entries.exists():
        earliest_date = time_entries.earliest('timestamp').timestamp.date()
        latest_date = time_entries.latest('timestamp').timestamp.date()
        print(f"📅 Date range: {earliest_date} to {latest_date}")
        
        for employee in employees:
            print(f"\n👤 Processing employee: {employee.full_name} ({employee.employee_id})")
            try:
                # Generate summaries for this employee
                count = generate_daily_time_summary_from_entries(
                    employee=employee,
                    start_date=earliest_date,
                    end_date=latest_date
                )
                print(f"✅ Generated {count} DailyTimeSummary records")
            except Exception as e:
                print(f"❌ Error processing {employee.full_name}: {e}")
    else:
        print("❌ No TimeEntry records found!")

def generate_summaries_for_date_range(start_date, end_date, employee_id=None):
    """Generate DailyTimeSummary records for specific date range and optionally specific employee"""
    if employee_id:
        try:
            employee = Employee.objects.get(employee_id=employee_id)
            print(f"👤 Generating summaries for employee: {employee.full_name} ({employee.employee_id})")
            count = generate_daily_time_summary_from_entries(
                employee=employee,
                start_date=start_date,
                end_date=end_date
            )
            print(f"✅ Generated {count} DailyTimeSummary records")
        except Employee.DoesNotExist:
            print(f"❌ Employee with ID {employee_id} not found!")
    else:
        print("👥 Generating summaries for all employees...")
        employees = Employee.objects.all()
        total_count = 0
        
        for employee in employees:
            try:
                count = generate_daily_time_summary_from_entries(
                    employee=employee,
                    start_date=start_date,
                    end_date=end_date
                )
                total_count += count
                print(f"✅ {employee.full_name}: {count} records")
            except Exception as e:
                print(f"❌ Error processing {employee.full_name}: {e}")
        
        print(f"\n🎉 Total DailyTimeSummary records generated: {total_count}")

def show_existing_data():
    """Show existing data counts"""
    print("\n📊 Current Data Counts:")
    print(f"Employees: {Employee.objects.count()}")
    print(f"TimeEntries: {TimeEntry.objects.count()}")
    print(f"EmployeeSchedules: {EmployeeSchedule.objects.count()}")
    print(f"DailyTimeSummaries: {DailyTimeSummary.objects.count()}")
    
    if TimeEntry.objects.exists():
        earliest = TimeEntry.objects.earliest('timestamp').timestamp.date()
        latest = TimeEntry.objects.latest('timestamp').timestamp.date()
        print(f"TimeEntry date range: {earliest} to {latest}")

if __name__ == "__main__":
    print("🚀 DailyTimeSummary Generator")
    print("=" * 40)
    
    # Show existing data
    show_existing_data()
    
    print("\n" + "=" * 40)
    print("Choose an option:")
    print("1. Generate summaries for all employees (all dates)")
    print("2. Generate summaries for specific date range")
    print("3. Generate summaries for specific employee")
    print("4. Exit")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == "1":
        generate_summaries_for_all_employees()
    elif choice == "2":
        start_date_str = input("Enter start date (YYYY-MM-DD): ").strip()
        end_date_str = input("Enter end date (YYYY-MM-DD): ").strip()
        try:
            start_date = date.fromisoformat(start_date_str)
            end_date = date.fromisoformat(end_date_str)
            generate_summaries_for_date_range(start_date, end_date)
        except ValueError:
            print("❌ Invalid date format! Use YYYY-MM-DD")
    elif choice == "3":
        employee_id = input("Enter employee ID: ").strip()
        start_date_str = input("Enter start date (YYYY-MM-DD): ").strip()
        end_date_str = input("Enter end date (YYYY-MM-DD): ").strip()
        try:
            start_date = date.fromisoformat(start_date_str)
            end_date = date.fromisoformat(end_date_str)
            generate_summaries_for_date_range(start_date, end_date, employee_id)
        except ValueError:
            print("❌ Invalid date format! Use YYYY-MM-DD")
    elif choice == "4":
        print("👋 Goodbye!")
    else:
        print("❌ Invalid choice!") 