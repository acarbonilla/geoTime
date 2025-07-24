import React from 'react';
import OvertimeApprovalList from './OvertimeApprovalList';

const OvertimeApprovalPage = () => {
  return (
    <div className="max-w-7xl mx-auto py-10 px-4 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-700">Overtime Approval</h1>
        <p className="text-gray-600 mt-2">
          Review and approve/reject overtime requests from your team members.
        </p>
      </div>
      
      <OvertimeApprovalList />
    </div>
  );
};

export default OvertimeApprovalPage; 