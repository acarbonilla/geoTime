import React, { useState } from 'react';
import axiosInstance from '../utils/axiosInstance';

const RequestTimeCorrectionForm = ({ employee }) => {
  const [date, setDate] = useState('');
  const [requestedTimeIn, setRequestedTimeIn] = useState('');
  const [requestedTimeOut, setRequestedTimeOut] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted!");
    setLoading(true);
    setSuccess(null);
    setError(null);
    
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
            setError('Failed to submit request. Please check the form and try again.');
          }
        } else {
          setError(`Error: ${err.response.statusText || 'Unknown error occurred'}`);
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received:', err.request);
        setError('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', err.message);
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      {success && <div className="text-green-600 font-medium">{success}</div>}
      {error && <div className="text-red-600 font-medium">{error}</div>}
      <div>
        <label className="block font-medium mb-1">Date <span className="text-red-500">*</span></label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block font-medium mb-1">Requested Time In</label>
          <input
            type="time"
            value={requestedTimeIn}
            onChange={e => setRequestedTimeIn(e.target.value)}
            className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex-1">
          <label className="block font-medium mb-1">Requested Time Out</label>
          <input
            type="time"
            value={requestedTimeOut}
            onChange={e => setRequestedTimeOut(e.target.value)}
            className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>
      <div>
        <label className="block font-medium mb-1">Reason <span className="text-red-500">*</span></label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          required
          rows={3}
          className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
};

export default RequestTimeCorrectionForm; 