import React, { useState } from 'react';
import OvertimeRequestForm from './OvertimeRequestForm';
import LeaveRequestForm from './LeaveRequestForm';
import ChangeScheduleRequestForm from './ChangeScheduleRequestForm';
import OvertimeRequestsList from './OvertimeRequestsList';
import LeaveRequestList from './LeaveRequestList';
import ChangeScheduleRequestList from './ChangeScheduleRequestList';

const TABS = [
  { key: 'overtime', label: 'Overtime Request' },
  { key: 'leave', label: 'Leave Request' },
  { key: 'change_schedule', label: 'Change Schedule' },
];

const EmployeeRequestPage = () => {
  const [activeTab, setActiveTab] = useState('overtime');
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showChangeScheduleForm, setShowChangeScheduleForm] = useState(false);
  const [overtimeListKey, setOvertimeListKey] = useState(0);
  const [leaveListKey, setLeaveListKey] = useState(0);
  const [changeScheduleListKey, setChangeScheduleListKey] = useState(0);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 animate-fade-in">
      {/* Tab Bar */}
      <div className="flex border-b mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`px-4 py-2 text-lg font-semibold focus:outline-none transition-all duration-200 border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overtime' && (
        <>
          <div className="flex items-center justify-between mb-6 mt-2">
            <h1 className="text-2xl font-bold text-blue-700">Overtime Request</h1>
            <button
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow"
              onClick={() => setShowOvertimeForm(v => !v)}
            >
              {showOvertimeForm ? 'Close Overtime Request' : 'Request Overtime'}
            </button>
          </div>
          {showOvertimeForm && (
            <>
              {/* Modal Backdrop */}
              <div
                className="fixed inset-0 bg-black bg-opacity-40 z-40 animate-fade-in"
                onClick={() => setShowOvertimeForm(false)}
              />
              {/* Modal Content */}
              <div className="fixed inset-0 flex items-center justify-center z-50">
                <div
                  className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative animate-fade-in"
                  onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal
                >
                  <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                    onClick={() => setShowOvertimeForm(false)}
                    aria-label="Close"
                  >
                    &times;
                  </button>
                  <OvertimeRequestForm
                    onSuccess={() => {
                      setShowOvertimeForm(false);
                      setOvertimeListKey(k => k + 1);
                    }}
                    onClose={() => setShowOvertimeForm(false)}
                  />
                </div>
              </div>
            </>
          )}
          <OvertimeRequestsList key={overtimeListKey} />
        </>
      )}

      {activeTab === 'leave' && (
        <>
          <div className="flex items-center justify-between mb-6 mt-2">
            <h1 className="text-2xl font-bold text-blue-700">Leave Request</h1>
            <button
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow"
              onClick={() => setShowLeaveForm(v => !v)}
            >
              {showLeaveForm ? 'Close Leave Request' : 'Request Leave'}
            </button>
          </div>
          {showLeaveForm && (
            <>
              {/* Modal Backdrop */}
              <div
                className="fixed inset-0 bg-black bg-opacity-40 z-40 animate-fade-in"
                onClick={() => setShowLeaveForm(false)}
              />
              {/* Modal Content */}
              <div className="fixed inset-0 flex items-center justify-center z-50">
                <div
                  className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative animate-fade-in"
                  onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal
                >
                  <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                    onClick={() => setShowLeaveForm(false)}
                    aria-label="Close"
                  >
                    &times;
                  </button>
                  <LeaveRequestForm
                    onSuccess={() => {
                      setShowLeaveForm(false);
                      setLeaveListKey(k => k + 1);
                    }}
                    onClose={() => setShowLeaveForm(false)}
                  />
                </div>
              </div>
            </>
          )}
          <LeaveRequestList key={leaveListKey} />
        </>
      )}

      {activeTab === 'change_schedule' && (
        <>
          <div className="flex items-center justify-between mb-6 mt-2">
            <h1 className="text-2xl font-bold text-blue-700">Change Schedule Request</h1>
            <button
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow"
              onClick={() => setShowChangeScheduleForm(v => !v)}
            >
              {showChangeScheduleForm ? 'Close Change Schedule Request' : 'Request Change Schedule'}
            </button>
          </div>
          {showChangeScheduleForm && (
            <>
              {/* Modal Backdrop */}
              <div
                className="fixed inset-0 bg-black bg-opacity-40 z-40 animate-fade-in"
                onClick={() => setShowChangeScheduleForm(false)}
              />
              {/* Modal Content */}
              <div className="fixed inset-0 flex items-center justify-center z-50">
                <div
                  className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full relative animate-fade-in"
                  onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal
                >
                  <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                    onClick={() => setShowChangeScheduleForm(false)}
                    aria-label="Close"
                  >
                    &times;
                  </button>
                  <ChangeScheduleRequestForm
                    onSuccess={() => {
                      setShowChangeScheduleForm(false);
                      setChangeScheduleListKey(k => k + 1);
                    }}
                    onClose={() => setShowChangeScheduleForm(false)}
                  />
                </div>
              </div>
            </>
          )}
          <ChangeScheduleRequestList key={changeScheduleListKey} />
        </>
      )}
      {/* Future: Add more tab content here */}
    </div>
  );
};

export default EmployeeRequestPage; 