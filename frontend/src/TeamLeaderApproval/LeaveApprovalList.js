import React, { useState, useMemo, useEffect } from 'react';
import { FaCalendarAlt, FaUserCheck, FaUserTimes, FaHourglassHalf, FaSort, FaSortUp, FaSortDown, FaUser, FaCheck, FaTimes, FaEdit, FaBan } from 'react-icons/fa';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const LEAVE_TYPE_COLORS = {
  vacation: 'bg-blue-100 text-blue-800',
  sick: 'bg-red-100 text-red-800',
  personal: 'bg-purple-100 text-purple-800',
  maternity: 'bg-pink-100 text-pink-800',
  paternity: 'bg-indigo-100 text-indigo-800',
  bereavement: 'bg-gray-100 text-gray-800',
  other: 'bg-yellow-100 text-yellow-800',
};

const LeaveApprovalList = ({ 
  requests = [], 
  onApproval, 
  isApproving = false,
  onUpdate,
  isUpdating = false
}) => {
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalAction, setApprovalAction] = useState(''); // 'approve' or 'reject'
  const [approvalComment, setApprovalComment] = useState('');
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    number_days: '',
    reason: ''
  });

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
      if (sortField === 'start_date' || sortField === 'end_date' || sortField === 'created_at') {
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
    setApprovalComment('');
    setShowApprovalModal(true);
  };

  const handleEdit = (request) => {
    setSelectedRequest(request);
    setEditForm({
      leave_type: request.leave_type || '',
      start_date: request.start_date || '',
      end_date: request.end_date || '',
      number_days: request.number_days || '',
      reason: request.reason || ''
    });
    setShowEditModal(true);
  };

  const submitApproval = async () => {
    if (!selectedRequest || !onApproval) return;
    
    try {
      await onApproval({
        id: selectedRequest.id,
        action: approvalAction,
        comments: approvalComment
      });
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalAction('');
      setApprovalComment('');
    } catch (err) {
      alert(`Failed to ${approvalAction} request: ${err.response?.data?.detail || err.message}`);
    }
  };

  const submitEdit = async () => {
    if (!selectedRequest || !onUpdate) return;
    
    try {
      const updateData = {
        ...editForm,
        number_days: editForm.number_days ? parseFloat(editForm.number_days) : null
      };
      
      await onUpdate({
        id: selectedRequest.id,
        data: updateData
      });
      setShowEditModal(false);
      setSelectedRequest(null);
      setEditForm({
        leave_type: '',
        start_date: '',
        end_date: '',
        number_days: '',
        reason: ''
      });
    } catch (err) {
      console.error('Update leave request error:', err);
      alert(`Failed to update request: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleCancelRequest = async (request) => {
    if (!window.confirm(`Are you sure you want to cancel this leave request? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await onUpdate({
        id: request.id,
        data: { status: 'cancelled' }
      });
    } catch (err) {
      alert(`Failed to cancel request: ${err.response?.data?.detail || err.message}`);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortField, sortOrder, pageSize]);

  if (requests.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl mt-6 animate-fade-in">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">No leave requests found</div>
          <div className="text-gray-400">There are no leave requests to review at this time.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl mt-6 animate-fade-in">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-blue-700 mb-4">Leave Requests</h2>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Page Size:</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Leave Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('start_date')}
                  className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                >
                  <span>Start Date</span>
                  {sortField === 'start_date' ? (
                    sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                  ) : (
                    <FaSort />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('end_date')}
                  className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                >
                  <span>End Date</span>
                  {sortField === 'end_date' ? (
                    sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                  ) : (
                    <FaSort />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Days
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                >
                  <span>Status</span>
                  {sortField === 'status' ? (
                    sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                  ) : (
                    <FaSort />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                >
                  <span>Created</span>
                  {sortField === 'created_at' ? (
                    sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                  ) : (
                    <FaSort />
                  )}
                </button>
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
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <FaUser className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {request.employee_name || request.employee?.full_name || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${LEAVE_TYPE_COLORS[request.leave_type] || LEAVE_TYPE_COLORS.other}`}>
                    {request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FaCalendarAlt className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {new Date(request.start_date).toLocaleDateString()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FaCalendarAlt className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {new Date(request.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {request.number_days || request.duration_days || '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate" title={request.reason}>
                    {request.reason}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    request.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : request.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : request.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {request.status === 'pending' && <FaHourglassHalf className="mr-1" />}
                    {request.status === 'approved' && <FaUserCheck className="mr-1" />}
                    {request.status === 'rejected' && <FaUserTimes className="mr-1" />}
                    {request.status === 'cancelled' && <FaBan className="mr-1" />}
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(request.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {/* Edit button - available for all requests with different contexts */}
                    <button
                      onClick={() => handleEdit(request)}
                      disabled={isUpdating}
                      className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                        request.status === 'pending'
                          ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                          : request.status === 'approved'
                          ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                          : request.status === 'rejected'
                          ? 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                          : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                      }`}
                      title={
                        request.status === 'pending'
                          ? 'Edit pending request'
                          : request.status === 'approved'
                          ? 'Modify approved request (may require re-approval)'
                          : request.status === 'rejected'
                          ? 'Edit rejected request'
                          : 'Modify cancelled request'
                      }
                    >
                      <FaEdit className="mr-1" />
                      {request.status === 'pending' ? 'Edit' : 'Modify'}
                    </button>
                    
                    {/* Approval buttons - only for pending requests */}
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproval(request, 'approve')}
                          disabled={isApproving}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          <FaCheck className="mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(request, 'reject')}
                          disabled={isApproving}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          <FaTimes className="mr-1" />
                          Reject
                        </button>
                      </>
                    )}

                    {/* Cancel button - only for pending requests */}
                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleCancelRequest(request)}
                        disabled={isUpdating}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        title="Cancel request"
                      >
                        <FaBan className="mr-1" />
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedRequests.length)} of {sortedRequests.length} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Leave Request
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Employee: <span className="font-medium">{selectedRequest.employee_name || selectedRequest.employee?.full_name}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Leave Type: <span className="font-medium">{selectedRequest.leave_type.charAt(0).toUpperCase() + selectedRequest.leave_type.slice(1)}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Period: <span className="font-medium">{new Date(selectedRequest.start_date).toLocaleDateString()} - {new Date(selectedRequest.end_date).toLocaleDateString()}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Days: <span className="font-medium">{selectedRequest.number_days || selectedRequest.duration_days || 'N/A'}</span>
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (optional)
                </label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Add any comments about this decision..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedRequest(null);
                    setApprovalAction('');
                    setApprovalComment('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={submitApproval}
                  disabled={isApproving}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    approvalAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  {isApproving ? 'Processing...' : approvalAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedRequest.status === 'pending' ? 'Edit' : 'Modify'} Leave Request
              </h3>
              
              {/* Status-specific warnings */}
              {selectedRequest.status === 'approved' && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-orange-800">Approved Request Modification</h4>
                      <p className="text-sm text-orange-700 mt-1">
                        This request has been approved. Modifying it may affect leave balances and scheduling. Consider the impact before making changes.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedRequest.status === 'rejected' && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-800">Rejected Request Modification</h4>
                      <p className="text-sm text-gray-700 mt-1">
                        This request was previously rejected. You can modify it and potentially re-approve if circumstances have changed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedRequest.status === 'cancelled' && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800">Cancelled Request Modification</h4>
                      <p className="text-sm text-red-700 mt-1">
                        This request was cancelled. You can modify it and potentially reactivate if circumstances have changed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type
                  </label>
                  <select
                    value={editForm.leave_type}
                    onChange={(e) => setEditForm({...editForm, leave_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select leave type</option>
                    <option value="vacation">Vacation</option>
                    <option value="sick">Sick Leave</option>
                    <option value="personal">Personal Leave</option>
                    <option value="maternity">Maternity Leave</option>
                    <option value="paternity">Paternity Leave</option>
                    <option value="bereavement">Bereavement Leave</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => setEditForm({...editForm, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) => setEditForm({...editForm, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days
                  </label>
                  <input
                    type="number"
                    value={editForm.number_days}
                    onChange={(e) => setEditForm({...editForm, number_days: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Number of days"
                    min="0"
                    step="0.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    value={editForm.reason}
                    onChange={(e) => setEditForm({...editForm, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Enter reason for leave"
                  />
                </div>

                {/* Additional options for approved requests */}
                {selectedRequest.status === 'approved' && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Options</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Set status back to pending for re-approval
                              setEditForm({...editForm, status: 'pending'});
                            } else {
                              // Remove status from form data
                              const { status, ...rest } = editForm;
                              setEditForm(rest);
                            }
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Mark for re-approval after changes
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRequest(null);
                    setEditForm({
                      leave_type: '',
                      start_date: '',
                      end_date: '',
                      number_days: '',
                      reason: ''
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={submitEdit}
                  disabled={isUpdating}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    selectedRequest.status === 'pending'
                      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                      : selectedRequest.status === 'approved'
                      ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                      : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                  }`}
                >
                  {isUpdating ? 'Saving...' : 
                    selectedRequest.status === 'pending' ? 'Save Changes' : 
                    selectedRequest.status === 'approved' ? 'Update Request' :
                    selectedRequest.status === 'rejected' ? 'Update Request' :
                    'Update Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveApprovalList; 