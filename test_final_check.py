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

def test_final_check():
    print("=== Final Check: Time Correction System ===")
    
    # Check July 29 TimeEntry records
    july_29 = date(2025, 7, 29)
    time_entries_july_29 = TimeEntry.objects.filter(
        Q(timestamp__date=july_29) | Q(event_time__date=july_29)
    ).order_by('employee__user__first_name', 'entry_type')
    
    print(f"Found {time_entries_july_29.count()} TimeEntry records for July 29 ({july_29})")
    print("\n=== July 29 Time Entries ===")
    
    for entry in time_entries_july_29:
        print(f"Employee: {entry.employee.full_name}")
        print(f"Type: {entry.entry_type}")
        print(f"Timestamp: {entry.timestamp}")
        print(f"Event Time: {entry.event_time}")
        print(f"Notes: {entry.notes}")
        print("---")
    
    # Check Time Correction Requests
    print("\n=== Time Correction Requests ===")
    correction_requests = TimeCorrectionRequest.objects.filter(date=july_29).order_by('employee__user__first_name')
    print(f"Found {correction_requests.count()} Time Correction Requests for July 29")
    
    for req in correction_requests:
        print(f"Employee: {req.employee.full_name}")
        print(f"Status: {req.status}")
        print(f"Requested Time In: {req.requested_time_in}")
        print(f"Requested Time Out: {req.requested_time_out}")
        print(f"Reason: {req.reason}")
        print("---")
    
    # Check if the reports would now show the corrected times
    print("\n=== Report Simulation ===")
    employees = Employee.objects.filter(
        time_entries__timestamp__date=july_29
    ).distinct()
    
    for employee in employees:
        print(f"\nEmployee: {employee.full_name}")
        employee_entries = TimeEntry.objects.filter(
            employee=employee
        ).filter(
            Q(timestamp__date=july_29) | Q(event_time__date=july_29)
        ).order_by('timestamp')
        
        print(f"Found {employee_entries.count()} entries for {employee.full_name} on July 29")
        
        for entry in employee_entries:
            display_time = entry.event_time or entry.timestamp
            print(f"  {entry.entry_type}: {display_time.strftime('%H:%M:%S')}")
            if entry.notes:
                print(f"    Notes: {entry.notes}")

if __name__ == "__main__":
    test_final_check() 