# Password_Reset Component

A React component that allows users to change their password with validation and security features.

## Features

- **Current Password Verification**: Users must enter their current password to proceed
- **New Password Input**: Secure input for the new password with show/hide toggle
- **Password Confirmation**: Confirmation field to prevent typos
- **Password Strength Validation**: Ensures new password is at least 8 characters long
- **Real-time Validation**: Immediate feedback for password matching and strength
- **Security Features**: Clears form fields on errors and after successful submission
- **Automatic Logout**: Automatically logs out the user after successful password change
- **Modal Integration**: Designed to work seamlessly within modal overlays
- **Mobile Responsive**: Optimized for both desktop and mobile devices

## Props

- `onSuccess` (function): Callback function called when the modal should be closed
- `onLogout` (function): Callback function called to trigger the logout flow after successful password change

## Usage

### Basic Usage
```jsx
import { Password_Reset } from './Employee_Information';

function MyComponent() {
  const handleSuccess = () => {
    // Close modal or handle success
  };

  const handleLogout = () => {
    // Handle logout logic
  };

  return (
    <Password_Reset 
      onSuccess={handleSuccess}
      onLogout={handleLogout}
    />
  );
}
```

### In Modal Context
```jsx
{showPasswordReset && (
  <div className="modal-overlay">
    <div className="modal-content">
      <Password_Reset 
        onSuccess={() => setShowPasswordReset(false)}
        onLogout={onLogout}
      />
    </div>
  </div>
)}
```

## API Integration

The component integrates with the `authAPI.changePassword()` method and expects the following API response format:

### Success Response
```json
{
  "message": "Password changed successfully"
}
```

### Error Responses
- **400 Bad Request**: Validation errors (current password incorrect, new password too short, etc.)
- **401 Unauthorized**: Session expired
- **500 Internal Server Error**: Server-side errors

## Security Features

1. **Form Field Clearing**: All password fields are cleared after submission (success or error)
2. **Current Password Verification**: Users must prove they know their current password
3. **Password Strength**: Enforces minimum 8-character requirement
4. **Automatic Logout**: Forces re-authentication after password change
5. **Input Validation**: Client-side validation before API calls

## Styling

The component uses Tailwind CSS classes and is designed to work within modal containers. Key styling features:

- Responsive design for mobile and desktop
- Consistent with the application's design system
- Accessible form controls with proper labels
- Visual feedback for loading states and errors
- Smooth transitions and hover effects

## Error Handling

The component provides comprehensive error handling:

- **Network Errors**: Connection issues and timeouts
- **Validation Errors**: Form validation and API validation errors
- **Server Errors**: Backend processing errors
- **User Feedback**: Clear error messages with actionable information

## Dependencies

- React (useState hook)
- Tailwind CSS for styling
- authAPI for password change functionality
- SVG icons for password visibility toggles

## Browser Compatibility

- Modern browsers with ES6+ support
- Mobile browsers (iOS Safari, Chrome Mobile)
- Desktop browsers (Chrome, Firefox, Safari, Edge)
