import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { getAvailableTemplates, updateTemplate, deleteTemplate, checkExistingSchedules } from '../api/scheduleAPI';
import { toast } from 'react-toastify';

const BulkScheduleModal = ({ isOpen, onClose, onSave, currentMonth, isStaff = false }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [bulkData, setBulkData] = useState({
    start_date: '',
    end_date: '',
    weekdays_only: false,
    flip_am_pm: false,
    overwrite_existing: false,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateTypeFilter, setTemplateTypeFilter] = useState('personal');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      // Set default date range to current month
      setBulkData(prev => ({
        ...prev,
        start_date: currentMonth.startOf('month').format('YYYY-MM-DD'),
        end_date: currentMonth.endOf('month').format('YYYY-MM-DD')
      }));
    }
  }, [isOpen, currentMonth]);

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const data = await getAvailableTemplates();
      // Ensure templates is always an array
      setTemplates(Array.isArray(data) ? data : []);
      console.log('Loaded templates:', data);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]); // Set empty array on error
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBulkData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    if (!bulkData.start_date || !bulkData.end_date) {
      toast.error('Please select start and end dates');
      return;
    }

    if (new Date(bulkData.start_date) > new Date(bulkData.end_date)) {
      toast.error('Start date must be before end date');
      return;
    }

    // Remove frontend validation - let backend handle all validation
    // This will provide more accurate and detailed error messages

    try {
      // Check for existing schedules first - only send date-related data
      const checkData = {
        start_date: bulkData.start_date,
        end_date: bulkData.end_date,
        weekdays_only: bulkData.weekdays_only
      };
      const existingCheck = await checkExistingSchedules(checkData);
      
      let shouldProceed = true;
      let overwriteConfirmed = bulkData.overwrite_existing;
      
      // If there are existing schedules and user hasn't checked overwrite
      if (existingCheck.has_existing_schedules && !bulkData.overwrite_existing) {
        const existingDates = existingCheck.existing_dates.slice(0, 5);
        const moreText = existingCheck.existing_dates.length > 5 ? ` and ${existingCheck.existing_dates.length - 5} more` : '';
        
        const confirmMessage = `Found ${existingCheck.existing_dates_count} existing schedules in this date range.\n\nExisting dates: ${existingDates.join(', ')}${moreText}\n\nDo you want to:\n\n✅ Overwrite existing schedules (recommended)\n❌ Skip existing schedules\n❌ Cancel`;
        
        const userChoice = window.confirm(confirmMessage);
        
        if (userChoice) {
          // User clicked OK - ask if they want to overwrite
          const overwriteChoice = window.confirm('Do you want to overwrite the existing schedules?');
          if (overwriteChoice) {
            overwriteConfirmed = true;
          } else {
            // User chose to skip existing
            shouldProceed = true;
          }
        } else {
          // User clicked Cancel
          shouldProceed = false;
        }
      }
      
      if (shouldProceed) {
        // Show final confirmation dialog
        const startDate = new Date(bulkData.start_date);
        const endDate = new Date(bulkData.end_date);
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        let message = `Create schedules for ${daysDiff} day(s) using template "${selectedTemplate.name}"?`;
        if (bulkData.weekdays_only) {
          message += '\n\nNote: Only weekdays will be scheduled (weekends will be skipped).';
        }
        
        if (overwriteConfirmed) {
          message += '\n\n⚠️ WARNING: This will REPLACE any existing schedules in this date range.';
        } else if (existingCheck.has_existing_schedules) {
          message += '\n\nExisting schedules in this date range will be skipped.';
        }
        
        if (window.confirm(message)) {
          const submitData = {
            ...bulkData,
            template_id: selectedTemplate.id,
            flip_am_pm: bulkData.flip_am_pm,
            overwrite_existing: overwriteConfirmed
          };

          console.log('Submitting bulk schedule with data:', submitData);
          onSave(submitData);
        }
      }
    } catch (error) {
      console.error('Error checking existing schedules:', error);
      toast.error('Failed to check existing schedules. Please try again.');
    }
  };

  const handleCopyLastMonth = () => {
    const lastMonth = moment(currentMonth).subtract(1, 'month');
    setBulkData(prev => ({
      ...prev,
      start_date: lastMonth.startOf('month').format('YYYY-MM-DD'),
      end_date: lastMonth.endOf('month').format('YYYY-MM-DD'),
      notes: `Copied from ${lastMonth.format('MMMM YYYY')}`
    }));
  };

  const handleApplyToWeekdays = () => {
    // This would apply the template to weekdays only
    setBulkData(prev => ({
      ...prev,
      weekdays_only: true
    }));
  };

  const handleTemplateTypeFilterChange = (e) => {
    const filterValue = e.target.value;
    setTemplateTypeFilter(filterValue);
    // Clear selected template if it doesn't match the new filter
    if (selectedTemplate && filterValue !== 'all' && selectedTemplate.template_type !== filterValue) {
      setSelectedTemplate(null);
    }
  };

  const getFilteredTemplates = () => {
    if (templateTypeFilter === 'all') {
      return templates;
    }
    return templates.filter(template => template.template_type === templateTypeFilter);
  };

  const handleEditTemplate = (template, e) => {
    e.stopPropagation(); // Prevent template selection
    setEditingTemplate(template);
    setIsEditModalOpen(true);
  };

  const handleDeleteTemplate = async (template, e) => {
    e.stopPropagation(); // Prevent template selection
    
    if (window.confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      try {
        await deleteTemplate(template.id);
        toast.success('Template deleted successfully');
        loadTemplates(); // Reload templates
        // Clear selected template if it was the deleted one
        if (selectedTemplate?.id === template.id) {
          setSelectedTemplate(null);
        }
      } catch (error) {
        // Handle specific error messages from backend
        if (error.response && error.response.data && error.response.data.error) {
          toast.error(error.response.data.error);
        } else if (error.response && error.response.data && typeof error.response.data === 'string') {
          toast.error(error.response.data);
        } else if (error.message) {
          toast.error(error.message);
        } else {
          toast.error('Failed to delete template');
        }
        console.error('Error deleting template:', error);
      }
    }
  };

  const handleUpdateTemplate = async (templateData) => {
    try {
      await updateTemplate(editingTemplate.id, templateData);
      toast.success('Template updated successfully');
      setIsEditModalOpen(false);
      setEditingTemplate(null);
      loadTemplates(); // Reload templates
    } catch (error) {
      // Handle specific error messages from backend
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(error.response.data.error);
      } else if (error.response && error.response.data && typeof error.response.data === 'string') {
        toast.error(error.response.data);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update template');
      }
      console.error('Error updating template:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Bulk Schedule Creation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Template Selection */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Template
              </label>
              <select
                value={templateTypeFilter}
                onChange={handleTemplateTypeFilterChange}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Templates</option>
                <option value="personal">Personal Only</option>
                <option value="company">Company Only</option>
                <option value="team">Team Only</option>
              </select>
            </div>
            {templatesLoading ? (
              <div className="flex justify-center items-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading templates...</span>
              </div>
                        ) : Array.isArray(templates) && templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getFilteredTemplates().map(template => (
                                     <div
                     key={template.id}
                     onClick={() => handleTemplateSelect(template)}
                     className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                       selectedTemplate?.id === template.id
                         ? 'border-blue-500 bg-blue-50'
                         : 'border-gray-300 hover:border-gray-400'
                     }`}
                   >
                     <div className="flex justify-between items-start">
                       <div className="flex-1">
                         <h3 className="font-medium text-gray-900">{template.name}</h3>
                         <p className="text-sm text-gray-600">{template.formatted_time}</p>
                         <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                           template.is_night_shift 
                             ? 'bg-red-100 text-red-800' 
                             : 'bg-blue-100 text-blue-800'
                         }`}>
                           {template.is_night_shift ? 'Night Shift' : 'Day Shift'}
                         </span>
                       </div>
                       <div className="flex flex-col items-end gap-1">
                         <span className="text-xs text-gray-500 capitalize">{template.template_type}</span>
                         {/* Show edit/delete buttons only for Personal templates owned by current user or staff */}
                         {template.template_type === 'personal' && (isStaff || template.created_by === localStorage.getItem('userId')) && (
                           <div className="flex gap-1">
                             <button
                               onClick={(e) => handleEditTemplate(template, e)}
                               className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                               title="Edit template"
                             >
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                               </svg>
                             </button>
                             <button
                               onClick={(e) => handleDeleteTemplate(template, e)}
                               className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                               title="Delete template"
                             >
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                               </svg>
                             </button>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border border-gray-300 rounded-lg">
                <p className="text-gray-500">
                  {templateTypeFilter === 'all' 
                    ? 'No templates available. Please create a template first.'
                    : `No ${templateTypeFilter} templates available.`
                  }
                </p>
                {templateTypeFilter === 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      // You might want to open the template management modal here
                    }}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Create Template
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={bulkData.start_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                value={bulkData.end_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Actions
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyLastMonth}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Copy Last Month
              </button>
              <button
                type="button"
                onClick={handleApplyToWeekdays}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Apply to Weekdays Only
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="mb-4 space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="weekdays_only"
                checked={bulkData.weekdays_only}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Apply to weekdays only (Monday-Friday)</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                name="flip_am_pm"
                checked={bulkData.flip_am_pm}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Flip AM/PM times (e.g., 7AM-4PM becomes 7PM-4AM)</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="overwrite_existing"
                checked={bulkData.overwrite_existing}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                <span className="font-medium text-red-600">Overwrite existing schedules</span> - Replace existing schedules instead of skipping them
              </span>
            </label>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={bulkData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add notes about this bulk schedule..."
            />
          </div>

          {/* Preview */}
          {selectedTemplate && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Preview</h3>
              <p className="text-sm text-gray-600">
                Will create schedules from <strong>{bulkData.start_date}</strong> to <strong>{bulkData.end_date}</strong>
                {bulkData.weekdays_only && ' (weekdays only)'}
                {bulkData.flip_am_pm && ' with AM/PM flipped'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Template: <strong>{selectedTemplate.name}</strong> ({selectedTemplate.formatted_time})
              </p>
              {bulkData.overwrite_existing && (
                <p className="text-sm text-red-600 mt-1 font-medium">
                  ⚠️ Existing schedules will be replaced
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={!selectedTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Schedules
            </button>
          </div>
                 </form>
       </div>

       {/* Edit Template Modal */}
       {isEditModalOpen && editingTemplate && (
         <EditTemplateModal
           isOpen={isEditModalOpen}
           onClose={() => {
             setIsEditModalOpen(false);
             setEditingTemplate(null);
           }}
           onSave={handleUpdateTemplate}
           template={editingTemplate}
         />
       )}
     </div>
   );
 };

 // Edit Template Modal Component
 const EditTemplateModal = ({ isOpen, onClose, onSave, template }) => {
   const [formData, setFormData] = useState({
     name: '',
     time_in: '',
     time_out: '',
     is_night_shift: false,
     template_type: 'personal'
   });
   const [errors, setErrors] = useState({});

   useEffect(() => {
     if (template) {
       setFormData({
         name: template.name,
         time_in: template.time_in,
         time_out: template.time_out,
         is_night_shift: template.is_night_shift,
         template_type: template.template_type
       });
     }
     setErrors({});
   }, [template]);

   const handleInputChange = (e) => {
     const { name, value, type, checked } = e.target;
     setFormData(prev => ({
       ...prev,
       [name]: type === 'checkbox' ? checked : value
     }));
     
     if (errors[name]) {
       setErrors(prev => ({
         ...prev,
         [name]: ''
       }));
     }
   };

   const validateForm = () => {
     const newErrors = {};

     if (!formData.name.trim()) {
       newErrors.name = 'Template name is required';
     }

     if (!formData.time_in) {
       newErrors.time_in = 'Time in is required';
     }

     if (!formData.time_out) {
       newErrors.time_out = 'Time out is required';
     }

     setErrors(newErrors);
     return Object.keys(newErrors).length === 0;
   };

   const handleSubmit = (e) => {
     e.preventDefault();
     
     if (validateForm()) {
       onSave(formData);
     }
   };

   if (!isOpen) return null;

   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
         <div className="flex justify-between items-center mb-4">
           <h3 className="text-lg font-semibold text-gray-900">Edit Template</h3>
           <button
             onClick={onClose}
             className="text-gray-400 hover:text-gray-600"
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
         </div>

         <form onSubmit={handleSubmit}>
           <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Template Name
             </label>
             <input
               type="text"
               name="name"
               value={formData.name}
               onChange={handleInputChange}
               className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                 errors.name ? 'border-red-500' : 'border-gray-300'
               }`}
               placeholder="e.g., Morning Shift, Night Shift"
               required
             />
             {errors.name && (
               <p className="text-red-500 text-sm mt-1">{errors.name}</p>
             )}
           </div>

           <div className="grid grid-cols-2 gap-4 mb-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Time In
               </label>
               <input
                 type="time"
                 name="time_in"
                 value={formData.time_in}
                 onChange={handleInputChange}
                 className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                   errors.time_in ? 'border-red-500' : 'border-gray-300'
                 }`}
                 required
               />
               {errors.time_in && (
                 <p className="text-red-500 text-sm mt-1">{errors.time_in}</p>
               )}
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Time Out
               </label>
               <input
                 type="time"
                 name="time_out"
                 value={formData.time_out}
                 onChange={handleInputChange}
                 className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                   errors.time_out ? 'border-red-500' : 'border-gray-300'
                 }`}
                 required
               />
               {errors.time_out && (
                 <p className="text-red-500 text-sm mt-1">{errors.time_out}</p>
               )}
             </div>
           </div>

           <div className="mb-6">
             <label className="flex items-center">
               <input
                 type="checkbox"
                 name="is_night_shift"
                 checked={formData.is_night_shift}
                 onChange={handleInputChange}
                 className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
               />
               <span className="ml-2 text-sm text-gray-700">Night Shift (crosses midnight)</span>
             </label>
           </div>

           <div className="flex justify-end gap-3">
             <button
               type="button"
               onClick={onClose}
               className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
             >
               Cancel
             </button>
             <button
               type="submit"
               className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
             >
               Update
             </button>
           </div>
         </form>
       </div>
     </div>
   );
 };

 export default BulkScheduleModal; 