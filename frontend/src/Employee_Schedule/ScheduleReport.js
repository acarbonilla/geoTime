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
  StopIcon,
  ArrowDownTrayIcon
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
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

// Try to import jspdf-autotable with error handling
let autoTableAvailable = false;
try {
  // Try dynamic import for browser compatibility
  if (typeof window !== 'undefined') {
    // Browser environment - try to check if autoTable is available
    autoTableAvailable = false; // Will be checked at runtime
    console.log('Browser environment detected, will check autoTable availability at runtime');
  } else {
    // Node.js environment
    require('jspdf-autotable');
    autoTableAvailable = true;
    console.log('jspdf-autotable imported successfully in Node.js');
  }
} catch (error) {
  console.warn('jspdf-autotable import failed, will use text-only PDF:', error);
  autoTableAvailable = false;
}

// Debug: Check if autoTable is available
console.log('jsPDF version:', jsPDF.version);
console.log('autoTable available:', autoTableAvailable);

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
      
      // DEBUG: Check for time_entries data structure
      console.log('=== TIME ENTRIES DEBUG ===');
      if (data.time_entries) {
        console.log('✅ Time entries found at root level:', data.time_entries);
      } else {
        console.log('❌ No time_entries at root level');
      }
      
      if (data.daily_records && data.daily_records.length > 0) {
        console.log('=== DAILY RECORDS STRUCTURE ===');
        console.log('First record keys:', Object.keys(data.daily_records[0]));
        console.log('First record:', data.daily_records[0]);
        
        // Check if time_entries is nested in daily_records
        data.daily_records.forEach((record, index) => {
          if (record.time_entries) {
            console.log(`✅ Record ${index} (${record.date}) has time_entries:`, record.time_entries);
          }
        });
        
        // Check for any field that might contain time out data
        const firstRecord = data.daily_records[0];
        console.log('🔍 ALL FIELDS in first record:');
        Object.keys(firstRecord).forEach(key => {
          console.log(`  ${key}:`, firstRecord[key]);
        });
        
        // Also check if there are any nested objects or arrays
        Object.keys(firstRecord).forEach(key => {
          const value = firstRecord[key];
          if (value && typeof value === 'object') {
            console.log(`🔍 Nested object in '${key}':`, value);
          }
          if (Array.isArray(value)) {
            console.log(`🔍 Array in '${key}':`, value);
          }
        });
      }
      
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
          
          // DEBUG: Check for time_entries data structure (cut-off change)
          console.log('=== TIME ENTRIES DEBUG (CUT-OFF) ===');
          if (data.time_entries) {
            console.log('✅ Time entries found at root level:', data.time_entries);
          } else {
            console.log('❌ No time_entries at root level');
          }
          
          if (data.daily_records && data.daily_records.length > 0) {
            console.log('=== DAILY RECORDS STRUCTURE (CUT-OFF) ===');
            console.log('First record keys:', Object.keys(data.daily_records[0]));
            console.log('First record:', data.daily_records[0]);
            
            // Check if time_entries is nested in daily_records
            data.daily_records.forEach((record, index) => {
              if (record.time_entries) {
                console.log(`✅ Record ${index} (${record.date}) has time_entries:`, record.time_entries);
              }
            });
            
            // Check for any field that might contain time out data
            const firstRecord = data.daily_records[0];
            console.log('🔍 ALL FIELDS in first record (CUT-OFF):');
            Object.keys(firstRecord).forEach(key => {
              console.log(`  ${key}:`, firstRecord[key]);
            });
            
            // Also check if there are any nested objects or arrays
            Object.keys(firstRecord).forEach(key => {
              const value = firstRecord[key];
              if (value && typeof value === 'object') {
                console.log(`🔍 Nested object in '${key}':`, value);
              }
              if (Array.isArray(value)) {
                console.log(`🔍 Array in '${key}':`, value);
              }
            });
          }
          
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

  const getDisplayTimeOut = (record, allRecords, currentIndex) => {
    // ROBUST SOLUTION: Handle multiple data sources for time out
    
    // 1. Try the direct time_out field first
    if (record.time_out && record.time_out !== '-') {
      return formatTime(record.time_out);
    }
    
    // 2. Check if we have time_entries data to extract time out
    if (record.time_entries && Array.isArray(record.time_entries)) {
      // Find the last time entry (time out) for this date
      const timeOutEntry = record.time_entries
        .filter(entry => entry.event_type === 'time_out' || entry.event_type === 'clock_out')
        .sort((a, b) => new Date(b.event_time) - new Date(a.event_time))[0];
      
      if (timeOutEntry && timeOutEntry.event_time) {
        return formatTime(timeOutEntry.event_time);
      }
    }
    
    // 3. Check for alternative field names
    const alternativeFields = ['timeout', 'clock_out', 'end_time', 'departure_time'];
    for (const field of alternativeFields) {
      if (record[field] && record[field] !== '-') {
        return formatTime(record[field]);
      }
    }
    
    // 4. If no time out found, show dash
    return '-';
  };



  const debugTimeDisplay = (record, allRecords, currentIndex) => {
    console.log(`🔍 DEBUG TIME DISPLAY for ${record.date}:`);
    console.log(`📅 Record:`, {
      date: record.date,
      status: record.status,
      time_in: record.time_in,
      time_out: record.time_out,
      scheduled_in: record.scheduled_in,
      scheduled_out: record.scheduled_out
    });
    
    console.log(`🔍 Time Out Analysis:`);
    if (record.time_out && record.time_out !== '-') {
      console.log(`  ✅ HAS ACTUAL TIME OUT: ${record.time_out}`);
    } else {
      console.log(`  ❌ NO ACTUAL TIME OUT`);
    }
    
    if (record.time_in && record.time_in !== '-') {
      const timeInMoment = moment(record.time_in, 'HH:mm:ss');
      const isNightShift = timeInMoment.isValid() && timeInMoment.hour() >= 18;
      console.log(`  🌙 Night Shift: ${isNightShift ? 'YES' : 'NO'} (Time In: ${record.time_in}, Hour: ${timeInMoment.isValid() ? timeInMoment.hour() : 'invalid'})`);
      
      if (isNightShift && record.scheduled_out && record.scheduled_out !== '-') {
        console.log(`  📋 Has Scheduled Out: ${record.scheduled_out}`);
      }
    }
    
    if (currentIndex !== undefined && currentIndex < allRecords.length - 1) {
      const nextRecord = allRecords[currentIndex + 1];
      console.log(`  🔗 Next Record:`, {
        date: nextRecord?.date,
        time_out: nextRecord?.time_out,
        scheduled_out: nextRecord?.scheduled_out,
        status: nextRecord?.status
      });
    }
    
    console.log(`📊 Final Result: ${getDisplayTimeOut(record, allRecords, currentIndex)}`);
    console.log(`🔍 END DEBUG for ${record.date}\n`);
  };

     const calculateNightDifferential = (timeIn, timeOut, scheduledIn, scheduledOut, recordDate) => {
    if (!timeIn || !timeOut || timeIn === '-' || timeOut === '-') {
      return 0;
    }
    
    const baseDate = moment(recordDate, 'YYYY-MM-DD');
    if (!baseDate.isValid()) {
      return 0;
    }
    
    // Parse time strings using the record's date as context
    const timeInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeIn}`);
    let timeOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeOut}`);
    
    if (!timeInMoment.isValid() || !timeOutMoment.isValid()) {
      return 0;
    }
    
    // If time out is before time in, it means the shift spans midnight
    if (timeOutMoment.isBefore(timeInMoment)) {
      timeOutMoment = moment(timeOutMoment).add(1, 'day');
      console.log('Shift spans midnight, adjusted timeOutMoment:', timeOutMoment.format('YYYY-MM-DD HH:mm:ss'));
    }
    
    // Apply same abuse prevention logic as calculateBilledHours
    const scheduledInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledIn}`);
    const scheduledOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledOut}`);
    
    if (scheduledOutMoment.isBefore(scheduledInMoment)) {
      scheduledOutMoment.add(1, 'day');
    }
    
    let effectiveTimeIn = timeInMoment;
    let effectiveTimeOut = timeOutMoment;
    
    // If user clocked in early, cap to scheduled time (prevents abuse)
    if (timeInMoment.isBefore(scheduledInMoment)) {
      effectiveTimeIn = scheduledInMoment.clone();
      console.log(`ND: User clocked in early (${timeInMoment.format('HH:mm')}), capped to scheduled time (${scheduledInMoment.format('HH:mm')})`);
    }
    
    // If user clocked out late, cap to scheduled time (prevents abuse)
    if (timeOutMoment.isAfter(scheduledOutMoment)) {
      effectiveTimeOut = scheduledOutMoment.clone();
      console.log(`ND: User clocked out late (${timeOutMoment.format('HH:mm')}), capped to scheduled time (${scheduledOutMoment.format('HH:mm')})`);
    }
    
    let ndHours = 0;
    
    // ND period: 10:00 PM (22:00) to 6:00 AM (06:00) of the next day
    // Always start ND period at 10 PM of the base date
    const ndStart = moment(baseDate).set({ hour: 22, minute: 0, second: 0 });
    
    // Always end ND period at 6 AM of the next day
    const ndEnd = moment(baseDate).add(1, 'day').set({ hour: 6, minute: 0, second: 0 });
    
    console.log('ND period:', { 
      ndStart: ndStart.format('YYYY-MM-DD HH:mm:ss'), 
      ndEnd: ndEnd.format('YYYY-MM-DD HH:mm:ss'),
      timeIn: effectiveTimeIn.format('YYYY-MM-DD HH:mm:ss'),
      timeOut: effectiveTimeOut.format('YYYY-MM-DD HH:mm:ss')
    });
    
    // Find the effective start time for ND calculation
    let effectiveNDStart = ndStart;
    if (effectiveTimeIn.isAfter(ndStart)) {
      effectiveNDStart = effectiveTimeIn.clone();
      console.log('Time in is after ND start, using time in as ND start');
    }
    
    // Find the effective end time for ND calculation
    // Use effective time out (with abuse prevention applied)
    let effectiveNDEnd = ndEnd;
    if (effectiveTimeOut.isBefore(ndEnd)) {
      effectiveNDEnd = effectiveTimeOut.clone();
      console.log(`ND end capped to effective time out: ${effectiveTimeOut.format('HH:mm')} (using effective time worked)`);
    }
    
    // Calculate ND hours only if there's overlap with ND period
    if (effectiveNDStart.isBefore(effectiveNDEnd)) {
      const duration = moment.duration(effectiveNDEnd.diff(effectiveNDStart));
      ndHours = duration.asHours();
      console.log(`ND overlap found: ${effectiveNDStart.format('HH:mm')} - ${effectiveNDEnd.format('HH:mm')} = ${ndHours} hours`);
    } else {
      console.log('No overlap with ND period');
      return 0;
    }
    
    // Apply break deduction based on total shift duration
    const totalShiftDuration = effectiveTimeOut.diff(effectiveTimeIn, 'hours');
    let breakDeduction = 0;
    
    if (totalShiftDuration >= 7) {
      breakDeduction = 1; // 1 hour break for 7+ hour shifts (changed from 8 to 7)
      console.log('ND break deduction: 1 hour (7+ hour shift)');
    } else if (totalShiftDuration >= 4) {
      breakDeduction = 0.5; // 30 minutes break for 4+ hour shifts
      console.log('ND break deduction: 30 minutes (4+ hour shift)');
    } else {
      console.log('ND break deduction: 0 hours (shift < 4 hours)');
    }
    
    // Apply break deduction to ND hours
    ndHours = Math.max(0, ndHours - breakDeduction);
    
    // Round to 2 decimal places
    const finalND = Math.round(ndHours * 100) / 100;
    console.log('Final ND hours (rounded):', finalND);
    
    return finalND;
  };

  const calculateLateMinutes = (timeIn, scheduledIn, recordDate) => {
    if (!timeIn || !scheduledIn || timeIn === '-' || scheduledIn === '-') {
      return 0;
    }
    
    const baseDate = moment(recordDate, 'YYYY-MM-DD');
    if (!baseDate.isValid()) {
      return 0;
    }
    
    const timeInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeIn}`);
    const scheduledInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledIn}`);
    
    if (!timeInMoment.isValid() || !scheduledInMoment.isValid()) {
      return 0;
    }
    
    // If time in is after scheduled time, calculate late minutes
    if (timeInMoment.isAfter(scheduledInMoment)) {
      const duration = moment.duration(timeInMoment.diff(scheduledInMoment));
      const lateMinutes = Math.round(duration.asMinutes());
      
      // RULE: If late is 5 minutes or less = No Late
      if (lateMinutes <= 5) {
        return 0;
      }
      
      // RULE: If late is more than 5 minutes, add 5 minutes to late
      return lateMinutes + 5;
    }
    
    return 0;
  };

  /**
   * Calculate Undertime (UT) based on new dynamic BH calculation with proper break consideration
   * 
   * NEW LOGIC: Uses the same dynamic BH calculation as the main BH display
   * Formula: UT = (Scheduled Hours - Break) - Dynamic BH (actual time worked)
   * 
   * This ensures UT represents the actual undertime after accounting for scheduled breaks
   */
  const calculateUndertimeMinutes = (timeIn, timeOut, scheduledIn, scheduledOut, recordDate) => {
    if (!timeIn || !timeOut || !scheduledIn || !scheduledOut || 
        timeIn === '-' || timeOut === '-' || scheduledIn === '-' || scheduledOut === '-') {
      return 0;
    }
    
    const baseDate = moment(recordDate, 'YYYY-MM-DD');
    if (!baseDate.isValid()) {
      return 0;
    }
    
    // Parse scheduled times for UT calculation
    const scheduledInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledIn}`);
    const scheduledOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledOut}`);
    
    if (!scheduledInMoment.isValid() || !scheduledOutMoment.isValid()) {
      return 0;
    }
    
    // Handle scheduled times that span midnight
    if (scheduledOutMoment.isBefore(scheduledInMoment)) {
      scheduledOutMoment.add(1, 'day');
    }
    
    // Calculate scheduled duration (gross - before break deduction)
    const scheduledDuration = moment.duration(scheduledOutMoment.diff(scheduledInMoment));
    const scheduledMinutes = scheduledDuration.asMinutes();
    
    // Calculate scheduled break deduction based on scheduled duration
    let scheduledBreakMinutes = 0;
    if (scheduledMinutes >= 420) { // 7 hours or more (changed from 480 to 420)
      scheduledBreakMinutes = 60; // 1 hour break
    } else if (scheduledMinutes >= 240) { // 4 hours or more
      scheduledBreakMinutes = 30; // 30 minutes break
    }
    
    // Calculate net scheduled time (after break deduction)
    const netScheduledMinutes = scheduledMinutes - scheduledBreakMinutes;
    
         // NEW: Use the dynamic BH calculation (actual time worked)
     const dynamicBHMinutes = calculateBilledHours(timeIn, timeOut, scheduledIn, scheduledOut, recordDate);
    
    // RULE: UT = (Net Scheduled Hours - Dynamic BH)
    // This represents actual undertime after accounting for scheduled breaks
    const undertimeMinutes = Math.max(0, netScheduledMinutes - dynamicBHMinutes);
    
    console.log(`UT calculation for ${recordDate}: Gross Scheduled ${scheduledMinutes}min - Break ${scheduledBreakMinutes}min = Net Scheduled ${netScheduledMinutes}min - Dynamic BH ${dynamicBHMinutes}min = UT ${undertimeMinutes}min`);
    
    return Math.round(undertimeMinutes);
  };

  const calculateBreakHours = (timeIn, timeOut, recordDate) => {
    if (!timeIn || !timeOut || timeIn === '-' || timeOut === '-') {
      return 0;
    }
    
    const baseDate = moment(recordDate, 'YYYY-MM-DD');
    if (!baseDate.isValid()) {
      return 0;
    }
    
    const timeInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeIn}`);
    const timeOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeOut}`);
    
    if (!timeInMoment.isValid() || !timeOutMoment.isValid()) {
      return 0;
    }
    
    // If time out is before time in, it means the shift spans midnight
    if (timeOutMoment.isBefore(timeInMoment)) {
      timeOutMoment.add(1, 'day');
    }
    
    // Calculate total work duration
    const totalDuration = moment.duration(timeOutMoment.diff(timeInMoment));
    const totalHours = totalDuration.asHours();
    
    // Standard break deduction: 1 hour for shifts 7+ hours, 30 minutes for shorter shifts
    let breakHours = 0;
    if (totalHours >= 7) { // Changed from 8 to 7
      breakHours = 1;
    } else if (totalHours >= 4) {
      breakHours = 0.5;
    }
    
    return breakHours;
  };

  /**
   * Calculate Billed Hours (BH) based on ACTUAL time worked with automatic break deduction
   * 
   * NEW LOGIC: Uses actual time worked (time out - time in) instead of scheduled times
   * This makes BH dynamic and reflects the actual hours worked, not just scheduled hours.
   * 
   * BREAK DEDUCTION RULES:
   * - Shifts ≥ 8 hours (480+ minutes): Deduct 1 hour (60 minutes)
   * - Shifts ≥ 4 hours (240+ minutes): Deduct 30 minutes
   * - Shifts < 4 hours: No break deduction
   * 
   * Example: 8:59 PM → 11:38 PM (2h 39m = 159 minutes)
   * - Actual duration: 159 minutes
   * - Break deduction: 30 minutes (≥4 hours but <7 hours)
   * - Final BH: 129 minutes
   * 
   * Previous logic used scheduled times, now uses actual clock in/out times for dynamic BH calculation.
   */
     const calculateBilledHours = (timeIn, timeOut, scheduledIn, scheduledOut, recordDate) => {
     if (!timeIn || !timeOut || timeIn === '-' || timeOut === '-') {
       return 0;
     }
     
     if (!scheduledIn || !scheduledOut || scheduledIn === '-' || scheduledOut === '-') {
       return 0;
     }

     try {
       const baseDate = moment(recordDate, 'YYYY-MM-DD');
       if (!baseDate.isValid()) {
         return 0;
       }

       // Parse actual time worked (time out - time in)
       const timeInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeIn}`);
       let timeOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeOut}`);
       
       // Parse scheduled times for abuse prevention
       const scheduledInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledIn}`);
       const scheduledOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledOut}`);
       
       if (!timeInMoment.isValid() || !timeOutMoment.isValid() || 
           !scheduledInMoment.isValid() || !scheduledOutMoment.isValid()) {
         return 0;
       }

       // Handle night shifts that span midnight
       if (timeOutMoment.isBefore(timeInMoment)) {
         timeOutMoment = moment(timeOutMoment).add(1, 'day');
       }
       if (scheduledOutMoment.isBefore(scheduledInMoment)) {
         scheduledOutMoment.add(1, 'day');
       }

       // STRICT ABUSE PREVENTION: Cap actual times to scheduled times to prevent any abuse
       let effectiveTimeIn = timeInMoment;
       let effectiveTimeOut = timeOutMoment;
       
       // If user clocked in early, cap to scheduled time (prevents abuse)
       if (timeInMoment.isBefore(scheduledInMoment)) {
         effectiveTimeIn = scheduledInMoment.clone();
         console.log(`User clocked in early (${timeInMoment.format('HH:mm')}), capped to scheduled time (${scheduledInMoment.format('HH:mm')})`);
       }
       
       // If user clocked out late, cap to scheduled time (prevents abuse)
       if (timeOutMoment.isAfter(scheduledOutMoment)) {
         effectiveTimeOut = scheduledOutMoment.clone();
         console.log(`User clocked out late (${timeOutMoment.format('HH:mm')}), capped to scheduled time (${scheduledOutMoment.format('HH:mm')})`);
       }

       // Calculate effective duration worked in minutes
       let durationMinutes = effectiveTimeOut.diff(effectiveTimeIn, 'minutes');
       
       // Ensure duration is positive
       if (durationMinutes < 0) {
         console.error('Invalid duration calculation:', { timeIn, timeOut, durationMinutes });
         return 0;
       }

       // Apply break deduction based on shift duration
       let breakDeduction = 0;
       if (durationMinutes >= 420) { // 7 hours or more (changed from 480 to 420)
         breakDeduction = 60; // 1 hour break
         durationMinutes -= 60;
       } else if (durationMinutes >= 240) { // 4 hours or more
         breakDeduction = 30; // 30 minutes break
         durationMinutes -= 30;
       }

       console.log(`BH calculation for ${recordDate}: Effective time worked ${effectiveTimeIn.format('HH:mm')} - ${effectiveTimeOut.format('HH:mm')} = ${durationMinutes + breakDeduction} minutes - ${breakDeduction} minutes break = ${durationMinutes} minutes (${(durationMinutes/60).toFixed(2)} hours)`);
       
       return Math.max(0, durationMinutes);
     } catch (error) {
       console.error('Error calculating billed hours:', error);
       return 0;
     }
   };

  const calculateSummaryTotals = (dailyRecords) => {
    if (!dailyRecords || dailyRecords.length === 0) {
      return {
        totalBilledHours: 0,
        totalLateMinutes: 0,
        totalUndertimeMinutes: 0,
        totalNightDifferential: 0
      };
    }

    let totalBilledHours = 0;
    let totalLateMinutes = 0;
    let totalUndertimeMinutes = 0;
    let totalNightDifferential = 0;

    dailyRecords.forEach(record => {
               // Calculate billed hours
         if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-') {
           const bhMinutes = calculateBilledHours(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
           totalBilledHours += bhMinutes;
         }

      // Calculate late minutes
      if (record.time_in && record.time_in !== '-' && record.scheduled_in && record.scheduled_in !== '-') {
        const lateMinutes = calculateLateMinutes(record.time_in, record.scheduled_in, record.date);
        totalLateMinutes += lateMinutes;
      }

      // Calculate undertime minutes (now uses dynamic BH calculation with proper break consideration)
      if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-' && 
          record.scheduled_in && record.scheduled_in !== '-' && record.scheduled_out && record.scheduled_out !== '-') {
        const utMinutes = calculateUndertimeMinutes(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
        totalUndertimeMinutes += utMinutes;
      }

               // Calculate night differential
         if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-') {
           const ndHours = calculateNightDifferential(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
           totalNightDifferential += ndHours;
         }
    });

    return {
      totalBilledHours,
      totalLateMinutes,
      totalUndertimeMinutes,
      totalNightDifferential: Math.round(totalNightDifferential * 100) / 100
    };
  };

  const getStatusColor = (status, scheduledIn = null, scheduledOut = null, timeIn = null, recordDate = null) => {
    // Use the intelligent status logic to determine the effective status
    const effectiveStatus = getStatusDisplay(status, scheduledIn, scheduledOut, timeIn, recordDate);
    
    // Map the display text back to status keys for color selection
    switch (effectiveStatus) {
      case 'Present': return 'status-present';
      case 'Late': return 'status-late';
      case 'Absent': return 'status-absent';
      case 'Weekend': return 'status-weekend';
      case 'Half Day': return 'status-half-day';
      case 'Scheduled': return 'status-not-scheduled'; // Use the same styling as not_scheduled
      case 'Not Yet Scheduled': return 'status-not-scheduled';
      default: return 'status-default';
    }
  };

  const getStatusIcon = (status, scheduledIn = null, scheduledOut = null, timeIn = null, recordDate = null) => {
    // Use the intelligent status logic to determine the effective status
    const effectiveStatus = getStatusDisplay(status, scheduledIn, scheduledOut, timeIn, recordDate);
    
    // Map the display text back to status keys for icon selection
    switch (effectiveStatus) {
      case 'Present': return <CheckCircleIcon className="w-4 h-4" />;
      case 'Late': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'Absent': return <XCircleIcon className="w-4 h-4" />;
      case 'Weekend': return <CalendarIcon className="w-4 h-4" />;
      case 'Half Day': return <ClockIcon className="w-4 h-4" />;
      case 'Scheduled': return <InformationCircleIcon className="w-4 h-4" />;
      case 'Not Yet Scheduled': return <InformationCircleIcon className="w-4 h-4" />;
      default: return <InformationCircleIcon className="w-4 h-4" />;
    }
  };

  const getStatusDisplay = (status, scheduledIn = null, scheduledOut = null, timeIn = null, recordDate = null) => {
    console.log('getStatusDisplay called with:', { status, scheduledIn, scheduledOut, timeIn, recordDate });
    
    // INTELLIGENT STATUS LOGIC: Override backend status based on schedule, time data, AND date context
    let effectiveStatus = status;
    
    // Check if there's a valid schedule (not "-" or empty)
    const hasSchedule = scheduledIn && scheduledOut && 
                       scheduledIn !== '-' && scheduledOut !== '-' && 
                       scheduledIn.toString().trim() !== '' && scheduledOut.toString().trim() !== '';
    
    // Check if there's a time in
    const hasTimeIn = timeIn && timeIn !== '-' && timeIn.toString().trim() !== '';
    
    // Check if this is a past date (for absent logic)
    const isPastDate = recordDate ? moment(recordDate).isBefore(moment(), 'day') : false;
    const isToday = recordDate ? moment(recordDate).isSame(moment(), 'day') : false;
    
    console.log('Status analysis:', { 
      originalStatus: status, 
      hasSchedule, 
      hasTimeIn, 
      scheduledIn, 
      scheduledOut, 
      timeIn,
      recordDate,
      isPastDate,
      isToday
    });
    
    // RULE 1: If there's a schedule but no time in = Check date context
    if (hasSchedule && !hasTimeIn) {
      if (isPastDate) {
        // Past date with schedule but no time in = ABSENT
        effectiveStatus = 'absent';
        console.log('Overriding status to ABSENT: Past date with schedule but no time in');
      } else if (isToday) {
        // Today with schedule but no time in = SCHEDULED (not absent yet)
        effectiveStatus = 'not_scheduled';
        console.log('Overriding status to SCHEDULED: Today with schedule but no time in yet');
      } else {
        // Future date with schedule = SCHEDULED (not absent yet)
        effectiveStatus = 'not_scheduled';
        console.log('Overriding status to SCHEDULED: Future date with schedule');
      }
    }
    // RULE 2: If there's no schedule = NOT YET SCHEDULED
    else if (!hasSchedule) {
      effectiveStatus = 'not_scheduled';
      console.log('Overriding status to NOT YET SCHEDULED: No schedule found');
    }
    // RULE 3: If there's a schedule and time in = PRESENT (or keep original status)
    else if (hasSchedule && hasTimeIn) {
      console.log('Keeping original status: Has both schedule and time in');
    }
    
    console.log('Final effective status:', effectiveStatus);
    
    switch (effectiveStatus) {
      case 'present': return 'Present';
      case 'late': return 'Late';
      case 'absent': return 'Absent';
      case 'weekend': return 'Weekend';
      case 'half_day': return 'Half Day';
      case 'not_scheduled': 
        // Check if there's a schedule (not "-" or empty)
        const hasScheduleForDisplay = scheduledIn && scheduledOut && 
                                     scheduledIn !== '-' && scheduledOut !== '-' && 
                                     scheduledIn.toString().trim() !== '' && scheduledOut.toString().trim() !== '';
        console.log('not_scheduled case - hasScheduleForDisplay:', hasScheduleForDisplay, 'scheduledIn:', scheduledIn, 'scheduledOut:', scheduledOut);
        
        if (hasScheduleForDisplay) {
          // Has schedule but no time in - check date context for display
          if (isPastDate) {
            return 'Absent'; // Past date with schedule but no time in
          } else if (isToday) {
            return 'Scheduled'; // Today with schedule but no time in yet
          } else {
            return 'Scheduled'; // Future date with schedule
          }
        } else {
          return 'Not Yet Scheduled'; // No schedule at all
        }
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

  const handleDownloadCSV = () => {
    if (!report) {
      toast.error('No report data to download.');
      return;
    }

    if (!report.daily_records || report.daily_records.length === 0) {
      toast.error('No daily records available for download.');
      return;
    }

    try {
      // Prepare data for CSV export
      const csvData = report.daily_records.map(record => ({
        Date: moment(record.date).format('MMM DD, YYYY'),
        Day: record.day,
        Status: getStatusDisplay(record.status, record.scheduled_in, record.scheduled_out, record.time_in, record.date),
        'Time In': formatTime(record.time_in),
        'Time Out': getDisplayTimeOut(record, report.daily_records, report.daily_records.indexOf(record)),
        'Scheduled In': formatTime(record.scheduled_in),
        'Scheduled Out': formatTime(record.scheduled_out),
        'BH (min)': (() => {
          if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-') {
            const bhMinutes = calculateBilledHours(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
            return bhMinutes > 0 ? bhMinutes : '-';
          }
          return '-';
        })(),
        'LT': (() => {
          if (record.time_in && record.time_in !== '-' && record.scheduled_in && record.scheduled_in !== '-') {
            const lateMinutes = calculateLateMinutes(record.time_in, record.scheduled_in, record.date);
            return lateMinutes > 0 ? lateMinutes : '-';
          }
          return '-';
        })(),
        'UT': (() => {
          if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-' && 
              record.scheduled_in && record.scheduled_in !== '-' && record.scheduled_out && record.scheduled_out !== '-') {
            const utMinutes = calculateUndertimeMinutes(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
            return utMinutes > 0 ? utMinutes : '-';
          }
          return '-';
        })(),
        'ND': (() => {
          if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-') {
            const ndHours = calculateNightDifferential(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
            return ndHours > 0 ? `${ndHours}h` : '-';
          }
          return '-';
        })()
      }));

      // Create summary data
      const calculatedTotals = calculateSummaryTotals(report.daily_records);
      const summaryData = [
        { 'Employee Name': report.employee?.name || 'N/A' },
        { 'Employee ID': report.employee?.employee_id || 'N/A' },
        { 'Department': report.employee?.department || 'N/A' },
        { 'Period': report.period ? `${moment(report.period.start_date).format('MMM DD')} - ${moment(report.period.end_date).format('MMM DD, YYYY')}` : 'N/A' },
        {},
        { 'Summary Statistics': '' },
        { 'Days Worked': report.summary?.days_worked || 0 },
        { 'Total BH (min)': calculatedTotals.totalBilledHours },
        { 'Total LT (min)': calculatedTotals.totalLateMinutes },
        { 'Total UT (min)': calculatedTotals.totalUndertimeMinutes },
        { 'Total ND': calculatedTotals.totalNightDifferential },
        {},
        { 'Daily Records': '' }
      ];
      
      // Combine summary and daily records
      const allData = [...summaryData, ...csvData];
      
      const worksheet = XLSX.utils.json_to_sheet(allData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Attendance Report');

      const filename = `time_attendance_report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
      console.log('Downloading CSV with data:', { summaryData, csvData, allData });
      XLSX.writeFile(workbook, filename);
      toast.success(`CSV report downloaded successfully`);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error('Failed to download CSV file');
    }
  };

  const handleDownloadExcel = () => {
    if (!report) {
      toast.error('No report data to download.');
      return;
    }

    if (!report.daily_records || report.daily_records.length === 0) {
      toast.error('No daily records available for download.');
      return;
    }

    try {
      // Prepare data for Excel export
      const excelData = report.daily_records.map(record => ({
        Date: moment(record.date).format('MMM DD, YYYY'),
        Day: record.day,
        Status: getStatusDisplay(record.status, record.scheduled_in, record.scheduled_out, record.time_in, record.date),
        'Time In': formatTime(record.time_in),
        'Time Out': getDisplayTimeOut(record, report.daily_records, report.daily_records.indexOf(record)),
        'Scheduled In': formatTime(record.scheduled_in),
        'Scheduled Out': formatTime(record.scheduled_out),
        'BH (min)': (() => {
          if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-') {
            const bhMinutes = calculateBilledHours(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
            return bhMinutes > 0 ? bhMinutes : '-';
          }
          return '-';
        })(),
        'LT': (() => {
          if (record.time_in && record.time_in !== '-' && record.scheduled_in && record.scheduled_in !== '-') {
            const lateMinutes = calculateLateMinutes(record.time_in, record.scheduled_in, record.date);
            return lateMinutes > 0 ? lateMinutes : '-';
          }
          return '-';
        })(),
        'UT': (() => {
          if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-' && 
              record.scheduled_in && record.scheduled_in !== '-' && record.scheduled_out && record.scheduled_out !== '-') {
            const utMinutes = calculateUndertimeMinutes(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
            return utMinutes > 0 ? utMinutes : '-';
          }
          return '-';
        })(),
        'ND': (() => {
          if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-') {
            const ndHours = calculateNightDifferential(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
            return ndHours > 0 ? `${ndHours}h` : '-';
          }
          return '-';
        })()
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Create summary sheet
      const calculatedTotals = calculateSummaryTotals(report.daily_records);
      const summaryData = [
        { 'Employee Name': report.employee?.name || 'N/A' },
        { 'Employee ID': report.employee?.employee_id || 'N/A' },
        { 'Department': report.employee?.department || 'N/A' },
        { 'Period': report.period ? `${moment(report.period.start_date).format('MMM DD')} - ${moment(report.period.end_date).format('MMM DD, YYYY')}` : 'N/A' },
        {},
        { 'Summary Statistics': '' },
        { 'Days Worked': report.summary?.days_worked || 0 },
        { 'Total BH (min)': calculatedTotals.totalBilledHours },
        { 'Total LT (min)': calculatedTotals.totalLateMinutes },
        { 'Total UT (min)': calculatedTotals.totalUndertimeMinutes },
        { 'Total ND': calculatedTotals.totalNightDifferential }
      ];
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Records');

      const filename = `time_attendance_report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast.success(`Excel report downloaded successfully`);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast.error('Failed to download Excel file');
    }
  };

  const handleDownloadPDF = async () => {
    if (!report) {
      toast.error('No report data to download.');
      return;
    }

    if (!report.daily_records || report.daily_records.length === 0) {
      toast.error('No daily records available for download.');
      return;
    }

    try {
      // Try to dynamically import jspdf-autotable if not already available
      let autoTableAvailableNow = autoTableAvailable;
      if (!autoTableAvailableNow && typeof window !== 'undefined') {
        try {
          await import('jspdf-autotable');
          autoTableAvailableNow = true;
          console.log('jspdf-autotable dynamically imported successfully');
        } catch (importError) {
          console.warn('Dynamic import of jspdf-autotable failed:', importError);
          autoTableAvailableNow = false;
        }
      }

      // Try to create a PDF with autoTable first
      if (autoTableAvailableNow) {
        try {
          // Use landscape orientation for better fit
          const doc = new jsPDF('landscape');
          
          // Check if autoTable is available
          if (typeof doc.autoTable === 'function') {
            // Add title - even smaller font and closer to top
            doc.setFontSize(14);
            doc.text('TIME ATTENDANCE REPORT', 14, 18);
            
            // Add employee info - even smaller font and tighter spacing
            doc.setFontSize(8);
            doc.text(`Employee: ${report.employee?.name || 'N/A'} (${report.employee?.employee_id || 'N/A'})`, 14, 24);
            doc.text(`Department: ${report.employee?.department || 'N/A'}`, 14, 28);
            doc.text(`Period: ${report.period ? `${moment(report.period.start_date).format('MMM DD')} - ${moment(report.period.end_date).format('MMM DD, YYYY')}` : 'N/A'}`, 14, 32);
            
            // Add summary stats - even smaller font and tighter spacing
            const calculatedTotals = calculateSummaryTotals(report.daily_records);
            doc.text(`Days: ${report.summary?.days_worked || 0} | BH: ${calculatedTotals.totalBilledHours}min | LT: ${calculatedTotals.totalLateMinutes}min | UT: ${calculatedTotals.totalUndertimeMinutes}min | ND: ${calculatedTotals.totalNightDifferential}`, 14, 36);

            // Prepare table data
            const tableData = report.daily_records.map(record => {
              try {
                return [
                  moment(record.date).format('MMM DD'),
                  record.day || '-',
                  getStatusDisplay(record.status, record.scheduled_in, record.scheduled_out, record.time_in, record.date) || '-',
                  formatTime(record.time_in) || '-',
                  getDisplayTimeOut(record, report.daily_records, report.daily_records.indexOf(record)) || '-',
                  formatTime(record.scheduled_in) || '-',
                  formatTime(record.scheduled_out) || '-',
                  (() => {
                    if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-') {
                      const bhMinutes = calculateBilledHours(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
                      return bhMinutes > 0 ? bhMinutes : '-';
                    }
                    return '-';
                  })(),
                  (() => {
                    if (record.time_in && record.time_in !== '-' && record.scheduled_in && record.scheduled_in !== '-') {
                      const lateMinutes = calculateLateMinutes(record.time_in, record.scheduled_in, record.date);
                      return lateMinutes > 0 ? lateMinutes : '-';
                    }
                    return '-';
                  })(),
                  (() => {
                    if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-' && 
                        record.scheduled_in && record.scheduled_in !== '-' && record.scheduled_out && record.scheduled_out !== '-') {
                      const utMinutes = calculateUndertimeMinutes(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
                      return utMinutes > 0 ? utMinutes : '-';
                    }
                    return '-';
                  })(),
                  (() => {
                    try {
                      if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-') {
                        const ndHours = calculateNightDifferential(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
                        return ndHours > 0 ? `${ndHours}h` : '-';
                      }
                      return '-';
                    } catch (ndError) {
                      return '-';
                    }
                  })()
                ];
              } catch (recordError) {
                console.error('Error processing record:', recordError, record);
                return ['Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error'];
              }
            });

            // Create table - optimized for single page with smaller fonts
            doc.autoTable({
              head: [['Date', 'Day', 'Status', 'Time In', 'Time Out', 'Scheduled In', 'Scheduled Out', 'BH (min)', 'LT', 'UT', 'ND']],
              body: tableData,
              startY: 42,
              styles: {
                fontSize: 6,
                cellPadding: 1
              },
              headStyles: {
                fillColor: [59, 130, 246],
                textColor: 255,
                fontSize: 6
              },
              margin: { top: 42, right: 8, bottom: 8, left: 8 },
              // Optimize column widths for landscape orientation
              columnStyles: {
                0: { cellWidth: 18 }, // Date
                1: { cellWidth: 14 }, // Day
                2: { cellWidth: 22 }, // Status
                3: { cellWidth: 18 }, // Time In
                4: { cellWidth: 18 }, // Time Out
                5: { cellWidth: 22 }, // Scheduled In
                6: { cellWidth: 22 }, // Scheduled Out
                7: { cellWidth: 16 }, // BH
                8: { cellWidth: 14 }, // LT
                9: { cellWidth: 14 }, // UT
                10: { cellWidth: 14 } // ND
              },
              // Force single page
              pageBreak: 'avoid',
              // Reduce row height even more
              rowHeight: 6
            });

            const filename = `time_attendance_report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.pdf`;
            doc.save(filename);
            toast.success(`PDF report downloaded successfully`);
            return;
          }
        } catch (autoTableError) {
          console.error('AutoTable failed, falling back to text-only PDF:', autoTableError);
        }
      }

      // Fallback: Create text-only PDF
      console.log('Creating text-only PDF as fallback');
      // Use landscape orientation for better fit
      const doc = new jsPDF('landscape');
      
      // Add title - even smaller font and closer to top
      doc.setFontSize(14);
      doc.text('TIME ATTENDANCE REPORT', 14, 18);
      
      // Add employee info - even smaller font and tighter spacing
      doc.setFontSize(8);
      doc.text(`Employee: ${report.employee?.name || 'N/A'} (${report.employee?.employee_id || 'N/A'})`, 14, 24);
      doc.text(`Department: ${report.employee?.department || 'N/A'}`, 14, 28);
      doc.text(`Period: ${report.period ? `${moment(report.period.start_date).format('MMM DD')} - ${moment(report.period.end_date).format('MMM DD, YYYY')}` : 'N/A'}`, 14, 32);
      
      // Add summary stats - even smaller font and tighter spacing
      const calculatedTotals = calculateSummaryTotals(report.daily_records);
      doc.text(`Days: ${report.summary?.days_worked || 0} | BH: ${calculatedTotals.totalBilledHours}min | LT: ${calculatedTotals.totalLateMinutes}min | UT: ${calculatedTotals.totalUndertimeMinutes}min | ND: ${calculatedTotals.totalNightDifferential}`, 14, 36);
      
      // Add daily records as text
      doc.setFontSize(8);
      doc.text('Daily Records:', 14, 42);
      let yPosition = 50;
      
      // Add headers - optimized spacing for landscape
      const headers = ['Date', 'Day', 'Status', 'Time In', 'Time Out', 'Scheduled In', 'Scheduled Out', 'BH', 'LT', 'UT', 'ND'];
      doc.setFontSize(6);
      let xPosition = 14;
      const columnWidths = [18, 14, 22, 18, 18, 22, 22, 16, 14, 14, 14]; // Match autoTable column widths
      headers.forEach((header, index) => {
        doc.text(header, xPosition, yPosition);
        xPosition += columnWidths[index];
      });
      yPosition += 10;
      
      // Add data rows - optimized for single page
      doc.setFontSize(5);
      report.daily_records.forEach((record, index) => {
        // Check if we need a new page (landscape height is ~200)
        if (yPosition > 190) {
          doc.addPage();
          yPosition = 20;
        }
        
        try {
          const rowData = [
            moment(record.date).format('MMM DD'),
            record.day || '-',
            getStatusDisplay(record.status, record.scheduled_in, record.scheduled_out, record.time_in, record.date) || '-',
            formatTime(record.time_in) || '-',
            getDisplayTimeOut(record, report.daily_records, report.daily_records.indexOf(record)) || '-',
            formatTime(record.scheduled_in) || '-',
            formatTime(record.scheduled_out) || '-',
            (() => {
              if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-') {
                const bhMinutes = calculateBilledHours(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
                return bhMinutes > 0 ? bhMinutes : '-';
              }
              return '-';
            })(),
            (() => {
              if (record.time_in && record.time_in !== '-' && record.scheduled_in && record.scheduled_in !== '-') {
                const lateMinutes = calculateLateMinutes(record.time_in, record.scheduled_in, record.date);
                return lateMinutes > 0 ? lateMinutes : '-';
              }
              return '-';
            })(),
            (() => {
              if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-' && 
                  record.scheduled_in && record.scheduled_in !== '-' && record.scheduled_out && record.scheduled_out !== '-') {
                const utMinutes = calculateUndertimeMinutes(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
                return utMinutes > 0 ? utMinutes : '-';
              }
              return '-';
            })(),
            (() => {
              try {
                if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-') {
                  const ndHours = calculateNightDifferential(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
                  return ndHours > 0 ? `${ndHours}h` : '-';
                }
                return '-';
              } catch (ndError) {
                return '-';
              }
            })()
          ];
          
          xPosition = 14;
          rowData.forEach((cell, cellIndex) => {
            doc.text(cell.toString(), xPosition, yPosition);
                                xPosition += columnWidths[cellIndex];
                  });
                  yPosition += 6; // Even more reduced row height for better fit
        } catch (recordError) {
          console.error('Error processing record in fallback:', recordError);
          yPosition += 10;
        }
      });
      
      const filename = `time_attendance_report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.pdf`;
      doc.save(filename);
      toast.success(`PDF report downloaded successfully (text-only format)`);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(`Failed to download PDF file: ${error.message}`);
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
                <div className="flex flex-col items-end space-y-2">
                  <div className="text-sm text-gray-600 font-medium">Download Report</div>
                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <button
                      onClick={handleDownloadCSV}
                      title="Download as CSV file"
                      className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl text-sm"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">CSV</span>
                    </button>
                    <button
                      onClick={handleDownloadExcel}
                      title="Download as Excel file"
                      className="px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl text-sm"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Excel</span>
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      title="Download as PDF file"
                      className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl text-sm"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      title="Print report"
                      className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl text-sm"
                    >
                      <PrinterIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Print</span>
                    </button>
                  </div>
                </div>
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
            {(() => {
              const calculatedTotals = calculateSummaryTotals(report.daily_records);
              return (
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
                    <div className="text-3xl font-bold text-green-700">{calculatedTotals.totalBilledHours}</div>
                    <div className="text-sm text-green-800 font-medium">Total BH (minutes)</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl text-center border border-orange-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaExclamationTriangle className="w-8 h-8 text-orange-600" />
                    </div>
                    <div className="text-3xl font-bold text-orange-700">{calculatedTotals.totalLateMinutes}</div>
                    <div className="text-sm text-orange-800 font-medium">Total LT</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl text-center border border-red-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaRegClock className="w-8 h-8 text-red-600" />
                    </div>
                    <div className="text-3xl font-bold text-red-700">{calculatedTotals.totalUndertimeMinutes}</div>
                    <div className="text-sm text-red-800 font-medium">Total UT</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl text-center border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-center mb-2">
                      <FaHourglassHalf className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold text-purple-700">{calculatedTotals.totalNightDifferential}</div>
                    <div className="text-sm text-purple-800 font-medium">Total ND</div>
                  </div>
                </div>
              );
            })()}

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
                  {(() => {
                    // ENHANCED: Group nightshift entries together on the same row
                    const groupedRecords = [];
                    
                    for (let i = 0; i < report.daily_records.length; i++) {
                      const currentRecord = report.daily_records[i];
                      const nextRecord = report.daily_records[i + 1];
                      
                      // Check if this is a nightshift (starts late, ends early next day)
                      const isNightshift = currentRecord.scheduled_in && currentRecord.scheduled_out && 
                        parseInt(currentRecord.scheduled_in.split(':')[0]) >= 18 && 
                        parseInt(currentRecord.scheduled_out.split(':')[0]) < 12;
                      
                      // Check if next day has early timeout (before 6 AM) that belongs to this nightshift
                      const hasNextDayTimeout = nextRecord && nextRecord.time_entries && 
                        nextRecord.time_entries.some(entry => 
                          entry.entry_type === 'time_out' && 
                          parseInt(entry.event_time.split(':')[0]) < 6
                        );
                      
                      if (isNightshift && hasNextDayTimeout) {
                        // Create a combined row for the nightshift
                        const combinedRecord = {
                          ...currentRecord,
                          isNightshift: true,
                          nextDayTimeout: nextRecord.time_entries.find(entry => 
                            entry.entry_type === 'time_out' && 
                            parseInt(entry.event_time.split(':')[0]) < 6
                          ),
                          nextDayDate: nextRecord.date,
                          nextDayDay: nextRecord.day
                        };
                        
                        groupedRecords.push(combinedRecord);
                        i++; // Skip the next record since we've combined it
                      } else {
                        // Regular record, add as-is
                        groupedRecords.push(currentRecord);
                      }
                    }
                    
                    return groupedRecords.map((record, index) => (
                      <tr key={index} className={`hover:bg-gray-50 transition-colors duration-200 ${
                        record.isNightshift ? 'nightshift-row' : ''
                      }`}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {moment(record.date).format('MMM DD')}
                          {record.isNightshift && record.nextDayDate && (
                            <div className="text-xs text-blue-600 font-normal">
                              → {moment(record.nextDayDate).format('MMM DD')}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {record.day}
                          {record.isNightshift && record.nextDayDay && (
                            <div className="text-xs text-blue-600 font-normal">
                              → {record.nextDayDay}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`status-pill ${getStatusColor(record.status, record.scheduled_in, record.scheduled_out, record.time_in, record.date)}`}>
                            {getStatusIcon(record.status, record.scheduled_in, record.scheduled_out, record.time_in, record.date)}
                            <span>{getStatusDisplay(record.status, record.scheduled_in, record.scheduled_out, record.time_in, record.date)}</span>
                          </span>
                          {record.isNightshift && (
                            <div className="nightshift-indicator">
                              🌙 Nightshift
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {formatTime(record.time_in)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {(() => {
                            // ENHANCED: Smart time out detection with nightshift grouping
                            
                            // 1. Try the direct time_out field first (from DailyTimeSummary)
                            if (record.time_out && record.time_out !== '-') {
                              return formatTime(record.time_out);
                            }
                            
                            // 2. Check if we have time_entries data from the enhanced API
                            if (record.time_entries && Array.isArray(record.time_entries)) {
                              // Find time out entry
                              const timeOutEntry = record.time_entries.find(entry => 
                                entry.entry_type === 'time_out' && entry.event_time
                              );
                              
                              if (timeOutEntry && timeOutEntry.event_time) {
                                return formatTime(timeOutEntry.event_time);
                              }
                            }
                            
                            // 3. Check for next day timeout from nightshift grouping
                            if (record.isNightshift && record.nextDayTimeout) {
                              return (
                                <div className="text-blue-600">
                                  {formatTime(record.nextDayTimeout.event_time)}
                                  <div className="text-xs text-blue-500">
                                    (Next day)
                                  </div>
                                </div>
                              );
                            }
                            
                            // 4. Smart fallback: Look for time out in nearby records
                            if (report.daily_records && report.daily_records.length > 0) {
                              const currentIndex = report.daily_records.findIndex(r => r.date === record.date);
                              
                              if (currentIndex >= 0) {
                                // Check next day for time out (night shift pattern)
                                if (currentIndex < report.daily_records.length - 1) {
                                  const nextRecord = report.daily_records[currentIndex + 1];
                                  if (nextRecord && nextRecord.time_entries) {
                                    const nextTimeOut = nextRecord.time_entries.find(entry => 
                                      entry.entry_type === 'time_out' && entry.event_time
                                    );
                                    
                                    if (nextTimeOut && nextTimeOut.event_time) {
                                      const timeOutHour = parseInt(nextTimeOut.event_time.split(':')[0]);
                                      // If time out is before 6 AM, it likely belongs to the previous day's night shift
                                      if (timeOutHour < 6) {
                                        return formatTime(nextTimeOut.event_time);
                                      }
                                    }
                                  }
                                }
                                
                                // Check previous day for night shift that ended today
                                if (currentIndex > 0) {
                                  const prevRecord = report.daily_records[currentIndex - 1];
                                  if (prevRecord && prevRecord.time_in && prevRecord.time_in !== '-') {
                                    const timeInHour = parseInt(prevRecord.time_in.split(':')[0]);
                                    // If previous day started at 6 PM or later, check if today has time out
                                    if (timeInHour >= 18 && record.time_entries) {
                                      const todayTimeOut = record.time_entries.find(entry => 
                                        entry.entry_type === 'time_out' && entry.event_time
                                      );
                                      
                                      if (todayTimeOut && todayTimeOut.event_time) {
                                        const timeOutHour = parseInt(todayTimeOut.event_time.split(':')[0]);
                                        // If time out is before 6 AM, it belongs to previous day's night shift
                                        if (timeOutHour < 6) {
                                          return formatTime(todayTimeOut.event_time);
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                            
                            // 5. If no time out found, show dash
                            return '-';
                          })()}
                        </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {formatTime(record.scheduled_in)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {formatTime(record.scheduled_out)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {(() => {
                          // DEBUG: Log the data being passed to calculateBilledHours
                          console.log(`🔍 BH Calculation for ${record.date}:`, {
                            time_in: record.time_in,
                            time_out: record.time_out,
                            scheduled_in: record.scheduled_in,
                            scheduled_out: record.scheduled_out,
                            date: record.date,
                            hasTimeIn: !!record.time_in,
                            hasTimeOut: !!record.time_out,
                            hasScheduledIn: !!record.scheduled_in,
                            hasScheduledOut: !!record.scheduled_out
                          });
                          
                          if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-') {
                            const bhMinutes = calculateBilledHours(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
                            console.log(`✅ BH Result for ${record.date}:`, bhMinutes);
                            return bhMinutes > 0 ? bhMinutes : '-';
                          }
                          console.log(`❌ Missing data for BH calculation on ${record.date}`);
                          return '-';
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {(() => {
                          // DEBUG: Log the data being passed to calculateLateMinutes
                          console.log(`🔍 Late Calculation for ${record.date}:`, {
                            time_in: record.time_in,
                            scheduled_in: record.scheduled_in,
                            date: record.date,
                            hasTimeIn: !!record.time_in,
                            hasScheduledIn: !!record.scheduled_in
                          });
                          
                          if (record.time_in && record.time_in !== '-' && record.scheduled_in && record.scheduled_in !== '-') {
                            const lateMinutes = calculateLateMinutes(record.time_in, record.scheduled_in, record.date);
                            console.log(`✅ Late Result for ${record.date}:`, lateMinutes);
                            return lateMinutes > 0 ? lateMinutes : '-';
                          }
                          console.log(`❌ Missing data for Late calculation on ${record.date}`);
                          return '-';
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {(() => {
                          // DEBUG: Log the data being passed to calculateUndertimeMinutes
                          console.log(`🔍 UT Calculation for ${record.date}:`, {
                            time_in: record.time_in,
                            time_out: record.time_out,
                            scheduled_in: record.scheduled_in,
                            scheduled_out: record.scheduled_out,
                            date: record.date,
                            hasTimeIn: !!record.time_in,
                            hasTimeOut: !!record.time_out,
                            hasScheduledIn: !!record.scheduled_in,
                            hasScheduledOut: !!record.scheduled_out
                          });
                          
                          if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-' && 
                              record.scheduled_in && record.scheduled_in !== '-' && record.scheduled_out && record.scheduled_out !== '-') {
                            const utMinutes = calculateUndertimeMinutes(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
                            console.log(`✅ UT Result for ${record.date}:`, utMinutes);
                            return utMinutes > 0 ? utMinutes : '-';
                          }
                          console.log(`❌ Missing data for UT calculation on ${record.date}`);
                          return '-';
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {(() => {
                          // Clean ND calculation without excessive logging
                          
                          // Only calculate ND if we have both time in and time out on the same day
                          if (record.time_in && record.time_in !== '-' && record.time_out && record.time_out !== '-') {
                            console.log(`🔍 ND Calculation for ${record.date}:`, {
                              time_in: record.time_in,
                              time_out: record.time_out,
                              date: record.date
                            });
                            const ndHours = calculateNightDifferential(record.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
                            console.log(`✅ ND Result for ${record.date}:`, ndHours);
                            return ndHours > 0 ? `${ndHours}h` : '-';
                          }
                          
                          // For night shifts spanning midnight, look ahead for time out
                          if (record.time_in && record.time_in !== '-' && (!record.time_out || record.time_out === '-')) {
                            const timeInMoment = moment(record.time_in, 'HH:mm:ss');
                            
                            // Check if this is a night shift (started at 6 PM or later)
                            if (timeInMoment.hour() >= 18) {
                              // Look ahead for time out on next day
                              if (index < report.daily_records.length - 1) {
                                const nextRecord = report.daily_records[index + 1];
                                
                                if (nextRecord && nextRecord.time_out && nextRecord.time_out !== '-') {
                                  const nextTimeOutMoment = moment(nextRecord.time_out, 'HH:mm:ss');
                                  
                                  // Next day time out is before 6 AM (night differential period)
                                  if (nextTimeOutMoment.hour() < 6) {
                                    // Calculate ND for this night shift spanning midnight
                                    const ndHours = calculateNightDifferential(record.time_in, nextRecord.time_out, record.scheduled_in, record.scheduled_out, record.date);
                                    console.log(`Night shift ND calculation for ${record.date}:`, { time_in: record.time_in, nextTimeOut: nextRecord.time_out, ndHours });
                                    return ndHours > 0 ? `${ndHours}h` : '-';
                                  }
                                }
                              }
                            }
                          }
                          
                          // Check if this record has a time out that belongs to a previous day's night shift
                          // BUT only if this day actually has a schedule (not "Not Yet Scheduled")
                          if (record.time_out && record.time_out !== '-') {
                            const timeOutMoment = moment(record.time_out, 'HH:mm:ss');
                            console.log(`Checking if ${record.date} time out belongs to previous night shift:`, { timeOut: record.time_out, timeOutHour: timeOutMoment.hour() });
                            
                            // If time out is before 6 AM, it might belong to a previous night shift
                            if (timeOutMoment.hour() < 6 && index > 0) {
                              const prevRecord = report.daily_records[index - 1];
                              if (prevRecord && prevRecord.time_in && prevRecord.time_in !== '-') {
                                const prevTimeInMoment = moment(prevRecord.time_in, 'HH:mm:ss');
                                console.log(`Previous record check:`, { prevRecord: { date: prevRecord.date, time_in: prevRecord.time_in }, prevTimeInHour: prevTimeInMoment.hour() });
                                
                                // If previous day started at 6 PM or later, this time out belongs to that night shift
                                // BUT only calculate ND if this day has a schedule (not "Not Yet Scheduled")
                                if (prevTimeInMoment.hour() >= 18 && record.scheduled_in && record.scheduled_in !== '-') {
                                  const ndHours = calculateNightDifferential(prevRecord.time_in, record.time_out, record.scheduled_in, record.scheduled_out, record.date);
                                  console.log(`Previous night shift ND calculation for ${record.date}:`, { prevTimeIn: prevRecord.time_in, timeOut: record.time_out, ndHours });
                                  return ndHours > 0 ? `${ndHours}h` : '-';
                                }
                              }
                            }
                          }
                          
                          console.log(`No ND for ${record.date}`);
                          return '-';
                        })()}
                      </td>
                    </tr>
                  ));
                })()}
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
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Set your filters and click "Generate Report" to view your TIME ATTENDANCE report.
              </p>
              
              {/* Download Format Information */}
              <div className="max-w-2xl mx-auto">
                <h4 className="text-md font-medium text-gray-800 mb-3">Available Download Formats</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="font-medium text-green-800 mb-1">CSV Format</div>
                    <div className="text-green-600">Compatible with Excel, Google Sheets, and other spreadsheet applications</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="font-medium text-yellow-800 mb-1">Excel Format</div>
                    <div className="text-yellow-600">Native Excel file with multiple sheets (Summary + Daily Records)</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="font-medium text-red-800 mb-1">PDF Format</div>
                    <div className="text-red-600">Professional report layout with summary and detailed table</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Add custom styles for nightshift rows */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .nightshift-row {
            background-color: #eff6ff !important;
            border-left: 4px solid #3b82f6 !important;
          }
          
          .nightshift-row:hover {
            background-color: #dbeafe !important;
          }
          
          .nightshift-indicator {
            color: #1d4ed8;
            font-size: 0.75rem;
            margin-top: 0.25rem;
          }
          
          .nightshift-arrow {
            color: #3b82f6;
            font-weight: normal;
          }
        `
      }} />
    </div>
  );
};

export default ScheduleReport; 