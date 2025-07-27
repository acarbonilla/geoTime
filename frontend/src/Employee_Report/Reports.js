import React, { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import RequestTimeCorrectionDrawer from './RequestTimeCorrectionDrawer';
// import MyTimeCorrectionRequests from './MyTimeCorrectionRequests';
import { FaFilter, FaFileCsv, FaFileExcel, FaFilePdf, FaCalendarAlt, FaUserClock } from 'react-icons/fa';
import { Tooltip as ReactTooltip } from 'react-tooltip';

// Commented out unused components to reduce bundle size
/*
const Spinner = () => (
  <div className="flex justify-center items-center py-8">
    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12V6z"></path>
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
*/

const Reports = () => {
  // State for time entries and filtering
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  
  // Filter form state
  const [filterForm, setFilterForm] = useState({
    timeEntriesStartDate: '',
    timeEntriesEndDate: '',
    timeEntriesType: 'all'
  });
  
  // State for pagination and UI
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  // Commented out unused state variables
  // const [activeTab, setActiveTab] = useState('timeEntries');
  const [isCorrectionDrawerOpen, setIsCorrectionDrawerOpen] = useState(false);
  // State for UI control
  const [showTable, setShowTable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  // Remove employee state and related API call
  // const [employee, setEmployee] = useState(null);
  // const [pageSize, setPageSize] = useState(20);
  // const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
  
  // Add state for active tab and requests
  const [activeTab, setActiveTab] = useState('entries'); // 'entries' or 'requests'
  const [myRequests, setMyRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Commented out unused handler
  /*
  const handleOpenCorrectionDrawer = () => {
    setIsCorrectionDrawerOpen(true);
  };
  */
  
  const handleCloseCorrectionDrawer = () => {
    setIsCorrectionDrawerOpen(false);
  };
  
  const handleRequestSubmitted = useCallback(() => {
    setIsCorrectionDrawerOpen(false);
    // Refresh the requests list if on requests tab
    if (activeTab === 'requests') {
      setRequestsLoading(true);
      axiosInstance.get('/time-correction-requests/')
        .then(res => setMyRequests(res.data.results || res.data))
        .catch(() => setMyRequests([]))
        .finally(() => setRequestsLoading(false));
    }
  }, [activeTab]);
  
  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Fetch entries for the new page
    fetchTimeEntries();
  };
  
  const handleEntriesPerPageChange = (e) => {
    const newEntriesPerPage = Number(e.target.value);
    setEntriesPerPage(newEntriesPerPage);
    setCurrentPage(1);
    // Fetch entries with the new page size
    fetchTimeEntries();
  };
  
  // Initialize component
  // Filter form change handler
  const handleFilterFormChange = (e) => {
    const { name, value } = e.target;
    setFilterForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply filters for time entries
  const handleApplyTimeEntriesFilters = () => {
    // Apply the filters and refresh the data
    setCurrentPage(1);
    fetchTimeEntries();
  };

  // Pagination
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);

  // Format date and time for display and export
  const formatExportDateTime = (timestamp) => {
    if (!timestamp) return { date: '', time: '' };
    
    try {
      // Handle both ISO format and other date strings
      const dt = timestamp.includes('T') ? new Date(timestamp) : new Date(timestamp + 'T00:00:00');
      if (isNaN(dt)) return { date: '', time: '' };
      
      const date = dt.toLocaleDateString('en-CA');
      const time = dt.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true,
        timeZone: 'Asia/Manila' 
      });
      return { date, time };
    } catch (e) {
      console.error('Error formatting date:', e);
      return { date: '', time: '' };
    }
  };

  // Export to Excel
  const exportExcel = () => {
    try {
      const data = filteredEntries.map(entry => {
        const { date, time } = formatExportDateTime(entry.timestamp);
        const entryType = entry.entry_type === 'time_in' ? 'Time In' : 
                        entry.entry_type === 'time_out' ? 'Time Out' : 
                        entry.entry_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        return {
          'Name': entry.employee_name || 'You',
          'Entry Type': entryType,
          'Date': date,
          'Time': time,
          'Location': entry.location_name || '',
          'Overtime': entry.overtime || '',
          'Notes': entry.notes || '',
          'Coordinates': entry.latitude && entry.longitude ? `${entry.latitude}, ${entry.longitude}` : ''
        };
      });
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Entries');
      
      XLSX.writeFile(workbook, `time-entries-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel. Please try again.');
    }
  };

  // Export to PDF
  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      const title = 'Time Entries Report';
      const headers = [['Name', 'Type', 'Date', 'Time', 'Location']];
      
      const data = filteredEntries.map(entry => {
        const { date, time } = formatExportDateTime(entry.timestamp);
        const entryType = entry.entry_type === 'time_in' ? 'Time In' : 
                        entry.entry_type === 'time_out' ? 'Time Out' : 
                        entry.entry_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        return [
          entry.employee_name || 'You',
          entryType,
          date,
          time,
          entry.location_name || ''
        ];
      });
      
      // Add title
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      
      // Add date range and filters info
      doc.setFontSize(11);
      doc.setTextColor(100);
      
      let dateRange = 'All time';
      if (filterForm.timeEntriesStartDate || filterForm.timeEntriesEndDate) {
        const start = filterForm.timeEntriesStartDate || 'Start';
        const end = filterForm.timeEntriesEndDate || 'End';
        dateRange = `${start} to ${end}`;
      }
      
      let entryType = 'All Types';
      if (filterForm.timeEntriesType && filterForm.timeEntriesType !== 'all') {
        entryType = filterForm.timeEntriesType
          .replace('_', ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
      
      doc.text(`Date Range: ${dateRange}`, 14, 30);
      doc.text(`Entry Type: ${entryType}`, 14, 38);
      
      // Add table
      autoTable(doc, {
        head: headers,
        body: data,
        startY: 50,
        styles: { 
          fontSize: 10,
          cellPadding: 3,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 50 }
      });
      
      doc.save(`time-entries-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Fetch time entries from the API
  const fetchTimeEntries = useCallback(async () => {
    let isMounted = true;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Add time entries filters
      if (filterForm.timeEntriesStartDate) params.append('start_date', filterForm.timeEntriesStartDate);
      if (filterForm.timeEntriesEndDate) params.append('end_date', filterForm.timeEntriesEndDate);
      if (filterForm.timeEntriesType !== 'all') params.append('entry_type', filterForm.timeEntriesType);
      
      // Add pagination
      params.append('page', currentPage);
      params.append('page_size', entriesPerPage);
      
      const response = await axiosInstance.get(`/time-entries/?${params.toString()}`);
      if (isMounted) {
        setEntries(response.data.results || response.data);
        setFilteredEntries(response.data.results || response.data);
        setTotalPages(Math.ceil((response.data.count || response.data.length) / entriesPerPage));
        setShowTable(true);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
      if (isMounted) {
        setEntries([]);
        setFilteredEntries([]);
        setShowTable(false);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, [currentPage, entriesPerPage, filterForm.timeEntriesEndDate, filterForm.timeEntriesStartDate, filterForm.timeEntriesType]);

  // Initialize data fetch
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setPageLoading(true);
        // Only fetch time entries
        await fetchTimeEntries();
      } catch (error) {
        console.error('Error initializing data:', error);
        if (isMounted) {
          setEntries([]);
          setFilteredEntries([]);
          setShowTable(false);
        }
      } finally {
        if (isMounted) {
          setPageLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [fetchTimeEntries]);

  // Fetch my time correction requests when tab is activated
  useEffect(() => {
    if (activeTab === 'requests' && myRequests.length === 0 && !requestsLoading) {
      setRequestsLoading(true);
      axiosInstance.get('/time-correction-requests/')
        .then(res => setMyRequests(res.data.results || res.data))
        .catch(() => setMyRequests([]))
        .finally(() => setRequestsLoading(false));
    }
  }, [activeTab, myRequests.length, requestsLoading]);

  // The formatExportDateTime function is already defined above
  const exportToCSV = () => {
    try {
      const headers = ['Employee', 'Type', 'Date', 'Time', 'Location', 'Overtime', 'Notes', 'Coordinates'];
      const rows = filteredEntries.map(entry => {
        const date = formatDate(entry.timestamp);
        const time = formatTime(entry.timestamp);
        return [
          entry.employee_name || 'You',
          entry.entry_type === 'time_in' ? 'Time In' : 'Time Out',
          date,
          time,
          entry.location_name || '',
          entry.overtime || '',
          entry.notes || '',
          entry.latitude && entry.longitude ? `${entry.latitude}, ${entry.longitude}` : ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      });
      
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `time-entries-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  // Enhanced pagination rendering
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Previous button
    pages.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
    );
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 text-sm font-medium border ${
            currentPage === i
              ? 'bg-blue-50 border-blue-500 text-blue-600'
              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      );
    }
    
    // Next button
    pages.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    );
    
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-700">
          Showing {((currentPage - 1) * entriesPerPage) + 1} to {Math.min(currentPage * entriesPerPage, filteredEntries.length)} of {filteredEntries.length} entries
        </div>
        <div className="flex">{pages}</div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-2 py-6 md:px-4 md:py-8">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden transition-shadow duration-300 hover:shadow-2xl">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
          <button
            className={`px-6 py-4 text-lg font-semibold focus:outline-none transition-all duration-200 ${activeTab === 'entries' ? 'border-b-4 border-blue-600 text-blue-700 bg-white' : 'text-gray-500 hover:text-blue-600'}`}
            onClick={() => setActiveTab('entries')}
          >
            Time Entries
          </button>
          <button
            className={`px-6 py-4 text-lg font-semibold focus:outline-none transition-all duration-200 relative ${activeTab === 'requests' ? 'border-b-4 border-blue-600 text-blue-700 bg-white' : 'text-gray-500 hover:text-blue-600'}`}
            onClick={() => setActiveTab('requests')}
          >
            My Time Correction Requests
            {myRequests.length > 0 && (
              <span className="ml-2 inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full align-middle">{myRequests.length}</span>
            )}
          </button>
        </div>
        {/* Tab content */}
        {activeTab === 'entries' && (
          <>
            {/* Filters, export, table, pagination as before */}
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <FaUserClock className="text-blue-500 text-2xl" />
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">Time Entries Report</h1>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
                >
                  <FaFileCsv /> CSV
                </button>
                <button
                  onClick={exportExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                >
                  <FaFileExcel /> Excel
                </button>
                <button
                  onClick={exportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
                >
                  <FaFilePdf /> PDF
                </button>
              </div>
            </div>
            {/* Filter controls */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-white border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <FaFilter className="text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-700">Filters</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FaCalendarAlt className="inline text-blue-400" />Start Date</label>
                  <input
                    type="date"
                    name="timeEntriesStartDate"
                    value={filterForm.timeEntriesStartDate}
                    onChange={handleFilterFormChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FaCalendarAlt className="inline text-blue-400" />End Date</label>
                  <input
                    type="date"
                    name="timeEntriesEndDate"
                    value={filterForm.timeEntriesEndDate}
                    onChange={handleFilterFormChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entry Type</label>
                  <select
                    name="timeEntriesType"
                    value={filterForm.timeEntriesType}
                    onChange={handleFilterFormChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="all">All Entries</option>
                    <option value="time_in">Time In</option>
                    <option value="time_out">Time Out</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleApplyTimeEntriesFilters}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                >
                  <FaFilter /> Apply Filters
                </button>
              </div>
            </div>
            {/* Time entries table */}
            <div className="overflow-x-auto bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Overtime</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Coordinates</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentEntries.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center animate-fade-in">
                        No time entries found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    currentEntries.map((entry, idx) => {
                      const date = formatDate(entry.timestamp);
                      const formattedTime = formatTime(entry.timestamp);
                      return (
                        <tr
                          key={entry.id}
                          className={`transition-colors duration-200 hover:bg-blue-50 animate-fade-in ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                          style={{ animationDelay: `${idx * 40}ms` }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.employee_name || 'You'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${entry.entry_type === 'time_in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{entry.entry_type === 'time_in' ? 'Time In' : 'Time Out'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formattedTime}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.location_name || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.overtime || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            <span data-tooltip-id={`note-tooltip-${entry.id}`}>{entry.notes || '—'}</span>
                            {entry.notes && (
                              <ReactTooltip id={`note-tooltip-${entry.id}`} place="top" effect="solid">
                                {entry.notes}
                              </ReactTooltip>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.latitude && entry.longitude ? (
                              <a
                                href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline transition-colors duration-200"
                              >
                                View on Map
                              </a>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {renderPagination()}
          </>
        )}
        {activeTab === 'requests' && (
          <div className="p-6 bg-gradient-to-r from-blue-50 to-white min-h-[300px] animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-blue-700 flex items-center gap-2"><FaUserClock /> My Time Correction Requests</h2>
              <button
                onClick={() => setIsCorrectionDrawerOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
              >
                + Request Time Correction
              </button>
            </div>
            {requestsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : myRequests.length === 0 ? (
              <div className="text-center text-gray-400 py-12">No time correction requests found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myRequests.map((req, idx) => (
                  <div key={req.id} className="bg-white rounded-xl shadow-md p-5 border border-blue-100 transition-transform duration-200 hover:scale-[1.02] animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</span>
                      <span className="text-xs text-gray-400 ml-auto">{req.created_at ? new Date(req.created_at).toLocaleDateString() : ''}</span>
                    </div>
                    <div className="mb-1 text-sm text-gray-700 font-semibold">{req.request_type ? req.request_type.replace('_', ' ').toUpperCase() : 'Request'}</div>
                    <div className="mb-2 text-xs text-gray-500">For: <span className="font-medium">{req.date || req.for_date || ''}</span></div>
                    <div className="mb-2 text-xs text-gray-500">Reason: <span className="font-medium">{req.reason || req.notes || '—'}</span></div>
                    {req.admin_notes && (
                      <div className="mb-2 text-xs text-blue-500">Admin Notes: {req.admin_notes}</div>
                    )}
                    <div className="flex gap-2 mt-2">
                      {/* Add more actions if needed */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Time Correction Request Drawer */}
      <RequestTimeCorrectionDrawer
        open={isCorrectionDrawerOpen}
        onClose={handleCloseCorrectionDrawer}
        onRequestSubmitted={handleRequestSubmitted}
      />
    </div>
  );
};

export default Reports;