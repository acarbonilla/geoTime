import React, { useState, useRef } from 'react';
import TeamTimeEntries from './TeamTimeEntries';

const statuses = [
  { value: '', label: 'All Statuses' },
  { value: 'time_in', label: 'Time In' },
  { value: 'time_out', label: 'Time Out' },
];

const TeamTimeEntriesDrawer = ({ open, onClose }) => {
  const [search, setSearch] = useState('');
  const [entryType, setEntryType] = useState('');
  const [pageSize, setPageSize] = useState(5);
  const drawerRef = useRef();

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} bg-black bg-opacity-40`}
      aria-modal="true"
      role="dialog"
      onClick={handleOverlayClick}
    >
      <div
        ref={drawerRef}
        className={`fixed left-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-xl transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex justify-between items-center p-4 border-b relative">
          <h2 className="text-xl font-bold">Team Time Entries (Today)</h2>
          <button
            onClick={onClose}
            className="absolute top-2 right-4 text-gray-700 hover:text-red-600 text-4xl font-extrabold focus:outline-none p-2 rounded-full bg-gray-100 hover:bg-red-100 transition-all duration-150 shadow-md z-10"
            aria-label="Close"
          > 
            &times;
          </button>
        </div>
        <div className="p-4 border-b flex flex-col md:flex-row gap-2 md:gap-4 items-center bg-gray-50">
          <input
            type="text"
            placeholder="Search by employee, location, or notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-full md:w-1/2 focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={entryType}
            onChange={e => setEntryType(e.target.value)}
            className="border rounded px-3 py-2 w-full md:w-1/4 focus:ring-2 focus:ring-blue-400"
          >
            {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            className="border rounded px-3 py-2 w-full md:w-1/6 focus:ring-2 focus:ring-blue-400"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-128px)]">
          <TeamTimeEntries
            isOpen={open}
            search={search}
            entryType={entryType}
            pageSize={pageSize}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default TeamTimeEntriesDrawer; 