import React, { useState, useRef, useEffect } from 'react';
import TimeCorrectionApprovals from './TimeCorrectionApprovals';
import axiosInstance from '../../utils/axiosInstance';

const TimeCorrectionApprovalsModal = ({ open, onClose, pendingApprovalsCount = 0 }) => {
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(5);
  const modalRef = useRef();

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
        ref={modalRef}
        className={`fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full md:w-4/5 lg:w-3/4 bg-white shadow-xl rounded-lg transition-transform duration-300 ${open ? 'scale-100' : 'scale-95'}`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Pending Time Correction Approvals</h2>
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
            placeholder="Search by employee, date, or reason..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-full md:w-2/3 focus:ring-2 focus:ring-yellow-400"
          />
          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            className="border rounded px-3 py-2 w-full md:w-1/6 focus:ring-2 focus:ring-yellow-400"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-128px)]">
          <TimeCorrectionApprovals search={search} pageSize={pageSize} onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default TimeCorrectionApprovalsModal;