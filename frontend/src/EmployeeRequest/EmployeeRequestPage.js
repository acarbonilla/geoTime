import React, { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axiosInstance';
import OvertimeRequestsList from './OvertimeRequestsList';
import LeaveRequestList from './LeaveRequestList';
import ChangeScheduleRequestList from './ChangeScheduleRequestList';

import { shouldShowNavbar } from '../utils/deviceDetection';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const TABS = [
  { key: 'overtime', label: 'Overtime Request', icon: '⏰' },
  { key: 'leave', label: 'Leave Request', icon: '🏖️' },
  { key: 'change_schedule', label: 'Change Schedule', icon: '📅' },
];

const API_ENDPOINTS = {
  overtime: 'overtime-requests/',
  leave: 'leave-requests/',
  change_schedule: 'change-schedule-requests/',
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useRequestData = (endpoint) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(endpoint);
      setData(response.data.results || response.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const submitData = useCallback(async (formData) => {
    try {
      const response = await axios.post(endpoint, formData);
      await fetchData(); // Refresh data
      return response.data;
    } catch (err) {
      throw err;
    }
  }, [endpoint, fetchData]);

  return { data, loading, error, fetchData, submitData };
};

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

const DesktopTabBar = ({ tabs, activeTab, onTabChange }) => (
  <div className="hidden md:flex border-b mb-8 max-w-7xl mx-auto">
    {tabs.map(tab => (
      <button
        key={tab.key}
        className={`px-6 py-3 text-lg font-semibold focus:outline-none transition-all duration-200 border-b-2 -mb-px ${
          activeTab === tab.key
            ? 'border-blue-600 text-blue-700'
            : 'border-transparent text-gray-500 hover:text-blue-600'
        }`}
        onClick={() => onTabChange(tab.key)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

const MobileTabSelector = ({ currentTab, onToggle, showModal }) => (
  <div className="md:hidden mb-8 relative z-10">
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className="w-full p-5 bg-white border border-gray-300 rounded-xl shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer relative z-10"
    >
      <div className="flex items-center space-x-4">
        <span className="text-3xl">{currentTab?.icon}</span>
        <span className="font-semibold text-gray-900 text-lg">{currentTab?.label}</span>
      </div>
      <span className="text-gray-400 text-xl">▼</span>
    </button>
  </div>
);

const MobileTabModal = ({ show, tabs, activeTab, onTabSelect, onClose }) => {
  if (!show) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-[10000] animate-fade-in md:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-start justify-center z-[10001] md:hidden p-4 pt-20 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-fade-in pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Select Request Type</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-3xl font-bold focus:outline-none"
            >
              &times;
            </button>
          </div>
          <div className="space-y-3">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => onTabSelect(tab.key)}
                className={`w-full p-5 rounded-xl border-2 transition-all duration-200 flex items-center space-x-4 ${
                  activeTab === tab.key
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-3xl">{tab.icon}</span>
                <span className="font-medium text-lg">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const TabHeader = ({ title, hideButton = false }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 mt-4 gap-4">
    <h1 className="text-3xl sm:text-4xl font-bold text-blue-700">{title}</h1>
    {!hideButton && (
      <button
        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg text-lg transition-colors"
        onClick={() => {}}
      >
        Button
      </button>
    )}
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EmployeeRequestPage = () => {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  
  const [activeRequestTab, setActiveRequestTab] = useState('overtime');
  const [showTabModal, setShowTabModal] = useState(false);

  // ========================================================================
  // DATA HOOKS
  // ========================================================================
  
  const overtimeData = useRequestData(API_ENDPOINTS.overtime);
  const leaveData = useRequestData(API_ENDPOINTS.leave);
  const changeScheduleData = useRequestData(API_ENDPOINTS.change_schedule);

  // ========================================================================
  // EFFECTS
  // ========================================================================
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchDataForTab = () => {
      switch (activeRequestTab) {
        case 'overtime':
          overtimeData.fetchData();
          break;
        case 'leave':
          leaveData.fetchData();
          break;
        case 'change_schedule':
          changeScheduleData.fetchData();
          break;
        default:
          break;
      }
    };

    fetchDataForTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRequestTab]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================
  
  const handleTabSelect = (tabKey) => {
    setActiveRequestTab(tabKey);
    setShowTabModal(false);
  };

  const handleOvertimeRequestCreated = (newRequest) => {
    // Refresh overtime data when a new request is created
    overtimeData.fetchData();
  };

  const handleLeaveRequestCreated = (newRequest) => {
    // Refresh leave data when a new request is created
    leaveData.fetchData();
  };

  const handleChangeScheduleRequestCreated = (newRequest) => {
    // Refresh change schedule data when a new request is created
    changeScheduleData.fetchData();
  };

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================
  
  const getCurrentTab = () => TABS.find(tab => tab.key === activeRequestTab);
  const isNavbarVisible = shouldShowNavbar();

  const getFormConfig = (tabKey) => {
    const configs = {
      overtime: {
        title: 'Overtime Request',
        ListComponent: OvertimeRequestsList,
        data: overtimeData,
      },
      leave: {
        title: 'Leave Request',
        ListComponent: LeaveRequestList,
        data: leaveData,
      },
      change_schedule: {
        title: 'Change Schedule Request',
        ListComponent: ChangeScheduleRequestList,
        data: changeScheduleData,
      },
    };
    return configs[tabKey];
  };

  // ========================================================================
  // RENDER
  // ========================================================================
  
  const currentConfig = getFormConfig(activeRequestTab);
  const { ListComponent, data } = currentConfig;

  return (
         <div className={`w-full min-h-screen px-4 sm:px-6 lg:px-8 animate-fade-in ${isNavbarVisible ? 'pt-7' : 'pt-6'}`}>
      


      {/* Desktop Tab Bar */}
      <DesktopTabBar 
        tabs={TABS}
        activeTab={activeRequestTab}
        onTabChange={setActiveRequestTab}
      />

      {/* Mobile Tab Selector */}
      <MobileTabSelector 
        currentTab={getCurrentTab()}
        onToggle={() => setShowTabModal(prev => !prev)}
        showModal={showTabModal}
      />

      {/* Mobile Tab Selection Modal */}
      <MobileTabModal 
        show={showTabModal}
        tabs={TABS}
        activeTab={activeRequestTab}
        onTabSelect={handleTabSelect}
        onClose={() => setShowTabModal(false)}
      />

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto">
        <TabHeader 
          title={currentConfig.title}
          hideButton={true}
        />

        {/* Request List */}
        <ListComponent 
          requests={data.data || []}
          isLoading={data.loading}
          error={data.error}
          onRequestCreated={
            activeRequestTab === 'overtime' ? handleOvertimeRequestCreated :
            activeRequestTab === 'leave' ? handleLeaveRequestCreated :
            activeRequestTab === 'change_schedule' ? handleChangeScheduleRequestCreated :
            undefined
          }
        />
      </div>
    </div>
  );
};

export default EmployeeRequestPage; 