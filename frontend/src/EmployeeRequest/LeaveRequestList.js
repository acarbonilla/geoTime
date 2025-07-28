import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../utils/axiosInstance';
import { FaUserClock, FaCalendarAlt, FaUserCheck, FaUserTimes, FaHourglassHalf, FaSort, FaSortUp, FaSortDown, FaUser, FaEdit, FaTrash } from 'react-icons/fa';
import LeaveRequestForm from './LeaveRequestForm';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
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

const LeaveRequestList = ({ requests = [], isLoading = false, error = null }) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editRequest, setEditRequest] = useState(null);

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

  React.useEffect(() => {
    setCurrentPage(1); // Reset to first page on filter/sort change
  }, [statusFilter, sortField, sortOrder, pageSize]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading leave requests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <FaUserTimes className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading leave requests</h3>
            <div className="mt-2 text-sm text-red-700">
              {error.message || 'Failed to load leave requests. Please try again.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl mt-6 animate-fade-in">
      <h2 className="text-2xl font-bold mb-4 text-blue-700 flex items-center gap-2">
        <FaUserClock className="text-blue-400" /> My Leave Requests
      </h2>
      {/* Filter and sort controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Sort by:</label>
          <button
            className={`flex items-center gap-1 px-2 py-1 rounded ${sortField === 'created_at' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => handleSort('created_at')}
          >
            Date {sortField === 'created_at' && (sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            {sortField !== 'created_at' && <FaSort />}
          </button>
          <button
            className={`flex items-center gap-1 px-2 py-1 rounded ${sortField === 'status' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => handleSort('status')}
          >
            Status {sortField === 'status' && (sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            {sortField !== 'status' && <FaSort />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Show:</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="text-sm">per page</span>
        </div>
      </div>
      {/* Table */}
      {paginatedRequests.length === 0 ? (
        <div className="text-gray-500">No leave requests found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-50">
                <th className="px-3 py-2 text-left">Leave Type</th>
                <th className="px-3 py-2 text-left">Start Date</th>
                <th className="px-3 py-2 text-left">End Date</th>
                <th className="px-3 py-2 text-left">Duration</th>
                <th className="px-3 py-2 text-left">Reason</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Approver</th>
                <th className="px-3 py-2 text-left">Comments</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map((req, idx) => (
                <tr key={req.id} className={`border-b ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} animate-fade-in`} style={{animationDelay: `${idx * 40}ms`}}>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${LEAVE_TYPE_COLORS[req.leave_type] || LEAVE_TYPE_COLORS.other}`}>
                      {req.leave_type_display || req.leave_type || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <FaCalendarAlt className="text-blue-400 inline mr-1" />
                    {req.start_date}
                  </td>
                  <td className="px-3 py-2">
                    <FaCalendarAlt className="text-blue-400 inline mr-1" />
                    {req.end_date}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {req.number_days || req.duration_days || '-'} day{(req.number_days || req.duration_days) !== 1 ? 's' : ''}
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate" title={req.reason}>
                    {req.reason || '-'}
                  </td>
                  <td className="px-3 py-2 capitalize">
                    {req.status === 'pending' && <span className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full font-semibold"><FaHourglassHalf /> Pending</span>}
                    {req.status === 'approved' && <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full font-semibold"><FaUserCheck /> Approved</span>}
                    {req.status === 'rejected' && <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded-full font-semibold"><FaUserTimes /> Rejected</span>}
                  </td>
                  <td className="px-3 py-2">{req.approver_name || '-'}</td>
                  <td className="px-3 py-2 max-w-xs truncate" title={req.comments}>
                    {req.comments || '-'}
                  </td>
                  <td className="px-3 py-2">
                    {req.status === 'pending' && (
                      <>
                        <button
                          className="mr-2 px-3 py-1 rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-semibold flex items-center gap-1"
                          onClick={() => handleEdit(req)}
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200 font-semibold flex items-center gap-1"
                          onClick={() => handleDelete(req)}
                        >
                          <FaTrash /> Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Edit Modal */}
      {showForm && (
        <>
          {/* Modal Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-40 animate-fade-in"
            onClick={() => { setShowForm(false); setEditRequest(null); }}
          />
          {/* Modal Content */}
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative animate-fade-in"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                onClick={() => { setShowForm(false); setEditRequest(null); }}
                aria-label="Close"
              >
                &times;
              </button>
              <LeaveRequestForm
                onSuccess={handleFormSuccess}
                onClose={() => { setShowForm(false); setEditRequest(null); }}
                request={editRequest}
              />
            </div>
          </div>
        </>
      )}
      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex gap-1">
          <button
            className="px-2 py-1 rounded bg-gray-100 text-gray-700 disabled:opacity-50"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >First</button>
          <button
            className="px-2 py-1 rounded bg-gray-100 text-gray-700 disabled:opacity-50"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >Prev</button>
          <button
            className="px-2 py-1 rounded bg-gray-100 text-gray-700 disabled:opacity-50"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >Next</button>
          <button
            className="px-2 py-1 rounded bg-gray-100 text-gray-700 disabled:opacity-50"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >Last</button>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestList; 