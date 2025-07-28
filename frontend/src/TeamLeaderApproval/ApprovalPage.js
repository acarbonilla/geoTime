import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalAPI } from '../api';
import OvertimeApprovalList from './OvertimeApprovalList';
import LeaveApprovalList from './LeaveApprovalList';
import ChangeScheduleApprovalList from './ChangeScheduleApprovalList';
import TimeCorrectionApprovalList from './TimeCorrectionApprovalList';

const TABS = [
  { key: 'overtime', label: 'Overtime Requests' },
  { key: 'time_correction', label: 'Time Correction' },
  { key: 'change_schedule', label: 'Change Schedule' },
  { key: 'leave', label: 'Leave' },
];

const ApprovalPage = ({ user, employee }) => {
  const [activeTab, setActiveTab] = useState('overtime');
  const queryClient = useQueryClient();

  // React Query hooks for fetching approval data
  const {
    data: overtimeRequests,
    isLoading: overtimeLoading,
    error: overtimeError,
    refetch: refetchOvertime
  } = useQuery({
    queryKey: ['overtime-requests'],
    queryFn: () => approvalAPI.getOvertimeRequests(),
    enabled: activeTab === 'overtime',
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const {
    data: leaveRequests,
    isLoading: leaveLoading,
    error: leaveError,
    refetch: refetchLeave
  } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => approvalAPI.getLeaveRequests(),
    enabled: activeTab === 'leave',
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const {
    data: changeScheduleRequests,
    isLoading: changeScheduleLoading,
    error: changeScheduleError,
    refetch: refetchChangeSchedule
  } = useQuery({
    queryKey: ['change-schedule-requests'],
    queryFn: () => approvalAPI.getChangeScheduleRequests(),
    enabled: activeTab === 'change_schedule',
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const {
    data: timeCorrectionRequests,
    isLoading: timeCorrectionLoading,
    error: timeCorrectionError,
    refetch: refetchTimeCorrection
  } = useQuery({
    queryKey: ['time-correction-requests'],
    queryFn: () => approvalAPI.getTimeCorrectionRequests(),
    enabled: activeTab === 'time_correction',
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Mutation hooks for approval actions
  const overtimeApprovalMutation = useMutation({
    mutationFn: ({ id, action, comments }) => 
      action === 'approve' 
        ? approvalAPI.approveOvertimeRequest(id, { comments })
        : approvalAPI.rejectOvertimeRequest(id, { comments }),
    onSuccess: () => {
      queryClient.invalidateQueries(['overtime-requests']);
    },
  });

  const overtimeUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => approvalAPI.updateOvertimeRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['overtime-requests']);
    },
  });

  const leaveApprovalMutation = useMutation({
    mutationFn: ({ id, action, comments }) => 
      action === 'approve' 
        ? approvalAPI.approveLeaveRequest(id, { comments })
        : approvalAPI.rejectLeaveRequest(id, { comments }),
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests']);
    },
  });

  const leaveUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => approvalAPI.updateLeaveRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests']);
    },
  });

  const changeScheduleApprovalMutation = useMutation({
    mutationFn: ({ id, action, comments }) => 
      action === 'approve' 
        ? approvalAPI.approveChangeScheduleRequest(id, { comments })
        : approvalAPI.rejectChangeScheduleRequest(id, { comments }),
    onSuccess: () => {
      queryClient.invalidateQueries(['change-schedule-requests']);
    },
  });

  const changeScheduleUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => approvalAPI.updateChangeScheduleRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['change-schedule-requests']);
    },
  });

  const timeCorrectionApprovalMutation = useMutation({
    mutationFn: ({ id, action, comments }) => 
      action === 'approve' 
        ? approvalAPI.approveTimeCorrectionRequest(id, { comments })
        : approvalAPI.rejectTimeCorrectionRequest(id, { comments }),
    onSuccess: () => {
      queryClient.invalidateQueries(['time-correction-requests']);
    },
  });

  // Helper function to get loading and error states for current tab
  const getCurrentTabState = () => {
    switch (activeTab) {
      case 'overtime':
        return { loading: overtimeLoading, error: overtimeError };
      case 'leave':
        return { loading: leaveLoading, error: leaveError };
      case 'change_schedule':
        return { loading: changeScheduleLoading, error: changeScheduleError };
      case 'time_correction':
        return { loading: timeCorrectionLoading, error: timeCorrectionError };
      default:
        return { loading: false, error: null };
    }
  };

  const { loading, error } = getCurrentTabState();

  const renderTabContent = () => {
    // Show loading state
    if (loading) {
      return (
        <div className="bg-white p-8 rounded-2xl shadow-xl mt-6 animate-fade-in">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading {activeTab.replace('_', ' ')} requests...</span>
          </div>
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className="bg-white p-8 rounded-2xl shadow-xl mt-6 animate-fade-in">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-2">Error loading data</div>
            <div className="text-gray-600 mb-4">{error.message}</div>
            <button 
              onClick={() => {
                switch (activeTab) {
                  case 'overtime':
                    refetchOvertime();
                    break;
                  case 'leave':
                    refetchLeave();
                    break;
                  case 'change_schedule':
                    refetchChangeSchedule();
                    break;
                  case 'time_correction':
                    refetchTimeCorrection();
                    break;
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overtime':
        return (
          <OvertimeApprovalList 
            requests={overtimeRequests?.results || overtimeRequests || []}
            onApproval={overtimeApprovalMutation.mutate}
            isApproving={overtimeApprovalMutation.isPending}
            onUpdate={overtimeUpdateMutation.mutate}
            isUpdating={overtimeUpdateMutation.isPending}
          />
        );
      case 'time_correction':
        return (
          <TimeCorrectionApprovalList 
            requests={timeCorrectionRequests?.results || timeCorrectionRequests || []}
            onApproval={timeCorrectionApprovalMutation.mutate}
            isApproving={timeCorrectionApprovalMutation.isPending}
          />
        );
      case 'change_schedule':
        return (
          <ChangeScheduleApprovalList 
            requests={changeScheduleRequests?.results || changeScheduleRequests || []}
            onApproval={changeScheduleApprovalMutation.mutate}
            isApproving={changeScheduleApprovalMutation.isPending}
            onUpdate={changeScheduleUpdateMutation.mutate}
            isUpdating={changeScheduleUpdateMutation.isPending}
          />
        );
      case 'leave':
        return (
          <LeaveApprovalList 
            requests={leaveRequests?.results || leaveRequests || []}
            onApproval={leaveApprovalMutation.mutate}
            isApproving={leaveApprovalMutation.isPending}
            onUpdate={leaveUpdateMutation.mutate}
            isUpdating={leaveUpdateMutation.isPending}
          />
        );
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