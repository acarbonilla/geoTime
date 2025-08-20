# Mobile Dashboard

A responsive, mobile-optimized dashboard component for the GeoTime application, designed specifically for mobile devices and small screens.

## Features

### Core Functionality
- **Real-time Clock In/Out**: Quick access to time tracking with geolocation validation
- **Live Status Display**: Shows current work status and session information
- **Interactive Map**: Leaflet-based map showing current location and work zones
- **Today's Summary**: Overview of current day's time entries and total hours
- **Schedule Information**: Display of today's work schedule with validation

### Mobile-Specific Features
- **Touch-Optimized Interface**: Large touch targets and mobile-friendly controls
- **Responsive Design**: Adapts to different mobile screen sizes
- **Swipe Gestures**: Intuitive navigation and interaction patterns
- **Mobile Menu**: Collapsible side menu for navigation and settings
- **Password Reset**: Secure password change functionality with automatic logout

### Password Reset Feature
- **Secure Password Change**: Users can change their password from the mobile dashboard
- **Current Password Verification**: Requires current password for security
- **Password Strength Validation**: Enforces minimum 8-character requirement
- **Automatic Logout**: After successful password change, user is automatically logged out
- **Modal Integration**: Seamlessly integrated into the mobile interface

## Mobile Menu Options

The mobile dashboard includes a comprehensive menu accessible via the hamburger button:

- **🔐 Change Password**: Opens password reset modal
- **🚪 Logout**: Logs out the user and redirects to login
- **📊 Dashboard**: Returns to main dashboard view
- **🗺️ Map View**: Toggles map visibility
- **📋 Status Details**: Shows/hides detailed status information

## Password Reset Flow

1. **Access**: User taps "🔐 Change Password" in mobile menu
2. **Modal Display**: Password reset form appears in a mobile-optimized modal
3. **Form Completion**: User enters current password, new password, and confirmation
4. **Validation**: Client-side validation ensures password strength and matching
5. **API Call**: Backend validates current password and updates to new password
6. **Success Feedback**: User sees "Password changed successfully! Logging you out..."
7. **Automatic Logout**: After 1.5 seconds, user is automatically logged out
8. **Redirect**: User is redirected to login page to authenticate with new password

## Technical Implementation

### State Management
- Uses React hooks for local state management
- React Query for server state and caching
- Optimistic updates for better user experience

### API Integration
- Integrates with time tracking APIs
- Geolocation services for location validation
- Schedule management endpoints
- Password change API with security validation

### Mobile Optimization
- Touch-friendly button sizes (minimum 44px height)
- Responsive breakpoints for different screen sizes
- Mobile-specific CSS for scrollability and modal behavior
- Optimized for mobile browsers and touch devices

### Security Features
- Current password verification before allowing changes
- Automatic logout after password change
- Form field clearing for security
- Comprehensive error handling and user feedback

## Responsive Breakpoints

The dashboard automatically adapts to different screen sizes:

- **Mobile**: < 768px - Full mobile layout with touch-optimized controls
- **Tablet**: 768px - 1024px - Hybrid layout with some desktop features
- **Desktop**: > 1024px - Full desktop layout (handled by parent components)

## CSS Classes

### Mobile-Specific Styles
- `.mobile-touch-target`: Ensures minimum 44px touch targets
- `.mobile-modal`: Mobile-optimized modal scrolling and behavior
- `.mobile-responsive`: Responsive design utilities

### Modal Styling
- `.mobile-modal`: Controls modal height and scrolling
- Custom scrollbar styling for mobile devices
- Touch-friendly close buttons and interactions

## Dependencies

- **React**: Core component framework
- **React Query**: Server state management
- **Leaflet**: Map functionality
- **React Icons**: Icon library for UI elements
- **Tailwind CSS**: Utility-first CSS framework
- **Custom CSS**: Mobile-specific styling and animations

## Browser Support

- **iOS Safari**: Full support with touch optimizations
- **Chrome Mobile**: Complete functionality
- **Firefox Mobile**: Full feature support
- **Samsung Internet**: Compatible with mobile optimizations
- **Desktop Browsers**: Responsive fallback for larger screens

## Performance Considerations

- **Lazy Loading**: Map components load only when needed
- **Query Caching**: React Query provides efficient data caching
- **Optimized Renders**: Minimal re-renders through proper state management
- **Mobile-First**: Optimized for mobile performance and battery life

## Accessibility

- **Touch Targets**: Minimum 44px height for all interactive elements
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Keyboard Navigation**: Full keyboard accessibility support
- **High Contrast**: Accessible color schemes and contrast ratios
