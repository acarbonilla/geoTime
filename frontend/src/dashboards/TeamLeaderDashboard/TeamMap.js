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
  const [mapReady, setMapReady] = useState(false);

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

  // Set map as ready after a short delay to ensure proper initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      setMapReady(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // If no team leader location, show a message
  if (!teamLeaderLocation || !teamLeaderLocation.latitude || !teamLeaderLocation.longitude) {
    return (
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-6 sm:p-8 relative z-0 animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-600 mb-2">
            Team Locations
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-pink-500 mx-auto rounded-full shadow-lg"></div>
        </div>
        
        <div className="h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="text-gray-600 text-lg font-medium mb-2">No location data available</div>
            <div className="text-gray-500 text-sm">
              Please contact your administrator to set up your department location.
            </div>
            <button className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
              Contact Admin
            </button>
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
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-6 sm:p-8 relative z-0 animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-600 mb-2">
            Team Locations
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-yellow-500 to-orange-500 mx-auto rounded-full shadow-lg"></div>
        </div>
        
        <div className="h-80 bg-gradient-to-br from-yellow-50 to-orange-100 rounded-xl border-2 border-dashed border-yellow-300 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="text-yellow-700 text-lg font-medium mb-2">Invalid location coordinates</div>
            <div className="text-yellow-600 text-sm">
              Please contact your administrator to fix the location data.
            </div>
            <button className="mt-4 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
              Contact Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  const center = [lat, lng];

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-6 sm:p-8 relative z-0 animate-slide-up animation-delay-200">
      {/* Enhanced Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-600 mb-2">
          Team Locations
        </h2>
        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto rounded-full shadow-lg"></div>
      </div>

      {/* Enhanced Status Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50 shadow-sm">
        <div className="flex items-center space-x-4 mb-2 sm:mb-0">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mr-2 shadow-sm"></div>
            <span className="text-sm font-medium text-gray-700">Team Leader (TL)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full mr-2 shadow-sm"></div>
            <span className="text-sm font-medium text-gray-700">Department Location</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 bg-white/70 px-3 py-1 rounded-full border border-gray-200">
          <span className="font-medium">Last updated:</span> {lastRefresh.toLocaleTimeString()}
        </div>
      </div>

      {/* Enhanced Legend */}
      <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200/50 shadow-sm">
        <div className="text-sm text-gray-700 mb-3">
          <strong className="text-gray-800">Department Markers:</strong> Show department abbreviation and member count
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center p-2 bg-white/70 rounded-lg border border-gray-200/50">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mr-3 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              TL
            </div>
            <span className="text-sm text-gray-700">Team Leader Location</span>
          </div>
          <div className="flex items-center p-2 bg-white/70 rounded-lg border border-gray-200/50">
            <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full mr-3 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              D
            </div>
            <span className="text-sm text-gray-700">Department with Members</span>
          </div>
        </div>
      </div>

      {/* Enhanced Map Container */}
      <div className="h-[500px] relative rounded-xl overflow-hidden border-2 border-gray-200/50 shadow-lg">
        {!mapReady && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
              <div className="text-blue-600 font-medium">Loading map...</div>
            </div>
          </div>
        )}
        
        <MapContainer 
          key={`${lat}-${lng}-${refreshTrigger}`}
          center={center} 
          zoom={15} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          className="rounded-xl"
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
          
          {/* Enhanced Team Leader Location Marker */}
          <Marker 
            position={center}
            icon={L.divIcon({
              className: 'team-leader-marker',
              html: `<div style="
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #3B82F6, #1D4ED8);
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
              ">TL</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })}
          >
            <Popup className="custom-popup">
              <div className="text-center p-2">
                <div className="font-bold text-blue-600 text-lg mb-1">Team Leader</div>
                <div className="text-sm text-gray-700 mb-2">{teamLeaderLocation.name || 'Main Office'}</div>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Enhanced Department Markers */}
          {departmentData.map((department, index) => {
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
                    width: 36px;
                    height: 36px;
                    background: linear-gradient(135deg, #10B981, #059669);
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 11px;
                    line-height: 1;
                    cursor: pointer;
                    transition: all 0.3s ease;
                  ">
                    <div>${deptAbbr}</div>
                    <div style="font-size: 9px; opacity: 0.9;">${department.members.length}</div>
                  </div>`,
                  iconSize: [36, 36],
                  iconAnchor: [18, 18]
                })}
              >
                <Popup className="custom-popup">
                  <div className="text-center p-3">
                    <div className="font-bold text-gray-800 text-lg mb-2">{department.name}</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-sm text-gray-600">Total Members:</span>
                        <span className="font-bold text-emerald-600">{department.members.length}</span>
                      </div>
                      <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-sm text-gray-600">Location:</span>
                        <span className="text-sm text-gray-700">{department.location?.name || 'Using Team Leader Location'}</span>
                      </div>
                    </div>
                    {locationSource === 'team_leader_fallback' && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-xs text-red-600 font-medium">
                          ⚠️ Using team leader location
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Enhanced Geofence Circle */}
          {teamLeaderLocation.geofence_radius && (
            <Circle
              center={center}
              radius={teamLeaderLocation.geofence_radius}
              pathOptions={{ 
                color: '#3B82F6', 
                fillColor: '#3B82F6', 
                fillOpacity: 0.08,
                weight: 3,
                dashArray: '5, 5'
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Enhanced Summary Section */}
      <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200/50 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/70 p-3 rounded-lg border border-gray-200/50">
            <div className="text-sm font-semibold text-gray-800 mb-2">Department Summary</div>
            <div className="text-2xl font-bold text-blue-600">{departmentData.length}</div>
            <div className="text-xs text-gray-500">Total Departments</div>
          </div>
          <div className="bg-white/70 p-3 rounded-lg border border-gray-200/50">
            <div className="text-sm font-semibold text-gray-800 mb-2">Team Members</div>
            <div className="text-2xl font-bold text-emerald-600">{teamMembers.length}</div>
            <div className="text-xs text-gray-500">Total Members</div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="text-sm font-semibold text-gray-800 mb-3">Department Details:</div>
          <div className="space-y-2">
            {departmentData.map((dept, index) => (
              <div key={dept.id} className="flex justify-between items-center p-2 bg-white/70 rounded-lg border border-gray-200/50 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                <span className="text-sm text-emerald-600 font-bold">{dept.members.length} members</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom CSS for popups */}
      <style jsx>{`
        .custom-popup .leaflet-popup-content-wrapper {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(0, 0, 0, 0.1);
        }
        .custom-popup .leaflet-popup-tip {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default TeamMap; 