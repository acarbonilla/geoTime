import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const GeoMap = ({ centerLat, centerLng, radius, userLat, userLng }) => {
  const [distance, setDistance] = useState(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState(null);

  // Calculate distance when coordinates change
  useEffect(() => {
    if (centerLat && centerLng && userLat && userLng) {
      // Convert coordinates to numbers to ensure they work with calculations
      const centerLatNum = parseFloat(centerLat);
      const centerLngNum = parseFloat(centerLng);
      const userLatNum = parseFloat(userLat);
      const userLngNum = parseFloat(userLng);
      
      if (!isNaN(centerLatNum) && !isNaN(centerLngNum) && !isNaN(userLatNum) && !isNaN(userLngNum)) {
        const calculatedDistance = calculateDistance(centerLatNum, centerLngNum, userLatNum, userLngNum);
        setDistance(calculatedDistance);
        
        // Parse radius and validate - handle different radius formats
        let radiusNum = null;
        if (typeof radius === 'number') {
          radiusNum = radius;
        } else if (typeof radius === 'string') {
          radiusNum = parseFloat(radius);
        } else if (radius !== null && radius !== undefined) {
          radiusNum = parseFloat(radius);
        }
        
        if (!isNaN(radiusNum) && radiusNum > 0) {
          // Add a small tolerance for very large radius values (e.g., if radius > 50km, add 1% tolerance)
          let effectiveRadius = radiusNum;
          if (radiusNum > 50000) { // 50km
            effectiveRadius = radiusNum * 1.01; // Add 1% tolerance
          }
          
          const isWithin = calculatedDistance <= effectiveRadius;
          setIsWithinGeofence(isWithin);
        } else if (radiusNum === 0 || radiusNum === null || radiusNum === undefined) {
          // If radius is 0, null, or undefined, allow transactions (fallback)
          setIsWithinGeofence(true);
        } else if (radiusNum < 0) {
          // If radius is negative, allow transactions (fallback)
          setIsWithinGeofence(true);
        } else {
          // If radius is NaN or invalid, allow transactions (fallback)
          setIsWithinGeofence(true);
        }
      }
    }
  }, [centerLat, centerLng, userLat, userLng, radius]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Validate inputs
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      return null;
    }
    
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in meters
    
    return distance;
  };

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${meters.toFixed(1)}m`;
    } else {
      return `${(meters / 1000).toFixed(2)}km`;
    }
  };

  const formatRadius = (meters) => {
    if (meters < 1000) {
      return `${meters}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  };

  // Validate radius
  const radiusNum = parseFloat(radius);
  const isValidRadius = !isNaN(radiusNum) && radiusNum > 0;

  return (
    <div style={{ height: '400px', width: '100%', position: 'relative', zIndex: 1 }}>
      {/* Location Status Display */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Location Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Assigned Location:</span>
            <div className="font-mono text-xs">
              {centerLat ? parseFloat(centerLat).toFixed(6) : 'N/A'}, {centerLng ? parseFloat(centerLng).toFixed(6) : 'N/A'}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Your Current Location:</span>
            <div className="font-mono text-xs">
              {userLat ? parseFloat(userLat).toFixed(6) : 'N/A'}, {userLng ? parseFloat(userLng).toFixed(6) : 'N/A'}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Distance to Assigned Location:</span>
            <div className="font-semibold text-blue-600">
              {distance ? formatDistance(distance) : 'Calculating...'}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Geofence Radius:</span>
            <div className="font-semibold text-gray-600">
              {isValidRadius ? formatRadius(radiusNum) : 'Not configured'}
            </div>
          </div>
        </div>
        

        
        {/* Transaction Status */}
        {distance !== null && (
          <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
            isWithinGeofence 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Transaction Status:</span>
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                isWithinGeofence 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}>
                {isWithinGeofence ? 'ALLOWED' : 'BLOCKED'}
              </span>
            </div>
            <div className="mt-1 text-xs">
              {isWithinGeofence 
                ? `✅ You are within the geofence boundary. You can perform transactions.`
                : isValidRadius 
                  ? `❌ You are outside the geofence boundary. Move within ${formatRadius(radiusNum)} to enable transactions.`
                  : `❌ Geofence radius not configured. Please contact administrator.`
              }
            </div>
          </div>
        )}
      </div>

      <MapContainer 
        center={[parseFloat(centerLat || userLat), parseFloat(centerLng || userLng)]} 
        zoom={15} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        
        {/* Geofence boundary circle */}
        {centerLat && centerLng && isValidRadius && (
          <Circle
            center={[parseFloat(centerLat), parseFloat(centerLng)]}
            radius={radiusNum}
            pathOptions={{ 
              color: isWithinGeofence ? 'green' : 'red', 
              fillColor: isWithinGeofence ? 'green' : 'red', 
              fillOpacity: 0.1,
              weight: 2
            }}
          >
            <Popup>
              <div className="text-center">
                <div className="font-bold text-gray-800">Geofence Boundary</div>
                <div className="text-sm text-gray-600">Radius: {formatRadius(radiusNum)}</div>
                {distance !== null && (
                  <div className="text-sm font-medium text-blue-600">
                    Your distance: {formatDistance(distance)}
                  </div>
                )}
                <div className={`text-sm font-medium mt-1 ${
                  isWithinGeofence ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isWithinGeofence ? '✅ Within boundary' : '❌ Outside boundary'}
                </div>
              </div>
            </Popup>
          </Circle>
        )}
        
        {/* User current location marker */}
        {userLat && userLng && (
          <Marker position={[parseFloat(userLat), parseFloat(userLng)]}>
            <Popup>
              <div className="text-center">
                <div className="font-bold text-purple-600">Your Current Location</div>
                <div className="text-sm text-gray-600">
                  {userLat ? parseFloat(userLat).toFixed(6) : 'N/A'}, {userLng ? parseFloat(userLng).toFixed(6) : 'N/A'}
                </div>
                {distance !== null && (
                  <div className="text-sm font-medium text-blue-600">
                    Distance: {formatDistance(distance)}
                  </div>
                )}
                <div className={`text-sm font-medium mt-1 ${
                  isWithinGeofence ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isWithinGeofence ? '✅ Can transact' : '❌ Cannot transact'}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default GeoMap; 