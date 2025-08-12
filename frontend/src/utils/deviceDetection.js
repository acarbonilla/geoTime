// Device detection utilities for mobile vs desktop experience

export const isMobileDevice = () => {
  // Check for mobile user agent
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);
  
  // Check for touch capability
  const hasTouch = 'ontouchstart' in window;
  
  // More aggressive screen size detection - anything 1024px and below is considered mobile
  const isSmallScreen = window.innerWidth <= 1024;
  
  // Check if device is in portrait mode (common for phones)
  const isPortrait = window.innerHeight > window.innerWidth;
  
  // Prioritize mobile view for smaller screens and touch devices
  return isMobileUA || (hasTouch && isSmallScreen) || (isSmallScreen && isPortrait) || isSmallScreen;
};

export const isTabletDevice = () => {
  const tabletRegex = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i;
  const isTabletUA = tabletRegex.test(navigator.userAgent);
  
  // Adjust tablet breakpoint to be more mobile-focused
  const isMediumScreen = window.innerWidth > 1024 && window.innerWidth <= 1280;
  
  return isTabletUA || isMediumScreen;
};

export const isDesktopDevice = () => {
  // Only consider truly large screens as desktop
  return window.innerWidth > 1280 && !isMobileDevice();
};

export const getDeviceType = () => {
  if (isMobileDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
};

export const shouldShowMobileInterface = () => {
  const deviceType = getDeviceType();
  return deviceType === 'mobile' || deviceType === 'tablet'; // Include tablets in mobile interface
};

export const shouldShowTabletInterface = () => {
  const deviceType = getDeviceType();
  return deviceType === 'tablet';
};

export const shouldShowDesktopInterface = () => {
  const deviceType = getDeviceType();
  return deviceType === 'desktop';
};

// Updated screen size breakpoints - more mobile-focused
export const SCREEN_SIZES = {
  MOBILE: 1024,    // Increased from 768 to 1024
  TABLET: 1280,    // Increased from 1024 to 1280
  DESKTOP: 1281    // Increased from 1025 to 1281
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
  
  // For truly large desktop screens only, use full view
  if (shouldShowDesktopInterface() && window.innerWidth > 1280) {
    return VIEW_MODES.FULL;
  }
  
  // For mobile/tablet screens, prioritize mobile view
  if (shouldShowMobileInterface()) {
    // If user explicitly wants full view, allow it but default to mobile
    if (userPreference === VIEW_MODES.FULL) {
      return VIEW_MODES.FULL;
    }
    return VIEW_MODES.MOBILE;
  }
  
  // Default to mobile view for most cases
  return VIEW_MODES.MOBILE;
};

export const shouldShowMobileView = () => {
  return getEffectiveViewMode() === VIEW_MODES.MOBILE;
};

export const shouldShowFullView = () => {
  return getEffectiveViewMode() === VIEW_MODES.FULL;
};

// Check if navbar should be shown (only show in full view mode)
export const shouldShowNavbar = () => {
  return shouldShowFullView(); // Only show navbar in full view mode
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
  
  return {
    // Mobile view features - prioritized
    showSimplifiedDashboard: isMobileView,
    showQuickClockInOut: isMobileView,
    showMapView: isMobileView,
    showGeofenceValidation: isMobileView,
    
    // Full view features - only for large screens
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