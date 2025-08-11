import axios from '../utils/axiosInstance';

const timeAPI = {
  // Get current session status
  getCurrentSession: async () => {
    const response = await axios.get('time-entries/current_session/');
    return response.data;
  },

  // Get today's time entries
  getTodayEntries: async () => {
    const response = await axios.get('time-entries/today/');
    return response.data;
  },

  // Get today's schedule
  getTodaySchedule: async () => {
    const response = await axios.get('schedules/today/');
    return response.data;
  },

  // Clock in
  clockIn: async (data) => {
    const response = await axios.post('time-in/', data);
    return response.data;
  },

  // Clock out
  clockOut: async (data) => {
    const response = await axios.post('time-out/', data);
    return response.data;
  },

  // Validate geofence
  validateGeofence: async (data) => {
    const response = await axios.post('geofence/validate/', data);
    return response.data;
  },

  // Get employee's department location
  getDepartmentLocation: async () => {
    const response = await axios.get('dashboard/');
    return response.data.employee?.department?.location;
  },

  // Get overtime analysis
  getOvertimeAnalysis: async () => {
    const response = await axios.get('time-entries/overtime-analysis/');
    return response.data;
  },

  // Get team attendance (for team leaders)
  getTeamAttendance: async () => {
    const response = await axios.get('time-entries/team-today/');
    return response.data;
  },

  // Get attendance analytics
  getAttendanceAnalytics: async (params = {}) => {
    const response = await axios.get('time-entries/attendance-analytics/', { params });
    return response.data;
  },

  // Create time correction request
  createTimeCorrection: async (data) => {
    const response = await axios.post('time-correction-requests/', data);
    return response.data;
  },

  // Get time correction requests
  getTimeCorrections: async () => {
    const response = await axios.get('time-correction-requests/');
    return response.data;
  },

  // Create overtime request
  createOvertimeRequest: async (data) => {
    const response = await axios.post('overtime-requests/', data);
    return response.data;
  },

  // Get overtime requests
  getOvertimeRequests: async () => {
    const response = await axios.get('overtime-requests/');
    return response.data;
  },

  // Create leave request
  createLeaveRequest: async (data) => {
    const response = await axios.post('leave-requests/', data);
    return response.data;
  },

  // Get leave requests
  getLeaveRequests: async () => {
    const response = await axios.get('leave-requests/');
    return response.data;
  },

  // Create schedule change request
  createScheduleRequest: async (data) => {
    const response = await axios.post('change-schedule-requests/', data);
    return response.data;
  },

  // Get schedule change requests
  getScheduleRequests: async () => {
    const response = await axios.get('change-schedule-requests/');
    return response.data;
  },

  // Approve request (for team leaders)
  approveRequest: async (requestType, requestId, data = {}) => {
    const response = await axios.post(`${requestType}/${requestId}/approve/`, data);
    return response.data;
  },

  // Reject request (for team leaders)
  rejectRequest: async (requestType, requestId, data = {}) => {
    const response = await axios.post(`${requestType}/${requestId}/reject/`, data);
    return response.data;
  },

  // Get dashboard data
  getDashboard: async () => {
    const response = await axios.get('dashboard/');
    return response.data;
  },

  // Get reports
  getReports: async (params = {}) => {
    const response = await axios.get('reports/', { params });
    return response.data;
  },

  // Download report
  downloadReport: async (params = {}) => {
    const response = await axios.get('reports/download/', { 
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // Get search results
  search: async (query) => {
    const response = await axios.get('search/', { params: { q: query } });
    return response.data;
  },

  // Get employee hierarchy
  getEmployeeHierarchy: async () => {
    const response = await axios.get('employee-hierarchy/');
    return response.data;
  },

  // Get work sessions
  getWorkSessions: async (params = {}) => {
    const response = await axios.get('work-sessions/', { params });
    return response.data;
  },

  // Create work sessions
  createWorkSessions: async (data) => {
    const response = await axios.post('time-entries/create-work-sessions/', data);
    return response.data;
  },

  // Get location data
  getLocations: async () => {
    const response = await axios.get('locations/');
    return response.data;
  },

  // Get departments
  getDepartments: async () => {
    const response = await axios.get('departments/');
    return response.data;
  },

  // Get employees
  getEmployees: async (params = {}) => {
    const response = await axios.get('employees/', { params });
    return response.data;
  },

  // Update employee profile
  updateProfile: async (data) => {
    const response = await axios.patch('employees/profile/', data);
    return response.data;
  },

  // Get notifications
  getNotifications: async () => {
    const response = await axios.get('notifications/');
    return response.data;
  },

  // Mark notification as read
  markNotificationRead: async (notificationId) => {
    const response = await axios.patch(`notifications/${notificationId}/read/`);
    return response.data;
  },

  // Get system statistics
  getSystemStats: async () => {
    const response = await axios.get('system-stats/');
    return response.data;
  }
};

export default timeAPI; 