import React from 'react';
import { FaMobile, FaDesktop, FaBars } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { 
  shouldShowMobileView, 
  shouldShowFullView, 
  shouldShowViewToggle,
  setUserViewPreference, 
  VIEW_MODES 
} from '../utils/deviceDetection';

const ViewToggle = ({ onViewChange, className = '' }) => {
  const navigate = useNavigate();
  const isMobileView = shouldShowMobileView();
  const isFullView = shouldShowFullView();
  const shouldShow = shouldShowViewToggle();

  // Don't render the toggle on desktop/laptop screens
  if (!shouldShow) {
    return null;
  }

  const handleToggle = () => {
    const newMode = isMobileView ? VIEW_MODES.FULL : VIEW_MODES.MOBILE;
    setUserViewPreference(newMode);
    
    // Trigger view change callback
    if (onViewChange) {
      onViewChange(newMode);
    }
    
    // Force page refresh to apply the new view mode
    if (newMode === VIEW_MODES.MOBILE) {
      window.location.href = '/mobile-view';
    } else {
      window.location.href = '/';
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 ${className}`}
      title={isMobileView ? 'Switch to Full Features' : 'Switch to Mobile View'}
    >
      {isMobileView ? (
        <>
          <FaDesktop className="text-lg" />
          <span className="hidden sm:inline">Full Features</span>
        </>
      ) : (
        <>
          <FaMobile className="text-lg" />
          <span className="hidden sm:inline">Mobile View</span>
        </>
      )}
    </button>
  );
};

export default ViewToggle; 