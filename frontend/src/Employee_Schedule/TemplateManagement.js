import React, { useState, useEffect } from 'react';
import { getAvailableTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api/scheduleAPI';
import { toast } from 'react-toastify';

const TemplateManagement = ({ isOpen, onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getAvailableTemplates();
      // Ensure templates is always an array
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load templates');
      console.error('Error loading templates:', error);
      setTemplates([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (templateData) => {
    try {
      console.log('🔍 Creating template with data:', templateData);
      console.log('🔑 Access token:', localStorage.getItem('access_token'));
      
      const result = await createTemplate(templateData);
      console.log('✅ Template created successfully:', result);
      toast.success('Template created successfully');
      setIsCreateModalOpen(false);
      loadTemplates();
    } catch (error) {
      console.error('❌ Error creating template:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      toast.error(`Failed to create template: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleUpdateTemplate = async (templateId, templateData) => {
    try {
      await updateTemplate(templateId, templateData);
      toast.success('Template updated successfully');
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      toast.error('Failed to update template');
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteTemplate(templateId);
        toast.success('Template deleted successfully');
        loadTemplates();
      } catch (error) {
        toast.error('Failed to delete template');
        console.error('Error deleting template:', error);
      }
    }
  };

  const handleFlipTemplate = async (template) => {
    try {
      const flippedData = {
        name: `${template.name} (Flipped)`,
        time_in: template.time_out, // Swap times
        time_out: template.time_in,
        is_night_shift: !template.is_night_shift,
        template_type: template.template_type
      };
      await createTemplate(flippedData);
      toast.success('Flipped template created successfully');
      loadTemplates();
    } catch (error) {
      toast.error('Failed to create flipped template');
      console.error('Error creating flipped template:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Schedule Templates</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create Template
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Close
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div>
            {Array.isArray(templates) && templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-600">{template.formatted_time}</p>
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        template.template_type === 'company' 
                          ? 'bg-purple-100 text-purple-800'
                          : template.template_type === 'team'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {template.template_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        template.is_night_shift 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {template.is_night_shift ? 'Night Shift' : 'Day Shift'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {template.duration_hours}h
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTemplate(template)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleFlipTemplate(template)}
                        className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 text-sm"
                      >
                        Flip AM/PM
                      </button>
                      {template.template_type === 'personal' && (
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No templates available. Create your first template to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* Create Template Modal */}
        {isCreateModalOpen && (
          <CreateTemplateModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSave={handleCreateTemplate}
          />
        )}

        {/* Edit Template Modal */}
        {editingTemplate && (
          <CreateTemplateModal
            isOpen={!!editingTemplate}
            onClose={() => setEditingTemplate(null)}
            onSave={(data) => handleUpdateTemplate(editingTemplate.id, data)}
            template={editingTemplate}
          />
        )}
      </div>
    </div>
  );
};

// Create/Edit Template Modal Component
const CreateTemplateModal = ({ isOpen, onClose, onSave, template }) => {
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
    } else {
      setFormData({
        name: '',
        time_in: '',
        time_out: '',
        is_night_shift: false,
        template_type: 'personal'
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
          <h3 className="text-lg font-semibold text-gray-900">
            {template ? 'Edit Template' : 'Create Template'}
          </h3>
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

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Type
            </label>
            <select
              name="template_type"
              value={formData.template_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="personal">Personal</option>
              <option value="team">Team</option>
              <option value="company">Company</option>
            </select>
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
              {template ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateManagement; 