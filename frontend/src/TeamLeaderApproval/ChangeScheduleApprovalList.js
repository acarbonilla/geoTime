import React, { useState, useMemo, useEffect } from 'react';
import { FaExchangeAlt, FaCalendarAlt, FaClock, FaUserCheck, FaUserTimes, FaHourglassHalf, FaSort, FaSortUp, FaSortDown, FaUser, FaCheck, FaTimes, FaEdit, FaBan, FaDownload } from 'react-icons/fa';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ChangeScheduleApprovalList = ({ 
  requests = [], 
  onApproval, 
  isApproving = false,
  onUpdate,
  isUpdating = false
}) => {
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalAction, setApprovalAction] = useState(''); // 'approve' or 'reject'
  const [approvalComment, setApprovalComment] = useState('');
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    original_date: '',
    original_start_time: '',
    original_end_time: '',
    requested_date: '',
    requested_start_time: '',
    requested_end_time: '',
    reason: ''
  });

  // Search and date filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'

  // Date filter helper functions
  const getDateRange = (filter) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (filter) {
      case 'today':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { start: today, end: tomorrow };
      
      case 'week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        return { start: startOfWeek, end: endOfWeek };
      
      case 'month':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return { start: startOfMonth, end: endOfMonth };
      
      default:
        return null;
    }
  };

  const formatDateFilterLabel = (filter) => {
    switch (filter) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      default:
        return 'All Time';
    }
  };

  // Helper function to calculate duration
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    // Handle overnight shifts
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  // PDF Download function
  const downloadScheduleChangeReport = async (request) => {
    try {
      // Dynamic import of jsPDF to avoid SSR issues
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);
      
      // Set font
      doc.setFont('helvetica');
      
      // Header with company branding
      doc.setFillColor(59, 130, 246); // Blue background
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Company name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('GEO TIME SYSTEM', pageWidth / 2, 25, { align: 'center' });
      
      // Reset text color for content
      doc.setTextColor(0, 0, 0);
      
      // Report title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SCHEDULE CHANGE REQUEST REPORT', pageWidth / 2, 60, { align: 'center' });
      
      // Add decorative line
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(margin, 70, pageWidth - margin, 70);
      
      let yPosition = 90;
      
      // Employee Information Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Information', margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Employee name
      doc.setFont('helvetica', 'bold');
      doc.text('Name:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(request.employee_name || request.employee?.full_name || 'Unknown', margin + 30, yPosition);
      yPosition += 15;
      
      // Original Schedule Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Original Schedule', margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Original date
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(request.original_date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }), margin + 30, yPosition);
      yPosition += 10;
      
      // Original time
      doc.setFont('helvetica', 'bold');
      doc.text('Time:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(`${request.original_start_time} - ${request.original_end_time}`, margin + 30, yPosition);
      yPosition += 15;
      
      // Requested Schedule Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Requested Schedule', margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Requested date
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(request.requested_date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }), margin + 30, yPosition);
      yPosition += 10;
      
      // Requested time
      doc.setFont('helvetica', 'bold');
      doc.text('Time:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(`${request.requested_start_time} - ${request.requested_end_time}`, margin + 30, yPosition);
      yPosition += 15;
      
      // Reason Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Reason for Change', margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Handle long reasons with text wrapping
      const reasonText = request.reason || 'N/A';
      const reasonLines = doc.splitTextToSize(reasonText, contentWidth);
      doc.text(reasonLines, margin, yPosition);
      yPosition += (reasonLines.length * 7) + 15;
      
      // Status Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Status Information', margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Status
      doc.setFont('helvetica', 'bold');
      doc.text('Status:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      
      // Color-coded status
      const statusText = request.status.charAt(0).toUpperCase() + request.status.slice(1);
      doc.setTextColor(
        request.status === 'approved' ? 34 : 
        request.status === 'rejected' ? 220 : 
        request.status === 'pending' ? 245 : 128, 
        request.status === 'approved' ? 197 : 
        request.status === 'rejected' ? 53 : 
        request.status === 'pending' ? 158 : 128, 
        request.status === 'approved' ? 94 : 
        request.status === 'rejected' ? 69 : 
        request.status === 'pending' ? 11 : 128
      );
      doc.text(statusText, margin + 30, yPosition);
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 15;
      
      // Approved/Updated date
      doc.setFont('helvetica', 'bold');
      doc.text('Updated Date:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(request.updated_at || request.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }), margin + 40, yPosition);
      yPosition += 15;
      
      // Approver Comments Section
      if (request.comments) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Approver Comments:', margin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        const commentsText = request.comments;
        const commentsLines = doc.splitTextToSize(commentsText, contentWidth);
        doc.text(commentsLines, margin, yPosition);
        yPosition += (commentsLines.length * 7) + 10;
      }
      
      // Footer
      const footerY = pageHeight - 30;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, pageWidth / 2, footerY + 10, { align: 'center' });
      
      // Save the PDF
      const fileName = `schedule_change_report_${request.employee_name || 'employee'}_${new Date(request.requested_date).toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Bulk PDF Download function
  const downloadBulkScheduleChangeReports = async () => {
    try {
      // Dynamic import of jsPDF to avoid SSR issues
      const { default: jsPDF } = await import('jspdf');
      
      if (paginatedRequests.length === 0) {
        alert('No requests available to download.');
        return;
      }

      // Create a zip file for multiple PDFs
      const JSZip = await import('jszip');
      const zip = new JSZip.default();
      
      // Generate PDFs for all current page requests
      for (let i = 0; i < paginatedRequests.length; i++) {
        const request = paginatedRequests[i];
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (2 * margin);
        
        // Set font
        doc.setFont('helvetica');
        
        // Header with company branding
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        // Company name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('GEO TIME SYSTEM', pageWidth / 2, 25, { align: 'center' });
        
        // Reset text color for content
        doc.setTextColor(0, 0, 0);
        
        // Report title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('SCHEDULE CHANGE REQUEST REPORT', pageWidth / 2, 60, { align: 'center' });
        
        // Add decorative line
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.5);
        doc.line(margin, 70, pageWidth - margin, 70);
        
        let yPosition = 90;
        
        // Employee Information Section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Employee Information', margin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        // Employee name
        doc.setFont('helvetica', 'bold');
        doc.text('Name:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(request.employee_name || request.employee?.full_name || 'Unknown', margin + 30, yPosition);
        yPosition += 15;
        
        // Original Schedule Section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Original Schedule', margin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        // Original date
        doc.setFont('helvetica', 'bold');
        doc.text('Date:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(request.original_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }), margin + 30, yPosition);
        yPosition += 10;
        
        // Original time
        doc.setFont('helvetica', 'bold');
        doc.text('Time:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(`${request.original_start_time} - ${request.original_end_time}`, margin + 30, yPosition);
        yPosition += 15;
        
        // Requested Schedule Section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Requested Schedule', margin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        // Requested date
        doc.setFont('helvetica', 'bold');
        doc.text('Date:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(request.requested_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }), margin + 30, yPosition);
        yPosition += 10;
        
        // Requested time
        doc.setFont('helvetica', 'bold');
        doc.text('Time:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(`${request.requested_start_time} - ${request.requested_end_time}`, margin + 30, yPosition);
        yPosition += 15;
        
        // Reason Section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Reason for Change', margin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        // Handle long reasons with text wrapping
        const reasonText = request.reason || 'N/A';
        const reasonLines = doc.splitTextToSize(reasonText, contentWidth);
        doc.text(reasonLines, margin, yPosition);
        yPosition += (reasonLines.length * 7) + 15;
        
        // Status Section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Status Information', margin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        // Status
        doc.setFont('helvetica', 'bold');
        doc.text('Status:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        
        // Color-coded status
        const statusText = request.status.charAt(0).toUpperCase() + request.status.slice(1);
        doc.setTextColor(
          request.status === 'approved' ? 34 : 
          request.status === 'rejected' ? 220 : 
          request.status === 'pending' ? 245 : 128, 
          request.status === 'approved' ? 197 : 
          request.status === 'rejected' ? 53 : 
          request.status === 'pending' ? 158 : 128, 
          request.status === 'approved' ? 94 : 
          request.status === 'rejected' ? 69 : 
          request.status === 'pending' ? 11 : 128
        );
        doc.text(statusText, margin + 30, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 15;
        
        // Approved/Updated date
        doc.setFont('helvetica', 'bold');
        doc.text('Updated Date:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(request.updated_at || request.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }), margin + 40, yPosition);
        yPosition += 15;
        
        // Approver Comments Section
        if (request.comments) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Approver Comments:', margin, yPosition);
          yPosition += 15;
          
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          
          const commentsText = request.comments;
          const commentsLines = doc.splitTextToSize(commentsText, contentWidth);
          doc.text(commentsLines, margin, yPosition);
          yPosition += (commentsLines.length * 7) + 10;
        }
        
        // Footer
        const footerY = pageHeight - 30;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, footerY, pageWidth - margin, footerY);
        
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`, pageWidth / 2, footerY + 10, { align: 'center' });
        
        // Add PDF to zip
        const pdfBlob = doc.output('blob');
        const fileName = `schedule_change_report_${request.employee_name || 'employee'}_${new Date(request.requested_date).toISOString().split('T')[0]}.pdf`;
        zip.file(fileName, pdfBlob);
      }
      
      // Generate and download zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `schedule_change_reports_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating bulk PDFs:', error);
      alert('Failed to generate bulk PDFs. Please try again.');
    }
  };

  // Summary Report function
  const downloadSummaryReport = async () => {
    try {
      // Dynamic import of jsPDF to avoid SSR issues
      const { default: jsPDF } = await import('jspdf');
      
      if (paginatedRequests.length === 0) {
        alert('No requests available to generate summary.');
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);
      
      // Set font
      doc.setFont('helvetica');
      
      // Header with company branding
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Company name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('GEO TIME SYSTEM', pageWidth / 2, 25, { align: 'center' });
      
      // Reset text color for content
      doc.setTextColor(0, 0, 0);
      
      // Report title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SCHEDULE CHANGE REQUESTS SUMMARY REPORT', pageWidth / 2, 60, { align: 'center' });
      
      // Add decorative line
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(margin, 70, pageWidth - margin, 70);
      
      let yPosition = 90;
      
      // Summary Statistics Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary Statistics', margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Calculate statistics
      const totalRequests = paginatedRequests.length;
      const approvedRequests = paginatedRequests.filter(r => r.status === 'approved').length;
      const pendingRequests = paginatedRequests.filter(r => r.status === 'pending').length;
      const rejectedRequests = paginatedRequests.filter(r => r.status === 'rejected').length;
      const cancelledRequests = paginatedRequests.filter(r => r.status === 'cancelled').length;
      
      // Total requests
      doc.setFont('helvetica', 'bold');
      doc.text('Total Requests:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(totalRequests.toString(), margin + 50, yPosition);
      yPosition += 10;
      
      // Approved requests
      doc.setFont('helvetica', 'bold');
      doc.text('Approved:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(34, 197, 94); // Green
      doc.text(`${approvedRequests} (${((approvedRequests / totalRequests) * 100).toFixed(1)}%)`, margin + 50, yPosition);
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 10;
      
      // Pending requests
      doc.setFont('helvetica', 'bold');
      doc.text('Pending:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(245, 158, 11); // Yellow
      doc.text(`${pendingRequests} (${((pendingRequests / totalRequests) * 100).toFixed(1)}%)`, margin + 50, yPosition);
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 10;
      
      // Rejected requests
      doc.setFont('helvetica', 'bold');
      doc.text('Rejected:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(220, 53, 69); // Red
      doc.text(`${rejectedRequests} (${((rejectedRequests / totalRequests) * 100).toFixed(1)}%)`, margin + 50, yPosition);
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 10;
      
      // Cancelled requests
      doc.setFont('helvetica', 'bold');
      doc.text('Cancelled:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128); // Gray
      doc.text(`${cancelledRequests} (${((cancelledRequests / totalRequests) * 100).toFixed(1)}%)`, margin + 50, yPosition);
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 20;
      
      // Date Range Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Date Range', margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      const dates = paginatedRequests.map(r => new Date(r.requested_date)).sort((a, b) => a - b);
      const earliestDate = dates[0];
      const latestDate = dates[dates.length - 1];
      
      doc.setFont('helvetica', 'bold');
      doc.text('From:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(earliestDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }), margin + 30, yPosition);
      yPosition += 10;
      
      doc.setFont('helvetica', 'bold');
      doc.text('To:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(latestDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }), margin + 30, yPosition);
      yPosition += 20;
      
      // Employee Breakdown Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Breakdown', margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Group by employee
      const employeeStats = {};
      paginatedRequests.forEach(request => {
        const employeeName = request.employee_name || request.employee?.full_name || 'Unknown';
        if (!employeeStats[employeeName]) {
          employeeStats[employeeName] = { total: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 };
        }
        employeeStats[employeeName].total++;
        employeeStats[employeeName][request.status]++;
      });
      
      // Display employee statistics
      Object.entries(employeeStats).forEach(([employeeName, stats]) => {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 30;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text(employeeName, margin, yPosition);
        yPosition += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`  Total: ${stats.total} | Approved: ${stats.approved} | Pending: ${stats.pending} | Rejected: ${stats.rejected} | Cancelled: ${stats.cancelled}`, margin + 5, yPosition);
        yPosition += 12;
      });
      
      // Footer
      const footerY = pageHeight - 30;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, pageWidth / 2, footerY + 10, { align: 'center' });
      
      // Save the PDF
      const fileName = `schedule_change_summary_report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating summary PDF:', error);
      alert('Failed to generate summary PDF. Please try again.');
    }
  };

  // Filtering
  const filteredRequests = useMemo(() => {
    let filtered = [...requests];
    
    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const dateRange = getDateRange(dateFilter);
      if (dateRange) {
        filtered = filtered.filter(r => {
          const requestDate = new Date(r.requested_date);
          return requestDate >= dateRange.start && requestDate < dateRange.end;
        });
      }
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => {
        const employeeName = (r.employee_name || r.employee?.full_name || '').toLowerCase();
        const reason = (r.reason || '').toLowerCase();
        const status = r.status.toLowerCase();
        
        return employeeName.includes(query) || 
               reason.includes(query) || 
               status.includes(query);
      });
    }
    
    return filtered;
  }, [requests, statusFilter, dateFilter, searchQuery]);

  // Sorting
  const sortedRequests = useMemo(() => {
    let sorted = [...filteredRequests];
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'original_date' || sortField === 'requested_date' || sortField === 'created_at') {
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

  const handleEdit = (request) => {
    setSelectedRequest(request);
    setEditForm({
      original_date: request.original_date || '',
      original_start_time: request.original_start_time || '',
      original_end_time: request.original_end_time || '',
      requested_date: request.requested_date || '',
      requested_start_time: request.requested_start_time || '',
      requested_end_time: request.requested_end_time || '',
      reason: request.reason || ''
    });
    setShowEditModal(true);
  };

  const submitApproval = async () => {
    if (!selectedRequest || !onApproval) return;
    
    try {
      await onApproval({
        id: selectedRequest.id,
        action: approvalAction,
        comments: approvalComment
      });
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalAction('');
      setApprovalComment('');
    } catch (err) {
      alert(`Failed to ${approvalAction} request: ${err.response?.data?.detail || err.message}`);
    }
  };

  const submitEdit = async () => {
    if (!selectedRequest || !onUpdate) return;
    
    try {
      await onUpdate({
        id: selectedRequest.id,
        data: editForm
      });
      setShowEditModal(false);
      setSelectedRequest(null);
      setEditForm({
        original_date: '',
        original_start_time: '',
        original_end_time: '',
        requested_date: '',
        requested_start_time: '',
        requested_end_time: '',
        reason: ''
      });
    } catch (err) {
      alert(`Failed to update request: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleCancelRequest = async (request) => {
    if (!window.confirm(`Are you sure you want to cancel this schedule change request? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await onUpdate({
        id: request.id,
        data: { status: 'cancelled' }
      });
    } catch (err) {
      alert(`Failed to cancel request: ${err.response?.data?.detail || err.message}`);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateFilter, searchQuery, sortField, sortOrder, pageSize]);

  if (requests.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-xl mt-6 animate-fade-in">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-float">
            <FaExchangeAlt className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Schedule Change Requests Found</h3>
          <p className="text-gray-500 text-lg mb-6 max-w-md mx-auto">
            There are no schedule change requests to review at this time. Check back later or contact your team members to submit new requests.
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
              <span>All caught up</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span>System ready</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl mt-6 animate-fade-in overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="p-8 border-b border-gray-200 bg-gradient-to-br from-white via-blue-50 to-indigo-50">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaExchangeAlt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Schedule Change Requests
              </h2>
              <p className="text-gray-600 mt-1">Manage and approve employee schedule change requests</p>
            </div>
          </div>
          
          {/* PDF Download Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => {
                if (paginatedRequests.length > 0) {
                  downloadScheduleChangeReport(paginatedRequests[0]);
                } else {
                  alert('No requests available to download.');
                }
              }}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md hover:shadow-lg transform hover:scale-105"
              title="Download Sample Report"
            >
              <FaDownload className="mr-2" />
              Sample Report
            </button>
            
            <button
              onClick={downloadBulkScheduleChangeReports}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-md hover:shadow-lg transform hover:scale-105"
              title="Download All Reports (ZIP)"
            >
              <FaDownload className="mr-2" />
              Bulk Download
            </button>

            <button
              onClick={downloadSummaryReport}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-md hover:shadow-lg transform hover:scale-105"
              title="Download Summary Report"
            >
              <FaDownload className="mr-2" />
              Summary Report
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <div className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <input
              type="text"
              placeholder="Search by employee name, reason, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 placeholder:text-gray-400 text-gray-700 font-medium shadow-sm hover:border-gray-300 hover:shadow-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200 group"
              >
                <div className="w-5 h-5 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors duration-200">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </button>
            )}
            {/* Floating label effect */}
            {searchQuery && (
              <div className="absolute -top-2 left-3 px-2 bg-white text-xs text-blue-600 font-medium transition-all duration-200 animate-fade-in">
                Search Active
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Date Filter */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center">
              <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Date Range
            </label>
            <div className="flex space-x-2 p-1 bg-gray-100 rounded-xl">
              {['all', 'today', 'week', 'month'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 transform hover:scale-105 ${
                    dateFilter === filter
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    {filter === 'today' && <span className="w-2 h-2 bg-current rounded-full"></span>}
                    {filter === 'week' && <span className="w-2 h-2 bg-current rounded-full"></span>}
                    {filter === 'month' && <span className="w-2 h-2 bg-current rounded-full"></span>}
                    <span>{formatDateFilterLabel(filter)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center">
              <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Status
            </label>
            <div className="relative group">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 text-gray-700 font-medium shadow-sm hover:border-gray-300 hover:shadow-md cursor-pointer"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Page Size */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center">
              <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Page Size
            </label>
            <div className="relative group">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="appearance-none px-4 py-2 pr-10 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 text-gray-700 font-medium shadow-sm hover:border-gray-300 hover:shadow-md cursor-pointer"
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Results Count */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-sm text-gray-600">
                Showing <span className="font-bold text-gray-900">{paginatedRequests.length}</span> of{' '}
                <span className="font-bold text-gray-900">{filteredRequests.length}</span> results
              </span>
            </div>

            {/* Active Filters Display */}
            {searchQuery && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-100 rounded-full animate-fade-in">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm font-medium text-blue-700">
                  Search: <span className="font-bold">"{searchQuery}"</span>
                </span>
              </div>
            )}

            {dateFilter !== 'all' && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-100 rounded-full animate-fade-in">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-green-700">
                  Date: <span className="font-bold">{formatDateFilterLabel(dateFilter)}</span>
                </span>
              </div>
            )}

            {statusFilter && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-100 rounded-full animate-fade-in">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-purple-700">
                  Status: <span className="font-bold">{statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || dateFilter !== 'all' || statusFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDateFilter('all');
                setStatusFilter('');
              }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 hover:text-red-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span>Employee</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <button
                  onClick={() => handleSort('original_date')}
                  className="flex items-center space-x-2 hover:text-blue-600 transition-colors duration-200 group"
                >
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span>Original Date</span>
                  <div className="text-gray-400 group-hover:text-blue-500">
                    {sortField === 'original_date' ? (
                      sortOrder === 'asc' ? <FaSortUp className="w-3 h-3" /> : <FaSortDown className="w-3 h-3" />
                    ) : (
                      <FaSort className="w-3 h-3" />
                    )}
                  </div>
                </button>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span>Original Time</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <button
                  onClick={() => handleSort('requested_date')}
                  className="flex items-center space-x-2 hover:text-blue-600 transition-colors duration-200 group"
                >
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  <span>Requested Date</span>
                  <div className="text-gray-400 group-hover:text-blue-500">
                    {sortField === 'requested_date' ? (
                      sortOrder === 'asc' ? <FaSortUp className="w-3 h-3" /> : <FaSortDown className="w-3 h-3" />
                    ) : (
                      <FaSort className="w-3 h-3" />
                    )}
                  </div>
                </button>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span>Requested Time</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span>Reason</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center space-x-2 hover:text-blue-600 transition-colors duration-200 group"
                >
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span>Status</span>
                  <div className="text-gray-400 group-hover:text-blue-500">
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <FaSortUp className="w-3 h-3" /> : <FaSortDown className="w-3 h-3" />
                    ) : (
                      <FaSort className="w-3 h-3" />
                    )}
                  </div>
                </button>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center space-x-2 hover:text-blue-600 transition-colors duration-200 group"
                >
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span>Created</span>
                  <div className="text-gray-400 group-hover:text-blue-500">
                    {sortField === 'created_at' ? (
                      sortOrder === 'asc' ? <FaSortUp className="w-3 h-3" /> : <FaSortDown className="w-3 h-3" />
                    ) : (
                      <FaSort className="w-3 h-3" />
                    )}
                  </div>
                </button>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span>Actions</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paginatedRequests.map((request, index) => (
              <tr 
                key={request.id} 
                className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 transform hover:scale-[1.01] hover:shadow-sm"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md">
                        <FaUser className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {request.employee_name || request.employee?.full_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">Employee ID: {request.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <FaCalendarAlt className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(request.original_date).toLocaleDateString('en-US', { 
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <div className="text-xs text-gray-500">
                        {new Date(request.original_date).getFullYear()}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <FaClock className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {request.original_start_time} - {request.original_end_time}
                      </span>
                      <div className="text-xs text-gray-500">
                        Duration: {calculateDuration(request.original_start_time, request.original_end_time)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                      <FaExchangeAlt className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(request.requested_date).toLocaleDateString('en-US', { 
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <div className="text-xs text-gray-500">
                        {new Date(request.requested_date).getFullYear()}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                      <FaClock className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {request.requested_start_time} - {request.requested_end_time}
                      </span>
                      <div className="text-xs text-gray-500">
                        Duration: {calculateDuration(request.requested_start_time, request.requested_end_time)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <div className="text-sm text-gray-900 font-medium mb-1" title={request.reason}>
                      {request.reason?.length > 50 ? `${request.reason.substring(0, 50)}...` : request.reason}
                    </div>
                    {request.reason?.length > 50 && (
                      <div className="text-xs text-gray-500 cursor-pointer hover:text-blue-600 transition-colors">
                        Click to see full reason
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 transform hover:scale-105 ${
                    request.status === 'pending' 
                      ? 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border border-yellow-200' 
                      : request.status === 'approved'
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200'
                      : request.status === 'rejected'
                      ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200'
                      : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200'
                  }`}>
                    <div className="w-2 h-2 rounded-full mr-2 bg-current"></div>
                    {request.status === 'pending' && <FaHourglassHalf className="mr-1" />}
                    {request.status === 'approved' && <FaUserCheck className="mr-1" />}
                    {request.status === 'rejected' && <FaUserTimes className="mr-1" />}
                    {request.status === 'cancelled' && <FaBan className="mr-1" />}
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                      <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    {new Date(request.created_at).toLocaleDateString('en-US', { 
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex flex-wrap gap-2">
                    {/* Edit button - available for all requests with different contexts */}
                    <button
                      onClick={() => handleEdit(request)}
                      disabled={isUpdating}
                      className={`inline-flex items-center px-3 py-2 border border-transparent text-xs font-semibold rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-md ${
                        request.status === 'pending'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500'
                          : request.status === 'approved'
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:ring-orange-500'
                          : request.status === 'rejected'
                          ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 focus:ring-gray-500'
                          : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 focus:ring-gray-500'
                      }`}
                      title={
                        request.status === 'pending'
                          ? 'Edit pending request'
                          : request.status === 'approved'
                          ? 'Modify approved request (may require re-approval)'
                          : request.status === 'rejected'
                          ? 'Edit rejected request'
                          : 'Modify cancelled request'
                      }
                    >
                      <FaEdit className="mr-1.5" />
                      {request.status === 'pending' ? 'Edit' : 'Modify'}
                    </button>
                    
                    {/* Approval buttons - only for pending requests */}
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproval(request, 'approve')}
                          disabled={isApproving}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-semibold rounded-lg text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-md"
                        >
                          <FaCheck className="mr-1.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(request, 'reject')}
                          disabled={isApproving}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-semibold rounded-lg text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-md"
                        >
                          <FaTimes className="mr-1.5" />
                          Reject
                        </button>
                      </>
                    )}

                    {/* Cancel button - only for pending requests */}
                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleCancelRequest(request)}
                        disabled={isUpdating}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-semibold rounded-lg text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-md"
                        title="Cancel request"
                      >
                        <FaBan className="mr-1.5" />
                        Cancel
                      </button>
                    )}

                    {/* PDF Download Button for each request */}
                    <button
                      onClick={() => downloadScheduleChangeReport(request)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-semibold rounded-lg text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-sm transition-all duration-200 transform hover:scale-105 hover:shadow-md"
                      title="Download Individual Report"
                    >
                      <FaDownload className="mr-1.5" />
                      PDF
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedRequests.length)} of {sortedRequests.length}
              </span>
              <span className="text-gray-500"> results</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
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
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Next
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Change Schedule Request
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Employee: <span className="font-medium">{selectedRequest.employee_name || selectedRequest.employee?.full_name}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Original: <span className="font-medium">{new Date(selectedRequest.original_date).toLocaleDateString()} {selectedRequest.original_start_time} - {selectedRequest.original_end_time}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Requested: <span className="font-medium">{new Date(selectedRequest.requested_date).toLocaleDateString()} {selectedRequest.requested_start_time} - {selectedRequest.requested_end_time}</span>
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (optional)
                </label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Add any comments about this decision..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedRequest(null);
                    setApprovalAction('');
                    setApprovalComment('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={submitApproval}
                  disabled={isApproving}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    approvalAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  {isApproving ? 'Processing...' : approvalAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedRequest.status === 'pending' ? 'Edit' : 'Modify'} Change Schedule Request
              </h3>
              
              {/* Status-specific warnings */}
              {selectedRequest.status === 'approved' && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-orange-800">Approved Request Modification</h4>
                      <p className="text-sm text-orange-700 mt-1">
                        This request has been approved. Modifying it may affect scheduling and work arrangements. Consider the impact before making changes.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedRequest.status === 'rejected' && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-800">Rejected Request Modification</h4>
                      <p className="text-sm text-gray-700 mt-1">
                        This request was previously rejected. You can modify it and potentially re-approve if circumstances have changed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedRequest.status === 'cancelled' && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800">Cancelled Request Modification</h4>
                      <p className="text-sm text-red-700 mt-1">
                        This request was cancelled. You can modify it and potentially reactivate if circumstances have changed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Original Date
                    </label>
                    <input
                      type="date"
                      value={editForm.original_date}
                      onChange={(e) => setEditForm({...editForm, original_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Requested Date
                    </label>
                    <input
                      type="date"
                      value={editForm.requested_date}
                      onChange={(e) => setEditForm({...editForm, requested_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Original Start Time
                    </label>
                    <input
                      type="time"
                      value={editForm.original_start_time}
                      onChange={(e) => setEditForm({...editForm, original_start_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Original End Time
                    </label>
                    <input
                      type="time"
                      value={editForm.original_end_time}
                      onChange={(e) => setEditForm({...editForm, original_end_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Requested Start Time
                    </label>
                    <input
                      type="time"
                      value={editForm.requested_start_time}
                      onChange={(e) => setEditForm({...editForm, requested_start_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Requested End Time
                    </label>
                    <input
                      type="time"
                      value={editForm.requested_end_time}
                      onChange={(e) => setEditForm({...editForm, requested_end_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    value={editForm.reason}
                    onChange={(e) => setEditForm({...editForm, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Enter reason for schedule change"
                  />
                </div>

                {/* Additional options for approved requests */}
                {selectedRequest.status === 'approved' && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Options</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Set status back to pending for re-approval
                              setEditForm({...editForm, status: 'pending'});
                            } else {
                              // Remove status from form data
                              const { status, ...rest } = editForm;
                              setEditForm(rest);
                            }
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Mark for re-approval after changes
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRequest(null);
                    setEditForm({
                      original_date: '',
                      original_start_time: '',
                      original_end_time: '',
                      requested_date: '',
                      requested_start_time: '',
                      requested_end_time: '',
                      reason: ''
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={submitEdit}
                  disabled={isUpdating}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    selectedRequest.status === 'pending'
                      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                      : selectedRequest.status === 'approved'
                      ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                      : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                  }`}
                >
                  {isUpdating ? 'Saving...' : 
                    selectedRequest.status === 'pending' ? 'Save Changes' : 
                    selectedRequest.status === 'approved' ? 'Update Request' :
                    selectedRequest.status === 'rejected' ? 'Update Request' :
                    'Update Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeScheduleApprovalList; 