import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaTicketAlt, FaRegStickyNote } from 'react-icons/fa';

const OvertimeRequestForm = ({ onSuccess, onClose, request, mutation }) => {
  const isEdit = !!request;
  const [ticket, setTicket] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

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
      if (mutation) {
        await mutation.mutateAsync(formData);
      } else {
        // Fallback to direct axios call if no mutation provided
        const axios = (await import('../utils/axiosInstance')).default;
        if (isEdit) {
          await axios.patch(`overtime-requests/${request.id}/`, formData);
        } else {
          await axios.post('overtime-requests/', formData);
        }
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to submit overtime request.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-700">
        <FaTicketAlt className="text-blue-400" /> {isEdit ? 'Edit Overtime Request' : 'Overtime Request Form'}
      </h2>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      <div className="flex flex-col gap-4">
        <label className="flex flex-col font-medium">
          Ticket
          <input
            type="text"
            className="mt-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={ticket}
            onChange={e => setTicket(e.target.value)}
            placeholder="Enter ticket number or code"
            required
          />
        </label>
        <label className="flex flex-col font-medium">
          Date
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-blue-400"><FaCalendarAlt /></span>
            <input
              type="date"
              className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
        </label>
        <div className="flex gap-4">
          <label className="flex flex-col font-medium flex-1">
            Start Time
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-blue-400"><FaClock /></span>
              <input
                type="time"
                className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
              />
            </div>
          </label>
          <label className="flex flex-col font-medium flex-1">
            End Time
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-blue-400"><FaClock /></span>
              <input
                type="time"
                className="pl-10 border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
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
              placeholder="Enter reason for overtime"
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
          disabled={mutation?.isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow disabled:opacity-60"
          disabled={mutation?.isLoading}
        >
          {mutation?.isLoading ? (isEdit ? 'Saving...' : 'Submitting...') : (isEdit ? 'Save Changes' : 'Submit Request')}
        </button>
      </div>
    </form>
  );
};

export default OvertimeRequestForm; 