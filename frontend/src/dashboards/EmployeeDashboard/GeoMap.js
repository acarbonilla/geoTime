import React from 'react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const GeoMap = ({ centerLat, centerLng, radius, userLat, userLng }) => (
  <div style={{ height: '400px', width: '100%' }}>
    <MapContainer center={[centerLat, centerLng]} zoom={15} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {/* Department geofence */}
      {radius && (
        <Circle
          center={[centerLat, centerLng]}
          radius={radius}
          pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
        />
      )}
      {/* User location marker */}
      {userLat && userLng && (
        <Marker position={[userLat, userLng]} />
      )}
    </MapContainer>
  </div>
);

export default GeoMap; 