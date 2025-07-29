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
            errorMessage = 'Location permission denied. Please enable location services.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = error.message || 'An unknown error occurred.';
        }
        
        reject(new Error(errorMessage));
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
    throw new Error('Geolocation is not supported by this browser');
  }

  return navigator.geolocation.watchPosition(
    callback,
    (error) => {
      console.error('Geolocation watch error:', error);
    },
    { ...defaultOptions, ...options }
  );
};

export const clearWatch = (watchId) => {
  if (navigator.geolocation && watchId) {
    navigator.geolocation.clearWatch(watchId);
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