import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
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

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post('http://localhost:8000/api/token/refresh/', {
            refresh: refreshToken
          });
          
          localStorage.setItem('access_token', response.data.access);
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  login: async (username, password) => {
    const response = await axios.post('http://localhost:8000/api/token/', { username, password });
    return response.data;
  },
  
  logout: async () => {
    try {
      await api.post('/api/logout/');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },
  
  getProfile: async () => {
    const response = await api.get('/api/profile/');
    return response.data;
  },
};

// Employee API functions
export const employeeAPI = {
  getEmployees: async (params = {}) => {
    const response = await api.get('/api/employees/', { params });
    return response.data;
  },
  
  getEmployee: async (id) => {
    const response = await api.get(`/api/employees/${id}/`);
    return response.data;
  },
  
  getDashboard: async () => {
    const response = await api.get('/api/dashboard/');
    return response.data;
  },
};

// Time tracking API functions
export const timeAPI = {
  timeIn: async (data) => {
    const response = await api.post('/api/time-in/', data);
    return response.data;
  },
  
  timeOut: async (data) => {
    const response = await api.post('/api/time-out/', data);
    return response.data;
  },
  
  getTimeEntries: async (params = {}) => {
    const response = await api.get('/api/time-entries/', { params });
    return response.data;
  },
  
  getCurrentSession: async () => {
    const response = await api.get('/api/time-entries/current_session/');
    return response.data;
  },
  
  getTimeEntriesToday: async () => {
    const response = await api.get('/api/time-entries/today/');
    return response.data;
  },
  
  getTimeReports: async (params = {}) => {
    const response = await api.get('/api/time-reports/', { params });
    return response.data;
  },
  
  validateGeofence: async (data) => {
    const response = await api.post('/api/geofence/validate/', data);
    return response.data;
  },
};

// Location and Department API functions
export const locationAPI = {
  getLocations: async () => {
    const response = await api.get('/api/locations/');
    return response.data;
  },
  
  getDepartments: async () => {
    const response = await api.get('/api/departments/');
    return response.data;
  },
};

export default api; 