#!/usr/bin/env python
"""
Script to test the new "not_scheduled" status for future dates
"""
import os
import sys
import django
from datetime import date, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import Employee, DailyTimeSummary
from geo.utils import generate_daily_time_summary_from_entries

def test_future_status():
    """Test the new not_scheduled status for future dates"""
    print("🧪 Testing Future Status Feature")
    print("=" * 50)
    
    # Get the employee
    employee = Employee.objects.get(employee_id='ALS0002')
    print(f"👤 Employee: {employee.full_name} ({employee.employee_id})")
    
    # Get today's date
    today = date.today()
    print(f"📅 Today: {today}")
    
    # Test dates: today, tomorrow, next week
    test_dates = [
        today,
        today + timedelta(days=1),  # Tomorrow
        today + timedelta(days=7),  # Next week
    ]
    
    print(f"\n📋 Testing dates: {[d.strftime('%Y-%m-%d') for d in test_dates]}")
    
    # Generate summaries for these dates
    for test_date in test_dates:
        print(f"\n🔍 Testing {test_date}:")
        
        try:
            result = generate_daily_time_summary_from_entries(
                employee=employee,
                start_date=test_date,
                end_date=test_date
            )
            print(f"✅ Generated: {result}")
            
            # Get the summary
            summary = DailyTimeSummary.objects.get(employee=employee, date=test_date)
            print(f"📊 Status: {summary.status}")
            print(f"📊 Is Weekend: {summary.is_weekend}")
            print(f"📊 Time In: {summary.time_in}")
            print(f"📊 Time Out: {summary.time_out}")
            
            # Check if it's a future date
            if test_date > today:
                print(f"🔮 Future date detected - should show 'not_scheduled' status")
                if summary.status == 'not_scheduled':
                    print("✅ CORRECT: Future date shows 'not_scheduled' status")
                else:
                    print(f"❌ INCORRECT: Future date shows '{summary.status}' instead of 'not_scheduled'")
            else:
                print(f"📅 Past/Today date - normal status logic applies")
                
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print(f"\n🎯 Summary of all DailyTimeSummary records:")
    summaries = DailyTimeSummary.objects.filter(employee=employee).order_by('date')
    for summary in summaries:
        print(f"  - {summary.date}: {summary.status}")

if __name__ == "__main__":
    test_future_status() 