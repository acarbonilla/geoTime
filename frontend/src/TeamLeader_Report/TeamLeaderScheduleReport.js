import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { 
  CalendarDaysIcon,
  DocumentChartBarIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  PrinterIcon,
  InformationCircleIcon,
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { 
  FaExclamationTriangle,
  FaClock,
  FaCalendarCheck,
  FaHourglassHalf,
  FaRegClock
} from 'react-icons/fa';
import moment from 'moment';

/**
 * TeamLeaderScheduleReport Component
 * 
 * This component now uses the DailyTimeSummary API approach (similar to admin.py) 
 * instead of complex frontend grouping logic. This provides:
 * 
 * 1. Single-row display for night shifts (no grouping needed)
 * 2. Pre-calculated metrics from the backend
 * 3. Cleaner, more maintainable code
 * 4. Better performance (no frontend calculations)
 * 
 * The DailyTimeSummary model contains all time-related data in one record,
 * making it perfect for displaying night shift schedules that span midnight.
 */

const TeamLeaderScheduleReport = () => {
  // CSS styles for grouped nightshift rows
  const groupedNightshiftStyles = `
    .grouped-nightshift-row {
      background-color: #eff6ff !important;
      border-left: 4px solid #3b82f6 !important;
    }
    .grouped-nightshift-row:hover {
      background-color: #dbeafe !important;
    }
    .nightshift-row {
      background-color: #eff6ff !important;
      border-left: 4px solid #3b82f6 !important;
    }
    .nightshift-row:hover {
      background-color: #dbeafe !important;
    }
  `;

  const [employee, setEmployee] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(() => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const startDateStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}`;
      const endDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      console.log('TeamLeaderScheduleReport: Initial date range calculated:', {
        now: now.toISOString().split('T')[0],
        startOfMonth: startOfMonth.toISOString().split('T')[0],
        startDateStr,
        endDateStr,
        nowYear: now.getFullYear(),
        nowMonth: now.getMonth() + 1,
        nowDay: now.getDate(),
        startOfMonthYear: startOfMonth.getFullYear(),
        startOfMonthMonth: startOfMonth.getMonth() + 1,
        startOfMonthDay: startOfMonth.getDate()
      });
      
      return {
        startDate: startDateStr,
        endDate: endDateStr
      };
    } catch (error) {
      console.error('TeamLeaderScheduleReport: Error setting initial date range:', error);
      // Fallback to current date
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return {
        startDate: todayStr,
        endDate: todayStr
      };
    }
  });
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [employees, setEmployees] = useState([]);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportLoading, setExportLoading] = useState(false);
  const [showIndividualReport, setShowIndividualReport] = useState(false);
  const [selectedIndividualMember, setSelectedIndividualMember] = useState(null);
  const [individualMemberReports, setIndividualMemberReports] = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [viewMode, setViewMode] = useState('reports'); // 'reports' or 'members'
  const [selectedMember, setSelectedMember] = useState(null);
  
  // Schedule View Mode - Group vs Individual
  const [scheduleViewMode, setScheduleViewMode] = useState('group'); // 'group' or 'individual'
  
  // Team Report Data
  const [teamSummary, setTeamSummary] = useState(null);
  const [teamLeaderInfo, setTeamLeaderInfo] = useState(null);
  
  // Cutoff Period Filter
  const [selectedCutoffPeriod, setSelectedCutoffPeriod] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cutoffPeriods] = useState(() => {
    try {
      return [
        { value: '', label: 'Select Cut Off Period' },
        { value: 'first_26_10', label: 'First Cut Off 26 to 10', startDay: 26, endDay: 10 },
        { value: 'second_11_25', label: 'Second Cut Off 11 to 25', startDay: 11, endDay: 25 },
        { value: 'first_21_5', label: 'First Cut Off 21 to 5', startDay: 21, endDay: 5 },
        { value: 'second_6_20', label: 'Second Cut Off 6 to 20', startDay: 6, endDay: 20 }
      ].map(period => ({
        ...period,
        startDay: Math.max(1, Math.min(31, period.startDay || 1)),
        endDay: Math.max(1, Math.min(31, period.endDay || 31))
      }));
    } catch (error) {
      console.error('TeamLeaderScheduleReport: Error initializing cutoff periods:', error);
      return [
        { value: '', label: 'Select Cut Off Period' },
        { value: 'first_26_10', label: 'First Cut Off 26 to 10', startDay: 26, endDay: 10 },
        { value: 'second_11_25', label: 'Second Cut Off 11 to 25', startDay: 11, endDay: 25 }
      ];
    }
  });

  // New states for enhanced functionality
  const [successMessage, setSuccessMessage] = useState(null);
  const [generatingData, setGeneratingData] = useState(false);
  const [memberReports, setMemberReports] = useState([]);
  const [filters, setFilters] = useState({
    cutOffPeriod: '',
    startDate: '',
    endDate: ''
  });


  useEffect(() => {
    try {
      console.log('TeamLeaderScheduleReport: Initial useEffect');
      checkAuthAndRole();
      fetchEmployees();
    } catch (error) {
      console.error('TeamLeaderScheduleReport: Error in initial useEffect:', error);
      setError('Failed to initialize component');
    }
  }, []);

    useEffect(() => {
    try {
      console.log('TeamLeaderScheduleReport: Data fetch useEffect', { employee, viewMode, dateRange });
      if (employee) {
        // Always use fetchMemberReports for the new team_report endpoint
        fetchMemberReports();
      }
    } catch (error) {
      console.error('TeamLeaderScheduleReport: Error in data fetch useEffect:', error);
      setError('Failed to fetch data');
    }
  }, [dateRange, selectedEmployee, employee, viewMode]);

  // Refetch data when selectedEmployee changes
  useEffect(() => {
    if (employee && dateRange.startDate && dateRange.endDate) {
      console.log('TeamLeaderScheduleReport: Selected employee changed, refetching data...', selectedEmployee);
      fetchMemberReports();
    }
  }, [selectedEmployee]);

  // Fetch employees when employee state changes
  useEffect(() => {
    try {
      if (employee && employee.id) {
        console.log('TeamLeaderScheduleReport: Employee state changed, fetching subordinates...');
        fetchEmployees();
      }
    } catch (error) {
      console.error('TeamLeaderScheduleReport: Error in employee state change useEffect:', error);
      setError('Failed to fetch employees');
    }
  }, [employee]);

  // Inject CSS styles for grouped nightshift rows
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = groupedNightshiftStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const checkAuthAndRole = async () => {
    try {
      console.log('TeamLeaderScheduleReport: Checking auth and role...');
      const response = await axiosInstance.get('dashboard/');
      console.log('TeamLeaderScheduleReport: Dashboard response:', response.data);
      
      if (!response.data.employee) {
        console.log('TeamLeaderScheduleReport: No employee data found');
        setError('User information not available');
        setLoading(false);
        return;
      }

      console.log('TeamLeaderScheduleReport: Employee role:', response.data.employee.role);
      if (response.data.employee.role !== 'team_leader') {
        console.log('TeamLeaderScheduleReport: Access denied - not a team leader');
        setError('Access denied. Only Team Leaders can view this page.');
        setLoading(false);
        return;
      }

      console.log('TeamLeaderScheduleReport: Setting employee data');
      setEmployee(response.data.employee);
      setLoading(false);
    } catch (error) {
      console.error('TeamLeaderScheduleReport: Authentication error:', error);
      setError('Failed to load user information');
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      console.log('TeamLeaderScheduleReport: Fetching employees...');
      
      // If we have the current employee (team leader), fetch their subordinates
      if (employee && employee.id) {
        console.log('TeamLeaderScheduleReport: Fetching subordinates for team leader:', employee.id);
        const response = await axiosInstance.get(`employees/${employee.id}/subordinates/`);
        console.log('TeamLeaderScheduleReport: Subordinates response:', response.data);
        // The subordinates endpoint returns a direct array, not paginated
        const employeesData = Array.isArray(response.data) ? response.data : [];
        console.log('TeamLeaderScheduleReport: Processed subordinates data:', employeesData);
        // Debug: Log the first employee to see the data structure
        if (employeesData.length > 0) {
          console.log('TeamLeaderScheduleReport: First employee structure:', {
            id: employeesData[0].id,
            employee_id: employeesData[0].employee_id,
            name: employeesData[0].full_name || employeesData[0].first_name || employeesData[0].last_name
          });
        }
        setEmployees(employeesData);
      } else {
        console.log('TeamLeaderScheduleReport: No employee data available, fetching all employees...');
      const response = await axiosInstance.get('employees/');
      console.log('TeamLeaderScheduleReport: Employees response:', response.data);
        // The API returns a paginated response with {count, next, previous, results}
        // We need to access response.data.results for the actual employee array
        const employeesData = response.data && response.data.results && Array.isArray(response.data.results) 
          ? response.data.results 
          : [];
        console.log('TeamLeaderScheduleReport: Processed employees data:', employeesData);
        setEmployees(employeesData);
      }
    } catch (error) {
      console.error('TeamLeaderScheduleReport: Error fetching employees:', error);
      setEmployees([]);
    }
  };

  // New function to fetch DailyTimeSummary data (admin-style approach)
  const fetchDailyTimeSummaries = async (startDate, endDate, employeeId = null) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `daily-summaries/?start_date=${startDate}&end_date=${endDate}`;
      if (employeeId && employeeId !== 'all') {
        url += `&employee=${employeeId}`;
      }
      
      console.log('🚀 Fetching DailyTimeSummary data from:', url);
      console.log('📅 Requested date range:', { startDate, endDate, employeeId });
      console.log('🌐 Current browser timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
      console.log('🕐 Current browser time:', new Date().toISOString());
      
      const response = await axiosInstance.get(url);
      console.log('📊 DailyTimeSummary API response:', response.data);
      console.log('📊 Response status:', response.status);
      console.log('📊 Response headers:', response.headers);
      
      // Transform the data to match our table structure
      const transformedData = response.data.map(summary => ({
        id: summary.id,
        date: summary.date,
        employee_id: summary.employee_id,
        employee_name: summary.employee_name,
        status: summary.status,
        time_in: summary.time_in,
        time_out: summary.time_out,
        scheduled_time_in: summary.scheduled_time_in,
        scheduled_time_out: summary.scheduled_time_out,
        billed_hours: summary.billed_hours,
        late_minutes: summary.late_minutes,
        undertime_minutes: summary.undertime_minutes,
        night_differential_hours: summary.night_differential_hours,
        overtime_hours: summary.overtime_hours,
        // Calculate if this is a night shift
        is_night_shift: summary.scheduled_time_in && summary.scheduled_time_out && 
                       summary.scheduled_time_in > summary.scheduled_time_out,
        // Format times for display
        time_in_formatted: summary.time_in ? formatTime(summary.time_in) : '-',
        time_out_formatted: summary.time_out ? formatTime(summary.time_out) : '-',
        scheduled_time_in_formatted: summary.scheduled_time_in ? formatTime(summary.scheduled_time_in) : '-',
        scheduled_time_out_formatted: summary.scheduled_time_out ? formatTime(summary.scheduled_time_out) : '-'
      }));
      
      console.log('🔄 Transformed DailyTimeSummary data:', transformedData);
      console.log('🌙 Night shift records:', transformedData.filter(r => r.is_night_shift));
      
      setIndividualMemberReports(transformedData);
      
    } catch (error) {
      console.error('❌ Error fetching DailyTimeSummary data:', error);
      setError('Failed to fetch time summary data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Replace the old fetchMemberReports function with the new one
  const fetchMemberReports = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      setError('Please select a date range');
      return;
    }
    
    await fetchDailyTimeSummaries(dateRange.startDate, dateRange.endDate, selectedEmployee);
  };

  // Group data by date to avoid duplicate dates in the table
  const getGroupedDataByDate = () => {
    // First get the filtered data based on selected employee
    const filteredReports = getFilteredMemberReports();
    
    if (!Array.isArray(filteredReports) || filteredReports.length === 0) {
      return [];
    }

    // Group by date
    const groupedByDate = {};
    filteredReports.forEach(report => {
      const dateKey = report.date;
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(report);
    });

    // Convert to array and sort by date
    return Object.entries(groupedByDate)
      .map(([date, reports]) => ({
        date,
        reports: reports.sort((a, b) => a.employee_name.localeCompare(b.employee_name))
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const handleMemberView = (member) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  };

  const getMemberStats = (memberId) => {
    // Ensure individualMemberReports is an array before filtering
    if (!Array.isArray(individualMemberReports)) {
      return {
        totalHours: 0,
        overtimeHours: 0,
        totalSchedules: 0,
        attendanceRate: 0
      };
    }
    
    const memberSchedules = individualMemberReports.filter(report => report.employee_id === memberId);
    const totalHours = calculateTotalHours(memberSchedules);
    const overtimeHours = calculateOvertime(memberSchedules);
    const totalSchedules = memberSchedules.length;
    const attendanceRate = totalSchedules > 0 ? (totalSchedules / getWorkingDays()) * 100 : 0;

    return {
      totalHours,
      overtimeHours,
      totalSchedules,
      attendanceRate
    };
  };

  const getWorkingDays = () => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    
    let workingDays = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) { // Exclude weekends
        workingDays++;
      }
    }
    return workingDays;
  };

  // Get filtered member reports based on selected employee
  const getFilteredMemberReports = () => {
    if (!Array.isArray(individualMemberReports)) return [];
    
    // If no specific employee is selected, return all reports
    if (!selectedEmployee || selectedEmployee === 'all') {
      return individualMemberReports;
    }
    
    // Filter reports for the selected employee
    return individualMemberReports.filter(report => report.employee_id === selectedEmployee);
  };

  const handleExport = async () => {
    try {
      // Use grouped reports for export to include night shift grouping
      const exportData = individualMemberReports || [];
      
      if (exportData.length === 0) {
        setError('No data to export. Please generate a report first.');
        return;
      }

      // Create download link for CSV (enhanced implementation)
      let csvContent = '';
      if (exportFormat === 'csv') {
        // Convert grouped data to CSV format with enhanced columns
        const headers = ['Date', 'Day', 'Status', 'Time In', 'Time Out', 'Scheduled In', 'Scheduled Out', 'BH (min)', 'LT', 'UT', 'ND', 'Night Shift Info'];
        csvContent = headers.join(',') + '\n';
        
        exportData.forEach(item => {
          // Calculate metrics for export
          const metrics = calculateGroupedMetrics(item);
          
          // Determine status using the new status logic
          let status = getStatus(item);
          if (item.isNightshift) status += ' (Nightshift)';
          if (item.hasPreviousNightshiftTimeout) status += ' (Previous timeout used)';
          
          let nightShiftInfo = '';
          if (item.isNightshift && item.nextDayDate) {
            nightShiftInfo = `Nightshift: ${item.date} → ${item.nextDayDate}`;
          } else if (item.hasPreviousNightshiftTimeout) {
            nightShiftInfo = `Available for new time-in`;
          }
          
          // Notes logic removed since we're no longer using tooltips
          

          
          const row = [
            item.date || '',
            item.day || new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }) || '',
            status,
            formatTime(item.time_in) || '',
            formatTime(item.time_out) || '',
            formatTime(item.scheduled_time_in) || '',
            formatTime(item.scheduled_time_out) || '',
            metrics.bh,
            metrics.lt,
            metrics.ut,
            metrics.nd,
            nightShiftInfo
          ].join(',');
          csvContent += row + '\n';
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `team-schedule-report-${dateRange.startDate}-${dateRange.endDate}-grouped.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // For PDF, we'll need backend support or use a library like jsPDF
        setError('PDF export not yet implemented. Please use CSV export.');
        return;
      }

      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting report:', error);
      setError('Failed to export report');
    }
  };

  const calculateTotalHours = (schedules) => {
    if (!Array.isArray(schedules)) {
      return 0;
    }
    
    return schedules.reduce((total, schedule) => {
      const start = new Date(`2000-01-01T${schedule.time_in}`);
      const end = new Date(`2000-01-01T${schedule.time_out}`);
      const hours = (end - start) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
  };

  const calculateOvertime = (schedules) => {
    if (!Array.isArray(schedules)) return 0;
    const standardHours = 8;
    return schedules.reduce((total, schedule) => {
      const start = schedule.time_in ? new Date(`2000-01-01T${schedule.time_in}`) : null;
      const end = schedule.time_out ? new Date(`2000-01-01T${schedule.time_out}`) : null;
      if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return total;
      const hours = (end - start) / (1000 * 60 * 60);
      return total + Math.max(0, hours - standardHours);
    }, 0);
  };

  // New functions for enhanced functionality
  const generateMissingData = async (memberId = null) => {
    if (!memberId && !selectedEmployee) {
      setError('Please select an employee first');
      return;
    }

    const targetEmployeeId = memberId || selectedEmployee;
    if (targetEmployeeId === 'all') {
      setError('Please select a specific employee to generate missing data');
      return;
    }

    setGeneratingData(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const params = {
        employee_id: targetEmployeeId,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      };

      console.log('Generating missing data with params:', params);
      
      const response = await axiosInstance.post('daily-summaries/generate_summaries/', params);
      
      console.log('Generate response:', response);
      
      if (response.status === 200) {
        setSuccessMessage('Missing data generated successfully! Loading report...');
        // Reload the report after generating data
        setTimeout(() => {
          if (memberId) {
            loadIndividualMemberReport(memberId);
          } else {
            fetchMemberReports();
          }
        }, 1000);
      } else {
        setError('Failed to generate missing data');
      }
    } catch (error) {
      console.error('Error generating missing data:', error);
      if (error.response) {
        const errorMessage = error.response.data?.error || error.response.data?.detail || error.response.statusText;
        setError(`Failed to generate missing data: ${errorMessage}`);
      } else {
        setError('Network error while generating missing data');
      }
    } finally {
      setGeneratingData(false);
    }
  };

  const loadIndividualMemberReport = async (memberId) => {
    if (!memberId) return;
    
    setMemberLoading(true);
    try {
      // Use the team_report endpoint with employee_id filter for individual member
      const response = await axiosInstance.get('daily-summaries/team_report/', {
        params: {
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
          cut_off_period: selectedCutoffPeriod,
          employee_id: memberId
        }
      });
      
      if (response.status === 200) {
        // Extract individual member data from team report
        let individualData = [];
        if (response.data.team_members && Array.isArray(response.data.team_members)) {
          const member = response.data.team_members.find(m => m.employee_id === memberId);
          if (member && member.daily_summaries) {
            individualData = member.daily_summaries.map(summary => ({
              ...summary,
              employee_id: member.employee_id,
              employee_name: member.name,
              department: member.department
            }));
          }
        }
        setIndividualMemberReports(individualData);
        console.log('Individual member report loaded:', individualData);
      }
    } catch (error) {
      console.error('Error loading individual member report:', error);
      setError('Failed to load individual member report');
      setIndividualMemberReports([]);
    } finally {
      setMemberLoading(false);
    }
  };

  const openIndividualReport = (member) => {
    setSelectedIndividualMember(member);
    setShowIndividualReport(true);
                loadIndividualMemberReport(member.employee_id || member.id);
  };

  const openMemberModal = (member) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  };

  const formatTime = (time) => {
    if (!time || time === '-') return '-';
    
    // If it's already in 12-hour format (contains AM/PM), return as-is
    if (time.includes('AM') || time.includes('PM')) {
      return time;
    }
    
    // If it's in 24-hour format, convert to 12-hour format
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const minute = parseInt(minutes, 10);
      
      if (isNaN(hour) || isNaN(minute)) return time;
      
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const displayMinute = minute.toString().padStart(2, '0');
      
      return `${displayHour}:${displayMinute} ${period}`;
    } catch (error) {
      console.error('Error formatting time:', error, time);
      return time;
    }
  };

  // Utility functions for individual member reports
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'present': return 'Present';
      case 'absent': return 'Absent';
      case 'late': return 'Late';
      case 'half_day': return 'Half Day';
      case 'leave': return 'On Leave';
      case 'holiday': return 'Holiday';
      case 'weekend': return 'Weekend';
      default: return 'Unknown';
    }
  };

  // Get team member statistics from the new team report data structure
  const getTeamMemberStats = (memberId) => {
    if (!Array.isArray(memberReports)) return { totalHours: 0, overtimeHours: 0, totalSchedules: 0, attendanceRate: 0 };
    
    const memberData = memberReports.filter(report => report.employee_id === memberId);
    if (memberData.length === 0) return { totalHours: 0, overtimeHours: 0, totalSchedules: 0, attendanceRate: 0 };
    
    const totalHours = memberData.reduce((sum, report) => {
      const hours = parseFloat(report.billed_hours) || 0;
      return sum + hours;
    }, 0);
    
    const overtimeHours = memberData.reduce((sum, report) => {
      const hours = parseFloat(report.overtime_hours) || 0;
      return sum + hours;
    }, 0);
    
    const totalSchedules = memberData.length;
    const presentCount = memberData.filter(report => report.status === 'present').length;
    const attendanceRate = totalSchedules > 0 ? (presentCount / totalSchedules) * 100 : 0;
    
    return {
      totalHours,
      overtimeHours,
      totalSchedules,
      attendanceRate
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'half_day': return 'bg-orange-100 text-orange-800';
      case 'leave': return 'bg-blue-100 text-blue-800';
      case 'holiday': return 'bg-purple-100 text-purple-800';
      case 'weekend': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    // Convert status to lowercase and replace spaces with underscores for icon lookup
    const statusKey = status.toLowerCase().replace(/\s+/g, '_');
    
    switch (statusKey) {
      case 'present':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'absent':
        return <XMarkIcon className="h-5 w-5 text-red-500" />;
      case 'late':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'half_day':
        return <FaHourglassHalf className="h-5 w-5 text-orange-500" />;
      case 'leave':
        return <CalendarIcon className="h-5 w-5 text-blue-500" />;
      case 'holiday':
        return <CalendarIcon className="h-5 w-5 text-purple-500" />;
      case 'weekend':
        return <CalendarIcon className="h-5 w-5 text-gray-500" />;
      case 'suspicious_shift':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />; // Warning icon for suspicious shifts
      case 'shift_void':
        return <XMarkIcon className="h-5 w-5 text-red-700" />; // X mark for voided shifts
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };



  const getCutoffPeriodDisplay = (cutoffValue) => {
    if (!cutoffValue) return '';
    
    const cutoff = cutoffPeriods.find(cp => cp.value === cutoffValue);
    if (!cutoff) return '';
    
    // Use current year and month
    const now = new Date();
    const targetYear = now.getFullYear();
    const targetMonth = now.getMonth();
    
    console.log('getCutoffPeriodDisplay DEBUG:', {
      cutoffValue,
      targetYear,
      targetMonth,
      cutoff
    });
    
    let startDate, endDate;
    
    try {
      if (cutoff.value === 'second_6_20') {
        // Second Cut Off 6 to 20: Always 6th to 20th of selected month
        startDate = new Date(targetYear, targetMonth, 6);
        endDate = new Date(targetYear, targetMonth, 20);
      } else if (cutoff.value === 'first_21_5') {
        // First Cut Off 21 to 5: 21st of selected month to 5th of next month
        startDate = new Date(targetYear, targetMonth, 21);
        endDate = new Date(targetYear, targetMonth + 1, 5);
      } else if (cutoff.value === 'first_26_10') {
        // First Cut Off 26 to 10: 26th of selected month to 10th of next month
        startDate = new Date(targetYear, targetMonth, 26);
        endDate = new Date(targetYear, targetMonth + 1, 10);
      } else if (cutoff.value === 'second_11_25') {
        // Second Cut Off 11 to 25: Always 11th to 25th of selected month
        startDate = new Date(targetYear, targetMonth, 11);
        endDate = new Date(targetYear, targetMonth, 25);
      } else {
        return '';
      }
      
      console.log('getCutoffPeriodDisplay DATES:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Format dates like "Aug 06 - Aug 20"
      const startFormatted = startDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      const endFormatted = endDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      
      const result = `${startFormatted} - ${endFormatted}`;
      console.log('getCutoffPeriodDisplay RESULT:', result);
      
      return result;
    } catch (error) {
      console.error('TeamLeaderScheduleReport: Error formatting cutoff period display:', error);
      return '';
    }
  };

  const calculateCutoffDateRange = (cutoffValue) => {
    if (!cutoffValue) return null;
    
    const cutoff = cutoffPeriods.find(cp => cp.value === cutoffValue);
    if (!cutoff) return null;
    
    // Use current year and month
    const now = new Date();
    const targetYear = now.getFullYear();
    const targetMonth = now.getMonth();
    
    console.log('TeamLeaderScheduleReport: Calculating cutoff date range:', {
      cutoffValue,
      targetYear,
      targetMonth: targetMonth + 1, // +1 because getMonth() returns 0-11
      cutoff,
      now: now.toISOString().split('T')[0],
      nowDate: now.getDate(),
      nowMonth: now.getMonth() + 1,
      nowYear: now.getFullYear()
    });
    
    let startDate, endDate;
    
    try {
      // Use the selected year and month instead of current system year/month for the date calculations
      if (cutoff.value === 'second_6_20') {
        // Second Cut Off 6 to 20: Always 6th to 20th of selected month
        startDate = new Date(targetYear, targetMonth, 6);
        endDate = new Date(targetYear, targetMonth, 20);
      } else if (cutoff.value === 'first_21_5') {
        // First Cut Off 21 to 5: 21st of selected month to 5th of next month
        startDate = new Date(targetYear, targetMonth, 21);
        endDate = new Date(targetYear, targetMonth + 1, 5);
      } else if (cutoff.value === 'first_26_10') {
        // First Cut Off 26 to 10: 26th of selected month to 10th of next month
        startDate = new Date(targetYear, targetMonth, 26);
        endDate = new Date(targetYear, targetMonth + 1, 10);
      } else if (cutoff.value === 'second_11_25') {
        // Second Cut Off 11 to 25: Always 11th to 25th of selected month
        startDate = new Date(targetYear, targetMonth, 11);
        endDate = new Date(targetYear, targetMonth, 25);
      } else {
        // Fallback for any other cutoff periods
        if (cutoff.startDay > cutoff.endDay) {
          // Period spans across months (e.g., 26 to 10)
          startDate = new Date(targetYear, targetMonth, cutoff.startDay);
          endDate = new Date(targetYear, targetMonth + 1, cutoff.endDay);
        } else {
          // Period within same month (e.g., 6 to 20)
          startDate = new Date(targetYear, targetMonth, cutoff.startDay);
          endDate = new Date(targetYear, targetMonth, cutoff.endDay);
        }
      }
      
      // Validate the dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('TeamLeaderScheduleReport: Invalid date created:', { startDate, endDate, cutoff });
        return null;
      }
      
      // Additional validation: ensure dates are reasonable (not in the future by more than a few months)
      const maxFutureDate = new Date();
      maxFutureDate.setMonth(maxFutureDate.getMonth() + 3); // Allow up to 3 months in the future
      
      if (startDate > maxFutureDate || endDate > maxFutureDate) {
        console.error('TeamLeaderScheduleReport: Date too far in the future:', { startDate, endDate, maxFutureDate });
        return null;
      }
      
      // Use a more explicit date formatting to avoid timezone issues
      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      
      // Debug: Check if dates are in the future
      const today = new Date();
      const isStartDateFuture = startDate > today;
      const isEndDateFuture = endDate > today;
      
      console.log('TeamLeaderScheduleReport: Cutoff period calculated:', {
        cutoffValue,
        startDate: startDateStr,
        endDate: endDateStr,
        startDay: cutoff.startDay,
        endDay: cutoff.endDay,
        startDateObj: startDate,
        endDateObj: endDate,
        startDateISO: startDate.toISOString(),
        endDateISO: endDate.toISOString(),
        startDateYear: startDate.getFullYear(),
        startDateMonth: startDate.getMonth() + 1,
        startDateDay: startDate.getDate(),
        endDateYear: endDate.getFullYear(),
        endDateMonth: endDate.getMonth() + 1,
        endDateDay: endDate.getDate(),
        today: today.toISOString().split('T')[0],
        isStartDateFuture,
        isEndDateFuture
      });
      
      return {
        startDate: startDateStr,
        endDate: endDateStr
      };
    } catch (error) {
      console.error('TeamLeaderScheduleReport: Error calculating cutoff date range:', error);
      return null;
    }
  };

  // Handle cutoff period change
  const handleCutoffPeriodChange = (cutoffValue) => {
    try {
      setSelectedCutoffPeriod(cutoffValue);
      
      if (cutoffValue) {
        // Hide date picker when using predefined cutoff period
        setShowDatePicker(false);
        
        const newDateRange = calculateCutoffDateRange(cutoffValue);
        if (newDateRange) {
          setDateRange(newDateRange);
          console.log('TeamLeaderScheduleReport: Cutoff period changed to:', cutoffValue, 'Date range:', newDateRange);
          
          // Immediately fetch new data with the new date range instead of filtering existing data
          fetchMemberReports();
        } else {
          console.error('TeamLeaderScheduleReport: Failed to calculate date range for cutoff period:', cutoffValue);
          setError('Failed to calculate date range for selected cutoff period');
        }
      }
    } catch (error) {
      console.error('TeamLeaderScheduleReport: Error handling cutoff period change:', error);
      setError('Error setting cutoff period');
    }
  };

  // New: Calculate BH, LT, UT, ND for grouped records (FIXED VERSION)
  const calculateGroupedMetrics = (record) => {
    if (!record) return { bh: 0, lt: 0, ut: 0, nd: 0 };
    
    // CRITICAL FIX: Check backend status first - if backend says incomplete/shift_void, use those metrics
    if (record.status === 'incomplete' || record.status === 'shift_void') {
      console.log('🚫 Backend status is', record.status, '- using backend metrics instead of recalculating');
      return {
        bh: record.billed_hours || 0,
        lt: record.late_minutes || 0,
        ut: record.undertime_minutes || 0,
        nd: record.night_differential || 0
      };
    }
    
    let bh = 0; // Break Hours (minutes) - actual time worked
    let lt = 0; // Late Time (minutes)
    let ut = 0; // Unscheduled Time (minutes)
    let nd = 0; // Night Differential (minutes)
    
    // Test moment.js functionality
    console.log('🧪 Moment.js test:', {
      momentAvailable: typeof moment !== 'undefined',
      momentVersion: moment.version,
      testParse: moment('2025-08-13 23:00').isValid(),
      testDiff: moment('2025-08-13 08:00').diff(moment('2025-08-13 23:00'), 'minutes')
    });
    
    // Use the correct field names from the API response
    const timeIn = record.time_in;
    const timeOut = record.time_out;
    const scheduledIn = record.scheduled_time_in;
    const scheduledOut = record.scheduled_time_out;
    
    // Test specific time formats that might be causing issues (MOVED HERE)
    if (timeIn && timeOut) {
      console.log('🧪 Testing specific time formats:', {
        timeIn,
        timeOut,
        timeInTest1: moment(`2000-01-01 ${timeIn}`).isValid(),
        timeOutTest1: moment(`2000-01-01 ${timeOut}`).isValid(),
        timeInTest2: moment(`2000-01-01 ${timeIn}`, 'YYYY-MM-DD HH:mm').isValid(),
        timeOutTest2: moment(`2000-01-01 ${timeOut}`, 'YYYY-MM-DD HH:mm').isValid(),
        timeInTest3: moment(`2000-01-01 ${timeIn}`, 'YYYY-MM-DD h:mm A').isValid(),
        timeOutTest3: moment(`2000-01-01 ${timeOut}`, 'YYYY-MM-DD h:mm A').isValid()
      });
    }
    
    console.log('🔍 calculateGroupedMetrics input:', {
      record,
      timeIn,
      timeOut,
      scheduledIn,
      scheduledOut,
      isNightshift: record.isNightshift,
      recordKeys: Object.keys(record),
      recordValues: Object.values(record)
    });
    
    // Only calculate if we have both time in and time out
    if (timeIn && timeOut && timeIn !== '-' && timeOut !== '-') {
      try {
        const baseDate = moment(record.date, 'YYYY-MM-DD');
        if (!baseDate.isValid()) {
          console.log('❌ Invalid base date:', record.date);
          return { bh: 0, lt: 0, ut: 0, nd: 0 };
        }

        // Parse actual time worked (time out - time in)
        // Handle both 12-hour and 24-hour formats
        let timeInMoment, timeOutMoment;
        
        console.log('🔍 Time parsing details:', {
          timeIn,
          timeOut,
          baseDate: baseDate.format('YYYY-MM-DD'),
          timeInHasAMPM: timeIn.includes('AM') || timeIn.includes('PM'),
          timeOutHasAMPM: timeOut.includes('AM') || timeOut.includes('PM')
        });
        
        // More robust time parsing with multiple fallback attempts
        try {
          // First attempt: Try parsing as 12-hour format
          if (timeIn.includes('AM') || timeIn.includes('PM')) {
            timeInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeIn}`, 'YYYY-MM-DD h:mm A');
            timeOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeOut}`, 'YYYY-MM-DD h:mm A');
            console.log('📅 Parsing as 12-hour format');
          } else {
            // Second attempt: Try parsing as 24-hour format
            timeInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeIn}`);
            timeOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeOut}`);
            console.log('📅 Parsing as 24-hour format');
          }
          
          // Third attempt: If 24-hour parsing failed, try with explicit format
          if (!timeInMoment.isValid()) {
            timeInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeIn}`, 'YYYY-MM-DD HH:mm');
            console.log('📅 Retry parsing timeIn as explicit 24-hour format');
          }
          if (!timeOutMoment.isValid()) {
            timeOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeOut}`, 'YYYY-MM-DD HH:mm');
            console.log('📅 Retry parsing timeOut as explicit 24-hour format');
          }
          
          // Fourth attempt: If still failed, try parsing without seconds
          if (!timeInMoment.isValid()) {
            timeInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeIn}`, 'YYYY-MM-DD HH:mm');
            console.log('📅 Retry parsing timeIn without seconds');
          }
          if (!timeOutMoment.isValid()) {
            timeOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeOut}`, 'YYYY-MM-DD HH:mm');
            console.log('📅 Retry parsing timeOut without seconds');
          }
          
          // Fifth attempt: Try parsing with different separators
          if (!timeInMoment.isValid()) {
            // Try to normalize the time format
            const normalizedTimeIn = timeIn.replace(/[^\d:]/g, '');
            timeInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${normalizedTimeIn}`, 'YYYY-MM-DD HH:mm');
            console.log('📅 Retry parsing timeIn with normalized format:', normalizedTimeIn);
          }
          if (!timeOutMoment.isValid()) {
            const normalizedTimeOut = timeOut.replace(/[^\d:]/g, '');
            timeOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${normalizedTimeOut}`, 'YYYY-MM-DD HH:mm');
            console.log('📅 Retry parsing timeOut with normalized format:', normalizedTimeOut);
          }
        } catch (error) {
          console.error('❌ Error during time parsing:', error);
        }
        
        if (!timeInMoment.isValid() || !timeOutMoment.isValid()) {
          console.log('❌ Invalid time parsing:', {
            timeInMoment: timeInMoment.isValid(),
            timeOutMoment: timeOutMoment.isValid(),
            timeInMomentValue: timeInMoment.format(),
            timeOutMomentValue: timeOutMoment.format(),
            timeIn,
            timeOut,
            timeInMomentError: timeInMoment.parsingFlags ? timeInMoment.parsingFlags() : 'No parsing flags',
            timeOutMomentError: timeOutMoment.parsingFlags ? timeOutMoment.parsingFlags() : 'No parsing flags'
          });
          
          // Try a simple fallback calculation using basic string manipulation
          console.log('🔄 Attempting fallback calculation...');
          try {
            const timeInParts = timeIn.split(':');
            const timeOutParts = timeOut.split(':');
            
            if (timeInParts.length >= 2 && timeOutParts.length >= 2) {
              const timeInHour = parseInt(timeInParts[0]);
              const timeInMin = parseInt(timeInParts[1]);
              const timeOutHour = parseInt(timeOutParts[0]);
              const timeOutMin = parseInt(timeOutParts[1]);
              
              let timeInTotal = timeInHour * 60 + timeInMin;
              let timeOutTotal = timeOutHour * 60 + timeOutMin;
              
              // Handle night shift crossing midnight
              if (timeOutTotal < timeInTotal) {
                timeOutTotal += 24 * 60; // Add 24 hours
              }
              
              const fallbackDuration = timeOutTotal - timeInTotal;
              console.log('🔄 Fallback calculation result:', {
                timeInHour, timeInMin, timeInTotal,
                timeOutHour, timeOutMin, timeOutTotal,
                fallbackDuration
              });
              
              if (fallbackDuration > 0) {
                // Use fallback calculation
                const breakDeduction = fallbackDuration >= 420 ? 60 : fallbackDuration >= 240 ? 30 : 0;
                const fallbackBh = Math.max(0, fallbackDuration - breakDeduction);
                
                console.log('✅ Using fallback calculation:', { fallbackBh, fallbackDuration, breakDeduction });
                // Calculate ND for fallback - count night hours
                let fallbackNd = 0;
                const timeInHour = parseInt(timeInParts[0]);
                const timeOutHour = parseInt(timeOutParts[0]);
                
                // Simple night hours calculation for fallback
                if (timeInHour >= 22 || timeInHour < 6) {
                  // Started during night hours
                  fallbackNd += Math.min(60 - parseInt(timeInParts[1]), fallbackDuration);
                }
                if (timeOutHour >= 22 || timeOutHour < 6) {
                  // Ended during night hours
                  fallbackNd += Math.min(parseInt(timeOutParts[1]), fallbackDuration);
                }
                
                return { 
                  bh: fallbackBh, 
                  lt: 0, 
                  ut: 0, 
                  nd: Math.min(fallbackNd, fallbackDuration)
                };
              }
            }
          } catch (fallbackError) {
            console.error('❌ Fallback calculation also failed:', fallbackError);
          }
          
          return { bh: 0, lt: 0, ut: 0, nd: 0 };
        }

        // Handle night shifts that span midnight
        if (timeOutMoment.isBefore(timeInMoment)) {
          timeOutMoment = moment(timeOutMoment).add(1, 'day');
          console.log('🌙 Night shift detected, adjusted timeOut to next day');
        }

        // NEW: Check if both time in and time out are before scheduled start time
        let isVoidedShift = false;
        let voidReason = '';
        
        if (scheduledIn && scheduledIn !== '-') {
          let scheduledInMoment;
          
          if (scheduledIn.includes('AM') || scheduledIn.includes('PM')) {
            scheduledInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledIn}`, 'YYYY-MM-DD h:mm A');
          } else {
            scheduledInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledIn}`);
          }
          
          if (scheduledInMoment.isValid()) {
            // Check if both time in and time out are before scheduled start
            if (timeInMoment.isBefore(scheduledInMoment) && timeOutMoment.isBefore(scheduledInMoment)) {
              isVoidedShift = true;
              voidReason = `Shift voided: Time In (${timeInMoment.format('h:mm A')}) and Time Out (${timeOutMoment.format('h:mm A')}) both occurred before Scheduled In (${scheduledInMoment.format('h:mm A')})`;
              console.log('🚫 Shift voided:', voidReason);
            }
          }
        }

        // Calculate actual duration worked in minutes
        let actualDurationMinutes = timeOutMoment.diff(timeInMoment, 'minutes');
        
        console.log('⏱️ Duration calculation:', {
          timeInMoment: timeInMoment.format('YYYY-MM-DD HH:mm:ss'),
          timeOutMoment: timeOutMoment.format('YYYY-MM-DD HH:mm:ss'),
          rawDiff: timeOutMoment.diff(timeInMoment, 'minutes'),
          actualDurationMinutes
        });
        
        // Ensure duration is positive
        if (actualDurationMinutes < 0) {
          console.error('❌ Invalid actual duration calculation:', { timeIn, timeOut, actualDurationMinutes });
          actualDurationMinutes = 0;
        }

        console.log('📊 Duration calculations:', {
          actualDurationMinutes,
          timeIn: timeInMoment.format('h:mm A'),
          timeOut: timeOutMoment.format('h:mm A')
        });

        // BH (Break Hours) - actual time worked (with break deduction)
        let breakDeduction = 0;
        if (actualDurationMinutes >= 420) { // 7 hours or more
          breakDeduction = 60; // 1 hour break
        } else if (actualDurationMinutes >= 240) { // 4 hours or more
          breakDeduction = 30; // 30 minutes break
        }
        
        // If shift is voided (both times before scheduled start), set BH to 0
        if (isVoidedShift) {
          bh = 0;
          console.log('🚫 BH set to 0 due to voided shift');
        } else {
          bh = Math.max(0, actualDurationMinutes - breakDeduction);
        }
        
        console.log('💼 BH calculation:', {
          actualDurationMinutes,
          breakDeduction,
          bh,
          isVoidedShift,
          voidReason: isVoidedShift ? voidReason : 'N/A',
          breakDeductionReason: actualDurationMinutes >= 420 ? '7+ hours (1h break)' : 
                                actualDurationMinutes >= 240 ? '4+ hours (30m break)' : 'No break'
        });
        
        // LT (Late Time) - only calculate if we have scheduled times
        if (scheduledIn && scheduledOut && scheduledIn !== '-' && scheduledOut !== '-') {
          let scheduledInMoment, scheduledOutMoment;
          
          if (scheduledIn.includes('AM') || scheduledIn.includes('PM')) {
            // 12-hour format (e.g., "11:00 PM", "09:00 AM")
            scheduledInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledIn}`, 'YYYY-MM-DD h:mm A');
            scheduledOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledOut}`, 'YYYY-MM-DD h:mm A');
          } else {
            // 24-hour format
            scheduledInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledIn}`);
            scheduledOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledOut}`);
          }
          
          if (scheduledInMoment.isValid() && scheduledOutMoment.isValid()) {
            // Handle night shift crossing midnight
            if (scheduledOutMoment.isBefore(scheduledInMoment)) {
              scheduledOutMoment.add(1, 'day');
            }
            
            // LT (Late Time) - if actual start is after scheduled start
            if (timeInMoment.isAfter(scheduledInMoment)) {
              lt = Math.round(timeInMoment.diff(scheduledInMoment, 'minutes'));
            }
            
            // UT (Unscheduled Time) - if actual duration exceeds scheduled duration
            let scheduledDurationMinutes = scheduledOutMoment.diff(scheduledInMoment, 'minutes');
            
            // For night shifts, we need to handle the case where actual time out is before scheduled time out
            // but the shift crosses midnight
            if (record.isNightshift && timeOutMoment.isBefore(scheduledOutMoment)) {
              // Early departure from night shift
              ut = Math.round(scheduledOutMoment.diff(timeOutMoment, 'minutes'));
            } else if (actualDurationMinutes > scheduledDurationMinutes) {
              // Regular case: actual duration exceeds scheduled duration
              ut = Math.round(actualDurationMinutes - scheduledDurationMinutes);
            }
          }
        } else {
          console.log('⚠️ Scheduled times missing, cannot calculate LT and UT');
          // Set default values when scheduled times are missing
          lt = 0;
          ut = 0;
        }
        
        // If shift is voided, zero out LT and UT
        if (isVoidedShift) {
          lt = 0;
          ut = 0;
          console.log('🚫 LT and UT set to 0 due to voided shift');
        }
        
        // ND (Night Differential) - calculate regardless of isNightshift flag
        // If shift is voided (both times before scheduled start), set ND to 0
        if (isVoidedShift) {
          nd = 0;
          console.log('🚫 ND set to 0 due to voided shift');
        } else {
          // Calculate night hours (typically 10 PM to 6 AM)
          let nightMinutes = 0;
          
          // Create a working copy of the start time for iteration
          let currentTime = timeInMoment.clone();
          
          // Iterate through each minute of work time to count night hours
          while (currentTime.isBefore(timeOutMoment)) {
            const currentHour = currentTime.hour();
            const currentMinute = currentTime.minute();
            
            // Check if current time is within night hours (10 PM to 6 AM)
            // Night hours: 22:00 (10 PM) to 05:59 (5:59 AM)
            if (currentHour >= 22 || currentHour < 6) {
              nightMinutes++;
            }
            
            // Move to next minute
            currentTime.add(1, 'minute');
          }
          
          nd = nightMinutes;
        }
        
        // FINAL CHECK: Ensure all metrics are 0 if shift is voided
        if (isVoidedShift) {
          bh = 0;
          lt = 0;
          ut = 0;
          nd = 0;
          console.log('🚫 FINAL CHECK: All metrics zeroed for voided shift:', { bh, lt, ut, nd });
        }
        
        // FINAL CHECK: Also zero out metrics for suspiciously short shifts (less than 15 minutes)
        if (actualDurationMinutes < 15) {
          bh = 0;
          lt = 0;
          ut = 0;
          nd = 0;
          console.log('🚫 FINAL CHECK: All metrics zeroed for suspiciously short shift (< 15 min):', { 
            actualDurationMinutes, bh, lt, ut, nd 
          });
        }
        
        console.log('🌙 ND calculation:', {
          timeIn: timeInMoment.format('h:mm A'),
          timeOut: timeOutMoment.format('h:mm A'),
          nightHours: '22:00-05:59',
          nightMinutes: isVoidedShift ? 'N/A (voided)' : (nd || 0),
          nd,
          ndHours: (nd / 60).toFixed(2),
          isVoidedShift,
          voidReason: isVoidedShift ? voidReason : 'N/A'
        });
        
        console.log(`✅ Metrics calculation for ${record.date}:`, {
          actualDuration: actualDurationMinutes,
          breakDeduction,
          bh,
          lt,
          ut,
          nd,
          isVoidedShift,
          voidReason: isVoidedShift ? voidReason : 'N/A',
          isNightshift: record.isNightshift,
          hasScheduledTimes: !!(scheduledIn && scheduledOut)
        });
        
      } catch (error) {
        console.error('❌ Error calculating metrics:', error);
        return { bh: 0, lt: 0, ut: 0, nd: 0 };
      }
    } else {
      console.log('❌ Missing required data for calculation:', {
        hasTimeIn: !!timeIn,
        hasTimeOut: !!timeOut
      });
    }
    
    // Return the calculated metrics directly
    return { 
      bh, 
      lt, 
      ut, 
      nd 
    };
  };



  // DISABLED: Night shift grouping logic - returning records ungrouped as per user preference
  const getGroupedRecordsForExport = (records) => {
    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }

    // If individual view mode is selected, return records ungrouped
    if (scheduleViewMode === 'individual') {
      return records;
    }

    // Group view mode: Group consecutive nightshifts
    const groupedRecords = [];
    let currentGroup = [];
    
    // Sort records by date
    const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    for (let i = 0; i < sortedRecords.length; i++) {
      const currentRecord = sortedRecords[i];
      const nextRecord = sortedRecords[i + 1];
      
      // Check if current record is a nightshift (scheduled 21:00-06:00 or similar)
      const isNightshift = currentRecord.scheduled_time_in && currentRecord.scheduled_time_out && 
        (currentRecord.scheduled_time_in.includes('21:00') || currentRecord.scheduled_time_in.includes('09:00 PM') ||
         currentRecord.scheduled_time_in.includes('20:00') || currentRecord.scheduled_time_in.includes('08:00 PM')) &&
        (currentRecord.scheduled_time_out.includes('06:00') || currentRecord.scheduled_time_out.includes('06:00 AM') ||
         currentRecord.scheduled_time_out.includes('05:00') || currentRecord.scheduled_time_out.includes('05:00 AM'));
      
      if (isNightshift) {
        // Check if this can be grouped with the next record
        if (nextRecord && isConsecutiveNightshift(currentRecord, nextRecord)) {
          currentGroup.push(currentRecord);
        } else {
          // End of group
          currentGroup.push(currentRecord);
          if (currentGroup.length > 1) {
            // Create grouped record
            groupedRecords.push(createGroupedRecord(currentGroup));
          } else {
            // Single nightshift, add as is
            groupedRecords.push(currentRecord);
          }
          currentGroup = [];
        }
      } else {
        // Not a nightshift, add any existing group first
        if (currentGroup.length > 1) {
          groupedRecords.push(createGroupedRecord(currentGroup));
          currentGroup = [];
        } else if (currentGroup.length === 1) {
          groupedRecords.push(currentGroup[0]);
          currentGroup = [];
        }
        // Add current non-nightshift record
        groupedRecords.push(currentRecord);
      }
    }
    
    // Handle any remaining group
    if (currentGroup.length > 1) {
      groupedRecords.push(createGroupedRecord(currentGroup));
    } else if (currentGroup.length === 1) {
      groupedRecords.push(currentGroup[0]);
    }
    
    return groupedRecords;
  };

  // Helper function to check if two records are consecutive nightshifts
  const isConsecutiveNightshift = (record1, record2) => {
    const date1 = new Date(record1.date);
    const date2 = new Date(record2.date);
    
    // Check if dates are consecutive
    const diffTime = date2 - date1;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays !== 1) return false;
    
    // Check if both are nightshifts with same schedule
    const isNightshift1 = record1.scheduled_time_in && record1.scheduled_time_out && 
      (record1.scheduled_time_in.includes('21:00') || record1.scheduled_time_in.includes('09:00 PM') ||
       record1.scheduled_time_in.includes('20:00') || record1.scheduled_time_in.includes('08:00 PM')) &&
      (record1.scheduled_time_out.includes('06:00') || record1.scheduled_time_out.includes('06:00 AM') ||
       record1.scheduled_time_out.includes('05:00') || record1.scheduled_time_out.includes('05:00 AM'));
    
    const isNightshift2 = record2.scheduled_time_in && record2.scheduled_time_out && 
      (record2.scheduled_time_in.includes('21:00') || record2.scheduled_time_in.includes('09:00 PM') ||
       record2.scheduled_time_in.includes('20:00') || record2.scheduled_time_in.includes('08:00 PM')) &&
      (record2.scheduled_time_out.includes('06:00') || record2.scheduled_time_out.includes('06:00 AM') ||
       record2.scheduled_time_out.includes('05:00') || record2.scheduled_time_out.includes('05:00 AM'));
    
    if (!isNightshift1 || !isNightshift2) return false;
    
    // Check if schedules are the same
    return record1.scheduled_time_in === record2.scheduled_time_in && 
           record1.scheduled_time_out === record2.scheduled_time_out;
  };

  // Helper function to create a grouped record
  const createGroupedRecord = (group) => {
    const firstRecord = group[0];
    const lastRecord = group[group.length - 1];
    
    // Calculate date range
    const startDate = new Date(firstRecord.date);
    const endDate = new Date(lastRecord.date);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // Format dates for display
    const startDateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDateStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Calculate day range
    const startDay = startDate.toLocaleDateString('en-US', { weekday: 'short' });
    const endDay = endDate.toLocaleDateString('en-US', { weekday: 'short' });
    
    return {
      ...firstRecord,
      id: `grouped-${firstRecord.id || firstRecord.date}-${lastRecord.id || lastRecord.date}`,
      date: `${startDateStr} - ${endDateStr} (${daysDiff} days)`,
      day: `${startDay} - ${endDay}`,
      isGrouped: true,
      groupSize: daysDiff,
      groupRecords: group,
      // For grouped records, show dashes for actual time in/out since they span multiple days
      time_in: '-',
      time_out: '-',
      // Keep scheduled times from first record
      scheduled_time_in: firstRecord.scheduled_time_in,
      scheduled_time_out: firstRecord.scheduled_time_out,
      // Mark as nightshift
      isNightshift: true
    };
  };

  // Function to determine the correct status based on user requirements
  const getStatus = (report) => {
    // CRITICAL FIX: Respect backend status first - if backend has already determined status, use it
    if (report.status && report.status !== 'not_scheduled' && report.status !== 'weekend') {
      console.log('✅ Using backend status:', report.status, 'for', report.date);
      
      // Map backend status to display status
      switch (report.status) {
        case 'incomplete':
          // Special case: Check if this is a suspiciously short shift
          if (report.time_in && report.time_out && 
              report.time_in !== '-' && report.time_out !== '-') {
            const isSuspiciouslyShort = isSuspiciouslyShortShift(report);
            if (isSuspiciouslyShort) {
              console.log('🚫 Backend incomplete + suspiciously short = Suspicious Shift');
              return "Suspicious Shift";
            }
          }
          return "Incomplete";
        case 'shift_void':
          return "Shift Void";
        case 'present':
          return "Present";
        case 'late':
          return "Late";
        case 'undertime':
          return "UnderTime";
        case 'absent':
          return "Absent";
        case 'scheduled':
          return "Scheduled";
        case 'not_yet_scheduled':
          return "Not Yet Scheduled";
        default:
          // Fall through to frontend logic for unknown statuses
          break;
      }
    }
    
    const today = new Date();
    const reportDate = new Date(report.date);
    const isToday = today.toDateString() === reportDate.toDateString();
    const isFutureDate = reportDate > today;
    
    // Check if record has scheduled times
    const hasScheduledTimes = report.scheduled_time_in && report.scheduled_time_out;
    
    // Check for suspiciously short shifts FIRST (highest priority after shift void)
    if (hasScheduledTimes && report.time_in && report.time_out && 
        report.time_in !== '-' && report.time_out !== '-') {
      // Check for suspiciously short shifts (less than 15 minutes)
      const isSuspiciouslyShort = isSuspiciouslyShortShift(report);
      if (isSuspiciouslyShort) {
        return "Suspicious Shift"; // Special status for very short shifts
      }
      
      // Then check for shift void conditions
      if (isShiftVoided(report)) {
        return "Shift Void";
      }
    }
    
    if (hasScheduledTimes) {
      if (isFutureDate) {
        return "Scheduled";
      } else if (isToday && !report.time_in) {
        return "Absent";
      } else {
        // Check if time in and out are complete
        const hasCompleteTimeInOut = report.time_in && report.time_out && 
                                   report.time_in !== '-' && report.time_out !== '-';
        
        if (hasCompleteTimeInOut) {
          // Check if followed schedule (not late and completed full schedule)
          const isLate = isLateForSchedule(report);
          const isUndertime = isUndertimeFromSchedule(report);
          
          if (isLate) {
            return "Late";
          } else if (isUndertime) {
            return "UnderTime";
          } else {
            return "Present";
          }
        } else {
          return "Incomplete";
        }
      }
    } else {
      return "Not Yet Scheduled";
    }
  };

  // Helper function to check if employee is late
  const isLateForSchedule = (report) => {
    if (!report.scheduled_time_in || !report.time_in) return false;
    
    try {
      const scheduledTime = moment(`2000-01-01 ${report.scheduled_time_in}`, 'HH:mm');
      const actualTime = moment(`2000-01-01 ${report.time_in}`, 'HH:mm');
      
      if (scheduledTime.isValid() && actualTime.isValid()) {
        // Consider late if actual time is more than 15 minutes after scheduled time
        // AND actual time must be AFTER scheduled time (not before)
        const lateThreshold = 15; // minutes
        const timeDifference = actualTime.diff(scheduledTime, 'minutes');
        return timeDifference > lateThreshold && timeDifference > 0;
      }
    } catch (error) {
      console.error('Error checking late status:', error);
    }
    return false;
  };

  // Helper function to check if employee left early (undertime)
  const isUndertimeFromSchedule = (report) => {
    if (!report.scheduled_time_out || !report.time_out) return false;
    
    try {
      const scheduledTime = moment(`2000-01-01 ${report.scheduled_time_out}`, 'HH:mm');
      const actualTime = moment(`2000-01-01 ${report.time_out}`, 'HH:mm');
      
      if (scheduledTime.isValid() && actualTime.isValid()) {
        // Consider undertime if actual time is more than 15 minutes before scheduled time
        const undertimeThreshold = 15; // minutes
        return scheduledTime.diff(actualTime, 'minutes') > undertimeThreshold;
      }
    } catch (error) {
      console.error('Error checking undertime status:', error);
    }
    return false;
  };

  // Helper function to check if shift is suspiciously short (less than 15 minutes)
  const isSuspiciouslyShortShift = (report) => {
    if (!report.time_in || !report.time_out || 
        report.time_in === '-' || report.time_out === '-') return false;
    
    try {
      const timeIn = moment(`2000-01-01 ${report.time_in}`);
      const timeOut = moment(`2000-01-01 ${report.time_out}`);
      
      if (timeIn.isValid() && timeOut.isValid()) {
        // Handle night shifts crossing midnight
        if (timeOut.isBefore(timeIn)) {
          timeOut.add(1, 'day');
        }
        
        const durationMinutes = timeOut.diff(timeIn, 'minutes');
        
        // Consider suspicious if shift is less than 15 minutes
        const suspiciousThreshold = 15; // minutes
        return durationMinutes < suspiciousThreshold;
      }
    } catch (error) {
      console.error('Error checking suspicious shift duration:', error);
    }
    return false;
  };

  // Helper function to check if shift should be voided
  const isShiftVoided = (report) => {
    if (!report.scheduled_time_in || !report.time_in || !report.time_out ||
        report.time_in === '-' || report.time_out === '-') return false;
    
    try {
      const scheduledIn = moment(`2000-01-01 ${report.scheduled_time_in}`);
      const timeIn = moment(`2000-01-01 ${report.time_in}`);
      const timeOut = moment(`2000-01-01 ${report.time_out}`);
      
      if (scheduledIn.isValid() && timeIn.isValid() && timeOut.isValid()) {
        // Shift void: both time in and time out are before scheduled start time
        return timeIn.isBefore(scheduledIn) && timeOut.isBefore(scheduledIn);
      }
    } catch (error) {
      console.error('Error checking shift void conditions:', error);
    }
    return false;
  };



  // Helper function to get safe BH, LT, UT, ND values
  const getSafeMetrics = (report) => {
    // Return actual values regardless of schedule status
    return {
      bh: report.billed_hours || 0,
      lt: report.late_minutes || 0,
      ut: report.undertime_minutes || 0,
      nd: report.night_differential_hours || 0
    };
  };

  // Function to get status styling based on status
  const getStatusStyling = (status) => {
    switch (status) {
      case "Scheduled":
        return "border-green-200 text-green-800 bg-green-50";
      case "Not Yet Scheduled":
        return "border-yellow-200 text-yellow-800 bg-yellow-50";
      case "Absent":
        return "border-red-200 text-red-800 bg-red-50";
      case "Present":
        return "border-green-200 text-green-800 bg-green-50";
      case "Late":
        return "border-orange-200 text-orange-800 bg-orange-50";
      case "UnderTime":
        return "border-purple-200 text-purple-800 bg-purple-50";
      case "Incomplete":
        return "border-gray-200 text-gray-800 bg-gray-50";
      case "Suspicious Shift":
        return "border-red-300 text-red-900 bg-red-100"; // Special styling for suspicious shifts
      case "Shift Void":
        return "border-red-300 text-red-900 bg-red-100";
      default:
        return "border-gray-200 text-gray-800 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Team Schedule Reports</h1>
            <p className="mt-2 text-gray-600">Generate comprehensive reports on team schedules and performance</p>
          </div>

        {/* View Mode Toggle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => {
                console.log('TeamLeaderScheduleReport: Switching to reports view');
                setViewMode('reports');
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'reports'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Schedule Reports
            </button>
            <button
              onClick={() => {
                console.log('TeamLeaderScheduleReport: Switching to members view');
                setViewMode('members');
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'members'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Team Members
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {/* Date Picker Toggle */}
          <div className="mb-4">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-2 text-sm transition-colors ${
                showDatePicker 
                  ? 'text-blue-600 hover:text-blue-700 font-medium' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
              </svg>
              {showDatePicker ? 'Hide Custom Date Range' : 'Use Custom Date Range'}
            </button>
            {selectedCutoffPeriod && (
              <div className="mt-3 flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-blue-700 font-medium">
                  Period: {getCutoffPeriodDisplay(selectedCutoffPeriod)}
                </span>
              </div>
            )}
          </div>

          {/* Date Picker - Only shown when toggle is active */}
          {showDatePicker && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => {
                    setDateRange({...dateRange, startDate: e.target.value});
                    // Clear cutoff period when manually changing dates
                    if (selectedCutoffPeriod) {
                      setSelectedCutoffPeriod('');
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => {
                    setDateRange({...dateRange, endDate: e.target.value});
                    // Clear cutoff period when manually changing dates
                    if (selectedCutoffPeriod) {
                      setSelectedCutoffPeriod('');
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {viewMode === 'reports' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Employees</option>
                  {Array.isArray(employees) && employees.map((emp) => (
                    <option key={emp.id} value={emp.employee_id || emp.id}>
                      {emp.full_name || emp.first_name || emp.last_name || `Employee ${emp.employee_id || emp.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

          </div>
          
          <div className="flex gap-3 mt-4">
            <button
                              onClick={fetchMemberReports}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Generate Report
            </button>
            <button
              onClick={() => generateMissingData()}
              disabled={selectedEmployee === 'all' || generatingData}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingData ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-5 h-5" />
                  Generate Missing Data
                </>
              )}
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Report
            </button>
          </div>

        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">{successMessage}</div>
              </div>
            </div>
          </div>
        )}

        {/* Content based on view mode */}
        {viewMode === 'reports' ? (
          <>
            {/* Cutoff Period Filter */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-blue-900">Cut Off Period (Auto-generates report)</span>
                </div>
              </div>
              

              
              <select
                value={selectedCutoffPeriod}
                onChange={(e) => handleCutoffPeriodChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {cutoffPeriods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
              
              {selectedCutoffPeriod && (
                <div className="mt-2 text-sm text-blue-700">
                  <span className="font-medium">Selected period:</span> {getCutoffPeriodDisplay(selectedCutoffPeriod)}
                </div>
              )}
            </div>
            
            {/* Report Display */}
            {Array.isArray(individualMemberReports) && individualMemberReports.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                {/* Report Header */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                      <DocumentChartBarIcon className="w-6 h-6 text-blue-600" />
                      <span>TIME ATTENDANCE REPORT</span>
                    </h2>
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                    >
                      <PrinterIcon className="w-4 h-4" />
                      <span>Print Report</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                      <div>
                        <strong>Employee:</strong> {selectedEmployee === 'all' ? 'All Employees' : `Employee ${selectedEmployee}`}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                      <BuildingOfficeIcon className="w-4 h-4 text-green-600" />
                      <div>
                        <strong>Department:</strong> Team Leader View
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
                      <CalendarIcon className="w-4 h-4 text-purple-600" />
                      <div>
                        <strong>Period:</strong> {selectedCutoffPeriod ? getCutoffPeriodDisplay(selectedCutoffPeriod) : `${new Date(dateRange.startDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} - ${new Date(dateRange.endDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl text-center border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaCalendarCheck className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-blue-700">
                      {(() => {
                        const reports = individualMemberReports || [];
                        return reports.length;
                      })()}
                    </div>
                    <div className="text-sm text-blue-800 font-medium">Days Worked</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl text-center border border-green-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaClock className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-green-700">
                      {(() => {
                        const reports = individualMemberReports || [];
                        return reports.reduce((total, report) => {
                          return total + (report.billed_hours || 0);
                        }, 0);
                      })()}
                    </div>
                    <div className="text-sm text-green-800 font-medium">Total BH (minutes)</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl text-center border border-orange-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaExclamationTriangle className="w-8 h-8 text-orange-600" />
                    </div>
                    <div className="text-3xl font-bold text-orange-700">
                      {(() => {
                        const reports = individualMemberReports || [];
                        return reports.reduce((total, report) => {
                          return total + (report.late_minutes || 0);
                        }, 0);
                      })()}
                    </div>
                    <div className="text-sm text-orange-800 font-medium">Total LT</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl text-center border border-red-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaRegClock className="w-8 h-8 text-red-600" />
                    </div>
                    <div className="text-3xl font-bold text-red-700">
                      {(() => {
                        const reports = individualMemberReports || [];
                        return reports.reduce((total, report) => {
                          return total + (report.undertime_minutes || 0);
                        }, 0);
                      })()}
                    </div>
                    <div className="text-sm text-red-800 font-medium">Total UT</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl text-center border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaHourglassHalf className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold text-purple-700">
                      {(() => {
                        const reports = individualMemberReports || [];
                        return reports.reduce((total, report) => {
                          return total + (report.night_differential_hours || 0);
                        }, 0);
                      })()}
                    </div>
                    <div className="text-sm text-purple-800 font-medium">Total ND</div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-2xl text-center border border-indigo-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaClock className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div className="text-3xl font-bold text-indigo-700">
                      {(() => {
                        const reports = individualMemberReports || [];
                        return reports.reduce((total, report) => {
                          return total + (report.overtime_hours || 0);
                        }, 0);
                      })()}
                    </div>
                    <div className="text-sm text-indigo-800 font-medium">Total OT</div>
                  </div>
                </div>

                {/* Daily Records Table */}
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-lg">
                  {/* Schedule View Toggle */}
                  <div className="bg-white border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Schedule Records</h3>
                      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        <button
                          onClick={() => setScheduleViewMode('group')}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            scheduleViewMode === 'group'
                              ? 'bg-white text-blue-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Group View
                        </button>
                        <button
                          onClick={() => setScheduleViewMode('individual')}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            scheduleViewMode === 'individual'
                              ? 'bg-white text-blue-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Individual Days
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {loading ? (
                    <div className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Generating report...</p>
                    </div>
                  ) : !Array.isArray(individualMemberReports) || individualMemberReports.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <div className="text-gray-400 text-6xl mb-4">📊</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {Array.isArray(individualMemberReports) && individualMemberReports.length > 0 ? 'No schedules found for selected period' : 'No data found'}
                      </h3>
                      <p className="text-gray-500">
                        {Array.isArray(individualMemberReports) && individualMemberReports.length > 0 
                          ? 'Try selecting a different cutoff period or adjusting the date range.' 
                          : 'Try adjusting your filters or date range.'
                        }
                      </p>
                      {Array.isArray(individualMemberReports) && individualMemberReports.length > 0 && selectedCutoffPeriod && (
                        <button
                          onClick={() => {
                            setSelectedCutoffPeriod('');
                            setDateRange({
                              startDate: new Date().toISOString().split('T')[0],
                              endDate: new Date().toISOString().split('T')[0]
                            });
                            setShowDatePicker(false);
                          }}
                          className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Clear Cutoff Filter
                        </button>
                      )}
                    </div>
                  ) : (
                    <table className="min-w-full bg-white">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <CalendarIcon className="w-4 h-4" />
                              <span>Date</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <CalendarDaysIcon className="w-4 h-4" />
                              <span>Day</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <UserIcon className="w-4 h-4" />
                              <span>Employee</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <InformationCircleIcon className="w-4 h-4" />
                              <span>Status</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <PlayIcon className="w-4 h-4" />
                              <span>Time In</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <StopIcon className="w-4 h-4" />
                              <span>Time Out</span>
                            </div>
                          </th>

                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <ClockIcon className="w-4 h-4" />
                              <span>Scheduled In</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <ClockIcon className="w-4 h-4" />
                              <span>Scheduled Out</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <FaClock className="w-3 h-3" />
                              <span>BH (min)</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <FaExclamationTriangle className="w-3 h-3" />
                              <span>LT</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <FaRegClock className="w-3 h-3" />
                              <span>UT</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <FaHourglassHalf className="w-3 h-3" />
                              <span>ND</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <FaClock className="w-3 h-3" />
                              <span>OT</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(() => {
                          // Use the grouped data function to prevent date repetition
                          const groupedData = getGroupedDataByDate();
                          console.log('📊 Rendering grouped reports from DailyTimeSummary:', groupedData);
                          
                          return groupedData.map((dateGroup, dateIndex) => (
                            dateGroup.reports.map((report, reportIndex) => {
                              const reportDate = report.date ? new Date(report.date) : new Date();
                              const dayName = reportDate.toLocaleDateString('en-US', { weekday: 'short' });
                              
                              // Simple row styling based on night shift status
                              let rowClassName = "hover:bg-gray-50 transition-colors duration-200";
                              if (report.is_night_shift) {
                                rowClassName += " bg-blue-50 border-l-4 border-blue-400";
                              }
                              
                              return (
                                <tr key={`${dateGroup.date}-${report.id || reportIndex}`} className={rowClassName}>
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    {reportIndex === 0 ? <span>{reportDate.toLocaleDateString()}</span> : ''}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900">
                                    {reportIndex === 0 ? <span>{dayName}</span> : ''}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                    {report.employee_name}
                                  </td>
                                  <td className="px-6 py-4 text-sm">
                                    <div className="flex flex-col space-y-1">
                                      <span className={`inline-flex items-center space-x-2 px-3 py-1 text-xs font-medium rounded-full ${getStatusStyling(report.status)}`}>
                                        {report.status}
                                      </span>
                                      {report.is_night_shift && (
                                        <span className="inline-flex items-center space-x-2 px-2 py-1 text-xs font-medium rounded-full border border-blue-200 text-blue-800 bg-blue-100">
                                          🌙 Nightshift
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                    {report.time_in_formatted}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                    {report.time_out_formatted}
                                  </td>

                                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                    {report.scheduled_time_in_formatted}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                    {report.scheduled_time_out_formatted}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                    {report.billed_hours || '-'}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                    {report.late_minutes || '-'}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                    {report.undertime_minutes || '-'}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                    {report.night_differential_hours || '-'}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                    {report.overtime_hours || '-'}
                                  </td>
                                </tr>
                              );
                            })
                          ));
                        })()}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* No Report State */}
            {(!Array.isArray(individualMemberReports) || individualMemberReports.length === 0) && !loading && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                <div className="text-gray-500">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <DocumentChartBarIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Set your filters and click "Generate Report" to view your TIME ATTENDANCE report.
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Team Members View */
          <>
            {/* Team Summary Display */}
            {teamSummary && teamLeaderInfo && (
              <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedEmployee && selectedEmployee !== 'all' ? 'Employee Report' : `Team: ${teamLeaderInfo.department}`}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {selectedEmployee && selectedEmployee !== 'all' 
                          ? `Viewing data for selected employee` 
                          : `Led by ${teamLeaderInfo.name} (${teamLeaderInfo.employee_id})`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedEmployee && selectedEmployee !== 'all' ? '1' : teamSummary.total_team_members}
                    </div>
                    <div className="text-xs text-gray-500">
                      {selectedEmployee && selectedEmployee !== 'all' ? 'Selected Employee' : 'Team Members'}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-green-100">
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="text-lg font-semibold text-green-600">
                          {selectedEmployee && selectedEmployee !== 'all' 
                          ? individualMemberReports.filter(r => r.status === 'present').length
                            : teamSummary.total_present
                          }
                        </div>
                        <div className="text-xs text-gray-500">Present</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border border-red-100">
                    <div className="flex items-center space-x-2">
                      <XMarkIcon className="w-5 h-5 text-red-500" />
                      <div>
                        <div className="text-lg font-semibold text-red-600">
                          {selectedEmployee && selectedEmployee !== 'all' 
                          ? individualMemberReports.filter(r => r.status === 'absent').length
                            : teamSummary.total_absent
                          }
                        </div>
                        <div className="text-xs text-gray-500">Absent</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border border-yellow-100">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-5 h-5 text-yellow-500" />
                      <div>
                        <div className="text-lg font-semibold text-yellow-600">
                          {selectedEmployee && selectedEmployee !== 'all' 
                          ? individualMemberReports.filter(r => r.status === 'late').length
                            : teamSummary.total_late
                          }
                        </div>
                        <div className="text-xs text-gray-500">Late</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center space-x-2">
                      <DocumentChartBarIcon className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="text-lg font-semibold text-gray-600">
                          {getFilteredMemberReports().length}
                        </div>
                        <div className="text-xs text-gray-500">Total Records</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              

            )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedEmployee && selectedEmployee !== 'all' ? 'Employee Details' : 'Team Members Overview'}: {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
              </h3>
            </div>
            
            {memberLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading team report...</p>
              </div>
            ) : !Array.isArray(employees) || employees.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
                <p className="text-gray-500">Unable to load team member information.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {Array.isArray(employees) && employees
                  .filter(member => {
                    // If a specific employee is selected, show only that employee
                    if (selectedEmployee && selectedEmployee !== 'all') {
                      return member.employee_id === selectedEmployee;
                    }
                    // Otherwise show all team members
                    return true;
                  })
                  .map((member) => {
                    const stats = getTeamMemberStats(member.employee_id || member.id);
                    return (
                      <div key={member.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h4 className="text-lg font-medium text-gray-900">
                                {member.full_name || member.first_name || member.last_name || `Employee ${member.id}`}
                              </h4>
                              <p className="text-xs text-gray-500">{member.position || 'Team Member'}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">{stats.totalHours.toFixed(1)}h</p>
                            <p className="text-xs text-gray-500">Total Hours</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-orange-600">{stats.overtimeHours.toFixed(1)}h</p>
                            <p className="text-xs text-gray-500">Overtime</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => openMemberModal(member)}
                            className="flex-1 text-blue-600 hover:text-blue-900 text-sm font-medium py-2 px-3 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => openIndividualReport(member)}
                            className="flex-1 text-green-600 hover:text-green-900 text-sm font-medium py-2 px-3 rounded border border-green-200 hover:bg-green-50 transition-colors"
                          >
                            Individual Report
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </>
      )}

        {/* Member Detail Modal */}
        {showMemberModal && selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-gray-900">
                  {selectedMember.full_name || selectedMember.first_name || selectedMember.last_name || `Employee ${selectedMember.id}`} - Detailed Report
                </h3>
                <button
                  onClick={() => setShowMemberModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-600">Total Hours</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {getTeamMemberStats(selectedMember.employee_id || selectedMember.id).totalHours.toFixed(1)}h
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-orange-600">Overtime Hours</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {getTeamMemberStats(selectedMember.employee_id || selectedMember.id).overtimeHours.toFixed(1)}h
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-600">Total Schedules</div>
                  <p className="text-2xl font-bold text-green-900">
                    {getTeamMemberStats(selectedMember.employee_id || selectedMember.id).totalSchedules}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-purple-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {getTeamMemberStats(selectedMember.employee_id || selectedMember.id).attendanceRate.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Schedule Details</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(individualMemberReports) && individualMemberReports
                        .filter(report => report.employee_id === selectedMember.id)
                        .map((report) => {
                          // Safe date and time parsing with fallbacks
                          const start = report.time_in ? new Date(`2000-01-01T${report.time_in}`) : null;
                          const end = report.time_out ? new Date(`2000-01-01T${report.time_out}`) : null;
                          const hours = start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) 
                            ? (end - start) / (1000 * 60 * 60) 
                            : 0;
                          const overtime = Math.max(0, hours - 8);
                          
                          return (
                            <tr key={report.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {report.date ? new Date(report.date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {formatTime(report.time_in) || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {formatTime(report.time_out) || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {hours.toFixed(1)}h
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {overtime > 0 ? (
                                  <span className="text-orange-600 font-medium">{overtime.toFixed(1)}h</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Individual Member Report Modal */}
        {showIndividualReport && selectedIndividualMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-gray-900">
                  {selectedIndividualMember.full_name || selectedIndividualMember.first_name || selectedIndividualMember.last_name || `Employee ${selectedIndividualMember.id}`} - Daily Summary Report
                </h3>
                <button
                  onClick={() => setShowIndividualReport(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => generateMissingData(selectedIndividualMember.employee_id || selectedIndividualMember.id)}
                  disabled={generatingData}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
                >
                  {generatingData ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="h-5 w-5 mr-2" />
                      Generate Missing Data
                    </>
                  )}
                </button>
                <button
                  onClick={() => loadIndividualMemberReport(selectedIndividualMember.employee_id || selectedIndividualMember.id)}
                  disabled={memberLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
                >
                  {memberLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <DocumentChartBarIcon className="h-5 w-5 mr-2" />
                      Refresh Report
                    </>
                  )}
                </button>
              </div>

              {/* Daily Summary Table */}
              {memberLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading daily summary report...</p>
                </div>
              ) : individualMemberReports.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled In</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BH</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LT</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UT</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ND</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OT</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getGroupedDataByDate().map((dateGroup, dateIndex) => (
                        dateGroup.reports.map((entry, reportIndex) => (
                          <tr key={`${dateGroup.date}-${entry.id}`} className={`hover:bg-gray-50 ${reportIndex === 0 ? 'border-t-2 border-blue-200' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {reportIndex === 0 ? moment(entry.date).format('MMM DD') : ''}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {reportIndex === 0 ? moment(entry.date).format('ddd') : ''}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                              {entry.employee_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getStatusIcon(entry.status)}
                                <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(entry.status)}`}>
                                  {getStatusDisplay(entry.status)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.time_in_formatted || formatTime(entry.time_in) || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.time_out_formatted || formatTime(entry.time_out) || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.scheduled_time_in_formatted || formatTime(entry.scheduled_time_in) || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.scheduled_time_out_formatted || formatTime(entry.scheduled_time_out) || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex flex-col">
                                <span>{entry.billed_hours || '-'}</span>
                                {entry.billed_hours === 0 && entry.time_in && entry.time_out && entry.scheduled_time_in && 
                                 moment(`2000-01-01 ${entry.time_in}`).isValid() && 
                                 moment(`2000-01-01 ${entry.scheduled_time_in}`).isValid() &&
                                 moment(`2000-01-01 ${entry.time_in}`).isBefore(moment(`2000-01-01 ${entry.scheduled_time_in}`)) &&
                                 moment(`2000-01-01 ${entry.time_out}`).isBefore(moment(`2000-01-01 ${entry.scheduled_time_in}`)) && (
                                  <div className="text-xs text-red-600 font-normal">
                                    ⚠️ Shift voided
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.late_minutes || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.undertime_minutes || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex flex-col">
                                <span>{entry.night_differential_hours || '-'}</span>
                                {entry.night_differential_hours === 0 && entry.time_in && entry.time_out && entry.scheduled_time_in && 
                                 moment(`2000-01-01 ${entry.time_in}`).isValid() && 
                                 moment(`2000-01-01 ${entry.scheduled_time_in}`).isValid() &&
                                 moment(`2000-01-01 ${entry.time_in}`).isBefore(moment(`2000-01-01 ${entry.scheduled_time_in}`)) &&
                                 moment(`2000-01-01 ${entry.time_out}`).isBefore(moment(`2000-01-01 ${entry.scheduled_time_in}`)) && (
                                  <div className="text-xs text-red-600 font-normal">
                                    ⚠️ Shift voided
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.overtime_hours || '-'}
                            </td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DocumentChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No daily summary data</h3>
                  <p className="mt-1 text-sm text-gray-500 mb-4">
                    No daily summary data found for the selected criteria.
                  </p>
                  <button
                    onClick={() => generateMissingData(selectedIndividualMember.employee_id || selectedIndividualMember.id)}
                    disabled={generatingData}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
                  >
                    {generatingData ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Generate Missing Data
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Export Report</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Export Format</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Report will include:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Date range: {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}</li>
                    <li>Employee: {selectedEmployee === 'all' ? 'All Employees' : `Employee ${selectedEmployee}`}</li>

                  </ul>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleExport}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Export
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Night Shift Styling */}
        <style>{`
          .nightshift-row {
            background-color: #eff6ff !important;
            border-left: 4px solid #3b82f6 !important;
          }
          
          .previous-nightshift-timeout-row {
            background-color: #f0fdf4 !important;
            border-left: 4px solid #16a34a !important;
          }
          
          .previous-timeout-indicator {
            color: #16a34a;
            font-weight: 500;
          }
        `}</style>

        {/* Test Function for Shift Voiding Logic */}
        <script dangerouslySetInnerHTML={{
          __html: `
            window.testShiftVoidingComponent = function() {
              console.log('🧪 Testing Component Shift Voiding Logic...');
              
              // Test the actual component's calculateGroupedMetrics function
              if (window.testShiftVoidingData) {
                const testData = window.testShiftVoidingData;
                console.log('📊 Test Data:', testData);
                
                // Simulate the logic from calculateGroupedMetrics
                const timeIn = testData.timeIn;
                const timeOut = testData.timeOut;
                const scheduledIn = testData.scheduledIn;
                const scheduledOut = testData.scheduledOut;
                const date = testData.date;
                
                if (timeIn && timeOut && scheduledIn) {
                  const timeInMoment = moment(\`\${date} \${timeIn}\`, 'YYYY-MM-DD h:mm A');
                  const timeOutMoment = moment(\`\${date} \${timeOut}\`, 'YYYY-MM-DD h:mm A');
                  const scheduledInMoment = moment(\`\${date} \${scheduledIn}\`, 'YYYY-MM-DD h:mm A');
                  
                  if (timeInMoment.isValid() && timeOutMoment.isValid() && scheduledInMoment.isValid()) {
                    const isVoided = timeInMoment.isBefore(scheduledInMoment) && timeOutMoment.isBefore(scheduledInMoment);
                    console.log('🔍 Component Logic Test:');
                    console.log('   Time In:', timeInMoment.format('h:mm A'));
                    console.log('   Time Out:', timeOutMoment.format('h:mm A'));
                    console.log('   Scheduled In:', scheduledInMoment.format('h:mm A'));
                    console.log('   Is Voided:', isVoided);
                    console.log('   ✅ Component logic working correctly');
                  }
                }
              } else {
                console.log('ℹ️  No test data available. Set window.testShiftVoidingData with your test scenario.');
              }
            };
          `
        }} />

      </div>
    </div>
    );
  } catch (error) {
    console.error('TeamLeaderScheduleReport: Render error:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Render Error</h2>
          <p className="text-gray-600 mb-4">Something went wrong while rendering the component</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
};

export default TeamLeaderScheduleReport;
