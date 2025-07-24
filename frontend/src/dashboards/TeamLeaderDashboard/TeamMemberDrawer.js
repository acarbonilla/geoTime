import React, { useState, useRef } from 'react';
import TeamMemberList from './TeamMemberList';

const statuses = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'on_leave', label: 'On Leave' },
];

const TeamMemberDrawer = ({ open, onClose, teamLeaderId }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const drawerRef = useRef();

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Pass filter/search state to TeamMemberList
  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} bg-black bg-opacity-40`}
      aria-modal="true"
      role="dialog"
      onClick={handleOverlayClick}
    >
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-xl transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Team Member List</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 text-2xl font-bold focus:outline-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="p-4 border-b flex flex-col md:flex-row gap-2 md:gap-4 items-center bg-gray-50">
          <input
            type="text"
            placeholder="Search by name, ID, or position..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-full md:w-1/2 focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="border rounded px-3 py-2 w-full md:w-1/4 focus:ring-2 focus:ring-blue-400"
          >
            {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-128px)]">
          <TeamMemberList
            teamLeaderId={teamLeaderId}
            search={search}
            status={status}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default TeamMemberDrawer; 