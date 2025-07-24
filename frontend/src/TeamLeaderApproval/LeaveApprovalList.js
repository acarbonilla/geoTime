import React, { useEffect, useState, useMemo } from 'react';
import axios from '../utils/axiosInstance';
import { FaUserClock, FaCalendarAlt, FaUserCheck, FaUserTimes, FaHourglassHalf, FaSort, FaSortUp, FaSortDown, FaUser, FaCheck, FaTimes } from 'react-icons/fa';

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

const LeaveApprovalList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalAction, setApprovalAction] = useState(''); // 'approve' or 'reject'
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('leave-requests/');
        setRequests(res.data.results || res.data || []);
      } catch (err) {
        setError('Failed to load leave requests.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [refreshKey]);

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

  const submitApproval = async () => {
    if (!selectedRequest) return;
    
    setApprovalLoading(true);
    try {
      const endpoint = approvalAction === 'approve' ? 'approve' : 'reject';
      await axios.post(`leave-requests/${selectedRequest.id}/${endpoint}/`, {
        comments: approvalComment
      });
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalAction('');
      setApprovalComment('');
      setRefreshKey(k => k + 1);
    } catch (err) {
      alert(`Failed to ${approvalAction} request: ${err.response?.data?.detail || err.message}`);
    } finally {
      setApprovalLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortField, sortOrder, pageSize]);

  if (loading) return <div className="text-center py-4">Loading leave requests...</div>;
  if (error) return <div className="text-red-500 text-center py-4">{error}</div>;

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl mt-6 animate-fade-in">
      <h2 className="text-2xl font-bold mb-4 text-blue-700 flex items-center gap-2">
        <FaUserClock className="text-blue-400" /> Team Leave Requests
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
                <th className="px-3 py-2 text-left">Employee</th>
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
                  <td className="px-3 py-2 font-semibold">
                    <FaUser className="text-blue-400 inline mr-1" />
                    {req.employee_name || '-'}
                  </td>
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
                    {req.duration_days || '-'} day{req.duration_days !== 1 ? 's' : ''}
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
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 rounded bg-green-100 text-green-800 hover:bg-green-200 font-semibold flex items-center gap-1"
                          onClick={() => handleApproval(req, 'approve')}
                        >
                          <FaCheck /> Approve
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200 font-semibold flex items-center gap-1"
                          onClick={() => handleApproval(req, 'reject')}
                        >
                          <FaTimes /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      {/* Approval Modal */}
      {showApprovalModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-40 animate-fade-in"
            onClick={() => setShowApprovalModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative animate-fade-in"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                onClick={() => setShowApprovalModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
              <h3 className="text-xl font-bold mb-4 text-blue-700">
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Leave Request
              </h3>
              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  Employee: <span className="font-semibold">{selectedRequest?.employee_name}</span>
                </p>
                <p className="text-gray-600 mb-2">
                  Leave Type: <span className="font-semibold">{selectedRequest?.leave_type_display}</span>
                </p>
                <p className="text-gray-600 mb-2">
                  Duration: <span className="font-semibold">{selectedRequest?.start_date} to {selectedRequest?.end_date}</span>
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows={3}
                  value={approvalComment}
                  onChange={e => setApprovalComment(e.target.value)}
                  placeholder={`Add a comment for ${approvalAction === 'approve' ? 'approval' : 'rejection'}...`}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold"
                  onClick={() => setShowApprovalModal(false)}
                  disabled={approvalLoading}
                >
                  Cancel
                </button>
                <button
                  className={`px-5 py-2 rounded font-semibold shadow disabled:opacity-60 ${
                    approvalAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                  onClick={submitApproval}
                  disabled={approvalLoading}
                >
                  {approvalLoading ? 'Processing...' : (approvalAction === 'approve' ? 'Approve' : 'Reject')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeaveApprovalList; 