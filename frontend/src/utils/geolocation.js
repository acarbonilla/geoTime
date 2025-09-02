// Geolocation utilities for mobile dashboard

export const getCurrentPosition = (options = {}) => {
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000, // 30 seconds
  };

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position);
      },
      (error) => {
        let errorMessage = 'Unknown geolocation error';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location services in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your GPS/network connection.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = error.message || 'Unable to get your location. Please try again.';
        }
        
        // Log the error for debugging but don't throw
        console.warn('Geolocation error:', errorMessage, error);
        
        // Create a more detailed error object
        const geolocationError = new Error(errorMessage);
        geolocationError.code = error.code;
        geolocationError.originalError = error;
        reject(geolocationError);
      },
      { ...defaultOptions, ...options }
    );
  });
};

export const watchPosition = (callback, options = {}) => {
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000,
  };

  if (!navigator.geolocation) {
    console.warn('Geolocation is not supported by this browser');
    return null; // Return null instead of throwing
  }

  try {
    return navigator.geolocation.watchPosition(
      callback,
      (error) => {
        let errorMessage = 'Geolocation watch error';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied for watch. Please enable location services.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable for watch.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location watch timed out.';
            break;
          default:
            errorMessage = error.message || 'Geolocation watch error occurred.';
        }
        
        console.warn('Geolocation watch error:', errorMessage, error);
        // Don't throw, just log the error
      },
      { ...defaultOptions, ...options }
    );
  } catch (error) {
    console.warn('Error setting up geolocation watch:', error);
    return null; // Return null on error instead of throwing
  }
};

export const clearWatch = (watchId) => {
  try {
    if (navigator.geolocation && watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
  } catch (error) {
    console.warn('Error clearing geolocation watch:', error);
    // Don't throw, just log the error
  }
};

// Calculate distance between two points using Haversine formula
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Check if location is within geofence
export const isWithinGeofence = (userLat, userLon, fenceLat, fenceLon, fenceRadius) => {
  const distance = calculateDistance(userLat, userLon, fenceLat, fenceLon);
  return distance <= fenceRadius;
};

// Format coordinates for display
export const formatCoordinates = (latitude, longitude, precision = 6) => {
  return {
    lat: latitude.toFixed(precision),
    lng: longitude.toFixed(precision)
  };
};

// Get location accuracy description
export const getAccuracyDescription = (accuracy) => {
  if (accuracy <= 5) return 'Excellent';
  if (accuracy <= 10) return 'Good';
  if (accuracy <= 20) return 'Fair';
  if (accuracy <= 50) return 'Poor';
  return 'Very Poor';
};

// Enhanced error handling wrapper for geolocation operations
export const withGeolocationErrorHandling = async (geolocationOperation, fallbackValue = null) => {
  try {
    return await geolocationOperation();
  } catch (error) {
    // Log the error for debugging
    console.warn('Geolocation operation failed:', error);
    
    // Check if it's a permission error
    if (error.message && error.message.includes('permission')) {
      console.warn('Location permission denied. User needs to enable location services.');
    }
    
    // Check if it's a timeout error
    if (error.message && error.message.includes('timeout')) {
      console.warn('Location request timed out. This might be due to poor GPS signal.');
    }
    
    // Check if it's a position unavailable error
    if (error.message && error.message.includes('unavailable')) {
      console.warn('Location information is currently unavailable.');
    }
    
    // Return fallback value if provided, otherwise re-throw with user-friendly message
    if (fallbackValue !== null) {
      return fallbackValue;
    }
    
    // Re-throw with a more user-friendly error message
    throw new Error('Unable to get your location. Please check your location permissions and try again.');
  }
};

// Safe getCurrentPosition with built-in error handling
export const getCurrentPositionSafe = (options = {}) => {
  return withGeolocationErrorHandling(
    () => getCurrentPosition(options),
    { coords: { latitude: 0, longitude: 0, accuracy: 0 } }
  );
}; 