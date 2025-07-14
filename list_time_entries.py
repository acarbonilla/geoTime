#!/usr/bin/env python3
import requests
import json

BASE_URL = 'http://localhost:8000'

login_data = {
    'username': 'doejane',
    'password': '$Everyday23'
}

print('Logging in...')
login_response = requests.post(f'{BASE_URL}/api/token/', json=login_data)
if login_response.status_code != 200:
    print('Login failed:', login_response.text)
    exit(1)
access_token = login_response.json()['access']
headers = {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}

print('Getting all time entries (all employees)...')
response = requests.get(f'{BASE_URL}/api/time-entries/?ordering=timestamp', headers=headers)
print('Status:', response.status_code)
entries = response.json()
print(json.dumps(entries, indent=2)) 