import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import ScheduleEntryModal from '../Employee_Schedule/ScheduleEntryModal';
import TemplateManagement from '../Employee_Schedule/TemplateManagement';
import BulkScheduleModal from '../Employee_Schedule/BulkScheduleModal';
import { getEmployeeSchedules, createSchedule, updateSchedule, deleteSchedule, applyTemplateToSchedule, formatTime } from '../api/scheduleAPI';
import { toast } from 'react-toastify';
import axiosInstance from '../utils/axiosInstance';

const localizer = momentLocalizer(moment);

const TeamLeaderScheduleManagement = () => {
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState('');
  const [showTeamView, setShowTeamView] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState('');

  // Date validation functions
  const isPastDate = (date) => {
    const today = moment().startOf('day');
    const checkDate = moment(date).startOf('day');
    const result = checkDate.isBefore(today);
    console.log(`isPastDate: ${moment(date).format('YYYY-MM-DD')} vs ${today.format('YYYY-MM-DD')} = ${result}`);
    return result;
  };

  const isToday = (date) => {
    const today = moment().startOf('day');
    const checkDate = moment(date).startOf('day');
    const result = checkDate.isSame(today);
    console.log(`isToday: ${moment(date).format('YYYY-MM-DD')} vs ${today.format('YYYY-MM-DD')} = ${result}`);
    console.log(`isToday details: checkDate=${checkDate.format()}, today=${today.format()}`);
    return result;
  };

  const isFutureDate = (date) => {
    const today = moment().startOf('day');
    const checkDate = moment(date).startOf('day');
    const result = checkDate.isAfter(today);
    console.log(`isFutureDate: ${moment(date).format('YYYY-MM-DD')} vs ${today.format('YYYY-MM-DD')} = ${result}`);
    return result;
  };

  const canModifySchedule = (date) => {
    const result = isFutureDate(date) || isToday(date);
    console.log(`canModifySchedule: ${moment(date).format('YYYY-MM-DD')} = ${result}`);
    return result;
  };

  // Alternative date validation using string comparison (more reliable)
  const isPastDateString = (date) => {
    const todayStr = moment().format('YYYY-MM-DD');
    const checkDateStr = moment(date).format('YYYY-MM-DD');
    const result = checkDateStr < todayStr;
    console.log(`isPastDateString: ${checkDateStr} vs ${todayStr} = ${result}`);
    return result;
  };

  const isTodayString = (date) => {
    const todayStr = moment().format('YYYY-MM-DD');
    const checkDateStr = moment(date).format('YYYY-MM-DD');
    const result = checkDateStr === todayStr;
    console.log(`isTodayString: ${checkDateStr} vs ${todayStr} = ${result}`);
    return result;
  };

  const isFutureDateString = (date) => {
    const todayStr = moment().format('YYYY-MM-DD');
    const checkDateStr = moment(date).format('YYYY-MM-DD');
    const result = checkDateStr > todayStr;
    console.log(`isFutureDateString: ${checkDateStr} vs ${todayStr} = ${result}`);
    return result;
  };

  const getDateStatusMessage = (date) => {
    if (isPastDate(date)) {
      return 'Past date - cannot be modified';
    } else if (isToday(date)) {
      return 'Today - can be modified';
    } else {
      return 'Future date - can be modified';
    }
  };

  // Debug function to test date validation
  const testDateValidation = () => {
    const today = moment();
    const yesterday = moment().subtract(1, 'day');
    const tomorrow = moment().add(1, 'day');
    
    console.log('=== Date Validation Test ===');
    console.log('Today:', today.format('YYYY-MM-DD'));
    console.log('Yesterday:', yesterday.format('YYYY-MM-DD'));
    console.log('Tomorrow:', tomorrow.format('YYYY-MM-DD'));
    
    console.log('--- Moment-based validation ---');
    console.log('Yesterday isPastDate:', isPastDate(yesterday));
    console.log('Today isToday:', isToday(today));
    console.log('Tomorrow isFutureDate:', isFutureDate(today));
    
    console.log('Yesterday canModify:', canModifySchedule(yesterday));
    console.log('Today canModify:', canModifySchedule(today));
    console.log('Tomorrow canModify:', canModifySchedule(tomorrow));
    
    console.log('--- String-based validation ---');
    console.log('Yesterday isPastDateString:', isPastDateString(yesterday));
    console.log('Today isTodayString:', isTodayString(today));
    console.log('Tomorrow isFutureDateString:', isFutureDateString(tomorrow));
  };

  // Debug function to test dashboard data
  const testDashboardData = async () => {
    try {
      console.log('=== Testing Dashboard Data ===');
      const currentEmployeeRes = await axiosInstance.get('dashboard/');
      console.log('Dashboard response:', currentEmployeeRes.data);
      console.log('Employee data:', currentEmployeeRes.data.employee);
      
      if (currentEmployeeRes.data.employee) {
        const emp = currentEmployeeRes.data.employee;
        console.log('Employee ID:', emp.id);
        console.log('Employee ID string:', emp.employee_id);
        console.log('Employee name:', emp.first_name, emp.last_name);
        console.log('Employee role:', emp.role);
      }
    } catch (error) {
      console.error('Error testing dashboard data:', error);
    }
  };

  // Debug function to test team member access
  const testTeamMemberAccess = async () => {
    try {
      console.log('=== Testing Team Member Access ===');
      
      // Test team members endpoint
      const teamMembersRes = await axiosInstance.get('schedules/team_members/');
      console.log('Team members response:', teamMembersRes.data);
      
      // Test team schedules endpoint
      const teamSchedulesRes = await axiosInstance.get('schedules/team_schedules/', {
        params: {
          start_date: moment().startOf('month').format('YYYY-MM-DD'),
          end_date: moment().endOf('month').format('YYYY-MM-DD')
        }
      });
      console.log('Team schedules response:', teamSchedulesRes.data);
      
    } catch (error) {
      console.error('Error testing team member access:', error);
    }
  };

  // Debug function to test individual team member schedule loading
  const testTeamMemberScheduleLoading = async () => {
    try {
      console.log('=== Testing Team Member Schedule Loading ===');
      
      if (!teamMembers.length) {
        console.log('No team members available');
        return;
      }
      
      // Test with first team member
      const firstMember = teamMembers[0];
      console.log('Testing with team member:', firstMember);
      
      const startDate = moment().startOf('month').format('YYYY-MM-DD');
      const endDate = moment().endOf('month').format('YYYY-MM-DD');
      
      console.log('Loading schedules for:', firstMember.employee_id, 'DB ID:', firstMember.id);
      console.log('Date range:', startDate, 'to', endDate);
      
      const data = await getEmployeeSchedules(startDate, endDate, firstMember.id);
      console.log('Schedules loaded:', data);
      
    } catch (error) {
      console.error('Error testing team member schedule loading:', error);
    }
  };

  useEffect(() => {
    checkUserRole().catch(error => {
      console.error('Error in checkUserRole:', error);
    });
  }, []);

  useEffect(() => {
    if (currentEmployeeId) {
      loadTeamMembers();
    }
  }, [currentEmployeeId]);

  useEffect(() => {
    if (currentEmployeeId) {
      loadSchedules();
    }
  }, [currentMonth, selectedTeamMember, currentEmployeeId]);

  const checkUserRole = async () => {
    try {
      // Get current employee data from dashboard endpoint
      const currentEmployeeRes = await axiosInstance.get('dashboard/');
      const currentEmployee = currentEmployeeRes.data.employee;
      
      if (!currentEmployee) {
        console.error('No employee data found from dashboard');
        toast.error('User information not available');
        return;
      }
      
      // Only allow team leaders
      if (currentEmployee.role !== 'team_leader') {
        toast.error('Access denied. This feature is only available for Team Leaders.');
        // Redirect to appropriate dashboard
        window.location.href = '/employee-dashboard';
        return;
      }
      
      setCurrentEmployeeId(currentEmployee.id);
      
      // Load team members after setting the employee ID
      await loadTeamMembers();
      
    } catch (error) {
      console.error('Error getting employee data:', error);
      toast.error('Error loading user information');
    }
  };

  const loadTeamMembers = async () => {
    try {
      console.log('=== loadTeamMembers called ===');
      console.log('Current employee ID:', currentEmployeeId);
      
      // First, fetch the current user's employee data from dashboard endpoint
      const currentEmployeeRes = await axiosInstance.get('dashboard/');
      const currentEmployee = currentEmployeeRes.data.employee;
      
      if (!currentEmployee) {
        console.error('No employee data found from dashboard');
        setTeamMembers([]);
        return;
      }
      
      console.log('Current employee from dashboard:', currentEmployee);
      setCurrentEmployeeId(currentEmployee.id);
      
      console.log('Fetching subordinates for employee ID:', currentEmployee.id);
      console.log('Access token:', localStorage.getItem('access_token'));
      console.log('API URL:', `employees/${currentEmployee.id}/subordinates/`);
      const response = await axiosInstance.get(`employees/${currentEmployee.id}/subordinates/`);
      
      console.log('Team members loaded:', response.data);
      console.log('Response status:', response.status);
      
      if (Array.isArray(response.data)) {
        console.log('Setting team members, count:', response.data.length);
        setTeamMembers(response.data);
        // Load schedules after team members are loaded
        loadSchedules();
      } else {
        console.error('Data is not an array:', response.data);
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
      setTeamMembers([]);
      toast.error('Error loading team members');
    }
  };

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const startDate = currentMonth.startOf('month').format('YYYY-MM-DD');
      const endDate = currentMonth.endOf('month').format('YYYY-MM-DD');
      
      console.log('=== loadSchedules called ===');
      console.log('selectedTeamMember:', selectedTeamMember);
      console.log('teamMembers state:', teamMembers);
      console.log('Date range:', startDate, 'to', endDate);
      
      // Determine which employee's schedules to load
      let employeeId = null;
      
      if (selectedTeamMember) {
        // Load schedules for selected team member
        // Find the team member by employee_id to get their database ID
        const teamMember = teamMembers.find(m => m.employee_id === selectedTeamMember);
        if (teamMember) {
          employeeId = teamMember.id; // Use database ID, not employee_id string
          console.log('Loading schedules for selected team member:', teamMember.employee_id, 'DB ID:', teamMember.id);
        } else {
          console.error('Team member not found for employee_id:', selectedTeamMember);
          toast.error('Selected team member not found');
          setLoading(false);
          return;
        }
      } else {
        // Load schedules for current user (team leader)
        // We need to get the database ID from the dashboard data
        const currentEmployeeRes = await axiosInstance.get('dashboard/');
        const currentEmployee = currentEmployeeRes.data.employee;
        employeeId = currentEmployee.id; // Use database ID, not employee_id string
        console.log('Loading schedules for team leader:', currentEmployee.employee_id, 'DB ID:', currentEmployee.id);
      }
      
      console.log('Final employeeId to load schedules for:', employeeId);
      console.log('Selected team member details:', teamMembers.find(m => m.employee_id === selectedTeamMember));
      
      if (!employeeId) {
        toast.error('Employee information not available');
        setLoading(false);
        return;
      }
      
      console.log('Calling getEmployeeSchedules with:', { startDate, endDate, employeeId });
      console.log('API URL will be: /schedules/?start_date=' + startDate + '&end_date=' + endDate + '&employee=' + employeeId);
      
      const data = await getEmployeeSchedules(startDate, endDate, employeeId);
      console.log('Schedules data received:', data);
      console.log('Schedules data type:', typeof data);
      console.log('Schedules data length:', Array.isArray(data) ? data.length : 'Not an array');
      console.log('Setting schedules state with:', data);
      
      setSchedules(data);
      console.log('Schedules state set to:', data);
      console.log('Current schedules state after setState:', schedules);
      
      // Force a re-render check
      setTimeout(() => {
        console.log('Schedules state after 100ms delay:', schedules);
        console.log('Schedules state length after delay:', Array.isArray(schedules) ? schedules.length : 'Not an array');
      }, 100);
      
      if (selectedTeamMember) {
        const teamMember = teamMembers.find(m => m.employee_id === selectedTeamMember);
        const memberName = teamMember ? `${teamMember.first_name} ${teamMember.last_name}` : 'team member';
        toast.success(`${memberName}'s schedules loaded successfully. Found ${Array.isArray(data) ? data.length : 0} schedules.`);
      } else {
        toast.success(`Your schedules loaded successfully. Found ${Array.isArray(data) ? data.length : 0} schedules.`);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
      
      // Handle specific error messages from backend
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(error.response.data.error);
      } else if (error.response && error.response.data && typeof error.response.data === 'string') {
        if (error.response.data.includes('<!DOCTYPE html>')) {
          toast.error('Server error occurred. Please check the console for details.');
        } else {
          toast.error(error.response.data);
        }
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to load schedules');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = ({ start }) => {
    console.log('handleSelectSlot called with date:', moment(start).format('YYYY-MM-DD'));
    console.log('isPastDate result:', isPastDate(start));
    console.log('isToday result:', isToday(start));
    console.log('canModifySchedule result:', canModifySchedule(start));
    console.log('String-based validation:');
    console.log('isPastDateString result:', isPastDateString(start));
    console.log('isTodayString result:', isTodayString(start));
    
    if (isPastDateString(start)) {
      const dateStr = moment(start).format('MMMM D, YYYY');
      toast.warning(`Cannot create schedule on ${dateStr} (past date). Only today and future dates can be modified.`);
      return;
    }
    
    setSelectedDate(start);
    setSelectedSchedule(null);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event) => {
    console.log('handleSelectEvent called with date:', moment(event.start).format('YYYY-MM-DD'));
    console.log('isPastDate result:', isPastDate(event.start));
    console.log('isToday result:', isToday(event.start));
    console.log('canModifySchedule result:', canModifySchedule(event.start));
    console.log('String-based validation:');
    console.log('isPastDateString result:', isPastDateString(event.start));
    console.log('isTodayString result:', isTodayString(event.start));
    
    if (isPastDateString(event.start)) {
      const dateStr = moment(event.start).format('YYYY-MM-DD');
      toast.warning(`Cannot edit schedule on ${dateStr} (past date). Only today and future dates can be modified.`);
      return;
    }
    
    setSelectedSchedule(event);
    setSelectedDate(event.start);
    setIsModalOpen(true);
  };

  const handleSaveSchedule = async (scheduleData) => {
    try {
      // Validate that the schedule date is not in the past
      console.log('handleSaveSchedule - date validation for:', scheduleData.date);
      console.log('isPastDate result:', isPastDate(scheduleData.date));
      console.log('isToday result:', isToday(scheduleData.date));
      console.log('canModifySchedule result:', canModifySchedule(scheduleData.date));
      console.log('String-based validation:');
      console.log('isPastDateString result:', isPastDateString(scheduleData.date));
      console.log('isTodayString result:', isTodayString(scheduleData.date));
      
      if (isPastDateString(scheduleData.date)) {
        const dateStr = moment(scheduleData.date).format('MMMM D, YYYY');
        toast.error(`Cannot save schedule on ${dateStr} (past date). Only today and future dates can be modified.`);
        return;
      }
      
      // Set the employee field based on selection
      if (selectedTeamMember) {
        // Find the team member by employee_id to get their database ID
        const teamMember = teamMembers.find(m => m.employee_id === selectedTeamMember);
        if (teamMember) {
          scheduleData.employee = teamMember.id; // Use database ID, not employee_id string
          console.log('Creating schedule for selected team member:', teamMember.employee_id, 'DB ID:', teamMember.id);
          console.log('Set employee field to:', teamMember.id);
        } else {
          console.error('Team member not found for employee_id:', selectedTeamMember);
          toast.error('Selected team member not found');
          return;
        }
      } else {
        // Schedule for team leader (current user) - backend will set this automatically
        console.log('Creating schedule for team leader (current user)');
      }
      
      console.log('Sending schedule data:', JSON.stringify(scheduleData, null, 2));
      console.log('Date being sent:', scheduleData.date);
      console.log('Date type:', typeof scheduleData.date);
      console.log('Date value:', scheduleData.date);
      console.log('Employee field value:', scheduleData.employee);
      console.log('Employee field type:', typeof scheduleData.employee);
      
      if (selectedSchedule) {
        await updateSchedule(selectedSchedule.id, scheduleData);
        toast.success('Schedule updated successfully');
      } else {
        await createSchedule(scheduleData);
        toast.success('Schedule created successfully');
      }
      setIsModalOpen(false);
      console.log('Schedule saved successfully, calling loadSchedules immediately...');
      console.log('Current selectedTeamMember:', selectedTeamMember);
      console.log('Current teamMembers:', teamMembers);
      loadSchedules();
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      
      // Handle specific error messages from backend
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(error.response.data.error);
        if (error.response.data.detail) {
          console.error('Error detail:', error.response.data.detail);
        }
      } else if (error.response && error.response.data && typeof error.response.data === 'string') {
        if (error.response.data.includes('<!DOCTYPE html>')) {
          toast.error('Server error occurred. Please check the console for details.');
        } else {
          toast.error(error.response.data);
        }
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to save schedule');
      }
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    // Get the schedule details to show in confirmation
    const scheduleToDelete = schedules.find(s => s.id === scheduleId);
    
    if (!scheduleToDelete) {
      toast.error('Schedule not found');
      return;
    }
    
    // Check if the schedule date is in the past
    console.log('handleDeleteSchedule - date validation for:', scheduleToDelete.date);
    console.log('isPastDate result:', isPastDate(scheduleToDelete.date));
    console.log('isToday result:', isToday(scheduleToDelete.date));
    console.log('canModifySchedule result:', canModifySchedule(scheduleToDelete.date));
    console.log('String-based validation:');
    console.log('isPastDateString result:', isPastDateString(scheduleToDelete.date));
    console.log('isTodayString result:', isTodayString(scheduleToDelete.date));
    
    if (isPastDateString(scheduleToDelete.date)) {
      const dateStr = moment(scheduleToDelete.date).format('MMMM D, YYYY');
      toast.warning(`Cannot delete schedule on ${dateStr} (past date). Only today and future dates can be modified.`);
      return;
    }
    
    let confirmMessage = 'Are you sure you want to delete this schedule?';
    const scheduleDate = new Date(scheduleToDelete.date).toLocaleDateString();
    const scheduleTime = `${scheduleToDelete.scheduled_time_in} - ${scheduleToDelete.scheduled_time_out}`;
    
    if (selectedTeamMember) {
      const teamMemberName = teamMembers.find(m => m.employee_id === selectedTeamMember);
      const memberName = teamMemberName ? `${teamMemberName.first_name} ${teamMemberName.last_name}` : 'team member';
      confirmMessage = `Are you sure you want to delete ${memberName}'s schedule for ${scheduleDate} (${scheduleTime})?`;
    } else {
      confirmMessage = `Are you sure you want to delete your schedule for ${scheduleDate} (${scheduleTime})?`;
    }
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteSchedule(scheduleId);
        toast.success('Schedule deleted successfully');
        setIsModalOpen(false);
        loadSchedules();
      } catch (error) {
        // Handle specific error messages from backend
        if (error.response && error.response.data && error.response.data.error) {
          toast.error(error.response.data.error);
        } else {
          toast.error('Failed to delete schedule');
        }
        console.error('Error deleting schedule:', error);
      }
    }
  };

  const createTestSchedules = async () => {
    try {
      let targetEmployee;
      let targetEmployeeId;
      
      if (selectedTeamMember) {
        // Create test schedules for selected team member
        targetEmployee = teamMembers.find(m => m.employee_id === selectedTeamMember);
        if (!targetEmployee) {
          toast.error('Team member not found');
          return;
        }
        targetEmployeeId = selectedTeamMember;
      } else {
        // Create test schedules for team leader
        const currentEmployeeRes = await axiosInstance.get('dashboard/');
        targetEmployee = currentEmployeeRes.data.employee;
        targetEmployeeId = targetEmployee.employee_id;
      }

      // Create test schedules for the current month
      const currentMonth = moment();
      const testSchedules = [];
      
      // Create schedules for weekdays (Monday to Friday) in the current month
      for (let day = 1; day <= currentMonth.daysInMonth(); day++) {
        const date = moment(currentMonth).date(day);
        const dayOfWeek = date.day(); // 0 = Sunday, 1 = Monday, etc.
        
        // Only create schedules for weekdays (Monday = 1, Tuesday = 2, ..., Friday = 5)
        // AND only for today or future dates (not past)
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && (isTodayString(date) || isFutureDateString(date))) {
          testSchedules.push({
            employee: targetEmployeeId, // Use employee database ID, not employee_id string
            date: date.format('YYYY-MM-DD'),
            scheduled_time_in: '09:00:00',
            scheduled_time_out: '17:00:00',
            is_night_shift: false,
            notes: `Test schedule for ${targetEmployee.first_name} ${targetEmployee.last_name}`
          });
        }
      }

      // Create schedules one by one
      let createdCount = 0;
      for (const schedule of testSchedules) {
        try {
          await createSchedule(schedule);
          createdCount++;
        } catch (error) {
          console.error('Error creating test schedule:', error);
        }
      }

      toast.success(`Created ${createdCount} test schedules for ${targetEmployee.first_name} ${targetEmployee.last_name}`);
      loadSchedules(); // Reload schedules to show the new ones
    } catch (error) {
      console.error('Error creating test schedules:', error);
      toast.error('Failed to create test schedules');
    }
  };

  const handleBulkSchedule = async (bulkData) => {
    try {
      // Validate that bulk schedule dates are not in the past
      if (bulkData.start_date && isPastDateString(bulkData.start_date)) {
        const dateStr = moment(bulkData.start_date).format('MMMM D, YYYY');
        toast.error(`Cannot create bulk schedule starting on ${dateStr} (past date). Only today and future dates can be modified.`);
        return;
      }
      
      // Add employee field to bulk data (backend expects database ID, not employee_id string)
      if (selectedTeamMember) {
        // Bulk schedule for selected team member
        // Find the team member by employee_id to get their database ID
        const teamMember = teamMembers.find(m => m.employee_id === selectedTeamMember);
        if (teamMember) {
          bulkData.employee = teamMember.id; // Use database ID, not employee_id string
          console.log('Creating bulk schedule for selected team member:', teamMember.employee_id, 'DB ID:', teamMember.id);
        } else {
          console.error('Team member not found for employee_id:', selectedTeamMember);
          toast.error('Selected team member not found');
          return;
        }
      } else {
        // Bulk schedule for team leader (current user)
        const currentEmployeeRes = await axiosInstance.get('dashboard/');
        const currentEmployee = currentEmployeeRes.data.employee;
        bulkData.employee = currentEmployee.id; // Use database ID, not employee_id string
        console.log('Creating bulk schedule for team leader (current user)');
      }
      
      // Call the API to apply template to schedule
      const result = await applyTemplateToSchedule(bulkData.template_id, bulkData);
      
      // Build detailed success message
      let message = `Successfully created ${result.schedules_created} schedules`;
      if (result.dates_updated > 0) {
        message += `, updated ${result.dates_updated} existing schedules`;
      }
      if (result.dates_skipped > 0) {
        message += `, skipped ${result.dates_skipped} existing dates`;
        
        // Show detailed information about skipped dates
        if (result.skipped_dates_list && result.skipped_dates_list.length > 0) {
          const skippedDates = result.skipped_dates_list.slice(0, 5); // Show first 5 dates
          const moreText = result.skipped_dates_list.length > 5 ? ` and ${result.skipped_dates_list.length - 5} more` : '';
          message += `\nSkipped dates: ${skippedDates.join(', ')}${moreText}`;
        }
      }
      
      toast.success(message);
      setIsBulkModalOpen(false);
      loadSchedules();
    } catch (error) {
      // Handle specific error messages from backend
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to create bulk schedule');
      }
      console.error('Error creating bulk schedule:', error);
    }
  };

  const eventStyleGetter = (event) => {
    let style = {
      backgroundColor: '#3174ad',
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block'
    };

    if (event.is_night_shift) {
      style.backgroundColor = '#d32f2f';
    }

    // Use the new date validation functions
    if (isPastDate(event.start)) {
      // Past date - show with reduced opacity and different color
      style.backgroundColor = '#6c757d';
      style.opacity = 0.5;
      style.cursor = 'not-allowed';
    } else if (isToday(event.start)) {
      // Today's date - show with blue color to indicate it can be edited/deleted
      style.backgroundColor = '#007bff';
      style.cursor = 'pointer';
    } else {
      // Future date - show with green color for team leader to indicate it can be edited/deleted
      style.backgroundColor = '#28a745';
      style.cursor = 'pointer';
    }

    return {
      style
    };
  };

  const calendarEvents = schedules.map(schedule => ({
    id: schedule.id,
    title: `${formatTime(schedule.scheduled_time_in)} - ${formatTime(schedule.scheduled_time_out)}`,
    start: new Date(schedule.date),
    end: new Date(schedule.date),
    is_night_shift: schedule.is_night_shift,
    ...schedule
  }));
  
  console.log('Calendar events created:', calendarEvents);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <style>
        {`
          .calendar-day-disabled {
            pointer-events: none;
            opacity: 0.6;
          }
          .calendar-day-disabled:hover {
            background-color: #f8f9fa !important;
            cursor: not-allowed !important;
          }
        `}
      </style>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Team Schedule Management
            </h1>
            <div className="flex items-center space-x-2">
              {selectedTeamMember ? (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  👥 Managing Team Member
                </span>
              ) : (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  👤 Managing Own Schedules
                </span>
              )}
            </div>
          </div>
          <p className="text-gray-600">
            {selectedTeamMember 
              ? `Managing schedules for ${teamMembers.find(m => m.employee_id === selectedTeamMember)?.first_name || 'selected team member'}`
              : 'Manage your own schedules or select a team member to manage their schedules'
            }
          </p>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Date Permissions:</span>
              <span className="text-sm">Today and future dates can be added, edited, or deleted. Only past dates are read-only.</span>
            </div>
          </div>
        </div>

        {/* Team Leader Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Team View Controls
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Team Member (Optional)
              </label>
              <select
                value={selectedTeamMember}
                onChange={(e) => {
                  console.log('Team member selection changed:', e.target.value);
                  console.log('Available team members:', teamMembers);
                  setSelectedTeamMember(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Manage My Own Schedules</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.employee_id}>
                    {member.first_name} {member.last_name} ({member.employee_id})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end space-x-2">
              <button
                onClick={() => setShowTeamView(!showTeamView)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {showTeamView ? 'Hide Team Overview' : 'Show Team Overview'}
              </button>
              {selectedTeamMember && (
                <button
                  onClick={loadSchedules}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load Schedules'}
                </button>
              )}
            </div>
          </div>

          {/* Selected Team Member Info */}
          {selectedTeamMember && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-blue-800">Selected Team Member</h3>
                <button
                  onClick={() => {
                    setSelectedTeamMember('');
                    // Reload schedules for the team leader
                    setTimeout(() => loadSchedules(), 100);
                  }}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium transition-colors"
                >
                  ✕ Clear Selection
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  const member = teamMembers.find(m => m.employee_id === selectedTeamMember);
                  if (!member) return null;
                  
                  return (
                    <>
                      <div className="bg-white p-3 rounded-lg border border-blue-300">
                        <div className="text-sm font-medium text-blue-600">Employee ID</div>
                        <div className="text-lg font-semibold text-blue-800">{member.employee_id}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-blue-300">
                        <div className="text-sm font-medium text-blue-600">Name</div>
                        <div className="text-lg font-semibold text-blue-800">{member.first_name} {member.last_name}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-blue-300">
                        <div className="text-sm font-medium text-blue-600">Role</div>
                        <div className="text-lg font-semibold text-blue-800">{member.role || 'Employee'}</div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="mt-3 text-sm text-blue-600">
                📅 Schedules for this team member will be displayed in the calendar below
              </div>
            </div>
          )}

          {/* Team Leader Own Schedule Info */}
          {!selectedTeamMember && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-lg font-medium text-green-800 mb-3">Your Own Schedules</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-lg border border-green-300">
                  <div className="text-sm font-medium text-green-600">Current Month</div>
                  <div className="text-lg font-semibold text-green-800">{currentMonth.format('MMMM YYYY')}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-300">
                  <div className="text-sm font-medium text-green-600">Total Schedules</div>
                  <div className="text-lg font-semibold text-green-800">{calendarEvents.length}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-300">
                  <div className="text-sm font-medium text-green-600">Status</div>
                  <div className="text-lg font-semibold text-green-800">Managing Own</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-green-600">
                📅 Select a team member above to manage their schedules, or continue managing your own
              </div>
            </div>
          )}

          {/* Team Overview */}
          {showTeamView && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Team Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{teamMembers.length}</div>
                  <div className="text-sm text-blue-800">Team Members</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">-</div>
                  <div className="text-sm text-green-800">Scheduled Today</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">-</div>
                  <div className="text-sm text-orange-800">Night Shift</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">-</div>
                  <div className="text-sm text-purple-800">Day Shift</div>
                </div>
              </div>
              
              {/* Team Members List */}
              <div className="mt-4">
                <h4 className="text-md font-medium text-gray-700 mb-3">Team Members List</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teamMembers.map((member) => (
                    <div 
                      key={member.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedTeamMember === member.employee_id 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                      onClick={() => {
                        setSelectedTeamMember(member.employee_id);
                        // Automatically load schedules for the selected member
                        setTimeout(() => loadSchedules(), 100);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-sm text-gray-600">ID: {member.employee_id}</div>
                          <div className="text-xs text-gray-500">{member.role || 'Employee'}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {loading && selectedTeamMember === member.employee_id && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                          <div className={`w-3 h-3 rounded-full ${
                            selectedTeamMember === member.employee_id ? 'bg-blue-500' : 'bg-gray-300'
                          }`}></div>
                        </div>
                      </div>
                      {selectedTeamMember === member.employee_id && (
                        <div className="mt-2 text-xs text-blue-600 font-medium">
                          {loading ? '🔄 Loading schedules...' : '✓ Selected - Viewing schedules'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Bulk Schedule
          </button>
          
          {/* Quick Team Member Actions */}
          {selectedTeamMember && (
            <button
              onClick={() => {
                // Quick switch to next team member
                const currentIndex = teamMembers.findIndex(m => m.employee_id === selectedTeamMember);
                const nextIndex = (currentIndex + 1) % teamMembers.length;
                const nextMember = teamMembers[nextIndex];
                setSelectedTeamMember(nextMember.employee_id);
                setTimeout(() => loadSchedules(), 100);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Next Member
            </button>
          )}
          
          {/* Test Data Button - Remove this after testing */}
          <button
            onClick={createTestSchedules}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Test Schedules
          </button>
          
          {/* Debug Date Validation Button */}
          <button
            onClick={testDateValidation}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Test Date Validation
          </button>
          
          {/* Debug Dashboard Data Button */}
          <button
            onClick={testDashboardData}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 9 0 0118 0z" />
            </svg>
            Test Dashboard Data
          </button>
          
          {/* Debug Team Member Access Button */}
          <button
            onClick={testTeamMemberAccess}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Test Team Access
          </button>
          
          {/* Debug Team Member Schedule Loading Button */}
          <button
            onClick={testTeamMemberScheduleLoading}
            className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Test Member Schedules
          </button>
          
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Templates
          </button>

          <button
            onClick={() => {
              setCurrentMonth(moment().subtract(1, 'month'));
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Previous Month
          </button>

          <button
            onClick={() => {
              setCurrentMonth(moment());
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Current Month
          </button>

          <button
            onClick={() => {
              setCurrentMonth(moment().add(1, 'month'));
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Next Month
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {currentMonth.format('MMMM YYYY')}
              {selectedTeamMember && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  - {teamMembers.find(m => m.employee_id === selectedTeamMember)?.first_name} {teamMembers.find(m => m.employee_id === selectedTeamMember)?.last_name}
                </span>
              )}
            </h2>
            <div className="mt-2 text-sm text-gray-600">
              📅 {calendarEvents.length} schedule{calendarEvents.length !== 1 ? 's' : ''} loaded for this month
              {selectedTeamMember && (
                <span> for {teamMembers.find(m => m.employee_id === selectedTeamMember)?.first_name || 'selected team member'}</span>
              )}
              {!selectedTeamMember && (
                <span> for you</span>
              )}
            </div>
            <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
              ℹ️ Today and future dates can be modified. Only past dates are read-only.
            </div>
            
            {/* Enhanced Team Member Schedule Info */}
            {selectedTeamMember && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-700">Total Schedules</div>
                    <div className="text-lg font-bold text-blue-600">{calendarEvents.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-700">Day Shifts</div>
                    <div className="text-lg font-bold text-green-600">
                      {calendarEvents.filter(event => !event.is_night_shift).length}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-700">Night Shifts</div>
                    <div className="text-lg font-bold text-red-600">
                      {calendarEvents.filter(event => event.is_night_shift).length}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-700">This Week</div>
                    <div className="text-lg font-bold text-purple-600">
                      {calendarEvents.filter(event => {
                        const eventDate = new Date(event.start);
                        const now = new Date();
                        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekStart.getDate() + 6);
                        return eventDate >= weekStart && eventDate <= weekEnd;
                      }).length}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              selectable
              views={['month']}
              defaultView="month"
              tooltipAccessor={(event) => {
                let tooltip = `${event.scheduled_time_in} - ${event.scheduled_time_out}`;
                
                if (isPastDate(event.start)) {
                  tooltip += ' (Past date - cannot be modified)';
                } else if (isToday(event.start)) {
                  tooltip += ' (Today - can be modified)';
                } else {
                  tooltip += ' (Click to edit/delete)';
                }
                
                return tooltip;
              }}
              dayPropGetter={(date) => {
                // Disable only past dates for selection
                if (isPastDate(date)) {
                  return {
                    className: 'calendar-day-disabled',
                    style: {
                      backgroundColor: '#f8f9fa',
                      color: '#6c757d',
                      cursor: 'not-allowed'
                    }
                  };
                }
                return {};
              }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span>Day Shift</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span>Night Shift</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded opacity-50"></div>
            <span>Past Date (Read-only)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Today (Editable)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600 rounded"></div>
            <span>Future Date (Editable)</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isModalOpen && (
        <ScheduleEntryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveSchedule}
          onDelete={handleDeleteSchedule}
          schedule={selectedSchedule}
          selectedDate={selectedDate}
          isStaff={true}
        />
      )}

      {isBulkModalOpen && (
        <BulkScheduleModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onSave={handleBulkSchedule}
          currentMonth={currentMonth}
          isStaff={true}
          selectedTeamMember={selectedTeamMember}
          selectedTeamMemberId={selectedTeamMember ? teamMembers.find(m => m.employee_id === selectedTeamMember)?.id : null}
        />
      )}

      {isTemplateModalOpen && (
        <TemplateManagement
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
        />
      )}
    </div>
  );
};

export default TeamLeaderScheduleManagement;
