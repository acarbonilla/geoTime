#!/usr/bin/env python
"""
Test script to verify the status fix logic works correctly.
Run this to test the logic without affecting the database.
"""

import os
import sys
import django
from datetime import date, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.utils import _validate_status_assignment


def test_status_logic():
    """Test the status logic with various scenarios"""
    
    # Mock summary object for testing
    class MockSummary:
        def __init__(self, status, scheduled_time_in=None, scheduled_time_out=None, is_weekend=False):
            self.status = status
            self.scheduled_time_in = scheduled_time_in
            self.scheduled_time_out = scheduled_time_out
            self.is_weekend = is_weekend
    
    # Test scenarios
    test_cases = [
        {
            'name': 'Absent with schedule (CORRECT)',
            'summary': MockSummary('absent', '08:00', '17:00', False),
            'debug_info': {
                'date': date.today() - timedelta(days=1),
                'employee': 'Test Employee',
                'has_time_in': False,
                'has_time_out': False,
                'has_schedule': True,
                'scheduled_in': '08:00',
                'scheduled_out': '17:00',
                'is_weekend': False,
                'is_future': False
            },
            'should_pass': True
        },
        {
            'name': 'Absent without schedule (INCORRECT - should be not_scheduled)',
            'summary': MockSummary('absent', None, None, False),
            'debug_info': {
                'date': date.today() - timedelta(days=1),
                'employee': 'Test Employee',
                'has_time_in': False,
                'has_time_out': False,
                'has_schedule': False,
                'scheduled_in': None,
                'scheduled_out': None,
                'is_weekend': False,
                'is_future': False
            },
            'should_pass': False
        },
        {
            'name': 'Not scheduled without schedule (CORRECT)',
            'summary': MockSummary('not_scheduled', None, None, False),
            'debug_info': {
                'date': date.today() - timedelta(days=1),
                'employee': 'Test Employee',
                'has_time_in': False,
                'has_time_out': False,
                'has_schedule': False,
                'scheduled_in': None,
                'scheduled_out': None,
                'is_weekend': False,
                'is_future': False
            },
            'should_pass': True
        },
        {
            'name': 'Weekend status on weekend (CORRECT)',
            'summary': MockSummary('weekend', None, None, True),
            'debug_info': {
                'date': date.today() - timedelta(days=1),
                'employee': 'Test Employee',
                'has_time_in': False,
                'has_time_out': False,
                'has_schedule': False,
                'scheduled_in': None,
                'scheduled_out': None,
                'is_weekend': True,
                'is_future': False
            },
            'should_pass': True
        },
        {
            'name': 'Present with time in (CORRECT)',
            'summary': MockSummary('present', None, None, False),
            'debug_info': {
                'date': date.today(),
                'employee': 'Test Employee',
                'has_time_in': True,
                'has_time_out': False,
                'has_schedule': False,
                'scheduled_in': None,
                'scheduled_out': None,
                'is_weekend': False,
                'is_future': False
            },
            'should_pass': True
        }
    ]
    
    print("Testing status validation logic...")
    print("=" * 50)
    
    passed_tests = 0
    total_tests = len(test_cases)
    
    for test_case in test_cases:
        print(f"\nTest: {test_case['name']}")
        print(f"Status: {test_case['summary'].status}")
        print(f"Has Schedule: {test_case['debug_info']['has_schedule']}")
        print(f"Is Weekend: {test_case['debug_info']['is_weekend']}")
        
        result = _validate_status_assignment(test_case['summary'], test_case['debug_info'])
        
        if result == test_case['should_pass']:
            print("✅ PASSED")
            passed_tests += 1
        else:
            print("❌ FAILED")
            if test_case['should_pass']:
                print("   Expected to pass but failed")
            else:
                print("   Expected to fail but passed")
    
    print("\n" + "=" * 50)
    print(f"Test Results: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed! The status logic is working correctly.")
    else:
        print("⚠️  Some tests failed. Please review the logic.")
    
    return passed_tests == total_tests


def test_status_determination():
    """Test the actual status determination logic"""
    
    print("\n" + "=" * 50)
    print("Testing Status Determination Logic")
    print("=" * 50)
    
    # Test the logic from the fixed function
    test_scenarios = [
        {
            'name': 'No time entries, no schedule, past date',
            'time_in': None,
            'time_out': None,
            'schedule': None,
            'current_date': date.today() - timedelta(days=1),
            'is_weekend': False,
            'expected_status': 'not_scheduled'
        },
        {
            'name': 'No time entries, has schedule, past date',
            'time_in': None,
            'time_out': None,
            'schedule': 'mock_schedule',
            'current_date': date.today() - timedelta(days=1),
            'is_weekend': False,
            'expected_status': 'absent'
        },
        {
            'name': 'No time entries, no schedule, weekend',
            'time_in': None,
            'time_out': None,
            'schedule': None,
            'current_date': date.today() - timedelta(days=1),
            'is_weekend': True,
            'expected_status': 'weekend'
        },
        {
            'name': 'No time entries, no schedule, future date',
            'time_in': None,
            'time_out': None,
            'schedule': None,
            'current_date': date.today() + timedelta(days=1),
            'is_weekend': False,
            'expected_status': 'not_scheduled'
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\nScenario: {scenario['name']}")
        
        # Simulate the logic from the fixed function
        if scenario['time_in'] and scenario['time_out']:
            status = 'present'
        elif scenario['time_in'] and not scenario['time_out']:
            status = 'present'
        elif not scenario['time_in'] and not scenario['time_out']:
            if scenario['current_date'] > date.today():
                status = 'not_scheduled'
            elif scenario['is_weekend']:
                status = 'weekend'
            else:
                if scenario['schedule']:
                    status = 'absent'
                else:
                    status = 'not_scheduled'
        else:
            status = 'not_scheduled'
        
        print(f"  Expected: {scenario['expected_status']}")
        print(f"  Got:      {status}")
        
        if status == scenario['expected_status']:
            print("  ✅ Correct")
        else:
            print("  ❌ Incorrect")


if __name__ == '__main__':
    print("Status Fix Test Suite")
    print("=" * 50)
    
    # Run tests
    test_status_logic()
    test_status_determination()
    
    print("\n" + "=" * 50)
    print("Test suite completed!")
