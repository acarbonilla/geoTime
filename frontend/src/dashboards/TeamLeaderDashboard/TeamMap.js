import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const TeamMap = ({ teamLeaderLocation }) => {
  // If no team leader location, show a message
  if (!teamLeaderLocation || !teamLeaderLocation.latitude || !teamLeaderLocation.longitude) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 relative z-0">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Team Leader Location</h2>
        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-gray-500 text-center">
            No location data available.<br />
            Please contact your administrator to set up your department location.
          </div>
        </div>
      </div>
    );
  }

  const center = [parseFloat(teamLeaderLocation.latitude), parseFloat(teamLeaderLocation.longitude)];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 relative z-0">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Team Leader Location</h2>
      
      <div className="mb-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Team Leader Location</span>
        </div>
      </div>

      <div style={{ height: '400px', width: '100%', border: '1px solid #e5e7eb', position: 'relative', zIndex: 0 }}>
        <MapContainer 
          center={center} 
          zoom={15} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          className="rounded-lg"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          
          {/* Team Leader Location */}
            <Marker 
            position={center}
              icon={L.divIcon({
                className: 'custom-marker',
                html: `<div style="
                  width: 24px;
                  height: 24px;
                  background-color: #3B82F6;
                  border: 3px solid white;
                  border-radius: 50%;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: bold;
                  font-size: 12px;
                ">TL</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              })}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-bold text-blue-600">Team Leader</div>
                  <div className="text-sm text-gray-600">{teamLeaderLocation.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {teamLeaderLocation.latitude}, {teamLeaderLocation.longitude}
                </div>
                  </div>
                </Popup>
              </Marker>

          {/* Geofence Circle (if available) */}
          {teamLeaderLocation.geofence_radius && (
              <Circle
              center={center}
              radius={teamLeaderLocation.geofence_radius}
                pathOptions={{ 
                  color: '#3B82F6', 
                  fillColor: '#3B82F6', 
                  fillOpacity: 0.1,
                  weight: 2
                }}
              />
          )}
        </MapContainer>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <div className="grid grid-cols-1 gap-2">
          <div>
            <strong>Location:</strong> {teamLeaderLocation.name}
          </div>
          <div>
            <strong>Coordinates:</strong> {teamLeaderLocation.latitude}, {teamLeaderLocation.longitude}
          </div>
          {teamLeaderLocation.timezone_name && (
            <div>
              <strong>Timezone:</strong> {teamLeaderLocation.timezone_name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamMap; 