import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../utils/axiosInstance';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

// Add custom CSS animations
const customStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out;
  }
  
  .animate-slide-in {
    animation: slideIn 0.3s ease-out;
  }
  
  .animate-scale-in {
    animation: scaleIn 0.2s ease-out;
  }
  
  .hover-lift {
    transition: all 0.2s ease-in-out;
  }
  
  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
  
  .button-pulse {
    transition: all 0.2s ease-in-out;
  }
  
  .button-pulse:hover {
    transform: scale(1.05);
  }
  
  .table-row-hover {
    transition: all 0.2s ease-in-out;
  }
  
  .table-row-hover:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }
`;

// Inject custom styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  document.head.appendChild(styleElement);
}

const CalendarClockIcon = () => (
  <svg className="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="16" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 14v2l1 1" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const Spinner = () => (
  <div className="flex justify-center items-center py-8">
    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
    </svg>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center py-12 text-gray-400">
    <svg width="64" height="64" fill="none" viewBox="0 0 24 24"><path d="M7 17h10M7 13h10M7 9h10M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    <div className="mt-4 text-lg font-semibold">No entries found</div>
    <div className="text-sm">Try adjusting your filters or date range.</div>
  </div>
);

const Tooltip = ({ text, children }) => (
  <span className="relative group cursor-pointer">
    {children}
    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 z-10 whitespace-nowrap shadow-lg">
      {text}
    </span>
  </span>
);

// Isolated tooltip for notes column to prevent interference with other columns
const NotesTooltip = ({ text, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <span 
      className="relative cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-gray-800 text-white text-xs rounded px-2 py-1 z-10 max-w-xs break-words shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
};

// Edit Modal Component
const EditTimeEntryModal = ({ isOpen, onClose, entry, onSave }) => {
  const [formData, setFormData] = useState({
    timestamp: '',
    notes: '',
    overtime: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (entry) {
      // Convert timestamp to the format expected by datetime-local input
      let timestamp = '';
      if (entry.timestamp) {
        try {
          const date = new Date(entry.timestamp);
          if (!isNaN(date.getTime())) {
            // Format as YYYY-MM-DDTHH:MM for datetime-local input
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            timestamp = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        } catch (error) {
          console.error('Error parsing timestamp:', error);
        }
      }
      
      setFormData({
        timestamp,
        notes: entry.notes || '',
        overtime: entry.overtime || ''
      });
    }
  }, [entry]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Convert the datetime-local value to ISO string for the API
      let formattedTimestamp = formData.timestamp;
      if (formData.timestamp) {
        const date = new Date(formData.timestamp);
        if (!isNaN(date.getTime())) {
          formattedTimestamp = date.toISOString();
        }
      }

      console.log('Original timestamp:', formData.timestamp);
      console.log('Formatted timestamp for API:', formattedTimestamp);
      console.log('Entry ID:', entry.id);
      // Prepare request data, only include overtime if it has a value
      const requestData = {
        timestamp: formattedTimestamp,
        notes: formData.notes
      };
      
      // Only add overtime if it has a value (not empty string)
      if (formData.overtime && formData.overtime.trim() !== '') {
        requestData.overtime = parseFloat(formData.overtime);
      }

      console.log('Request data:', requestData);

      const response = await axiosInstance.patch(`/time-entries/${entry.id}/`, requestData);

      console.log('API response:', response.data);
      onSave(response.data);
      onClose();
    } catch (err) {
      console.error('Error updating time entry:', err);
      console.error('Error response:', err.response);
      console.error('Error status:', err.response?.status);
      console.error('Error data:', err.response?.data);
      
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to update time entry';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
      
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white bg-opacity-20">
                  <PencilIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Edit Time Entry</h3>
                  <p className="text-blue-100 text-sm">{entry?.employee_name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-white hover:bg-white hover:bg-opacity-20 transition-all duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.timestamp}
                onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 transform hover:scale-105"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 transform hover:scale-105 resize-none"
                placeholder="Add notes about this time entry..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overtime Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.overtime}
                onChange={(e) => setFormData({ ...formData, overtime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 transform hover:scale-105"
                placeholder="0.0"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 font-medium button-pulse"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 button-pulse"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const TeamLeaderReports = ({ employee }) => {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [subordinates, setSubordinates] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Helper function to get Manila timezone date
  // This ensures all date calculations use Asia/Manila timezone regardless of user's system timezone
  const getManilaDate = (date = new Date()) => {
    // Convert the date to Manila timezone
    const manilaDateString = date.toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Parse the date string (MM/DD/YYYY format) and convert to YYYY-MM-DD
    const [month, day, year] = manilaDateString.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Helper function to get current Manila time
  const getManilaTime = () => {
    return new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };
  
  // Set default dates to today and last 7 days in Manila timezone
  const today = getManilaDate();
  console.log('🌅 Today date calculated:', today);
  
  // Calculate last week date in Manila timezone
  const manilaTime = new Date().toLocaleString("en-US", {timeZone: "Asia/Manila"});
  const manilaDate = new Date(manilaTime);
  const sevenDaysAgo = new Date(manilaDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeek = getManilaDate(sevenDaysAgo);
  console.log('📅 Last week date calculated:', lastWeek);
  
  const [filterForm, setFilterForm] = useState({
    startDate: lastWeek,
    endDate: today,
    entryType: 'all',
    selectedEmployee: 'all',
    selectedDepartment: 'all',
  });
  console.log('📋 Initial filterForm state:', { startDate: lastWeek, endDate: today });
  
  const [filters, setFilters] = useState({
    startDate: lastWeek,
    endDate: today,
    entryType: 'all',
    selectedEmployee: 'all',
    selectedDepartment: 'all',
  });
  console.log('🔍 Initial filters state:', { startDate: lastWeek, endDate: today });
  const [activeQuickFilter, setActiveQuickFilter] = useState('last7Days');
  const [loading, setLoading] = useState(false);
  const [subordinatesLoading, setSubordinatesLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [showTable, setShowTable] = useState(true); // Set to true by default
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editModal, setEditModal] = useState({
    isOpen: false,
    entry: null
  });
  const [successMessage, setSuccessMessage] = useState('');
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

  // Helper functions for quick date filters
  const getDateRange = (range) => {
    console.log('🔍 getDateRange called with range:', range);
    
    // Get current Manila time
    const manilaNow = new Date().toLocaleString("en-US", {timeZone: "Asia/Manila"});
    const manilaDate = new Date(manilaNow);
    console.log('🕐 Manila time:', manilaNow);
    console.log('📅 Manila date object:', manilaDate);
    
    // Get today's date in Manila timezone
    const today = new Date(manilaDate.getFullYear(), manilaDate.getMonth(), manilaDate.getDate());
    console.log('📅 Today date object:', today);
    
    switch (range) {
      case 'today':
        const todayDate = getManilaDate();
        console.log('🌅 Today case - getManilaDate() result:', todayDate);
        return {
          startDate: todayDate,
          endDate: todayDate
        };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          startDate: getManilaDate(yesterday),
          endDate: getManilaDate(yesterday)
        };
      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return {
          startDate: getManilaDate(startOfWeek),
          endDate: getManilaDate()
        };
      case 'lastWeek':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        return {
          startDate: getManilaDate(lastWeekStart),
          endDate: getManilaDate(lastWeekEnd)
        };
      case 'thisMonth':
        const startOfMonth = new Date(manilaDate.getFullYear(), manilaDate.getMonth(), 1);
        return {
          startDate: getManilaDate(startOfMonth),
          endDate: getManilaDate()
        };
      case 'lastMonth':
        const startOfLastMonth = new Date(manilaDate.getFullYear(), manilaDate.getMonth() - 1, 1);
        const endOfLastMonth = new Date(manilaDate.getFullYear(), manilaDate.getMonth(), 0);
        return {
          startDate: getManilaDate(startOfLastMonth),
          endDate: getManilaDate(endOfLastMonth)
        };
      case 'last7Days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        return {
          startDate: getManilaDate(sevenDaysAgo),
          endDate: getManilaDate()
        };
      case 'last30Days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return {
          startDate: getManilaDate(thirtyDaysAgo),
          endDate: getManilaDate()
        };
      default:
        return {
          startDate: lastWeek,
          endDate: today
        };
    }
  };

  const handleQuickDateFilter = (range) => {
    console.log('🎯 Quick filter clicked:', range);
    const dateRange = getDateRange(range);
    console.log('📅 Date range calculated:', dateRange);
    
    const newFilters = {
      ...filterForm,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    };
    console.log('🔄 New filters:', newFilters);
    
    setFilterForm(newFilters);
    setFilters(newFilters);
    setActiveQuickFilter(range);
    setCurrentPage(1);
    
    console.log('✅ Quick filter applied successfully');
  };

  // Fetch subordinates on component mount
  useEffect(() => {
    if (employee?.id) {
      setSubordinatesLoading(true);
      axiosInstance.get(`/employees/${employee.id}/subordinates/`)
        .then(res => {
          console.log('Subordinates response:', res.data);
          setSubordinates(res.data || []);
        })
        .catch(error => {
          console.error('Error fetching subordinates:', error);
          setSubordinates([]);
        })
        .finally(() => setSubordinatesLoading(false));
    }
  }, [employee?.id]);

  // Fetch departments on component mount
  useEffect(() => {
    setDepartmentsLoading(true);
    console.log('Fetching departments...');
    axiosInstance.get('/departments/active/')
      .then(res => {
        console.log('Departments response:', res.data);
        setDepartments(res.data || []);
      })
      .catch(error => {
        console.error('Error fetching departments:', error);
        setDepartments([]);
      })
      .finally(() => setDepartmentsLoading(false));
  }, []);

  // React Query for fetching time entries with automatic refresh every 30 seconds
  const {
    data: timeEntriesData,
    isLoading: timeEntriesLoading,
    error: timeEntriesError,
    refetch: refetchTimeEntries
  } = useQuery({
    queryKey: ['timeEntries', filters.startDate, filters.endDate, filters.selectedEmployee, filters.selectedDepartment, currentPage, pageSize],
    queryFn: async () => {
      const params = { 
        page_size: pageSize, 
        page: currentPage, 
        ordering: '-timestamp'
      };
      
      console.log('🔍 Current filters:', filters);
      if (filters.startDate) {
        params.start_date = filters.startDate;
        console.log('📅 Added start_date:', filters.startDate);
      }
      if (filters.endDate) {
        params.end_date = filters.endDate;
        console.log('📅 Added end_date:', filters.endDate);
      }
      if (filters.selectedEmployee !== 'all') {
        params.employee = filters.selectedEmployee;
      }
      if (filters.selectedDepartment !== 'all') {
        params.employee__department = filters.selectedDepartment;
      }
      
      console.log('Time entries API params:', params);
      const response = await axiosInstance.get('/time-entries/', { params });
      console.log('Time entries API response:', response.data);
      return response.data;
    },
    enabled: showTable,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
    staleTime: 0, // Consider data stale immediately
    cacheTime: 0, // Don't cache data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Update entries when React Query data changes
  useEffect(() => {
    if (timeEntriesData) {
      const results = timeEntriesData.results || timeEntriesData;
      setEntries(results);
      setTotalPages(Math.ceil((timeEntriesData.count || results.length) / pageSize));
    }
  }, [timeEntriesData, pageSize]);

  // Set loading state based on React Query
  useEffect(() => {
    setLoading(timeEntriesLoading);
  }, [timeEntriesLoading]);

  // Filter entries based on local filters
  useEffect(() => {
    let data = [...entries];
    
    const getDateString = (entry) => {
      const ts = entry.formatted_timestamp || entry.timestamp;
      if (!ts) return '';
      const dt = new Date(ts);
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        return dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      } else {
        return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
      }
    };

    const parsePHDate = (dateStr) => {
      return new Date(dateStr + 'T00:00:00+08:00');
    };
    
    if (!filters.startDate && !filters.endDate && (filters.entryType === 'all' || !filters.entryType)) {
      setFilteredEntries(entries);
      return;
    }
    
    if (filters.startDate) {
      data = data.filter(e => {
        const entryDate = getDateString(e);
        const filterStart = parsePHDate(filters.startDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        return entryDate && entryDate >= filterStart;
      });
    }
    
    if (filters.endDate) {
      data = data.filter(e => {
        const entryDate = getDateString(e);
        const filterEnd = parsePHDate(filters.endDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        return entryDate && entryDate <= filterEnd;
      });
    }
    
    if (filters.entryType !== 'all') {
      data = data.filter(e => e.entry_type === filters.entryType);
    }
    
    console.log('🔍 Local filtering result:', {
      originalEntries: entries.length,
      filteredEntries: data.length,
      filters: filters,
      sampleEntry: data[0]
    });
    setFilteredEntries(data);
  }, [entries, filters]);

  const handleFilterFormChange = (e) => {
    const { name, value } = e.target;
    console.log('🔧 Filter changed:', name, value);
    const newFilterForm = { ...filterForm, [name]: value };
    console.log('🔄 New filter form:', newFilterForm);
    setFilterForm(newFilterForm);
    
    // Clear active quick filter if dates are manually changed
    if (name === 'startDate' || name === 'endDate') {
      setActiveQuickFilter(null);
      console.log('🗑️ Active quick filter cleared');
    }
    
    // Automatically apply filters when they change
    setFilters(newFilterForm);
    setCurrentPage(1);
    console.log('✅ Filters updated and page reset');
  };

  const handleEditEntry = (entry) => {
    setEditModal({
      isOpen: true,
      entry: entry
    });
  };

  const handleSaveEdit = (updatedEntry) => {
    console.log('Saving updated entry:', updatedEntry);
    console.log('Updated entry notes:', updatedEntry.notes);
    console.log('Updated entry timestamp:', updatedEntry.timestamp);
    
    // Update the entry in the local state with the API response data
    setEntries(prevEntries => 
      prevEntries.map(entry => 
        entry.id === updatedEntry.id ? {
          ...entry,
          timestamp: updatedEntry.timestamp,
          notes: updatedEntry.notes,
          overtime: updatedEntry.overtime,
          updated_on: updatedEntry.updated_on,
          updated_by: updatedEntry.updated_by
        } : entry
      )
    );
    
    // Update filtered entries as well
    setFilteredEntries(prevFiltered => 
      prevFiltered.map(entry => 
        entry.id === updatedEntry.id ? {
          ...entry,
          timestamp: updatedEntry.timestamp,
          notes: updatedEntry.notes,
          overtime: updatedEntry.overtime,
          updated_on: updatedEntry.updated_on,
          updated_by: updatedEntry.updated_by
        } : entry
      )
    );
    
    // Close the modal
    setEditModal({
      isOpen: false,
      entry: null
    });
    
    // Show success message
    setSuccessMessage('Time entry updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
    
    // Refetch data to ensure we have the latest information
    refetchTimeEntries();
    
    console.log('Time entry updated successfully with data:', updatedEntry);
  };

  const handleCloseEditModal = () => {
    setEditModal({
      isOpen: false,
      entry: null
    });
  };

  // Helper to format date and time like the table
  const formatExportDateTime = (ts) => {
    if (!ts) return { date: '', time: '' };
    let tsISO = ts.replace(/\.(\d+)([\+\-]\d{2}:\d{2})$/, '$2');
    const dt = new Date(tsISO);
    if (!isNaN(dt)) {
      return {
        date: dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }),
        time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })
      };
    } else {
      let date = '', time = '';
      if (ts.includes('T')) {
        [date, time] = ts.split('T');
        time = time ? time.split('.')[0] : '';
      }
      return { date, time };
    }
  };

  // Export functions
  const exportCSV = () => {
    const header = ['Employee', 'Department', 'Entry Type', 'Date', 'Time', 'Location', 'Overtime', 'Notes', 'Coordinates'];
    const rows = filteredEntries.map(e => {
      const { date, time } = formatExportDateTime(e.timestamp);
      const coordinates = e.latitude && e.longitude ? `${e.latitude}, ${e.longitude}` : 'No location';
      return [
        e.employee_name,
        e.department_name,
        e.entry_type,
        date,
        time,
        e.location_name,
        e.overtime || '',
        e.notes || '',
        coordinates,
      ];
    });
    const csvContent = [header, ...rows].map(r => r.map(x => '"' + (x || '') + '"').join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'team_time_entries.csv');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredEntries.map(e => {
      const { date, time } = formatExportDateTime(e.timestamp);
      const coordinates = e.latitude && e.longitude ? `${e.latitude}, ${e.longitude}` : 'No location';
      return {
        Employee: e.employee_name,
        Department: e.department_name,
        'Entry Type': e.entry_type,
        Date: date,
        Time: time,
        Location: e.location_name,
        Overtime: e.overtime || '',
        Notes: e.notes || '',
        Coordinates: coordinates,
      };
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Team Time Entries');
    XLSX.writeFile(wb, 'team_time_entries.xlsx');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Team Time Entries Report', 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [[
        'Employee', 'Department', 'Entry Type', 'Date', 'Time', 'Location', 'Overtime', 'Notes', 'Coordinates'
      ]],
      body: filteredEntries.map(e => {
        const { date, time } = formatExportDateTime(e.timestamp);
        return [
          e.employee_name,
          e.department_name,
          e.entry_type,
          date,
          time,
          e.location_name,
          e.overtime || '',
          e.notes || '',
          e.latitude && e.longitude ? `${e.latitude}, ${e.longitude}` : '',
        ];
      }),
      styles: { fontSize: 8 },
    });
    doc.save('team_time_entries.pdf');
  };

  // Summary statistics functions
  const getSummaryStats = () => {
    const totalEntries = filteredEntries.length;
    const timeInCount = filteredEntries.filter(e => e.entry_type === 'time_in').length;
    const timeOutCount = filteredEntries.filter(e => e.entry_type === 'time_out').length;
    const totalOvertime = filteredEntries.reduce((sum, e) => sum + (e.overtime || 0), 0);
    const employeesWithEntries = new Set(filteredEntries.map(e => e.employee_id)).size;
    const departmentsWithEntries = new Set(filteredEntries.map(e => e.department_name).filter(Boolean)).size;
    const entriesWithNotes = filteredEntries.filter(e => e.notes && e.notes.trim()).length;
    const entriesWithLocation = filteredEntries.filter(e => e.latitude && e.longitude).length;

    return {
      totalEntries,
      timeInCount,
      timeOutCount,
      totalOvertime: parseFloat(totalOvertime.toFixed(2)),
      employeesWithEntries,
      departmentsWithEntries,
      entriesWithNotes,
      entriesWithLocation,
      averageOvertime: totalEntries > 0 ? parseFloat((totalOvertime / totalEntries).toFixed(2)) : 0
    };
  };

  const exportSummary = () => {
    const stats = getSummaryStats();
    const summaryData = [
      { Metric: 'Total Time Entries', Value: stats.totalEntries },
      { Metric: 'Time In Entries', Value: stats.timeInCount },
      { Metric: 'Time Out Entries', Value: stats.timeOutCount },
      { Metric: 'Total Overtime Hours', Value: `${stats.totalOvertime}h` },
      { Metric: 'Average Overtime per Entry', Value: `${stats.averageOvertime}h` },
      { Metric: 'Unique Employees', Value: stats.employeesWithEntries },
      { Metric: 'Departments Represented', Value: stats.departmentsWithEntries },
      { Metric: 'Entries with Notes', Value: stats.entriesWithNotes },
      { Metric: 'Entries with Location', Value: stats.entriesWithLocation },
      { Metric: 'Date Range', Value: `${filterForm.startDate} to ${filterForm.endDate}` },
      { Metric: 'Filter Applied', Value: activeQuickFilter ? activeQuickFilter.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) : 'Custom Range' }
    ];

    const ws = XLSX.utils.json_to_sheet(summaryData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary Statistics');
    XLSX.writeFile(wb, 'team_time_entries_summary.xlsx');
  };

  const exportSummaryPDF = () => {
    const stats = getSummaryStats();
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Team Time Entries Summary Report', 14, 20);
    
    // Date range
    doc.setFontSize(12);
    doc.text(`Date Range: ${filterForm.startDate} to ${filterForm.endDate}`, 14, 30);
    doc.text(`Filter: ${activeQuickFilter ? activeQuickFilter.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) : 'Custom Range'}`, 14, 37);
    
    // Summary table
    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Total Time Entries', stats.totalEntries.toString()],
        ['Time In Entries', stats.timeInCount.toString()],
        ['Time Out Entries', stats.timeOutCount.toString()],
        ['Total Overtime Hours', `${stats.totalOvertime}h`],
        ['Average Overtime per Entry', `${stats.averageOvertime}h`],
        ['Unique Employees', stats.employeesWithEntries.toString()],
        ['Departments Represented', stats.departmentsWithEntries.toString()],
        ['Entries with Notes', stats.entriesWithNotes.toString()],
        ['Entries with Location', stats.entriesWithLocation.toString()]
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save('team_time_entries_summary.pdf');
  };

  // Pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-1 rounded mx-1 transition-all duration-200 transform hover:scale-105 ${currentPage === i ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100'}`}
          disabled={currentPage === i}
        >
          {i}
        </button>
      );
    }
    return (
      <div className="flex justify-center items-center mt-4">
        <button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded mx-1 bg-gray-200 text-gray-700 hover:bg-blue-100 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
        >Prev</button>
        {pages}
        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded mx-1 bg-gray-200 text-gray-700 hover:bg-blue-100 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
        >Next</button>
      </div>
    );
  };

  // Page size selector
  const renderPageSizeSelector = () => (
    <div className="flex items-center gap-2 mb-2">
      <label htmlFor="pageSize" className="text-sm text-gray-700">Rows per page:</label>
      <select
        id="pageSize"
        value={pageSize}
        onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
        className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition-all duration-200 transform hover:scale-105"
      >
        {PAGE_SIZE_OPTIONS.map(size => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <div className="max-w-6xl mx-auto p-4 md:p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen relative z-0">
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center">
              <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        )}
        
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-1 tracking-tight drop-shadow">Team Reports & Analytics</h1>
          <p className="mb-4 text-gray-500 text-lg">Generate comprehensive time entry reports for your team members</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/20 hover-lift animate-fade-in">
          <div className="mb-4 font-semibold text-blue-800 text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h3m4 4v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2h3a4 4 0 014 4v2" />
            </svg>
            Team Report Configuration
          </div>
          
          {/* Quick Date Filters */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-700">Quick Date Filters:</div>
              <div className="flex items-center gap-3">
                {activeQuickFilter && (
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {filterForm.startDate} to {filterForm.endDate}
                  </div>
                )}
                <div className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  🕐 Manila Time: {getManilaTime()}
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  📅 Manila Date: {getManilaDate()}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickDateFilter('today')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 transform hover:scale-105 border ${
                  activeQuickFilter === 'today'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => handleQuickDateFilter('yesterday')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 transform hover:scale-105 border ${
                  activeQuickFilter === 'yesterday'
                    ? 'bg-gray-600 text-white border-gray-600 shadow-md'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => handleQuickDateFilter('thisWeek')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 transform hover:scale-105 border ${
                  activeQuickFilter === 'thisWeek'
                    ? 'bg-green-600 text-white border-green-600 shadow-md'
                    : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => handleQuickDateFilter('lastWeek')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 transform hover:scale-105 border ${
                  activeQuickFilter === 'lastWeek'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                    : 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
                }`}
              >
                Last Week
              </button>
              <button
                onClick={() => handleQuickDateFilter('thisMonth')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 transform hover:scale-105 border ${
                  activeQuickFilter === 'thisMonth'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => handleQuickDateFilter('lastMonth')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 transform hover:scale-105 border ${
                  activeQuickFilter === 'lastMonth'
                    ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                    : 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200'
                }`}
              >
                Last Month
              </button>
              <button
                onClick={() => handleQuickDateFilter('last7Days')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 transform hover:scale-105 border ${
                  activeQuickFilter === 'last7Days'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                    : 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => handleQuickDateFilter('last30Days')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 transform hover:scale-105 border ${
                  activeQuickFilter === 'last30Days'
                    ? 'bg-pink-600 text-white border-pink-600 shadow-md'
                    : 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200'
                }`}
              >
                Last 30 Days
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mb-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <Tooltip text="Select a specific team member or view all team members.">
                <select 
                  name="selectedEmployee" 
                  value={filterForm.selectedEmployee} 
                  onChange={handleFilterFormChange} 
                  className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition-all duration-200 transform hover:scale-105 min-w-[200px]"
                  disabled={subordinatesLoading}
                >
                  <option value="all">All Team Members</option>
                  {employee && (
                    <option value={employee.id} className="font-semibold text-blue-600">
                      {employee.full_name}
                    </option>
                  )}
                  {subordinates.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </Tooltip>
              {subordinatesLoading && (
                <div className="text-xs text-gray-500 mt-1">Loading team members...</div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <Tooltip text="Select a specific department or view all departments.">
                <select 
                  name="selectedDepartment" 
                  value={filterForm.selectedDepartment} 
                  onChange={handleFilterFormChange} 
                  className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition-all duration-200 transform hover:scale-105 min-w-[200px]"
                  disabled={departmentsLoading}
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </Tooltip>
              {departmentsLoading && (
                <div className="text-xs text-gray-500 mt-1">Loading departments...</div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <Tooltip text="Select the start date for the report.">
                <input 
                  type="date" 
                  name="startDate" 
                  value={filterForm.startDate} 
                  onChange={handleFilterFormChange} 
                  className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition-all duration-200 transform hover:scale-105" 
                />
              </Tooltip>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <Tooltip text="Select the end date for the report.">
                <input 
                  type="date" 
                  name="endDate" 
                  value={filterForm.endDate} 
                  onChange={handleFilterFormChange} 
                  className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition-all duration-200 transform hover:scale-105" 
                />
              </Tooltip>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entry Type</label>
              <Tooltip text="Filter by time in or time out entries.">
                <select 
                  name="entryType" 
                  value={filterForm.entryType} 
                  onChange={handleFilterFormChange} 
                  className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition-all duration-200 transform hover:scale-105"
                >
                  <option value="all">All Types</option>
                  <option value="time_in">Time In</option>
                  <option value="time_out">Time Out</option>
                </select>
              </Tooltip>
            </div>
            
            <div className="flex items-end">
              {/* Generate Report button removed - results show automatically */}
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Tooltip text="Download as CSV">
              <button 
                onClick={exportCSV} 
                disabled={!showTable || filteredEntries.length === 0}
                className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-3 py-1.5 rounded shadow hover:from-blue-500 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed button-pulse"
              >
                CSV
              </button>
            </Tooltip>
            <Tooltip text="Download as Excel">
              <button 
                onClick={exportExcel} 
                disabled={!showTable || filteredEntries.length === 0}
                className="bg-gradient-to-r from-green-400 to-green-600 text-white px-3 py-1.5 rounded shadow hover:from-green-500 hover:to-green-700 transition-all duration-200 transform hover:scale-105 font-medium focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed button-pulse"
              >
                Excel
              </button>
            </Tooltip>
            <Tooltip text="Download as PDF">
              <button 
                onClick={exportPDF} 
                disabled={!showTable || filteredEntries.length === 0}
                className="bg-gradient-to-r from-red-400 to-red-600 text-white px-3 py-1.5 rounded shadow hover:from-red-500 hover:to-red-700 transition-all duration-200 transform hover:scale-105 font-medium focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed button-pulse"
              >
                PDF
              </button>
            </Tooltip>
            <Tooltip text="Download Summary">
              <button 
                onClick={exportSummary} 
                disabled={!showTable || filteredEntries.length === 0}
                className="bg-gradient-to-r from-purple-400 to-pink-600 text-white px-3 py-1.5 rounded shadow hover:from-purple-500 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 font-medium focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed button-pulse"
              >
                Summary
              </button>
            </Tooltip>
            <Tooltip text="Download Summary PDF">
              <button 
                onClick={exportSummaryPDF} 
                disabled={!showTable || filteredEntries.length === 0}
                className="bg-gradient-to-r from-indigo-400 to-blue-600 text-white px-3 py-1.5 rounded shadow hover:from-indigo-500 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed button-pulse"
              >
                Summary PDF
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20 hover-lift animate-fade-in">
          <div className="mb-4 font-semibold text-blue-800 text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Team Time Entry Details
            </div>
            {showTable && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ArrowPathIcon className={`w-4 h-4 ${timeEntriesLoading ? 'animate-spin' : ''}`} />
                <span>Auto-refresh every 30s</span>
              </div>
            )}
          </div>

          {/* Summary Statistics */}
          {!loading && filteredEntries.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-medium text-gray-700 mb-3">Summary Statistics:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {(() => {
                  const stats = getSummaryStats();
                  return (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.totalEntries}</div>
                        <div className="text-xs text-blue-700">Total Entries</div>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.timeInCount}</div>
                        <div className="text-xs text-green-700">Time In</div>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.timeOutCount}</div>
                        <div className="text-xs text-red-700">Time Out</div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-orange-600">{stats.totalOvertime}h</div>
                        <div className="text-xs text-orange-700">Total OT</div>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-600">{stats.employeesWithEntries}</div>
                        <div className="text-xs text-purple-700">Employees</div>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-indigo-600">{stats.departmentsWithEntries}</div>
                        <div className="text-xs text-indigo-700">Departments</div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-teal-600">{(() => {
                    const stats = getSummaryStats();
                    return stats.averageOvertime;
                  })()}h</div>
                  <div className="text-xs text-teal-700">Avg OT/Entry</div>
                </div>
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-pink-600">{(() => {
                    const stats = getSummaryStats();
                    return stats.entriesWithNotes;
                  })()}</div>
                  <div className="text-xs text-pink-700">With Notes</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-yellow-600">{(() => {
                    const stats = getSummaryStats();
                    return stats.entriesWithLocation;
                  })()}</div>
                  <div className="text-xs text-yellow-700">With Location</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-gray-600">{(() => {
                    const stats = getSummaryStats();
                    return activeQuickFilter ? activeQuickFilter.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) : 'Custom';
                  })()}</div>
                  <div className="text-xs text-gray-700">Filter Applied</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-600">{getManilaDate()}</div>
                  <div className="text-xs text-blue-700">Manila Date</div>
                </div>
              </div>
            </div>
          )}
          
          {!showTable ? (
            <div className="flex flex-col items-center py-12 text-blue-300 animate-fade-in">
              <svg width="64" height="64" fill="none" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div className="mt-4 text-lg font-semibold">Team time entries will appear here automatically.</div>
              <div className="text-sm">Adjust filters above to customize the report view.</div>
            </div>
          ) : loading ? (
            <Spinner />
          ) : filteredEntries.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              {renderPageSizeSelector()}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                {/* Table Header with Count */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">
                      Showing {filteredEntries.length} time entries
                      {timeEntriesData?.count && timeEntriesData.count !== filteredEntries.length && (
                        <span className="text-gray-500 ml-2">
                          (of {timeEntriesData.count} total)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      🕐 Manila Time: {getManilaTime()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Page {currentPage} of {totalPages}
                    </div>
                  </div>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-48">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-28">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">
                        OT
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-48">
                        Notes
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-28">
                        Map
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredEntries.map((e, idx) => {
                      const ts = e.timestamp || '';
                      let date = '', time = '', formattedTime = '';
                      if (ts) {
                        let tsISO = ts.replace(/\.(\d+)([\+\-]\d{2}:\d{2})$/, '$2');
                        const dt = new Date(tsISO);
                        if (!isNaN(dt)) {
                          date = dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
                          formattedTime = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
                        } else {
                          if (ts.includes('T')) {
                            [date, time] = ts.split('T');
                            formattedTime = time ? time.split('.')[0] : '';
                          } else {
                            formattedTime = ts;
                          }
                        }
                      }
                      return (
                        <tr key={e.id} className="hover:bg-blue-50 transition-all duration-200 group table-row-hover">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center">
                                  <span className="text-white text-sm font-medium">
                                    {e.employee_name?.charAt(0)?.toUpperCase() || 'U'}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900 truncate max-w-32">
                                  {e.employee_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {e.employee_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              e.entry_type === 'time_in' 
                                ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                            }`}>
                              {e.entry_type === 'time_in' ? 'Time In' : 'Time Out'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {date}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                            {formattedTime}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {e.overtime ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ring-1 ring-orange-200">
                                {e.overtime}h
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900 max-w-48">
                              <NotesTooltip text={e.notes || 'No notes'}>
                                <div className="truncate">
                                  {e.notes || 'No notes'}
                                </div>
                              </NotesTooltip>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {e.latitude && e.longitude ? (
                              <button
                                onClick={() => {
                                  const url = `https://www.google.com/maps?q=${e.latitude},${e.longitude}`;
                                  window.open(url, '_blank');
                                }}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition-all duration-200 rounded-lg group-hover:bg-blue-50 button-pulse"
                                title="Open in Google Maps"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleEditEntry(e)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 transition-all duration-200 rounded-lg group-hover:bg-blue-50 button-pulse"
                              title="Edit time entry"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {renderPagination()}
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Modal */}
      <EditTimeEntryModal
        isOpen={editModal.isOpen}
        onClose={handleCloseEditModal}
        entry={editModal.entry}
        onSave={handleSaveEdit}
      />
    </>
  );
};

export default TeamLeaderReports;
