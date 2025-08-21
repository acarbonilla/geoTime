import React, { useState, useMemo, useEffect } from 'react';
import { FaUserClock, FaClock, FaUserCheck, FaUserTimes, FaSort, FaSortUp, FaSortDown, FaDownload } from 'react-icons/fa';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
];

const TimeCorrectionApprovalList = ({ 
  requests = [], 
  onApproval, 
  isApproving = false,
  onUpdate // Added onUpdate prop
}) => {
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('submitted_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalAction, setApprovalAction] = useState('');
  const [comments, setComments] = useState('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    original_date: '',
    original_time_in: '',
    original_time_out: '',
    corrected_date: '',
    corrected_time_in: '',
    corrected_time_out: '',
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
  const calculateDuration = (timeIn, timeOut) => {
    if (!timeIn || !timeOut) return 'N/A';
    
    const start = new Date(`2000-01-01T${timeIn}`);
    const end = new Date(`2000-01-01T${timeOut}`);
    
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
  const downloadTimeCorrectionReport = async (request) => {
    try {
      // Dynamic import of jsPDF to avoid SSR issues
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      // Company branding
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Time Correction Request Report', 105, 20, { align: 'center' });
      
      // Employee information
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Information:', 20, 40);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${request.employee_name || request.employee?.full_name || 'Unknown'}`, 20, 55);
      doc.text(`Employee ID: ${request.id}`, 20, 65);
      
      // Original time details
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Original Time Details:', 20, 85);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${new Date(request.original_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, 20, 100);
      doc.text(`Time In: ${request.original_time_in}`, 20, 110);
      doc.text(`Time Out: ${request.original_time_out}`, 20, 120);
      doc.text(`Duration: ${calculateDuration(request.original_time_in, request.original_time_out)}`, 20, 130);
      
      // Corrected time details
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Corrected Time Details:', 20, 150);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${new Date(request.corrected_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, 20, 165);
      doc.text(`Time In: ${request.corrected_time_in}`, 20, 175);
      doc.text(`Time Out: ${request.corrected_time_out}`, 20, 185);
      doc.text(`Duration: ${calculateDuration(request.corrected_time_in, request.corrected_time_out)}`, 20, 195);
      
      // Status information
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Status Information:', 20, 215);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Status: ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}`, 20, 230);
      
      // Approved/Updated date
      doc.setFont('helvetica', 'bold');
      doc.text('Approved Date:', 20, 245);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(request.updated_at || request.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }), 60, 245);
      
      // Approver Comments Section
      if (request.comments) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Approver Comments:', 20, 265);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        const commentsText = request.comments;
        const commentsLines = doc.splitTextToSize(commentsText, 170);
        doc.text(commentsLines, 20, 280);
      }
      
      // Reason
      if (request.reason) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Reason for Correction:', 20, 300);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        const reasonText = request.reason;
        const reasonLines = doc.splitTextToSize(reasonText, 170);
        doc.text(reasonLines, 20, 315);
      }
      
      // Footer
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, 280, { align: 'center' });
      
      // Save the PDF
      const fileName = `Time_Correction_${request.id}_${request.employee_name || 'Employee'}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Bulk download function
  const downloadBulkTimeCorrectionReports = async () => {
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
        doc.text('Time Correction Request Report', 105, 20, { align: 'center' });
        
        // Employee information
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Employee Information:', 20, 40);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${request.employee_name || request.employee?.full_name || 'Unknown'}`, 20, 55);
        doc.text(`Employee ID: ${request.id}`, 20, 65);
        
        // Original time details
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Original Time Details:', 20, 85);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${new Date(request.original_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`, 20, 100);
        doc.text(`Time In: ${request.original_time_in}`, 20, 110);
        doc.text(`Time Out: ${request.original_time_out}`, 20, 120);
        doc.text(`Duration: ${calculateDuration(request.original_time_in, request.original_time_out)}`, 20, 130);
        
        // Corrected time details
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Corrected Time Details:', 20, 150);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${new Date(request.corrected_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`, 20, 165);
        doc.text(`Time In: ${request.corrected_time_in}`, 20, 175);
        doc.text(`Time Out: ${request.corrected_time_out}`, 20, 185);
        doc.text(`Duration: ${calculateDuration(request.corrected_time_in, request.corrected_time_out)}`, 20, 195);
        
        // Status information
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Status Information:', 20, 215);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Status: ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}`, 20, 230);
        
        // Approved/Updated date
        doc.setFont('helvetica', 'bold');
        doc.text('Approved Date:', 20, 245);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(request.updated_at || request.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }), 60, 245);
        
        // Approver Comments Section
        if (request.comments) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Approver Comments:', 20, 265);
          
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          
          const commentsText = request.comments;
          const commentsLines = doc.splitTextToSize(commentsText, 170);
          doc.text(commentsLines, 20, 280);
        }
        
        // Reason
        if (request.reason) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Reason for Correction:', 20, 300);
          
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          
          const reasonText = request.reason;
          const reasonLines = doc.splitTextToSize(reasonText, 170);
          doc.text(reasonLines, 20, 315);
        }
        
        // Footer
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, 280, { align: 'center' });
        
        // Add PDF to ZIP
        const pdfBlob = doc.output('blob');
        const fileName = `Time_Correction_${request.id}_${request.employee_name || 'Employee'}.pdf`;
        zip.file(fileName, pdfBlob);
      }
      
      // Generate and download ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Time_Correction_Requests_${new Date().toISOString().split('T')[0]}.zip`;
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
      doc.text('Time Correction Requests Summary Report', 105, 20, { align: 'center' });
      
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
      
      // Date range
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Date Range:', 20, 115);
      
      if (requests.length > 0) {
        const dates = requests.map(r => new Date(r.original_date)).sort((a, b) => a - b);
        const earliest = dates[0];
        const latest = dates[dates.length - 1];
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`From: ${earliest.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, 130);
        doc.text(`To: ${latest.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, 140);
      }
      
      // Footer
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, 280, { align: 'center' });
      
      // Save the PDF
      const fileName = `Time_Correction_Requests_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
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
          const requestDate = new Date(r.original_date);
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
        const status = (r.status || '').toLowerCase();
        
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
      if (['date', 'submitted_at', 'reviewed_at'].includes(sortField)) {
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
    setComments('');
    setShowApprovalModal(true);
  };

  const handleSubmitApproval = () => {
    if (onApproval && selectedRequest) {
      onApproval({
        id: selectedRequest.id,
        action: approvalAction,
        comments: comments.trim() || undefined
      });
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalAction('');
      setComments('');
    }
  };

  const handleCancelRequest = async (request) => {
    if (!window.confirm(`Are you sure you want to cancel this time correction request? This action cannot be undone.`)) {
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (requests.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-xl mt-6 animate-fade-in">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-float">
            <FaUserClock className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Time Correction Requests Found</h3>
          <p className="text-gray-500 text-lg mb-6 max-w-md mx-auto">
            There are no time correction requests to review at this time. Check back later or contact your team members to submit new requests.
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
              <FaUserClock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Time Correction Requests
              </h2>
              <p className="text-gray-600 mt-1">Manage and approve employee time correction requests</p>
            </div>
          </div>
          
          {/* PDF Download Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => {
                if (paginatedRequests.length > 0) {
                  downloadTimeCorrectionReport(paginatedRequests[0]);
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
              onClick={downloadBulkTimeCorrectionReports}
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
        <div className="mb-6 px-8">
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
        <div className="flex flex-wrap gap-4 mb-6 px-8">
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

        {/* Results Summary */}
        <div className="px-8 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
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
        <div className="overflow-x-auto px-8 pb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('employee__full_name')}>
                  <div className="flex items-center gap-1">
                    Employee
                    {sortField === 'employee__full_name' && (
                      sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">
                    Date
                    {sortField === 'date' && (
                      sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested Times
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">
                    Status
                    {sortField === 'status' && (
                      sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('submitted_at')}>
                  <div className="flex items-center gap-1">
                    Submitted
                    {sortField === 'submitted_at' && (
                      sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                    )}
                  </div>
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
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <FaUserClock className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {request.employee_name || request.employee?.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.employee?.employee_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(request.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      {request.requested_time_in && (
                        <div className="flex items-center gap-1">
                          <FaClock className="text-blue-500 text-xs" />
                          <span className="font-medium">In:</span> {formatTime(request.requested_time_in)}
                        </div>
                      )}
                      {request.requested_time_out && (
                        <div className="flex items-center gap-1">
                          <FaClock className="text-red-500 text-xs" />
                          <span className="font-medium">Out:</span> {formatTime(request.requested_time_out)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={request.reason}>
                      {request.reason}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.submitted_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {request.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproval(request, 'approve')}
                          disabled={isApproving}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          <FaUserCheck className="mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(request, 'reject')}
                          disabled={isApproving}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        >
                          <FaUserTimes className="mr-1" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">Already {request.status}</span>
                    )}

                    {/* PDF Download Button for each request */}
                    <button
                      onClick={() => downloadTimeCorrectionReport(request)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-sm transition-all duration-200 transform hover:scale-105 hover:shadow-md ml-2"
                      title="Download Individual Report"
                    >
                      <FaDownload className="mr-1" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-8 pb-8">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedRequests.length)} of {sortedRequests.length} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Time Correction Request
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Employee:</strong> {selectedRequest.employee_name || selectedRequest.employee?.full_name}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Date:</strong> {new Date(selectedRequest.date).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Reason:</strong> {selectedRequest.reason}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments (optional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Add comments for ${approvalAction === 'approve' ? 'approval' : 'rejection'}...`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmitApproval}
                disabled={isApproving}
                className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                  approvalAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {isApproving ? 'Processing...' : (approvalAction === 'approve' ? 'Approve' : 'Reject')}
              </button>
              <button
                onClick={() => setShowApprovalModal(false)}
                disabled={isApproving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeCorrectionApprovalList; 