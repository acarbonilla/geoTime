/**
 * Test utility for responsive dashboard behavior
 * Run this in the browser console to test the responsive switching
 */

export const testResponsiveBehavior = () => {
  console.log('🧪 Testing Responsive Dashboard Behavior...');
  
  // Test current screen size detection
  const currentWidth = window.innerWidth;
  const isMobile = currentWidth <= 1024;
  const isTablet = currentWidth > 1024 && currentWidth <= 1280;
  const isDesktop = currentWidth > 1280;
  
  console.log('📱 Current Screen Size:', {
    width: currentWidth,
    isMobile,
    isTablet,
    isDesktop,
    currentPath: window.location.pathname
  });
  
  // Test device detection functions
  try {
    const { shouldShowMobileView, shouldShowFullView } = require('./deviceDetection');
    console.log('🔍 Device Detection Results:', {
      shouldShowMobileView: shouldShowMobileView(),
      shouldShowFullView: shouldShowFullView()
    });
  } catch (error) {
    console.log('⚠️ Device detection functions not available');
  }
  
  // Test resize simulation
  console.log('🔄 Simulating resize events...');
  
  // Simulate mobile size
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 768
  });
  window.dispatchEvent(new Event('resize'));
  
  setTimeout(() => {
    console.log('📱 After mobile resize simulation:', {
      width: window.innerWidth,
      path: window.location.pathname
    });
    
    // Restore original size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: currentWidth
    });
    window.dispatchEvent(new Event('resize'));
    
    setTimeout(() => {
      console.log('🖥️ After desktop resize simulation:', {
        width: window.innerWidth,
        path: window.location.pathname
      });
      console.log('✅ Responsive behavior test completed!');
    }, 300);
  }, 300);
};

// Auto-run test if in development
if (process.env.NODE_ENV === 'development') {
  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testResponsiveBehavior);
  } else {
    testResponsiveBehavior();
  }
}
