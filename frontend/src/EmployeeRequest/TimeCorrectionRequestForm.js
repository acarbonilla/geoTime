import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaRegStickyNote } from 'react-icons/fa';

const TimeCorrectionRequestForm = ({ onSuccess, onCancel, request, onSubmit, mutation }) => {
  const isEdit = !!request;
  const [date, setDate] = useState('');
  const [requestedTimeIn, setRequestedTimeIn] = useState('');
  const [requestedTimeOut, setRequestedTimeOut] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      setDate(request.date || '');
      setRequestedTimeIn(request.requested_time_in || '');
      setRequestedTimeOut(request.requested_time_out || '');
      setReason(request.reason || '');
    } else {
      setDate('');
      setRequestedTimeIn('');
      setRequestedTimeOut('');
      setReason('');
    }
  }, [isEdit, request]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submit triggered');
    setError('');
    
    // Basic validation - ensure at least one time is provided
    if (!requestedTimeIn && !requestedTimeOut) {
      console.log('Validation failed: No time provided');
      setError('Please provide at least one time (in or out)');
      return;
    }
    
    // Validate date is provided
    if (!date) {
      console.log('Validation failed: No date provided');
      setError('Please select a date');
      return;
    }
    
    // Validate reason is provided
    if (!reason.trim()) {
      console.log('Validation failed: No reason provided');
      setError('Please provide a reason for the time correction');
      return;
    }
    
    const formData = {
      date,
      requested_time_in: requestedTimeIn || null,
      requested_time_out: requestedTimeOut || null,
      reason: reason.trim(),
    };

    console.log('Form data prepared:', formData);

    try {
      setIsSubmitting(true);
      setError('');
      
      if (onSubmit) {
        console.log('Using onSubmit prop');
        // Use the parent's onSubmit handler
        await onSubmit(formData);
      } else if (mutation) {
        console.log('Using mutation prop');
        // Fallback to mutation if provided
        await mutation.mutateAsync(formData);
        if (onSuccess) onSuccess();
      } else {
        console.log('Using direct axios call');
        // Fallback to direct axios call
        const axios = (await import('../utils/axiosInstance')).default;
        if (isEdit) {
          await axios.patch(`time-correction-requests/${request.id}/`, formData);
        } else {
          await axios.post('time-correction-requests/', formData);
        }
        if (onSuccess) onSuccess();
      }
      console.log('Form submission completed successfully');
    } catch (err) {
      console.error('Form submission error:', err);
      const errorMessage = err.response?.data?.detail || 
                          (err.response?.data && Object.values(err.response.data).flat().join(', ')) ||
                          'Failed to submit time correction request.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-orange-700">
        <FaClock className="text-orange-400" /> {isEdit ? 'Edit Time Correction Request' : 'Time Correction Request Form'}
      </h2>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      <div className="flex flex-col gap-4">
        <label className="flex flex-col font-medium">
          Date
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-orange-400"><FaCalendarAlt /></span>
            <input
              type="date"
              className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col font-medium">
            Requested Time In
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-orange-400"><FaClock /></span>
              <input
                type="time"
                className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={requestedTimeIn}
                onChange={e => setRequestedTimeIn(e.target.value)}
              />
            </div>
            <span className="text-xs text-gray-500 mt-1">
              Leave empty if you only need to correct time out
            </span>
          </label>
          
          <label className="flex flex-col font-medium">
            Requested Time Out
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-orange-400"><FaClock /></span>
              <input
                type="time"
                className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={requestedTimeOut}
                onChange={e => setRequestedTimeOut(e.target.value)}
              />
            </div>
            <span className="text-xs text-gray-500 mt-1">
              Leave empty if you only need to correct time in
            </span>
          </label>
        </div>
        
        <label className="flex flex-col font-medium">
          Reason
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-orange-400"><FaRegStickyNote /></span>
            <textarea
              className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Enter reason for time correction request"
              rows={3}
              required
            />
          </div>
        </label>
      </div>
      
      <div className="flex justify-end gap-3 mt-4">
        <button
          type="button"
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 rounded bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow disabled:opacity-60 flex items-center gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {isEdit ? 'Saving...' : 'Submitting...'}
            </>
          ) : (
            isEdit ? 'Save Changes' : 'Submit Request'
          )}
        </button>
      </div>
    </form>
  );
};

export default TimeCorrectionRequestForm;
