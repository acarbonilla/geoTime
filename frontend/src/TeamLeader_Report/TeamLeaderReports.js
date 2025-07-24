import React, { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const TeamLeaderReports = ({ employee }) => {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [subordinates, setSubordinates] = useState([]);
  const [filterForm, setFilterForm] = useState({
    startDate: '',
    endDate: '',
    entryType: 'all',
    selectedEmployee: 'all',
  });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    entryType: 'all',
    selectedEmployee: 'all',
  });
  const [loading, setLoading] = useState(false);
  const [subordinatesLoading, setSubordinatesLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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

  // Fetch time entries based on filters
  useEffect(() => {
    if (!showTable) return;
    
    setLoading(true);
    // Build query params for API
    const params = { 
      page_size: pageSize, 
      page: currentPage, 
      ordering: '-timestamp'
    };
    
    if (filterForm.startDate) params.start_date = filterForm.startDate;
    if (filterForm.endDate) params.end_date = filterForm.endDate;
    if (filterForm.selectedEmployee !== 'all') {
      params.employee = filterForm.selectedEmployee;
    }
    
    axiosInstance.get('/time-entries/', { params })
      .then(res => {
        const results = res.data.results || res.data;
        setEntries(results);
        setTotalPages(Math.ceil((res.data.count || results.length) / pageSize));
      })
      .catch(error => {
        console.error('Error fetching time entries:', error);
        setEntries([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [filterForm.startDate, filterForm.endDate, filterForm.selectedEmployee, currentPage, pageSize, showTable]);

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
    
    setFilteredEntries(data);
  }, [entries, filters]);

  const handleFilterFormChange = (e) => {
    setFilterForm({ ...filterForm, [e.target.name]: e.target.value });
  };

  const handleApplyFilters = () => {
    setFilters({ ...filterForm });
    setShowTable(true);
    setCurrentPage(1);
  };

  // Helper to format date and time like the table
  const formatExportDateTime = (ts) => {
    if (!ts) return { date: '', time: '' };
    let tsISO = ts.replace(/\.(\d+)([\+\-]\d{2}:\d{2})$/, '$2');
    const dt = new Date(tsISO);
    if (!isNaN(dt)) {
      return {
        date: dt.toLocaleDateString('en-CA'),
        time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
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
    });
    const csvContent = [header, ...rows].map(r => r.map(x => '"' + (x || '') + '"').join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'team_time_entries.csv');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredEntries.map(e => {
      const { date, time } = formatExportDateTime(e.timestamp);
      return {
        Employee: e.employee_name,
        Department: e.department_name,
        'Entry Type': e.entry_type,
        Date: date,
        Time: time,
        Location: e.location_name,
        Overtime: e.overtime || '',
        Notes: e.notes || '',
        Coordinates: e.latitude && e.longitude ? `${e.latitude}, ${e.longitude}` : '',
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

  // Pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-1 rounded mx-1 ${currentPage === i ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100'}`}
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
          className="px-3 py-1 rounded mx-1 bg-gray-200 text-gray-700 hover:bg-blue-100 disabled:opacity-50"
        >Prev</button>
        {pages}
        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded mx-1 bg-gray-200 text-gray-700 hover:bg-blue-100 disabled:opacity-50"
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
        className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition"
      >
        {PAGE_SIZE_OPTIONS.map(size => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-900 mb-1 tracking-tight drop-shadow">Team Reports & Analytics</h1>
        <p className="mb-4 text-gray-500 text-lg">Generate comprehensive time entry reports for your team members</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-blue-100 animate-fade-in">
        <div className="mb-4 font-semibold text-blue-800 text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h3m4 4v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2h3a4 4 0 014 4v2" />
          </svg>
          Team Report Configuration
        </div>
        
        <div className="flex flex-wrap gap-4 mb-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <Tooltip text="Select a specific team member or view all team members.">
              <select 
                name="selectedEmployee" 
                value={filterForm.selectedEmployee} 
                onChange={handleFilterFormChange} 
                className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition min-w-[200px]"
                disabled={subordinatesLoading}
              >
                <option value="all">All Team Members</option>
                {subordinates.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            </Tooltip>
            {subordinatesLoading && (
              <div className="text-xs text-gray-500 mt-1">Loading team members...</div>
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
                className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition" 
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
                className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition" 
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
                className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition"
              >
                <option value="all">All Types</option>
                <option value="time_in">Time In</option>
                <option value="time_out">Time Out</option>
              </select>
            </Tooltip>
          </div>
          
          <div className="flex items-end">
            <button 
              onClick={handleApplyFilters} 
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-2 rounded-lg shadow hover:scale-105 hover:from-blue-600 hover:to-blue-800 transition-all font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              Generate Report
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Tooltip text="Download as CSV">
            <button 
              onClick={exportCSV} 
              disabled={!showTable || filteredEntries.length === 0}
              className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-3 py-1.5 rounded shadow hover:from-blue-500 hover:to-blue-700 transition-all font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CSV
            </button>
          </Tooltip>
          <Tooltip text="Download as Excel">
            <button 
              onClick={exportExcel} 
              disabled={!showTable || filteredEntries.length === 0}
              className="bg-gradient-to-r from-green-400 to-green-600 text-white px-3 py-1.5 rounded shadow hover:from-green-500 hover:to-green-700 transition-all font-medium focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Excel
            </button>
          </Tooltip>
          <Tooltip text="Download as PDF">
            <button 
              onClick={exportPDF} 
              disabled={!showTable || filteredEntries.length === 0}
              className="bg-gradient-to-r from-red-400 to-red-600 text-white px-3 py-1.5 rounded shadow hover:from-red-500 hover:to-red-700 transition-all font-medium focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              PDF
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100 animate-fade-in">
        <div className="mb-4 font-semibold text-blue-800 text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Team Time Entry Details
        </div>
        
        {!showTable ? (
          <div className="flex flex-col items-center py-12 text-blue-300 animate-fade-in">
            <svg width="64" height="64" fill="none" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="mt-4 text-lg font-semibold">Please configure filters and click <span className='text-blue-500'>Generate Report</span> to view team entries.</div>
            <div className="text-sm">Select team members and date range to generate comprehensive reports.</div>
          </div>
        ) : loading ? (
          <Spinner />
        ) : filteredEntries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            {renderPageSizeSelector()}
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900">
                  <th className="p-2 text-left">Employee</th>
                  <th className="p-2 text-left">Department</th>
                  <th className="p-2 text-left">Entry Type</th>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2 text-left">Location</th>
                  <th className="p-2 text-left">Overtime</th>
                  <th className="p-2 text-left">Notes</th>
                  <th className="p-2 text-left">Coordinates</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e, idx) => {
                  const ts = e.timestamp || '';
                  let date = '', time = '', formattedTime = '';
                  if (ts) {
                    let tsISO = ts.replace(/\.(\d+)([\+\-]\d{2}:\d{2})$/, '$2');
                    const dt = new Date(tsISO);
                    if (!isNaN(dt)) {
                      date = dt.toLocaleDateString('en-CA');
                      formattedTime = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
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
                    <tr key={e.id} className="border-b transition-all duration-300 hover:bg-blue-50 animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                      <td className="p-2 font-medium">{e.employee_name}</td>
                      <td className="p-2">{e.department_name}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          e.entry_type === 'time_in' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {e.entry_type === 'time_in' ? 'Time In' : 'Time Out'}
                        </span>
                      </td>
                      <td className="p-2">{date}</td>
                      <td className="p-2">{formattedTime}</td>
                      <td className="p-2">{e.location_name}</td>
                      <td className="p-2">{e.overtime || ''}</td>
                      <td className="p-2">{e.notes || ''}</td>
                      <td className="p-2 text-xs text-gray-500">{e.latitude && e.longitude ? `${e.latitude}, ${e.longitude}` : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {renderPagination()}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamLeaderReports;
