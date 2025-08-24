import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
// Heroicons v2 imports
import { 
  UserCircleIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  MagnifyingGlassIcon as SearchIcon,
  ArrowPathIcon as RefreshIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  PencilIcon,
  CheckIcon,
  XIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../../utils/axiosInstance';

// Tooltip component
const Tooltip = ({ children, text }) => (
  <div className="relative group">
    {children}
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
      {text}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
);

// Status badge component
const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
    status === 'in' 
      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
      : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border border-gray-200'
  }`}>
    {status === 'in' ? (
      <CheckCircleIcon className="-ml-0.5 mr-1.5 h-3.5 w-3.5 text-green-600" />
    ) : (
      <XCircleIcon className="-ml-0.5 mr-1.5 h-3.5 w-3.5 text-gray-500" />
    )}
    {status === 'in' ? 'Clocked In' : 'Clocked Out'}
  </span>
);

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex flex-col justify-center items-center p-12">
    <div className="relative">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
    </div>
    <p className="mt-4 text-gray-600 font-medium">Loading team time entries...</p>
  </div>
);

// Error message component
const ErrorMessage = ({ message, onRetry }) => (
  <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-6 rounded-r-lg shadow-sm">
    <div className="flex">
      <div className="flex-shrink-0">
        <XCircleIcon className="h-6 w-6 text-red-500" />
      </div>
      <div className="ml-4">
        <h3 className="text-sm font-semibold text-red-800">Error Loading Data</h3>
        <p className="text-sm text-red-700 mt-1">{message}</p>
        {onRetry && (
          <div className="mt-3">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-sm"
            >
              <RefreshIcon className="-ml-1 mr-2 h-4 w-4" />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

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
      const timestamp = entry.timestamp ? new Date(entry.timestamp).toISOString().slice(0, 16) : '';
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
      const response = await axiosInstance.patch(`/time-entries/${entry.id}/`, {
        timestamp: formData.timestamp,
        notes: formData.notes,
        overtime: formData.overtime
      });

      onSave(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update time entry');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="0.0"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <RefreshIcon className="h-4 w-4 animate-spin" />
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

const TeamTimeEntries = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  
  // State for filters and sorting
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'in', 'out'
  const [sortConfig, setSortConfig] = useState({ 
    key: 'name', 
    direction: 'asc' 
  });
  
  // State for expanded rows
  const [expandedRows, setExpandedRows] = useState({});
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [editModal, setEditModal] = useState({
    isOpen: false,
    entry: null
  });
  const [pendingCorrections, setPendingCorrections] = useState([]);
  
  // State for toggle between Active Only and All Today
  const [toggleActiveOnly, setToggleActiveOnly] = useState(false);

  // Fetch team time entries
  const fetchTeamTimeEntries = useCallback(async () => {
    try {
      if (!isOpen) {
        return;
      }
      
      setLoading(true);
      setError(null);
      
      // First, fetch the current user's employee data
      const currentEmployeeRes = await axiosInstance.get('dashboard/');
      const currentEmployee = currentEmployeeRes.data.employee;
      
      if (!currentEmployee) {
        throw new Error('No employee data found');
      }
      
      // Now fetch the team members (subordinates)
      const teamMembersRes = await axiosInstance.get(`employees/${currentEmployee.id}/subordinates/`);
      
      if (!Array.isArray(teamMembersRes.data)) {
        const errorMsg = `Invalid team members data received: ${JSON.stringify(teamMembersRes.data)}`;
        console.error(errorMsg);
        throw new Error('Invalid team members data received');
      }
      
      // Include current user in the team members list
      const allTeamMembers = [
        {
          id: currentEmployee.id,
          name: currentEmployee.full_name || `${currentEmployee.first_name || ''} ${currentEmployee.last_name || ''}`.trim() || currentEmployee.username,
          employee_id: currentEmployee.employee_id,
          role: currentEmployee.role,
          department: currentEmployee.department?.name || 'No Department'
        },
        ...teamMembersRes.data.map(member => ({
          id: member.id,
          name: member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username,
          employee_id: member.employee_id,
          role: member.role,
          department: member.department?.name || 'No Department',
          user: member.user || { username: member.username }
        }))
      ];
      
      // If no team members, set empty entries and return early
      if (allTeamMembers.length === 0) {
        setEntries([]);
        setLastRefreshed(new Date());
        setLoading(false);
        return;
      }
      
      // Get today's time entries for all team members
      
      // Get time entries for all team members
      // const timeEntriesUrl = `time-entries/?date=${todayFormatted}`;
      const timeEntriesUrl = `time-entries/team_today/`;
      
      let entriesRes;
      try {
        entriesRes = await axiosInstance.get(timeEntriesUrl);

        // Support both new ({ entries: [...] }) and old (array) backend responses
        if (!Array.isArray(entriesRes.data) && (!entriesRes.data || !Array.isArray(entriesRes.data.entries))) {
          const errorMsg = `Invalid time entries data received: ${JSON.stringify(entriesRes.data)}`;
          console.error(errorMsg);
          throw new Error('Invalid time entries data received');
        }

      } catch (error) {
        console.error('Error fetching time entries:', {
          message: error.message,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          } : 'No response',
          config: error.config ? {
            url: error.config.url,
            method: error.config.method,
            headers: error.config.headers ? Object.keys(error.config.headers) : 'No headers'
          } : 'No config',
          error: error
        });
        throw error;
      }
      
      // Process grouped response: [{ employee: {...}, entries: [...] }, ...]
      const processedEntries = entriesRes.data.map(item => {
        const member = item.employee;
        const memberEntries = item.entries || [];
        const entryCount = memberEntries.length;
        const lastEntry = entryCount > 0 ? memberEntries[entryCount - 1] : null;
        const status = lastEntry ? (lastEntry.entry_type === 'time_in' ? 'in' : 'out') : 'out';
        // Calculate total time worked today
        let totalMinutes = 0;
        let timeIn = null;
        for (const entry of memberEntries) {
          if (entry.entry_type === 'time_in') {
            timeIn = parseISO(entry.timestamp);
          } else if (entry.entry_type === 'time_out' && timeIn) {
            const timeOut = parseISO(entry.timestamp);
            const minutes = differenceInMinutes(timeOut, timeIn);
            totalMinutes += minutes;
            timeIn = null;
          }
        }
        if (timeIn) {
          const now = new Date();
          const minutes = differenceInMinutes(now, timeIn);
          totalMinutes += minutes;
        }
        const totalHours = (totalMinutes / 60).toFixed(2);
        return {
          ...member,
          entries: memberEntries,
          entryCount,
          status,
          lastActivity: lastEntry ? format(parseISO(lastEntry.event_time || lastEntry.timestamp), 'h:mm a') : 'N/A',
          totalHours: totalHours > 0 ? `${totalHours} hrs` : 'N/A',
        };
      });
      setEntries(processedEntries);
      setLastRefreshed(new Date());
      
    } catch (err) {
      console.error('Error fetching team time entries:', err);
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        response: err.response ? {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        } : 'No response data'
      });
      setError(err.message || 'Failed to fetch team time entries');
    } finally {
      setLoading(false);
    }
  }, [isOpen]); // Add isOpen as a dependency

  // Fetch time entries on component mount
  useEffect(() => {
    if (isOpen) {
      fetchTeamTimeEntries();
      fetchPendingCorrections();
    }
  }, [isOpen]);

  // Handle refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchTeamTimeEntries();
  };

  const handleEditEntry = (entry) => {
    setEditModal({
      isOpen: true,
      entry: entry
    });
  };

  const handleSaveEdit = (updatedEntry) => {
    // Update the entry in the local state
    setEntries(prevEntries => 
      prevEntries.map(entry => 
        entry.id === updatedEntry.id ? updatedEntry : entry
      )
    );
    
    // Close the modal
    setEditModal({
      isOpen: false,
      entry: null
    });
    
    // Show success message or refresh data
    handleRefresh();
  };

  const handleCloseEditModal = () => {
    setEditModal({
      isOpen: false,
      entry: null
    });
  };

  // Fetch pending time correction requests
  const fetchPendingCorrections = async () => {
    try {
      const response = await axiosInstance.get('/time-corrections/?status=approved');
      setPendingCorrections(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching pending corrections:', error);
    }
  };

  // Check if an entry has a pending approved correction
  const hasApprovedCorrection = (entryId) => {
    return pendingCorrections.some(correction => 
      correction.time_entry === entryId && correction.status === 'approved'
    );
  };

  // Handle sort
  const requestSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Toggle row expansion
  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Apply filters and sorting
  const filteredAndSortedEntries = React.useMemo(() => {
    let result = [...entries];

    // Apply Active Only filter
    if (toggleActiveOnly) {
      result = result.filter(member => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const todayEntries = member.entries.filter(e => e.timestamp.startsWith(todayStr));
        const yestEntries = member.entries.filter(e => e.timestamp.startsWith(yesterdayStr));
        if (todayEntries.length > 0) {
          const lastIn = [...todayEntries].reverse().find(e => e.entry_type === 'time_in');
          const lastOut = [...todayEntries].reverse().find(e => e.entry_type === 'time_out');
          if (lastIn && (!lastOut || new Date(lastOut.timestamp) < new Date(lastIn.timestamp))) {
            return true;
          }
        }
        if (yestEntries.length > 0) {
          const lastYestIn = [...yestEntries].reverse().find(e => e.entry_type === 'time_in');
          const lastYestOut = [...yestEntries].reverse().find(e => e.entry_type === 'time_out');
          if (lastYestIn && (!lastYestOut || new Date(lastYestOut.timestamp) < new Date(lastYestIn.timestamp))) {
            const todayOut = todayEntries.find(e => e.entry_type === 'time_out' && new Date(e.timestamp) > new Date(lastYestIn.timestamp));
            if (!todayOut) {
              return true;
            }
          }
        }
        return false;
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(entry => entry.status === statusFilter);
    }

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(entry => 
        entry.name.toLowerCase().includes(searchLower) ||
        entry.employee_id.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return result;
  }, [entries, statusFilter, search, sortConfig, toggleActiveOnly]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedEntries.length / pageSize);
  const paginatedEntries = filteredAndSortedEntries.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 flex max-w-full">
        <div className="relative w-screen max-w-4xl">
          <div className="flex h-full flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white bg-opacity-20">
                    <UserCircleIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Team Time Entries</h2>
                    <p className="text-blue-100 text-sm">Today's attendance and time tracking</p>
        </div>
                  {pendingCorrections.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Tooltip text="Time correction requests that have been approved and are ready to be applied">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 cursor-help">
                          <CheckIcon className="h-3 w-3 mr-1" />
                          {pendingCorrections.length} Approved Correction{pendingCorrections.length !== 1 ? 's' : ''}
        </span>
                      </Tooltip>
                    </div>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-white hover:bg-white hover:bg-opacity-20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              </div>

            {/* Controls Bar */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  {/* Search */}
                  <div className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                      placeholder="Search team members..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                
                  {/* Status Filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
                    >
                    <option value="">All Status</option>
                      <option value="in">Clocked In</option>
                      <option value="out">Clocked Out</option>
                    </select>
                    </div>
                
                <div className="flex items-center space-x-3">
                  {/* Toggle Active Only */}
                  <button
                    onClick={() => setToggleActiveOnly(!toggleActiveOnly)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm ${
                      toggleActiveOnly
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    {toggleActiveOnly ? 'Show All' : 'Active Only'}
                  </button>
                  
                  {/* Refresh Button */}
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <RefreshIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                </div>
              </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {loading && <LoadingSpinner />}
                {error && <ErrorMessage message={error} onRetry={handleRefresh} />}
                {!loading && !error && entries.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <UserCircleIcon className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members Found</h3>
                    <p className="text-gray-500 text-center">There are no team members to display at this time.</p>
                  </div>
                )}
                {!loading && !error && entries.length > 0 && (
                  <div className="space-y-4">
                    {filteredAndSortedEntries.map((member) => (
                      <div
                        key={member.id}
                        className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                      >
                        {/* Member Header */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                                <p className="text-sm text-gray-600">{member.department}</p>
                              </div>
                          </div>
                            <div className="flex items-center space-x-3">
                              <StatusBadge status={member.status} />
                              <button
                                onClick={() => toggleRow(member.id)}
                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                              >
                                {expandedRows[member.id] ? (
                                  <ChevronUpIcon className="h-5 w-5" />
                                ) : (
                                  <ChevronDownIcon className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Member Details */}
                        <div className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500">Employee ID:</span>
                              <span className="font-medium text-gray-900">{member.employee_id}</span>
                                  </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500">Last Activity:</span>
                              <span className="font-medium text-gray-900">{member.lastActivity}</span>
                                    </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500">Total Hours:</span>
                              <span className="font-medium text-gray-900">{member.totalHours}</span>
                                    </div>
                                  </div>
                                </div>

                        {/* Expanded Entries */}
                        {expandedRows[member.id] && member.entries && member.entries.length > 0 && (
                          <div className="border-t border-gray-200 bg-gray-50">
                            <div className="px-6 py-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Time Entries</h4>
                                  <div className="space-y-2">
                                {member.entries.map((entry, index) => (
                                  <div
                                    key={entry.id || index}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className={`w-3 h-3 rounded-full ${
                                        entry.entry_type === 'time_in' ? 'bg-green-500' : 'bg-red-500'
                                      }`}></div>
                                      <span className="text-sm font-medium text-gray-900">
                                        {entry.entry_type === 'time_in' ? 'Time In' : 'Time Out'}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <span className="text-sm text-gray-600">
                                        {format(parseISO(entry.event_time || entry.timestamp), 'MMM dd, yyyy h:mm a')}
                                            </span>
                                      {hasApprovedCorrection(entry.id) && (
                                        <Tooltip text="This entry has an approved correction.">
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                            <CheckIcon className="h-3 w-3 mr-1" />
                                            Approved Correction
                                            </span>
                                        </Tooltip>
                                      )}
                                      <button
                                        onClick={() => handleEditEntry(entry)}
                                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                                        title="Edit time entry"
                                      >
                                        <PencilIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                                      </div>
                                  </div>
                        )}
                      </div>
                    ))}
                        </div>
                )}
                        </div>
                      </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  {lastRefreshed && (
                    <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span>Total members: {entries.length}</span>
                  <span>•</span>
                  <span>Active: {entries.filter(e => e.status === 'in').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <EditTimeEntryModal
        isOpen={editModal.isOpen}
        onClose={handleCloseEditModal}
        entry={editModal.entry}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default TeamTimeEntries;
