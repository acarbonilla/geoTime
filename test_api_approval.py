#!/usr/bin/env python
import os
import sys
import django
import requests
import json
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
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth.models import User as AuthUser

def test_api_approval():
    print("=== Testing API Approval Process ===")
    
    # Get a pending Time Correction Request
    pending_request = TimeCorrectionRequest.objects.filter(status='pending').first()
    if not pending_request:
        print("No pending requests found. Creating a test request...")
        # Create a test request
        employee = Employee.objects.first()
        if employee:
            pending_request = TimeCorrectionRequest.objects.create(
                employee=employee,
                date=date(2025, 7, 29),
                requested_time_in=time(9, 0, 0),
                requested_time_out=time(17, 0, 0),
                reason="Test correction request",
                status='pending'
            )
            print(f"Created test request: {pending_request.id}")
    
    if pending_request:
        print(f"Testing API approval for request {pending_request.id}")
        print(f"Employee: {pending_request.employee.full_name}")
        print(f"Date: {pending_request.date}")
        print(f"Requested Time In: {pending_request.requested_time_in}")
        print(f"Requested Time Out: {pending_request.requested_time_out}")
        print(f"Status: {pending_request.status}")
        
        # Get a team leader
        team_leader = Employee.objects.filter(role='team_leader').first()
        if team_leader:
            print(f"Team Leader: {team_leader.full_name}")
            
            # Create a proper DRF request with the exact format the frontend sends
            factory = APIRequestFactory()
            request_data = {'comments': 'Test approval via API'}
            request = factory.post(
                f'/api/time-correction-requests/{pending_request.id}/approve/',
                data=json.dumps(request_data),
                content_type='application/json'
            )
            
            # Force authenticate the user
            force_authenticate(request, user=team_leader.user)
            
            # Create the viewset
            viewset = TimeCorrectionRequestViewSet()
            viewset.request = request
            viewset.kwargs = {'pk': pending_request.id}
            
            try:
                print("Calling approve method...")
                response = viewset.approve(request, pk=pending_request.id)
                print(f"Approval response status: {response.status_code}")
                print(f"Response data: {response.data}")
                
                # Check if TimeEntry was created
                time_entries = TimeEntry.objects.filter(
                    employee=pending_request.employee
                ).filter(
                    Q(timestamp__date=pending_request.date) | Q(event_time__date=pending_request.date)
                )
                print(f"Found {time_entries.count()} TimeEntry records after API approval")
                
                for entry in time_entries:
                    print(f"  Entry ID: {entry.id}")
                    print(f"  Type: {entry.entry_type}")
                    print(f"  Timestamp: {entry.timestamp}")
                    print(f"  Event Time: {entry.event_time}")
                    print(f"  Notes: {entry.notes}")
                
            except Exception as e:
                print(f"Error during API approval: {str(e)}")
                import traceback
                traceback.print_exc()
        else:
            print("No team leader found")
    else:
        print("No pending request found")

if __name__ == "__main__":
    test_api_approval() 