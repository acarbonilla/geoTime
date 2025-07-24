import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { XMarkIcon } from '@heroicons/react/24/outline';

const TeamMemberList = ({ teamLeaderId, search = '', status = '', onClose }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    if (!teamLeaderId) return;
    setLoading(true);
    setError(null);
    axiosInstance.get(`employees/${teamLeaderId}/subordinates/`)
      .then(res => {
        setTeamMembers(res.data);
        setLoading(false);
      })
      .catch(err => {
        let message = 'Failed to fetch team members';
        if (err.response) {
          if (err.response.data && err.response.data.error) {
            message += `: ${err.response.data.error}`;
          } else if (typeof err.response.data === 'string') {
            message += `: ${err.response.data}`;
          } else {
            message += ` (status ${err.response.status})`;
          }
        } else if (err.message) {
          message += `: ${err.message}`;
        }
        setError(message);
        setLoading(false);
      });
  }, [teamLeaderId]);

  // Filtering logic
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch =
      !search ||
      member.first_name.toLowerCase().includes(search.toLowerCase()) ||
      member.last_name.toLowerCase().includes(search.toLowerCase()) ||
      member.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      (member.position && member.position.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !status || member.employment_status === status;
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const pagedMembers = filteredMembers.slice((page - 1) * pageSize, page * pageSize);

  // Reset to page 1 if filters or pageSize change
  useEffect(() => {
    setPage(1);
  }, [search, status, pageSize]);

  return (
    <section>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-700">Team Member List</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-red-600 focus:outline-none"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      {loading && <div className="text-blue-600 animate-pulse">Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && pagedMembers.length === 0 && <div className="text-gray-500">No team members found.</div>}
      {!loading && !error && pagedMembers.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow-md">
              <thead>
                <tr className="bg-blue-100 text-blue-900">
                  <th className="py-2 px-4 text-left">Name</th>
                  <th className="py-2 px-4 text-left">Employee ID</th>
                  <th className="py-2 px-4 text-left">Position</th>
                  <th className="py-2 px-4 text-left">Role</th>
                  <th className="py-2 px-4 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedMembers.map((member, idx) => (
                  <tr
                    key={member.id}
                    className={
                      `transition-colors duration-200 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`
                    }
                  >
                    <td className="py-2 px-4 font-medium">{member.first_name} {member.last_name}</td>
                    <td className="py-2 px-4">{member.employee_id}</td>
                    <td className="py-2 px-4">{member.position}</td>
                    <td className="py-2 px-4 capitalize">{member.role}</td>
                    <td className={`py-2 px-4 capitalize ${member.employment_status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>{member.employment_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 mt-4">
            <div>
              <label className="mr-2 font-medium">Rows per page:</label>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="border rounded px-2 py-1 focus:ring-2 focus:ring-blue-400"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded bg-blue-100 text-blue-700 font-bold disabled:opacity-50"
              >
                &lt;
              </button>
              <span className="font-medium">Page {page} of {totalPages}</span>
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

export default TeamMemberList; 