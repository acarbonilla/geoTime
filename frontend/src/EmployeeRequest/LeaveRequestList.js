import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../utils/axiosInstance';
import { FaUserClock, FaCalendarAlt, FaUserCheck, FaUserTimes, FaHourglassHalf, FaSort, FaSortUp, FaSortDown, FaEdit, FaTrash, FaDownload, FaPlus, FaFilter, FaSearch, FaUmbrellaBeach, FaProcedures, FaHeart, FaBaby, FaGrave, FaQuestion } from 'react-icons/fa';
import LeaveRequestForm from './LeaveRequestForm';
import { generateLeaveRequestPDF, downloadPDF } from '../utils/pdfGenerator';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses', color: 'bg-gray-100 text-gray-800' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
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

const LEAVE_TYPE_ICONS = {
  vacation: FaUmbrellaBeach,
  sick: FaProcedures,
  personal: FaUserClock,
  maternity: FaBaby,
  paternity: FaBaby,
  bereavement: FaHeart,
  other: FaQuestion,
};

const STATUS_ICONS = {
  pending: FaHourglassHalf,
  approved: FaUserCheck,
  rejected: FaUserTimes,
};

const LeaveRequestList = ({ requests = [], isLoading = false, error = null, onRequestCreated }) => {
  const queryClient = useQueryClient();
  // Filtering, sorting, pagination state
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await axios.post('leave-requests/', formData);
      return response.data;
    },
    onSuccess: (newRequest) => {
      // Optimistically update the cache
      queryClient.setQueryData(['leave-requests'], (oldData) => {
        if (!oldData) return { results: [newRequest] };
        if (oldData.results) {
          return {
            ...oldData,
            results: [newRequest, ...oldData.results]
          };
        }
        return {
          ...oldData,
          data: [newRequest, ...(oldData.data || [])]
        };
      });
      
      // Also invalidate to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      
      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000); // Hide after 5 seconds
      
      // Call the parent callback if provided
      if (onRequestCreated) {
        onRequestCreated(newRequest);
      }
    },
    onError: (error) => {
      console.error('Failed to create leave request:', error);
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (requestId) => {
      await axios.delete(`leave-requests/${requestId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  // Filtering
  const filteredRequests = useMemo(() => {
    let filtered = [...requests];
    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.leave_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [requests, statusFilter, searchTerm]);

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

  React.useEffect(() => {
    setCurrentPage(1); // Reset to first page on filter/sort change
  }, [statusFilter, sortField, sortOrder, pageSize, searchTerm]);

  const handleEdit = (req) => {
    setEditRequest(req);
    setShowForm(true);
  };

  const handleDelete = async (req) => {
    if (!window.confirm('Are you sure you want to delete this leave request?')) return;
    try {
      await deleteMutation.mutateAsync(req.id);
    } catch (err) {
      alert('Failed to delete leave request. Only pending requests can be deleted.');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditRequest(null);
  };

  const handleFormSubmit = async (formData) => {
    try {
      await createMutation.mutateAsync(formData);
      setShowForm(false);
      setEditRequest(null);
    } catch (error) {
      // Error is handled by the mutation
      console.error('Form submission failed:', error);
    }
  };

  const handleDownloadPDF = (request) => {
    const pdf = generateLeaveRequestPDF(request);
    downloadPDF(pdf, `leave-request-${request.id}.pdf`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status) => {
    const IconComponent = STATUS_ICONS[status] || FaHourglassHalf;
    return <IconComponent className="w-4 h-4" />;
  };

  const getLeaveTypeIcon = (leaveType) => {
    const IconComponent = LEAVE_TYPE_ICONS[leaveType] || FaQuestion;
    return <IconComponent className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Leave Requests</div>
        <div className="text-red-500">{error.message || 'An error occurred while loading the data.'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Leave Requests</h2>
            <p className="text-green-100">Manage and track employee leave requests</p>
        </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-all duration-200 transform hover:scale-105 shadow-md flex items-center gap-2"
          >
            <FaPlus className="w-4 h-4" />
            New Request
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-md animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Leave request created successfully!
              </p>
              <p className="text-sm text-green-700">
                Your request has been submitted and is now pending approval.
              </p>
            </div>
          <button
              onClick={() => setShowSuccessMessage(false)}
              className="text-green-400 hover:text-green-600 transition-colors"
          >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
          </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, reason, or leave type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Page Size */}
          <div>
          <select
            value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
          >
            {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>Show {size}</option>
            ))}
          </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Showing {paginatedRequests.length} of {sortedRequests.length} requests</span>
          <span>Page {currentPage} of {totalPages}</span>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {paginatedRequests.map((request, index) => (
          <div
            key={request.id}
            className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FaUserClock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{request.employee_name || 'Unknown Employee'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${LEAVE_TYPE_COLORS[request.leave_type] || 'bg-gray-100 text-gray-800'}`}>
                      {getLeaveTypeIcon(request.leave_type)}
                      {request.leave_type_display || request.leave_type || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${STATUS_OPTIONS.find(s => s.value === request.status)?.color || 'bg-gray-100 text-gray-800'}`}>
                  {getStatusIcon(request.status)}
                  {request.status?.charAt(0).toUpperCase() + request.status?.slice(1) || 'Unknown'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Start Date</p>
                  <p className="font-medium">{formatDate(request.start_date)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">End Date</p>
                  <p className="font-medium">{formatDate(request.end_date)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <FaUserCheck className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Approver</p>
                  <p className="font-medium">{request.approver_name || 'Pending'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Approved Date</p>
                  <p className="font-medium">{request.status === 'approved' ? formatDate(request.approved_date) : '-'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="font-medium">{request.duration_days || request.number_days || '-'} days</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <FaUserClock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Request Date</p>
                  <p className="font-medium">{formatDate(request.created_at)}</p>
                </div>
              </div>
            </div>

            {request.reason && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Reason</p>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{request.reason}</p>
              </div>
            )}

            {request.comments && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Comments</p>
                <p className="text-gray-700 bg-green-50 p-3 rounded-lg border-l-4 border-green-200">{request.comments}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Created: {formatDate(request.created_at)}</span>
                {request.updated_at !== request.created_at && (
                  <span>• Updated: {formatDate(request.updated_at)}</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Show Edit and Delete only for pending requests */}
                {request.status === 'pending' && (
                        <>
                          <button
                      onClick={() => handleEdit(request)}
                      className="px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 font-medium"
                          >
                      Edit
                          </button>
                          <button
                      onClick={() => handleDelete(request)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium"
                          >
                      Delete
                          </button>
                        </>
                      )}
                
                {/* Show PDF download only for approved or denied requests */}
                {(request.status === 'approved' || request.status === 'denied') && (
                  <button
                    onClick={() => handleDownloadPDF(request)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium flex items-center gap-2"
                  >
                    <FaDownload className="w-4 h-4" />
                    PDF
                  </button>
                )}
              </div>
            </div>
                    </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Previous
              </button>
            </div>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                      currentPage === pageNum
                        ? 'bg-green-600 text-white'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <>
          {/* Modal Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in"
            onClick={() => {
              setShowForm(false);
              setEditRequest(null);
            }}
          />
          {/* Modal Content */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editRequest ? 'Edit Leave Request' : 'New Leave Request'}
                  </h2>
              <button
                    onClick={() => {
                      setShowForm(false);
                      setEditRequest(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
              </button>
                </div>
              <LeaveRequestForm
                  request={editRequest}
                onSuccess={handleFormSuccess}
                  onCancel={() => {
                    setShowForm(false);
                    setEditRequest(null);
                  }}
                  onSubmit={handleFormSubmit}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeaveRequestList; 