#!/usr/bin/env python3
"""
Test script to verify TimeCorrection workflow is working properly.
This script tests the approval and application of time corrections.
"""

import os
import sys
import django
from datetime import datetime, time, date
from django.utils import timezone

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import (
    Employee, TimeCorrectionRequest, TimeEntry, 
    Department, Location, User
)
from geo.views import TimeCorrectionRequestViewSet
from django.test import RequestFactory
from django.contrib.auth.models import User as AuthUser

def create_test_data():
    """Create test data for the time correction workflow"""
    print("Creating test data...")
    
    # Create a test department
    dept, created = Department.objects.get_or_create(
        name='Test Department',
        defaults={'description': 'Test department for time correction testing'}
    )
    print(f"Department: {dept.name} ({'created' if created else 'exists'})")
    
    # Create a test location
    location, created = Location.objects.get_or_create(
        name='Test Location',
        defaults={'address': 'Test Address', 'latitude': 14.5995, 'longitude': 120.9842}
    )
    print(f"Location: {location.name} ({'created' if created else 'exists'})")
    
    # Create test users
    team_leader_user, created = AuthUser.objects.get_or_create(
        username='teamleader',
        defaults={
            'first_name': 'Team',
            'last_name': 'Leader',
            'email': 'teamleader@test.com'
        }
    )
    if created:
        team_leader_user.set_password('testpass123')
        team_leader_user.save()
    print(f"Team Leader User: {team_leader_user.username} ({'created' if created else 'exists'})")
    
    employee_user, created = AuthUser.objects.get_or_create(
        username='employee',
        defaults={
            'first_name': 'Test',
            'last_name': 'Employee',
            'email': 'employee@test.com'
        }
    )
    if created:
        employee_user.set_password('testpass123')
        employee_user.save()
    print(f"Employee User: {employee_user.username} ({'created' if created else 'exists'})")
    
    # Create employee profiles
    team_leader, created = Employee.objects.get_or_create(
        employee_id='TL001',
        defaults={
            'user': team_leader_user,
            'first_name': 'Team',
            'last_name': 'Leader',
            'department': dept,
            'role': 'team_leader',
            'is_active': True
        }
    )
    print(f"Team Leader Employee: {team_leader.full_name} ({'created' if created else 'exists'})")
    
    employee, created = Employee.objects.get_or_create(
        employee_id='EMP001',
        defaults={
            'user': employee_user,
            'first_name': 'Test',
            'last_name': 'Employee',
            'department': dept,
            'role': 'employee',
            'is_active': True,
            'team_leader': team_leader
        }
    )
    print(f"Employee: {employee.full_name} ({'created' if created else 'exists'})")
    
    return team_leader, employee, location

def create_time_correction_request(employee, date, time_in=None, time_out=None):
    """Create a time correction request"""
    print(f"Creating time correction request for {employee.full_name} on {date}")
    
    request = TimeCorrectionRequest.objects.create(
        employee=employee,
        date=date,
        requested_time_in=time_in,
        requested_time_out=time_out,
        reason='Test time correction request',
        status='pending'
    )
    
    print(f"Created time correction request: {request.id}")
    print(f"Status: {request.status}")
    print(f"Requested time in: {request.requested_time_in}")
    print(f"Requested time out: {request.requested_time_out}")
    
    return request

def test_approval_workflow():
    """Test the complete approval workflow"""
    print("\n" + "="*50)
    print("TESTING TIME CORRECTION APPROVAL WORKFLOW")
    print("="*50)
    
    # Create test data
    team_leader, employee, location = create_test_data()
    
    # Test date (today)
    test_date = date.today()
    
    # Create a time correction request
    correction_request = create_time_correction_request(
        employee=employee,
        date=test_date,
        time_in=time(8, 30),  # 8:30 AM
        time_out=time(17, 30)  # 5:30 PM
    )
    
    print(f"\nTime correction request created successfully!")
    print(f"Request ID: {correction_request.id}")
    print(f"Employee: {correction_request.employee.full_name}")
    print(f"Date: {correction_request.date}")
    print(f"Status: {correction_request.status}")
    
    # Check if there are existing time entries
    existing_entries = TimeEntry.objects.filter(
        employee=employee,
        event_time__date=test_date
    )
    print(f"\nExisting time entries for {test_date}: {existing_entries.count()}")
    for entry in existing_entries:
        print(f"  - {entry.entry_type}: {entry.event_time} (ID: {entry.id})")
    
    # Now test the approval process
    print(f"\nTesting approval process...")
    
    # Create a mock request for approval
    factory = RequestFactory()
    request = factory.post(f'/api/time-correction-requests/{correction_request.id}/approve/')
    request.user = team_leader.user
    
    # Get the viewset
    viewset = TimeCorrectionRequestViewSet()
    viewset.request = request
    viewset.kwargs = {'pk': correction_request.id}
    
    try:
        # Call the approve method
        response = viewset.approve(request, pk=correction_request.id)
        print(f"Approval response status: {response.status_code}")
        print(f"Approval response data: {response.data}")
        
        # Refresh the correction request
        correction_request.refresh_from_db()
        print(f"\nUpdated correction request:")
        print(f"Status: {correction_request.status}")
        print(f"Approver: {correction_request.approver}")
        print(f"Approved date: {correction_request.approved_date}")
        print(f"Comments: {correction_request.comments}")
        
        # Check if time entries were created/updated
        updated_entries = TimeEntry.objects.filter(
            employee=employee,
            event_time__date=test_date
        )
        print(f"\nUpdated time entries for {test_date}: {updated_entries.count()}")
        for entry in updated_entries:
            print(f"  - {entry.entry_type}: {entry.event_time} (ID: {entry.id})")
            print(f"    Notes: {entry.notes}")
            print(f"    Updated by: {entry.updated_by}")
        
        if response.status_code == 200:
            print(f"\n✅ SUCCESS: Time correction approval workflow completed successfully!")
        else:
            print(f"\n❌ FAILED: Approval workflow failed with status {response.status_code}")
            
    except Exception as e:
        print(f"\n❌ ERROR during approval: {str(e)}")
        import traceback
        traceback.print_exc()

def cleanup_test_data():
    """Clean up test data"""
    print("\nCleaning up test data...")
    
    # Delete test time correction requests
    TimeCorrectionRequest.objects.filter(reason='Test time correction request').delete()
    
    # Delete test time entries
    TimeEntry.objects.filter(notes__contains='Test time correction request').delete()
    
    # Delete test employees
    Employee.objects.filter(employee_id__in=['TL001', 'EMP001']).delete()
    
    # Delete test users
    AuthUser.objects.filter(username__in=['teamleader', 'employee']).delete()
    
    # Delete test department and location
    Department.objects.filter(name='Test Department').delete()
    Location.objects.filter(name='Test Location').delete()
    
    print("Test data cleaned up!")

if __name__ == '__main__':
    try:
        test_approval_workflow()
    except Exception as e:
        print(f"Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # Uncomment the line below if you want to clean up test data
        # cleanup_test_data()
        pass
