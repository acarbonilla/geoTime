#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, time, date
from django.utils import timezone
from django.db.models import Q

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import TimeCorrectionRequest, TimeEntry, Employee, User

def test_timezone_fix():
    print("=== Testing Timezone Fix ===")
    
    # Create a test Time Correction Request
    employee = Employee.objects.first()
    if not employee:
        print("No employee found")
        return
    
    print(f"Employee: {employee.full_name}")
    
    # Create a test request
    test_request = TimeCorrectionRequest.objects.create(
        employee=employee,
        date=date(2025, 7, 29),
        requested_time_in=time(8, 30, 0),  # 8:30 AM
        requested_time_out=time(17, 30, 0),  # 5:30 PM
        reason="Test timezone fix",
        status='pending'
    )
    
    print(f"Created test request ID: {test_request.id}")
    print(f"Requested Time In: {test_request.requested_time_in}")
    print(f"Requested Time Out: {test_request.requested_time_out}")
    print(f"Date: {test_request.date}")
    
    # Apply the correction
    from geo.views import TimeCorrectionRequestViewSet
    viewset = TimeCorrectionRequestViewSet()
    
    try:
        print("\nApplying correction...")
        viewset._apply_time_correction(test_request)
        print("Correction applied successfully!")
        
        # Check the results
        time_entries = TimeEntry.objects.filter(
            employee=employee
        ).filter(
            Q(timestamp__date=test_request.date) | Q(event_time__date=test_request.date)
        ).order_by('entry_type')
        
        print(f"\nFound {time_entries.count()} TimeEntry records")
        
        for entry in time_entries:
            print(f"\nEntry ID: {entry.id}")
            print(f"Type: {entry.entry_type}")
            print(f"Timestamp: {entry.timestamp}")
            print(f"Event Time: {entry.event_time}")
            print(f"Notes: {entry.notes}")
            
            # Check if the time is correct
            if entry.entry_type == 'time_in':
                expected_time = time(8, 30, 0)
                actual_time = entry.event_time.time() if entry.event_time else entry.timestamp.time()
                print(f"Expected: {expected_time}, Actual: {actual_time}")
                print(f"Time correct: {expected_time == actual_time}")
            elif entry.entry_type == 'time_out':
                expected_time = time(17, 30, 0)
                actual_time = entry.event_time.time() if entry.event_time else entry.timestamp.time()
                print(f"Expected: {expected_time}, Actual: {actual_time}")
                print(f"Time correct: {expected_time == actual_time}")
        
        # Update the request status
        test_request.status = 'approved'
        test_request.save()
        print(f"\nRequest status updated to: {test_request.status}")
        
    except Exception as e:
        print(f"Error applying correction: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_timezone_fix() 