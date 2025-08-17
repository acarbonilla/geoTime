#!/usr/bin/env python3
"""
Test script for the new comprehensive status system.
This script tests various scenarios to ensure the status logic works correctly.
"""

import os
import sys
import django
from datetime import datetime, date, time, timedelta

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import DailyTimeSummary, Employee, EmployeeSchedule
from django.contrib.auth.models import User


def create_test_scenarios():
    """Create test scenarios to verify status logic"""
    
    print("🧪 Testing Comprehensive Status System")
    print("=" * 50)
    
    # Get or create a test employee
    user, created = User.objects.get_or_create(
        username='test_employee',
        defaults={
            'first_name': 'Test',
            'last_name': 'Employee',
            'email': 'test@example.com'
        }
    )
    
    if created:
        print("✅ Created test user")
    
    # Get or create test employee profile
    from geo.models import Department, Location
    
    # Create test department and location if they don't exist
    dept, created = Department.objects.get_or_create(
        name='Test Department',
        defaults={'description': 'Test department for status testing'}
    )
    
    loc, created = Location.objects.get_or_create(
        name='Test Location',
        defaults={
            'address': 'Test Address',
            'latitude': 14.5995,  # Manila coordinates
            'longitude': 120.9842,
            'timezone_name': 'Asia/Manila',
            'timezone_offset': 480  # UTC+8 for Manila
        }
    )
    
    employee, created = Employee.objects.get_or_create(
        user=user,
        defaults={
            'employee_id': 'TEST001',
            'department': dept,
            'position': 'Test Position',
            'hire_date': date.today() - timedelta(days=30),
            'phone': '123-456-7890'
        }
    )
    
    if created:
        print("✅ Created test employee")
    
    # Test scenarios
    test_scenarios = [
        {
            'name': 'Normal Day Shift - Present',
            'date': date.today() - timedelta(days=1),
            'scheduled_in': time(9, 0),
            'scheduled_out': time(17, 0),
            'time_in': time(8, 55),
            'time_out': time(17, 5),
            'expected_status': 'present'
        },
        {
            'name': 'Late Arrival',
            'date': date.today() - timedelta(days=2),
            'scheduled_in': time(9, 0),
            'scheduled_out': time(17, 0),
            'time_in': time(9, 15),
            'time_out': time(17, 0),
            'expected_status': 'late'
        },
        {
            'name': 'Early Departure - UnderTime',
            'date': date.today() - timedelta(days=3),
            'scheduled_in': time(9, 0),
            'scheduled_out': time(17, 0),
            'time_in': time(9, 0),
            'time_out': time(16, 30),
            'expected_status': 'undertime'
        },
        {
            'name': 'Incomplete Shift',
            'date': date.today() - timedelta(days=4),
            'scheduled_in': time(9, 0),
            'scheduled_out': time(17, 0),
            'time_in': time(9, 0),
            'time_out': None,
            'expected_status': 'incomplete'
        },
        {
            'name': 'Suspiciously Short Shift - Less than 15 minutes',
            'date': date.today() - timedelta(days=7),
            'scheduled_in': time(11, 0),
            'scheduled_out': time(9, 0),  # Next day
            'time_in': time(11, 51),
            'time_out': time(11, 52),  # Only 1 minute worked
            'expected_status': 'incomplete'
        },
        {
            'name': 'Shift Void - Both times before schedule',
            'date': date.today() - timedelta(days=5),
            'scheduled_in': time(9, 0),
            'scheduled_out': time(17, 0),
            'time_in': time(7, 0),
            'time_out': time(8, 0),
            'expected_status': 'shift_void'
        },
        {
            'name': 'Future Scheduled Shift',
            'date': date.today() + timedelta(days=1),
            'scheduled_in': time(9, 0),
            'scheduled_out': time(17, 0),
            'time_in': None,
            'time_out': None,
            'expected_status': 'scheduled'
        },
        {
            'name': 'Absent - Today with schedule but no time',
            'date': date.today(),
            'scheduled_in': time(9, 0),
            'scheduled_out': time(17, 0),
            'time_in': None,
            'time_out': None,
            'expected_status': 'absent'
        },
        {
            'name': 'Not Yet Scheduled',
            'date': date.today() - timedelta(days=6),
            'scheduled_in': None,
            'scheduled_out': None,
            'time_in': None,
            'time_out': None,
            'expected_status': 'not_yet_scheduled'
        }
    ]
    
    results = []
    
    for scenario in test_scenarios:
        print(f"\n🔍 Testing: {scenario['name']}")
        print(f"   Date: {scenario['date']}")
        print(f"   Schedule: {scenario['scheduled_in']} - {scenario['scheduled_out']}")
        print(f"   Time: {scenario['time_in']} - {scenario['time_out']}")
        print(f"   Expected: {scenario['expected_status']}")
        
        # Create or get daily summary
        summary, created = DailyTimeSummary.objects.get_or_create(
            employee=employee,
            date=scenario['date'],
            defaults={
                'status': 'not_scheduled',
                'billed_hours': 0,
                'late_minutes': 0,
                'undertime_minutes': 0,
                'night_differential_hours': 0
            }
        )
        
        # Update with test data
        summary.scheduled_time_in = scenario['scheduled_in']
        summary.scheduled_time_out = scenario['scheduled_out']
        summary.time_in = scenario['time_in']
        summary.time_out = scenario['time_out']
        
        # Calculate comprehensive status
        calculated_status = summary.calculate_comprehensive_status()
        
        # Check if status matches expected
        status_correct = calculated_status == scenario['expected_status']
        
        # Check if metrics are zeroed for shift void
        metrics_zeroed = True
        if calculated_status == 'shift_void':
            metrics_zeroed = (
                summary.billed_hours == 0 and
                summary.late_minutes == 0 and
                summary.undertime_minutes == 0 and
                summary.night_differential_hours == 0
            )
        
        result = {
            'scenario': scenario['name'],
            'expected': scenario['expected_status'],
            'actual': calculated_status,
            'status_correct': status_correct,
            'metrics_zeroed': metrics_zeroed,
            'summary': summary
        }
        
        results.append(result)
        
        # Display result
        if status_correct:
            print(f"   ✅ Status: {calculated_status}")
        else:
            print(f"   ❌ Status: {calculated_status} (expected {scenario['expected_status']})")
        
        if calculated_status == 'shift_void':
            if metrics_zeroed:
                print(f"   ✅ Metrics zeroed correctly")
            else:
                print(f"   ❌ Metrics not zeroed: BH={summary.billed_hours}, LT={summary.late_minutes}, UT={summary.undertime_minutes}, ND={summary.night_differential_hours}")
        
        # Save the summary
        summary.save()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    correct_statuses = sum(1 for r in results if r['status_correct'])
    correct_metrics = sum(1 for r in results if r['metrics_zeroed'])
    total_tests = len(results)
    
    print(f"Total Tests: {total_tests}")
    print(f"Correct Statuses: {correct_statuses}/{total_tests}")
    print(f"Correct Metrics: {correct_metrics}/{total_tests}")
    
    if correct_statuses == total_tests:
        print("🎉 All status tests passed!")
    else:
        print("⚠️  Some status tests failed")
        for result in results:
            if not result['status_correct']:
                print(f"   ❌ {result['scenario']}: expected {result['expected']}, got {result['actual']}")
    
    if correct_metrics == total_tests:
        print("🎉 All metric tests passed!")
    else:
        print("⚠️  Some metric tests failed")
    
    # Cleanup test data
    print("\n🧹 Cleaning up test data...")
    DailyTimeSummary.objects.filter(employee=employee).delete()
    Employee.objects.filter(id=employee.id).delete()
    User.objects.filter(id=user.id).delete()
    print("✅ Test data cleaned up")
    
    return results


if __name__ == '__main__':
    try:
        results = create_test_scenarios()
        print("\n🎯 Test completed successfully!")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
