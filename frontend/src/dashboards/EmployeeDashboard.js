import React, { useState, useEffect, useRef, useCallback } from 'react';
import { timeAPI, workSessionAPI } from '../api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import GeoMap from '../GeoMap';
import { NavLink } from 'react-router-dom';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Add icons (using Heroicons/Feather or SVGs)
const DashboardIcon = () => (
  <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z"/></svg>
);
const ReportsIcon = () => (
  <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h3m4 4v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2h3a4 4 0 014 4v2" /></svg>
);
const ProfileIcon = () => (
  <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

const roleBadgeStyles = {
  employee: 'bg-blue-100 text-blue-800',
  admin: 'bg-green-100 text-green-800',
  manager: 'bg-purple-100 text-purple-800',
  default: 'bg-gray-100 text-gray-800',
};

const roleIcons = {
  employee: (
    <svg className="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  ),
  admin: (
    <svg className="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.104.896-2 2-2s2 .896 2 2-.896 2-2 2-2-.896-2-2zm0 0V7m0 4v4m0 0c-1.104 0-2 .896-2 2s.896 2 2 2 2-.896 2-2-.896-2-2-2z" /></svg>
  ),
  manager: (
    <svg className="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 01-8 0m8 0a4 4 0 00-8 0m8 0V5a4 4 0 00-8 0v2m8 0a4 4 0 01-8 0" /></svg>
  ),
  default: (
    <svg className="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" /></svg>
  ),
};

export default function EmployeeDashboard({ user, employee, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState('not_started');
  const [todayEntries, setTodayEntries] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [totalHoursToday, setTotalHoursToday] = useState(0);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [geolocationStatus, setGeolocationStatus] = useState('idle');
  const [currentCoords, setCurrentCoords] = useState({ latitude: null, longitude: null });
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Overtime-related state
  const [overtimeAnalysis, setOvertimeAnalysis] = useState(null);
  const [sessionResponse, setSessionResponse] = useState(null);
  const [overtimeAlerts, setOvertimeAlerts] = useState([]);
  const [showOvertimeDetails, setShowOvertimeDetails] = useState(false);
  
  const isTimeInSubmitting = useRef(false);
  const isTimeOutSubmitting = useRef(false);
  const userMenuRef = useRef(null);

  const MINIMUM_LOCATION_ACCURACY_METERS = 100;

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

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Get current session status with overtime analysis
      const sessionResponse = await timeAPI.getCurrentSession();
      console.log('sessionResponse', sessionResponse); // Debug print
      setSessionResponse(sessionResponse);
      
      if (sessionResponse.today_analysis) {
        setOvertimeAnalysis(sessionResponse.today_analysis);
        
        // Determine current status based on active session
        if (sessionResponse.active_session) {
          setCurrentStatus('clocked_in');
        } else if (sessionResponse.today_analysis.total_hours > 0) {
          setCurrentStatus('clocked_out');
        } else {
          setCurrentStatus('not_started');
        }
        
        // Check for overtime alerts
        const alerts = [];
        if (sessionResponse.today_analysis.is_overtime) {
          alerts.push({
            type: 'overtime',
            message: `You have worked ${sessionResponse.today_analysis.overtime_hours} hours of overtime today!`,
            severity: 'warning'
          });
        }
        
        if (sessionResponse.active_session && sessionResponse.active_session.is_overtime) {
          alerts.push({
            type: 'active_overtime',
            message: 'You are currently in overtime!',
            severity: 'warning'
          });
        }
        
        if (sessionResponse.active_session && sessionResponse.active_session.hours_until_overtime < 1) {
          alerts.push({
            type: 'approaching_overtime',
            message: `You are ${(sessionResponse.active_session.hours_until_overtime * 60).toFixed(0)} minutes away from overtime!`,
            severity: 'info'
          });
        }
        
        setOvertimeAlerts(alerts);
        setTotalHoursToday(sessionResponse.today_analysis.total_hours);
      } else {
        // Fallback to old method if overtime analysis not available
        try {
          const entriesResponse = await timeAPI.getTimeEntries({ limit: 20 });
          console.log('Recent entries response:', entriesResponse);
          
          // Filter for today's entries
          const today = new Date().toDateString();
          const todayEntries = (entriesResponse.results || entriesResponse || []).filter(entry => {
            const entryDate = new Date(entry.timestamp).toDateString();
            return entryDate === today;
          });
          
          console.log('Filtered today entries:', todayEntries);
          console.log('Sample entry location:', todayEntries[0]?.location_name);
          setTodayEntries(todayEntries);
          
          // Calculate total hours from today's entries
          let totalHours = 0;
          if (todayEntries.length > 0) {
            console.log('Calculating hours from entries:', todayEntries);
            
            // Sort entries by timestamp
            const sortedEntries = todayEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            const timeInEntries = sortedEntries.filter(e => e.entry_type === 'time_in');
            const timeOutEntries = sortedEntries.filter(e => e.entry_type === 'time_out');
            
            console.log('Time in entries:', timeInEntries);
            console.log('Time out entries:', timeOutEntries);
            
            // Calculate actual hours worked
            for (let i = 0; i < Math.min(timeInEntries.length, timeOutEntries.length); i++) {
              const timeIn = new Date(timeInEntries[i].timestamp);
              const timeOut = new Date(timeOutEntries[i].timestamp);
              const duration = (timeOut - timeIn) / (1000 * 60 * 60); // Convert to hours
              console.log(`Session ${i + 1}: ${timeIn.toLocaleTimeString()} - ${timeOut.toLocaleTimeString()} = ${duration.toFixed(2)} hours`);
              totalHours += duration;
            }
            
            console.log('Total hours calculated:', totalHours);
          
          // Test the calculation with our test function
          const testHours = testTotalHoursCalculation(todayEntries);
          console.log('Test function result:', testHours);
          }
          setTotalHoursToday(totalHours);
        } catch (entriesError) {
          console.log('Entries error:', entriesError);
          setTodayEntries([]);
          setTotalHoursToday(0);
        }
      }
      
      // Get recent entries
      try {
        const entriesResponse = await timeAPI.getTimeEntries({ limit: 10 });
        setRecentEntries(entriesResponse.results || entriesResponse || []);
      } catch (entriesError) {
        setRecentEntries([]);
      }
      
      // Get work sessions for today
      try {
        await workSessionAPI.getTodayWorkSessions();
        // setWorkSessions(sessionsResponse.results || sessionsResponse || []); // <-- Remove this line
      } catch (sessionsError) {
        console.log('Work sessions error:', sessionsError);
        // setWorkSessions([]); // <-- Remove this line
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set default values on error
      setCurrentStatus('not_started');
      setTodayEntries([]);
      setRecentEntries([]);
      setTotalHoursToday(0);
      setOvertimeAnalysis(null);
      setSessionResponse(null);
      // setWorkSessions([]); // <-- Remove this line
    } finally {
      setLoading(false);
    }
  }, [timeAPI, workSessionAPI]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleTimeIn = async () => {
    if (isTimeInSubmitting.current) return;
    isTimeInSubmitting.current = true;
    try {
      setIsClockingIn(true);
      let position;
      setGeolocationStatus('requesting');
      try {
        position = await getCurrentPosition();
        setGeolocationStatus('success');
        setCurrentCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        // Frontend accuracy check
        if (position.coords.accuracy > MINIMUM_LOCATION_ACCURACY_METERS) {
          showNotification(`Location accuracy is too low (${position.coords.accuracy.toFixed(0)}m). Please move to an open area and try again.`, 'error');
          setIsClockingIn(false);
          setGeolocationStatus('idle');
          isTimeInSubmitting.current = false;
          return;
        }
      } catch (geoError) {
        console.warn('Geolocation failed, proceeding without coordinates:', geoError);
        setGeolocationStatus('error');
        position = { coords: { latitude: null, longitude: null, accuracy: null } };
        setCurrentCoords({ latitude: null, longitude: null });
      }
      await timeAPI.timeIn({
        employee_id: employee.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
      await loadDashboardData();
      showNotification('Time in recorded successfully!', 'success');
    } catch (error) {
      console.error('Error recording time in:', error);
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
    isTimeOutSubmitting.current = true;
    try {
      setIsClockingOut(true);
      let position;
      setGeolocationStatus('requesting');
      try {
        position = await getCurrentPosition();
        setGeolocationStatus('success');
        setCurrentCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        // Frontend accuracy check
        if (position.coords.accuracy > MINIMUM_LOCATION_ACCURACY_METERS) {
          showNotification(`Location accuracy is too low (${position.coords.accuracy.toFixed(0)}m). Please move to an open area and try again.`, 'error');
          setIsClockingOut(false);
          setGeolocationStatus('idle');
          isTimeOutSubmitting.current = false;
          return;
        }
      } catch (geoError) {
        console.warn('Geolocation failed, proceeding without coordinates:', geoError);
        setGeolocationStatus('error');
        position = { coords: { latitude: null, longitude: null, accuracy: null } };
        setCurrentCoords({ latitude: null, longitude: null });
      }
      await timeAPI.timeOut({
        employee_id: employee.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
      await loadDashboardData();
      showNotification('Time out recorded successfully!', 'success');
    } catch (error) {
      console.error('Error recording time out:', error);
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
    // Enhanced notification system
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    notificationDiv.textContent = message;
    
    document.body.appendChild(notificationDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notificationDiv)) {
        document.body.removeChild(notificationDiv);
      }
    }, 5000);
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

  // Test function for total hours calculation
  const testTotalHoursCalculation = (entries) => {
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
    if (!dateString) return '';
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
      {/* Overtime Alerts */}
      {overtimeAlerts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          {overtimeAlerts.map((alert, index) => (
            <div
              key={index}
              className={`mb-2 p-4 rounded-lg border-l-4 ${
                alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
                alert.severity === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
                'bg-blue-50 border-blue-400 text-blue-800'
              }`}
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  {alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{alert.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Status and Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Current Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-semibold ${getStatusColor(currentStatus)}`}>
                    {getStatusText(currentStatus)}
                  </span>
                </div>
                
                {overtimeAnalysis && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Hours Today:</span>
                      <span className="font-semibold text-gray-900">
                        {formatDuration(overtimeAnalysis.total_hours)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Actual Work Hours:</span>
                      <span className="font-semibold text-blue-600">
                        {formatDuration(overtimeAnalysis.actual_work_hours)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Regular Hours:</span>
                      <span className="font-semibold text-green-600">
                        {formatDuration(overtimeAnalysis.regular_hours)}
                      </span>
                    </div>
                    
                    {overtimeAnalysis.overtime_hours > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Overtime Hours:</span>
                        <span className="font-semibold text-orange-600">
                          {formatDuration(overtimeAnalysis.overtime_hours)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Flexible Break:</span>
                      <span className="font-semibold text-purple-600">
                        {formatDuration(overtimeAnalysis.flexible_break_hours)}
                      </span>
                    </div>
                  </>
                )}
                
                {!overtimeAnalysis && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Hours Today:</span>
                    <span className="font-semibold text-gray-900">
                      {formatDuration(totalHoursToday)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Time In/Out Controls */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Tracking</h2>
              <div className="space-y-4">
                <button
                  onClick={handleTimeIn}
                  disabled={isClockingIn || (sessionResponse && sessionResponse.active_session)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isClockingIn || (sessionResponse && sessionResponse.active_session)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isClockingIn ? 'Clocking In...' : 'Time In'}
                </button>
                
                <button
                  onClick={handleTimeOut}
                  disabled={isClockingOut || !(sessionResponse && sessionResponse.active_session)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isClockingOut || !(sessionResponse && sessionResponse.active_session)
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

          </div>

          {/* Right Column - Timeline and History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Timeline */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Today's Timeline</h2>
              </div>
              <div className="p-6">
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
                ) : (
                  <p className="text-gray-500 text-center py-8">No time entries for today</p>
                )}
              </div>
            </div>

            {/* Time History */}
            {/* (Recent Time Entries section removed) */}
            {/* Map Section - now expanded and always visible */}
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