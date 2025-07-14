#!/usr/bin/env python3
"""
Test script to create time entries with location data
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = 'http://localhost:8000'

def test_time_entries_with_location():
    """Test time-in with location data"""
    
    # Login
    login_data = {
        'username': 'doejane',
        'password': '$Everyday23'
    }
    
    print("Logging in...")
    login_response = requests.post(f'{BASE_URL}/api/token/', json=login_data)
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code}")
        print(login_response.text)
        return
    
    token_data = login_response.json()
    access_token = token_data['access']
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # Get user profile to get employee_id
    print("\nGetting user profile...")
    profile_response = requests.get(f'{BASE_URL}/api/profile/', headers=headers)
    profile_data = profile_response.json()
    employee_id = profile_data['employee']['id']
    
    print(f"Employee ID: {employee_id}")
    
    # Get available locations
    print("\nGetting available locations...")
    locations_response = requests.get(f'{BASE_URL}/api/locations/', headers=headers)
    locations_data = locations_response.json()
    
    if locations_data.get('results'):
        location_id = locations_data['results'][0]['id']
        print(f"Using location ID: {location_id}")
        print(f"Location: {locations_data['results'][0]['name']}")
    else:
        print("No locations available")
        return
    
    # First, time out to allow time in
    time_out_data = {
        'employee_id': employee_id,
        'notes': 'Test time out before time in with location'
    }
    
    print("\nPerforming Time Out...")
    time_out_response = requests.post(f'{BASE_URL}/api/time-out/', json=time_out_data, headers=headers)
    print(f"Time Out Status: {time_out_response.status_code}")
    
    # Time In with location
    time_in_data = {
        'employee_id': employee_id,
        'location_id': location_id,
        'notes': 'Test time in with location'
    }
    
    print("\nPerforming Time In with location...")
    time_in_response = requests.post(f'{BASE_URL}/api/time-in/', json=time_in_data, headers=headers)
    
    print(f"Time In Status: {time_in_response.status_code}")
    if time_in_response.status_code == 200:
        print("Time In successful!")
        print(json.dumps(time_in_response.json(), indent=2))
    else:
        print("Time In failed:")
        print(json.dumps(time_in_response.json(), indent=2))
    
    # Check current session
    print("\nChecking current session...")
    session_response = requests.get(f'{BASE_URL}/api/time-entries/current_session/', headers=headers)
    print(f"Session Status: {session_response.status_code}")
    print(json.dumps(session_response.json(), indent=2))
    
    # Check today's entries
    print("\nChecking today's entries...")
    today_response = requests.get(f'{BASE_URL}/api/time-entries/today/', headers=headers)
    print(f"Today Status: {today_response.status_code}")
    print(json.dumps(today_response.json(), indent=2))

if __name__ == '__main__':
    test_time_entries_with_location() 