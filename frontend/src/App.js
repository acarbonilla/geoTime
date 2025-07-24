import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import 'leaflet/dist/leaflet.css';
import Reports from './Employee_Report/Reports';
import Navbar from './Navbar';
import { dashboardAPI } from './api';
import EmployeeDashboard from './dashboards/EmployeeDashboard/EmployeeDashboard';
import TeamLeaderDashboard from './dashboards/TeamLeaderDashboard/TeamLeaderDashboard';
import TeamLeaderReports from './TeamLeader_Report/TeamLeaderReports';
import EmployeeRequestPage from './EmployeeRequest/EmployeeRequestPage';
import ApprovalPage from './TeamLeaderApproval/ApprovalPage';


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
    <Router>
      <div className="App">
        {/* Navbar for authenticated users */}
        {isAuthenticated && <Navbar user={user} employee={employee} onLogout={handleLogout} />}
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                (() => {
                  if (employee?.role === 'team_leader') {
                    return <Navigate to="/team-leader-dashboard" replace />;
                  } else {
                    return <Navigate to="/employee-dashboard" replace />;
                  }
                })()
              ) : (
                <Login onLogin={handleLogin} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
