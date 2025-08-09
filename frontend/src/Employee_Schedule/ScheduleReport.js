import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { toast } from 'react-toastify';
import { getTimeAttendanceReport } from '../api/scheduleAPI';

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
    if (currentEmployeeId && !hasAutoDetected) {
      // Auto-detect and set the current cut-off period
      const currentCutOffPeriod = getCurrentCutOffPeriod();
      if (currentCutOffPeriod) {
        console.log('Auto-detected cut-off period:', currentCutOffPeriod);
        setAutoDetectedCutOff(true);
        setHasAutoDetected(true);
        handleCutOffPeriodChange({ target: { value: currentCutOffPeriod } });
      }
    }
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
      const data = await getTimeAttendanceReport(reportFilters);
      setReport(data);
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
          const data = await getTimeAttendanceReport(reportFilters);
          setReport(data);
          toast.success('Report generated automatically');
        } catch (error) {
          console.error('Error loading report:', error);
          toast.error('Failed to generate report');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const formatTime = (time) => {
    if (!time || time === '-') return '-';
    return moment(time, 'HH:mm:ss').format('hh:mm A');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'late': return 'text-orange-600 bg-orange-100';
      case 'absent': return 'text-red-600 bg-red-100';
      case 'weekend': return 'text-gray-600 bg-gray-100';
      case 'half_day': return 'text-yellow-600 bg-yellow-100';
      case 'not_scheduled': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'present': return 'Present';
      case 'late': return 'Late';
      case 'absent': return 'Absent';
      case 'weekend': return 'Weekend';
      case 'half_day': return 'Half Day';
      case 'not_scheduled': return 'Not Yet Scheduled';
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Report</h1>
          <p className="text-gray-600">View your TIME ATTENDANCE report</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Report Filters</h2>
          
          {/* Cut Off Period Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cut Off Period (Auto-generates report)
            </label>
            <select
              name="cutOffPeriod"
              value={filters.cutOffPeriod}
              onChange={handleCutOffPeriodChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Cut Off Period</option>
              <option value="first_cutoff_26_10">First Cut Off 26 to 10</option>
              <option value="second_cutoff_11_25">Second Cut Off 11 to 25</option>
              <option value="first_cutoff_21_5">First Cut Off 21 to 5</option>
              <option value="second_cutoff_6_20">Second Cut Off 6 to 20</option>
            </select>
            {filters.cutOffPeriod && (
              <div className="mt-2 text-sm text-blue-600 font-medium">
                📅 Period: {getCutOffPeriodDisplay(filters.cutOffPeriod)}
                {autoDetectedCutOff && (
                  <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    Auto-detected
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Manual Date Picker Toggle */}
          <div className="mb-4">
            <button
              onClick={() => setShowManualDatePicker(!showManualDatePicker)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
            >
              {showManualDatePicker ? '🔽' : '▶️'} 
              {showManualDatePicker ? 'Hide Manual Date Picker' : 'Show Manual Date Picker'}
            </button>
          </div>

          {/* Manual Date Range Filters */}
          {showManualDatePicker && (
            <div className="border-t pt-4 mb-4">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Manual Date Selection</h3>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={loadReport}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Generate Report'}
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
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Report Display */}
        {report && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Report Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                TIME ATTENDANCE REPORT
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <strong>Employee:</strong> {report.employee.name} ({report.employee.employee_id})
                </div>
                <div>
                  <strong>Department:</strong> {report.employee.department}
                </div>
                <div>
                  <strong>Period:</strong> {moment(report.period.start_date).format('MMM DD')} - {moment(report.period.end_date).format('MMM DD, YYYY')}
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{report.summary.days_worked}</div>
                <div className="text-sm text-blue-800">Days Worked</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{report.summary.total_billed_hours}</div>
                <div className="text-sm text-green-800">Total BH</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">{report.summary.total_late_minutes}</div>
                <div className="text-sm text-orange-800">Total LT</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{report.summary.total_undertime_minutes}</div>
                <div className="text-sm text-red-800">Total UT</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{report.summary.total_night_differential}</div>
                <div className="text-sm text-purple-800">Total ND</div>
              </div>
            </div>

            {/* Daily Records Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Day
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Time In
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Time Out
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Scheduled In
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Scheduled Out
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      BH
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      LT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      UT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      ND
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.daily_records.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 border-b">
                        {moment(record.date).format('MMM DD')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b">
                        {record.day}
                      </td>
                      <td className="px-4 py-3 text-sm border-b">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                          {getStatusDisplay(record.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b">
                        {formatTime(record.time_in)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b">
                        {formatTime(record.time_out)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b">
                        {formatTime(record.scheduled_in)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b">
                        {formatTime(record.scheduled_out)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b">
                        {record.billed_hours}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b">
                        {record.late_minutes}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b">
                        {record.undertime_minutes}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b">
                        {record.night_differential}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Print Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Print Report
              </button>
            </div>
          </div>
        )}

        {/* No Report State */}
        {!report && !loading && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Report Generated</h3>
              <p className="mt-1 text-sm text-gray-500">
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