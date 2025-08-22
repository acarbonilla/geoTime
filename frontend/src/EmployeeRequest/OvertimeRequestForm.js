import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaTicketAlt, FaRegStickyNote } from 'react-icons/fa';

const OvertimeRequestForm = ({ onSuccess, onCancel, request, onSubmit, mutation }) => {
  const isEdit = !!request;
  const [ticket, setTicket] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      setTicket(request.ticket || '');
      setDate(request.date || '');
      setStartTime(request.start_time || '');
      setEndTime(request.end_time || '');
      setReason(request.reason || '');
    } else {
      setTicket('');
      setDate('');
      setStartTime('');
      setEndTime('');
      setReason('');
    }
  }, [isEdit, request]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Overtime form submitted');
    setError('');
    
    if (!ticket || !date || !startTime || !endTime || !reason) {
      setError('All fields are required.');
      return;
    }

    const formData = {
      ticket,
      date,
      start_time: startTime,
      end_time: endTime,
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
          await axios.patch(`overtime-requests/${request.id}/`, formData);
        } else {
          await axios.post('overtime-requests/', formData);
        }
        if (onSuccess) onSuccess();
      }
      
      console.log('Overtime request submitted successfully');
    } catch (err) {
      console.error('Error submitting overtime request:', err);
      setError('Failed to submit overtime request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col font-medium">
          <span className="text-sm text-gray-700 mb-1">Ticket</span>
          <div className="relative">
            <FaTicketAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              value={ticket}
              onChange={e => setTicket(e.target.value)}
              placeholder="Enter ticket number or code"
              required
            />
          </div>
        </label>
        
        <label className="flex flex-col font-medium">
          <span className="text-sm text-gray-700 mb-1">Date</span>
          <div className="relative">
            <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="date"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
        </label>
        
        <label className="flex flex-col font-medium">
          <span className="text-sm text-gray-700 mb-1">Start Time</span>
          <div className="relative">
            <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="time"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              required
            />
          </div>
        </label>
        
        <label className="flex flex-col font-medium">
          <span className="text-sm text-gray-700 mb-1">End Time</span>
          <div className="relative">
            <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="time"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              required
            />
          </div>
        </label>
      </div>
      
      <label className="flex flex-col font-medium">
        <span className="text-sm text-gray-700 mb-1">Reason</span>
        <div className="relative">
          <FaRegStickyNote className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
          <textarea
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Enter reason for overtime request"
            rows={3}
            required
          />
        </div>
      </label>
      
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          className="px-6 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all duration-200"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md transition-all duration-200 transform hover:scale-105 disabled:opacity-60 disabled:transform-none flex items-center gap-2"
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

export default OvertimeRequestForm; 