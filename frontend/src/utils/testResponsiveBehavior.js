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

// Test utility for responsive behavior
// This helps verify that the 500px breakpoint is working correctly

export const testResponsiveBreakpoints = () => {
  const currentWidth = window.innerWidth;
  const currentHeight = window.innerHeight;
  
  console.log('=== Responsive Breakpoint Test ===');
  console.log(`Current screen dimensions: ${currentWidth}x${currentHeight}`);
  console.log(`Screen width: ${currentWidth}px`);
  
  // Test breakpoints
  if (currentWidth <= 500) {
    console.log('✅ MOBILE MODE: Screen width ≤ 500px');
    console.log('   - Mobile dashboard styles will be applied');
    console.log('   - Touch-friendly interface enabled');
  } else if (currentWidth <= 1024) {
    console.log('✅ TABLET/LAPTOP MODE: Screen width 501px - 1024px');
    console.log('   - Full dashboard styles will be applied');
    console.log('   - Standard desktop interface');
  } else {
    console.log('✅ DESKTOP MODE: Screen width > 1024px');
    console.log('   - Full dashboard styles will be applied');
    console.log('   - Enhanced desktop interface');
  }
  
  // Test device detection
  const deviceType = getDeviceType();
  console.log(`Device type detected: ${deviceType}`);
  
  // Test view mode
  const viewMode = getEffectiveViewMode();
  console.log(`Effective view mode: ${viewMode}`);
  
  console.log('================================');
};

// Helper function to get device type (simplified version)
const getDeviceType = () => {
  const width = window.innerWidth;
  if (width <= 500) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
};

// Helper function to get effective view mode (simplified version)
const getEffectiveViewMode = () => {
  const width = window.innerWidth;
  if (width <= 500) return 'mobile';
  return 'full';
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testResponsiveBreakpoints = testResponsiveBreakpoints;
  console.log('Responsive test utility loaded. Run testResponsiveBreakpoints() to test.');
}
