#!/usr/bin/env python
"""
Test script for geofencing functionality
Run this script to test the geofencing system with sample data
"""

import requests
import json
from datetime import datetime

# API base URL
BASE_URL = "http://127.0.0.1:8000/api"
TOKEN_URL = "http://127.0.0.1:8000/api/token/"

# Test user credentials (from setup_test_data)
TEST_USERNAME = "doejane"
TEST_PASSWORD = "$Everyday23"

# MHT coordinates
MHT_LAT = 10.29603470
MHT_LON = 123.94988700

# Global variable to store JWT access token
jwt_access_token = None

EMPLOYEE_ID_FIELD = "10001"  # Jane Doe's Employee ID field

def get_jwt_token():
    """Obtain JWT access token using test user credentials"""
    global jwt_access_token
    print("🔑 Obtaining JWT access token...")
    data = {"username": TEST_USERNAME, "password": TEST_PASSWORD}
    try:
        response = requests.post(TOKEN_URL, json=data)
        if response.status_code == 200:
            tokens = response.json()
            jwt_access_token = tokens["access"]
            print("   ✅ JWT access token obtained!")
        else:
            print(f"   ❌ Failed to obtain token: {response.status_code} {response.text}")
            exit(1)
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        exit(1)

def get_auth_headers():
    """Return headers with JWT access token"""
    return {"Authorization": f"Bearer {jwt_access_token}", "Content-Type": "application/json"}

def get_internal_employee_id(employee_id_field):
    """Look up the internal Employee object ID by the 'employee_id' field value."""
    url = f"{BASE_URL}/employees/?search={employee_id_field}"
    response = requests.get(url, headers=get_auth_headers())
    if response.status_code == 200:
        results = response.json().get('results', [])
        for emp in results:
            if emp.get('employee_id') == employee_id_field:
                return emp.get('id')
    print(f"❌ ERROR: Could not find internal ID for
    
    # Test data - coordinates near MHT
    test_cases = [
        {
            "name": "Inside MHT (1m away)",
            "employee_id": internal_id,
            "latitude": MHT_LAT + 0.00001,
            "longitude": MHT_LON + 0.00001,
            "expected": "within"
        },
        {
            "name": "Just Outside MHT (about 101m north)",
            "employee_id": internal_id,
            "latitude": MHT_LAT + 0.00091,  # ~101 meters north
            "longitude": MHT_LON,
            "expected": "outside"
        },
        {
            "name": "Far Away (Manila)",
            "employee_id": internal_id,
            "latitude": 14.5995,
            "longitude": 120.9842,
            "expected": "outside"
        },
        {
            "name": "No Coordinates (Should bypass)",
            "employee_id": internal_id,
            "latitude": None,
            "longitude": None,
            "expected": "bypass"
        }
    ]
    
    for test_case in test_cases:
        print(f"\n📍 Testing: {test_case['name']}")
        
        data = {
            "employee_id": test_case["employee_id"],
            "latitude": test_case["latitude"],
            "longitude": test_case["longitude"]
        }
        
        try:
            response = requests.post(f"{BASE_URL}/geofence/validate/", json=data, headers=get_auth_headers())
            result = response.json()
            
            print(f"   Status: {response.status_code}")
            print(f"   Response: {json.dumps(result, indent=2)}")
            
            if response.status_code == 200:
                if result.get('valid'):
                    print("   ✅ PASS: Validation successful (inside geofence)")
                else:
                    print("   ❌ FAIL: Validation failed (outside geofence)")
            else:
                print("   ❌ FAIL: Request failed")
                
        except requests.exceptions.ConnectionError:
            print("   ❌ ERROR: Cannot connect to server. Make sure Django server is running.")
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")

def test_time_in_with_geofencing():
    """Test time-in with geofencing"""
    print("\n⏰ Testing Time-In with Geofencing...")
    
    # Test coordinates (adjust for your location)
    test_data = {
        "employee_id": 1,
        "latitude": 14.5995,
        "longitude": 120.9842,
        "notes": "Testing geofencing time-in"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/time-in/", json=test_data, headers=get_auth_headers())
        result = response.json()
        
        print(f"   Status: {response.status_code}")
        print(f"   Response: {json.dumps(result, indent=2)}")
        
        if response.status_code == 201:
            print("   ✅ PASS: Time-in successful with geofencing")
        elif response.status_code == 403:
            print("   ❌ FAIL: Geofencing validation failed")
        else:
            print("   ❌ FAIL: Request failed")
            
    except requests.exceptions.ConnectionError:
        print("   ❌ ERROR: Cannot connect to server. Make sure Django server is running.")
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")

def test_login_logout():
    """Test login and logout functionality"""
    print("\n🔐 Testing Login/Logout...")
    
    # Test login
    login_data = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login/", json=login_data)
        result = response.json()
        
        print(f"   Login Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ PASS: Login successful")
            print(f"   User: {result.get('user', {}).get('username')}")
            if result.get('employee'):
                print(f"   Employee: {result.get('employee', {}).get('employee_id')}")
        else:
            print(f"   ❌ FAIL: Login failed - {result.get('error')}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
    
    # Test profile endpoint
    try:
        response = requests.get(f"{BASE_URL}/profile/", headers=get_auth_headers())
        result = response.json()
        
        print(f"   Profile Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ PASS: Profile retrieved successfully")
        else:
            print(f"   ❌ FAIL: Profile failed - {result.get('error')}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")

def test_time_entries():
    """Test getting time entries"""
    print("\n📋 Testing Time Entries...")
    
    try:
        response = requests.get(f"{BASE_URL}/time-entries/", headers=get_auth_headers())
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   Found {len(result.get('results', []))} time entries")
            print("   ✅ PASS: Time entries retrieved successfully")
        else:
            print("   ❌ FAIL: Could not retrieve time entries")
            
    except requests.exceptions.ConnectionError:
        print("   ❌ ERROR: Cannot connect to server. Make sure Django server is running.")
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")

def create_sample_data():
    """Instructions for creating sample data"""
    print("\n📝 To create sample data, follow these steps:")
    print("1. Go to http://127.0.0.1:8000/admin/")
    print("2. Login with your superuser account")
    print("3. Create a Location with these coordinates:")
    print("   - Name: 'Manila Office'")
    print("   - Latitude: 14.5995")
    print("   - Longitude: 120.9842")
    print("   - Geofence Radius: 100 (meters)")
    print("4. Create a Department:")
    print("   - Name: 'IT Department'")
    print("   - Location: Manila Office")
    print("5. Create an Employee:")
    print("   - User: Create a new user")
    print("   - Employee ID: 'EMP001'")
    print("   - Department: IT Department")
    print("   - Position: 'Software Developer'")

def main():
    """Main test function"""
    print("🚀 GeoTime Geofencing Test Suite")
    print("=" * 50)
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/")
        print("✅ Server is running")
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running. Please start Django server first:")
        print("   python manage.py runserver")
        return
    
    # Obtain JWT token
    get_jwt_token()
    
    # Run tests
    test_login_logout()
    test_geofence_validation()
    test_time_in_with_geofencing()
    test_time_entries()
    create_sample_data()
    
    print("\n🎯 Test Summary:")
    print("- If you see 'PASS' messages, your geofencing is working!")
    print("- If you see 'FAIL' messages, check your sample data")
    print("- If you see 'ERROR' messages, check your server connection")

if __name__ == "__main__":
    main() 