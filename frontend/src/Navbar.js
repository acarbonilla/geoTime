import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ViewToggle from './components/ViewToggle';
import { shouldShowViewToggle } from './utils/deviceDetection';

const DashboardIcon = () => (
  <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z"/></svg>
);
const ReportsIcon = () => (
  <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
const RequestIcon = () => (
  <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ScheduleIcon = () => (
  <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
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

const Navbar = ({ user, employee, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const userMenuRef = useRef(null);
  const scheduleDropdownRef = useRef(null);
  const scheduleDropdownContentRef = useRef(null); // New ref for dropdown content
  const mobileMenuRef = useRef(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const shouldShowToggle = shouldShowViewToggle();
  const navigate = useNavigate();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => setCoords({ latitude: null, longitude: null })
      );
    }
  }, []);

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

  // Click-away logic for mobile menu
  useEffect(() => {
    if (!showMobileMenu) return;
    function handleClickOutside(event) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileMenu]);

  // Click-away logic for schedule dropdown
  useEffect(() => {
    if (!showScheduleDropdown) return;
    function handleClickOutside(event) {
      // Check if click is outside both the trigger button container and the dropdown content
      const isOutsideTrigger = scheduleDropdownRef.current && !scheduleDropdownRef.current.contains(event.target);
      const isOutsideDropdown = scheduleDropdownContentRef.current && !scheduleDropdownContentRef.current.contains(event.target);

      if (isOutsideTrigger && isOutsideDropdown) {
        console.log('Click outside detected, closing dropdown');
        setShowScheduleDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showScheduleDropdown]);

  const getDashboardPath = () => {
    if (employee?.role === 'team_leader') return '/team-leader-dashboard';
    // Add more roles as needed
    return '/employee-dashboard';
  };

  const handleNavLinkClick = (e, path) => {
    navigate(path);
  };

  const handleScheduleItemClick = (path) => {
    navigate(path);
    setShowScheduleDropdown(false);
    setShowMobileMenu(false); // Close mobile menu when navigating
  };

  return (
    <nav className="navbar-fixed bg-gradient-to-r from-blue-900 via-blue-800 to-purple-900 shadow-2xl border-b transition-all duration-500" style={{ zIndex: 1000 }}>
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center py-3 min-w-0 h-16">
          {/* Left: Logo/App Name and Role */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center gap-2">
              {/* Logo Icon */}
              <svg className="w-8 h-8 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" fill="#2563eb" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 6v6l4 2" stroke="#fff" />
              </svg>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent tracking-tight drop-shadow">GeoTime</span>
            </span>
          </div>
          
          {/* Hamburger for mobile */}
          <div className="flex lg:hidden flex-shrink-0">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="inline-flex items-center justify-center p-3 rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300 touch-manipulation"
              aria-label="Toggle navigation"
            >
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
          
          {/* Center: NavLinks */}
          <div className="flex-1 flex justify-center min-w-0 px-4">
            {/* Desktop NavLinks */}
            <nav className="hidden lg:flex items-center gap-4 xl:gap-6" style={{ position: 'relative', zIndex: 1001 }}>
              <NavLink to={getDashboardPath()} className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg transition font-semibold text-white transform-gpu duration-200 ease-in-out text-sm lg:text-base cursor-pointer
                  ${isActive ? 'bg-white/20 shadow-lg text-white scale-105 backdrop-blur-sm' : 'hover:bg-white/20 hover:shadow-xl hover:scale-105 hover:backdrop-blur-sm'}`
              } style={{ pointerEvents: 'auto' }} onClick={(e) => handleNavLinkClick(e, getDashboardPath())}>
                <DashboardIcon /> Dashboard
              </NavLink>
              
                             {employee?.role === 'employee' && (
                 <NavLink to="/employee/request" className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-lg transition font-semibold text-white transform-gpu duration-200 ease-in-out text-sm lg:text-base cursor-pointer
                     ${isActive ? 'bg-white/20 shadow-lg text-white scale-105 backdrop-blur-sm' : 'hover:bg-white/20 hover:shadow-xl hover:scale-105 hover:backdrop-blur-sm'}`
                 } style={{ pointerEvents: 'auto' }} onClick={(e) => handleNavLinkClick(e, '/employee/request')}>
                   <RequestIcon /> Request
                 </NavLink>
               )}
              
              {employee?.role === 'team_leader' ? (
                <NavLink to="/team-leader-reports" className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-lg transition font-semibold text-white transform-gpu duration-200 ease-in-out text-sm lg:text-base cursor-pointer
                    ${isActive ? 'bg-white/20 shadow-lg text-white scale-105 backdrop-blur-sm' : 'hover:bg-white/20 hover:shadow-xl hover:scale-105 hover:backdrop-blur-sm'}`
                } style={{ pointerEvents: 'auto' }} onClick={(e) => handleNavLinkClick(e, '/team-leader-reports')}>
                  <ReportsIcon /> Team Reports
                </NavLink>
              ) : (
                <NavLink to="/reports" className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-lg transition font-semibold text-white transform-gpu duration-200 ease-in-out text-sm lg:text-base cursor-pointer
                    ${isActive ? 'bg-white/20 shadow-lg text-white scale-105 backdrop-blur-sm' : 'hover:bg-white/20 hover:shadow-xl hover:scale-105 hover:backdrop-blur-sm'}`
                } style={{ pointerEvents: 'auto' }} onClick={(e) => handleNavLinkClick(e, '/reports')}>
                  <ReportsIcon /> Reports
                </NavLink>
              )}
              
              {employee?.role === 'team_leader' && (
                <NavLink to="/approval" className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-lg transition font-semibold text-white transform-gpu duration-200 ease-in-out text-sm lg:text-base cursor-pointer
                    ${isActive ? 'bg-white/20 shadow-lg text-white scale-105 backdrop-blur-sm' : 'hover:bg-white/20 hover:shadow-xl hover:scale-105 hover:backdrop-blur-sm'}`
                } style={{ pointerEvents: 'auto' }} onClick={(e) => handleNavLinkClick(e, '/approval')}>
                  <ProfileIcon /> For Approval
                </NavLink>
              )}
              
              {/* Enhanced Schedule Dropdown */}
              <div ref={scheduleDropdownRef} className="relative" style={{ position: 'relative', zIndex: 1002 }}>
                <button
                  className={`flex items-center px-3 py-2 rounded-lg transition font-semibold text-white transform-gpu duration-200 ease-in-out text-sm lg:text-base cursor-pointer group ${showScheduleDropdown ? 'bg-white/20 shadow-lg text-white scale-105 backdrop-blur-sm' : 'hover:bg-white/20 hover:shadow-xl hover:scale-105 hover:backdrop-blur-sm'}`}
                  onClick={() => {
                    console.log('Desktop Schedule button clicked, current state:', showScheduleDropdown);
                    setShowScheduleDropdown(!showScheduleDropdown);
                  }}
                  aria-expanded={showScheduleDropdown}
                  aria-haspopup="true"
                >
                  <ScheduleIcon /> 
                  <span>Schedule</span>
                  <svg 
                    className={`w-4 h-4 ml-2 transition-transform duration-200 ${showScheduleDropdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>

                </button>
                

              </div>
              
              {/* Schedule Dropdown - Positioned outside the nav container */}
                          {showScheduleDropdown && (
              <div
                ref={scheduleDropdownContentRef}
                className="schedule-dropdown-content fixed bg-white rounded-xl shadow-2xl py-3 border border-gray-200/50 backdrop-blur-sm"
                style={{
                  position: 'fixed',
                  top: '80px', // Position below navbar
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '224px', // w-56 = 14rem = 224px
                  zIndex: 99999,
                  pointerEvents: 'auto',
                  backgroundColor: 'white'
                }}
              >

                  
                  <div className="px-3 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Schedule Management</h3>
                    <p className="text-xs text-gray-500">Manage your schedules and reports</p>
                  </div>
                  
                  <button 
                    className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 cursor-pointer"
                    onClick={() => {
                      console.log('Desktop Schedule Management clicked');
                      handleScheduleItemClick('/schedule');
                    }}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover/item:bg-blue-200 transition-colors duration-200">
                      <ScheduleIcon />
                    </div>
                    <div>
                      <div className="font-medium">Schedule Management</div>
                      <div className="text-xs text-gray-500">Create and manage schedules</div>
                    </div>
                  </button>
                  
                  <button 
                    className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 cursor-pointer"
                    onClick={() => {
                      console.log('Desktop Schedule Report clicked');
                      handleScheduleItemClick('/schedule-report');
                    }}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3 group-hover/item:bg-purple-200 transition-colors duration-200">
                      <ReportsIcon />
                    </div>
                    <div>
                      <div className="font-medium">Schedule Report</div>
                      <div className="text-xs text-gray-500">View schedule reports</div>
                    </div>
                  </button>
                </div>
              )}
            </nav>
          </div>
          
          {/* Mobile NavLinks - Enhanced */}
          <div ref={mobileMenuRef} className={`absolute top-16 left-0 w-full z-[1000] lg:hidden transition-all duration-300 ${showMobileMenu ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`} style={{background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 50%, #a78bfa 100%)', zIndex: 1000, overflow: 'visible'}}>
            <nav className="flex flex-col py-4 px-4 space-y-2">
              <NavLink 
                to={getDashboardPath()} 
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition font-medium text-sm ${isActive ? 'bg-white/20 text-white font-semibold' : 'text-white hover:bg-white/10'}`
                } 
                onClick={(e) => handleNavLinkClick(e, getDashboardPath())}
              >
                <DashboardIcon /> 
                <span className="ml-3">Dashboard</span>
              </NavLink>
              
                             {employee?.role === 'employee' && (
                <NavLink 
                  to="/employee/request" 
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-lg transition font-medium text-sm ${isActive ? 'bg-white/20 text-white font-semibold' : 'text-white hover:bg-white/10'}`
                  } 
                  onClick={(e) => handleNavLinkClick(e, '/employee/request')}
                >
                  <RequestIcon /> 
                  <span className="ml-3">Request</span>
                 </NavLink>
               )}
              
              {employee?.role === 'team_leader' ? (
                <NavLink 
                  to="/team-leader-reports" 
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-lg transition font-medium text-sm ${isActive ? 'bg-white/20 text-white font-semibold' : 'text-white hover:bg-white/10'}`
                  } 
                  onClick={(e) => handleNavLinkClick(e, '/team-leader-reports')}
                >
                  <ReportsIcon /> 
                  <span className="ml-3">Team Reports</span>
                </NavLink>
              ) : (
                <NavLink 
                  to="/reports" 
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-lg transition font-medium text-sm ${isActive ? 'bg-white/20 text-white font-semibold' : 'text-white hover:bg-white/10'}`
                  } 
                  onClick={(e) => handleNavLinkClick(e, '/reports')}
                >
                  <ReportsIcon /> 
                  <span className="ml-3">Reports</span>
                </NavLink>
              )}
              
              {employee?.role === 'team_leader' && (
                <NavLink 
                  to="/approval" 
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-lg transition font-medium text-sm ${isActive ? 'bg-white/20 text-white font-semibold' : 'text-white hover:bg-white/10'}`
                  } 
                  onClick={(e) => handleNavLinkClick(e, '/approval')}
                >
                  <ProfileIcon /> 
                  <span className="ml-3">For Approval</span>
                </NavLink>
              )}
              
              {/* Enhanced Mobile Schedule Dropdown */}
              <div ref={scheduleDropdownRef} className="relative">
                <button
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition font-medium text-sm cursor-pointer ${showScheduleDropdown ? 'bg-white/20 text-white font-semibold' : 'text-white hover:bg-white/10'}`}
                  onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
                  aria-expanded={showScheduleDropdown}
                  aria-haspopup="true"
                >
                  <div className="flex items-center">
                    <ScheduleIcon /> 
                    <span className="ml-3">Schedule</span>
                  </div>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${showScheduleDropdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showScheduleDropdown && (
                  <div className="schedule-dropdown mt-2 ml-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg py-2 animate-fade-in-down border border-white/20">
                    <NavLink 
                      to="/schedule" 
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
                      onClick={() => handleScheduleItemClick('/schedule')}
                    >
                      <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center mr-3">
                        <ScheduleIcon />
                      </div>
                      <span>Schedule Management</span>
                    </NavLink>
                    
                    <NavLink 
                      to="/schedule-report" 
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
                      onClick={() => handleScheduleItemClick('/schedule-report')}
                    >
                      <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center mr-3">
                        <ReportsIcon />
                      </div>
                      <span>Schedule Report</span>
                    </NavLink>
                  </div>
                )}
              </div>
            </nav>
          </div>
          
          {/* Right: Coordinates and User Info */}
          <div className="flex items-center space-x-2 lg:space-x-4 relative user-profile-section flex-shrink-0">
            {/* Coordinates - Hide on smaller screens to prevent overflow */}
            <div className="hidden md:block text-sm text-white/90 min-w-0 max-w-[140px] text-right truncate">
              {coords.latitude && coords.longitude ? (
                <span title={`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`}>
                  📍 {coords.latitude.toFixed(3)}, {coords.longitude.toFixed(3)}
                </span>
              ) : (
                <span>📍 Location unavailable</span>
              )}
            </div>
            
            {/* Profile Section - Enhanced positioning and visibility */}
            <div className="relative profile-container" ref={userMenuRef} style={{ zIndex: 1001 }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-1 lg:space-x-2 text-white hover:bg-white/10 rounded-lg px-2 lg:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300 min-w-0 cursor-pointer touch-manipulation profile-button"
                style={{ pointerEvents: 'auto' }}
                aria-label="User menu"
                aria-expanded={showUserMenu}
                aria-haspopup="true"
                title={`${user?.first_name} ${user?.last_name} - Click to open menu`}
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-lg">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <span className="hidden lg:inline text-sm truncate max-w-[120px] lg:max-w-[140px] xl:max-w-[160px]" title={`${user?.first_name} ${user?.last_name}`}>
                  {user?.first_name} {user?.last_name}
                </span>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* User Menu Dropdown - Enhanced positioning */}
              {showUserMenu && (
                <div 
                  className="user-menu-dropdown bg-white rounded-xl shadow-2xl py-4 animate-fade-in-down max-w-[calc(100vw-2rem)] border border-gray-200/50 backdrop-blur-sm" 
                  style={{ 
                    pointerEvents: 'auto',
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    zIndex: 9999,
                    maxWidth: '280px',
                    minWidth: '200px',
                    marginTop: '8px'
                  }}
                >
                  <div className="flex flex-col items-center mb-4 px-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold mb-2 shadow-lg">
                      {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </div>
                    <span className="font-semibold text-gray-900 mb-1 text-center text-sm sm:text-base truncate w-full">{user?.first_name} {user?.last_name}</span>
                    <span className="text-xs text-gray-600 text-center px-3 py-1 bg-gray-100 rounded-full">
                      {employee?.role_display || (employee?.role === 'employee' ? 'Employee' : employee?.role) || 'Not set'}
                    </span>
                  </div>
                  
                  {shouldShowToggle && (
                    <div className="px-4 py-3 border-b border-gray-100">
                      <ViewToggle 
                        className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs sm:text-sm rounded-lg"
                        onViewChange={(newMode) => {
                          console.log('Switching to:', newMode);
                          setShowUserMenu(false);
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="px-2">
                  <button
                      className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled
                  >
                      ⚙️ Settings
                  </button>
                  <button
                    onClick={onLogout}
                      className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200 cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                  >
                      🚪 Logout
                  </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 