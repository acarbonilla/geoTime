import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaClock, FaMapMarkerAlt, FaSignInAlt, FaSignOutAlt, FaUser, FaBars } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import timeAPI from '../../api/timeAPI';
import { getCurrentPosition } from '../../utils/geolocation';
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
      if (todayEntries?.length > 0) {
        const lastEntry = todayEntries[todayEntries.length - 1];
        if (lastEntry.entry_type === 'time_in') {
          setCurrentStatus('clocked_in');
        } else {
          setCurrentStatus('clocked_out');
        }
      } else {
        setCurrentStatus('not_started');
      }
    }
  }, [sessionResponse, todayEntries]);

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
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Check if we have a schedule from yesterday that might be a nightshift
        // This is a frontend hint - the backend will do the actual validation
        console.log('No schedule for today - this might be a nightshift timeout scenario');
        console.log('Backend will check for nightshift from previous day');
        
        // Don't block the user - let the backend handle the validation
        setScheduleError(null);
        return true;
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
    
    // NEW: Check if current time is within 1 hour of scheduled time in
    try {
      const now = new Date();
      const currentTime = now.getTime();
      
      // Parse scheduled time in (assuming format like "09:00" or "09:00:00")
      const scheduledTimeStr = todaySchedule.scheduled_time_in;
      const [hours, minutes] = scheduledTimeStr.split(':').map(Number);
      
      // Rule: Cannot clock in more than 1 hour before scheduled start time
      // For night shifts: applies to same calendar day as schedule date
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hours, minutes, 0, 0);
      const scheduledTimeMs = scheduledTime.getTime();
      
      // Calculate time difference in hours
      const timeDiffHours = Math.abs(currentTime - scheduledTimeMs) / (1000 * 60 * 60);
      
      // If more than 1 hour early, prevent clock in
      if (currentTime < scheduledTimeMs && timeDiffHours > 1) {
        const errorMsg = `You cannot clock in yet. Your scheduled time is ${scheduledTimeStr}, and you can only clock in up to 1 hour early. Current time: ${now.toLocaleTimeString()}`;
        setScheduleError(errorMsg);
        return false;
      }
      
      // NEW: Check if current time is after scheduled end time
      const scheduledEndTimeStr = todaySchedule.scheduled_time_out;
      const [endHours, endMinutes] = scheduledEndTimeStr.split(':').map(Number);
      
      // Create scheduled end time for today
      const scheduledEndTime = new Date(now);
      scheduledEndTime.setHours(endHours, endMinutes, 0, 0);
      
      // Handle overnight shifts - compare with start time hours
      if (endHours < hours) {
        scheduledEndTime.setDate(scheduledEndTime.getDate() + 1);
      }
      
      // REMOVED: 2-hour restriction based on ScheduleOut time
      // Now clock-in validation is ONLY based on ScheduleIn time (1 hour before)
      // Users can clock in at any time after the earliest allowed time (1 hour before ScheduleIn)
      
      // If more than 1 hour late, allow but warn (no restriction based on end time)
      if (currentTime > scheduledTimeMs && timeDiffHours > 1) {
        const lateHours = timeDiffHours.toFixed(1);
        // Don't set error, just log warning
        console.log(`User clocking in ${lateHours} hours late, but allowed since no end time restriction`);
      }
      
      // ENHANCED: Nightshift detection and validation
      if (action === 'time-out' && todaySchedule) {
        const scheduledStartTime = new Date(`2000-01-01T${todaySchedule.scheduled_time_in}`);
        const scheduledEndTime = new Date(`2000-01-01T${todaySchedule.scheduled_time_out}`);
        
        // Check if this is a nightshift (crosses midnight)
        if (scheduledEndTime < scheduledStartTime) {
          console.log('Nightshift detected - allowing timeout operations');
          // For nightshifts, we're more lenient with timeouts
          setScheduleError(null);
          return true;
        }
      }
      
    } catch (timeError) {
      console.error('MobileDashboard Error parsing scheduled time:', timeError);
      // If time parsing fails, allow the operation but log the error
    }
    
    setScheduleError(null);
    return true;
  }, [todaySchedule, scheduleQueryError]);

  // NEW: Auto-validate schedule when component loads or schedule changes
  useEffect(() => {
    if (todaySchedule !== undefined || scheduleQueryError) {
      validateSchedule();
    }
  }, [todaySchedule, scheduleQueryError, validateSchedule]);

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

  return (
    <div className="min-h-screen bg-gray-50 mobile-dashboard">
      {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 mobile-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaUser className="text-2xl mobile-icon" />
            <div>
              <h1 className="text-lg font-semibold mobile-text">{user?.first_name} {user?.last_name}</h1>
              <p className="text-sm opacity-90 mobile-text-small">{employee?.position}</p>
              <div className="flex items-center space-x-1 mt-1">
                <FaMapMarkerAlt className="text-xs mobile-icon" />
                <span className="text-xs opacity-75">Mobile View</span>
                {employee?.role === 'team_leader' && (
                  <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full ml-2">
                    Team Leader
                  </span>
                )}
              </div>
            </div>
          </div>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors mobile-touch-target"
            >
              <FaBars className="text-xl" />
            </button>
          </div>
      </div>

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

        {/* NEW: Time Status Display */}
        {todaySchedule && !scheduleError && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mobile-card">
            <div className="flex items-start space-x-3">
              <div className="text-blue-600 text-xl">⏰</div>
              <div className="flex-1">
                <p className="text-blue-800 font-semibold text-base mobile-text">Clock-in Status</p>
                <div className="text-blue-700 text-sm mt-2 space-y-1 mobile-text-small">
                  <p>Your schedule: {todaySchedule.scheduled_time_in} - {todaySchedule.scheduled_time_out}</p>
                  {(() => {
                    try {
                      const now = new Date();
                      const scheduledTimeStr = todaySchedule.scheduled_time_in;
                      const [hours, minutes] = scheduledTimeStr.split(':').map(Number);
                      const scheduledTime = new Date(now);
                      scheduledTime.setHours(hours, minutes, 0, 0);
                      const timeDiffHours = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                      
                      if (timeDiffHours > 1) {
                        return <p className="text-orange-600">⏳ You can clock in starting at {(scheduledTime.getTime() - 60 * 60 * 1000).toLocaleTimeString()}</p>;
                      } else if (timeDiffHours > 0) {
                        return <p className="text-green-600">✅ You can clock in now (within 1 hour of schedule)</p>;
                      } else {
                        return <p className="text-green-600">✅ You can clock in now</p>;
                      }
                    } catch (error) {
                      return <p>Time validation unavailable</p>;
                    }
                  })()}
                </div>
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

        {/* NEW: Schedule Information Display */}
        {todaySchedule && !scheduleError && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mobile-card">
            <div className="flex items-start space-x-3">
              <div className="text-green-600 text-xl">✅</div>
              <div className="flex-1">
                <p className="text-green-800 font-semibold text-base mobile-text">Schedule Ready!</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 text-sm mobile-text-small">Start Time:</span>
                    <span className="text-green-800 font-medium mobile-text">{todaySchedule.scheduled_time_in}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 text-sm mobile-text-small">End Time:</span>
                    <span className="text-green-800 font-medium mobile-text">{todaySchedule.scheduled_time_out}</span>
                  </div>
                  {todaySchedule.is_night_shift && (
                    <div className="flex items-center space-x-2">
                      <span className="text-purple-600">🌙</span>
                      <span className="text-purple-700 text-sm font-medium mobile-text-small">Night Shift Schedule</span>
                    </div>
                  )}
                </div>
                
                {/* Status Information */}
                <div className="mt-3 p-3 bg-green-100 rounded-lg">
                  <p className="text-green-800 font-medium text-sm mb-2 mobile-text-small">You can now:</p>
                  <ul className="text-green-700 text-sm space-y-1 mobile-text-small">
                    <li className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span>Clock in when you arrive at work</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span>Clock out when you leave work</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span>Track your work hours accurately</span>
                    </li>
                  </ul>
                </div>
                
                <button
                  onClick={() => refetchSchedule()}
                  className="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors mobile-btn"
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
            <div className={`text-3xl font-bold ${getStatusColor()} mobile-status`}>
              {getStatusText()}
            </div>
            <p className="text-gray-600 mt-2 mobile-text">Today's Total: {getTotalHoursToday()}</p>
          </div>
        </div>

        {/* Clock In/Out Buttons */}
        <div className="grid grid-cols-2 gap-4 mobile-grid">
          <button
            onClick={handleTimeIn}
            disabled={isClockingIn || sessionResponse?.active_session || isTimeOperationsDisabled()}
            className={`p-4 rounded-lg font-semibold text-white transition-colors mobile-btn ${
              sessionResponse?.active_session 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isClockingIn ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
            className={`p-4 rounded-lg font-semibold text-white transition-colors mobile-btn ${
              !sessionResponse?.active_session 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isClockingOut ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
    </div>
  );
};

export default MobileDashboard; 