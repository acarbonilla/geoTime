import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';

const RequestTimeCorrectionForm = ({ employee, pattern = null }) => {
  const [date, setDate] = useState('');
  const [requestedTimeIn, setRequestedTimeIn] = useState('');
  const [requestedTimeOut, setRequestedTimeOut] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  
  // Bulk correction states
  const [isBulkCorrection, setIsBulkCorrection] = useState(false);
  const [bulkDates, setBulkDates] = useState([]);
  const [bulkSchedule, setBulkSchedule] = useState({ start: '', end: '' });

  // Check if this is a bulk correction from pattern detection
  useEffect(() => {
    console.log('🔍 Pattern data received:', pattern);
    if (pattern && pattern.pattern_type === 'consecutive_nightshift') {
      console.log('🌙 Setting up bulk correction mode for pattern:', pattern);
      setIsBulkCorrection(true);
      setBulkDates(pattern.records.map(record => record.date));
      setBulkSchedule({
        start: pattern.scheduled_start_time || '',
        end: pattern.scheduled_end_time || ''
      });
      
      // Pre-populate reason for bulk correction
      setReason(`Bulk correction for ${pattern.total_days || pattern.length} consecutive nightshifts from ${pattern.start_date} to ${pattern.end_date}. Missing timeouts for all days.`);
    } else if (pattern && pattern.pattern_type === 'single_day') {
      console.log('📝 Single day pattern detected, setting up for potential bulk expansion');
      setIsBulkCorrection(true);
      setBulkDates([pattern.start_date]);
      setBulkSchedule({
        start: pattern.scheduled_start_time || '',
        end: pattern.scheduled_end_time || ''
      });
      
      // Pre-populate reason for single day that can be expanded
      setReason(`Time correction for ${pattern.start_date}. You can add more dates to make this a bulk request.`);
    } else {
      console.log('📝 No pattern or not consecutive nightshift, staying in single mode');
    }
  }, [pattern]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted!");
    setLoading(true);
    setSuccess(null);
    setError(null);
    
    if (isBulkCorrection) {
      await handleBulkSubmit();
    } else {
      await handleSingleSubmit();
    }
  };

  const handleSingleSubmit = async () => {
    // Basic validation - ensure at least one time is provided
    if (!requestedTimeIn && !requestedTimeOut) {
      setError('Please provide at least one time (in or out)');
      setLoading(false);
      return;
    }
    
    // Validate date is provided
    if (!date) {
      setError('Please select a date');
      setLoading(false);
      return;
    }
    
    // Validate reason is provided
    if (!reason.trim()) {
      setError('Please provide a reason for the time correction');
      setLoading(false);
      return;
    }
    
    try {
      // Format the request data
      const requestData = new FormData();
      requestData.append('date', date);
      
      // Only include time_in if it has a value
      if (requestedTimeIn) {
        requestData.append('requested_time_in', requestedTimeIn);
      }
      
      // Only include time_out if it has a value
      if (requestedTimeOut) {
        requestData.append('requested_time_out', requestedTimeOut);
      }
      
      // Add reason
      requestData.append('reason', reason);
      
      console.log("Sending request data:", Object.fromEntries(requestData));
      
      // Send the request with form data
      const response = await axiosInstance.post('time-correction-requests/', requestData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log("Response:", response);
      setSuccess('Request submitted successfully!');
      setDate('');
      setRequestedTimeIn('');
      setRequestedTimeOut('');
      setReason('');
    } catch (err) {
      console.error('Error submitting time correction request:', err);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    // Validate that at least one date is selected
    if (bulkDates.length === 0) {
      setError('Please select at least one date for the bulk correction');
      setLoading(false);
      return;
    }
    
    // Validate reason is provided
    if (!reason.trim()) {
      setError('Please provide a reason for the bulk time correction');
      setLoading(false);
      return;
    }
    
    try {
      // Calculate date range from selected dates
      const sortedDates = [...bulkDates].sort();
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];
      
      // Create bulk correction request
      const bulkRequestData = {
        pattern_id: pattern?.id || null,
        pattern_type: pattern?.pattern_type || 'custom_bulk',
        start_date: startDate,
        end_date: endDate,
        total_days: bulkDates.length,
        dates: bulkDates,
        scheduled_start_time: bulkSchedule.start,
        scheduled_end_time: bulkSchedule.end,
        reason: reason.trim(),
        correction_type: 'bulk_nightshift_timeout'
      };
      
      console.log("Sending bulk request data:", bulkRequestData);
      
      // Send the bulk request
      const response = await axiosInstance.post('time-correction-requests/bulk-nightshift/', bulkRequestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log("Bulk response:", response);
      setSuccess(`Bulk correction request submitted successfully for ${bulkDates.length} days!`);
      
      // Reset form
      setReason('');
      setIsBulkCorrection(false);
      setBulkDates([]);
      setBulkSchedule({ start: '', end: '' });
      
    } catch (err) {
      console.error('Error submitting bulk time correction request:', err);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (err) => {
    if (err.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error response data:', err.response.data);
      console.error('Error status:', err.response.status);
      console.error('Error headers:', err.response.headers);
      
      // Try to show more detailed error message from server if available
      if (err.response.data && typeof err.response.data === 'object') {
        // If the error is an object with a 'detail' field
        if (err.response.data.detail) {
          setError(`Error: ${err.response.data.detail}`);
        } 
        // If there are field-specific validation errors
        else if (Object.keys(err.response.data).length > 0) {
          const errorMessages = [];
          Object.entries(err.response.data).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(', ')}`);
            } else {
              errorMessages.push(`${field}: ${messages}`);
            }
          });
          setError(errorMessages.join('; '));
        } else {
          setError('An error occurred while submitting the request.');
        }
      } else {
        setError('An error occurred while submitting the request.');
      }
    } else if (err.request) {
      // The request was made but no response was received
      console.error('Error request:', err.request);
      setError('No response received from server. Please check your internet connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', err.message);
      setError(`Error: ${err.message}`);
    }
  };

  const renderBulkCorrectionForm = () => (
    <div className="space-y-6">
      {/* Pattern Information Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-600 text-lg">🌙</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-indigo-900">
              Bulk Nightshift Correction
            </h3>
            <p className="text-sm text-indigo-600">
              {pattern?.pattern_type === 'consecutive_nightshift' 
                ? `Pattern detected: ${pattern.total_days || pattern.length} consecutive nightshifts`
                : `Bulk correction: ${bulkDates.length} selected days`
              }
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Date Range:</span>
            <span className="ml-2 text-gray-600">
              {bulkDates.length > 0 ? `${Math.min(...bulkDates)} to ${Math.max(...bulkDates)}` : 'No dates selected'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Schedule:</span>
            <span className="ml-2 text-gray-600">
              {bulkSchedule.start || pattern?.scheduled_start_time || '-'} - {bulkSchedule.end || pattern?.scheduled_end_time || '-'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Total Days:</span>
            <span className="ml-2 text-blue-600 font-medium">
              {bulkDates.length} days
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Pattern Type:</span>
            <span className="ml-2 text-gray-600 capitalize">
              {pattern?.pattern_type ? pattern.pattern_type.replace('_', ' ') : 'Custom Bulk'}
            </span>
          </div>
        </div>
      </div>

      {/* Bulk Correction Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Affected Dates ({bulkDates.length} days)
          </label>
          
          {/* Date Management Controls */}
          <div className="flex gap-2 mb-3">
            <input
              type="date"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              onChange={(e) => {
                const newDate = e.target.value;
                if (newDate && !bulkDates.includes(newDate)) {
                  setBulkDates([...bulkDates, newDate].sort());
                }
              }}
              placeholder="Add new date"
            />
            <button
              type="button"
              className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                if (!bulkDates.includes(today)) {
                  setBulkDates([...bulkDates, today].sort());
                }
              }}
            >
              Add Today
            </button>
            {bulkDates.length > 0 && (
              <button
                type="button"
                className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                onClick={() => setBulkDates([])}
                title="Clear all dates"
              >
                Clear All
              </button>
            )}
          </div>
          
          {/* Display Selected Dates with Remove Option */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {bulkDates.map((date, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-center flex items-center justify-between group">
                <span>{new Date(date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}</span>
                <button
                  type="button"
                  className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    setBulkDates(bulkDates.filter((_, i) => i !== index));
                  }}
                  title="Remove date"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          {bulkDates.length === 0 && (
            <p className="text-sm text-gray-500 italic">No dates selected. Add dates above to create a bulk correction request.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Bulk Correction
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain why this bulk correction is needed for all consecutive nightshifts..."
            rows={4}
            required
          />
                      <p className="text-xs text-gray-500 mt-1">
              This reason will apply to all {bulkDates.length} selected days
            </p>
        </div>
      </div>
    </div>
  );

  const renderSingleCorrectionForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date
        </label>
        <input
          type="date"
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Requested Time In
          </label>
          <input
            type="time"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={requestedTimeIn}
            onChange={e => setRequestedTimeIn(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty if you only need to correct time out
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Requested Time Out
          </label>
          <input
            type="time"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={requestedTimeOut}
            onChange={e => setRequestedTimeOut(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty if you only need to correct time in
          </p>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reason
        </label>
        <textarea
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Enter reason for time correction request"
          rows={3}
          required
        />
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-orange-700">
        <span className="text-orange-400">🌙</span> 
        {isBulkCorrection ? 'Bulk Nightshift Correction Request' : 'Time Correction Request Form'}
      </h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-800 text-sm">{success}</div>
        </div>
      )}

      {/* Form Content */}
      {isBulkCorrection ? renderBulkCorrectionForm() : renderSingleCorrectionForm()}
      
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold"
          onClick={() => {
            console.log('🔄 Switch button clicked. Current mode:', isBulkCorrection ? 'bulk' : 'single');
            console.log('📊 Pattern data available:', pattern);
            
            if (isBulkCorrection) {
              // Currently in bulk mode, switch to single
              console.log('🔄 Switching from bulk to single mode');
              setIsBulkCorrection(false);
              setBulkDates([]);
              setBulkSchedule({ start: '', end: '' });
              setReason('');
            } else {
              // Currently in single mode, switch to bulk
              console.log('🔄 Switching from single to bulk mode');
              setIsBulkCorrection(true);
              // Pre-populate bulk fields if we have a pattern
              if (pattern) {
                console.log('📊 Pre-populating bulk fields with pattern data');
                setBulkDates(pattern.records.map(record => record.date));
                setBulkSchedule({
                  start: pattern.scheduled_start_time || '',
                  end: pattern.scheduled_end_time || ''
                });
                setReason(`Bulk correction for ${pattern.total_days || pattern.length} consecutive nightshifts from ${pattern.start_date} to ${pattern.end_date}. Missing timeouts for all days.`);
              } else {
                console.log('⚠️ No pattern data available for bulk mode');
              }
            }
          }}
          disabled={loading}
        >
          {isBulkCorrection ? 'Switch to Single' : 'Switch to Bulk'}
        </button>
        
        <button
          type="submit"
          className="px-5 py-2 rounded bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow disabled:opacity-60 flex items-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {isBulkCorrection ? 'Submitting Bulk...' : 'Submitting...'}
            </>
          ) : (
            isBulkCorrection ? `Submit Bulk Request (${pattern?.total_days || pattern?.length || 0} days)` : 'Submit Request'
          )}
        </button>
      </div>
    </form>
  );
};

export default RequestTimeCorrectionForm; 