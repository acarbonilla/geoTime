import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import ScheduleEntryModal from './ScheduleEntryModal';
import TemplateManagement from './TemplateManagement';
import BulkScheduleModal from './BulkScheduleModal';
import { getEmployeeSchedules, createSchedule, updateSchedule, deleteSchedule, applyTemplateToSchedule, formatTime } from '../api/scheduleAPI';
import { toast } from 'react-toastify';

const localizer = momentLocalizer(moment);

const ScheduleManagement = () => {
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, [currentMonth]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const startDate = currentMonth.startOf('month').format('YYYY-MM-DD');
      const endDate = currentMonth.endOf('month').format('YYYY-MM-DD');
      const data = await getEmployeeSchedules(startDate, endDate);
      setSchedules(data);
    } catch (error) {
      toast.error('Failed to load schedules');
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = ({ start }) => {
    // Check if selected date is in the past
    const selectedDate = new Date(start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast.error('Cannot create schedules for past dates');
      return;
    }
    
    setSelectedDate(start);
    setSelectedSchedule(null);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event) => {
    // Check if event date is in the past
    const eventDate = new Date(event.start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      toast.error('Cannot edit schedules for past dates');
      return;
    }
    
    setSelectedSchedule(event);
    setSelectedDate(event.start);
    setIsModalOpen(true);
  };

  const handleSaveSchedule = async (scheduleData) => {
    try {
      console.log('=== SCHEDULE SAVE DEBUG ===');
      console.log('Schedule data being sent:', scheduleData);
      console.log('Selected schedule object:', selectedSchedule);
      console.log('Data types:', {
        date: typeof scheduleData.date,
        timeIn: typeof scheduleData.scheduled_time_in,
        timeOut: typeof scheduleData.scheduled_time_out,
        nightShift: typeof scheduleData.is_night_shift
      });
      
      if (selectedSchedule) {
        console.log('Updating schedule with ID:', selectedSchedule.id);
        console.log('Original schedule data:', {
          date: selectedSchedule.date,
          timeIn: selectedSchedule.scheduled_time_in,
          timeOut: selectedSchedule.scheduled_time_out,
          nightShift: selectedSchedule.is_night_shift
        });
        await updateSchedule(selectedSchedule.id, scheduleData);
        toast.success('Schedule updated successfully');
      } else {
        console.log('Creating new schedule');
        await createSchedule(scheduleData);
        toast.success('Schedule created successfully');
      }
      setIsModalOpen(false);
      loadSchedules();
    } catch (error) {
      console.error('=== ERROR DETAILS ===');
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Additional debugging to see the exact error structure
      console.log('=== DETAILED ERROR ANALYSIS ===');
      console.log('Error response exists:', !!error.response);
      console.log('Error response data exists:', !!(error.response && error.response.data));
      console.log('Error response data type:', typeof (error.response?.data));
      console.log('Error response data keys:', error.response?.data ? Object.keys(error.response.data) : 'No data');
      
      // Log the entire error object structure
      console.log('Error object keys:', Object.keys(error));
      console.log('Error response keys:', error.response ? Object.keys(error.response) : 'No response');
      console.log('Error response data keys:', error.response?.data ? Object.keys(error.response.data) : 'No data');
      
      // Try to stringify the error response data
      try {
        console.log('Error response data stringified:', JSON.stringify(error.response?.data, null, 2));
      } catch (e) {
        console.log('Could not stringify error response data:', e);
      }
      
      if (error.response && error.response.data && error.response.data.error) {
        console.log('Backend error message:', error.response.data.error);
        toast.error(error.response.data.error);
      } else if (error.response && error.response.data && typeof error.response.data === 'string') {
        // Sometimes the error message is directly in the response data
        console.log('Backend error string:', error.response.data);
        toast.error(error.response.data);
      } else if (error.response && error.response.data) {
        // Log the full response data for debugging
        console.log('Full backend response data:', error.response.data);
        console.log('Response data JSON:', JSON.stringify(error.response.data, null, 2));
        
        // Try to find any error message in the response
        let errorMessage = 'Backend validation error';
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (Array.isArray(error.response.data)) {
          errorMessage = error.response.data.join(', ');
        } else {
          errorMessage = 'Backend validation error - check console for details';
        }
        
        toast.error(errorMessage);
      } else if (error.message) {
        // Use the error message if available
        console.log('Error message:', error.message);
        toast.error(error.message);
      } else {
        toast.error('Failed to save schedule');
      }
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await deleteSchedule(scheduleId);
        toast.success('Schedule deleted successfully');
        setIsModalOpen(false);
        loadSchedules();
      } catch (error) {
        // Handle specific error messages from backend
        if (error.response && error.response.data && error.response.data.error) {
          toast.error(error.response.data.error);
        } else {
          toast.error('Failed to delete schedule');
        }
        console.error('Error deleting schedule:', error);
      }
    }
  };

  const handleBulkSchedule = async (bulkData) => {
    try {
      // Call the API to apply template to schedule
      const result = await applyTemplateToSchedule(bulkData.template_id, bulkData);
      
      // Build detailed success message
      let message = `Successfully created ${result.schedules_created} schedules`;
      if (result.dates_updated > 0) {
        message += `, updated ${result.dates_updated} existing schedules`;
      }
      if (result.dates_skipped > 0) {
        message += `, skipped ${result.dates_skipped} existing dates`;
        
        // Show detailed information about skipped dates
        if (result.skipped_dates_list && result.skipped_dates_list.length > 0) {
          const skippedDates = result.skipped_dates_list.slice(0, 5); // Show first 5 dates
          const moreText = result.skipped_dates_list.length > 5 ? ` and ${result.skipped_dates_list.length - 5} more` : '';
          message += `\nSkipped dates: ${skippedDates.join(', ')}${moreText}`;
        }
      }
      
      toast.success(message);
      setIsBulkModalOpen(false);
      loadSchedules();
    } catch (error) {
      // Handle specific error messages from backend
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to create bulk schedule');
      }
      console.error('Error creating bulk schedule:', error);
    }
  };

  const eventStyleGetter = (event) => {
    let style = {
      backgroundColor: '#3174ad',
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block'
    };

    if (event.is_night_shift) {
      style.backgroundColor = '#d32f2f';
    }

    // Check if this is a past date
    const eventDate = new Date(event.start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      // Past date - show with reduced opacity and different color
      style.backgroundColor = '#6c757d';
      style.opacity = 0.5;
      style.cursor = 'not-allowed';
    }

    return {
      style
    };
  };

  const calendarEvents = schedules.map(schedule => ({
    id: schedule.id,
    title: `${formatTime(schedule.scheduled_time_in)} - ${formatTime(schedule.scheduled_time_out)}`,
    start: new Date(schedule.date),
    end: new Date(schedule.date),
    is_night_shift: schedule.is_night_shift,
    ...schedule
  }));

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Management</h1>
          <p className="text-gray-600">Manage your monthly work schedules</p>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>New:</strong> You can now add, edit, and delete your own schedules for today and future dates. 
              Past dates are read-only for data integrity.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Bulk Schedule
          </button>
          
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Templates
          </button>

          <button
            onClick={() => {
              setCurrentMonth(moment().subtract(1, 'month'));
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Previous Month
          </button>

          <button
            onClick={() => {
              setCurrentMonth(moment());
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Current Month
          </button>

          <button
            onClick={() => {
              setCurrentMonth(moment().add(1, 'month'));
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Next Month
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {currentMonth.format('MMMM YYYY')}
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              selectable
              views={['month']}
              defaultView="month"
              tooltipAccessor={(event) => `${event.scheduled_time_in} - ${event.scheduled_time_out}`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span>Day Shift</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span>Night Shift</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-600 rounded opacity-50"></div>
            <span>Past Date (Read Only)</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isModalOpen && (
        <ScheduleEntryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveSchedule}
          onDelete={handleDeleteSchedule}
          schedule={selectedSchedule}
          selectedDate={selectedDate}
        />
      )}

      {isBulkModalOpen && (
        <BulkScheduleModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onSave={handleBulkSchedule}
          currentMonth={currentMonth}
        />
      )}

      {isTemplateModalOpen && (
        <TemplateManagement
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ScheduleManagement; 