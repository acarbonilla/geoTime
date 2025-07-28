import axios from 'axios';

// Use relative path for baseURL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
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
  (error) => Promise.reject(error)
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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't handle token refresh for login requests
    if (originalRequest.url === '/login/' || originalRequest.url.endsWith('/login/')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({resolve, reject});
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
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
        // Use the same api instance for refresh
        const response = await api.post('/token/refresh/', { refresh: refreshToken });
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
    const response = await api.post('/login/', credentials);
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/logout/');
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/profile/');
    return response.data;
  },
  refreshToken: async (refreshToken) => {
    const response = await api.post('/token/refresh/', { refresh: refreshToken });
    return response.data;
  },
};

// Employee API functions
export const employeeAPI = {
  getEmployees: async (params = {}) => {
    const response = await api.get('/employees/', { params });
    return response.data;
  },
  getEmployee: async (id) => {
    const response = await api.get(`/employees/${id}/`);
    return response.data;
  },
  getActiveEmployees: async () => {
    const response = await api.get('/employees/active/');
    return response.data;
  },
  getEmployeesByDepartment: async (departmentId) => {
    const response = await api.get('/employees/by_department/', { 
      params: { department_id: departmentId } 
    });
    return response.data;
  },
  getEmployeesByLocation: async (locationId) => {
    const response = await api.get('/employees/by_location/', { 
      params: { location_id: locationId } 
    });
    return response.data;
  },
  getSubordinates: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/subordinates/`);
    return response.data;
  },
  getEmployeeProfile: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/profile/`);
    return response.data;
  },
  getEmployeeStatistics: async () => {
    const response = await api.get('/employees/statistics/');
    return response.data;
  },
};

// Department API functions
export const departmentAPI = {
  getDepartments: async (params = {}) => {
    const response = await api.get('/departments/', { params });
    return response.data;
  },
  getDepartment: async (id) => {
    const response = await api.get(`/departments/${id}/`);
    return response.data;
  },
  getActiveDepartments: async () => {
    const response = await api.get('/departments/active/');
    return response.data;
  },
  getDepartmentEmployees: async (departmentId) => {
    const response = await api.get(`/departments/${departmentId}/employees/`);
    return response.data;
  },
  getDepartmentStatistics: async (departmentId) => {
    const response = await api.get(`/departments/${departmentId}/statistics/`);
    return response.data;
  },
};

// Location API functions
export const locationAPI = {
  getLocations: async (params = {}) => {
    const response = await api.get('/locations/', { params });
    return response.data;
  },
  getLocation: async (id) => {
    const response = await api.get(`/locations/${id}/`);
    return response.data;
  },
  getCountries: async () => {
    const response = await api.get('/locations/countries/');
    return response.data;
  },
  getTimezones: async () => {
    const response = await api.get('/locations/timezones/');
    return response.data;
  },
  getLocationDepartments: async (locationId) => {
    const response = await api.get(`/locations/${locationId}/departments/`);
    return response.data;
  },
};

// Time tracking API functions
export const timeAPI = {
  timeIn: async (data) => {
    const response = await api.post('/time-in/', data);
    return response.data;
  },
  timeOut: async (data) => {
    const response = await api.post('/time-out/', data);
    return response.data;
  },
  getTimeEntries: async (params = {}) => {
    const response = await api.get('/time-entries/', { params });
    return response.data;
  },
  getCurrentSession: async () => {
    const response = await api.get('/time-entries/current_session/');
    return response.data;
  },
  getTimeEntriesToday: async () => {
    const response = await api.get('/time-entries/today/');
    return response.data;
  },
  getTimeReports: async (params = {}) => {
    const response = await api.get('/time-reports/', { params });
    return response.data;
  },
  validateGeofence: async (data) => {
    const response = await api.post('/geofence/validate/', data);
    return response.data;
  },
  // New overtime-related endpoints
  getOvertimeAnalysis: async (date = null) => {
    const params = date ? { date } : {};
    const response = await api.get('/time-entries/overtime_analysis/', { params });
    return response.data;
  },
  createWorkSessions: async (date = null) => {
    const data = date ? { date } : {};
    const response = await api.post('/time-entries/create_work_sessions/', data);
    return response.data;
  },
};

