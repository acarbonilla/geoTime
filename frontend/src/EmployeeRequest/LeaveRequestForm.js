import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaUserClock, FaRegStickyNote } from 'react-icons/fa';

const LEAVE_TYPES = [
  { value: 'vacation', label: 'Vacation Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'bereavement', label: 'Bereavement Leave' },
  { value: 'other', label: 'Other' },
];

const LeaveRequestForm = ({ onSuccess, onCancel, request, onSubmit, mutation }) => {
  const isEdit = !!request;
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numberDays, setNumberDays] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      setLeaveType(request.leave_type || '');
      setStartDate(request.start_date || '');
      setEndDate(request.end_date || '');
      setNumberDays(request.number_days?.toString() || '');
      setReason(request.reason || '');
    } else {
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setNumberDays('');
      setReason('');
    }
  }, [isEdit, request]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!leaveType || !startDate || !endDate || !numberDays || !reason) {
      setError('All fields are required.');
      return;
    }

    if (parseFloat(numberDays) <= 0) {
      setError('Number of days must be greater than 0.');
      return;
    }

    const formData = {
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      number_days: parseFloat(numberDays),
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
          await axios.patch(`leave-requests/${request.id}/`, formData);
        } else {
          await axios.post('leave-requests/', formData);
        }
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 
                          (err.response?.data && Object.values(err.response.data).flat().join(', ')) ||
                          'Failed to submit leave request.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-700">
        <FaUserClock className="text-blue-400" /> {isEdit ? 'Edit Leave Request' : 'Leave Request Form'}
      </h2>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      <div className="flex flex-col gap-4">
        <label className="flex flex-col font-medium">
          Leave Type
          <select
            className="mt-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={leaveType}
            onChange={e => setLeaveType(e.target.value)}
            required
          >
            <option value="">Select leave type</option>
            {LEAVE_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col font-medium">
          Start Date
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-blue-400"><FaCalendarAlt /></span>
            <input
              type="date"
              className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              required
            />
          </div>
        </label>
        <label className="flex flex-col font-medium">
          End Date
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-blue-400"><FaCalendarAlt /></span>
            <input
              type="date"
              className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              required
            />
          </div>
        </label>
        <label className="flex flex-col font-medium">
          Number of Days
          <input
            type="number"
            className="mt-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={numberDays}
            onChange={e => setNumberDays(e.target.value)}
            placeholder="Enter number of days (excluding weekends)"
            min="0.5"
            step="0.5"
            required
          />
          <span className="text-xs text-gray-500 mt-1">
            Enter the actual number of working days (excluding weekends and holidays)
          </span>
        </label>
        <label className="flex flex-col font-medium">
          Reason
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-blue-400"><FaRegStickyNote /></span>
            <textarea
              className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Enter reason for leave request"
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

export default LeaveRequestForm; 