import React from 'react';

const TeamReports = ({ teamMembersCount, teamAttendance }) => (
  <section>
    <h2>Team Reports</h2>
    <div style={{ marginBottom: '1rem' }}>
      <strong>Total Team Members:</strong> {teamMembersCount}
      <br />
      <strong>Currently Active:</strong> {teamAttendance?.present ?? 0}
      <br />
      <strong>Absent Today:</strong> {teamAttendance?.absent ?? 0}
      <br />
      <strong>Late Today:</strong> {teamAttendance?.late ?? 0}
    </div>
    <div style={{ border: '1px dashed #aaa', padding: '1rem', borderRadius: 8 }}>
      <em>Attendance trends and performance charts will be displayed here in the future.</em>
    </div>
  </section>
);

export default TeamReports; 