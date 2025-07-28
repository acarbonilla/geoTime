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

def test_pending_approvals():
    print("=== Checking Pending Time Correction Requests ===")
    
    # Check for pending requests
    pending_requests = TimeCorrectionRequest.objects.filter(status='pending')
    print(f"Found {pending_requests.count()} pending requests")
    
    for req in pending_requests:
        print(f"\nRequest ID: {req.id}")
        print(f"Employee: {req.employee.full_name}")
        print(f"Date: {req.date}")
        print(f"Requested Time In: {req.requested_time_in}")
        print(f"Requested Time Out: {req.requested_time_out}")
        print(f"Reason: {req.reason}")
        print(f"Status: {req.status}")
        
        # Check if there are any TimeEntry records for this employee and date
        employee_entries = TimeEntry.objects.filter(
            employee=req.employee
        ).filter(
            Q(timestamp__date=req.date) | Q(event_time__date=req.date)
        )
        print(f"Found {employee_entries.count()} existing TimeEntry records for this employee on {req.date}")
        
        if employee_entries.count() == 0:
            print("No TimeEntry records found - this request needs approval!")
            
            # Manually apply the correction
            from geo.views import TimeCorrectionRequestViewSet
            viewset = TimeCorrectionRequestViewSet()
            
            try:
                print("Manually applying correction...")
                viewset._apply_time_correction(req)
                print("Correction applied successfully!")
                
                # Update the request status to approved
                req.status = 'approved'
                req.save()
                print("Request status updated to approved")
                
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

if __name__ == "__main__":
    test_pending_approvals() 