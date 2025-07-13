#!/usr/bin/env python3
"""
Test script to verify the current session endpoint
"""

import requests
import json

BASE_URL = 'http://localhost:8000'

def test_current_session():
    """Test the current session endpoint"""
    
    # First, try to login to get a token
    login_data = {
        'username': 'testuser',
        'password': 'testpass123'
    }
    
    print("Testing login...")
    login_response = requests.post(f'{BASE_URL}/api/token/', json=login_data)
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code}")
        print(login_response.text)
        return
    
    token_data = login_response.json()
    access_token = token_data['access']
    
    print("Login successful!")
    print(f"Access token: {access_token[:20]}...")
    
    # Test current session endpoint
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    print("\nTesting current session endpoint...")
    session_response = requests.get(f'{BASE_URL}/api/time-entries/current_session/', headers=headers)
    
    print(f"Status code: {session_response.status_code}")
    print(f"Response: {json.dumps(session_response.json(), indent=2)}")
    
    # Test today's entries endpoint as fallback
    print("\nTesting today's entries endpoint...")
    today_response = requests.get(f'{BASE_URL}/api/time-entries/today/', headers=headers)
    
    print(f"Status code: {today_response.status_code}")
    print(f"Response: {json.dumps(today_response.json(), indent=2)}")

if __name__ == '__main__':
    test_current_session() 