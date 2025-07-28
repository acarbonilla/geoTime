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

def check_all_requests():
    print("=== All Time Correction Requests ===")
    
    # Get all requests
    all_requests = TimeCorrectionRequest.objects.all().order_by('-submitted_at')
    print(f"Found {all_requests.count()} total requests")
    
    for req in all_requests:
        print(f"\nRequest ID: {req.id}")
        print(f"Employee: {req.employee.full_name}")
        print(f"Date: {req.date}")
        print(f"Requested Time In: {req.requested_time_in}")
        print(f"Requested Time Out: {req.requested_time_out}")
        print(f"Reason: {req.reason}")
        print(f"Status: {req.status}")
        print(f"Submitted: {req.submitted_at}")
        if req.reviewed_at:
            print(f"Reviewed: {req.reviewed_at}")
        if req.reviewed_by:
            print(f"Reviewed by: {req.reviewed_by.full_name}")
        
        # Check if there are any TimeEntry records for this employee and date
        employee_entries = TimeEntry.objects.filter(
            employee=req.employee
        ).filter(
            Q(timestamp__date=req.date) | Q(event_time__date=req.date)
        )
        print(f"Found {employee_entries.count()} TimeEntry records for this employee on {req.date}")
        
        if employee_entries.count() > 0:
            for entry in employee_entries:
                print(f"  Entry ID: {entry.id}")
                print(f"  Type: {entry.entry_type}")
                print(f"  Timestamp: {entry.timestamp}")
                print(f"  Event Time: {entry.event_time}")
                print(f"  Notes: {entry.notes}")
        
        print("-" * 50)

if __name__ == "__main__":
    check_all_requests() 