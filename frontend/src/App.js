import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer, toast } from 'react-toastify';
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
import { shouldShowMobileView, shouldShowFullView, shouldShowNavbar, getFeatureFlags } from './utils/deviceDetection';

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
            <div style={{ position: 'relative', zIndex: 1000 }}>
              <Navbar user={user} employee={employee} onLogout={handleLogout} />
            </div>
          )}
          <Routes>
            <Route 
              path="/" 
              element={
                isAuthenticated ? (
                  (() => {
                    // Check effective view mode (device detection + user preference)
                    const isMobileView = shouldShowMobileView();
                    const isFullView = shouldShowFullView();
                    
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
            <Route 
              path="/employee-dashboard"
              element={
                isAuthenticated ? (
                  <EmployeeDashboard onLogout={handleLogout} user={user} employee={employee} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route 
              path="/team-leader-dashboard"
              element={
                isAuthenticated ? (
                  <TeamLeaderDashboard onLogout={handleLogout} user={user} employee={employee} />
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
      </Router>
    </QueryClientProvider>
  );
}

export default App;
