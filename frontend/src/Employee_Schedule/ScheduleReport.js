import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { toast } from 'react-toastify';
import { getTimeAttendanceReport } from '../api/scheduleAPI';
import { 
  CalendarDaysIcon,
  DocumentChartBarIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PrinterIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { 
  FaCalendarAlt, 
  FaFilter,
  FaExclamationTriangle,
  FaClock,
  FaCalendarCheck,
  FaHourglassHalf,
  FaRegClock
} from 'react-icons/fa';

const ScheduleReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    endDate: moment().endOf('month').format('YYYY-MM-DD'),
    cutOffPeriod: ''
  });

  const [showManualDatePicker, setShowManualDatePicker] = useState(false);
  const [autoDetectedCutOff, setAutoDetectedCutOff] = useState(false);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  const [currentEmployeeId, setCurrentEmployeeId] = useState('');

  useEffect(() => {
    // Get current user's employee ID from localStorage
    const employeeData = localStorage.getItem('employee');
    console.log('Employee data from localStorage:', employeeData);
    
    if (employeeData) {
      try {
        const employee = JSON.parse(employeeData);
        console.log('Parsed employee object:', employee);
        if (employee.employee_id) {
          setCurrentEmployeeId(employee.employee_id);
          console.log('Set employee ID:', employee.employee_id);
        } else {
          console.log('No employee_id found in employee object');
        }
      } catch (error) {
        console.error('Error parsing employee data:', error);
      }
    } else {
      console.log('No employee data found in localStorage');
    }
  }, []);

  // Separate useEffect to handle auto-detection after employee ID is set
  useEffect(() => {
    let isMounted = true;
    
    const handleAutoDetection = async () => {
      if (currentEmployeeId && !hasAutoDetected && isMounted) {
        // Auto-detect and set the current cut-off period
        const currentCutOffPeriod = getCurrentCutOffPeriod();
        if (currentCutOffPeriod) {
          console.log('Auto-detected cut-off period:', currentCutOffPeriod);
          if (isMounted) {
            setAutoDetectedCutOff(true);
            setHasAutoDetected(true);
          }
          
          // Call the async function properly
          try {
            if (isMounted) {
              await handleCutOffPeriodChange({ target: { value: currentCutOffPeriod } });
            }
          } catch (error) {
            console.error('Error in auto-detection:', error);
          }
        }
      }
    };

    handleAutoDetection();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [currentEmployeeId, hasAutoDetected]); // This will run when currentEmployeeId changes

  const getCurrentCutOffPeriod = () => {
    const today = moment();
    const currentDay = today.date();
    
    // Check which cut-off period the current date belongs to
    // Priority order: first check the 26-10 range, then 21-5, then 11-25, then 6-20
    
    if (currentDay >= 26 || currentDay <= 10) {
      return 'first_cutoff_26_10';
    } else if (currentDay >= 21 || currentDay <= 5) {
      return 'first_cutoff_21_5';
    } else if (currentDay >= 11 && currentDay <= 25) {
      return 'second_cutoff_11_25';
    } else if (currentDay >= 6 && currentDay <= 20) {
      return 'second_cutoff_6_20';
    }
    
    return null; // No cut-off period detected
  };

  const loadReport = async () => {
    if (!currentEmployeeId) {
      toast.error('Employee information not available');
      return;
    }

    setLoading(true);
    try {
      const reportFilters = {
        ...filters,
        employeeId: currentEmployeeId
      };
      console.log('loadReport called with filters:', reportFilters);
      const data = await getTimeAttendanceReport(reportFilters);
      console.log('Report data loaded:', data);
      console.log('Data structure:', {
        hasEmployee: !!data.employee,
        hasSummary: !!data.summary,
        hasDailyRecords: !!data.daily_records,
        dailyRecordsLength: data.daily_records?.length || 0,
        summaryKeys: data.summary ? Object.keys(data.summary) : [],
        firstRecord: data.daily_records?.[0]
      });
      console.log('Raw daily_records:', data.daily_records);
      console.log('Raw summary:', data.summary);
      setReport(data);
      console.log('Report state set, current report state:', data);
      toast.success('Report loaded successfully');
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      cutOffPeriod: '' // Clear cut-off period when manually changing dates
    }));
  };

  const handleCutOffPeriodChange = async (e) => {
    const { value } = e.target;
    setFilters(prev => ({
      ...prev,
      cutOffPeriod: value
    }));
    
    // Reset auto-detected flag when user manually changes
    setAutoDetectedCutOff(false);

    if (value) {
      const currentDate = moment();
      let startDate, endDate;

      switch (value) {
        case 'first_cutoff_26_10':
          // 26th of previous month to 10th of current month
          startDate = moment().subtract(1, 'month').date(26);
          endDate = moment().date(10);
          break;
        case 'second_cutoff_11_25':
          // 11th to 25th of current month
          startDate = moment().date(11);
          endDate = moment().date(25);
          break;
        case 'first_cutoff_21_5':
          // 21st of previous month to 5th of current month
          startDate = moment().subtract(1, 'month').date(21);
          endDate = moment().date(5);
          break;
        case 'second_cutoff_6_20':
          // 6th to 20th of current month
          startDate = moment().date(6);
          endDate = moment().date(20);
          break;
        default:
          return;
      }

      const newFilters = {
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        cutOffPeriod: value
      };

      setFilters(newFilters);
      
      // Automatically generate report when cut-off period is selected
      if (currentEmployeeId) {
        setLoading(true);
        try {
          const reportFilters = {
            ...newFilters,
            employeeId: currentEmployeeId
          };
          console.log('Generating report with filters:', reportFilters);
          const data = await getTimeAttendanceReport(reportFilters);
          console.log('Report data received:', data);
          console.log('Data structure:', {
            hasEmployee: !!data.employee,
            hasSummary: !!data.summary,
            hasDailyRecords: !!data.daily_records,
            dailyRecordsLength: data.daily_records?.length || 0,
            summaryKeys: data.summary ? Object.keys(data.summary) : [],
            firstRecord: data.daily_records?.[0]
          });
          console.log('Raw daily_records from cut-off change:', data.daily_records);
          console.log('Raw summary from cut-off change:', data.summary);
          setReport(data);
          console.log('Report state set from cut-off change, current report state:', data);
          toast.success('Report generated automatically');
        } catch (error) {
          console.error('Error loading report:', error);
          toast.error(`Failed to generate report: ${error.message || 'Unknown error'}`);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const formatTime = (time) => {
    if (!time || time === '-') return '-';
    
    // Handle both 'HH:mm:ss' and 'HH:mm' formats
    let momentTime;
    if (time.includes(':')) {
      const parts = time.split(':');
      if (parts.length === 2) {
        // Format: 'HH:mm'
        momentTime = moment(time, 'HH:mm');
      } else if (parts.length === 3) {
        // Format: 'HH:mm:ss'
        momentTime = moment(time, 'HH:mm:ss');
      } else {
        return time; // Return as is if format is unknown
      }
    } else {
      return time; // Return as is if no colon found
    }
    
    return momentTime.isValid() ? momentTime.format('hh:mm A') : time;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'text-green-700 bg-green-100 border-green-200';
      case 'late': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'absent': return 'text-red-700 bg-red-100 border-red-200';
      case 'weekend': return 'text-gray-700 bg-gray-100 border-gray-200';
      case 'half_day': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'not_scheduled': return 'text-blue-700 bg-blue-100 border-blue-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircleIcon className="w-4 h-4" />;
      case 'late': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'absent': return <XCircleIcon className="w-4 h-4" />;
      case 'weekend': return <CalendarIcon className="w-4 h-4" />;
      case 'half_day': return <ClockIcon className="w-4 h-4" />;
      case 'not_scheduled': return <InformationCircleIcon className="w-4 h-4" />;
      default: return <InformationCircleIcon className="w-4 h-4" />;
    }
  };

  const getStatusDisplay = (status, scheduledIn = null, scheduledOut = null) => {
    console.log('getStatusDisplay called with:', { status, scheduledIn, scheduledOut });
    switch (status) {
      case 'present': return 'Present';
      case 'late': return 'Late';
      case 'absent': return 'Absent';
      case 'weekend': return 'Weekend';
      case 'half_day': return 'Half Day';
      case 'not_scheduled': 
        // Check if there's a schedule (not "-" or empty)
        const hasSchedule = scheduledIn && scheduledOut && 
                           scheduledIn !== '-' && scheduledOut !== '-' && 
                           scheduledIn.toString().trim() !== '' && scheduledOut.toString().trim() !== '';
        console.log('not_scheduled case - hasSchedule:', hasSchedule, 'scheduledIn:', scheduledIn, 'scheduledOut:', scheduledOut);
        return hasSchedule ? 'Scheduled' : 'Not Yet Scheduled';
      default: return '-';
    }
  };

  const getCutOffPeriodDisplay = (value) => {
    if (!value) return '';
    
    const currentDate = moment();
    let startDate, endDate;

    switch (value) {
      case 'first_cutoff_26_10':
        // 26th of previous month to 10th of current month
        startDate = moment().subtract(1, 'month').date(26);
        endDate = moment().date(10);
        return `${startDate.format('MMM DD')} - ${endDate.format('MMM DD, YYYY')}`;
      case 'second_cutoff_11_25':
        // 11th to 25th of current month
        startDate = moment().date(11);
        endDate = moment().date(25);
        return `${startDate.format('MMM DD')} - ${endDate.format('MMM DD, YYYY')}`;
      case 'first_cutoff_21_5':
        // 21st of previous month to 5th of current month
        startDate = moment().subtract(1, 'month').date(21);
        endDate = moment().date(5);
        return `${startDate.format('MMM DD')} - ${endDate.format('MMM DD, YYYY')}`;
      case 'second_cutoff_6_20':
        // 6th to 20th of current month
        startDate = moment().date(6);
        endDate = moment().date(20);
        return `${startDate.format('MMM DD')} - ${endDate.format('MMM DD, YYYY')}`;
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
              <DocumentChartBarIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Schedule Report</h1>
              <p className="text-gray-600 flex items-center space-x-2">
                <ClockIcon className="w-4 h-4" />
                <span>View your TIME ATTENDANCE report</span>
              </p>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
              <FaFilter className="w-5 h-5 text-blue-600" />
              <span>Report Filters</span>
            </h2>
          </div>
          
          {/* Cut Off Period Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
              <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
              <span>Cut Off Period (Auto-generates report)</span>
            </label>
            <div className="relative">
              <select
                name="cutOffPeriod"
                value={filters.cutOffPeriod}
                onChange={handleCutOffPeriodChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
              >
                <option value="">Select Cut Off Period</option>
                <option value="first_cutoff_26_10">First Cut Off 26 to 10</option>
                <option value="second_cutoff_11_25">Second Cut Off 11 to 25</option>
                <option value="first_cutoff_21_5">First Cut Off 21 to 5</option>
                <option value="second_cutoff_6_20">Second Cut Off 6 to 20</option>
              </select>
              {filters.cutOffPeriod && (
                <div className="mt-3 flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">
                    Period: {getCutOffPeriodDisplay(filters.cutOffPeriod)}
                  </span>
                  {autoDetectedCutOff && (
                    <span className="ml-2 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full flex items-center space-x-1">
                      <CheckCircleIcon className="w-3 h-3" />
                      <span>Auto-detected</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Manual Date Picker Toggle */}
          <div className="mb-4">
            <button
              onClick={() => setShowManualDatePicker(!showManualDatePicker)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-2 transition-colors duration-200"
            >
              {showManualDatePicker ? (
                <>
                  <ChevronUpIcon className="w-4 h-4" />
                  <span>Hide Manual Date Picker</span>
                </>
              ) : (
                <>
                  <ChevronDownIcon className="w-4 h-4" />
                  <span>Show Manual Date Picker</span>
                </>
              )}
            </button>
          </div>

          {/* Manual Date Range Filters */}
          {showManualDatePicker && (
            <div className="border-t border-gray-200 pt-6 mb-4">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center space-x-2">
                <FaCalendarAlt className="w-4 h-4 text-blue-600" />
                <span>Manual Date Selection</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={loadReport}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    {loading ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <MagnifyingGlassIcon className="w-4 h-4" />
                        <span>Generate Report</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setFilters({
                        startDate: moment().startOf('month').format('YYYY-MM-DD'),
                        endDate: moment().endOf('month').format('YYYY-MM-DD'),
                        cutOffPeriod: ''
                      });
                      setShowManualDatePicker(false);
                      setAutoDetectedCutOff(false);
                      setHasAutoDetected(false);
                    }}
                    className="px-4 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Report Display */}
        {report && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            {console.log('Rendering report:', report)}
            {console.log('Report structure:', {
              hasEmployee: !!report.employee,
              hasSummary: !!report.summary,
              hasDailyRecords: !!report.daily_records,
              dailyRecordsLength: report.daily_records?.length || 0
            })}
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
                    <strong>Employee:</strong> {report.employee.name} ({report.employee.employee_id})
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                  <BuildingOfficeIcon className="w-4 h-4 text-green-600" />
                  <div>
                    <strong>Department:</strong> {report.employee.department}
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
                  <CalendarIcon className="w-4 h-4 text-purple-600" />
                  <div>
                    <strong>Period:</strong> {moment(report.period.start_date).format('MMM DD')} - {moment(report.period.end_date).format('MMM DD, YYYY')}
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
                <div className="text-3xl font-bold text-blue-700">{report.summary.days_worked}</div>
                <div className="text-sm text-blue-800 font-medium">Days Worked</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl text-center border border-green-200 shadow-lg hover:shadow-xl transition-all duration-200">
                <div className="flex justify-center mb-2">
                  <FaClock className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-700">{report.summary.total_billed_hours}</div>
                <div className="text-sm text-green-800 font-medium">Total BH (minutes)</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl text-center border border-orange-200 shadow-lg hover:shadow-xl transition-all duration-200">
                <div className="flex justify-center mb-2">
                  <FaExclamationTriangle className="w-8 h-8 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-orange-700">{report.summary.total_late_minutes}</div>
                <div className="text-sm text-orange-800 font-medium">Total LT</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl text-center border border-red-200 shadow-lg hover:shadow-xl transition-all duration-200">
                <div className="flex justify-center mb-2">
                  <FaRegClock className="w-8 h-8 text-red-600" />
                </div>
                <div className="text-3xl font-bold text-red-700">{report.summary.total_undertime_minutes}</div>
                <div className="text-sm text-red-800 font-medium">Total UT</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl text-center border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-200">
                <div className="flex justify-center mb-2">
                  <FaHourglassHalf className="w-8 h-8 text-purple-600" />
                </div>
                <div className="text-3xl font-bold text-purple-700">{report.summary.total_night_differential}</div>
                <div className="text-sm text-purple-800 font-medium">Total ND</div>
              </div>
            </div>

            {/* Daily Records Table */}
            <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-lg">
              {console.log('About to check daily_records:', {
                hasDailyRecords: !!report.daily_records,
                dailyRecordsType: typeof report.daily_records,
                dailyRecordsLength: report.daily_records?.length || 0,
                dailyRecordsIsArray: Array.isArray(report.daily_records),
                dailyRecordsContent: report.daily_records
              })}
              {!report.daily_records || report.daily_records.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-lg font-medium mb-2">No Daily Records Found</div>
                  <div className="text-sm">The report was generated but no daily records are available.</div>
                  <div className="text-xs mt-2 text-gray-400">
                    Debug: {JSON.stringify({
                      hasDailyRecords: !!report.daily_records,
                      dailyRecordsLength: report.daily_records?.length || 0,
                      reportKeys: Object.keys(report || {})
                    })}
                  </div>
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
                  {report.daily_records.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {moment(record.date).format('MMM DD')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {record.day}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center space-x-2 px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(record.status)}`}>
                          {getStatusIcon(record.status)}
                          <span>{getStatusDisplay(record.status, record.scheduled_in, record.scheduled_out)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {formatTime(record.time_in)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {formatTime(record.time_out)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {formatTime(record.scheduled_in)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {formatTime(record.scheduled_out)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {record.billed_hours || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {record.late_minutes}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {record.undertime_minutes}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {record.night_differential}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
          </div>
        )}

        {/* No Report State */}
        {!report && !loading && (
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
      </div>
    </div>
  );
};

export default ScheduleReport; 