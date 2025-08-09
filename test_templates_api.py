import requests
import json

# Test the templates API endpoint
def test_templates_api():
    base_url = "http://localhost:8000/api"
    
    # First, let's try to login to get a token
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        # Login
        login_response = requests.post(f"{base_url}/login/", json=login_data)
        print(f"Login status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            token = login_response.json().get('access')
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test the regular templates endpoint
            print("\n--- Testing /schedule-templates/ ---")
            templates_response = requests.get(f"{base_url}/schedule-templates/", headers=headers)
            print(f"Templates endpoint status: {templates_response.status_code}")
            print(f"Templates response: {templates_response.text}")
            
            # Test the available templates endpoint
            print("\n--- Testing /schedule-templates/available/ ---")
            available_response = requests.get(f"{base_url}/schedule-templates/available/", headers=headers)
            print(f"Available templates status: {available_response.status_code}")
            print(f"Available templates response: {available_response.text}")
            
        else:
            print(f"Login failed: {login_response.text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_templates_api() 