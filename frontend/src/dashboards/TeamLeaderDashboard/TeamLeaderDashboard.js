import React, { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import TeamOverview from './TeamOverview';
import TeamMemberDrawer from './TeamMemberDrawer';
import TeamTimeEntriesDrawer from './TeamTimeEntriesDrawer';
import TimeCorrectionApprovalsModal from './TimeCorrectionApprovalsModal';
import TimeInOutManager from './TimeInOutManager';
import TeamMap from './TeamMap';
import AbsentTodayDrawer from './AbsentTodayDrawer';
import { timeAPI } from '../../api';

// Reusable Loading Components
const LoadingSpinner = ({ size = 'md', text = 'Loading...', description = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };
  
  return (
    <div className="flex items-center justify-center space-x-2">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
      <div>
        <div className="text-blue-700 font-medium">{text}</div>
        {description && <div className="text-blue-600 text-sm">{description}</div>}
      </div>
    </div>
  );
};

const ProcessingMessage = ({ title, description, type = 'info' }) => {
  const colors = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    error: 'bg-red-50 border-red-200 text-red-700'
  };
  
  return (
    <div className={`mt-4 p-3 border rounded-lg ${colors[type]}`}>
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm opacity-80">{description}</div>
        </div>
      </div>
    </div>
  );
};

