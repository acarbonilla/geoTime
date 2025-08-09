#!/usr/bin/env python
"""
Test script to verify TIME ATTENDANCE API endpoints
"""

import requests
import json
from datetime import date

# API base URL
BASE_URL = "http://localhost:8000/api"

def test_generate_summaries():
    """Test the generate_summaries endpoint"""
    print("Testing generate_summaries endpoint...")
    
    url = f"{BASE_URL}/daily-summaries/generate_summaries/"
    data = {
        "start_date": "2025-08-01",
        "end_date": "2025-08-31"
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Success: {result['message']}")
            print(f"Result: {result['result']}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

def test_time_attendance_report():
    """Test the time_attendance_report endpoint"""
    print("\nTesting time_attendance_report endpoint...")
    
    url = f"{BASE_URL}/daily-summaries/time_attendance_report/"
    params = {
        "employee_id": "ALS0002",
        "start_date": "2025-08-01",
        "end_date": "2025-08-10"
    }
    
    try:
        response = requests.get(url, params=params)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            report = response.json()
            print(f"Employee: {report['employee']['name']}")
            print(f"Department: {report['employee']['department']}")
            print(f"Period: {report['period']['start_date']} to {report['period']['end_date']}")
            print(f"Days Work: {report['summary']['days_worked']}")
            print(f"Total BH: {report['summary']['total_billed_hours']}")
            print(f"Total LT: {report['summary']['total_late_minutes']}")
            print(f"Total UT: {report['summary']['total_undertime_minutes']}")
            print(f"Total ND: {report['summary']['total_night_differential']}")
            
            # Show first few daily records
            print("\nDaily Records (first 5):")
            for record in report['daily_records'][:5]:
                print(f"  {record['date']} {record['day']} | "
                      f"Status: {record['status']} | "
                      f"Time In: {record['time_in']} | "
                      f"Time Out: {record['time_out']} | "
                      f"BH: {record['billed_hours']} | "
                      f"LT: {record['late_minutes']} | "
                      f"UT: {record['undertime_minutes']} | "
                      f"ND: {record['night_differential']}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

def main():
    """Main test function"""
    print("TIME ATTENDANCE API ENDPOINTS TEST")
    print("="*50)
    
    # Test generate summaries endpoint
    test_generate_summaries()
    
    # Test time attendance report endpoint
    test_time_attendance_report()
    
    print("\n" + "="*50)
    print("API TEST COMPLETE!")
    print("="*50)

if __name__ == "__main__":
    main() 