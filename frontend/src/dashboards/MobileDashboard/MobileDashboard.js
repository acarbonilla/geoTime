import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaClock, FaMapMarkerAlt, FaSignInAlt, FaSignOutAlt, FaUser, FaBars, FaKey } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import timeAPI from '../../api/timeAPI';
import { getCurrentPosition } from '../../utils/geolocation';
import { Password_Reset } from '../../Employee_Information';
import './MobileDashboard.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MobileDashboard = ({ user, employee, onLogout }) => {
  const queryClient = useQueryClient();
  const [currentStatus, setCurrentStatus] = useState('not_started');
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [geolocationStatus, setGeolocationStatus] = useState('idle');
  const [currentCoords, setCurrentCoords] = useState({ latitude: null, longitude: null });
  const [showMenu, setShowMenu] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [scheduleError, setScheduleError] = useState(null);

  const [processedEntries, setProcessedEntries] = useState([]); // ENHANCED: For filtered time entries
  const [totalHoursToday, setTotalHoursToday] = useState(0); // ENHANCED: For total hours calculation
  const [showPasswordReset, setShowPasswordReset] = useState(false); // Password reset modal state
  
  const isTimeInSubmitting = useRef(false);
  const isTimeOutSubmitting = useRef(false);
  const menuRef = useRef(null);

  // Get current session
  const { data: sessionResponse, error: sessionError, refetch: refetchSession } = useQuery({
    queryKey: ['current-session', employee?.id],
    queryFn: () => timeAPI.getCurrentSession(),
    enabled: !!employee?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Session query error:', error);
      console.error('Session error response:', error.response);
    }
  });

  // Get today's entries
  const { data: todayEntries, error: entriesError, refetch: refetchTodayEntries } = useQuery({
    queryKey: ['today-entries', employee?.id],
    queryFn: () => timeAPI.getTodayEntries(),
    enabled: !!employee?.id,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Today entries query error:', error);
      console.error('Today entries error response:', error.response);
    }
  });

  // NEW: Get today's schedule
  const { data: todaySchedule, error: scheduleQueryError, refetch: refetchSchedule } = useQuery({
    queryKey: ['today-schedule', employee?.id],
    queryFn: async () => {
      try {
        const result = await timeAPI.getTodaySchedule();
        return result;
      } catch (error) {
        throw error;
      }
    },
    enabled: !!employee?.id,
    refetchInterval: 60000, // Refresh every minute
    retry: 3,
    retryDelay: 1000
  });

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: timeAPI.clockIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-session'] });
      queryClient.invalidateQueries({ queryKey: ['today-entries'] });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: timeAPI.clockOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-session'] });
      queryClient.invalidateQueries({ queryKey: ['today-entries'] });
    },
  });

  // Get initial location
  const getInitialLocation = useCallback(async () => {
    try {
      const position = await getCurrentPosition();
      setCurrentCoords({ 
        latitude: position.coords.latitude, 
        longitude: position.coords.longitude 
      });
      setGeolocationStatus('success');
    } catch (error) {
      console.warn('Initial geolocation failed:', error);
      setGeolocationStatus('error');
    }
  }, []);

  useEffect(() => {
    getInitialLocation();
  }, [getInitialLocation]);

  // Force refresh data when component mounts (for view switching)
  useEffect(() => {
    if (employee?.id) {
      refetchSession();
      refetchTodayEntries();
    }
  }, [employee?.id, refetchSession, refetchTodayEntries]);

  // Update current status based on session
  useEffect(() => {
    if (sessionResponse?.active_session) {
      setCurrentStatus('clocked_in');
    } else {
      // Check if there are any time entries today to determine status
      if (processedEntries?.length > 0) {
        const lastEntry = processedEntries[processedEntries.length - 1];
        if (lastEntry.entry_type === 'time_in') {
          setCurrentStatus('clocked_in');
        } else {
          setCurrentStatus('clocked_out');
        }
      } else {
        setCurrentStatus('not_started');
      }
    }
  }, [sessionResponse, processedEntries]);

  // Click-away logic for mobile menu
  useEffect(() => {
    if (!showMenu) return;
    
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // NEW: Handle screen resize and automatically redirect to appropriate dashboard
  useEffect(() => {
    let resizeTimeout;
    
    const handleResize = () => {
      // Clear previous timeout
      clearTimeout(resizeTimeout);
      
      // Debounce the resize event to prevent too many redirects
      resizeTimeout = setTimeout(() => {
        const currentWidth = window.innerWidth;
        
        // If we're in MobileDashboard but screen is now desktop size, redirect to full dashboard
        if (currentWidth > 1024) {
          // Check if user is team leader or regular employee
          if (employee?.role === 'team_leader') {
            window.location.href = '/team-leader-dashboard';
          } else {
            window.location.href = '/employee-dashboard';
          }
        }
      }, 250); // Wait 250ms after resize stops before redirecting
    };

    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Initial check
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [employee?.role]);

  // ENHANCED: Validate schedule with nightshift support
  const validateSchedule = useCallback((action = 'time-in') => {
    
    // Check if schedule query failed (error state)
    if (scheduleQueryError) {
      const errorMsg = 'Failed to load schedule. Please contact your supervisor.';
      setScheduleError(errorMsg);
      return false;
    }
    
    // Check if schedule data is still loading
    if (todaySchedule === undefined) {
      setScheduleError(null); // Clear any previous errors during loading
      return false;
    }
    
    // Check if no schedule exists (empty object response from API)
    if (!todaySchedule || Object.keys(todaySchedule).length === 0) {
      // ENHANCED: For timeout operations, check if this might be a nightshift scenario
      if (action === 'time-out') {
        // For nightshift timeouts, we need to check if there's an active session
        // that started on a previous day. The backend will handle the actual validation.
        if (sessionResponse?.active_session) {
          console.log('No schedule for today but active session exists - this might be a nightshift timeout scenario');
          console.log('Backend will check for nightshift from previous day');
          
          // Don't block the user - let the backend handle the validation
          setScheduleError(null);
          return true;
        } else {
          // No active session and no schedule - can't clock out
          const today = new Date().toLocaleDateString('en-US', { 
            month: '2-digit', 
            day: '2-digit', 
            year: 'numeric' 
          });
          const errorMsg = `No work schedule found for today (${today}) and no active session. If you're on a nightshift that started yesterday, please try refreshing your schedule or contact your supervisor.`;
          setScheduleError(errorMsg);
          return false;
        }
      } else {
        // For time-in, we still need a schedule
        const today = new Date().toLocaleDateString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric' 
        });
        const errorMsg = `No work schedule found for today (${today}). Please contact your supervisor to set up your schedule before clocking in/out.`;
        setScheduleError(errorMsg);
        return false;
      }
    }
    
    // Check if schedule is incomplete
    if (!todaySchedule.scheduled_time_in || !todaySchedule.scheduled_time_out) {
      const errorMsg = 'Your schedule is incomplete. Please contact your supervisor to complete your schedule before clocking in/out.';
      setScheduleError(errorMsg);
      return false;
    }
    
    // ENHANCED: Nightshift detection and validation for timeout operations
    if (action === 'time-out' && todaySchedule) {
      try {
        // Parse scheduled times to detect nightshift
        const scheduledStartTimeStr = todaySchedule.scheduled_time_in;
        const scheduledEndTimeStr = todaySchedule.scheduled_time_out;
        
        // Handle different time formats (HH:MM or HH:MM:SS)
        let startHours, startMinutes, endHours, endMinutes;
        
        if (scheduledStartTimeStr.includes(':')) {
          const startTimeParts = scheduledStartTimeStr.split(':');
          startHours = parseInt(startTimeParts[0], 10);
          startMinutes = parseInt(startTimeParts[1], 10);
        }
        
        if (scheduledEndTimeStr.includes(':')) {
          const endTimeParts = scheduledEndTimeStr.split(':');
          endHours = parseInt(endTimeParts[0], 10);
          endMinutes = parseInt(endTimeParts[1], 10);
        }
        
        // Check if this is a nightshift (crosses midnight)
        if (!isNaN(startHours) && !isNaN(endHours) && endHours < startHours) {
          console.log('Nightshift detected - allowing timeout operations');
          // For nightshifts, we're more lenient with timeouts
          setScheduleError(null);
          return true;
        }
      } catch (nightshiftError) {
        console.error('MobileDashboard Error detecting nightshift:', nightshiftError);
        // If nightshift detection fails, continue with normal validation
      }
    }
    
    // NEW: Check if current time is within 1 hour of scheduled time in (for time-in operations only)
    try {
      const now = new Date();
      const currentTime = now.getTime();
      
      // Parse scheduled time in (assuming format like "09:00" or "09:00:00")
      const scheduledTimeStr = todaySchedule.scheduled_time_in;
      
      // Handle different time formats (HH:MM or HH:MM:SS)
      let hours, minutes;
      if (scheduledTimeStr.includes(':')) {
        const timeParts = scheduledTimeStr.split(':');
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
        
        // Validate parsed values
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          console.error('Invalid time format:', scheduledTimeStr, 'Parsed:', { hours, minutes });
          const errorMsg = `Invalid schedule time format: ${scheduledTimeStr}`;
          setScheduleError(errorMsg);
          return false;
        }
      } else {
        console.error('Unexpected time format:', scheduledTimeStr);
        const errorMsg = `Unexpected time format: ${scheduledTimeStr}`;
        setScheduleError(errorMsg);
        return false;
      }
      
      // Rule: Cannot clock in more than 1 hour before scheduled start time
      // For night shifts: applies to same calendar day as schedule date
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hours, minutes, 0, 0);
      const scheduledTimeMs = scheduledTime.getTime();
      
      // Calculate time difference in hours (positive = early, negative = late)
      const timeDiffHours = (scheduledTimeMs - currentTime) / (1000 * 60 * 60);
      
      console.log('MobileDashboard time validation debug:', {
        now: now.toLocaleTimeString(),
        scheduledTimeStr,
        parsed: { hours, minutes },
        scheduledTime: scheduledTime.toLocaleTimeString(),
        timeDiffHours: timeDiffHours.toFixed(2)
      });
      
      // If more than 1 hour early, prevent clock in
      if (timeDiffHours > 1) {
        const earliestTime = new Date(scheduledTimeMs - 60 * 60 * 1000);
        const errorMsg = `You can only clock in starting at ${earliestTime.toLocaleTimeString()}. Your scheduled time is ${scheduledTimeStr}.`;
        setScheduleError(errorMsg);
        return false;
      }
      
      // NEW: Check if current time is after scheduled end time
      const scheduledEndTimeStr = todaySchedule.scheduled_time_out;
      
      // Handle different time formats for end time
      let endHours, endMinutes;
      if (scheduledEndTimeStr.includes(':')) {
        const endTimeParts = scheduledEndTimeStr.split(':');
        endHours = parseInt(endTimeParts[0], 10);
        endMinutes = parseInt(endTimeParts[1], 10);
        
        // Validate parsed values
        if (isNaN(endHours) || isNaN(endMinutes) || endHours < 0 || endHours > 23 || endMinutes < 0 || endMinutes > 59) {
          console.error('Invalid end time format:', scheduledEndTimeStr, 'Parsed:', { endHours, endMinutes });
          // Don't block the operation for end time parsing errors
        }
      } else {
        console.error('Unexpected end time format:', scheduledEndTimeStr);
        // Don't block the operation for end time parsing errors
      }
      
      // Create scheduled end time for today
      const scheduledEndTime = new Date(now);
      if (!isNaN(endHours) && !isNaN(endMinutes)) {
        scheduledEndTime.setHours(endHours, endMinutes, 0, 0);
        
        // Handle overnight shifts - compare with start time hours
        if (endHours < hours) {
          scheduledEndTime.setDate(scheduledEndTime.getDate() + 1);
        }
      }
      
      // REMOVED: 2-hour restriction based on ScheduleOut time
      // Now clock-in validation is ONLY based on ScheduleIn time (1 hour before)
      // Users can clock in at any time after the earliest allowed time (1 hour before ScheduleIn)
      
      // Note: Late clock-ins are allowed (no restriction based on end time)
      // Users can clock in at any time after the earliest allowed time (1 hour before ScheduleIn)
      

      
    } catch (timeError) {
      console.error('MobileDashboard Error parsing scheduled time:', timeError);
      // If time parsing fails, allow the operation but log the error
    }
    
    setScheduleError(null);
    return true;
  }, [todaySchedule, scheduleQueryError, sessionResponse]);

  // NEW: Auto-validate schedule when component loads or schedule changes
  useEffect(() => {
    if (todaySchedule !== undefined || scheduleQueryError) {
      // ENHANCED: Auto-validation with nightshift awareness
      // If there's an active session, don't show schedule errors for time-in
      // This prevents false errors for night shift workers
      if (sessionResponse?.active_session) {
        // Active session exists - this could be a night shift
        // Don't show schedule errors that would block legitimate operations
        setScheduleError(null);
      } else {
        // No active session - validate normally
        validateSchedule();
      }
    }
  }, [todaySchedule, scheduleQueryError, sessionResponse, validateSchedule]);

  const handleTimeIn = async () => {
    if (isTimeInSubmitting.current) return;
    
    // ENHANCED: Validate schedule before allowing time in
    if (!validateSchedule('time-in')) {
      return;
    }
    
    isTimeInSubmitting.current = true;
    
    try {
      setIsClockingIn(true);
      setGeolocationStatus('requesting');
      
      const position = await getCurrentPosition();
      setGeolocationStatus('success');
      setCurrentCoords({ 
        latitude: position.coords.latitude, 
        longitude: position.coords.longitude 
      });
      
      const clockInData = {
        employee_id: employee.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        location_id: employee.department?.location?.id || null,
        notes: `Mobile clock-in (${employee.role})`
      };
      
      await clockInMutation.mutateAsync(clockInData);
      
    } catch (error) {
      setGeolocationStatus('error');
      
      // Show detailed error message to user
      let errorMessage = 'Clock in failed';
      if (error.response?.data?.error) {
        errorMessage += `: ${error.response.data.error}`;
        if (error.response.data.details) {
          errorMessage += `\n\nDetails: ${error.response.data.details}`;
        }
        if (error.response.data.distance && error.response.data.allowed_radius) {
          errorMessage += `\n\nDistance: ${error.response.data.distance}m (Allowed: ${error.response.data.allowed_radius}m)`;
        }
      } else if (error.response?.data) {
        // Handle case where error data is directly in response.data
        errorMessage += `: ${JSON.stringify(error.response.data)}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsClockingIn(false);
      isTimeInSubmitting.current = false;
    }
  };

  const handleTimeOut = async () => {
    if (isTimeOutSubmitting.current) return;
    
    // Check if there's an active session before allowing clock out
    if (!sessionResponse?.active_session) {
      alert('No active session to clock out from. Please clock in first.');
      return;
    }
    
    // ENHANCED: Validate schedule before allowing time out
    if (!validateSchedule('time-out')) {
      return;
    }
    
    isTimeOutSubmitting.current = true;
    
    try {
      setIsClockingOut(true);
      setGeolocationStatus('requesting');
      
      const position = await getCurrentPosition();
      setGeolocationStatus('success');
      setCurrentCoords({ 
        latitude: position.coords.latitude, 
        longitude: position.coords.longitude 
      });
      
      const clockOutData = {
        employee_id: employee.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        location_id: employee.department?.location?.id || null,
        notes: `Mobile clock-out (${employee.role})`
      };
      
      await clockOutMutation.mutateAsync(clockOutData);
      
    } catch (error) {
      setGeolocationStatus('error');
      
      // Show detailed error message to user
      let errorMessage = 'Clock out failed';
      if (error.response?.data?.error) {
        errorMessage += `: ${error.response.data.error}`;
        if (error.response.data.details) {
          errorMessage += `\n\nDetails: ${error.response.data.details}`;
        }
        if (error.response.data.distance && error.response.data.allowed_radius) {
          errorMessage += `\n\nDistance: ${error.response.data.distance}m (Allowed: ${error.response.data.allowed_radius}m)`;
        }
      } else if (error.response?.data) {
        // Handle case where error data is directly in response.data
        errorMessage += `: ${JSON.stringify(error.response.data)}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsClockingOut(false);
      isTimeOutSubmitting.current = false;
    }
  };

  // Get status color based on current status and schedule availability
  const getStatusColor = () => {
    if (scheduleError) return 'bg-red-500';
    if (currentStatus === 'clocked_in') return 'bg-green-500';
    if (currentStatus === 'clocked_out') return 'bg-blue-500';
    return 'bg-gray-500';
  };

  // Get status CSS class for enhanced styling
  const getStatusColorClass = () => {
    if (scheduleError) return 'no-schedule';
    if (currentStatus === 'clocked_in') return 'clocked-in';
    if (currentStatus === 'clocked_out') return 'clocked-out';
    return '';
  };

  // Get status text based on current status and schedule availability
  const getStatusText = () => {
    if (scheduleError) return 'No Schedule';
    if (currentStatus === 'clocked_in') return 'Clocked In';
    if (currentStatus === 'clocked_out') return 'Clocked Out';
    return 'Not Started';
  };

  // Check if time operations should be disabled
  const isTimeOperationsDisabled = () => {
    // Allow time operations even when schedule API fails as fallback
    if (scheduleQueryError) {
      return false;
    }
    
    // ENHANCED: Night shift awareness for time operations
    // If there's an active session, don't disable time operations
    // This allows night shift workers to clock out even without today's schedule
    if (sessionResponse?.active_session) {
      return false; // Allow operations when active session exists
    }
    
    // Only disable if there's a schedule error OR if schedule is still loading
    const disabled = !!scheduleError || todaySchedule === undefined;
    return disabled;
  };

  const getTotalHoursToday = () => {
    if (!todayEntries?.length) return '0h 0m';
    
    // Calculate total hours from today's analysis if available
    if (sessionResponse?.today_analysis?.total_hours) {
      const totalHours = sessionResponse.today_analysis.total_hours;
      const hours = Math.floor(totalHours);
      const minutes = Math.round((totalHours - hours) * 60);
      return `${hours}h ${minutes}m`;
    }
    
    // Fallback: calculate from time entries
    const totalMinutes = todayEntries.reduce((total, entry) => {
      if (entry.duration_minutes) {
        return total + entry.duration_minutes;
      }
      return total;
    }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  // Process time entries data
  useEffect(() => {
    if (todayEntries && todayEntries.length > 0) {
      // ENHANCED: Filter and group early timeouts with previous night's time-in
      const filteredEntries = filterAndGroupEarlyTimeouts(todayEntries);
      setProcessedEntries(filteredEntries);
      const totalHours = calculateTotalHours(filteredEntries);
      setTotalHoursToday(totalHours);
    } else {
      setProcessedEntries([]);
      setTotalHoursToday(0);
    }
  }, [todayEntries]);

  // ENHANCED: Filter and group early timeouts with previous night's time-in entries
  const filterAndGroupEarlyTimeouts = (entries) => {
    if (!entries || entries.length === 0) return entries;
    
    const sortedEntries = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const filteredEntries = [];
    
    for (let i = 0; i < sortedEntries.length; i++) {
      const currentEntry = sortedEntries[i];
      
      // IMPORTANT: Always preserve time-in entries - they're needed for time-in operations
      if (currentEntry.entry_type === 'time_in') {
        filteredEntries.push(currentEntry);
        continue;
      }
      
      // Check if this is a time-out entry
      if (currentEntry.entry_type === 'time_out') {
        const timeoutHour = new Date(currentEntry.timestamp).getHours();
        
        // Check if this is an early timeout (before 6 AM)
        if (timeoutHour < 6) {
          // Look for the previous time-in entry
          let previousTimeIn = null;
          for (let j = i - 1; j >= 0; j--) {
            if (sortedEntries[j].entry_type === 'time_in') {
              previousTimeIn = sortedEntries[j];
              break;
            }
          }
          
          // If we found a previous time-in and it's from a different day (night shift)
          if (previousTimeIn) {
            const timeInDate = new Date(previousTimeIn.timestamp).toDateString();
            const timeoutDate = new Date(currentEntry.timestamp).toDateString();
            
            if (timeInDate !== timeoutDate) {
              // This is a night shift timeout - don't add it as a separate entry for display
              // It will be handled by the grouping logic
              console.log(`Filtering out night shift early timeout: ${currentEntry.formatted_timestamp} on ${timeoutDate}`);
              continue;
            }
          }
        }
      }
      
      // Add the entry to filtered results
      filteredEntries.push(currentEntry);
    }
    
    return filteredEntries;
  };

  // ENHANCED: Calculate total hours from time entries
  const calculateTotalHours = (entries) => {
    if (!entries || entries.length === 0) return 0;
    
    const sortedEntries = entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const timeInEntries = sortedEntries.filter(e => e.entry_type === 'time_in');
    const timeOutEntries = sortedEntries.filter(e => e.entry_type === 'time_out');
    
    let totalHours = 0;
    for (let i = 0; i < Math.min(timeInEntries.length, timeOutEntries.length); i++) {
      const timeIn = new Date(timeInEntries[i].timestamp);
      const timeOut = new Date(timeOutEntries[i].timestamp);
      const duration = (timeOut - timeIn) / (1000 * 60 * 60);
      totalHours += duration;
    }
    
    return totalHours;
  };

  return (
    <div className="mobile-dashboard">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-900 via-blue-800 to-purple-900 shadow-lg border-b border-white/10 h-16">
        <div className="flex items-center justify-between px-4 py-3 h-full">
          {/* User Information */}
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            
            {/* User Details */}
            <div className="flex flex-col">
              <span className="text-white font-semibold text-sm leading-tight">
                {user?.first_name} {user?.last_name}
              </span>
              <div className="flex items-center gap-2 text-xs text-white/80">
                <span>{employee?.role === 'team_leader' ? 'TLE-L2' : employee?.position || 'Employee'}</span>
                <div className="flex items-center gap-1">
                  <FaMapMarkerAlt className="w-3 h-3" />
                  <span>Mobile View</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Menu Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors mobile-touch-target"
          >
            <FaBars className="text-xl text-white" />
          </button>
        </div>
      </div>

      {/* Spacer to push content below fixed header */}
      <div className="h-16"></div>

      {/* Mobile Menu */}
      {showMenu && (
        <div ref={menuRef} className="fixed top-20 right-4 bg-white rounded-lg shadow-lg z-50 min-w-48 mobile-menu max-w-xs">
          <div className="p-4 border-b">
            <p className="text-sm text-gray-600 mobile-text-small">Quick Actions</p>
          </div>
          <div className="p-2">
            <button
              onClick={() => setShowMap(!showMap)}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center space-x-2 mobile-touch-target"
            >
              <FaMapMarkerAlt className="text-blue-600" />
              <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
            </button>
            <button
              onClick={() => {
                setShowPasswordReset(true);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center space-x-2 mobile-touch-target"
            >
              <FaKey className="text-green-600" />
              <span>Change Password</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center space-x-2 text-red-600 mobile-touch-target"
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 space-y-4 mobile-spacing">
        {/* Error Display */}
        {(sessionError || entriesError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mobile-card">
            <div className="flex items-center space-x-2">
              <div className="text-red-600">⚠️</div>
              <div>
                <p className="text-red-800 font-medium mobile-text">Connection Error</p>
                <p className="text-red-600 text-sm mobile-text-small">
                  {sessionError?.message || entriesError?.message || 'Unable to connect to server'}
                </p>
              </div>
            </div>
          </div>
        )}



        {/* Quick Status Summary */}
        {todaySchedule && !scheduleError && (
          <div className="mobile-compact-status p-4 mobile-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-blue-600 text-xl">📋</div>
                <div>
                  <p className="text-gray-800 font-semibold text-base mobile-text">Quick Status</p>
                  <p className="text-gray-600 text-sm mobile-text-small">
                    Schedule: {todaySchedule.scheduled_time_in} - {todaySchedule.scheduled_time_out}
                    {todaySchedule.is_night_shift && <span className="ml-2 text-purple-600">🌙</span>}
                  </p>
                </div>
              </div>
              <div className="text-green-600 text-sm font-medium">
                ✅ Ready
              </div>
            </div>
          </div>
        )}


        
        {/* NEW: Schedule Error Display */}
        {scheduleError && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mobile-card">
            <div className="flex items-start space-x-3">
              <div className="text-orange-600 text-xl">📅</div>
              <div className="flex-1">
                <p className="text-orange-800 font-semibold text-base mobile-text">Schedule Issue</p>
                <p className="text-orange-700 text-sm mt-1 mobile-text-small">{scheduleError}</p>
                
                {/* Action Steps */}
                <div className="mt-3 p-3 bg-orange-100 rounded-lg">
                  <p className="text-orange-800 font-medium text-sm mb-2 mobile-text-small">What you need to do:</p>
                  <ul className="text-orange-700 text-sm space-y-1 mobile-text-small">
                    <li className="flex items-center space-x-2">
                      <span className="text-orange-600">1.</span>
                      <span>Contact your supervisor or team leader</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-orange-600">2.</span>
                      <span>Ask them to set up your work schedule</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-orange-600">3.</span>
                      <span>Include your start time and end time</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-orange-600">4.</span>
                      <span>Once scheduled, you can clock in/out</span>
                    </li>
                  </ul>
                  
                  {/* Nightshift-specific guidance */}
                  {sessionResponse?.active_session && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-blue-800 text-xs font-medium mobile-text-small">🌙 Nightshift Worker?</p>
                      <p className="text-blue-700 text-xs mobile-text-small">
                        If you're on a nightshift that started yesterday, try refreshing your schedule or contact your supervisor to ensure your schedule is properly configured.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Contact Information */}
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 font-medium text-sm mb-2 mobile-text-small">Need help?</p>
                  <div className="text-blue-700 text-sm space-y-1 mobile-text-small">
                    <p>• Contact your supervisor directly</p>
                    <p>• Reach out to HR department</p>
                    <p>• Check with your team leader</p>
                  </div>
                </div>
                
                <button
                  onClick={() => refetchSchedule()}
                  className="mt-3 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors mobile-btn"
                >
                  🔄 Refresh Schedule
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mobile-card">
          <div className="text-center">
                         <div className={`text-3xl font-bold mobile-status ${getStatusColorClass()}`}>
               {getStatusText()}
             </div>
            <p className="text-gray-600 mt-2 mobile-text">Today's Total: {getTotalHoursToday()}</p>
            
            {/* Nightshift status indicator */}
            {sessionResponse?.active_session && !todaySchedule && (
              <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded">
                <p className="text-purple-800 text-sm font-medium mobile-text-small">🌙 Nightshift Active</p>
                <p className="text-purple-700 text-xs mobile-text-small">
                  You have an active session from a previous shift. You can clock out when your shift ends.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Clock In/Out Buttons */}
        <div className="grid grid-cols-2 gap-4 mobile-grid">
                     <button
             onClick={handleTimeIn}
             disabled={isClockingIn || sessionResponse?.active_session || isTimeOperationsDisabled()}
             className={`p-4 rounded-lg font-semibold text-white transition-colors mobile-btn clock-in ${
               sessionResponse?.active_session 
                 ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                 : ''
             }`}
           >
                         {isClockingIn ? (
               <div className="flex items-center justify-center space-x-2">
                 <div className="mobile-loading-spinner"></div>
                 <span>Clocking In...</span>
               </div>
             ) : (
              <div className="flex items-center justify-center space-x-2">
                <FaSignInAlt />
                <span>Clock In</span>
              </div>
            )}
          </button>

                     <button
             onClick={handleTimeOut}
             disabled={isClockingOut || !sessionResponse?.active_session || isTimeOperationsDisabled()}
             className={`p-4 rounded-lg font-semibold text-white transition-colors mobile-btn clock-out ${
               !sessionResponse?.active_session 
                 ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                 : ''
             }`}
           >
                         {isClockingOut ? (
               <div className="flex items-center justify-center space-x-2">
                 <div className="mobile-loading-spinner"></div>
                 <span>Clocking Out...</span>
               </div>
             ) : (
              <div className="flex items-center justify-center space-x-2">
                <FaSignOutAlt />
                <span>Clock Out</span>
              </div>
            )}
          </button>
        </div>

        {/* Location Status */}
        <div className="bg-white rounded-lg shadow-sm p-4 mobile-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaMapMarkerAlt className="text-blue-600" />
              <span className="font-medium mobile-text">Location Status</span>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              geolocationStatus === 'success' ? 'bg-green-100 text-green-800' :
              geolocationStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {geolocationStatus === 'success' ? 'GPS Active' :
               geolocationStatus === 'error' ? 'GPS Error' : 'Getting Location...'}
            </div>
          </div>
          {currentCoords.latitude && currentCoords.longitude && (
            <p className="text-sm text-gray-600 mt-2 mobile-text-small">
              Lat: {currentCoords.latitude.toFixed(6)}, 
              Lng: {currentCoords.longitude.toFixed(6)}
            </p>
          )}
          {employee?.role === 'team_leader' && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-800 mobile-text-small">
                <strong>Team Leader Privilege:</strong> You can clock in/out from any location
              </p>
            </div>
          )}
        </div>

        {/* Map View */}
        {showMap && currentCoords.latitude && currentCoords.longitude && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mobile-card mobile-map">
            <div className="p-4 border-b">
              <h3 className="font-medium flex items-center space-x-2 mobile-text">
                <FaMapMarkerAlt className="text-blue-600" />
                <span>Your Location</span>
              </h3>
            </div>
            <div className="h-64">
              <MapContainer
                center={[currentCoords.latitude, currentCoords.longitude]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker position={[currentCoords.latitude, currentCoords.longitude]}>
                  <Popup>
                    <div className="text-center">
                      <div className="font-semibold">Your Location</div>
                      <div className="text-sm text-gray-600">
                        {currentCoords.latitude.toFixed(6)}, {currentCoords.longitude.toFixed(6)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
                {/* Geofence circle if available */}
                {employee?.department?.location && (
                  <Circle
                    center={[
                      employee.department.location.latitude,
                      employee.department.location.longitude
                    ]}
                    radius={employee.department.location.geofence_radius}
                    color="blue"
                    fillColor="blue"
                    fillOpacity={0.1}
                  />
                )}
              </MapContainer>
            </div>
          </div>
        )}

        {/* Quick Info */}
        <div className="bg-white rounded-lg shadow-sm p-4 mobile-card">
          <h3 className="font-medium mb-3 mobile-text">Today's Activity</h3>
          <div className="space-y-2">
            {todayEntries?.length > 0 ? (
              todayEntries.slice(-3).map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <FaClock className="text-gray-400" />
                    <span className="capitalize mobile-text-small">{entry.entry_type.replace('_', ' ')}</span>
                  </div>
                  <span className="text-gray-600 mobile-text-small">
                    {new Date(entry.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm mobile-text-small">No activity recorded today</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={() => setShowPasswordReset(false)}></div>
          <div className="relative z-10 w-full max-w-sm mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200/50 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
              <button
                onClick={() => setShowPasswordReset(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 mobile-modal">
              <Password_Reset onSuccess={() => setShowPasswordReset(false)} onLogout={onLogout} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileDashboard; 