import React, { useState, useEffect } from 'react';
import moment from 'moment';


const ScheduleEntryModal = ({ isOpen, onClose, onSave, onDelete, schedule, selectedDate }) => {
  const [formData, setFormData] = useState({
    date: '',
    scheduled_time_in: '',
    scheduled_time_out: '',
    is_night_shift: false,
    notes: ''
  });
  const [errors, setErrors] = useState({});


  useEffect(() => {
    if (schedule) {
      // Editing existing schedule
      console.log('Editing schedule:', schedule);
      console.log('Schedule date:', schedule.date);
      console.log('Schedule date type:', typeof schedule.date);
      console.log('Schedule date value:', schedule.date);
      
      // Ensure the date is in the correct format for the date input
      let formattedDate = schedule.date;
      if (typeof schedule.date === 'string') {
        // If it's a string, ensure it's in YYYY-MM-DD format
        formattedDate = moment(schedule.date).format('YYYY-MM-DD');
      }
      
      console.log('Formatted date:', formattedDate);
      
      setFormData({
        date: formattedDate,
        scheduled_time_in: schedule.scheduled_time_in,
        scheduled_time_out: schedule.scheduled_time_out,
        is_night_shift: schedule.is_night_shift,
        notes: schedule.notes || ''
      });
    } else if (selectedDate) {
      // Creating new schedule
      console.log('Creating new schedule for date:', selectedDate);
      setFormData({
        date: moment(selectedDate).format('YYYY-MM-DD'),
        scheduled_time_in: '',
        scheduled_time_out: '',
        is_night_shift: false,
        notes: ''
      });
    }
    setErrors({});

  }, [schedule, selectedDate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }


  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.scheduled_time_in) {
      newErrors.scheduled_time_in = 'Time in is required';
    }

    if (!formData.scheduled_time_out) {
      newErrors.scheduled_time_out = 'Time out is required';
    }

    // Check if date is in the past (allow today's date)
    if (formData.date) {
      const selectedDate = moment(formData.date);
      const today = moment().startOf('day');
      
      console.log('Date validation - selected date:', selectedDate.format('YYYY-MM-DD'));
      console.log('Date validation - today:', today.format('YYYY-MM-DD'));
      console.log('Date validation - is before today:', selectedDate.isBefore(today));
      
      if (selectedDate.isBefore(today)) {
        newErrors.date = 'Cannot create or edit schedules for past dates';
      }
    }

    if (formData.scheduled_time_in && formData.scheduled_time_out) {
      const timeIn = moment(formData.scheduled_time_in, 'HH:mm');
      const timeOut = moment(formData.scheduled_time_out, 'HH:mm');
      
      if (!formData.is_night_shift && timeOut.isBefore(timeIn)) {
        newErrors.scheduled_time_out = 'Time out must be after time in for day shifts';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('Form data before validation:', formData);
    console.log('Form errors before validation:', errors);
    
    if (validateForm()) {
      console.log('✅ Form validation passed');
      console.log('📤 Submitting data to backend:', formData);
      console.log('📅 Date being sent:', formData.date);
      console.log('🕐 Time In:', formData.scheduled_time_in);
      console.log('🕐 Time Out:', formData.scheduled_time_out);
      console.log('🌙 Night Shift:', formData.is_night_shift);
      console.log('📝 Notes:', formData.notes);
      console.log('📊 Current date (moment):', moment().format('YYYY-MM-DD'));
      console.log('📊 Current date (new Date):', new Date().toISOString().split('T')[0]);
      
      onSave(formData);
    } else {
      console.log('❌ Form validation failed');
      console.log('Validation errors:', errors);
    }
  };

  const handleDelete = () => {
    if (schedule && onDelete) {
      onDelete(schedule.id);
    }
  };

  // Early return if modal is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {schedule ? 'Edit Schedule' : 'Add Schedule'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              min={moment().format('YYYY-MM-DD')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.date ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.date && (
              <p className="text-red-500 text-sm mt-1">{errors.date}</p>
            )}
          </div>

          {/* Time In */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time In
            </label>
            <input
              type="time"
              name="scheduled_time_in"
              value={formData.scheduled_time_in}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.scheduled_time_in ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.scheduled_time_in && (
              <p className="text-red-500 text-sm mt-1">{errors.scheduled_time_in}</p>
            )}
          </div>

          {/* Time Out */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Out
            </label>
            <input
              type="time"
              name="scheduled_time_out"
              value={formData.scheduled_time_out}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.scheduled_time_out ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.scheduled_time_out && (
              <p className="text-red-500 text-sm mt-1">{errors.scheduled_time_out}</p>
            )}
          </div>

          {/* Night Shift Toggle */}
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_night_shift"
                checked={formData.is_night_shift}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Night Shift (crosses midnight)</span>
            </label>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any notes about this schedule..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            {schedule && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete
              </button>
            )}
            
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {schedule ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleEntryModal; 