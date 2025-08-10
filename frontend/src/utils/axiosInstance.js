import axios from 'axios';

// Determine the correct API URL based on environment
const getApiUrl = () => {
  // Check if we're in production
  if (window.location.hostname === 'iais.online' || window.location.hostname === 'www.iais.online') {
    return 'https://iais.online/api';
  }
  
  // Check environment variable (using the exact name from production .env)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Fallback to localhost for development
  return 'http://localhost:8000/api';
};

const axiosInstance = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Log the API URL being used
console.log('Axios instance configured with baseURL:', getApiUrl());
console.log('Current hostname:', window.location.hostname);
console.log('Environment:', process.env.REACT_APP_ENVIRONMENT || process.env.REACT_APP_ENV || 'development');
console.log('Domain:', process.env.REACT_APP_DOMAIN || 'localhost');

// Add a request interceptor to include the auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 responses
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If the error status is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          // No refresh token, redirect to login
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        const response = await axios.post(
          `${getApiUrl()}/token/refresh/`,
          { refresh: refreshToken }
        );
        
        const { access } = response.data;
        localStorage.setItem('access_token', access);
        
        // Update the authorization header
        originalRequest.headers.Authorization = `Bearer ${access}`;
        
        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (error) {
        // If refresh fails, redirect to login
        console.error('Error refreshing token:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
