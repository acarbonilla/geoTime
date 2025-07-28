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
from geo.views import TimeCorrectionRequestViewSet

def test_apply_existing_corrections():
    print("=== Testing Application of Existing Approved Corrections ===")
    
    # Get approved requests that don't have corresponding TimeEntry records
    approved_requests = TimeCorrectionRequest.objects.filter(status='approved')
    print(f"Found {approved_requests.count()} approved requests")
    
    viewset = TimeCorrectionRequestViewSet()
    
    for req in approved_requests:
        print(f"\nProcessing request {req.id}:")
        print(f"Employee: {req.employee.full_name}")
        print(f"Date: {req.date}")
        print(f"Requested Time In: {req.requested_time_in}")
        print(f"Requested Time Out: {req.requested_time_out}")
        
        # Check if TimeEntry records already exist for this request
        existing_entries = TimeEntry.objects.filter(
            employee=req.employee
        ).filter(
            Q(timestamp__date=req.date) | Q(event_time__date=req.date)
        )
        print(f"Found {existing_entries.count()} existing TimeEntry records")
        
        if existing_entries.count() == 0:
            print("No TimeEntry records found. Applying correction...")
            try:
                viewset._apply_time_correction(req)
                print("Correction applied successfully!")
                
                # Check if TimeEntry records were created
                new_entries = TimeEntry.objects.filter(
                    employee=req.employee
                ).filter(
                    Q(timestamp__date=req.date) | Q(event_time__date=req.date)
                )
                print(f"Now found {new_entries.count()} TimeEntry records")
                
                for entry in new_entries:
                    print(f"  Entry ID: {entry.id}")
                    print(f"  Type: {entry.entry_type}")
                    print(f"  Timestamp: {entry.timestamp}")
                    print(f"  Event Time: {entry.event_time}")
                    print(f"  Notes: {entry.notes}")
                
            except Exception as e:
                print(f"Error applying correction: {str(e)}")
                import traceback
                traceback.print_exc()
        else:
            print("TimeEntry records already exist, skipping...")
            for entry in existing_entries:
                print(f"  Entry ID: {entry.id}")
                print(f"  Type: {entry.entry_type}")
                print(f"  Timestamp: {entry.timestamp}")
                print(f"  Event Time: {entry.event_time}")
                print(f"  Notes: {entry.notes}")

if __name__ == "__main__":
    test_apply_existing_corrections() 