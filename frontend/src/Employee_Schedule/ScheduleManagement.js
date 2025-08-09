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
  const [isStaff, setIsStaff] = useState(false); // Track if user is staff/admin

  useEffect(() => {
    loadSchedules();
    checkUserRole();
  }, [currentMonth]);

  const checkUserRole = () => {
    // Check if user is staff/admin by looking at localStorage or user profile
    // This is a simple check - you might want to get this from your user profile API
    const userRole = localStorage.getItem('userRole') || 'employee';
    setIsStaff(userRole === 'admin' || userRole === 'team_leader' || userRole === 'staff');
  };

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
    setSelectedDate(start);
    setSelectedSchedule(null);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event) => {
    setSelectedSchedule(event);
    setSelectedDate(event.start);
    setIsModalOpen(true);
  };

  const handleSaveSchedule = async (scheduleData) => {
    try {
      if (selectedSchedule) {
        await updateSchedule(selectedSchedule.id, scheduleData);
        toast.success('Schedule updated successfully');
      } else {
        await createSchedule(scheduleData);
        toast.success('Schedule created successfully');
      }
      setIsModalOpen(false);
      loadSchedules();
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      
      // Handle specific error messages from backend
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(error.response.data.error);
      } else if (error.response && error.response.data && typeof error.response.data === 'string') {
        // Sometimes the error message is directly in the response data
        toast.error(error.response.data);
      } else if (error.message) {
        // Use the error message if available
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

    // Check if this is a past date (for employees)
    const eventDate = new Date(event.start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      // Past date - show with reduced opacity and different color
      style.backgroundColor = '#6c757d';
      style.opacity = 0.5;
      style.cursor = 'not-allowed';
    } else if (eventDate.getTime() === today.getTime()) {
      // Today's date - show with warning color
      style.backgroundColor = '#ffc107';
      style.color = '#000';
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
          isStaff={isStaff}
        />
      )}

      {isBulkModalOpen && (
        <BulkScheduleModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onSave={handleBulkSchedule}
          currentMonth={currentMonth}
          isStaff={isStaff}
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