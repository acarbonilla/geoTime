import React, { useRef } from 'react';
import RequestTimeCorrectionForm from './RequestTimeCorrectionForm';

const RequestTimeCorrectionDrawer = ({ open, onClose, employee }) => {
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
        className={`fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-xl transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Request Time Correction</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 text-2xl font-bold focus:outline-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
          <RequestTimeCorrectionForm employee={employee} />
        </div>
      </div>
    </div>
  );
};

export default RequestTimeCorrectionDrawer; 