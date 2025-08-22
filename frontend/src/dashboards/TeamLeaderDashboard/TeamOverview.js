import React from 'react';

const stats = [
  {
    label: 'Total Team Members',
    icon: (
      <svg className="w-7 h-7 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 10-8 0 4 4 0 008 0z" />
      </svg>
    ),
    color: 'bg-gradient-to-br from-slate-700 to-slate-800',
    hoverColor: 'hover:from-slate-600 hover:to-slate-700',
    valueKey: 'teamMembersCount',
    isButton: true,
  },
  {
    label: 'Currently Active',
    icon: (
      <svg className="w-7 h-7 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    color: 'bg-gradient-to-br from-emerald-600 to-green-700',
    hoverColor: 'hover:from-emerald-500 hover:to-green-600',
    valueKey: 'present',
  },
  {
    label: 'No Shift Entry',
    icon: (
      <svg className="w-7 h-7 text-red-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    color: 'bg-gradient-to-br from-red-600 to-pink-700',
    hoverColor: 'hover:from-red-500 hover:to-pink-600',
    valueKey: 'absent',
  },
  {
    label: 'Pending Approvals',
    icon: (
      <svg className="w-7 h-7 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
    ),
    color: 'bg-gradient-to-br from-amber-600 to-orange-700',
    hoverColor: 'hover:from-amber-500 hover:to-orange-600',
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
    <section className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-600">
          Team Overview
        </h2>
        <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto rounded-full shadow-lg"></div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        {/* Enhanced Total Team Members Card */}
        <button
          type="button"
          aria-label="Show Team Members"
          onClick={onTeamMembersClick}
          className={`group flex items-center p-6 rounded-2xl shadow-xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 ${stats[0].color} ${stats[0].hoverColor} focus:outline-none focus:ring-4 focus:ring-blue-400/50 border border-slate-600/50 relative overflow-hidden`}
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          
          <div className="relative z-10 flex items-center w-full">
            <div className="mr-5 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              {stats[0].icon}
            </div>
            <div className="flex-1 text-left">
              <div className="text-3xl font-bold text-white mb-1 group-hover:scale-110 transition-transform duration-300">
                {values.teamMembersCount}
              </div>
              <div className="text-blue-100 text-sm font-medium opacity-90">{stats[0].label}</div>
            </div>
            <div className="text-blue-200 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Enhanced Currently Active Card */}
        <button
          type="button"
          aria-label="Show Present Today Time Entries"
          onClick={onPresentTodayClick}
          className={`group flex items-center p-6 rounded-2xl shadow-xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 ${stats[1].color} ${stats[1].hoverColor} focus:outline-none focus:ring-4 focus:ring-emerald-400/50 border border-emerald-600/50 relative overflow-hidden`}
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          
          <div className="relative z-10 flex items-center w-full">
            <div className="mr-5 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              {stats[1].icon}
            </div>
            <div className="flex-1 text-left">
              <div className="text-3xl font-bold text-white mb-1 group-hover:scale-110 transition-transform duration-300">
                {values.present}
              </div>
              <div className="text-emerald-100 text-sm font-medium opacity-90">{stats[1].label}</div>
            </div>
            <div className="text-emerald-200 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Enhanced No Shift Entry Card */}
        <button
          type="button"
          aria-label="Show No Shift Entry Employees"
          onClick={onAbsentTodayClick}
          className={`group flex items-center p-6 rounded-2xl shadow-xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 ${stats[2].color} ${stats[2].hoverColor} focus:outline-none focus:ring-4 focus:ring-red-400/50 border border-red-600/50 relative overflow-hidden`}
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          
          <div className="relative z-10 flex items-center w-full">
            <div className="mr-5 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              {stats[2].icon}
            </div>
            <div className="flex-1 text-left">
              <div className="text-3xl font-bold text-white mb-1 group-hover:scale-110 transition-transform duration-300">
                {values.absent}
              </div>
              <div className="text-red-100 text-sm font-medium opacity-90">{stats[2].label}</div>
            </div>
            <div className="text-red-200 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Enhanced Pending Approvals Card */}
        <button
          type="button"
          aria-label="Show Pending Approvals"
          onClick={onPendingApprovalsClick}
          className={`group flex items-center p-6 rounded-2xl shadow-xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 ${stats[3].color} ${stats[3].hoverColor} focus:outline-none focus:ring-4 focus:ring-amber-400/50 border border-amber-600/50 relative overflow-hidden`}
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          
          <div className="relative z-10 flex items-center w-full">
            <div className="mr-5 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              {stats[3].icon}
            </div>
            <div className="flex-1 text-left">
              <div className="text-3xl font-bold text-white mb-1 group-hover:scale-110 transition-transform duration-300">
                {values.pendingApprovals}
              </div>
              <div className="text-amber-100 text-sm font-medium opacity-90">{stats[3].label}</div>
            </div>
            <div className="text-amber-200 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      </div>
    </section>
  );
};

export default TeamOverview; 