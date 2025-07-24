import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';

const TimeInOutManager = ({ teamMembers, onTimeEntryCreated }) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [action, setAction] = useState('time-in');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [geofenceValidation, setGeofenceValidation] = useState(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCurrentLocation({ latitude, longitude, accuracy });
        validateGeofence(latitude, longitude, accuracy);
      },
      (error) => {
        setLocationError(`Error getting location: ${error.message}`);
        setCurrentLocation(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const validateGeofence = async (latitude, longitude, accuracy) => {
    if (!selectedEmployee) return;

    try {
      const response = await axiosInstance.post('geofence/validate/', {
        employee_id: selectedEmployee,
        latitude,
        longitude,
        accuracy
      });
      setGeofenceValidation(response.data);
    } catch (error) {
      console.error('Geofence validation error:', error);
      setGeofenceValidation({ valid: false, message: 'Failed to validate geofence' });
    }
  };

  const handleEmployeeChange = (employeeId) => {
    setSelectedEmployee(employeeId);
    if (currentLocation) {
      validateGeofence(currentLocation.latitude, currentLocation.longitude, currentLocation.accuracy);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      setError('Please select an employee');
      return;
    }

    if (!currentLocation) {
      setError('Location is required. Please allow location access.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axiosInstance.post(`${action}/`, {
        employee_id: selectedEmployee,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        notes: notes.trim() || undefined
      });

      setSuccess(`${action.replace('-', ' ')} successful for ${getEmployeeName(selectedEmployee)}`);
      setNotes('');
      if (onTimeEntryCreated) {
        onTimeEntryCreated(response.data);
      }
    } catch (error) {
      setError(error.response?.data?.error || error.response?.data?.details || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = teamMembers.find(emp => emp.id === parseInt(employeeId));
    return employee ? employee.full_name : 'Unknown Employee';
  };



  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-6 text-gray-700">Time In/Out Manager</h2>
      
      <div>
        {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose an employee...</option>
                {teamMembers.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.employee_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="time-in"
                    checked={action === 'time-in'}
                    onChange={(e) => setAction(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-green-600 font-medium">Time In</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="time-out"
                    checked={action === 'time-out'}
                    onChange={(e) => setAction(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-red-600 font-medium">Time Out</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Add any notes about this time entry..."
              />
            </div>

            {/* Location Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Status
              </label>
              {locationError ? (
                <div className="text-red-600 text-sm mb-2">{locationError}</div>
              ) : currentLocation ? (
                <div className="text-green-600 text-sm mb-2">
                  ✓ Location obtained (Accuracy: {currentLocation.accuracy?.toFixed(1)}m)
                </div>
              ) : (
                <div className="text-yellow-600 text-sm mb-2">Getting location...</div>
              )}
              <button
                type="button"
                onClick={getCurrentLocation}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Refresh Location
              </button>
            </div>

            {/* Geofence Validation */}
            {selectedEmployee && geofenceValidation && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Geofence Validation
                </label>
                <div className={`text-sm p-2 rounded ${geofenceValidation.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {geofenceValidation.message}
                  {geofenceValidation.distance && (
                    <div className="mt-1">
                      Distance: {geofenceValidation.distance}m (Allowed: {geofenceValidation.allowed_radius}m)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="text-green-600 text-sm p-2 bg-green-50 rounded">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !selectedEmployee || !currentLocation || (geofenceValidation && !geofenceValidation.valid)}
              className={`w-full py-2 px-4 rounded-md font-medium ${
                loading || !selectedEmployee || !currentLocation || (geofenceValidation && !geofenceValidation.valid)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : action === 'time-in'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {loading ? 'Processing...' : `${action === 'time-in' ? 'Clock In' : 'Clock Out'}`}
            </button>
          </form>
      </div>
    </div>
  );
};

export default TimeInOutManager; 