import React, { useState } from 'react';
import OvertimeApprovalList from './OvertimeApprovalList';
import LeaveApprovalList from './LeaveApprovalList';
import ChangeScheduleApprovalList from './ChangeScheduleApprovalList';

const TABS = [
  { key: 'overtime', label: 'Overtime Requests' },
  { key: 'time_correction', label: 'Time Correction' },
  { key: 'change_schedule', label: 'Change Schedule' },
  { key: 'leave', label: 'Leave' },
];

const ApprovalPage = ({ user, employee }) => {
  const [activeTab, setActiveTab] = useState('overtime');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overtime':
        return <OvertimeApprovalList />;
      case 'time_correction':
        return (
          <div className="bg-white p-8 rounded-2xl shadow-xl mt-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-4 text-blue-700">Time Correction Requests</h2>
            <p className="text-gray-600">Time correction approval functionality coming soon...</p>
          </div>
        );
      case 'change_schedule':
        return <ChangeScheduleApprovalList />;
      case 'leave':
        return <LeaveApprovalList />;
      default:
        return <OvertimeApprovalList />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-700">For Approval</h1>
        <p className="text-gray-600 mt-2">
          Review and approve/reject requests from your team members.
        </p>
      </div>

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
      {renderTabContent()}
    </div>
  );
};

export default ApprovalPage; 