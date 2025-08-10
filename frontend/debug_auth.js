// Debug script to check authentication status
// Run this in the browser console to diagnose auth issues

console.log('=== Authentication Debug Info ===');

// Check if tokens exist
const accessToken = localStorage.getItem('access_token');
const refreshToken = localStorage.getItem('refresh_token');
const user = localStorage.getItem('user');
const employee = localStorage.getItem('employee');

console.log('Access Token exists:', !!accessToken);
console.log('Refresh Token exists:', !!refreshToken);
console.log('User data exists:', !!user);
console.log('Employee data exists:', !!employee);

if (accessToken) {
  // Decode JWT token to check expiration
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const expDate = new Date(payload.exp * 1000);
    const now = new Date();
    const isExpired = now > expDate;
    
    console.log('Token expiration:', expDate.toISOString());
    console.log('Current time:', now.toISOString());
    console.log('Token expired:', isExpired);
    console.log('Time until expiration:', Math.floor((expDate - now) / 1000 / 60), 'minutes');
  } catch (e) {
    console.log('Could not decode token:', e.message);
  }
}

// Check API base URL and environment
console.log('API Base URL:', process.env.REACT_APP_API_URL || 'http://localhost:8000/api');
console.log('Domain:', process.env.REACT_APP_DOMAIN || 'localhost');
console.log('Environment:', process.env.REACT_APP_ENVIRONMENT || 'development');

// Test API call
async function testAuth() {
  try {
    const response = await fetch('/api/daily-summaries/time_attendance_report/?employee_id=ALS00010&start_date=2025-07-26&end_date=2025-08-10', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('API Response Data:', data);
    } else {
      const errorData = await response.text();
      console.log('API Error Response:', errorData);
    }
  } catch (error) {
    console.log('API Call Error:', error);
  }
}

// Run test if we have a token
if (accessToken) {
  console.log('Testing API call...');
  testAuth();
} else {
  console.log('No access token found. Please log in first.');
}

console.log('=== End Debug Info ===');
