import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Check if it's a geolocation error - don't show error UI for these
    if (error.constructor?.name === 'GeolocationPositionError' ||
        (error.code !== undefined && error.message !== undefined && 
         (error.code === 1 || error.code === 2 || error.code === 3))) {
      return { hasError: false }; // Don't show error UI for geolocation errors
    }
    
    // Check for other geolocation-related errors
    if (error && error.message && 
        (error.message.includes('geolocation') || 
         error.message.includes('location') ||
         error.message.includes('permission'))) {
      return { hasError: false }; // Don't show error UI for geolocation errors
    }
    
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.warn('ErrorBoundary caught an error:', error, errorInfo);
    
    // Check if it's a geolocation error
    if (error) {
      // Check if it's a GeolocationPositionError
      if (error.constructor?.name === 'GeolocationPositionError' ||
          (error.code !== undefined && error.message !== undefined && 
           (error.code === 1 || error.code === 2 || error.code === 3))) {
        
        let errorMessage = 'Location access error';
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Location permission denied. Please enable location services.';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'Location information is unavailable.';
            break;
          case 3: // TIMEOUT
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = error.message || 'Unable to get your location.';
        }
        
        console.warn('Geolocation error caught by ErrorBoundary:', errorMessage);
        // Don't set hasError for geolocation issues, just log them
        return;
      }
      
      // Check for other geolocation-related errors
      if (error.message && 
          (error.message.includes('geolocation') || 
           error.message.includes('location') ||
           error.message.includes('permission'))) {
        console.warn('Geolocation error caught by ErrorBoundary:', error.message);
        // Don't set hasError for geolocation issues, just log them
        return;
      }
    }
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              An unexpected error occurred. Please refresh the page or contact support if the problem persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
