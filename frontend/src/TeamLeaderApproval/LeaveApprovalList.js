import React, { useState, useMemo, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaUserCheck, FaUserTimes, FaHourglassHalf, FaSort, FaSortUp, FaSortDown, FaUser, FaCheck, FaTimes, FaEdit, FaBan, FaDownload } from 'react-icons/fa';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
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

const LeaveApprovalList = ({ 
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
    start_date: '',
    end_date: '',
    leave_type: '',
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
  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'N/A';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return '1 day';
    }
    return `${diffDays} days`;
  };

  // PDF Download function
  const downloadLeaveReport = async (request) => {
    try {
      // Dynamic import of jsPDF to avoid SSR issues
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      // Company branding
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Leave Request Report', 105, 20, { align: 'center' });
      
      // Employee information
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Information:', 20, 40);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${request.employee_name || request.employee?.full_name || 'Unknown'}`, 20, 55);
      doc.text(`Employee ID: ${request.id}`, 20, 65);
      
      // Request details
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Leave Request Details:', 20, 85);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Leave Type: ${request.leave_type}`, 20, 100);
      doc.text(`Start Date: ${new Date(request.start_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, 20, 110);
      doc.text(`End Date: ${new Date(request.end_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, 20, 120);
      doc.text(`Duration: ${calculateDuration(request.start_date, request.end_date)}`, 20, 130);
      
      // Status information
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Status Information:', 20, 150);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Status: ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}`, 20, 165);
      
      // Approved/Updated date
      doc.setFont('helvetica', 'bold');
      doc.text('Approved Date:', 20, 180);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(request.updated_at || request.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }), 60, 180);
      
      // Approver Comments Section
      if (request.comments) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Approver Comments:', 20, 200);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        const commentsText = request.comments;
        const commentsLines = doc.splitTextToSize(commentsText, 170);
        doc.text(commentsLines, 20, 215);
      }
      
      // Reason
      if (request.reason) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Reason for Leave:', 20, 240);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        const reasonText = request.reason;
        const reasonLines = doc.splitTextToSize(reasonText, 170);
        doc.text(reasonLines, 20, 255);
      }
      
      // Footer
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, 280, { align: 'center' });
      
      // Save the PDF
      const fileName = `Leave_Request_${request.id}_${request.employee_name || 'Employee'}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Bulk download function
  const downloadBulkLeaveReports = async () => {
    try {
      // Dynamic import of jsPDF and JSZip
      const [{ default: jsPDF }, { default: JSZip }] = await Promise.all([
        import('jspdf'),
        import('jszip')
      ]);
      
      const zip = new JSZip();
      
      // Generate PDF for each request on the current page
      for (const request of paginatedRequests) {
        const doc = new jsPDF();
        
        // Company branding
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Leave Request Report', 105, 20, { align: 'center' });
        
        // Employee information
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Employee Information:', 20, 40);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${request.employee_name || request.employee?.full_name || 'Unknown'}`, 20, 55);
        doc.text(`Employee ID: ${request.id}`, 20, 65);
        
        // Request details
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Leave Request Details:', 20, 85);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Leave Type: ${request.leave_type}`, 20, 100);
        doc.text(`Start Date: ${new Date(request.start_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`, 20, 110);
        doc.text(`End Date: ${new Date(request.end_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`, 20, 120);
        doc.text(`Duration: ${calculateDuration(request.start_date, request.end_date)}`, 20, 130);
        
        // Status information
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Status Information:', 20, 150);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Status: ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}`, 20, 165);
        
        // Approved/Updated date
        doc.setFont('helvetica', 'bold');
        doc.text('Approved Date:', 20, 180);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(request.updated_at || request.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }), 60, 180);
        
        // Approver Comments Section
        if (request.comments) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Approver Comments:', 20, 200);
          
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          
          const commentsText = request.comments;
          const commentsLines = doc.splitTextToSize(commentsText, 170);
          doc.text(commentsLines, 20, 215);
        }
        
        // Reason
        if (request.reason) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Reason for Leave:', 20, 240);
          
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          
          const reasonText = request.reason;
          const reasonLines = doc.splitTextToSize(reasonText, 170);
          doc.text(reasonLines, 20, 255);
        }
        
        // Footer
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, 280, { align: 'center' });
        
        // Add PDF to ZIP
        const pdfBlob = doc.output('blob');
        const fileName = `Leave_Request_${request.id}_${request.employee_name || 'Employee'}.pdf`;
        zip.file(fileName, pdfBlob);
      }
      
      // Generate and download ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Leave_Requests_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating bulk PDFs:', error);
      alert('Failed to generate bulk PDFs. Please try again.');
    }
  };

  // Summary report function
  const downloadSummaryReport = async () => {
    try {
      // Dynamic import of jsPDF
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      // Company branding
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Leave Requests Summary Report', 105, 20, { align: 'center' });
      
      // Summary statistics
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary Statistics:', 20, 40);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Requests: ${requests.length}`, 20, 55);
      doc.text(`Pending: ${requests.filter(r => r.status === 'pending').length}`, 20, 65);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Approved: ${requests.filter(r => r.status === 'approved').length}`, 20, 75);
      doc.text(`Rejected: ${requests.filter(r => r.status === 'rejected').length}`, 20, 85);
      doc.text(`Cancelled: ${requests.filter(r => r.status === 'cancelled').length}`, 20, 95);
      
      // Leave type breakdown
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Leave Type Breakdown:', 20, 115);
      
      const leaveTypeCounts = {};
      requests.forEach(request => {
        leaveTypeCounts[request.leave_type] = (leaveTypeCounts[request.leave_type] || 0) + 1;
      });
      
      let yPosition = 130;
      Object.entries(leaveTypeCounts).forEach(([type, count]) => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`${type}: ${count}`, 20, yPosition);
        yPosition += 10;
      });
      
      // Date range
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Date Range:', 20, yPosition + 10);
      
      if (requests.length > 0) {
        const dates = requests.map(r => new Date(r.start_date)).sort((a, b) => a - b);
        const earliest = dates[0];
        const latest = dates[dates.length - 1];
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`From: ${earliest.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, yPosition + 25);
        doc.text(`To: ${latest.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, yPosition + 35);
      }
      
      // Footer
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, 280, { align: 'center' });
      
      // Save the PDF
      const fileName = `Leave_Requests_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
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
          const requestDate = new Date(r.start_date);
          return requestDate >= dateRange.start && requestDate < dateRange.end;
        });
      }
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => {
        const employeeName = (r.employee_name || r.employee?.full_name || '').toLowerCase();
        const leaveType = (r.leave_type || '').toLowerCase();
        const reason = (r.reason || '').toLowerCase();
        const status = (r.status || '').toLowerCase();
        
        return employeeName.includes(query) ||
               leaveType.includes(query) ||
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

  const handleEdit = (request) => {
    setSelectedRequest(request);
    setEditForm({
      leave_type: request.leave_type || '',
      start_date: request.start_date || '',
      end_date: request.end_date || '',
      number_days: request.number_days || '',
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
      const updateData = {
        ...editForm,
        number_days: editForm.number_days ? parseFloat(editForm.number_days) : null
      };
      
      await onUpdate({
        id: selectedRequest.id,
        data: updateData
      });
      setShowEditModal(false);
      setSelectedRequest(null);
      setEditForm({
        leave_type: '',
        start_date: '',
        end_date: '',
        number_days: '',
        reason: ''
      });
    } catch (err) {
      console.error('Update leave request error:', err);
      alert(`Failed to update request: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleCancelRequest = async (request) => {
    if (!window.confirm(`Are you sure you want to cancel this leave request? This action cannot be undone.`)) {
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
            <FaCalendarAlt className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Leave Requests Found</h3>
          <p className="text-gray-500 text-lg mb-6 max-w-md mx-auto">
            There are no leave requests to review at this time. Check back later or contact your team members to submit new requests.
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
              <FaCalendarAlt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Leave Requests
              </h2>
              <p className="text-gray-600 mt-1">Manage and approve employee leave requests</p>
            </div>
          </div>
          
          {/* PDF Download Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => {
                if (paginatedRequests.length > 0) {
                  downloadLeaveReport(paginatedRequests[0]);
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
              onClick={downloadBulkLeaveReports}
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
              placeholder="Search by employee name, leave type, reason, or status..."
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
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Leave Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('start_date')}
                  className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                >
                  <span>Start Date</span>
                  {sortField === 'start_date' ? (
                    sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                  ) : (
                    <FaSort />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('end_date')}
                  className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                >
                  <span>End Date</span>
                  {sortField === 'end_date' ? (
                    sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                  ) : (
                    <FaSort />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Days
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                >
                  <span>Status</span>
                  {sortField === 'status' ? (
                    sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                  ) : (
                    <FaSort />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                >
                  <span>Created</span>
                  {sortField === 'created_at' ? (
                    sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                  ) : (
                    <FaSort />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedRequests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <FaUser className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {request.employee_name || request.employee?.full_name || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${LEAVE_TYPE_COLORS[request.leave_type] || LEAVE_TYPE_COLORS.other}`}>
                    {request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FaCalendarAlt className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {new Date(request.start_date).toLocaleDateString()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FaCalendarAlt className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {new Date(request.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {request.number_days || request.duration_days || '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate" title={request.reason}>
                    {request.reason}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    request.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : request.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : request.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {request.status === 'pending' && <FaHourglassHalf className="mr-1" />}
                    {request.status === 'approved' && <FaUserCheck className="mr-1" />}
                    {request.status === 'rejected' && <FaUserTimes className="mr-1" />}
                    {request.status === 'cancelled' && <FaBan className="mr-1" />}
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(request.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {/* Edit button - available for all requests with different contexts */}
                    <button
                      onClick={() => handleEdit(request)}
                      disabled={isUpdating}
                      className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                        request.status === 'pending'
                          ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                          : request.status === 'approved'
                          ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                          : request.status === 'rejected'
                          ? 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                          : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
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
                      <FaEdit className="mr-1" />
                      {request.status === 'pending' ? 'Edit' : 'Modify'}
                    </button>
                    
                    {/* Approval buttons - only for pending requests */}
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproval(request, 'approve')}
                          disabled={isApproving}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          <FaCheck className="mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(request, 'reject')}
                          disabled={isApproving}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          <FaTimes className="mr-1" />
                          Reject
                        </button>
                      </>
                    )}

                    {/* Cancel button - only for pending requests */}
                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleCancelRequest(request)}
                        disabled={isUpdating}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        title="Cancel request"
                      >
                        <FaBan className="mr-1" />
                        Cancel
                      </button>
                    )}

                    {/* PDF Download Button for each request */}
                    <button
                      onClick={() => downloadLeaveReport(request)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-sm transition-all duration-200 transform hover:scale-105 hover:shadow-md"
                      title="Download Individual Report"
                    >
                      <FaDownload className="mr-1" />
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
        <div className="px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedRequests.length)} of {sortedRequests.length} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
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
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Leave Request
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Employee: <span className="font-medium">{selectedRequest.employee_name || selectedRequest.employee?.full_name}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Leave Type: <span className="font-medium">{selectedRequest.leave_type.charAt(0).toUpperCase() + selectedRequest.leave_type.slice(1)}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Period: <span className="font-medium">{new Date(selectedRequest.start_date).toLocaleDateString()} - {new Date(selectedRequest.end_date).toLocaleDateString()}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Days: <span className="font-medium">{selectedRequest.number_days || selectedRequest.duration_days || 'N/A'}</span>
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
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedRequest.status === 'pending' ? 'Edit' : 'Modify'} Leave Request
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
                        This request has been approved. Modifying it may affect leave balances and scheduling. Consider the impact before making changes.
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type
                  </label>
                  <select
                    value={editForm.leave_type}
                    onChange={(e) => setEditForm({...editForm, leave_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select leave type</option>
                    <option value="vacation">Vacation</option>
                    <option value="sick">Sick Leave</option>
                    <option value="personal">Personal Leave</option>
                    <option value="maternity">Maternity Leave</option>
                    <option value="paternity">Paternity Leave</option>
                    <option value="bereavement">Bereavement Leave</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => setEditForm({...editForm, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) => setEditForm({...editForm, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days
                  </label>
                  <input
                    type="number"
                    value={editForm.number_days}
                    onChange={(e) => setEditForm({...editForm, number_days: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Number of days"
                    min="0"
                    step="0.5"
                  />
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
                    placeholder="Enter reason for leave"
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
                      leave_type: '',
                      start_date: '',
                      end_date: '',
                      number_days: '',
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

export default LeaveApprovalList; 