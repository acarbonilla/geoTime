import React, { useState } from 'react';
import { authAPI } from '../api';

export default function Password_Reset({ onSuccess, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't proceed if already loading
    if (loading) return;
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('Attempting to change password...');
      // Call API to change password
      const result = await authAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      
      console.log('Password change result:', result);
      setSuccess('Password changed successfully! Logging you out...');
      
      // Clear form fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Automatically log out the user after successful password change
      setTimeout(async () => {
        try {
          // Call the onLogout prop if provided, otherwise fall back to authAPI.logout
          if (onLogout) {
            onLogout();
          } else {
            await authAPI.logout();
          }
          // Close the modal after logout
          if (onSuccess) {
            onSuccess();
          }
        } catch (logoutError) {
          console.error('Logout error:', logoutError);
          // Still close the modal even if logout fails
          if (onSuccess) {
            onSuccess();
          }
        }
      }, 1500);
      
    } catch (err) {
      console.error('Password change error:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      
      // Handle specific error cases
      if (err.response?.status === 400) {
        if (err.response.data?.detail) {
          setError(err.response.data.detail);
        } else if (err.response.data?.error) {
          setError(err.response.data.error);
        } else if (err.response.data?.current_password) {
          setError('Current password is incorrect.');
        } else if (err.response.data?.new_password) {
          setError(err.response.data.new_password[0]);
        } else {
          setError('Invalid request. Please check your input.');
        }
      } else if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else if (err.response?.status === 500) {
        if (err.response.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError('Server error. Please try again later.');
        }
      } else if (err.message === 'Network Error') {
        setError('Connection error. Please check your internet connection.');
      } else {
        setError('Password change failed. Please try again later.');
      }
      
      // Clear password fields on error for security
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Main password reset form */}
      <div className="w-full">
        <div className="w-full">

          {/* Close button for modal - only show when not in modal context */}
          {!onSuccess && (
            <div className="flex justify-end mb-4">
              <button
                onClick={onSuccess}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="mb-6 p-3 bg-green-50/90 backdrop-blur-sm border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-700 text-sm">{success}</span>
              </div>
            </div>
          )}

                     {/* Password change form */}
           <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
            {/* Current Password field */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Current Password
              </label>
              <div className="relative">
                                 <input
                   type={showCurrentPassword ? "text" : "password"}
                   className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white/80 backdrop-blur-sm text-base"
                   placeholder="Enter your current password"
                   value={currentPassword}
                   onChange={(e) => setCurrentPassword(e.target.value)}
                   required
                   autoComplete="current-password"
                 />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* New Password field */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                New Password
              </label>
              <div className="relative">
                                 <input
                   type={showNewPassword ? "text" : "password"}
                   className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white/80 backdrop-blur-sm text-base"
                   placeholder="Enter your new password"
                   value={newPassword}
                   onChange={(e) => setNewPassword(e.target.value)}
                   required
                   autoComplete="new-password"
                 />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
            </div>

            {/* Confirm Password field */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                                 <input
                   type={showConfirmPassword ? "text" : "password"}
                   className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white/80 backdrop-blur-sm text-base"
                   placeholder="Confirm your new password"
                   value={confirmPassword}
                   onChange={(e) => setConfirmPassword(e.target.value)}
                   required
                   autoComplete="new-password"
                 />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

                         {/* Submit button */}
             <button
               type="submit"
               disabled={loading}
               className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6 transform hover:scale-105 min-h-[44px]"
             >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Changing Password...
                </div>
              ) : (
                'Change Password'
              )}
            </button>
          </form>


        </div>
      </div>


    </div>
  );
}
