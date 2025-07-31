import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaClock, FaMapMarkerAlt, FaSignInAlt, FaSignOutAlt, FaUser, FaBars, FaDesktop, FaMobile } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import timeAPI from '../../api/timeAPI';
import { getCurrentPosition } from '../../utils/geolocation';
import { setUserViewPreference, VIEW_MODES } from '../../utils/deviceDetection';

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

  // Handle clicking outside menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleTimeIn = async () => {
    if (isTimeInSubmitting.current) return;
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
          console.error('Clock in error:', error);
          console.error('Error response:', error.response);
          console.error('Error response data:', error.response?.data);
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
          console.error('Clock out error:', error);
          console.error('Error response:', error.response);
          console.error('Error response data:', error.response?.data);
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

  const getStatusColor = () => {
    switch (currentStatus) {
      case 'clocked_in': return 'text-green-600';
      case 'clocked_out': return 'text-red-600';
      case 'on_break': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (currentStatus) {
      case 'clocked_in': return 'Clocked In';
      case 'clocked_out': return 'Clocked Out';
      case 'on_break': return 'On Break';
      default: return 'Not Started';
    }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaUser className="text-2xl" />
            <div>
              <h1 className="text-lg font-semibold">{user?.first_name} {user?.last_name}</h1>
              <p className="text-sm opacity-90">{employee?.position}</p>
              <div className="flex items-center space-x-1 mt-1">
                <FaMobile className="text-xs" />
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
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <FaBars className="text-xl" />
            </button>
          </div>
      </div>

      {/* Mobile Menu */}
      {showMenu && (
        <div ref={menuRef} className="absolute top-20 right-4 bg-white rounded-lg shadow-lg z-50 min-w-48">
          <div className="p-4 border-b">
            <p className="text-sm text-gray-600">Quick Actions</p>
          </div>
          <div className="p-2">
            <button
              onClick={() => setShowMap(!showMap)}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center space-x-2"
            >
              <FaMapMarkerAlt className="text-blue-600" />
              <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                // Set user preference to full view
                setUserViewPreference(VIEW_MODES.FULL);
                // Force page refresh to apply the new view mode
                window.location.href = '/';
              }}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center space-x-2 text-blue-600"
            >
              <FaDesktop />
              <span>Back to Full View</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center space-x-2 text-red-600"
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Error Display */}
        {(sessionError || entriesError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="text-red-600">⚠️</div>
              <div>
                <p className="text-red-800 font-medium">Connection Error</p>
                <p className="text-red-600 text-sm">
                  {sessionError?.message || entriesError?.message || 'Unable to connect to server'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            <p className="text-gray-600 mt-2">Today's Total: {getTotalHoursToday()}</p>
          </div>
        </div>

        {/* Clock In/Out Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleTimeIn}
            disabled={isClockingIn || sessionResponse?.active_session}
            className={`p-4 rounded-lg font-semibold text-white transition-colors ${
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
            disabled={isClockingOut || !sessionResponse?.active_session}
            className={`p-4 rounded-lg font-semibold text-white transition-colors ${
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
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaMapMarkerAlt className="text-blue-600" />
              <span className="font-medium">Location Status</span>
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
            <p className="text-sm text-gray-600 mt-2">
              Lat: {currentCoords.latitude.toFixed(6)}, 
              Lng: {currentCoords.longitude.toFixed(6)}
            </p>
          )}
          {employee?.role === 'team_leader' && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-800">
                <strong>Team Leader Privilege:</strong> You can clock in/out from any location
              </p>
            </div>
          )}
        </div>

        {/* Map View */}
        {showMap && currentCoords.latitude && currentCoords.longitude && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-medium flex items-center space-x-2">
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
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-medium mb-3">Today's Activity</h3>
          <div className="space-y-2">
            {todayEntries?.length > 0 ? (
              todayEntries.slice(-3).map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <FaClock className="text-gray-400" />
                    <span className="capitalize">{entry.entry_type.replace('_', ' ')}</span>
                  </div>
                  <span className="text-gray-600">
                    {new Date(entry.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No activity recorded today</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDashboard; 