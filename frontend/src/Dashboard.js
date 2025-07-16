import React from 'react';
import { authAPI, dashboardAPI } from './api';
import EmployeeDashboard from './dashboards/EmployeeDashboard';

export default function Dashboard({ onLogout, user, employee }) {
  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always call the onLogout callback to clear state
      if (typeof onLogout === 'function') {
        onLogout();
      }
    }
  };

  // Render role-specific dashboard
  if (employee?.role === 'employee') {
    return <EmployeeDashboard user={user} employee={employee} onLogout={handleLogout} />;
  }

  // For other roles, show a placeholder (we'll implement these next)
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
                <h1 className="text-xl font-semibold text-gray-900">
                  {employee?.role_display || 'Dashboard'}
                </h1>
                <p className="text-sm text-gray-500">
                  Welcome, {user?.first_name || user?.username}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="text-blue-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {employee?.role_display || 'Role'} Dashboard
          </h2>
          <p className="text-gray-600 mb-6">
            Dashboard for {employee?.role_display || 'your role'} is coming soon!
          </p>
          <p className="text-sm text-gray-500">
            This specialized dashboard will provide features tailored to your role and permissions.
          </p>
        </div>
      </main>
    </div>
  );
} 