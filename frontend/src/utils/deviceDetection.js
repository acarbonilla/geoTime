// Device detection utilities for mobile vs desktop experience

export const isMobileDevice = () => {
  // Check for mobile user agent
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);
  
  // Check for touch capability
  const hasTouch = 'ontouchstart' in window;
  
  // Mobile breakpoint: only screens 500px and below are considered mobile
  const isSmallScreen = window.innerWidth <= 500;
  
  // Check if device is in portrait mode (common for phones)
  const isPortrait = window.innerHeight > window.innerWidth;
  
  // Prioritize mobile view for smaller screens and touch devices
  return isMobileUA || (hasTouch && isSmallScreen) || (isSmallScreen && isPortrait) || isSmallScreen;
};

export const isTabletDevice = () => {
  const tabletRegex = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i;
  const isTabletUA = tabletRegex.test(navigator.userAgent);
  
  // Tablet breakpoint: screens between 501px and 1024px
  const isMediumScreen = window.innerWidth > 500 && window.innerWidth <= 1024;
  
  return isTabletUA || isMediumScreen;
};

export const isDesktopDevice = () => {
  // Only consider screens larger than 1024px as desktop
  return window.innerWidth > 1024 && !isMobileDevice();
};

export const getDeviceType = () => {
  if (isMobileDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
};

export const shouldShowMobileInterface = () => {
  const deviceType = getDeviceType();
  return deviceType === 'mobile'; // Only true mobile devices, not tablets
};

export const shouldShowTabletInterface = () => {
  const deviceType = getDeviceType();
  return deviceType === 'tablet';
};

export const shouldShowDesktopInterface = () => {
  const deviceType = getDeviceType();
  return deviceType === 'desktop';
};

// Updated screen size breakpoints - mobile-focused with 500px breakpoint
export const SCREEN_SIZES = {
  MOBILE: 500,     // Mobile devices: 500px and below
  TABLET: 1024,    // Tablets: 501px to 1024px
  DESKTOP: 1025    // Desktop: 1025px and above
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
  if (shouldShowDesktopInterface() && window.innerWidth > 1024) {
    return VIEW_MODES.FULL;
  }
  
  // For mobile screens (500px and below), prioritize mobile view
  if (shouldShowMobileInterface()) {
    // If user explicitly wants full view, allow it but default to mobile
    if (userPreference === VIEW_MODES.FULL) {
      return VIEW_MODES.FULL;
    }
    return VIEW_MODES.MOBILE;
  }
  
  // For tablets and laptops (501px to 1024px), default to full view
  if (shouldShowTabletInterface()) {
    return VIEW_MODES.FULL;
  }
  
  // Default to full view for most cases (tablets, laptops, desktops)
  return VIEW_MODES.FULL;
};

export const shouldShowMobileView = () => {
  return getEffectiveViewMode() === VIEW_MODES.MOBILE;
};

export const shouldShowFullView = () => {
  return getEffectiveViewMode() === VIEW_MODES.FULL;
};

// Check if navbar should be shown (show in full view mode and tablet mode)
export const shouldShowNavbar = () => {
  return shouldShowFullView() || shouldShowTabletInterface(); // Show navbar in full view and tablet mode
};

// Check if view toggle should be shown (only on mobile devices)
export const shouldShowViewToggle = () => {
  return shouldShowMobileInterface(); // Only show on true mobile devices
};

// Feature flags based on effective view mode
export const getFeatureFlags = () => {
  const isMobileView = shouldShowMobileView();
  const isFullView = shouldShowFullView();
  const isMobileDevice = shouldShowMobileInterface();
  const isTabletDevice = shouldShowTabletInterface();
  
  return {
    // Mobile view features - only for true mobile devices (500px and below)
    showSimplifiedDashboard: isMobileView,
    showQuickClockInOut: isMobileView,
    showMapView: isMobileView,
    showGeofenceValidation: isMobileView,
    
    // Full view features - for tablets, laptops, and desktops
    showFullDashboard: isFullView,
    showDetailedReports: isFullView,
    showAdvancedAnalytics: isFullView,
    showRequestManagement: isFullView,
    showApprovalWorkflows: isFullView,
    
    // Device-specific features
    showHybridInterface: isTabletDevice,
    showLimitedReports: isTabletDevice,
    
    // Common features
    showBasicProfile: true,
    showLogout: true,
    showNotifications: true,
    showViewToggle: shouldShowViewToggle()
  };
}; 