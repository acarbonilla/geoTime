import React, { useState, useEffect, useRef } from 'react';
import AbsentTodayList from './AbsentTodayList';
import { XMarkIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../utils/axiosInstance';

const AbsentTodayDrawer = ({ open, onClose }) => {
  const [search, setSearch] = useState('');
  const [absentEmployees, setAbsentEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const drawerRef = useRef();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    axiosInstance.get('employees/absent_today/')
      .then(res => {
        setAbsentEmployees(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch absent employees.');
        setLoading(false);
      });
  }, [open]);

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Filter by search
  const filtered = absentEmployees.filter(emp =>
    !search ||
    emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    emp.department?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} bg-black bg-opacity-40`}
      aria-modal="true"
      role="dialog"
      onClick={handleOverlayClick}
    >
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 h-full w-full md:w-4/5 lg:w-3/4 bg-white shadow-xl transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Absent Today</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 text-2xl font-bold focus:outline-none"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4 border-b flex flex-col md:flex-row gap-2 md:gap-4 items-center bg-gray-50">
          <input
            type="text"
            placeholder="Search by name, ID, or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-full md:w-1/2 focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-128px)]">
          <AbsentTodayList employees={filtered} loading={loading} error={error} />
        </div>
      </div>
    </div>
  );
};

export default AbsentTodayDrawer; 