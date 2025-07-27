import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';

const DashboardIcon = () => (
  <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z"/></svg>
);
const ReportsIcon = () => (
  <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h3m4 4v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2h3a4 4 0 014 4v2" /></svg>
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
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const userMenuRef = useRef(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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

  const getDashboardPath = () => {
    if (employee?.role === 'team_leader') return '/team-leader-dashboard';
    // Add more roles as needed
    return '/employee-dashboard';
  };

  return (
    <nav className="navbar-fixed bg-gradient-to-r from-blue-900 via-blue-800 to-purple-900 shadow-2xl border-b transition-all duration-500">
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center py-3 min-w-0">
          {/* Left: Logo/App Name and Role */}
          <div className="flex items-center gap-2">
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
          <div className="flex lg:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-white/10 focus:outline-none transition-all duration-300"
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
          <div className="flex-1 flex justify-center min-w-0">
            {/* Desktop NavLinks */}
            <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
              <NavLink to={getDashboardPath()} className={({ isActive }) =>
                `flex items-center px-2 lg:px-3 py-1 rounded transition font-semibold text-white transform-gpu duration-200 ease-in-out text-sm lg:text-base cursor-pointer
                  ${isActive ? 'bg-white/20 shadow-lg text-white scale-105 backdrop-blur-sm' : 'hover:bg-white/20 hover:shadow-xl hover:scale-105 hover:backdrop-blur-sm'}`
              } style={{ pointerEvents: 'auto' }}>
                <DashboardIcon /> Dashboard
              </NavLink>
              {employee?.role === 'employee' && (
                <NavLink to="/employee/request" className={({ isActive }) =>
                  `flex items-center px-2 lg:px-3 py-1 rounded transition font-semibold text-white transform-gpu duration-200 ease-in-out text-sm lg:text-base cursor-pointer
                    ${isActive ? 'bg-white/20 shadow-lg text-white scale-105 backdrop-blur-sm' : 'hover:bg-white/20 hover:shadow-xl hover:scale-105 hover:backdrop-blur-sm'}`
                } style={{ pointerEvents: 'auto' }}>
                  <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h3m4 4v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2h3a4 4 0 014 4v2" /></svg>
                  Request
                </NavLink>
              )}
              {employee?.role === 'team_leader' ? (
                <NavLink to="/team-leader-reports" className={({ isActive }) =>
                  `flex items-center px-2 lg:px-3 py-1 rounded transition font-semibold text-white transform-gpu duration-200 ease-in-out text-sm lg:text-base cursor-pointer
                    ${isActive ? 'bg-white/20 shadow-lg text-white scale-105 backdrop-blur-sm' : 'hover:bg-white/20 hover:shadow-xl hover:scale-105 hover:backdrop-blur-sm'}`
                } style={{ pointerEvents: 'auto' }}>
                  <ReportsIcon /> Team Reports
                </NavLink>
              ) : (
                <NavLink to="/reports" className={({ isActive }) =>
                  `flex items-center px-2 lg:px-3 py-1 rounded transition font-semibold text-white transform-gpu duration-200 ease-in-out text-sm lg:text-base cursor-pointer
                    ${isActive ? 'bg-white/20 shadow-lg text-white scale-105 backdrop-blur-sm' : 'hover:bg-white/20 hover:shadow-xl hover:scale-105 hover:backdrop-blur-sm'}`
                } style={{ pointerEvents: 'auto' }}>
                  <ReportsIcon /> Reports
                </NavLink>
              )}
              {employee?.role === 'team_leader' && (
                <NavLink to="/approval" className={({ isActive }) =>
                  `flex items-center px-2 lg:px-3 py-1 rounded transition font-semibold text-white transform-gpu duration-200 ease-in-out text-sm lg:text-base cursor-pointer
                    ${isActive ? 'bg-white/20 shadow-lg text-white scale-105 backdrop-blur-sm' : 'hover:bg-white/20 hover:shadow-xl hover:scale-105 hover:backdrop-blur-sm'}`
                } style={{ pointerEvents: 'auto' }}>
                  <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  For Approval
                </NavLink>
              )}
            </nav>
          </div>
          {/* Mobile NavLinks */}
          <div className={`absolute top-16 left-0 w-full z-[1001] lg:hidden transition-all duration-500 ${showMobileMenu ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`} style={{background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 50%, #a78bfa 100%)', zIndex: 1001}}>
            <nav className="flex flex-col items-center gap-2 py-4">
              <NavLink to={getDashboardPath()} className={({ isActive }) =>
                `flex items-center px-4 py-2 rounded transition font-medium w-full justify-center ${isActive ? 'bg-white/20 text-white font-bold' : 'text-white hover:bg-white/10'}`
              } onClick={() => setShowMobileMenu(false)}>
                <DashboardIcon /> Dashboard
              </NavLink>
              {employee?.role === 'employee' && (
                <NavLink to="/employee/request" className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded transition font-medium w-full justify-center ${isActive ? 'bg-white/20 text-white font-bold' : 'text-white hover:bg-white/10'}`
                } onClick={() => setShowMobileMenu(false)}>
                  <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h3m4 4v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2h3a4 4 0 014 4v2" /></svg>
                  Request
                </NavLink>
              )}
              {employee?.role === 'team_leader' ? (
                <NavLink to="/team-leader-reports" className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded transition font-medium w-full justify-center ${isActive ? 'bg-white/20 text-white font-bold' : 'text-white hover:bg-white/10'}`
                } onClick={() => setShowMobileMenu(false)}>
                  <ReportsIcon /> Team Reports
                </NavLink>
              ) : (
                <NavLink to="/reports" className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded transition font-medium w-full justify-center ${isActive ? 'bg-white/20 text-white font-bold' : 'text-white hover:bg-white/10'}`
                } onClick={() => setShowMobileMenu(false)}>
                  <ReportsIcon /> Reports
                </NavLink>
              )}
              {employee?.role === 'team_leader' && (
                <NavLink to="/approval" className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded transition font-medium w-full justify-center ${isActive ? 'bg-white/20 text-white font-bold' : 'text-white hover:bg-white/10'}`
                } onClick={() => setShowMobileMenu(false)}>
                  <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  For Approval
                </NavLink>
              )}
            </nav>
          </div>
          {/* Right: Coordinates and User Info */}
          <div className="flex items-center space-x-2 lg:space-x-4 relative">
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
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-1 lg:space-x-2 text-white hover:bg-white/10 rounded px-1 lg:px-2 py-1 focus:outline-none transition-all duration-300 min-w-0 cursor-pointer"
              style={{ pointerEvents: 'auto', zIndex: 1001 }}
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <span className="hidden lg:inline text-sm truncate max-w-[120px]" title={`${user?.first_name} ${user?.last_name}`}>
                {user?.first_name} {user?.last_name}
              </span>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showUserMenu && (
              <div ref={userMenuRef} className="absolute right-0 mt-12 w-56 bg-white rounded-md shadow-lg py-3 z-[1001] animate-fade-in-down" style={{ zIndex: 1001, pointerEvents: 'auto' }}>
                <div className="flex flex-col items-center mb-2 mt-16">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold mb-1">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </div>
                  <span className="font-medium text-gray-900 mb-1">{user?.first_name} {user?.last_name}</span>
                  {/* Role as simple text */}
                  <span className="text-xs text-gray-600 mb-1">
                    Role: {employee?.role_display || (employee?.role === 'employee' ? 'Employee' : employee?.role) || 'Not set'}
                  </span>
                </div>
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled
                >
                  Settings
                </button>
                <button
                  onClick={onLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 