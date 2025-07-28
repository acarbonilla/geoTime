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
from rest_framework.test import APIRequestFactory
from django.contrib.auth.models import User as AuthUser

def test_time_correction():
    print("=== Testing Time Correction Request Functionality ===")
    
    # Check if there are any Time Correction Requests
    correction_requests = TimeCorrectionRequest.objects.all()
    print(f"Found {correction_requests.count()} Time Correction Requests")
    
    for req in correction_requests:
        print(f"Request ID: {req.id}")
        print(f"Employee: {req.employee.full_name}")
        print(f"Date: {req.date}")
        print(f"Requested Time In: {req.requested_time_in}")
        print(f"Requested Time Out: {req.requested_time_out}")
        print(f"Status: {req.status}")
        print(f"Reason: {req.reason}")
        print("---")
    
    # Check if there are any TimeEntry records for July 29 (the date of the corrections)
    july_29 = date(2025, 7, 29)
    time_entries_july_29 = TimeEntry.objects.filter(
        Q(timestamp__date=july_29) | Q(event_time__date=july_29)
    )
    print(f"Found {time_entries_july_29.count()} TimeEntry records for July 29 ({july_29})")
    
    for entry in time_entries_july_29:
        print(f"Entry ID: {entry.id}")
        print(f"Employee: {entry.employee.full_name}")
        print(f"Type: {entry.entry_type}")
        print(f"Timestamp: {entry.timestamp}")
        print(f"Event Time: {entry.event_time}")
        print(f"Notes: {entry.notes}")
        print("---")
    
    # Check if there are any TimeEntry records for today
    today = timezone.now().date()
    time_entries = TimeEntry.objects.filter(
        Q(timestamp__date=today) | Q(event_time__date=today)
    )
    print(f"Found {time_entries.count()} TimeEntry records for today ({today})")
    
    for entry in time_entries:
        print(f"Entry ID: {entry.id}")
        print(f"Employee: {entry.employee.full_name}")
        print(f"Type: {entry.entry_type}")
        print(f"Timestamp: {entry.timestamp}")
        print(f"Event Time: {entry.event_time}")
        print(f"Notes: {entry.notes}")
        print("---")
    
    # Check for team leaders
    team_leaders = Employee.objects.filter(role='team_leader')
    print(f"Found {team_leaders.count()} team leaders")
    
    for tl in team_leaders:
        print(f"Team Leader: {tl.full_name}")
        team_members = tl.get_team_members()
        print(f"Team members: {[tm.full_name for tm in team_members]}")
        print("---")
    
    # Test the _apply_time_correction method directly
    print("=== Testing _apply_time_correction method ===")
    approved_requests = TimeCorrectionRequest.objects.filter(status='approved')
    print(f"Found {approved_requests.count()} approved requests")
    
    for req in approved_requests:
        print(f"Testing correction for request {req.id}")
        print(f"Employee: {req.employee.full_name}")
        print(f"Date: {req.date}")
        print(f"Requested Time In: {req.requested_time_in}")
        print(f"Requested Time Out: {req.requested_time_out}")
        
        # Check if there are any TimeEntry records for this employee and date
        employee_entries = TimeEntry.objects.filter(
            employee=req.employee
        ).filter(
            Q(timestamp__date=req.date) | Q(event_time__date=req.date)
        )
        print(f"Found {employee_entries.count()} TimeEntry records for this employee on {req.date}")
        
        for entry in employee_entries:
            print(f"  Entry ID: {entry.id}")
            print(f"  Type: {entry.entry_type}")
            print(f"  Timestamp: {entry.timestamp}")
            print(f"  Event Time: {entry.event_time}")
            print(f"  Notes: {entry.notes}")
        print("---")

if __name__ == "__main__":
    test_time_correction() 