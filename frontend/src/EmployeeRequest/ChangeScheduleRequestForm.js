import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaExchangeAlt, FaRegStickyNote } from 'react-icons/fa';

const ChangeScheduleRequestForm = ({ onSuccess, onCancel, request, onSubmit, mutation }) => {
  const isEdit = !!request;
  const [originalDate, setOriginalDate] = useState('');
  const [originalStartTime, setOriginalStartTime] = useState('');
  const [originalEndTime, setOriginalEndTime] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedStartTime, setRequestedStartTime] = useState('');
  const [requestedEndTime, setRequestedEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      setOriginalDate(request.original_date || '');
      setOriginalStartTime(request.original_start_time || '');
      setOriginalEndTime(request.original_end_time || '');
      setRequestedDate(request.requested_date || '');
      setRequestedStartTime(request.requested_start_time || '');
      setRequestedEndTime(request.requested_end_time || '');
      setReason(request.reason || '');
    } else {
      setOriginalDate('');
      setOriginalStartTime('');
      setOriginalEndTime('');
      setRequestedDate('');
      setRequestedStartTime('');
      setRequestedEndTime('');
      setReason('');
    }
  }, [isEdit, request]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!originalDate || !originalStartTime || !originalEndTime || 
        !requestedDate || !requestedStartTime || !requestedEndTime || !reason) {
      setError('All fields are required.');
      return;
    }

    const formData = {
      original_date: originalDate,
      original_start_time: originalStartTime,
      original_end_time: originalEndTime,
      requested_date: requestedDate,
      requested_start_time: requestedStartTime,
      requested_end_time: requestedEndTime,
      reason,
    };

    try {
      setIsSubmitting(true);
      setError('');
      
      if (onSubmit) {
        // Use the parent's onSubmit handler
        await onSubmit(formData);
      } else if (mutation) {
        // Fallback to mutation if provided
        await mutation.mutateAsync(formData);
        if (onSuccess) onSuccess();
      } else {
        // Fallback to direct axios call
        const axios = (await import('../utils/axiosInstance')).default;
        if (isEdit) {
          await axios.patch(`change-schedule-requests/${request.id}/`, formData);
        } else {
          await axios.post('change-schedule-requests/', formData);
        }
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setError('Failed to submit change schedule request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-700">
        <FaExchangeAlt className="text-blue-400" /> {isEdit ? 'Edit Change Schedule Request' : 'Change Schedule Request Form'}
      </h2>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      <div className="flex flex-col gap-4">
        {/* Original Schedule */}
        <label className="flex flex-col font-medium">
          Original Date
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-blue-400"><FaCalendarAlt /></span>
            <input
              type="date"
              className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={originalDate}
              onChange={e => setOriginalDate(e.target.value)}
              required
            />
          </div>
        </label>
        <label className="flex flex-col font-medium">
          Original Start Time
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-blue-400"><FaClock /></span>
            <input
              type="time"
              className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={originalStartTime}
              onChange={e => setOriginalStartTime(e.target.value)}
              required
            />
          </div>
        </label>
        <label className="flex flex-col font-medium">
          Original End Time
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-blue-400"><FaClock /></span>
            <input
              type="time"
              className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={originalEndTime}
              onChange={e => setOriginalEndTime(e.target.value)}
              required
            />
          </div>
        </label>
        {/* Requested Schedule */}
        <label className="flex flex-col font-medium">
          Requested Date
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-blue-400"><FaCalendarAlt /></span>
            <input
              type="date"
              className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={requestedDate}
              onChange={e => setRequestedDate(e.target.value)}
              required
            />
          </div>
        </label>
        <label className="flex flex-col font-medium">
          Requested Start Time
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-blue-400"><FaClock /></span>
            <input
              type="time"
              className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={requestedStartTime}
              onChange={e => setRequestedStartTime(e.target.value)}
              required
            />
          </div>
        </label>
        <label className="flex flex-col font-medium">
          Requested End Time
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-blue-400"><FaClock /></span>
            <input
              type="time"
              className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={requestedEndTime}
              onChange={e => setRequestedEndTime(e.target.value)}
              required
            />
          </div>
        </label>
        {/* Reason */}
        <label className="flex flex-col font-medium">
          Reason
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-blue-400"><FaRegStickyNote /></span>
            <textarea
              className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Enter reason for change schedule request"
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
          className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow disabled:opacity-60 flex items-center gap-2"
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

export default ChangeScheduleRequestForm; 