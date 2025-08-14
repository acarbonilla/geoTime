import React, { useState, useMemo } from 'react';
import { FaUserClock, FaClock, FaUserCheck, FaUserTimes, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
];

const TimeCorrectionApprovalList = ({ 
  requests = [], 
  onApproval, 
  isApproving = false 
}) => {
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('submitted_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalAction, setApprovalAction] = useState('');
  const [comments, setComments] = useState('');

  // Filtering
  const filteredRequests = useMemo(() => {
    let filtered = [...requests];
    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    return filtered;
  }, [requests, statusFilter]);

  // Sorting
  const sortedRequests = useMemo(() => {
    let sorted = [...filteredRequests];
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (['date', 'submitted_at', 'reviewed_at'].includes(sortField)) {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredRequests, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedRequests.length / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRequests.slice(start, start + pageSize);
  }, [sortedRequests, currentPage, pageSize]);

  // Handlers
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(order => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleApproval = (request, action) => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setComments('');
    setShowApprovalModal(true);
  };

  const handleSubmitApproval = () => {
    if (onApproval && selectedRequest) {
      onApproval({
        id: selectedRequest.id,
        action: approvalAction,
        comments: comments.trim() || undefined
      });
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalAction('');
      setComments('');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  React.useEffect(() => {
    setCurrentPage(1); // Reset to first page on filter/sort change
  }, [statusFilter, sortField, sortOrder, pageSize]);

  if (requests.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl mt-6 animate-fade-in">
        <div className="text-center">
          <FaUserClock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No time correction requests</h3>
          <p className="mt-1 text-sm text-gray-500">No time correction requests found for your team.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-8 rounded-2xl shadow-xl mt-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
            <FaUserClock className="text-blue-500" />
            Time Correction Requests
          </h2>
          <div className="text-sm text-gray-500">
            {requests.length} total request{requests.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Show:</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('employee__full_name')}>
                  <div className="flex items-center gap-1">
                    Employee
                    {sortField === 'employee__full_name' && (
                      sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">
                    Date
                    {sortField === 'date' && (
                      sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested Times
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">
                    Status
                    {sortField === 'status' && (
                      sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('submitted_at')}>
                  <div className="flex items-center gap-1">
                    Submitted
                    {sortField === 'submitted_at' && (
                      sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <FaUserClock className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {request.employee_name || request.employee?.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.employee?.employee_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(request.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      {request.requested_time_in && (
                        <div className="flex items-center gap-1">
                          <FaClock className="text-blue-500 text-xs" />
                          <span className="font-medium">In:</span> {formatTime(request.requested_time_in)}
                        </div>
                      )}
                      {request.requested_time_out && (
                        <div className="flex items-center gap-1">
                          <FaClock className="text-red-500 text-xs" />
                          <span className="font-medium">Out:</span> {formatTime(request.requested_time_out)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={request.reason}>
                      {request.reason}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.submitted_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {request.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproval(request, 'approve')}
                          disabled={isApproving}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          <FaUserCheck className="mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(request, 'reject')}
                          disabled={isApproving}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        >
                          <FaUserTimes className="mr-1" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">Already {request.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedRequests.length)} of {sortedRequests.length} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Time Correction Request
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Employee:</strong> {selectedRequest.employee_name || selectedRequest.employee?.full_name}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Date:</strong> {new Date(selectedRequest.date).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Reason:</strong> {selectedRequest.reason}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments (optional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Add comments for ${approvalAction === 'approve' ? 'approval' : 'rejection'}...`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmitApproval}
                disabled={isApproving}
                className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                  approvalAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {isApproving ? 'Processing...' : (approvalAction === 'approve' ? 'Approve' : 'Reject')}
              </button>
              <button
                onClick={() => setShowApprovalModal(false)}
                disabled={isApproving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TimeCorrectionApprovalList; 