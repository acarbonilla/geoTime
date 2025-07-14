import axios from 'axios';
import axiosInstance from './axiosInstance';

// Use axiosInstance for all API calls
const api = axiosInstance;

// --- Improved JWT Refresh Logic with Queue ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request until the refresh is done
        return new Promise(function(resolve, reject) {
          failedQueue.push({resolve, reject});
        })
        .then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return api(originalRequest);
        })
        .catch(err => Promise.reject(err));
      }
      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(new Error('No refresh token'));
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(error);
      }
      try {
        const response = await axios.post('http://localhost:8000/api/token/refresh/', {
          refresh: refreshToken
        });
        const newAccessToken = response.data.access;
        localStorage.setItem('access_token', newAccessToken);
        api.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  login: async (username, password) => {
    // Use axios directly for login (no credentials needed yet)
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