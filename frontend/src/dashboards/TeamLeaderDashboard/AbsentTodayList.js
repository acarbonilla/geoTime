import React from 'react';
import { XCircleIcon } from '@heroicons/react/24/outline';

const AbsentTodayList = ({ employees, loading, error }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        <span className="text-blue-700">Loading absent employees...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <XCircleIcon className="h-5 w-5 mr-2 text-red-500" />
        <span className="block">{error}</span>
      </div>
    );
  }
  if (!employees || employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <XCircleIcon className="h-12 w-12 mb-2 text-gray-300" />
        <span className="text-lg">No absent employees today!</span>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg shadow">
      <table className="min-w-full bg-white">
        <thead>
          <tr className="bg-blue-100 text-blue-900">
            <th className="py-2 px-4 text-left">Name</th>
            <th className="py-2 px-4 text-left">Employee ID</th>
            <th className="py-2 px-4 text-left">Department</th>
            <th className="py-2 px-4 text-left">Role</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, idx) => (
            <tr key={emp.id} className={`transition-colors duration-200 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`}>
              <td className="py-2 px-4 font-medium whitespace-nowrap">{emp.full_name}</td>
              <td className="py-2 px-4 whitespace-nowrap">{emp.employee_id}</td>
              <td className="py-2 px-4 whitespace-nowrap">{emp.department?.name || '-'}</td>
              <td className="py-2 px-4 capitalize whitespace-nowrap">{emp.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AbsentTodayList; 