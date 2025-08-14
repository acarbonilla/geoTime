import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import timeAPI from '../../api/timeAPI';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import GeoMap from './GeoMap';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function EmployeeDashboard({ user, employee, onLogout }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState('not_started');
  const [todayEntries, setTodayEntries] = useState([]);
  const [totalHoursToday, setTotalHoursToday] = useState(0);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [geolocationStatus, setGeolocationStatus] = useState('idle');
  const [currentCoords, setCurrentCoords] = useState({ latitude: null, longitude: null });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  // Overtime-related state
  const [overtimeAnalysis, setOvertimeAnalysis] = useState(null);
  const [sessionResponse, setSessionResponse] = useState(null);
  const [showOvertimeDetails, setShowOvertimeDetails] = useState(false);
  
  const isTimeInSubmitting = useRef(false);
  const isTimeOutSubmitting = useRef(false);
  const userMenuRef = useRef(null);

  // Get initial location on component mount
  const getInitialLocation = useCallback(async () => {
    try {
      const position = await getCurrentPosition();
      setCurrentCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setGeolocationStatus('success');
    } catch (error) {
      console.warn('Initial geolocation failed:', error);
      setGeolocationStatus('error');
    }
  }, []);

  useEffect(() => {
    getInitialLocation();
  }, [getInitialLocation]);

  // Click-away logic for user menu
  useEffect(() => {
    if (!showUserMenu) return;
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // NEW: Handle screen resize and automatically redirect to MobileDashboard when screen gets smaller
  useEffect(() => {
    let resizeTimeout;
    
    const handleResize = () => {
      // Clear previous timeout
      clearTimeout(resizeTimeout);
      
      // Debounce the resize event to prevent too many redirects
      resizeTimeout = setTimeout(() => {
        const currentWidth = window.innerWidth;
        
        // If we're in EmployeeDashboard but screen is now mobile size, redirect to MobileDashboard
        if (currentWidth <= 1024) {
          window.location.href = '/mobile-view';
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
  }, []);

  // React Query hooks for data fetching with 30-second polling
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['currentSession', employee?.id],
    queryFn: async () => {
      const result = await timeAPI.getCurrentSession();
      return result;
    },
    refetchInterval: 30000, // 30 seconds
    refetchIntervalInBackground: true,
    enabled: !!employee?.id,
  });

  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['timeEntries', employee?.id],
    queryFn: () => timeAPI.getTimeEntries({ limit: 20 }),
    refetchInterval: 30000, // 30 seconds
    refetchIntervalInBackground: true,
    enabled: !!employee?.id && !sessionData?.today_analysis,
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

  // Process session data
  useEffect(() => {
    if (sessionData) {
      setSessionResponse(sessionData);
      
      if (sessionData.today_analysis) {
        setOvertimeAnalysis(sessionData.today_analysis);
        
        // Determine current status based on active session
        if (sessionData.active_session) {
          setCurrentStatus('clocked_in');
        } else if (sessionData.today_analysis.total_hours > 0) {
          setCurrentStatus('clocked_out');
        } else {
          setCurrentStatus('not_started');
        }
      } else {
        setOvertimeAnalysis(null);
        setCurrentStatus('not_started');
      }
    }
  }, [sessionData]);

  // Process time entries data
  useEffect(() => {
    if (entriesData && entriesData.length > 0) {
      setTodayEntries(entriesData);
      const totalHours = calculateTotalHours(entriesData);
      setTotalHoursToday(totalHours);
    } else {
      setTodayEntries([]);
      setTotalHoursToday(0);
    }
  }, [entriesData]);

  // Calculate total hours from time entries
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

  // Update loading state
  useEffect(() => {
    if (!sessionLoading && !entriesLoading) {
      setLoading(false);
    }
  }, [sessionLoading, entriesLoading]);

  // NEW: Validate schedule before allowing time operations
  const validateSchedule = useCallback(() => {
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
    
    // Check if schedule exists for today
    if (!todaySchedule || Object.keys(todaySchedule).length === 0) {
      const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const errorMsg = `No work schedule found for today (${today}). Please contact your supervisor to set up your schedule before clocking in/out.`;
      setScheduleError(errorMsg);
      return false;
    }
    
    // Check if schedule has required fields
    if (!todaySchedule.scheduled_time_in || !todaySchedule.scheduled_time_out) {
      const errorMsg = 'Your schedule is incomplete. Please contact your supervisor to complete your schedule before clocking in/out.';
      setScheduleError(errorMsg);
      return false;
    }
    
    // Time constraint validation removed - always allow operations
    // This simplifies the clock-in process and removes potential blocking issues
    
    setScheduleError(null);
    return true;
  }, [todaySchedule, scheduleQueryError]);

  // NEW: Auto-validate schedule when component loads or schedule changes
  useEffect(() => {
    if (todaySchedule !== undefined || scheduleQueryError) {
      validateSchedule();
    }
  }, [todaySchedule, scheduleQueryError, validateSchedule]);

  // NEW: Check if time operations should be disabled
  const isTimeOperationsDisabled = useCallback(() => {
    // This prevents users from being completely blocked while we debug the schedule API issue
    if (scheduleQueryError) {
      return false;
    }
    
    // Only disable if there's a schedule error OR if schedule is still loading
    const disabled = !!scheduleError || todaySchedule === undefined;
    return disabled;
  }, [scheduleError, todaySchedule, scheduleQueryError]);

  const handleTimeIn = async () => {
    if (isTimeInSubmitting.current) return;
    
    // NEW: Validate schedule before allowing time in
    if (!validateSchedule()) {
      return;
    }
    
    isTimeInSubmitting.current = true;
    try {
      setIsClockingIn(true);
      let position;
      setGeolocationStatus('requesting');
      try {
        position = await getCurrentPosition();
        setGeolocationStatus('success');
        setCurrentCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        
        
        
                 // Test geofence validation before time in
         try {
           await timeAPI.validateGeofence({
             employee_id: employee.id,
             latitude: position.coords.latitude,
             longitude: position.coords.longitude,
             accuracy: position.coords.accuracy
           });
         } catch (geofenceError) {
           console.error('Geofence validation error:', geofenceError);
         }
        
      } catch (geoError) {
        console.warn('Geolocation failed, proceeding without coordinates:', geoError);
        setGeolocationStatus('error');
        position = { coords: { latitude: null, longitude: null, accuracy: null } };
        setCurrentCoords({ latitude: null, longitude: null });
      }
      
              const timeInData = {
          employee_id: employee.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        await timeAPI.clockIn(timeInData);
      
      // Invalidate and refetch queries to update the dashboard
      await queryClient.invalidateQueries({ queryKey: ['currentSession', employee?.id] });
      await queryClient.invalidateQueries({ queryKey: ['timeEntries', employee?.id] });
      
      showNotification('Time in recorded successfully!', 'success');
    } catch (error) {
      console.error('Error recording time in:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.details || error.response?.data?.error || 'Failed to record time in. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsClockingIn(false);
      setGeolocationStatus('idle');
      isTimeInSubmitting.current = false;
    }
  };

  const handleTimeOut = async () => {
    if (isTimeOutSubmitting.current) return;
    
    // NEW: Validate schedule before allowing time out
    if (!validateSchedule()) {
      return;
    }
    
    isTimeOutSubmitting.current = true;
    try {
      setIsClockingOut(true);
      let position;
      setGeolocationStatus('requesting');
      try {
        position = await getCurrentPosition();
        setGeolocationStatus('success');
        setCurrentCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        
        
        
                 // Test geofence validation before time out
         try {
           await timeAPI.validateGeofence({
             employee_id: employee.id,
             latitude: position.coords.latitude,
             longitude: position.coords.longitude,
             accuracy: position.coords.accuracy
           });
         } catch (geofenceError) {
           console.error('Geofence validation error:', geofenceError);
         }
        
      } catch (geoError) {
        console.warn('Geolocation failed, proceeding without coordinates:', geoError);
        setGeolocationStatus('error');
        position = { coords: { latitude: null, longitude: null, accuracy: null } };
        setCurrentCoords({ latitude: null, longitude: null });
      }
      
              const timeOutData = {
          employee_id: employee.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        await timeAPI.clockOut(timeOutData);
      
      // Invalidate and refetch queries to update the dashboard
      await queryClient.invalidateQueries({ queryKey: ['currentSession', employee?.id] });
      await queryClient.invalidateQueries({ queryKey: ['timeEntries', employee?.id] });
      
      showNotification('Time out recorded successfully!', 'success');
    } catch (error) {
      console.error('Error recording time out:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.details || error.response?.data?.error || 'Failed to record time out. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsClockingOut(false);
      setGeolocationStatus('idle');
      isTimeOutSubmitting.current = false;
    }
  };

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      });
    });
  };

  const showNotification = (message, type = 'info') => {
    // Enhanced notification system with higher z-index
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `fixed bottom-4 right-4 z-[9999] p-4 rounded-lg shadow-xl max-w-sm transform transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white border border-green-600' :
      type === 'error' ? 'bg-red-500 text-white border border-red-600' :
      type === 'warning' ? 'bg-yellow-500 text-white border border-yellow-600' :
      'bg-blue-500 text-white border border-blue-600'
    }`;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.className = 'absolute top-1 right-2 text-white hover:text-gray-200 text-lg font-bold';
    closeButton.onclick = () => {
      if (document.body.contains(notificationDiv)) {
        document.body.removeChild(notificationDiv);
      }
    };
    
    notificationDiv.appendChild(closeButton);
    
    // Add message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'pr-6'; // Space for close button
    messageDiv.textContent = message;
    notificationDiv.appendChild(messageDiv);
    
    document.body.appendChild(notificationDiv);
    
    // Auto-remove after 8 seconds (longer for errors)
    const autoRemoveTime = type === 'error' ? 8000 : 5000;
    setTimeout(() => {
      if (document.body.contains(notificationDiv)) {
        document.body.removeChild(notificationDiv);
      }
    }, autoRemoveTime);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'clocked_in': return 'text-green-600';
      case 'clocked_out': return 'text-red-600';
      case 'not_started': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'clocked_in': return 'Currently Working';
      case 'clocked_out': return 'Work Day Complete';
      case 'not_started': return 'Not Started Today';
      default: return 'Unknown Status';
    }
  };

  const formatDuration = (hours) => {
    if (hours === 0 || isNaN(hours)) return '0h 0m';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  // Helper function to group time_in and time_out entries into sessions
  function groupTimeEntriesToSessions(entries) {
    // Sort entries by timestamp ascending
    const sorted = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const sessions = [];
    let currentSession = null;

    sorted.forEach(entry => {
      if (entry.entry_type === 'time_in') {
        // Start a new session
        if (currentSession) {
          // If previous session has no time_out, push as active
          sessions.push(currentSession);
        }
        currentSession = {
          date: new Date(entry.timestamp).toLocaleDateString(),
          time_in: entry.formatted_timestamp || new Date(entry.timestamp).toLocaleTimeString(),
          time_out: null,
          duration: null,
          location: entry.location || null,
          location_name: entry.location?.name || 'No location',
          status: 'Active',
          raw_in: entry,
          raw_out: null
        };
      } else if (entry.entry_type === 'time_out' && currentSession) {
        // Pair with the last time_in
        currentSession.time_out = entry.formatted_timestamp || new Date(entry.timestamp).toLocaleTimeString();
        // Calculate duration if possible
        const inTime = new Date(currentSession.raw_in.timestamp);
        const outTime = new Date(entry.timestamp);
        const durationMs = outTime - inTime;
        if (!isNaN(durationMs) && durationMs > 0) {
          const hours = Math.floor(durationMs / (1000 * 60 * 60));
          const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
          currentSession.duration = `${hours > 0 ? hours + 'h ' : ''}${minutes}m`;
        }
        currentSession.status = 'Completed';
        currentSession.raw_out = entry;
        sessions.push(currentSession);
        currentSession = null;
      }
    });
    // If there's an unpaired time_in, add as active
    if (currentSession) {
      sessions.push(currentSession);
    }
    return sessions;
  }

  // Helper to format date/time in PH timezone
  const formatPHTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">


      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Sidebar with Tabs (remove tab bar and related logic) */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Current Status Card */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Current Status</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base text-gray-600">Status:</span>
                  <span className={`text-sm sm:text-base font-semibold ${getStatusColor(currentStatus)}`}>
                    {getStatusText(currentStatus)}
                  </span>
                </div>
                {overtimeAnalysis && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base text-gray-600">Total Hours Today:</span>
                      <span className="text-sm sm:text-base font-semibold text-gray-900">
                        {formatDuration(overtimeAnalysis.total_hours)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base text-gray-600">Actual Work Hours:</span>
                      <span className="text-sm sm:text-base font-semibold text-blue-600">
                        {formatDuration(overtimeAnalysis.actual_work_hours)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base text-gray-600">Regular Hours:</span>
                      <span className="text-sm sm:text-base font-semibold text-green-600">
                        {formatDuration(overtimeAnalysis.regular_hours)}
                      </span>
                    </div>
                    {overtimeAnalysis.overtime_hours > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base text-gray-600">Overtime Hours:</span>
                        <span className="text-sm sm:text-base font-semibold text-orange-600">
                          {formatDuration(overtimeAnalysis.overtime_hours)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base text-gray-600">Flexible Break:</span>
                      <span className="text-sm sm:text-base font-semibold text-purple-600">
                        {formatDuration(overtimeAnalysis.flexible_break_hours)}
                      </span>
                    </div>
                  </>
                )}
                {!overtimeAnalysis && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base text-gray-600">Total Hours Today:</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900">
                      {formatDuration(totalHoursToday)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* Time In/Out Controls */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Time Tracking</h2>
              <div className="space-y-4">
                <button
                  onClick={handleTimeIn}
                  disabled={isClockingIn || (sessionResponse && sessionResponse.active_session) || isTimeOperationsDisabled()}
                  className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
                    isClockingIn || (sessionResponse && sessionResponse.active_session) || isTimeOperationsDisabled()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isClockingIn ? 'Clocking In...' : 'Time In'}
                </button>
                                 <button
                   onClick={handleTimeOut}
                  disabled={isClockingOut || !(sessionResponse && sessionResponse.active_session) || isTimeOperationsDisabled()}
                  className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
                    isClockingOut || !(sessionResponse && sessionResponse.active_session) || isTimeOperationsDisabled()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isClockingOut ? 'Clocking Out...' : 'Time Out'}
                </button>

                {/* Geolocation Status */}
                <div className="text-sm text-gray-600">
                  {geolocationStatus === 'requesting' && '📍 Getting location...'}
                  {geolocationStatus === 'success' && '✅ Location obtained'}
                  {geolocationStatus === 'error' && '❌ Location unavailable'}
                </div>
              </div>
            </div>
            
                         {/* NEW: Time Status Display */}
             {todaySchedule && !scheduleError && (
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
                 <div className="flex items-center space-x-2">
                   <div className="text-blue-600">⏰</div>
                   <div>
                     <p className="text-blue-800 font-medium">Clock-in Status</p>
                     <div className="text-blue-600 text-sm space-y-1">
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
               <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 sm:p-6">
                 <div className="flex items-center space-x-2">
                   <div className="text-orange-600">📅</div>
                   <div>
                     <p className="text-orange-800 font-medium">Schedule Issue</p>
                     <p className="text-orange-600 text-sm">{scheduleError}</p>
                     <button
                       onClick={() => refetchSchedule()}
                       className="mt-2 text-orange-700 underline text-sm hover:text-orange-800"
                     >
                       Refresh Schedule
                     </button>
                   </div>
                 </div>
               </div>
             )}

            {/* NEW: Schedule Information Display */}
            {todaySchedule && !scheduleError && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
                <div className="flex items-center space-x-2">
                  <div className="text-blue-600">📋</div>
                  <div>
                    <p className="text-blue-800 font-medium">Today's Schedule</p>
                    <p className="text-blue-600 text-sm">
                      {todaySchedule.scheduled_time_in} - {todaySchedule.scheduled_time_out}
                      {todaySchedule.is_night_shift && ' (Night Shift)'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
          </div>
          {/* Right Column - Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Dashboard main content as before */}
            {/* Today's Timeline, Map, Overtime Details, etc. */}
            {/* ...existing dashboard content... */}
            {/* (Copy all content except the overtime requests section) */}
            {/* Today's Timeline */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Today's Timeline</h2>
              </div>
              <div className="p-4 sm:p-6">
                {/* Show active session first if exists */}
                {sessionResponse && sessionResponse.active_session && (
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center space-x-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-800">
                            🟢 Currently Working
                          </span>
                          <span className="text-sm text-blue-600">
                            {formatDuration(sessionResponse.active_session.current_duration)}
                          </span>
                        </div>
                        <div className="text-sm text-blue-600">
                          Started at {formatPHTime(sessionResponse.active_session.start_time)}
                        </div>
                        {sessionResponse.active_session.is_overtime && (
                          <div className="text-xs text-orange-600 font-medium">
                            ⚠️ Currently in overtime
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {overtimeAnalysis && overtimeAnalysis.sessions && overtimeAnalysis.sessions.length > 0 ? (
                  <div className="space-y-4">
                    {overtimeAnalysis.sessions.map((session, index) => (
                      <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-3 h-3 rounded-full ${
                          session.is_overtime ? 'bg-orange-500' :
                          session.is_break ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}></div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              {session.session_type === 'lunch' ? '🍽️ Lunch Break' :
                               session.session_type === 'break' ? '☕ Break' :
                               session.is_overtime ? '⏰ Overtime Work' : '💼 Regular Work'}
                            </span>
                            <span className="text-sm text-gray-600">
                              {formatDuration(session.duration_hours)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatPHTime(session.start_time)} - {formatPHTime(session.end_time)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : todayEntries.length > 0 ? (
                  <div className="space-y-4">
                    {groupTimeEntriesToSessions(todayEntries).map((session, index) => (
                      <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Work Session</span>
                            <span className="text-sm text-gray-600">{session.duration}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {session.time_in} - {session.time_out || 'Active'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Location: {session.location_name}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !sessionResponse?.active_session ? (
                  <p className="text-gray-500 text-center py-8">No time entries for today</p>
                ) : null}
              </div>
            </div>
            {/* Map Section */}
            {!currentCoords.latitude && (
              <div className="bg-white rounded-lg shadow p-6 text-red-500 mb-4">
                Geolocation latitude not available. Please allow location access in your browser.
              </div>
            )}
            {!currentCoords.longitude && (
              <div className="bg-white rounded-lg shadow p-6 text-red-500 mb-4">
                Geolocation longitude not available. Please allow location access in your browser.
              </div>
            )}
            {!employee.department && (
              <div className="bg-white rounded-lg shadow p-6 text-red-500 mb-4">
                No department set for this employee. Please contact your administrator.
              </div>
            )}
            {employee.department && !employee.department.location && (
              <div className="bg-white rounded-lg shadow p-6 text-red-500 mb-4">
                No department location set for this employee. Please contact your administrator.
              </div>
            )}
            {currentCoords.latitude && currentCoords.longitude && employee.department?.location && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Location Map</h2>
                </div>
                <div className="p-6">
                  <GeoMap
                    centerLat={employee.department.location.latitude}
                    centerLng={employee.department.location.longitude}
                    radius={employee.department.location.geofence_radius}
                    userLat={currentCoords.latitude}
                    userLng={currentCoords.longitude}
                  />
                </div>
              </div>
            )}
            {/* Overtime Details Section */}
            {overtimeAnalysis && (
              <div className="mt-8 bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Work Schedule Analysis</h2>
                    <button
                      onClick={() => setShowOvertimeDetails(!showOvertimeDetails)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {showOvertimeDetails ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>
                </div>
                {showOvertimeDetails && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatDuration(overtimeAnalysis.actual_work_hours)}
                        </div>
                        <div className="text-sm text-blue-800">Actual Work Hours</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatDuration(overtimeAnalysis.regular_hours)}
                        </div>
                        <div className="text-sm text-green-800">Regular Hours</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {formatDuration(overtimeAnalysis.overtime_hours)}
                        </div>
                        <div className="text-sm text-orange-800">Overtime Hours</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatDuration(overtimeAnalysis.flexible_break_hours)}
                        </div>
                        <div className="text-sm text-purple-800">Flexible Break</div>
                      </div>
                    </div>
                    <div className="mt-6">
                      <h3 className="text-md font-semibold text-gray-900 mb-3">Schedule Configuration</h3>
                      <div className="bg-gray-100 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Total Schedule:</span>
                              <span className="font-semibold">{employee.total_schedule_hours || 9} hours</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Daily Work Hours:</span>
                              <span className="font-semibold">{employee.daily_work_hours || 8} hours</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Flexible Break:</span>
                              <span className="font-semibold">{employee.flexible_break_hours || 1} hour</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Overtime Threshold:</span>
                              <span className="font-semibold">{employee.overtime_threshold_hours || 8} hours</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Current Total:</span>
                              <span className="font-semibold">{formatDuration(overtimeAnalysis.total_hours)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Work Time Used:</span>
                              <span className="font-semibold">{formatDuration(overtimeAnalysis.actual_work_hours)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">How It Works:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Total schedule: {employee.total_schedule_hours || 9} hours (recommended time in to time out)</li>
                        <li>• Actual work time: All time counts toward overtime calculation</li>
                        <li>• Flexible break: {employee.flexible_break_hours || 1} hour (built into schedule, no logging needed)</li>
                        <li>• Overtime starts after {employee.overtime_threshold_hours || 8} hours of actual work</li>
                        <li>• Working beyond 9 hours: All additional time counts as overtime</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}