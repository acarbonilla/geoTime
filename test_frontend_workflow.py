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

def test_frontend_workflow():
    print("=== Testing Complete Frontend Workflow ===")
    
    # Step 1: Simulate form submission (like the frontend does)
    print("\n1. Simulating form submission...")
    
    # Get an employee and team leader
    employee = Employee.objects.filter(role='employee').first()
    team_leader = Employee.objects.filter(role='team_leader').first()
    
    if not employee or not team_leader:
        print("Need both employee and team leader for testing")
        return
    
    print(f"Employee: {employee.full_name}")
    print(f"Team Leader: {team_leader.full_name}")
    
    # Create a test request using the same format as the frontend form
    factory = APIRequestFactory()
    
    # Simulate the form data exactly as the frontend sends it (multipart/form-data)
    form_data = {
        'date': '2025-07-29',
        'requested_time_in': '08:30:00',
        'requested_time_out': '17:30:00',
        'reason': 'Test frontend workflow - forgot to time in and out'
    }
    
    # Create the request as the employee with multipart/form-data
    request = factory.post('/api/time-correction-requests/', form_data, content_type='multipart/form-data')
    force_authenticate(request, user=employee.user)
    
    # Create the viewset and submit the request
    viewset = TimeCorrectionRequestViewSet()
    viewset.request = request
    
    try:
        response = viewset.create(request)
        print(f"Form submission response: {response.status_code}")
        print(f"Response data: {response.data}")
        
        # Get the created request
        created_request = TimeCorrectionRequest.objects.filter(
            employee=employee,
            date=date(2025, 7, 29),
            reason='Test frontend workflow - forgot to time in and out'
        ).first()
        
        if created_request:
            print(f"Created request ID: {created_request.id}")
            print(f"Status: {created_request.status}")
            
            # Step 2: Simulate Team Leader approval (like the frontend does)
            print("\n2. Simulating Team Leader approval...")
            
            # Create approval request as team leader
            approval_data = {'comments': 'Approved via frontend'}
            approval_request = factory.post(
                f'/api/time-correction-requests/{created_request.id}/approve/',
                approval_data
            )
            force_authenticate(approval_request, user=team_leader.user)
            
            # Create viewset for approval
            approval_viewset = TimeCorrectionRequestViewSet()
            approval_viewset.request = approval_request
            approval_viewset.kwargs = {'pk': created_request.id}
            
            try:
                approval_response = approval_viewset.approve(approval_request, pk=created_request.id)
                print(f"Approval response status: {approval_response.status_code}")
                print(f"Approval response data: {approval_response.data}")
                
                # Check if TimeEntry records were created
                time_entries = TimeEntry.objects.filter(
                    employee=employee
                ).filter(
                    Q(timestamp__date=date(2025, 7, 29)) | Q(event_time__date=date(2025, 7, 29))
                )
                print(f"\nFound {time_entries.count()} TimeEntry records after frontend approval")
                
                for entry in time_entries:
                    print(f"  Entry ID: {entry.id}")
                    print(f"  Type: {entry.entry_type}")
                    print(f"  Timestamp: {entry.timestamp}")
                    print(f"  Event Time: {entry.event_time}")
                    print(f"  Notes: {entry.notes}")
                
            except Exception as e:
                print(f"Error during approval: {str(e)}")
                import traceback
                traceback.print_exc()
                
        else:
            print("Failed to create request")
            
    except Exception as e:
        print(f"Error during form submission: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_frontend_workflow() 