// Work Session API functions
export const workSessionAPI = {
  getWorkSessions: async (params = {}) => {
    const response = await api.get('/work-sessions/', { params });
    return response.data;
  },
  getWorkSession: async (id) => {
    const response = await api.get(`/work-sessions/${id}/`);
    return response.data;
  },
  getTodayWorkSessions: async () => {
    const response = await api.get('/work-sessions/today/');
    return response.data;
  },
  getWorkSessionsByDate: async (date) => {
    const response = await api.get('/work-sessions/by_date/', { 
      params: { date } 
    });
    return response.data;
  },
};

// Dashboard API functions
export const dashboardAPI = {
  getDashboard: async () => {
    const response = await api.get('/dashboard/');
    return response.data;
  },
};

// Search API functions
export const searchAPI = {
  search: async (query, type = 'all') => {
    const response = await api.get('/search/', { 
      params: { q: query, type } 
    });
    return response.data;
  },
};

// Employee Hierarchy API functions
export const hierarchyAPI = {
  getHierarchy: async () => {
    const response = await api.get('/hierarchy/');
    return response.data;
  },
};

// Approval API functions
export const approvalAPI = {
  // Overtime requests
  getOvertimeRequests: async (params = {}) => {
    const response = await api.get('/overtime-requests/', { params });
    return response.data;
  },
  updateOvertimeRequest: async (id, data) => {
    const response = await api.patch(`/overtime-requests/${id}/`, data);
    return response.data;
  },
  approveOvertimeRequest: async (id, data = {}) => {
    const response = await api.post(`/overtime-requests/${id}/approve/`, data);
    return response.data;
  },
  rejectOvertimeRequest: async (id, data = {}) => {
    const response = await api.post(`/overtime-requests/${id}/reject/`, data);
    return response.data;
  },

  // Leave requests
  getLeaveRequests: async (params = {}) => {
    const response = await api.get('/leave-requests/', { params });
    return response.data;
  },
  updateLeaveRequest: async (id, data) => {
    const response = await api.patch(`/leave-requests/${id}/`, data);
    return response.data;
  },
  approveLeaveRequest: async (id, data = {}) => {
    const response = await api.post(`/leave-requests/${id}/approve/`, data);
    return response.data;
  },
  rejectLeaveRequest: async (id, data = {}) => {
    const response = await api.post(`/leave-requests/${id}/reject/`, data);
    return response.data;
  },

  // Change schedule requests
  getChangeScheduleRequests: async (params = {}) => {
    const response = await api.get('/change-schedule-requests/', { params });
    return response.data;
  },
  updateChangeScheduleRequest: async (id, data) => {
    const response = await api.patch(`/change-schedule-requests/${id}/`, data);
    return response.data;
  },
  approveChangeScheduleRequest: async (id, data = {}) => {
    const response = await api.post(`/change-schedule-requests/${id}/approve/`, data);
    return response.data;
  },
  rejectChangeScheduleRequest: async (id, data = {}) => {
    const response = await api.post(`/change-schedule-requests/${id}/reject/`, data);
    return response.data;
  },

  // Time correction requests
  getTimeCorrectionRequests: async (params = {}) => {
    const response = await api.get('/time-correction-requests/', { params });
    return response.data;
  },
  approveTimeCorrectionRequest: async (id, data = {}) => {
    const response = await api.post(`/time-correction-requests/${id}/approve/`, data);
    return response.data;
  },
  rejectTimeCorrectionRequest: async (id, data = {}) => {
    const response = await api.post(`/time-correction-requests/${id}/reject/`, data);
    return response.data;
  },
};

export default api; 