// Device detection utilities for mobile vs desktop experience

export const isMobileDevice = () => {
  // Check for mobile user agent
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);
  
  // Check for touch capability
  const hasTouch = 'ontouchstart' in window;
  
  // Check screen size
  const isSmallScreen = window.innerWidth <= 768;
  
  // Check if device is in portrait mode (common for phones)
  const isPortrait = window.innerHeight > window.innerWidth;
  
  return isMobileUA || (hasTouch && isSmallScreen) || (isSmallScreen && isPortrait);
};

export const isTabletDevice = () => {
  const tabletRegex = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i;
  const isTabletUA = tabletRegex.test(navigator.userAgent);
  
  const isMediumScreen = window.innerWidth > 768 && window.innerWidth <= 1024;
  
  return isTabletUA || isMediumScreen;
};

export const isDesktopDevice = () => {
  return !isMobileDevice() && !isTabletDevice();
};

export const getDeviceType = () => {
  if (isMobileDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
};

export const shouldShowMobileInterface = () => {
  const deviceType = getDeviceType();
  return deviceType === 'mobile';
};

export const shouldShowTabletInterface = () => {
  const deviceType = getDeviceType();
  return deviceType === 'tablet';
};

export const shouldShowDesktopInterface = () => {
  const deviceType = getDeviceType();
  return deviceType === 'desktop';
};

// Screen size breakpoints
export const SCREEN_SIZES = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1025
};

// User preference management
export const VIEW_MODES = {
  MOBILE: 'mobile',
  FULL: 'full'
};

export const getUserViewPreference = () => {
  return localStorage.getItem('geoTime_viewMode') || null;
};

export const setUserViewPreference = (mode) => {
  localStorage.setItem('geoTime_viewMode', mode);
};

export const clearUserViewPreference = () => {
  localStorage.removeItem('geoTime_viewMode');
};

// Get the effective view mode considering both device detection and user preference
export const getEffectiveViewMode = () => {
  const userPreference = getUserViewPreference();
  
  // For desktop/laptop screens, always use full view regardless of preference
  if (shouldShowDesktopInterface()) {
    return VIEW_MODES.FULL;
  }
  
  // For mobile/tablet screens, respect user preference
  if (userPreference) {
    return userPreference;
  }
  
  // Otherwise, use device detection
  if (shouldShowMobileInterface()) {
    return VIEW_MODES.MOBILE;
  }
  
  return VIEW_MODES.FULL;
};

export const shouldShowMobileView = () => {
  return getEffectiveViewMode() === VIEW_MODES.MOBILE;
};

export const shouldShowFullView = () => {
  return getEffectiveViewMode() === VIEW_MODES.FULL;
};

// Check if navbar should be shown (only in full view mode)
export const shouldShowNavbar = () => {
  return shouldShowFullView();
};

// Check if view toggle should be shown (only on mobile/tablet devices)
export const shouldShowViewToggle = () => {
  return !shouldShowDesktopInterface();
};

// Feature flags based on effective view mode
export const getFeatureFlags = () => {
  const isMobileView = shouldShowMobileView();
  const isFullView = shouldShowFullView();
  const isMobileDevice = shouldShowMobileInterface();
  const isDesktopDevice = shouldShowDesktopInterface();
  
  return {
    // Mobile view features
    showSimplifiedDashboard: isMobileView,
    showQuickClockInOut: isMobileView,
    showMapView: isMobileView,
    showGeofenceValidation: isMobileView,
    
    // Full view features
    showFullDashboard: isFullView,
    showDetailedReports: isFullView,
    showAdvancedAnalytics: isFullView,
    showRequestManagement: isFullView,
    showApprovalWorkflows: isFullView,
    
    // Device-specific features
    showHybridInterface: isMobileDevice && !isMobileView,
    showLimitedReports: isMobileDevice && !isMobileView,
    
    // Common features
    showBasicProfile: true,
    showLogout: true,
    showNotifications: true,
    showViewToggle: shouldShowViewToggle()
  };
}; 