const TeamLeaderDashboard = ({ employee }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timeEntriesDrawerOpen, setTimeEntriesDrawerOpen] = useState(false);
  const [approvalsModalOpen, setApprovalsModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLeaderLocation, setTeamLeaderLocation] = useState(null);
  const [personalStatus, setPersonalStatus] = useState('not_started');
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [absentTodayDrawerOpen, setAbsentTodayDrawerOpen] = useState(false);
  const [mapRefreshTrigger, setMapRefreshTrigger] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Return early if employee data is not available yet
    if (!employee?.id) {
      setLoading(false);
      return null;
    }
    
    try {
      const [dashboardRes, teamMembersRes, sessionRes] = await Promise.all([
        axiosInstance.get('dashboard/'),
        axiosInstance.get(`employees/${employee.id}/subordinates/`),
        timeAPI.getCurrentSession()
      ]);
      
      setDashboard(dashboardRes.data);
      setTeamMembers(teamMembersRes.data);
      // Fetch pending approvals count
      try {
        const approvalsRes = await axiosInstance.get('time-correction-requests/', { params: { status: 'pending' } });
        const approvalsData = Array.isArray(approvalsRes.data)
          ? approvalsRes.data
          : approvalsRes.data?.results || [];
        setPendingApprovalsCount(approvalsData.length);
      } catch (e) {
        setPendingApprovalsCount(0);
      }
      // Set team leader location directly from API response
      if (dashboardRes.data.employee?.department?.location) {
        setTeamLeaderLocation(dashboardRes.data.employee.department.location);
      }
      
      // Set personal status
      if (sessionRes.active_session) {
        setPersonalStatus('clocked_in');
      } else if (sessionRes.today_analysis?.total_hours > 0) {
        setPersonalStatus('clocked_out');
      } else {
        setPersonalStatus('not_started');
      }
      
      setLoading(false);
      return dashboardRes.data;
    } catch (error) {
      setError('Failed to load dashboard data');
      setLoading(false);
      throw error;
    }
  }, [employee]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Automatically fetch location on mount or when employee changes
  useEffect(() => {
    if (!currentLocation && employee?.id) {
      getCurrentLocation();
    }
    // eslint-disable-next-line
  }, [employee]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return Promise.reject(new Error('Geolocation not supported'));
    }

    setLocationError('');
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setCurrentLocation({ latitude, longitude, accuracy });
          resolve({ latitude, longitude, accuracy });
        },
        (error) => {
          setLocationError(`Error getting location: ${error.message}`);
          setCurrentLocation(null);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }, []);

  const handlePersonalTimeIn = async () => {
    setIsClockingIn(true);
    setError('');

    try {
      // Always get fresh location before clocking in
      const locationData = await getCurrentLocation();
      
      const response = await timeAPI.timeIn({
        employee_id: employee.id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy
      });
      
      setPersonalStatus('clocked_in');
      setError('');
      // Refresh dashboard data
      window.location.reload();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.details || 
                          error.response?.data?.message ||
                          'Failed to clock in';
      
      const fullError = `Clock in failed: ${errorMessage}`;
      if (error.response?.data) {
      }
      setError(fullError);
    } finally {
      setIsClockingIn(false);
    }
  };

  const handlePersonalTimeOut = async () => {
    setIsClockingOut(true);
    setError('');

    try {
      // Always get fresh location before clocking out
      const locationData = await getCurrentLocation();
      
      const response = await timeAPI.timeOut({
        employee_id: employee.id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy
      });
      
      setPersonalStatus('clocked_out');
      setError('');
      // Refresh dashboard data
      window.location.reload();
    } catch (error) {
      // Check if it's a location error
      if (error.message && error.message.includes('Geolocation')) {
        setError('Location access denied. Please allow location access and try again.');
      } else {
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.details || 
                            error.response?.data?.message ||
                            'Failed to clock out';
        
        const fullError = `Clock out failed: ${errorMessage}`;
        if (error.response?.data) {
        }
        setError(fullError);
      }
    } finally {
      setIsClockingOut(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'clocked_in': return 'text-green-600';
      case 'clocked_out': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'clocked_in': return 'Currently Clocked In';
      case 'clocked_out': return 'Clocked Out';
      default: return 'Not Started Today';
    }
  };

  // Function to check current session status
  const checkCurrentSession = async () => {
    try {
      const sessionData = await timeAPI.getCurrentSession();
      
      if (sessionData.active_session) {
        setPersonalStatus('clocked_in');
      } else if (sessionData.today_analysis?.total_hours > 0) {
        setPersonalStatus('clocked_out');
      } else {
        setPersonalStatus('not_started');
      }
    } catch (error) {
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." description="Fetching team data and analytics" />
      </div>
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="text-red-600 text-lg font-medium mb-2">Error Loading Dashboard</div>
        <div className="text-gray-600">{error}</div>
        <button 
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
  if (!dashboard) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-pulse rounded-full h-12 w-12 bg-blue-200 mx-auto mb-4"></div>
        <div className="text-lg text-gray-700 font-medium">Loading dashboard data...</div>
        <div className="text-sm text-gray-500 mt-2">Initializing components</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 md:p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen relative z-0">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Team Leader Dashboard</h1>
      <TeamOverview
        teamMembersCount={dashboard?.team_members_count || 0}
        teamAttendance={dashboard?.team_attendance || { present: 0, absent: 0, late: 0 }}
        pendingApprovals={pendingApprovalsCount}
        onTeamMembersClick={() => setDrawerOpen(true)}
        onPresentTodayClick={() => setTimeEntriesDrawerOpen(true)}
        onPendingApprovalsClick={() => setApprovalsModalOpen(true)}
        onAbsentTodayClick={() => setAbsentTodayDrawerOpen(true)}
      />

      {/* Personal Time In/Out Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">My Time In/Out</h2>
        
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {/* Status Display */}
          <div className="text-center">
            <div className={`text-base sm:text-lg font-semibold ${getStatusColor(personalStatus)}`}>
              {getStatusText(personalStatus)}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">
              {employee?.full_name}
            </div>
          </div>

          {/* Location Status */}
          <div className="text-center">
            {locationError ? (
              <div className="text-red-600 text-xs sm:text-sm bg-red-50 p-2 rounded-lg">{locationError}</div>
            ) : currentLocation ? (
              <div className="text-green-600 text-xs sm:text-sm bg-green-50 p-2 rounded-lg">
                ✓ Location obtained (Accuracy: {currentLocation.accuracy?.toFixed(1)}m)
              </div>
            ) : (
              <div className="text-yellow-600 text-xs sm:text-sm bg-yellow-50 p-2 rounded-lg">Location not obtained</div>
            )}
            <button
              type="button"
              onClick={getCurrentLocation}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 underline mt-1 transition-colors"
            >
              Refresh Location
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-center">
            {personalStatus !== 'clocked_in' ? (
              <button
                onClick={handlePersonalTimeIn}
                disabled={isClockingIn}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all duration-200 transform hover:scale-105 ${
                  isClockingIn
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {isClockingIn ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Clocking In...</span>
                  </div>
                ) : (
                  'Clock In'
                )}
              </button>
            ) : (
              <button
                onClick={handlePersonalTimeOut}
                disabled={isClockingOut}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all duration-200 transform hover:scale-105 ${
                  isClockingOut
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {isClockingOut ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Clocking Out...</span>
                  </div>
                ) : (
                  'Clock Out'
                )}
              </button>
            )}
            <button
              onClick={checkCurrentSession}
              className="px-3 py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Check Status
            </button>
          </div>

          {/* Enhanced Loading Messages */}
          {(isClockingIn || isClockingOut) && (
            <ProcessingMessage 
              title={isClockingIn ? 'Processing Clock In' : 'Processing Clock Out'}
              description={isClockingIn 
                ? 'Recording your start time and location...' 
                : 'Recording your end time and calculating hours...'
              }
              type="info"
            />
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 sm:mt-4 text-red-600 text-xs sm:text-sm p-2 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}
      </div>
      <TeamMemberDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} teamLeaderId={employee?.id} />
      <TeamTimeEntriesDrawer open={timeEntriesDrawerOpen} onClose={() => setTimeEntriesDrawerOpen(false)} />
      <TimeCorrectionApprovalsModal 
        open={approvalsModalOpen} 
        pendingApprovalsCount={dashboard?.pending_approvals || 0}
        onClose={() => {
          setApprovalsModalOpen(false);
          // Refresh dashboard data when modal is closed to update the pending approvals count
          fetchDashboardData();
        }} 
      />
      <AbsentTodayDrawer open={absentTodayDrawerOpen} onClose={() => setAbsentTodayDrawerOpen(false)} />
      
      {/* Time In/Out Manager and Team Map */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 md:mb-8 relative z-0">
        <div className="lg:col-span-1">
          <TimeInOutManager 
            teamMembers={teamMembers}
            onTimeEntryCreated={(data) => {
              // Refresh dashboard data when a time entry is created
              fetchDashboardData();
              // Trigger map refresh with a small delay to ensure backend processing
              setTimeout(() => {
                setMapRefreshTrigger(prev => prev + 1);
              }, 1000);
            }}
          />
        </div>
        <div className="lg:col-span-2">
          <TeamMap 
            teamLeaderLocation={teamLeaderLocation}
            teamMembers={teamMembers}
            refreshTrigger={mapRefreshTrigger}
          />
        </div>
      </div>
      
    </div>
  );
};

export default TeamLeaderDashboard; 