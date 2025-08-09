# Employee Schedule Management

This folder contains React components for managing employee schedules, including monthly schedule entry, template management, and bulk operations.

## Components

### 1. ScheduleManagement.js
Main component that provides a calendar interface for managing monthly schedules.

**Features:**
- Monthly calendar view
- Click to add/edit schedules
- Visual indicators for day/night shifts
- Navigation between months
- Bulk schedule operations
- Template management

### 2. ScheduleEntryModal.js
Modal component for adding/editing individual schedules.

**Features:**
- Date and time input
- Night shift toggle
- Form validation
- Delete functionality
- Notes field

### 3. BulkScheduleModal.js
Modal component for creating multiple schedules at once.

**Features:**
- Template selection
- Date range selection
- Weekdays-only option
- AM/PM flip functionality
- Copy from previous month
- Preview functionality

### 4. TemplateManagement.js
Component for managing schedule templates.

**Features:**
- Create/edit/delete templates
- Personal, team, and company templates
- AM/PM flip functionality
- Template type management

### 5. scheduleAPI.js
API functions for communicating with the backend.

**Functions:**
- CRUD operations for schedules
- CRUD operations for templates
- Bulk operations
- Report generation

## Required Dependencies

Install the following dependencies for the calendar functionality:

```bash
npm install react-big-calendar moment react-toastify
```

### Dependencies Explanation:
- **react-big-calendar**: Calendar component for schedule display
- **moment**: Date/time manipulation library
- **react-toastify**: Toast notifications for user feedback

## Usage

### Basic Usage
```jsx
import { ScheduleManagement } from './Employee_Schedule';

function App() {
  return (
    <div>
      <ScheduleManagement />
    </div>
  );
}
```

### With Navigation Integration
```jsx
import { ScheduleManagement } from './Employee_Schedule';

// Add to your routing
<Route path="/schedule" element={<ScheduleManagement />} />
```

## Features

### Schedule Management
- **Monthly View**: Calendar interface showing all schedules for a month
- **Visual Indicators**: Different colors for day shifts (blue) and night shifts (red)
- **Click to Edit**: Click on any date to add or edit schedules
- **Navigation**: Navigate between months easily

### Template System
- **Personal Templates**: Employee's own templates
- **Team Templates**: Shared within the employee's team
- **Company Templates**: Available to all employees
- **AM/PM Flip**: Create opposite shift patterns easily

### Bulk Operations
- **Copy Last Month**: Copy entire previous month's schedule
- **Apply to Weekdays**: Apply templates to Monday-Friday only
- **AM/PM Flip**: Flip all times when copying
- **Date Range Selection**: Choose custom date ranges

### Validation
- **Time Validation**: Ensures time out is after time in for day shifts
- **Required Fields**: Validates all required schedule information
- **Night Shift Logic**: Handles overnight shifts correctly

## API Endpoints

The components expect the following backend API endpoints:

- `GET /api/schedules/` - Get employee schedules
- `POST /api/schedules/` - Create new schedule
- `PUT /api/schedules/{id}/` - Update schedule
- `DELETE /api/schedules/{id}/` - Delete schedule
- `GET /api/schedule-templates/` - Get templates
- `POST /api/schedule-templates/` - Create template
- `PUT /api/schedule-templates/{id}/` - Update template
- `DELETE /api/schedule-templates/{id}/` - Delete template
- `POST /api/schedules/apply-template/` - Apply template to date range
- `POST /api/schedules/copy-previous-month/` - Copy from previous month

## Styling

The components use Tailwind CSS for styling and are fully responsive. The calendar component includes custom styling for:
- Day/night shift indicators
- Hover effects
- Modal overlays
- Form validation states

## Error Handling

All components include comprehensive error handling:
- API error notifications via toast messages
- Form validation with visual feedback
- Loading states for async operations
- Graceful fallbacks for missing data

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive design
- Touch-friendly interface for mobile devices 