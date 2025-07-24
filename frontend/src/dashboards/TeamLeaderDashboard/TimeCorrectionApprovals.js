import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { XMarkIcon, CheckCircleIcon, XCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const TimeCorrectionApprovals = ({ search = '', pageSize = 5, onClose }) => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const fetchPendingApprovals = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get('time-correction-requests/', {
          params: { status: 'pending' }
        });
        
        const data = Array.isArray(response.data) ? response.data : response.data?.results || [];
        
        if (data.length === 0) {
          console.warn('No pending time correction requests found');
        } else {
          console.log(`Found ${data.length} pending time correction requests`);
        }
        
        setApprovals(data);
      } catch (error) {
        console.error('Error fetching time correction requests:', {
          message: error.message,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          } : 'No response',
          config: error.config ? {
            url: error.config.url,
            method: error.config.method,
            headers: error.config.headers
          } : 'No config'
        });
        setError(`Failed to fetch correction requests: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingApprovals();
  }, []);

  // Filtering logic
  const filteredApprovals = approvals.filter(item => {
    const matchesSearch =
      !search ||
      (item.employee_name && item.employee_name.toLowerCase().includes(search.toLowerCase())) ||
      (item.date && item.date.includes(search)) ||
      (item.reason && item.reason.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredApprovals.length / pageSize) || 1;
  const pagedApprovals = filteredApprovals.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  // Approve/Deny handlers
  const handleAction = async (id, status) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    
    try {
      await axiosInstance.patch(`time-correction-requests/${id}/`, { status });
      
      // Remove the approved/denied request from the list
      setApprovals(prev => {
        const updated = prev.filter(item => item.id !== id);
        return updated;
      });
      
      // Show success message
      const action = status === 'approved' ? 'approved' : 'denied';
      console.log(`Successfully ${action} time correction request ${id}`);
    } catch (error) {
      console.error(`Error ${status === 'approved' ? 'approving' : 'denying'} request ${id}:`, {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'No response',
        config: error.config ? {
          url: error.config.url,
          method: error.config.method
        } : 'No config'
      });
      
      alert(`Failed to ${status === 'approved' ? 'approve' : 'deny'} request. Please try again.`);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Time Correction Approvals</h2>
          <p className="text-xs text-gray-500 mt-1">Review and manage your team’s pending time correction requests below.</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 ml-2 text-gray-500 hover:text-red-600 focus:outline-none rounded-full bg-gray-100 hover:bg-red-100 transition-all duration-150 shadow"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <svg className="animate-spin h-8 w-8 text-yellow-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span className="text-yellow-700">Loading pending requests...</span>
        </div>
      )}
      {error && (
        <div className="flex items-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <ExclamationCircleIcon className="h-5 w-5 mr-2 text-red-500" />
          <span className="block">{error}</span>
        </div>
      )}
      {!loading && !error && pagedApprovals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <XCircleIcon className="h-12 w-12 mb-2 text-gray-300" />
          <span className="text-lg">No pending time correction requests.</span>
        </div>
      )}
      {!loading && !error && pagedApprovals.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-yellow-100 text-yellow-900">
                  <th className="py-2 px-4 text-left">Employee</th>
                  <th className="py-2 px-4 text-left">Date</th>
                  <th className="py-2 px-4 text-left">Requested Time In</th>
                  <th className="py-2 px-4 text-left">Requested Time Out</th>
                  <th className="py-2 px-4 text-left">Reason</th>
                  <th className="py-2 px-4 text-left">Status</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedApprovals.map((item, idx) => (
                  <tr key={item.id} className={`transition-colors duration-200 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-yellow-50`}>
                    <td className="py-2 px-4 font-medium whitespace-nowrap">{item.employee_name}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{item.date}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{item.requested_time_in || '-'}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{item.requested_time_out || '-'}</td>
                    <td className="py-2 px-4 max-w-xs truncate" title={item.reason}>{item.reason}</td>
                    <td className="py-2 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </td>
                    <td className="py-2 px-4 flex gap-2">
                      <button
                        onClick={() => handleAction(item.id, 'approved')}
                        disabled={actionLoading[item.id]}
                        className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded shadow-sm hover:bg-green-600 transition text-xs"
                        title="Approve Request"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        {actionLoading[item.id] ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'denied')}
                        disabled={actionLoading[item.id]}
                        className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded shadow-sm hover:bg-red-600 transition text-xs"
                        title="Deny Request"
                      >
                        <XCircleIcon className="h-4 w-4" />
                        {actionLoading[item.id] ? '...' : 'Deny'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 mt-4">
            <span className="font-medium">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded bg-yellow-100 text-yellow-700 font-bold disabled:opacity-50"
                title="Previous Page"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 rounded font-bold ${page === i + 1 ? 'bg-yellow-400 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-200'}`}
                  title={`Go to page ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded bg-yellow-100 text-yellow-700 font-bold disabled:opacity-50"
                title="Next Page"
              >
                &gt;
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default TimeCorrectionApprovals; 