import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../utils/axiosInstance';
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
  const queryClient = useQueryClient();

  // Overtime requests query and mutations
  const overtimeRequestsQuery = useQuery({
    queryKey: ['overtime-requests'],
    queryFn: async () => {
      const response = await axios.get('overtime-requests/');
      return response.data.results || response.data || [];
    },
  });

  const overtimeMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.post('overtime-requests/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-requests'] });
      setShowOvertimeForm(false);
    },
  });

  // Leave requests query and mutations
  const leaveRequestsQuery = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const response = await axios.get('leave-requests/');
      return response.data.results || response.data || [];
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.post('leave-requests/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      setShowLeaveForm(false);
    },
  });

  // Change schedule requests query and mutations
  const changeScheduleRequestsQuery = useQuery({
    queryKey: ['change-schedule-requests'],
    queryFn: async () => {
      const response = await axios.get('change-schedule-requests/');
      return response.data.results || response.data || [];
    },
  });

  const changeScheduleMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.post('change-schedule-requests/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-schedule-requests'] });
      setShowChangeScheduleForm(false);
    },
  });

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
                    }}
                    onClose={() => setShowOvertimeForm(false)}
                    mutation={overtimeMutation}
                  />
                </div>
              </div>
            </>
          )}
          <OvertimeRequestsList 
            requests={overtimeRequestsQuery.data || []}
            isLoading={overtimeRequestsQuery.isLoading}
            error={overtimeRequestsQuery.error}
          />
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
                    }}
                    onClose={() => setShowLeaveForm(false)}
                    mutation={leaveMutation}
                  />
                </div>
              </div>
            </>
          )}
          <LeaveRequestList 
            requests={leaveRequestsQuery.data || []}
            isLoading={leaveRequestsQuery.isLoading}
            error={leaveRequestsQuery.error}
          />
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
                    }}
                    onClose={() => setShowChangeScheduleForm(false)}
                    mutation={changeScheduleMutation}
                  />
                </div>
              </div>
            </>
          )}
          <ChangeScheduleRequestList 
            requests={changeScheduleRequestsQuery.data || []}
            isLoading={changeScheduleRequestsQuery.isLoading}
            error={changeScheduleRequestsQuery.error}
          />
        </>
      )}
      {/* Future: Add more tab content here */}
    </div>
  );
};

export default EmployeeRequestPage; 