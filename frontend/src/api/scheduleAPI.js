import axios from '../utils/axiosInstance';

// Schedule Management API Functions

// Get employee schedules for a date range
export const getEmployeeSchedules = async (startDate, endDate) => {
  try {
    const response = await axios.get('/schedules/', {
      params: {
        start_date: startDate,
        end_date: endDate
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching schedules:', error);
    throw error;
  }
};

// Create a new schedule
export const createSchedule = async (scheduleData) => {
  try {
    const response = await axios.post('/schedules/', scheduleData);
    return response.data;
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
};

// Update an existing schedule
export const updateSchedule = async (scheduleId, scheduleData) => {
  try {
    const response = await axios.put(`/schedules/${scheduleId}/`, scheduleData);
    return response.data;
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
};

// Delete a schedule
export const deleteSchedule = async (scheduleId) => {
  try {
    const response = await axios.delete(`/schedules/${scheduleId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
};

// Get available templates
export const getAvailableTemplates = async () => {
  try {
    // Use the 'available' action endpoint which calls get_available_templates function
    const response = await axios.get('/schedule-templates/available/');
    // Ensure we always return an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching templates:', error);
    // Return empty array on error to prevent map errors
    return [];
  }
};

// Create a new template
export const createTemplate = async (templateData) => {
  try {
    const response = await axios.post('/schedule-templates/', templateData);
    return response.data;
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
};

// Update an existing template
export const updateTemplate = async (templateId, templateData) => {
  try {
    const response = await axios.put(`/schedule-templates/${templateId}/`, templateData);
    return response.data;
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
};

// Delete a template
export const deleteTemplate = async (templateId) => {
  try {
    const response = await axios.delete(`/schedule-templates/${templateId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
};

// Apply template to schedule (bulk operation)
export const applyTemplateToSchedule = async (templateId, bulkData) => {
  try {
    const response = await axios.post('/schedules/apply_template/', {
      template_id: templateId,
      ...bulkData
    });
    return response.data;
  } catch (error) {
    console.error('Error applying template:', error);
    throw error;
  }
};

export const checkExistingSchedules = async (bulkData) => {
  try {
    const response = await axios.post('/schedules/check_existing_schedules/', bulkData);
    return response.data;
  } catch (error) {
    console.error('Error checking existing schedules:', error);
    throw error;
  }
};

// Copy schedule from previous month
export const copyScheduleFromPreviousMonth = async (targetMonth, targetYear, flipAmPm = false) => {
  try {
    const response = await axios.post('/schedules/copy_previous_month/', {
      target_month: targetMonth,
      target_year: targetYear,
      flip_am_pm: flipAmPm
    });
    return response.data;
  } catch (error) {
    console.error('Error copying previous month schedule:', error);
    throw error;
  }
};

// Get daily time summaries for reporting
export const getDailyTimeSummaries = async (startDate, endDate) => {
  try {
    const response = await axios.get('/daily-summaries/', {
      params: {
        start_date: startDate,
        end_date: endDate
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching daily summaries:', error);
    throw error;
  }
};

// Generate daily summaries for a period
export const generateDailySummaries = async (startDate, endDate) => {
  try {
    const response = await axios.post('/daily-summaries/generate/', {
      start_date: startDate,
      end_date: endDate
    });
    return response.data;
  } catch (error) {
    console.error('Error generating daily summaries:', error);
    throw error;
  }
};

// Get employee schedule report
export const getEmployeeScheduleReport = async (startDate, endDate) => {
  try {
    const response = await axios.get('/schedules/report/', {
      params: {
        start_date: startDate,
        end_date: endDate
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching schedule report:', error);
    throw error;
  }
};

// Get time attendance report
export const getTimeAttendanceReport = async (filters) => {
  try {
    console.log('getTimeAttendanceReport called with filters:', filters);
    
    const params = new URLSearchParams({
      employee_id: filters.employeeId,
      start_date: filters.startDate,
      end_date: filters.endDate
    });
    
    console.log('Making request to:', `/daily-summaries/time_attendance_report/?${params}`);
    
    const response = await axios.get(`/daily-summaries/time_attendance_report/?${params}`);
    console.log('Response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching time attendance report:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw error;
  }
};

// Utility function to format time for display
export const formatTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Utility function to calculate duration between two times
export const calculateDuration = (timeIn, timeOut, isNightShift = false) => {
  if (!timeIn || !timeOut) return 0;
  
  const [inHours, inMinutes] = timeIn.split(':').map(Number);
  const [outHours, outMinutes] = timeOut.split(':').map(Number);
  
  let startMinutes = inHours * 60 + inMinutes;
  let endMinutes = outHours * 60 + outMinutes;
  
  if (isNightShift && endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours for night shift
  }
  
  const durationMinutes = endMinutes - startMinutes;
  return durationMinutes / 60; // Return hours
}; 