import React from 'react';

const stats = [
  {
    label: 'Total Team Members',
    icon: (
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 10-8 0 4 4 0 008 0z" /></svg>
    ),
    color: 'bg-blue-50',
    valueKey: 'teamMembersCount',
    isButton: true,
  },
  {
    label: 'Currently Active',
    icon: (
      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
    ),
    color: 'bg-green-50',
    valueKey: 'present',
  },
  {
    label: 'No Shift Entry',
    icon: (
      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
    ),
    color: 'bg-red-50',
    valueKey: 'absent',
  },
  {
    label: 'Pending Approvals',
    icon: (
      <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
    ),
    color: 'bg-yellow-50',
    valueKey: 'pendingApprovals',
  },
];

const TeamOverview = ({ teamMembersCount, teamAttendance, pendingApprovals, onTeamMembersClick, onPresentTodayClick, onPendingApprovalsClick, onAbsentTodayClick }) => {
  const values = {
    teamMembersCount,
    present: teamAttendance?.present ?? 0,
    absent: teamAttendance?.absent ?? 0,
    pendingApprovals: pendingApprovals ?? 0,
  };

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Team Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
        {/* Make the first card a button */}
        <button
          type="button"
          aria-label="Show Team Members"
          onClick={onTeamMembersClick}
          className="flex items-center p-4 rounded-lg shadow transition-transform duration-300 hover:scale-105 bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <div className="mr-4">{stats[0].icon}</div>
          <div>
            <div className="text-2xl font-bold">{values.teamMembersCount}</div>
            <div className="text-gray-600 text-sm">{stats[0].label}</div>
          </div>
        </button>
        {/* Make the Present Today card a button */}
        <button
          type="button"
          aria-label="Show Present Today Time Entries"
          onClick={onPresentTodayClick}
          className="flex items-center p-4 rounded-lg shadow transition-transform duration-300 hover:scale-105 bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <div className="mr-4">{stats[1].icon}</div>
          <div>
            <div className="text-2xl font-bold">{values.present}</div>
            <div className="text-gray-600 text-sm">{stats[1].label}</div>
          </div>
        </button>
        {/* Make the Absent Today card a button */}
        <button
          type="button"
          aria-label="Show No Shift Entry Employees"
          onClick={onAbsentTodayClick}
          className="flex items-center p-4 rounded-lg shadow transition-transform duration-300 hover:scale-105 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <div className="mr-4">{stats[2].icon}</div>
          <div>
            <div className="text-2xl font-bold">{values.absent}</div>
            <div className="text-gray-600 text-sm">{stats[2].label}</div>
          </div>
        </button>
        {/* Only keep the Pending Approvals card as a button that opens the modal */}
        <button
          type="button"
          aria-label="Show Pending Approvals"
          onClick={onPendingApprovalsClick}
          className="flex items-center p-4 rounded-lg shadow transition-transform duration-300 hover:scale-105 bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <div className="mr-4">{stats[3].icon}</div>
          <div>
            <div className="text-2xl font-bold">{values.pendingApprovals}</div>
            <div className="text-gray-600 text-sm">{stats[3].label}</div>
          </div>
        </button>
      </div>
    </section>
  );
};

export default TeamOverview; 