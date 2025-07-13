import React, { useState, useEffect } from 'react';
import { timeAPI, authAPI } from '../api';

export default function EmployeeDashboard({ user, employee, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState('not_started');
  const [todayEntries, setTodayEntries] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [totalHoursToday, setTotalHoursToday] = useState(0);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [geolocationStatus, setGeolocationStatus] = useState('idle'); // 'idle', 'requesting', 'success', 'error'

  useEffect(() => {
    loadDashboardData();
    
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current session data
      try {
        const sessionResponse = await timeAPI.getCurrentSession();
        console.log('Session response:', sessionResponse);
        const status = sessionResponse.status || 'not_started';
        setCurrentStatus(status);
        setTodayEntries(sessionResponse.today_entries || []);
        setTotalHoursToday(sessionResponse.total_hours || 0);
      } catch (sessionError) {
        console.log('Session error:', sessionError.response?.status, sessionError.message);
        // If session endpoint returns 404, try to get today's entries directly
        if (sessionError.response?.status === 404) {
          setCurrentStatus('not_started');
          
          // Try to get today's entries from recent entries
          try {
            const entriesResponse = await timeAPI.getTimeEntries({ limit: 20 });
            console.log('Recent entries response:', entriesResponse);
            
            // Filter for today's entries
            const today = new Date().toDateString();
            const todayEntries = (entriesResponse.results || []).filter(entry => {
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
        } else {
          // For other errors, re-throw
          throw sessionError;
        }
      }
      
      // Get recent entries
      try {
        const entriesResponse = await timeAPI.getTimeEntries({ limit: 10 });
        setRecentEntries(entriesResponse.results || []);
      } catch (entriesError) {
        setRecentEntries([]);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set default values on error
      setCurrentStatus('not_started');
      setTodayEntries([]);
      setRecentEntries([]);
      setTotalHoursToday(0);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeIn = async () => {
    try {
      setIsClockingIn(true);
      
      // Get current location
      let position;
      setGeolocationStatus('requesting');
      try {
        position = await getCurrentPosition();
        setGeolocationStatus('success');
      } catch (geoError) {
        console.warn('Geolocation failed, proceeding without coordinates:', geoError);
        setGeolocationStatus('error');
        // Continue without coordinates (backend will handle this)
        position = { coords: { latitude: null, longitude: null } };
      }
      
      await timeAPI.timeIn({
        employee_id: employee.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString()
      });
      
      // Reload dashboard data
      await loadDashboardData();
      
      // Show success message
      showNotification('Time in recorded successfully!', 'success');
      
    } catch (error) {
      console.error('Error recording time in:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to record time in. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsClockingIn(false);
      setGeolocationStatus('idle');
    }
  };

  const handleTimeOut = async () => {
    try {
      setIsClockingOut(true);
      
      // Get current location
      let position;
      setGeolocationStatus('requesting');
      try {
        position = await getCurrentPosition();
        setGeolocationStatus('success');
      } catch (geoError) {
        console.warn('Geolocation failed, proceeding without coordinates:', geoError);
        setGeolocationStatus('error');
        // Continue without coordinates (backend will handle this)
        position = { coords: { latitude: null, longitude: null } };
      }
      
      await timeAPI.timeOut({
        employee_id: employee.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString()
      });
      
      // Reload dashboard data
      await loadDashboardData();
      
      // Show success message
      showNotification('Time out recorded successfully!', 'success');
      
    } catch (error) {
      console.error('Error recording time out:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to record time out. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsClockingOut(false);
      setGeolocationStatus('idle');
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
    notificationDiv.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
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



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Employee Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {user?.first_name || user?.username}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">{currentTime.toLocaleDateString()}</div>
                <div className="text-lg font-mono text-gray-900">{currentTime.toLocaleTimeString()}</div>
              </div>
              
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Status Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Current Status</h2>
            <div className={`text-3xl font-bold mb-4 ${getStatusColor(currentStatus)}`}>
              {getStatusText(currentStatus)}
            </div>
            
            {currentStatus === 'clocked_in' && (
              <div className="text-lg text-gray-600 mb-6">
                Total hours today: <span className="font-semibold">{formatDuration(totalHoursToday)}</span>
              </div>
            )}
            
            {/* Geolocation Status Indicator */}
            {geolocationStatus === 'requesting' && (
              <div className="text-sm text-blue-600 mb-4">
                <svg className="animate-spin inline w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Getting your location...
              </div>
            )}
            {geolocationStatus === 'error' && (
              <div className="text-sm text-yellow-600 mb-4">
                <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Location unavailable - proceeding without geolocation
              </div>
            )}
            

            
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleTimeIn}
                disabled={isClockingIn || currentStatus === 'clocked_in'}
                className={`px-8 py-3 rounded-lg font-medium transition-colors shadow-sm ${
                  currentStatus === 'clocked_in' 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isClockingIn ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Clocking In...
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Time In
                  </>
                )}
              </button>
              
              <button
                onClick={handleTimeOut}
                disabled={isClockingOut || currentStatus === 'clocked_out' || currentStatus === 'not_started'}
                className={`px-8 py-3 rounded-lg font-medium transition-colors shadow-sm ${
                  currentStatus === 'clocked_out' || currentStatus === 'not_started'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isClockingOut ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Clocking Out...
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Time Out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

                {/* Today's Timeline */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Today's Timeline</h2>
            {todayEntries.length > 0 && (
              <div className="text-sm text-gray-600">
                Total: <span className="font-medium text-blue-600">{formatDuration(totalHoursToday)}</span>
              </div>
            )}
          </div>
          
          {/* Debug info */}
          <div className="text-xs text-gray-500 mb-2">
            Debug: todayEntries.length = {todayEntries.length}, currentStatus = {currentStatus}, totalHours = {totalHoursToday} ({typeof totalHoursToday})
          </div>
          
          {todayEntries.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500">No time entries for today. Start by recording your time in!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayEntries.map((entry, index) => (
                <div key={entry.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    entry.entry_type === 'time_in' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {entry.entry_type === 'time_in' ? 'Time In' : 'Time Out'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                                        <div className="text-sm text-gray-500">
                        {entry.location_name ? (
                          <span title={entry.location_name}>
                            {entry.location_name.length > 20 
                              ? entry.location_name.substring(0, 20) + '...' 
                              : entry.location_name
                            }
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No location</span>
                        )}
                      </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Time History */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Time History</h2>
          
                      {recentEntries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No time history found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentEntries.slice(0, 10).map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{new Date(entry.timestamp).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.entry_type === 'time_in' ? (
                            <span className="text-green-600 font-medium">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.entry_type === 'time_out' ? (
                            <span className="text-red-600 font-medium">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.duration ? (
                            <span className="font-medium">{entry.duration}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.location_name ? (
                            <div className="max-w-xs truncate" title={entry.location_name}>
                              {entry.location_name}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No location</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            entry.entry_type === 'time_out' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.entry_type === 'time_out' ? 'Completed' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </main>
    </div>
  );
} 