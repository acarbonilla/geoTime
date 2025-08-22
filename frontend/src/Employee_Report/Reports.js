import React, { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FaFilter, FaFileCsv, FaFileExcel, FaFilePdf, FaUserClock } from 'react-icons/fa';
import { Tooltip as ReactTooltip } from 'react-tooltip';

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
  
  @keyframes bounceIn {
    0% { opacity: 0; transform: scale(0.3); }
    50% { opacity: 1; transform: scale(1.05); }
    70% { transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.6s ease-out;
  }
  
  .animate-slide-in {
    animation: slideIn 0.4s ease-out;
  }
  
  .animate-scale-in {
    animation: scaleIn 0.3s ease-out;
  }
  
  .animate-bounce-in {
    animation: bounceIn 0.6s ease-out;
  }
  
  .animate-slide-up {
    animation: slideUp 0.5s ease-out;
  }
  
  .hover-lift {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  }
  
  .button-pulse {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .button-pulse:hover {
    transform: scale(1.05);
  }
  
  .table-row-hover {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .table-row-hover:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }
  
  .card-glow {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .card-glow:hover {
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.2);
  }
  
  .gradient-bg {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  .gradient-text {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

// Inject custom styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  document.head.appendChild(styleElement);
}

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
  const [filteredEntries, setFilteredEntries] = useState([]);
  
  // Filter form state
  const [filterForm, setFilterForm] = useState({
    timeEntriesType: 'all'
  });
  
  // State for pagination and UI
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  // State for UI control
  const [filtersLoading, setFiltersLoading] = useState(false);

  // Remove employee state and related API call
  // const [employee, setEmployee] = useState(null);
  // const [pageSize, setPageSize] = useState(20);
  // const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
  
  // Only entries tab now
  // const [activeTab] = useState('entries');





  // Summary statistics functions
  const getSummaryStats = () => {
    const totalEntries = filteredEntries.length;
    const timeInCount = filteredEntries.filter(e => e.entry_type === 'time_in').length;
    const timeOutCount = filteredEntries.filter(e => e.entry_type === 'time_out').length;
    const totalOvertime = filteredEntries.reduce((sum, e) => sum + (e.overtime || 0), 0);
    const entriesWithNotes = filteredEntries.filter(e => e.notes && e.notes.trim()).length;
    const entriesWithLocation = filteredEntries.filter(e => e.latitude && e.longitude).length;

    return {
      totalEntries,
      timeInCount,
      timeOutCount,
      totalOvertime: parseFloat(totalOvertime.toFixed(2)),
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
      { Metric: 'Entries with Notes', Value: stats.entriesWithNotes },
      { Metric: 'Entries with Location', Value: stats.entriesWithLocation },
      { Metric: 'Filter Applied', Value: 'All Time' }
    ];

    const ws = XLSX.utils.json_to_sheet(summaryData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary Statistics');
    XLSX.writeFile(wb, 'my_time_entries_summary.xlsx');
  };

  const exportSummaryPDF = () => {
    const stats = getSummaryStats();
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('My Time Entries Summary Report', 14, 20);
    
    // Filter info
    doc.setFontSize(12);
    doc.text(`Filter: All Time`, 14, 30);
    
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
        ['Entries with Notes', stats.entriesWithNotes.toString()],
        ['Entries with Location', stats.entriesWithLocation.toString()]
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save('my_time_entries_summary.pdf');
  };
  
  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // The useEffect will automatically trigger fetchTimeEntries when currentPage changes
  };
  

  
  // Initialize component
  // Filter form change handler
  const handleFilterFormChange = (e) => {
    const { name, value } = e.target;
    console.log('🔧 Filter changed:', name, value);
    
    setFilterForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply filters for time entries
  const handleApplyTimeEntriesFilters = () => {
    console.log('🚀 Applying filters manually:', filterForm);
    // Apply the filters and refresh the data
    setCurrentPage(1);
    
    // The useEffect will automatically trigger fetchTimeEntries when filters change
  };

  // Reset filters to default
  const handleResetFilters = () => {
    // Reset to default filter
    setFilterForm(prev => ({
      ...prev,
      timeEntriesType: 'all'
    }));
    
    setCurrentPage(1);
    
    // The useEffect will automatically trigger fetchTimeEntries when filters change
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
      
      // Add filter info
      doc.setFontSize(11);
      doc.setTextColor(100);
      
      let entryType = 'All Types';
      if (filterForm.timeEntriesType && filterForm.timeEntriesType !== 'all') {
        entryType = filterForm.timeEntriesType
          .replace('_', ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
      
      doc.text(`Entry Type: ${entryType}`, 14, 30);
      
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

  // Check if JWT token is expired
  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // Assume expired if we can't decode
    }
  };

  // Fetch time entries from the API - ONLY for the current authenticated user
  const fetchTimeEntries = useCallback(async () => {
    let isMounted = true;
    
    // Check if user is authenticated
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('❌ No access token found. User not authenticated.');
      console.log('🔑 Redirecting to login...');
      window.location.href = '/login';
      return;
    }
    
    // Check if token is expired
    if (isTokenExpired(token)) {
      console.error('❌ Access token has expired.');
      console.log('🔑 Redirecting to login...');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      return;
    }
    
    setFiltersLoading(true);
    
    try {
      const params = new URLSearchParams();
      
      // Add time entries filters
      if (filterForm.timeEntriesType !== 'all') {
        params.append('entry_type', filterForm.timeEntriesType);
        console.log('🔧 Added entry_type:', filterForm.timeEntriesType);
      }
      
      // Add pagination
      params.append('page', currentPage);
      params.append('page_size', entriesPerPage);
      
      console.log('🔍 Fetching time entries with params:', params.toString());
      console.log('🔧 Filter type:', filterForm.timeEntriesType);
      console.log('🌐 Full API URL:', `/time-entries/?${params.toString()}`);
      
      // Check if user is authenticated
      const token = localStorage.getItem('access_token');
      console.log('🔑 Authentication check:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token'
      });
      
      // Use the correct endpoint - backend automatically filters by current user
      const response = await axiosInstance.get(`/time-entries/?${params.toString()}`);
      if (isMounted) {
        console.log('✅ API Response:', response.data);
        console.log('📊 Results count:', response.data.results?.length || response.data.length);
        console.log('📋 First few results:', response.data.results?.slice(0, 3) || response.data.slice(0, 3));
        setFilteredEntries(response.data.results || response.data);
        setTotalPages(Math.ceil((response.data.count || response.data.length) / entriesPerPage));
      }
    } catch (error) {
      console.error('❌ Error fetching time entries:', error);
      console.error('🔍 Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          params: error.config?.params
        }
      });
      if (isMounted) {
        setFilteredEntries([]);
      }
    } finally {
      if (isMounted) {
        setFiltersLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, [filterForm.timeEntriesType, currentPage, entriesPerPage]);

  // Initialize data fetch - only run once on component mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        // Only fetch time entries on initial load
        await fetchTimeEntries();
      } catch (error) {
        console.error('Error initializing data:', error);
        if (isMounted) {
          setFilteredEntries([]);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array for initial load only

  // Effect to refetch data when filters change
  useEffect(() => {
    if (filterForm.timeEntriesType !== 'all') {
      console.log('🔄 Filters changed, refetching data...');
      setCurrentPage(1); // Reset to first page when filters change
      fetchTimeEntries();
    }
  }, [filterForm.timeEntriesType, fetchTimeEntries]);

  // Effect to refetch data when page changes
  useEffect(() => {
    if (currentPage > 1) { // Skip initial load
      console.log('📄 Page changed to', currentPage, ', refetching data...');
      fetchTimeEntries();
    }
  }, [currentPage, fetchTimeEntries]);

  // Remove the auto-refetch useEffect that was causing race conditions
  // Filters will now only be applied when explicitly triggered by user actions

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
    <div className="w-full max-w-7xl mx-auto px-2 py-6 md:px-4 md:py-8 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-500 hover:shadow-xl animate-fade-in">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 bg-white animate-slide-in">
          <button
            className="px-6 py-4 text-lg font-semibold focus:outline-none transition-all duration-300 relative overflow-hidden group text-gray-800 bg-gray-50 border-b-4 border-blue-600 shadow-sm"
          >
            <span className="relative z-10 flex items-center gap-2">
              <FaUserClock className="text-xl text-blue-600" />
              Time Entries
            </span>
            <div className="absolute inset-0 bg-blue-50 animate-pulse"></div>
          </button>
        </div>
        {/* Tab content */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full backdrop-blur-sm animate-bounce-in">
              <FaUserClock className="text-blue-600 text-2xl" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Time Entries Report</h1>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 md:mt-0">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 button-pulse animate-bounce-in"
              style={{ animationDelay: '0.1s' }}
            >
              <FaFileCsv className="text-lg" /> CSV
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 button-pulse animate-bounce-in"
              style={{ animationDelay: '0.2s' }}
            >
              <FaFileExcel className="text-lg" /> Excel
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-red-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 button-pulse animate-bounce-in"
              style={{ animationDelay: '0.3s' }}
            >
              <FaFilePdf className="text-lg" /> PDF
            </button>
            <button
              onClick={exportSummary}
              disabled={filteredEntries.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-purple-600 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 button-pulse animate-bounce-in disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ animationDelay: '0.4s' }}
            >
              <FaFileExcel className="text-lg" /> Summary
            </button>
            <button
              onClick={exportSummaryPDF}
              disabled={filteredEntries.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 button-pulse animate-bounce-in disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ animationDelay: '0.5s' }}
            >
              <FaFilePdf className="text-lg" /> Summary PDF
            </button>
          </div>
        </div>
        {/* Main content area */}
        <div>
          {/* Filter controls */}
          <div className="p-6 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 border-b border-gray-200 animate-slide-up">
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                   <FaFilter className="text-white text-lg" />
                 </div>
                 <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">Advanced Filters</h2>
               </div>
              
                             <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                 <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                   <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                     <div className="p-1 bg-purple-100 rounded">
                       <FaFilter className="text-purple-600 text-sm" />
                     </div>
                     Entry Type
                   </label>
                   <select
                     name="timeEntriesType"
                     value={filterForm.timeEntriesType}
                     onChange={handleFilterFormChange}
                     className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-300 shadow-sm hover:shadow-md"
                   >
                     <option value="all">All Entries</option>
                     <option value="time_in">Time In</option>
                     <option value="time_out">Time Out</option>
                   </select>
                 </div>
               </div>
                                                           <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      console.log('🔄 Manual refresh clicked');
                      fetchTimeEntries();
                    }}
                    className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-200 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 button-pulse animate-bounce-in"
                    style={{ animationDelay: '0.3s' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="font-semibold">Refresh Data</span>
                  </button>
                                     <button
                     onClick={handleResetFilters}
                     className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 button-pulse animate-bounce-in"
                     style={{ animationDelay: '0.3s' }}
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                     </svg>
                     <span className="font-semibold">Reset Filters</span>
                   </button>
                   <button
                     onClick={handleApplyTimeEntriesFilters}
                     className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 button-pulse animate-bounce-in"
                     style={{ animationDelay: '0.4s' }}
                   >
                     <FaFilter className="text-lg" /> 
                     <span className="font-semibold">Apply Filters</span>
                   </button>
                </div>
              </div>


                         {/* Summary Statistics */}
             {filteredEntries.length > 0 && (
               <div className="p-6 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 border-b border-gray-200 animate-slide-up">
                 {filtersLoading && (
                   <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700">
                     <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                     </svg>
                     <span className="text-sm font-medium">Applying filters...</span>
                   </div>
                 )}
                 <div className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-3">
                   <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                     </svg>
                   </div>
                   Summary Statistics
                 </div>
                                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                   {(() => {
                     const stats = getSummaryStats();
                     return (
                       <>
                         <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4 text-center hover-lift card-glow animate-bounce-in" style={{ animationDelay: '0.1s' }}>
                           <div className="text-3xl font-bold text-blue-600 mb-1">{stats.totalEntries}</div>
                           <div className="text-sm font-semibold text-blue-700">Total Entries</div>
                         </div>
                         <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-4 text-center hover-lift card-glow animate-bounce-in" style={{ animationDelay: '0.2s' }}>
                           <div className="text-3xl font-bold text-green-600 mb-1">{stats.timeInCount}</div>
                           <div className="text-sm font-semibold text-green-700">Time In</div>
                         </div>
                         <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-4 text-center hover-lift card-glow animate-bounce-in" style={{ animationDelay: '0.3s' }}>
                           <div className="text-3xl font-bold text-red-600 mb-1">{stats.timeOutCount}</div>
                           <div className="text-sm font-semibold text-red-700">Time Out</div>
                         </div>
                         <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-4 text-center hover-lift card-glow animate-bounce-in" style={{ animationDelay: '0.4s' }}>
                           <div className="text-3xl font-bold text-orange-600 mb-1">{stats.totalOvertime}h</div>
                           <div className="text-sm font-semibold text-orange-700">Total OT</div>
                         </div>
                         <div className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-200 rounded-xl p-4 text-center hover-lift card-glow animate-bounce-in" style={{ animationDelay: '0.5s' }}>
                           <div className="text-2xl font-bold text-teal-600 mb-1">{stats.averageOvertime}h</div>
                           <div className="text-sm font-semibold text-teal-700">Avg OT/Entry</div>
                         </div>
                         <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-4 text-center hover-lift card-glow animate-bounce-in" style={{ animationDelay: '0.6s' }}>
                           <div className="text-2xl font-bold text-purple-600 mb-1">{stats.entriesWithNotes}</div>
                           <div className="text-sm font-semibold text-purple-700">With Notes</div>
                         </div>
                       </>
                     );
                   })()}
                 </div>
                                 <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                   <div className="bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-200 rounded-xl p-3 text-center hover-lift card-glow animate-bounce-in" style={{ animationDelay: '0.7s' }}>
                     <div className="text-xl font-bold text-pink-600 mb-1">{(() => {
                       const stats = getSummaryStats();
                       return stats.entriesWithLocation;
                     })()}</div>
                     <div className="text-sm font-semibold text-pink-700">With Location</div>
                   </div>
                   <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-xl p-3 text-center hover-lift card-glow animate-bounce-in" style={{ animationDelay: '0.8s' }}>
                     <div className="text-lg font-bold text-indigo-600 mb-1">All Time</div>
                     <div className="text-sm font-semibold text-indigo-700">Filter Applied</div>
                   </div>
                 </div>
              </div>
            )}

            {/* Time entries table */}
            <div className="overflow-x-auto bg-white">
              {/* Table Header with Count */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 animate-slide-up">
                <div className="flex items-center justify-between">
                  <div className="text-gray-800 font-semibold flex items-center gap-2">
                    <div className="p-1 bg-blue-100 rounded">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    {filtersLoading ? (
                      <span className="flex items-center gap-2 text-blue-600">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                        </svg>
                        Applying filters...
                      </span>
                    ) : (
                      <span className="text-gray-700">Showing {filteredEntries.length} time entries</span>
                    )}
                  </div>
                  <div className="text-gray-600 bg-gray-200 px-3 py-1 rounded-full text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Overtime</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Coordinates</th>
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
                          className={`transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 animate-fade-in table-row-hover ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
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
          </div>
        </div>
      </div>
  );
};

export default Reports;