import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import 'leaflet/dist/leaflet.css';
import Reports from './Reports';
import Navbar from './Navbar';
import { dashboardAPI } from './api';
import EmployeeDashboard from './dashboards/EmployeeDashboard';


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      dashboardAPI.getDashboard().then(response => {
        setEmployee(response.employee);
      }).catch(() => setEmployee(null));
    }
  }, [isAuthenticated]);

  const handleLogin = (response) => {
    setIsAuthenticated(true);
    // Save user info if available
    if (response && response.user) {
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
  };

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
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
                <Navigate to="/employee-dashboard" replace />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
