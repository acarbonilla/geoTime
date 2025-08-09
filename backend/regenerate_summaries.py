#!/usr/bin/env python
"""
Script to regenerate DailyTimeSummary records to include new time out data
"""
import os
import sys
import django
from datetime import date

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import Employee, TimeEntry, EmployeeSchedule, DailyTimeSummary
from geo.utils import generate_daily_time_summary_from_entries

def regenerate_summaries():
    """Regenerate DailyTimeSummary records for all employees"""
    print("🔄 Regenerating DailyTimeSummary Records")
    print("=" * 50)
    
    # Show current data
    print("📊 Current Data Counts:")
    print(f"TimeEntries: {TimeEntry.objects.count()}")
    print(f"EmployeeSchedules: {EmployeeSchedule.objects.count()}")
    print(f"DailyTimeSummaries: {DailyTimeSummary.objects.count()}")
    
    # Show TimeEntry details
    print("\n📝 TimeEntry Details:")
    time_entries = TimeEntry.objects.all().order_by('timestamp')
    for entry in time_entries:
        print(f"  - {entry.employee.full_name}: {entry.entry_type} at {entry.timestamp}")
    
    # Delete existing DailyTimeSummary records
    count = DailyTimeSummary.objects.count()
    DailyTimeSummary.objects.all().delete()
    print(f"\n🗑️ Deleted {count} existing DailyTimeSummary records")
    
    # Regenerate for all employees
    employees = Employee.objects.all()
    total_created = 0
    
    for employee in employees:
        print(f"\n👤 Processing: {employee.full_name} ({employee.employee_id})")
        
        # Get date range from TimeEntries
        time_entries = TimeEntry.objects.filter(employee=employee)
        if time_entries.exists():
            earliest_date = time_entries.earliest('timestamp').timestamp.date()
            latest_date = time_entries.latest('timestamp').timestamp.date()
            
            print(f"📅 Date range: {earliest_date} to {latest_date}")
            
            try:
                result = generate_daily_time_summary_from_entries(
                    employee=employee,
                    start_date=earliest_date,
                    end_date=latest_date
                )
                print(f"✅ Generated: {result}")
                total_created += result.get('created', 0)
            except Exception as e:
                print(f"❌ Error: {e}")
        else:
            print("⚠️ No TimeEntries found for this employee")
    
    print(f"\n🎉 Total DailyTimeSummary records created: {total_created}")
    
    # Show final data
    print(f"\n📊 Final Data Counts:")
    print(f"DailyTimeSummaries: {DailyTimeSummary.objects.count()}")
    
    # Show the regenerated summaries
    print("\n📋 Regenerated DailyTimeSummary Records:")
    summaries = DailyTimeSummary.objects.all().order_by('date')
    for summary in summaries:
        print(f"  - {summary.employee.full_name} ({summary.date}):")
        print(f"    Time In: {summary.time_in}")
        print(f"    Time Out: {summary.time_out}")
        print(f"    Status: {summary.status}")
        print(f"    BH: {summary.billed_hours}")
        print(f"    LT: {summary.late_minutes}")

if __name__ == "__main__":
    regenerate_summaries() 