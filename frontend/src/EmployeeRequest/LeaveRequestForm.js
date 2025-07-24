import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosInstance';
import { FaCalendarAlt, FaRegStickyNote, FaUserClock } from 'react-icons/fa';

const LEAVE_TYPES = [
  { value: 'vacation', label: 'Vacation Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'bereavement', label: 'Bereavement Leave' },
  { value: 'other', label: 'Other' },
];

const LeaveRequestForm = ({ onSuccess, onClose, request }) => {
  const isEdit = !!request;
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      setLeaveType(request.leave_type || '');
      setStartDate(request.start_date || '');
      setEndDate(request.end_date || '');
      setReason(request.reason || '');
    } else {
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
    }
  }, [isEdit, request]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!leaveType || !startDate || !endDate || !reason) {
      setError('All fields are required.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date.');
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await axios.patch(`leave-requests/${request.id}/`, {
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
        });
      } else {
        await axios.post('leave-requests/', {
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
        });
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to submit leave request.');
    } finally {
      setLoading(false);
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
        <div className="flex gap-4">
          <label className="flex flex-col font-medium flex-1">
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
          <label className="flex flex-col font-medium flex-1">
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
        </div>
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
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow disabled:opacity-60"
          disabled={loading}
        >
          {loading ? (isEdit ? 'Saving...' : 'Submitting...') : (isEdit ? 'Save Changes' : 'Submit Request')}
        </button>
      </div>
    </form>
  );
};

export default LeaveRequestForm; 