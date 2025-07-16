import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
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

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({resolve, reject});
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/token/refresh/`,
          { refresh: refreshToken }
        );
        
        const { access } = response.data;
        localStorage.setItem('access_token', access);
        
        api.defaults.headers.common['Authorization'] = 'Bearer ' + access;
        originalRequest.headers['Authorization'] = 'Bearer ' + access;
        
        processQueue(null, access);
        isRefreshing = false;
        
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Authentication API functions
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/api/login/', credentials);
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/api/logout/');
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/api/profile/');
    return response.data;
  },
  
  refreshToken: async (refreshToken) => {
    const response = await api.post('/api/token/refresh/', { refresh: refreshToken });
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
  
  getActiveEmployees: async () => {
    const response = await api.get('/api/employees/active/');
    return response.data;
  },
  
  getEmployeesByDepartment: async (departmentId) => {
    const response = await api.get('/api/employees/by_department/', { 
      params: { department_id: departmentId } 
    });
    return response.data;
  },
  
  getEmployeesByLocation: async (locationId) => {
    const response = await api.get('/api/employees/by_location/', { 
      params: { location_id: locationId } 
    });
    return response.data;
  },
  
  getSubordinates: async (employeeId) => {
    const response = await api.get(`/api/employees/${employeeId}/subordinates/`);
    return response.data;
  },
  
  getEmployeeProfile: async (employeeId) => {
    const response = await api.get(`/api/employees/${employeeId}/profile/`);
    return response.data;
  },
  
  getEmployeeStatistics: async () => {
    const response = await api.get('/api/employees/statistics/');
    return response.data;
  },
};

// Department API functions
export const departmentAPI = {
  getDepartments: async (params = {}) => {
    const response = await api.get('/api/departments/', { params });
    return response.data;
  },
  
  getDepartment: async (id) => {
    const response = await api.get(`/api/departments/${id}/`);
    return response.data;
  },
  
  getActiveDepartments: async () => {
    const response = await api.get('/api/departments/active/');
    return response.data;
  },
  
  getDepartmentEmployees: async (departmentId) => {
    const response = await api.get(`/api/departments/${departmentId}/employees/`);
    return response.data;
  },
  
  getDepartmentStatistics: async (departmentId) => {
    const response = await api.get(`/api/departments/${departmentId}/statistics/`);
    return response.data;
  },
};

// Location API functions
export const locationAPI = {
  getLocations: async (params = {}) => {
    const response = await api.get('/api/locations/', { params });
    return response.data;
  },
  
  getLocation: async (id) => {
    const response = await api.get(`/api/locations/${id}/`);
    return response.data;
  },
  
  getCountries: async () => {
    const response = await api.get('/api/locations/countries/');
    return response.data;
  },
  
  getTimezones: async () => {
    const response = await api.get('/api/locations/timezones/');
    return response.data;
  },
  
  getLocationDepartments: async (locationId) => {
    const response = await api.get(`/api/locations/${locationId}/departments/`);
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
  
  // New overtime-related endpoints
  getOvertimeAnalysis: async (date = null) => {
    const params = date ? { date } : {};
    const response = await api.get('/api/time-entries/overtime_analysis/', { params });
    return response.data;
  },
  
  createWorkSessions: async (date = null) => {
    const data = date ? { date } : {};
    const response = await api.post('/api/time-entries/create_work_sessions/', data);
    return response.data;
  },
};

// Work Session API functions
export const workSessionAPI = {
  getWorkSessions: async (params = {}) => {
    const response = await api.get('/api/work-sessions/', { params });
    return response.data;
  },
  
  getWorkSession: async (id) => {
    const response = await api.get(`/api/work-sessions/${id}/`);
    return response.data;
  },
  
  getTodayWorkSessions: async () => {
    const response = await api.get('/api/work-sessions/today/');
    return response.data;
  },
  
  getWorkSessionsByDate: async (date) => {
    const response = await api.get('/api/work-sessions/by_date/', { 
      params: { date } 
    });
    return response.data;
  },
};

// Dashboard API functions
export const dashboardAPI = {
  getDashboard: async () => {
    const response = await api.get('/api/dashboard/');
    return response.data;
  },
};

// Search API functions
export const searchAPI = {
  search: async (query, type = 'all') => {
    const response = await api.get('/api/search/', { 
      params: { q: query, type } 
    });
    return response.data;
  },
};

// Employee Hierarchy API functions
export const hierarchyAPI = {
  getHierarchy: async () => {
    const response = await api.get('/api/hierarchy/');
    return response.data;
  },
};

export default api; 