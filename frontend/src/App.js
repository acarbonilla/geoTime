import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './Login';
import 'leaflet/dist/leaflet.css';
import Reports from './Employee_Report/Reports';
import Navbar from './Navbar';
import { dashboardAPI } from './api';
import EmployeeDashboard from './dashboards/EmployeeDashboard/EmployeeDashboard';
import TeamLeaderDashboard from './dashboards/TeamLeaderDashboard/TeamLeaderDashboard';
import MobileDashboard from './dashboards/MobileDashboard/MobileDashboard';
import TeamLeaderReports from './TeamLeader_Report/TeamLeaderReports';
import EmployeeRequestPage from './EmployeeRequest/EmployeeRequestPage';
import ApprovalPage from './TeamLeaderApproval/ApprovalPage';
import { ScheduleManagement, ScheduleReport } from './Employee_Schedule';
import { TeamLeaderScheduleManagement, TeamLeaderScheduleReport } from './TeamLeader_Report';
import { shouldShowMobileView, shouldShowNavbar } from './utils/deviceDetection';
import ErrorBoundary from './components/ErrorBoundary';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      console.warn('Unhandled promise rejection:', event.reason);
      
      // Handle geolocation errors specifically
      if (event.reason && event.reason.message && 
          (event.reason.message.includes('geolocation') || 
           event.reason.message.includes('location') ||
           event.reason.message.includes('permission'))) {
        console.warn('Geolocation error caught by global handler:', event.reason.message);
        // Prevent the error from being thrown as a runtime error
        event.preventDefault();
      }
    };

    // Global error handler for runtime errors
    const handleError = (event) => {
      console.warn('Runtime error caught by global handler:', event.error);
      
      // Handle geolocation errors specifically
      if (event.error && event.error.message && 
          (event.error.message.includes('geolocation') || 
           event.error.message.includes('location') ||
           event.error.message.includes('permission'))) {
        console.warn('Geolocation runtime error caught by global handler:', event.error.message);
        // Prevent the error from being displayed as a runtime error
        event.preventDefault();
      }
    };

    // Add global error handlers
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup function
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    const employeeData = localStorage.getItem('employee');
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
      if (employeeData) {
        setEmployee(JSON.parse(employeeData));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated && !employee) {
      // Only fetch dashboard data if we don't have employee data from login
      dashboardAPI.getDashboard().then(response => {
        setEmployee(response.employee);
      }).catch(() => setEmployee(null));
    }
  }, [isAuthenticated, employee]);

  const handleLogin = (response) => {
    setIsAuthenticated(true);
    setUser(response.user);
    setEmployee(response.employee);
  };

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('employee');
    setIsAuthenticated(false);
    setUser(null);
    setEmployee(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="App w-full min-h-screen">
            {/* Toast Container for notifications */}
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
            {/* Navbar for authenticated users - only show in full view */}
            {isAuthenticated && shouldShowNavbar() && (
              <Navbar user={user} employee={employee} onLogout={handleLogout} />
            )}
            
            {/* Main content area */}
            <div className="main-content">
              <Routes>
                <Route 
                  path="/" 
                  element={
                    isAuthenticated ? (
                      (() => {
                        // Enhanced view logic with automatic redirection
                        const isMobileView = shouldShowMobileView();
                        
                        if (isMobileView) {
                          // Show mobile dashboard for all users in mobile view
                          return <MobileDashboard user={user} employee={employee} onLogout={handleLogout} />;
                        } else {
                          // Show appropriate full dashboard based on role
                          if (employee?.role === 'team_leader') {
                            return <Navigate to="/team-leader-dashboard" replace />;
                          } else {
                            return <Navigate to="/employee-dashboard" replace />;
                          }
                        }
                      })()
                    ) : (
                      <Login onLogin={handleLogin} />
                    )
                  } 
                />
                {/* Mobile view route - accessible from any device */}
                <Route 
                  path="/mobile-view"
                  element={
                    isAuthenticated ? (
                      <MobileDashboard user={user} employee={employee} onLogout={handleLogout} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route 
                  path="/reports"
                  element={
                    isAuthenticated ? (
                      <Reports user={user} onLogout={handleLogout} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  } 
                />
                {/* Full dashboard routes with automatic mobile detection */}
                <Route 
                  path="/employee-dashboard"
                  element={
                    isAuthenticated ? (
                      (() => {
                        // Check if screen size is mobile - if so, redirect to mobile view
                        if (shouldShowMobileView()) {
                          return <Navigate to="/mobile-view" replace />;
                        }
                        return <EmployeeDashboard onLogout={handleLogout} user={user} employee={employee} />;
                      })()
                    ) : (
                      <Navigate to="/" replace />
                    )
                  } 
                />
                <Route 
                  path="/team-leader-dashboard"
                  element={
                    isAuthenticated ? (
                      (() => {
                        // Check if screen size is mobile - if so, redirect to mobile view
                        if (shouldShowMobileView()) {
                          return <Navigate to="/mobile-view" replace />;
                        }
                        return <TeamLeaderDashboard onLogout={handleLogout} user={user} employee={employee} />;
                      })()
                    ) : (
                      <Navigate to="/" replace />
                    )
                  } 
                />
                <Route
                  path="/team-leader-reports"
                  element={
                    isAuthenticated && employee?.role === 'team_leader' ? (
                      <TeamLeaderReports user={user} employee={employee} onLogout={handleLogout} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route 
                  path="/employee/request"
                  element={
                    isAuthenticated && employee?.role === 'employee' ? (
                      <EmployeeRequestPage user={user} employee={employee} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route
                  path="/approval"
                  element={
                    isAuthenticated && employee?.role === 'team_leader' ? (
                      <ApprovalPage user={user} employee={employee} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route
                  path="/schedule"
                  element={
                    isAuthenticated ? (
                      employee?.role === 'team_leader' ? (
                        <TeamLeaderScheduleManagement />
                      ) : (
                        <ScheduleManagement />
                      )
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route
                  path="/schedule-report"
                  element={
                    isAuthenticated ? (
                      employee?.role === 'team_leader' ? (
                        <TeamLeaderScheduleReport />
                      ) : (
                        <ScheduleReport />
                      )
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
