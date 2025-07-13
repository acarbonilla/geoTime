#!/usr/bin/env python3
"""
Test script for Time In/Out API endpoints
"""
import requests
import json
from datetime import datetime

# API base URL
BASE_URL = "http://localhost:8000"

def test_api_endpoints():
    """Test the time tracking API endpoints"""
    
    print("🧪 Testing Time In/Out API Endpoints")
    print("=" * 50)
    
    # Test 1: Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/api/")
        print(f"✅ Server is running: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running. Please start the Django server first.")
        return
    
    # Test 2: Test login endpoint
    print("\n🔐 Testing Login Endpoint...")
    login_data = {
        "username": "doejane",  # You'll need to create this user
        "password": "$Everyday23"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/token/", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get('access')
            print(f"✅ Login successful: {response.status_code}")
            print(f"   Access token: {access_token[:20]}...")
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Set up headers for authenticated requests
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Test 3: Test current session endpoint
    print("\n📊 Testing Current Session Endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/time-entries/current-session/", headers=headers)
        print(f"✅ Current session: {response.status_code}")
        if response.status_code == 200:
            session_data = response.json()
            print(f"   Status: {session_data.get('status', 'N/A')}")
            print(f"   Today entries: {len(session_data.get('today_entries', []))}")
    except Exception as e:
        print(f"❌ Current session error: {e}")
    
    # Test 4: Test time-in endpoint (this will fail without proper employee data)
    print("\n⏰ Testing Time-In Endpoint...")
    time_in_data = {
        "employee_id": 1,  # This assumes employee ID 1 exists
        "latitude": None,  # Test without coordinates first
        "longitude": None,
        "notes": "Test time in"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/time-in/", json=time_in_data, headers=headers)
        print(f"Time-in response: {response.status_code}")
        if response.status_code == 201:
            print("✅ Time-in successful")
        elif response.status_code == 400:
            print(f"⚠️  Time-in validation error: {response.json()}")
        elif response.status_code == 403:
            print(f"⚠️  Time-in geofence error: {response.json()}")
        else:
            print(f"❌ Time-in failed: {response.text}")
    except Exception as e:
        print(f"❌ Time-in error: {e}")
    
    # Test 5: Test time-out endpoint
    print("\n⏰ Testing Time-Out Endpoint...")
    time_out_data = {
        "employee_id": 1,
        "latitude": None,  # Test without coordinates first
        "longitude": None,
        "notes": "Test time out"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/time-out/", json=time_out_data, headers=headers)
        print(f"Time-out response: {response.status_code}")
        if response.status_code == 201:
            print("✅ Time-out successful")
        elif response.status_code == 400:
            print(f"⚠️  Time-out validation error: {response.json()}")
        elif response.status_code == 403:
            print(f"⚠️  Time-out geofence error: {response.json()}")
        else:
            print(f"❌ Time-out failed: {response.text}")
    except Exception as e:
        print(f"❌ Time-out error: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Test Summary:")
    print("- Backend server should be running on http://localhost:8000")
    print("- Frontend should be running on http://localhost:3000")
    print("- Check browser console for any JavaScript errors")
    print("- Test the Time In/Out buttons in the Employee Dashboard")

if __name__ == "__main__":
    test_api_endpoints() 