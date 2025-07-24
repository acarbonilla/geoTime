import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isToday, differenceInMinutes } from 'date-fns';
// Heroicons v2 imports
import { 
  ClockIcon, 
  UserCircleIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  MagnifyingGlassIcon as SearchIcon,
  ArrowPathIcon as RefreshIcon,
  FunnelIcon as FilterIcon,
  BarsArrowUpIcon as SortAscendingIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../../utils/axiosInstance';

// Status badge component
const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    status === 'in' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800'
  }`}>
    {status === 'in' ? (
      <CheckCircleIcon className="-ml-0.5 mr-1.5 h-3 w-3 text-green-500" />
    ) : (
      <XCircleIcon className="-ml-0.5 mr-1.5 h-3 w-3 text-gray-500" />
    )}
    {status === 'in' ? 'Clocked In' : 'Clocked Out'}
  </span>
);

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

// Error message component
const ErrorMessage = ({ message, onRetry }) => (
  <div className="bg-red-50 border-l-4 border-red-500 p-4">
    <div className="flex">
      <div className="flex-shrink-0">
        <XCircleIcon className="h-5 w-5 text-red-500" />
      </div>
      <div className="ml-3">
        <p className="text-sm text-red-700">{message}</p>
        {onRetry && (
          <div className="mt-2">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <RefreshIcon className="-ml-1 mr-1 h-3 w-3" />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Helper function to group time entries by employee and session
function processTimeEntries(entries) {
  // First, group by employee
  const employees = {};
  
  entries.forEach(entry => {
    if (!employees[entry.employee_id]) {
      employees[entry.employee_id] = {
        id: entry.employee_id,
        name: entry.employee_name,
        employee_id: entry.employee_employee_id,
        entries: [],
        lastEntry: null,
        status: 'out',
        lastTimeIn: null,
        lastTimeOut: null
      };
    }
    
    // Add the entry to the employee's entries
    employees[entry.employee_id].entries.push(entry);
    
    // Update the last entry
    if (!employees[entry.employee_id].lastEntry || 
        new Date(entry.timestamp) > new Date(employees[entry.employee_id].lastEntry.timestamp)) {
      employees[entry.employee_id].lastEntry = entry;
      
      // Update status based on last entry type
      if (entry.entry_type === 'time_in') {
        employees[entry.employee_id].status = 'in';
        employees[entry.employee_id].lastTimeIn = entry.timestamp;
      } else if (entry.entry_type === 'time_out') {
        employees[entry.employee_id].status = 'out';
        employees[entry.employee_id].lastTimeOut = entry.timestamp;
      }
    }
  });
  
  // Convert to array and sort by name
  return Object.values(employees).sort((a, b) => 
    a.name.localeCompare(b.name)
  );
}

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
  
  // State for refresh control
  const [lastRefreshed, setLastRefreshed] = useState(null);
  
  // State for toggle between Active Only and All Today
  const [toggleActiveOnly, setToggleActiveOnly] = useState(false);

  // Calculate total hours worked for an employee
  const calculateTotalHours = useCallback((entries) => {
    if (!entries || entries.length < 2) return '0.00';
    
    let totalMinutes = 0;
    let timeIn = null;
    
    // Sort entries by timestamp
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Calculate total time worked by pairing time-in with time-out
    for (const entry of sortedEntries) {
      if (entry.entry_type === 'time_in') {
        timeIn = new Date(entry.timestamp);
      } else if (entry.entry_type === 'time_out' && timeIn) {
        const timeOut = new Date(entry.timestamp);
        totalMinutes += differenceInMinutes(timeOut, timeIn);
        timeIn = null; // Reset timeIn after calculating a session
      }
    }
    
    // If last entry is time_in (still clocked in), count until now
    if (timeIn) {
      totalMinutes += differenceInMinutes(new Date(), timeIn);
    }
    
    // Convert minutes to hours with 2 decimal places
    return (totalMinutes / 60).toFixed(2);
  }, []);

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
      const today = new Date();
      const todayFormatted = today.toISOString().split('T')[0];
      
      // Get time entries for all team members
      // const timeEntriesUrl = `time-entries/?date=${todayFormatted}`;
      const timeEntriesUrl = `time-entries/team_today/`;
      
      let entriesRes;
      let timeEntriesArray = [];
      try {
        entriesRes = await axiosInstance.get(timeEntriesUrl);

        // Support both new ({ entries: [...] }) and old (array) backend responses
        if (Array.isArray(entriesRes.data)) {
          timeEntriesArray = entriesRes.data;
        } else if (entriesRes.data && Array.isArray(entriesRes.data.entries)) {
          timeEntriesArray = entriesRes.data.entries;
        } else {
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
          lastActivity: lastEntry ? format(parseISO(lastEntry.timestamp), 'h:mm a') : 'N/A',
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

  // Initial data fetch
  useEffect(() => {
    if (isOpen) {
      fetchTeamTimeEntries().catch(err => {
        console.error('Error in fetchTeamTimeEntries:', err);
      });
    } else {
      // console.log('Component is closed, not fetching data'); // Removed console.log
    }
  }, [isOpen, fetchTeamTimeEntries]);

  useEffect(() => {
    if (entries.length > 0) {
      console.log('TeamTimeEntries debug:', entries);
    }
  }, [entries]);

  // Handle refresh
  const handleRefresh = () => {
    fetchTeamTimeEntries();
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

  // Debug logging
  // console.log('filteredAndSortedEntries:', filteredAndSortedEntries); // Removed console.log
  // console.log('paginatedEntries:', paginatedEntries); // Removed console.log
  // console.log('totalPages:', totalPages); // Removed console.log
  // console.log('page:', page); // Removed console.log
  // console.log('pageSize:', pageSize); // Removed console.log

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <div className="flex justify-between items-center mb-4 pr-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Team Time Entries
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleRefresh}
                    className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    title="Refresh"
                  >
                    <RefreshIcon className="h-5 w-5" />
                  </button>
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="p-2 text-gray-500 hover:text-red-600 focus:outline-none"
                      aria-label="Close"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Toggle for Active Only / All Today */}
              <div className="mb-4 flex items-center space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={toggleActiveOnly}
                    onChange={e => setToggleActiveOnly(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-green-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 font-medium">Active Only</span>
                </label>
                <span className="text-xs text-gray-400">Show only currently active employees</span>
              </div>

              {/* Filters and Search */}
              <div className="flex flex-col sm:flex-row justify-between mb-4 space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                    placeholder="Search employees..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <div className="relative">
                    <select
                      className="block appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="in">Clocked In</option>
                      <option value="out">Clocked Out</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Last updated */}
              {lastRefreshed && (
                <p className="text-xs text-gray-500 mb-4">
                  Last updated: {format(new Date(lastRefreshed), 'MMM d, yyyy h:mm a')}
                </p>
              )}

              {/* Error message */}
              {error && !loading && (
                <ErrorMessage 
                  message={error} 
                  onRetry={fetchTeamTimeEntries} 
                />
              )}

              {/* Loading state */}
              {loading ? (
                <LoadingSpinner />
              ) : (
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => requestSort('name')}
                        >
                          <div className="flex items-center">
                            Employee
                            {sortConfig.key === 'name' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          ID
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Department
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          onClick={() => requestSort('status')}
                        >
                          <div className="flex items-center cursor-pointer">
                            Status
                            {sortConfig.key === 'status' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Time Today
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Last Activity
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedEntries.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                            {search || statusFilter !== 'all' 
                              ? 'No matching team members found' 
                              : 'No team members found. Total entries: ' + entries.length + ', Filtered: ' + filteredAndSortedEntries.length}
                          </td>
                        </tr>
                      ) : (
                        paginatedEntries.map((member) => (
                          <React.Fragment key={member.id}>
                            <tr 
                              className={`hover:bg-gray-50 cursor-pointer ${expandedRows[member.id] ? 'bg-gray-50' : ''}`}
                              onClick={() => toggleRow(member.id)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <UserCircleIcon className="h-10 w-10 text-gray-400" />
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {member.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {member.role}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.employee_id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.department}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={member.status} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.totalHours} hrs
                              </td>
                              <td className="px-6 py-4">
                                {member.lastEntry ? (
                                  <div className="space-y-2">
                                    {/* Status and last activity */}
                                    <div className="flex items-center">
                                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                        member.status === 'in' ? 'bg-green-500' : 'bg-gray-400'
                                      }`}></span>
                                      <span className="font-medium">
                                        {member.status === 'in' ? 'Clocked In' : 'Clocked Out'}
                                      </span>
                                      <span className="ml-2 text-xs text-gray-500">
                                        {format(new Date(member.lastEntry.timestamp), 'MMM d, h:mm a')}
                                      </span>
                                    </div>
                                    
                                    {/* Time entries list */}
                                    <div className="ml-4 space-y-1">
                                      {member.entries && member.entries.length > 0 ? (
                                        member.entries.map((entry, idx) => (
                                          <div key={idx} className="flex items-center text-sm">
                                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                              entry.entry_type === 'time_in' ? 'bg-green-500' : 'bg-purple-500'
                                            }`}></span>
                                            <span className="font-medium">
                                              {entry.entry_type === 'time_in' ? 'In' : 'Out'}:
                                            </span>
                                            <span className="ml-1 text-gray-700">
                                              {format(new Date(entry.timestamp), 'h:mm a')}
                                            </span>
                                            <span className="ml-2 text-xs text-gray-500">
                                              {format(new Date(entry.timestamp), 'MMM d')}
                                            </span>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-xs text-gray-400">No time entries found</div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-sm">No activity recorded</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRow(member.id);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  {expandedRows[member.id] ? (
                                    <ChevronUpIcon className="h-5 w-5" />
                                  ) : (
                                    <ChevronDownIcon className="h-5 w-5" />
                                  )}
                                </button>
                              </td>
                            </tr>
                            
                            {/* Expanded row with time entries */}
                            {expandedRows[member.id] && (
                              <tr className="bg-gray-50">
                                <td colSpan="7" className="px-6 py-4">
                                  <div className="pl-14">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                                      Time Entries ({member.entryCount})
                                    </h4>
                                    {member.entries.length > 0 ? (
                                      <div className="overflow-hidden border border-gray-200 rounded-md">
                                        <table className="min-w-full divide-y divide-gray-200">
                                          <thead className="bg-gray-50">
                                            <tr>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Time
                                              </th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Type
                                              </th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Location
                                              </th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Notes
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-white divide-y divide-gray-200">
                                            {member.entries.map((entry, index) => (
                                              <tr key={index}>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                  {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    entry.entry_type === 'time_in' 
                                                      ? 'bg-green-100 text-green-800' 
                                                      : 'bg-purple-100 text-purple-800'
                                                  }`}>
                                                    {entry.entry_type === 'time_in' ? 'Time In' : 'Time Out'}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                  {entry.location?.name || 'N/A'}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-500">
                                                  {entry.notes || '-'}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500">No time entries found for today</p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                            page === 1 ? 'bg-gray-100 text-gray-400' : 'text-gray-700 bg-white hover:bg-gray-50'
                          }`}
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                            page === totalPages ? 'bg-gray-100 text-gray-400' : 'text-gray-700 bg-white hover:bg-gray-50'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{' '}
                            <span className="font-medium">
                              {Math.min(page * pageSize, filteredAndSortedEntries.length)}
                            </span>{' '}
                            of <span className="font-medium">{filteredAndSortedEntries.length}</span> results
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                              disabled={page === 1}
                              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                                page === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              <span className="sr-only">Previous</span>
                              <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                            
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              // Show pages around current page
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (page <= 3) {
                                pageNum = i + 1;
                              } else if (page >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = page - 2 + i;
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setPage(pageNum)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    page === pageNum
                                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            
                            <button
                              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                              disabled={page === totalPages}
                              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                                page === totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              <span className="sr-only">Next</span>
                              <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamTimeEntries;
