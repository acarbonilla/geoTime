import React, { useState, useEffect } from 'react';

const MyTimeCorrectionRequests = ({ requests = [], isLoading = false, error = null, onRequestCreated }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Filtering logic
  const filteredRequests = requests.filter(item => {
    const matchesSearch =
      !search ||
      (item.date && item.date.includes(search)) ||
      (item.reason && item.reason.toLowerCase().includes(search.toLowerCase())) ||
      (item.status && item.status.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const pagedRequests = filteredRequests.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Time Correction Requests</div>
        <div className="text-red-500">{error.message || 'An error occurred while loading the data.'}</div>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-2 text-gray-700">My Time Correction Requests</h2>
      <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center mb-4">
        <input
          type="text"
          placeholder="Search by date, reason, or status..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-1/2 focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
          className="border rounded px-3 py-2 w-full md:w-1/6 focus:ring-2 focus:ring-blue-400"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>
      </div>
      {!pagedRequests.length && <div className="text-gray-500">No requests found.</div>}
      {pagedRequests.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow-md">
              <thead>
                <tr className="bg-blue-100 text-blue-900">
                  <th className="py-2 px-4 text-left">Date</th>
                  <th className="py-2 px-4 text-left">Requested Time In</th>
                  <th className="py-2 px-4 text-left">Requested Time Out</th>
                  <th className="py-2 px-4 text-left">Reason</th>
                  <th className="py-2 px-4 text-left">Status</th>
                  <th className="py-2 px-4 text-left">Response</th>
                </tr>
              </thead>
              <tbody>
                {pagedRequests.map((item, idx) => (
                  <tr key={item.id} className={`transition-colors duration-200 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`}>
                    <td className="py-2 px-4">{item.date}</td>
                    <td className="py-2 px-4">{item.requested_time_in || '-'}</td>
                    <td className="py-2 px-4">{item.requested_time_out || '-'}</td>
                    <td className="py-2 px-4">{item.reason}</td>
                    <td className="py-2 px-4 capitalize font-bold">
                      {item.status === 'pending' && <span className="text-yellow-600">Pending</span>}
                      {item.status === 'approved' && <span className="text-green-600">Approved</span>}
                      {item.status === 'denied' && <span className="text-red-600">Denied</span>}
                    </td>
                    <td className="py-2 px-4">{item.response_message || '-'}</td>
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
                className="px-3 py-1 rounded bg-blue-100 text-blue-700 font-bold disabled:opacity-50"
              >
                &lt;
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded bg-blue-100 text-blue-700 font-bold disabled:opacity-50"
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

export default MyTimeCorrectionRequests; 