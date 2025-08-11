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

const TeamLeaderScheduleReport = () => {
  const [employee, setEmployee] = useState(null);
  const [reports, setReports] = useState([]);
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
      console.log('TeamLeaderScheduleReport: Data fetch useEffect', { employee, viewMode });
      if (employee) {
        if (viewMode === 'reports') {
          fetchReports();
        } else if (viewMode === 'members') {
          fetchMemberReports();
        }
      }
    } catch (error) {
      console.error('TeamLeaderScheduleReport: Error in data fetch useEffect:', error);
      setError('Failed to fetch data');
    }
  }, [dateRange, selectedEmployee, employee, viewMode]);

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

  const fetchReports = async (params = {}) => {
    try {
      // Use passed params if available, otherwise fall back to current dateRange state
      const startDate = params.startDate || dateRange.startDate;
      const endDate = params.endDate || dateRange.endDate;
      
      const requestParams = {
        start_date: startDate,
        end_date: endDate
      };
      
      if (selectedEmployee !== 'all') {
        requestParams.employee_id = selectedEmployee;
      }
      
      console.log('TeamLeaderScheduleReport: Fetching reports...', { 
        passedParams: params,
        currentDateRange: dateRange,
        finalRequestParams: requestParams,
        selectedEmployee
      });
      setLoading(true);
      const response = await axiosInstance.get('schedules/report/', { params: requestParams });
      console.log('TeamLeaderScheduleReport: Reports response:', response.data);
      // Ensure we always set an array, even if the response is not an array
      const reportsData = Array.isArray(response.data) ? response.data : [];
      setReports(reportsData);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('TeamLeaderScheduleReport: Error fetching reports:', error);
      setError('Failed to fetch reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberReports = async () => {
    try {
      console.log('TeamLeaderScheduleReport: Fetching member reports...', { params: { start_date: dateRange.startDate, end_date: dateRange.endDate } });
      setMemberLoading(true);
      const params = {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      };

      const response = await axiosInstance.get('schedules/report/', { params });
      console.log('TeamLeaderScheduleReport: Member reports response:', response.data);
      // Ensure we always set an array, even if the response is not an array
      const memberReportsData = Array.isArray(response.data) ? response.data : [];
      setMemberReports(memberReportsData);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('TeamLeaderScheduleReport: Error fetching member reports:', error);
      setError('Failed to fetch member reports');
      setMemberReports([]);
    } finally {
      setMemberLoading(false);
    }
  };

  const handleMemberView = (member) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  };

  const getMemberStats = (memberId) => {
    // Ensure memberReports is an array before filtering
    if (!Array.isArray(memberReports)) {
      return {
        totalHours: 0,
        overtimeHours: 0,
        totalSchedules: 0,
        attendanceRate: 0
      };
    }
    
    const memberSchedules = memberReports.filter(report => report.employee_id === memberId);
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

  const handleExport = async () => {
    try {
      // Use filtered reports for export instead of making a new API call
      const exportData = Array.isArray(reports) ? reports : [];
      
      if (exportData.length === 0) {
        setError('No data to export. Please generate a report first.');
        return;
      }

      // Create download link for CSV (basic implementation)
      let csvContent = '';
      if (exportFormat === 'csv') {
        // Convert filtered data to CSV format
        const headers = ['Date', 'Employee', 'Start Time', 'End Time', 'Hours', 'Overtime', 'Status'];
        csvContent = headers.join(',') + '\n';
        
        exportData.forEach(item => {
          const start = item.start_time ? new Date(`2000-01-01T${item.start_time}`) : null;
          const end = item.end_time ? new Date(`2000-01-01T${item.end_time}`) : null;
          const hours = start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) 
            ? (end - start) / (1000 * 60 * 60) 
            : 0;
          const overtime = Math.max(0, hours - 8);
          const status = hours >= 8 ? 'Complete' : 'Partial';
          
          const row = [
            item.date || '',
            item.employee_name || `Employee ${item.employee_id}` || '',
            item.start_time || '',
            item.end_time || '',
            hours.toFixed(1),
            overtime > 0 ? overtime.toFixed(1) : '0',
            status
          ].join(',');
          csvContent += row + '\n';
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `schedule-report-${dateRange.startDate}-${dateRange.endDate}-filtered.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
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
      const start = new Date(`2000-01-01T${schedule.start_time}`);
      const end = new Date(`2000-01-01T${schedule.end_time}`);
      const hours = (end - start) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
  };

  const calculateOvertime = (schedules) => {
    if (!Array.isArray(schedules)) return 0;
    const standardHours = 8;
    return schedules.reduce((total, schedule) => {
      const start = schedule.start_time ? new Date(`2000-01-01T${schedule.start_time}`) : null;
      const end = schedule.end_time ? new Date(`2000-01-01T${schedule.end_time}`) : null;
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
            fetchReports();
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
      const response = await axiosInstance.get(`daily-summaries/${memberId}/`, {
        params: {
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
          cut_off_period: selectedCutoffPeriod
        }
      });
      
      if (response.status === 200) {
        setIndividualMemberReports(response.data);
        console.log('Individual member report loaded:', response.data);
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
    loadIndividualMemberReport(member.id);
  };

  const openMemberModal = (member) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  };

  const formatTime = (time) => {
    if (!time) return '-';
    return time;
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
    switch (status) {
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
          fetchReports(newDateRange);
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
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name || emp.first_name || emp.last_name || `Employee ${emp.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

          </div>
          
          <div className="flex gap-3 mt-4">
            <button
              onClick={viewMode === 'reports' ? fetchReports : fetchMemberReports}
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
            {Array.isArray(reports) && reports.length > 0 && (
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl text-center border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaCalendarCheck className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-blue-700">{Array.isArray(reports) ? reports.length : 0}</div>
                    <div className="text-sm text-blue-800 font-medium">Days Worked</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl text-center border border-green-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaClock className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-green-700">{Math.round(calculateTotalHours(reports) * 60)}</div>
                    <div className="text-sm text-green-800 font-medium">Total BH (minutes)</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl text-center border border-orange-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaExclamationTriangle className="w-8 h-8 text-orange-600" />
                    </div>
                    <div className="text-3xl font-bold text-orange-700">0</div>
                    <div className="text-sm text-orange-800 font-medium">Total LT</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl text-center border border-red-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaRegClock className="w-8 h-8 text-red-600" />
                    </div>
                    <div className="text-3xl font-bold text-red-700">0</div>
                    <div className="text-sm text-red-800 font-medium">Total UT</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl text-center border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaHourglassHalf className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold text-purple-700">0</div>
                    <div className="text-sm text-purple-800 font-medium">Total ND</div>
                  </div>
                </div>

                {/* Daily Records Table */}
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-lg">
                  {loading ? (
                    <div className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Generating report...</p>
                    </div>
                  ) : !Array.isArray(reports) || reports.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <div className="text-gray-400 text-6xl mb-4">📊</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {Array.isArray(reports) && reports.length > 0 ? 'No schedules found for selected period' : 'No data found'}
                      </h3>
                      <p className="text-gray-500">
                        {Array.isArray(reports) && reports.length > 0 
                          ? 'Try selecting a different cutoff period or adjusting the date range.' 
                          : 'Try adjusting your filters or date range.'
                        }
                      </p>
                      {Array.isArray(reports) && reports.length > 0 && selectedCutoffPeriod && (
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {Array.isArray(reports) && reports.map((report) => {
                          // Safe date and time parsing with fallbacks
                          const start = report.start_time ? new Date(`2000-01-01T${report.start_time}`) : null;
                          const end = report.end_time ? new Date(`2000-01-01T${report.end_time}`) : null;
                          const hours = start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) 
                            ? (end - start) / (1000 * 60 * 60) 
                            : 0;
                          const reportDate = report.date ? new Date(report.date) : new Date();
                          const dayName = reportDate.toLocaleDateString('en-US', { weekday: 'short' });
                          
                          return (
                            <tr key={report.id} className="hover:bg-gray-50 transition-colors duration-200">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {reportDate.toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {dayName}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`inline-flex items-center space-x-2 px-3 py-1 text-xs font-medium rounded-full border ${
                                  hours >= 8 ? 'border-green-200 text-green-800 bg-green-50' : 'border-yellow-200 text-yellow-800 bg-yellow-50'
                                }`}>
                                  {hours >= 8 ? 'Scheduled' : 'Not Yet Scheduled'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                {report.start_time || '-'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                {report.end_time || '-'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                {report.scheduled_in || '07:00 AM'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                {report.scheduled_out || '04:00 PM'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                {Math.round(hours * 60) || 0}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                0
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                0
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                0
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* No Report State */}
            {(!Array.isArray(reports) || reports.length === 0) && !loading && (
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Team Members Overview: {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
              </h3>
            </div>
            
            {memberLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading team members...</p>
              </div>
            ) : !Array.isArray(employees) || employees.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
                <p className="text-gray-500">Unable to load team member information.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {Array.isArray(employees) && employees.map((member) => {
                  const stats = getMemberStats(member.id);
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
                            <p className="text-sm text-gray-500">{member.position || 'Team Member'}</p>
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
                    {getMemberStats(selectedMember.id).totalHours.toFixed(1)}h
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-orange-600">Overtime Hours</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {getMemberStats(selectedMember.id).overtimeHours.toFixed(1)}h
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-600">Total Schedules</p>
                  <p className="text-2xl font-bold text-green-900">
                    {getMemberStats(selectedMember.id).totalSchedules}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-purple-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {getMemberStats(selectedMember.id).attendanceRate.toFixed(1)}%
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
                      {Array.isArray(memberReports) && memberReports
                        .filter(report => report.employee_id === selectedMember.id)
                        .map((report) => {
                          // Safe date and time parsing with fallbacks
                          const start = report.start_time ? new Date(`2000-01-01T${report.start_time}`) : null;
                          const end = report.end_time ? new Date(`2000-01-01T${report.end_time}`) : null;
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
                                {report.start_time || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {report.end_time || 'N/A'}
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
                  onClick={() => generateMissingData(selectedIndividualMember.id)}
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
                  onClick={() => loadIndividualMemberReport(selectedIndividualMember.id)}
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
                      {individualMemberReports.map((entry, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {moment(entry.date).format('MMM DD')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {moment(entry.date).format('ddd')}
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
                            {formatTime(entry.time_in)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(entry.time_out)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(entry.scheduled_time_in)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(entry.scheduled_time_out)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.billed_hours || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.late_minutes || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.undertime_minutes || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.night_differential_hours || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.overtime_hours || '-'}
                          </td>
                        </tr>
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
                    onClick={() => generateMissingData(selectedIndividualMember.id)}
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
