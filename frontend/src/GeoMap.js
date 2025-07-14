import React from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const GeoMap = ({ centerLat, centerLng, radius, userLat, userLng }) => {
  const center = [centerLat, centerLng];
  const userPosition = userLat && userLng ? [userLat, userLng] : null;
  return (
    <div style={{ height: '300px', width: '100%', marginBottom: '1rem' }}>
      <MapContainer center={center} zoom={17} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Circle center={center} radius={radius} pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }} />
        {userPosition && (
          <Marker position={userPosition}>
            <Popup>You are here</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default GeoMap; 