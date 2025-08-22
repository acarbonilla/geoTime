import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return '-';
  
  // Handle different date formats
  let date;
  if (typeof dateString === 'string') {
    // Try to parse the date string
    date = new Date(dateString);
  } else if (dateString instanceof Date) {
    date = dateString;
  } else {
    return '-';
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return '-';
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Helper function to format time
const formatTime = (timeString) => {
  if (!timeString) return '-';
  
  // If it's already a formatted time string, return as is
  if (typeof timeString === 'string' && timeString.includes(':')) {
    return timeString;
  }
  
  // Try to format as time if it's a valid time value
  try {
    const time = new Date(`2000-01-01T${timeString}`);
    if (!isNaN(time.getTime())) {
      return time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  } catch (e) {
    // If parsing fails, return as is
  }
  
  return timeString;
};

// Helper function to get status color
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved':
      return '#10B981'; // Green
    case 'rejected':
      return '#EF4444'; // Red
    case 'pending':
      return '#F59E0B'; // Yellow
    default:
      return '#6B7280'; // Gray
  }
};

// Generate Leave Request PDF
export const generateLeaveRequestPDF = (request) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(59, 130, 246); // Blue
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GEO TIME SYSTEM', 105, 15, { align: 'center' });
  
  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('LEAVE REQUEST REPORT', 105, 40, { align: 'center' });
  
  // Blue line
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(20, 45, 190, 45);
  
  let yPosition = 60;
  
  // Employee Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information:', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${request.employee_name || request.employee?.name || '-'}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Date: ${formatDate(request.start_date)} - ${formatDate(request.end_date)}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Duration: ${request.number_days || request.duration_days || '-'} day(s)`, 20, yPosition);
  yPosition += 15;
  
  // Request Details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Request Details:', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Leave Type: ${request.leave_type_display || request.leave_type || '-'}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Reason: ${request.reason || '-'}`, 20, yPosition);
  yPosition += 15;
  
  // Status Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Status Information:', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${request.status || '-'}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Approved Date: ${request.status === 'approved' ? formatDate(request.approved_date) : '-'}`, 20, yPosition);
  yPosition += 15;
  
  // Approver Comments
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Approver Comments:', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(request.comments || 'No comments', 20, yPosition);
  yPosition += 15;
  
  // Footer
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.3);
  doc.line(20, 180, 190, 180);
  
  const currentDate = new Date();
  const footerText = `Generated on ${currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })} at ${currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })}`;
  
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(10);
  doc.text(footerText, 105, 190, { align: 'center' });
  
  return doc;
};

// Generate Change Schedule Request PDF
export const generateChangeScheduleRequestPDF = (request) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(59, 130, 246); // Blue
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GEO TIME SYSTEM', 105, 15, { align: 'center' });
  
  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CHANGE SCHEDULE REQUEST REPORT', 105, 40, { align: 'center' });
  
  // Blue line
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(20, 45, 190, 45);
  
  let yPosition = 60;
  
  // Employee Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information:', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${request.employee_name || request.employee?.name || '-'}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Request Date: ${formatDate(request.created_at)}`, 20, yPosition);
  yPosition += 15;
  
  // Request Details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Request Details:', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Original Date: ${formatDate(request.original_date)}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Requested Date: ${formatDate(request.requested_date)}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Original Time: ${formatTime(request.original_time_in)} - ${formatTime(request.original_time_out)}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Requested Time: ${formatTime(request.requested_time_in)} - ${formatTime(request.requested_time_out)}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Reason: ${request.reason || '-'}`, 20, yPosition);
  yPosition += 15;
  
  // Status Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Status Information:', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${request.status || '-'}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Approved Date: ${request.status === 'approved' ? formatDate(request.approved_date) : '-'}`, 20, yPosition);
  yPosition += 15;
  
  // Approver Comments
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Approver Comments:', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(request.comments || 'No comments', 20, yPosition);
  yPosition += 15;
  
  // Footer
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.3);
  doc.line(20, 180, 190, 180);
  
  const currentDate = new Date();
  const footerText = `Generated on ${currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })} at ${currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })}`;
  
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(10);
  doc.text(footerText, 105, 190, { align: 'center' });
  
  return doc;
};

// Generate Overtime Request PDF
export const generateOvertimeRequestPDF = (request) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(59, 130, 246); // Blue
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GEO TIME SYSTEM', 105, 15, { align: 'center' });
  
  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('OVERTIME REQUEST REPORT', 105, 40, { align: 'center' });
  
  // Blue line
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(20, 45, 190, 45);
  
  let yPosition = 60;
  
  // Employee Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information:', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${request.employee_name || request.employee?.name || '-'}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Date: ${formatDate(request.date) || '-'}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Time In - Time Out: ${formatTime(request.start_time) || '-'} - ${formatTime(request.end_time) || '-'}`, 20, yPosition);
  yPosition += 15;
  
  // Request Details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Request Details:', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ticket ID: ${request.ticket || request.id || '-'}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Reason: ${request.reason || '-'}`, 20, yPosition);
  yPosition += 15;
  
  // Status Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Status Information:', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${request.status || '-'}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Approved Date: ${request.status === 'approved' ? formatDate(request.approved_date) : '-'}`, 20, yPosition);
  yPosition += 15;
  
  // Approver Comments
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Approver Comments:', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(request.comments || 'No comments', 20, yPosition);
  yPosition += 15;
  
  // Footer
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.3);
  doc.line(20, 180, 190, 180);
  
  const currentDate = new Date();
  const footerText = `Generated on ${currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })} at ${currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })}`;
  
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(10);
  doc.text(footerText, 105, 190, { align: 'center' });
  
  return doc;
};

// Download PDF function
export const downloadPDF = (doc, filename) => {
  doc.save(filename);
};
