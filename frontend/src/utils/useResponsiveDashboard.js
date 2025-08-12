import { useEffect, useRef } from 'react';
import { shouldShowMobileView } from './deviceDetection';

/**
 * Custom hook for responsive dashboard switching
 * Automatically redirects users to the appropriate dashboard based on screen size
 */
export const useResponsiveDashboard = (currentDashboard, employeeRole) => {
  const resizeTimeoutRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      // Clear previous timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // Debounce the resize event to prevent too many redirects
      resizeTimeoutRef.current = setTimeout(() => {
        const currentWidth = window.innerWidth;
        const isMobile = currentWidth <= 1024;
        
        // Determine target dashboard based on current state and screen size
        let targetRoute = null;
        
        if (isMobile && currentDashboard !== 'mobile') {
          // Redirect to mobile dashboard
          targetRoute = '/mobile-view';
        } else if (!isMobile && currentDashboard === 'mobile') {
          // Redirect to appropriate full dashboard based on role
          if (employeeRole === 'team_leader') {
            targetRoute = '/team-leader-dashboard';
          } else {
            targetRoute = '/employee-dashboard';
          }
        }
        
        // Perform redirect if needed
        if (targetRoute && window.location.pathname !== targetRoute) {
          window.location.href = targetRoute;
        }
      }, 250); // Wait 250ms after resize stops before redirecting
    };

    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Initial check
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [currentDashboard, employeeRole]);

  // Return current view mode for debugging
  return {
    isMobileView: shouldShowMobileView(),
    currentDashboard,
    employeeRole
  };
};
