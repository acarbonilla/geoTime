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

// Enhanced Loading Components with better animations
const LoadingSpinner = ({ size = 'md', text = 'Loading...', description = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };
  
  return (
    <div className="flex items-center justify-center space-x-3 animate-fade-in">
      <div className="relative">
        <div className={`animate-spin rounded-full border-4 border-blue-200 ${sizeClasses[size]}`}></div>
        <div className={`absolute top-0 left-0 rounded-full border-4 border-transparent border-t-blue-600 ${sizeClasses[size]} animate-ping`}></div>
      </div>
      <div className="text-center">
        <div className="text-blue-700 font-semibold text-lg animate-pulse">{text}</div>
        {description && <div className="text-blue-600 text-sm opacity-80 animate-pulse">{description}</div>}
      </div>
    </div>
  );
};

const ProcessingMessage = ({ title, description, type = 'info' }) => {
  const colors = {
    info: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700',
    success: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700',
    warning: 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-700',
    error: 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200 text-red-700'
  };
  
  return (
    <div className={`mt-4 p-4 border-2 rounded-xl shadow-lg ${colors[type]} animate-slide-up`}>
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
        <div>
          <div className="font-semibold text-lg">{title}</div>
          <div className="text-sm opacity-90">{description}</div>
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

  // NEW: Handle screen resize and automatically redirect to MobileDashboard when screen gets smaller
  useEffect(() => {
    let resizeTimeout;
    
    const handleResize = () => {
      // Clear previous timeout
      clearTimeout(resizeTimeout);
      
      // Debounce the resize event to prevent too many redirects
      resizeTimeout = setTimeout(() => {
        const currentWidth = window.innerWidth;
        
        // If we're in TeamLeaderDashboard but screen is now mobile size, redirect to MobileDashboard
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
      case 'clocked_in': return 'text-emerald-600';
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="text-center animate-fade-in">
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse shadow-2xl"></div>
          <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-ping opacity-75"></div>
        </div>
        <LoadingSpinner size="lg" text="Loading dashboard..." description="Fetching team data and analytics" />
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-100">
      <div className="text-center animate-fade-in">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-2xl">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="text-red-600 text-2xl font-bold mb-3">Error Loading Dashboard</div>
        <div className="text-red-500 text-lg mb-6 max-w-md">{error}</div>
        <button 
          onClick={fetchDashboardData}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  if (!dashboard) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="text-center animate-fade-in">
        <div className="relative mb-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-pulse shadow-xl"></div>
          <div className="absolute inset-0 w-16 h-16 mx-auto bg-gradient-to-r from-blue-300 to-indigo-400 rounded-full animate-ping opacity-75"></div>
        </div>
        <div className="text-xl text-gray-700 font-semibold mb-2">Loading dashboard data...</div>
        <div className="text-gray-500">Initializing components</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-yellow-200 to-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
        {/* Enhanced Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
            Team Leader Dashboard
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full shadow-lg"></div>
        </div>

        {/* Team Overview Section */}
        <div className="mb-8 animate-slide-up animation-delay-200">
          <TeamOverview
            teamMembersCount={dashboard?.team_members_count || 0}
            teamAttendance={dashboard?.team_attendance || { present: 0, absent: 0, late: 0 }}
            pendingApprovals={pendingApprovalsCount}
            onTeamMembersClick={() => setDrawerOpen(true)}
            onPresentTodayClick={() => setTimeEntriesDrawerOpen(true)}
            onPendingApprovalsClick={() => setApprovalsModalOpen(true)}
            onAbsentTodayClick={() => setAbsentTodayDrawerOpen(true)}
          />
        </div>

        {/* Drawers and Modals */}
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
        
        {/* First Row: My Time In/Out and Time In/Out Manager Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8 animate-slide-up animation-delay-600 relative z-0">
          {/* My Time In/Out Component */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-6 sm:p-8 relative overflow-hidden">
            {/* Decorative background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50"></div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full -translate-y-12 translate-x-12 opacity-60"></div>
            
            <div className="relative z-10">
              <h3 className="text-xl sm:text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-600 flex items-center">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg mr-2 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                My Time In/Out
              </h3>
              
              <div className="space-y-4">
                {/* Status Display */}
                <div className="text-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  <div className={`text-lg sm:text-xl font-bold mb-2 ${getStatusColor(personalStatus)}`}>
                    {getStatusText(personalStatus)}
                  </div>
                  <div className="text-gray-600 text-base font-medium">
                    {employee?.full_name}
                  </div>
                </div>

                {/* Location Status */}
                <div className="text-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  {locationError ? (
                    <div className="text-red-600 text-xs bg-red-50 p-2 rounded-lg border border-red-200 animate-pulse">
                      <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      {locationError}
                    </div>
                  ) : currentLocation ? (
                    <div className="text-green-700 text-xs bg-green-50 p-2 rounded-lg border border-green-200">
                      <svg className="w-4 h-4 mx-auto mb-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      ✓ Location obtained (Accuracy: {currentLocation.accuracy?.toFixed(1)}m)
                    </div>
                  ) : (
                    <div className="text-yellow-600 text-xs bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                      <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Location not obtained
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 transition-colors font-medium hover:scale-105 transform"
                  >
                    Refresh Location
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2">
                  {personalStatus !== 'clocked_in' ? (
                    <button
                      onClick={handlePersonalTimeIn}
                      disabled={isClockingIn}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                        isClockingIn
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/25'
                      }`}
                    >
                      {isClockingIn ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Clocking In...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Clock In</span>
                        </div>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handlePersonalTimeOut}
                      disabled={isClockingOut}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                        isClockingOut
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 shadow-red-500/25'
                      }`}
                    >
                      {isClockingOut ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Clocking Out...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Clock Out</span>
                        </div>
                      )}
                    </button>
                  )}
                  <button
                    onClick={checkCurrentSession}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold shadow-blue-500/25 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Check Status</span>
                  </button>
                </div>

                {/* Loading Messages */}
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

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border-2 border-red-200 animate-shake">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div className="text-red-700 text-sm font-medium">{error}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Time In/Out Manager Component */}
          <div>
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
        </div>

        {/* Second Row: Team Map Component - Full Width */}
        <div className="mb-8 animate-slide-up animation-delay-800 relative z-0">
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
