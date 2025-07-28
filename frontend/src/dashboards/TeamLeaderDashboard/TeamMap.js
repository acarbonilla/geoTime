import React, { useState, useEffect } from 'react';
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

const TeamMap = ({ teamLeaderLocation, teamMembers = [], refreshTrigger = 0 }) => {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Group team members by department
  const departmentGroups = {};
  teamMembers.forEach(member => {
    const deptId = member.department?.id || 'unknown';
    const deptName = member.department?.name || 'Unknown Department';
    
    if (!departmentGroups[deptId]) {
      departmentGroups[deptId] = {
        id: deptId,
        name: deptName,
        location: member.department?.location || teamLeaderLocation,
        members: []
      };
    }
    
    departmentGroups[deptId].members.push(member);
  });

  const departmentData = Object.values(departmentGroups);
  
  // Update last refresh time
  useEffect(() => {
    setLastRefresh(new Date());
  }, [refreshTrigger]);

  // If no team leader location, show a message
  if (!teamLeaderLocation || !teamLeaderLocation.latitude || !teamLeaderLocation.longitude) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 relative z-0">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Team Locations</h2>
        <div className="h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-gray-600 text-center">
            No location data available.<br />
            Please contact your administrator to set up your department location.
          </div>
        </div>
      </div>
    );
  }

  // Validate and parse coordinates
  const parseCoordinate = (coord) => {
    const parsed = parseFloat(coord);
    return !isNaN(parsed) && parsed !== 0 ? parsed : null;
  };

  const lat = parseCoordinate(teamLeaderLocation.latitude);
  const lng = parseCoordinate(teamLeaderLocation.longitude);

  // Check if coordinates are valid
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 relative z-0">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Team Locations</h2>
        <div className="h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-gray-600 text-center">
            Invalid location coordinates.<br />
            Please contact your administrator to fix the location data.
          </div>
        </div>
      </div>
    );
  }

  const center = [lat, lng];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 relative z-0">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Team Locations</h2>
        <div className="text-xs text-gray-500">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-4 text-sm text-gray-700">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span>Team Leader (TL)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>Department Location</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          <strong>Department Markers:</strong> Show department abbreviation and member count
        </div>
      </div>

      {/* Map */}
      <div className="h-96 relative">
        <MapContainer 
          key={`${lat}-${lng}`}
          center={center} 
          zoom={15} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          className="rounded-lg"
          zoomControl={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          boxZoom={true}
          keyboard={true}
          dragging={true}
          animate={true}
          easeLinearity={0.35}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          
          {/* Team Leader Location */}
          <Marker 
            position={center}
            icon={L.divIcon({
              className: 'team-leader-marker',
              html: `<div style="
                width: 25px;
                height: 25px;
                background-color: #3B82F6;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 12px;
              ">TL</div>`,
              iconSize: [25, 25],
              iconAnchor: [12.5, 12.5]
            })}
          >
            <Popup>
              <div className="text-center">
                <div className="font-bold text-blue-600">Team Leader</div>
                <div className="text-sm text-gray-600">{teamLeaderLocation.name}</div>
                <div className="text-xs text-gray-500">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Department Markers */}
          {departmentData.map((department) => {
            
            // Validate department coordinates
            const deptLat = parseCoordinate(department.location?.latitude);
            const deptLng = parseCoordinate(department.location?.longitude);
            
            // Use team leader location if department coordinates are invalid
            let finalLat = deptLat;
            let finalLng = deptLng;
            let locationSource = 'department';
            
            if (deptLat === null || deptLng === null) {
              finalLat = lat;
              finalLng = lng;
              locationSource = 'team_leader_fallback';
            }
            
            const departmentLocation = [finalLat, finalLng];
            
            // Create department abbreviation
            let deptAbbr = '';
            if (department.name.toLowerCase().includes('danao')) {
              deptAbbr = 'TD';
            } else if (department.name.toLowerCase().includes('c2')) {
              deptAbbr = 'TC';
            } else {
              // Create abbreviation from first letters of words
              deptAbbr = department.name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').substring(0, 2);
            }
            
            return (
              <Marker
                key={department.id}
                position={departmentLocation}
                icon={L.divIcon({
                  className: 'department-marker',
                  html: `<div style="
                    width: 30px;
                    height: 30px;
                    background-color: #10B981;
                    border: 2px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 10px;
                    line-height: 1;
                  ">
                    <div>${deptAbbr}</div>
                    <div style="font-size: 8px;">${department.members.length}</div>
                  </div>`,
                  iconSize: [30, 30],
                  iconAnchor: [15, 15]
                })}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-bold text-gray-800">{department.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      <strong>Total Members:</strong> {department.members.length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <strong>Location:</strong> {department.location?.name || 'Using Team Leader Location'}
                    </div>
                    {locationSource === 'team_leader_fallback' && (
                      <div className="text-xs text-red-500">
                        <strong>Note:</strong> Using team leader location
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

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

      {/* Summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-700">
          <strong>Departments:</strong> {departmentData.length} total
        </div>
        <div className="text-xs text-gray-500 mt-1">
          <strong>Department Details:</strong>
        </div>
        {departmentData.map((dept, index) => (
          <div key={dept.id} className="text-xs text-gray-600 ml-2">
            • {dept.name}: {dept.members.length} members
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamMap; 