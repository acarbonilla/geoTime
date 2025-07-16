import React, { useEffect, useState } from 'react';
import axiosInstance from './axiosInstance';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const Reports = () => {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [filterForm, setFilterForm] = useState({
    startDate: '',
    endDate: '',
    entryType: 'all',
  });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    entryType: 'all',
  });
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    setLoading(true);
    axiosInstance.get('/time-entries/?page_size=1000')
      .then(res => setEntries(res.data.results || res.data))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let data = [...entries];
    const getDateString = (entry) => {
      const ts = entry.formatted_timestamp || entry.timestamp;
      if (!ts) return '';
      if (ts.includes('T')) {
        return ts.split('T')[0];
      } else {
        return ts.split(' ')[0];
      }
    };
    if (!filters.startDate && !filters.endDate && (filters.entryType === 'all' || !filters.entryType)) {
      setFilteredEntries(entries);
      return;
    }
    if (filters.startDate) {
      data = data.filter(e => {
        const entryDate = getDateString(e);
        return entryDate && entryDate >= filters.startDate;
      });
    }
    if (filters.endDate) {
      data = data.filter(e => {
        const entryDate = getDateString(e);
        return entryDate && entryDate <= filters.endDate;
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
  };

  // Export functions
  const exportCSV = () => {
    const header = ['Employee', 'Department', 'Entry Type', 'Time', 'Location', 'Overtime', 'Notes', 'Coordinates'];
    const rows = filteredEntries.map(e => [
      e.employee_name,
      e.department_name,
      e.entry_type,
      e.formatted_timestamp || e.timestamp,
      e.location_name,
      e.overtime || '',
      e.notes || '',
      e.latitude && e.longitude ? `${e.latitude}, ${e.longitude}` : '',
    ]);
    const csvContent = [header, ...rows].map(r => r.map(x => '"' + (x || '') + '"').join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'employee_time_entries.csv');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredEntries.map(e => ({
      Employee: e.employee_name,
      Department: e.department_name,
      'Entry Type': e.entry_type,
      Time: e.formatted_timestamp || e.timestamp,
      Location: e.location_name,
      Overtime: e.overtime || '',
      Notes: e.notes || '',
      Coordinates: e.latitude && e.longitude ? `${e.latitude}, ${e.longitude}` : '',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Time Entries');
    XLSX.writeFile(wb, 'employee_time_entries.xlsx');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Employee Time Entries', 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [[
        'Employee', 'Department', 'Entry Type', 'Time', 'Location', 'Overtime', 'Notes', 'Coordinates'
      ]],
      body: filteredEntries.map(e => [
        e.employee_name,
        e.department_name,
        e.entry_type,
        e.formatted_timestamp || e.timestamp,
        e.location_name,
        e.overtime || '',
        e.notes || '',
        e.latitude && e.longitude ? `${e.latitude}, ${e.longitude}` : '',
      ]),
      styles: { fontSize: 8 },
    });
    doc.save('employee_time_entries.pdf');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-gradient-to-br from-blue-50 to-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-900 mb-1 tracking-tight drop-shadow">Reports & Files</h1>
        <p className="mb-4 text-gray-500 text-lg">Generate comprehensive employee time entry reports for management</p>
      </div>
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-blue-100 animate-fade-in">
        <div className="mb-4 font-semibold text-blue-800 text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h3m4 4v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2h3a4 4 0 014 4v2" /></svg>
          Report Configuration
        </div>
        <div className="flex flex-wrap gap-4 mb-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <Tooltip text="Select the start date for the report.">
              <input type="date" name="startDate" value={filterForm.startDate} onChange={handleFilterFormChange} className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition" />
            </Tooltip>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <Tooltip text="Select the end date for the report.">
              <input type="date" name="endDate" value={filterForm.endDate} onChange={handleFilterFormChange} className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition" />
            </Tooltip>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entry Type</label>
            <Tooltip text="Filter by time in or time out entries.">
              <select name="entryType" value={filterForm.entryType} onChange={handleFilterFormChange} className="border border-blue-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 transition">
                <option value="all">All Types</option>
                <option value="time_in">Time In</option>
                <option value="time_out">Time Out</option>
              </select>
            </Tooltip>
          </div>
          <div className="flex items-end">
            <button onClick={handleApplyFilters} className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-2 rounded-lg shadow hover:scale-105 hover:from-blue-600 hover:to-blue-800 transition-all font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-300">Filter</button>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Tooltip text="Download as CSV">
            <button onClick={exportCSV} className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-3 py-1.5 rounded shadow hover:from-blue-500 hover:to-blue-700 transition-all font-medium focus:outline-none focus:ring-2 focus:ring-blue-300">CSV</button>
          </Tooltip>
          <Tooltip text="Download as Excel">
            <button onClick={exportExcel} className="bg-gradient-to-r from-green-400 to-green-600 text-white px-3 py-1.5 rounded shadow hover:from-green-500 hover:to-green-700 transition-all font-medium focus:outline-none focus:ring-2 focus:ring-green-300">Excel</button>
          </Tooltip>
          <Tooltip text="Download as PDF">
            <button onClick={exportPDF} className="bg-gradient-to-r from-red-400 to-red-600 text-white px-3 py-1.5 rounded shadow hover:from-red-500 hover:to-red-700 transition-all font-medium focus:outline-none focus:ring-2 focus:ring-red-300">PDF</button>
          </Tooltip>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100 animate-fade-in">
        <div className="mb-4 font-semibold text-blue-800 text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7" /></svg>
          Detailed Time Entry List
        </div>
        {!showTable ? (
          <div className="flex flex-col items-center py-12 text-blue-300 animate-fade-in">
            <svg width="64" height="64" fill="none" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <div className="mt-4 text-lg font-semibold">Please select filters and click <span className='text-blue-500'>Filter</span> to view entries.</div>
            <div className="text-sm">The table will appear after you filter your report.</div>
          </div>
        ) : loading ? (
          <Spinner />
        ) : filteredEntries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900">
                  <th className="p-2 text-left">Name</th>
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
                  const ts = e.formatted_timestamp || e.timestamp || '';
                  let date = '', time = '';
                  if (ts.includes(' ')) {
                    [date, time] = ts.split(' ');
                  } else if (ts.includes('T')) {
                    [date, time] = ts.split('T');
                    time = time ? time.slice(0, 8) : '';
                  }
                  // Format time to 12-hour with AM/PM
                  let formattedTime = '';
                  if (date && time) {
                    const cleanTime = time.split('.')[0];
                    const dt = new Date(`${date}T${cleanTime}`);
                    if (!isNaN(dt)) {
                      formattedTime = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    } else {
                      formattedTime = cleanTime;
                    }
                  }
                  return (
                    <tr key={e.id} className="border-b transition-all duration-300 hover:bg-blue-50 animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                      <td className="p-2 font-medium">{e.employee_name || 'You'}</td>
                      <td className="p-2">{e.entry_type === 'time_in' ? 'Time In' : 'Time Out'}</td>
                      <td className="p-2">{date}</td>
                      <td className="p-2">{formattedTime}</td>
                      <td className="p-2">{e.location_name}</td>
                      <td className="p-2">{e.overtime || ''}</td>
                      <td className="p-2">{e.notes || ''}</td>
                      <td className="p-2">{e.latitude && e.longitude ? `${e.latitude}, ${e.longitude}` : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports; 