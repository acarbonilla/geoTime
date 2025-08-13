# Time In/Out System - Developer Implementation Guide

## Overview
This guide provides technical details for developers working with the Time In/Out system, including code structure, implementation patterns, and extension points.

## 🏗️ System Architecture

### Component Structure
```
Time In/Out System
├── Frontend (React)
│   ├── EmployeeDashboard.js (Wide Screen)
│   └── MobileDashboard.js (Mobile)
├── Backend (Django)
│   ├── TimeInOutAPIView (API Endpoint)
│   ├── EmployeeSchedule Model
│   ├── TimeEntry Model
│   └── Validation Policies
└── Database
    ├── Schedule Constraints
    └── Time Entry Records
```

### Data Flow
1. **User Action** → Frontend validation
2. **API Request** → Backend validation
3. **Schedule Check** → Mandatory validation
4. **Time Validation** → Window enforcement
5. **Geolocation** → Location verification
6. **Time Entry** → Database creation

## 🔧 Frontend Implementation

### Core Validation Function
```javascript
// Both dashboards use identical validation logic
const validateSchedule = useCallback(() => {
  // 1. Check for schedule loading errors
  if (scheduleQueryError) {
    setScheduleError('Failed to load schedule. Please contact your supervisor.');
    return false;
  }
  
  // 2. Check if schedule exists
  if (!todaySchedule || Object.keys(todaySchedule).length === 0) {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    setScheduleError(`No work schedule found for today (${today}). Please contact your supervisor to set up your schedule before clocking in/out.`);
    return false;
  }
  
  // 3. Check schedule completeness
  if (!todaySchedule.scheduled_time_in || !todaySchedule.scheduled_time_out) {
    setScheduleError('Your schedule is incomplete. Please contact your supervisor to complete your schedule before clocking in/out.');
    return false;
  }
  
  // 4. Time constraint validation (if enabled)
  if (validateTimeConstraints) {
    // Early clock-in validation (1 hour limit)
    // Late clock-in validation (2 hours after end time)
    // Overnight shift handling
  }
  
  setScheduleError(null);
  return true;
}, [todaySchedule, scheduleQueryError, validateTimeConstraints]);
```

### Time Constraint Validation
```javascript
// Time constraint validation logic
if (validateTimeConstraints) {
  const now = new Date();
  const currentTime = now.getTime();
  
  // Parse scheduled time in
  const scheduledTimeStr = todaySchedule.scheduled_time_in;
  const [hours, minutes] = scheduledTimeStr.split(':').map(Number);
  
  // Create scheduled time for today
  const scheduledTime = new Date(now);
  scheduledTime.setHours(hours, minutes, 0, 0);
  const scheduledTimeMs = scheduledTime.getTime();
  
  // Calculate time difference in hours
  const timeDiffHours = Math.abs(currentTime - scheduledTimeMs) / (1000 * 60 * 60);
  
  // Early clock-in restriction (1 hour limit)
  if (currentTime < scheduledTimeMs && timeDiffHours > 1) {
    const earlyHours = timeDiffHours.toFixed(1);
    const errorMsg = `You cannot clock in yet. Your scheduled time is ${scheduledTimeStr}, and you can only clock in up to 1 hour early. Current time: ${now.toLocaleTimeString()}`;
    setScheduleError(errorMsg);
    return false;
  }
  
  // Late clock-in restriction (2 hours after end time)
  const scheduledEndTimeStr = todaySchedule.scheduled_time_out;
  const [endHours, endMinutes] = scheduledEndTimeStr.split(':').map(Number);
  
  const scheduledEndTime = new Date(now);
  scheduledEndTime.setHours(endHours, endMinutes, 0, 0);
  const scheduledEndTimeMs = scheduledEndTime.getTime();
  
  // Handle overnight shifts
  if (endHours < hours) {
    scheduledEndTime.setDate(scheduledEndTime.getDate() + 1);
  }
  
  // If more than 2 hours after scheduled end time, prevent clock in
  const timeAfterEndHours = (currentTime - scheduledEndTimeMs) / (1000 * 60 * 60);
  if (currentTime > scheduledEndTimeMs && timeAfterEndHours > 2) {
    const errorMsg = `Cannot clock in after your shift has ended. Your scheduled time was ${scheduledTimeStr} - ${scheduledEndTimeStr}. Latest allowed clock-in: ${new Date(scheduledEndTimeMs + (2 * 60 * 60 * 1000)).toLocaleTimeString()}`;
    setScheduleError(errorMsg);
    return false;
  }
}
```

### Time Operation Handlers
```javascript
const handleTimeIn = async () => {
  if (isTimeInSubmitting.current) return;
  
  // Validate schedule before proceeding
  if (!validateSchedule()) {
    return;
  }
  
  isTimeInSubmitting.current = true;
  
  try {
    setIsClockingIn(true);
    setGeolocationStatus('requesting');
    
    const position = await getCurrentPosition();
    setGeolocationStatus('success');
    setCurrentCoords({ 
      latitude: position.coords.latitude, 
      longitude: position.coords.longitude 
    });
    
    const clockInData = {
      employee_id: employee.id,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      location_id: employee.department?.location?.id || null,
      notes: `Mobile clock-in (${employee.role})`
    };
    
    await clockInMutation.mutateAsync(clockInData);
    
  } catch (error) {
    setGeolocationStatus('error');
    
    // Show detailed error message to user
    let errorMessage = 'Clock in failed';
    if (error.response?.data?.error) {
      errorMessage += `: ${error.response.data.error}`;
      if (error.response.data.details) {
        errorMessage += `\n\nDetails: ${error.response.data.details}`;
      }
    }
    
    alert(errorMessage);
  } finally {
    setIsClockingIn(false);
    isTimeInSubmitting.current = false;
  }
};
```

## 🐍 Backend Implementation

### API View Structure
```python
class TimeInOutAPIView(APIView):
    """
    Handles time in/out operations with comprehensive validation.
    """
    
    def post(self, request, action):
        # 1. Validate action type
        if action not in ['time-in', 'time-out']:
            return Response({'error': 'Invalid action'}, status=400)
        
        # 2. Get employee and user
        employee = get_object_or_404(Employee, user=request.user)
        user = request.user
        
        # 3. MANDATORY SCHEDULE VALIDATION
        today = date.today()
        schedule = EmployeeSchedule.objects.filter(employee=employee, date=today).first()
        
        if not schedule:
            return Response({
                'error': 'Schedule required',
                'details': 'No schedule found for today. Please contact your supervisor to set up your schedule before clocking in/out.',
                'date': today.isoformat()
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not schedule.scheduled_time_in or not schedule.scheduled_time_out:
            return Response({
                'error': 'Incomplete schedule',
                'details': 'Your schedule for today is incomplete. Please contact your supervisor to complete your schedule before clocking in/out.',
                'date': today.isoformat()
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 4. Time window validation
        # 5. Geolocation validation
        # 6. Time entry creation
```

### Schedule Validation Implementation
```python
def _validate_schedule_compliance(self, employee, schedule, action, current_time):
    """
    Validate schedule compliance for time operations.
    
    Args:
        employee: Employee instance
        schedule: EmployeeSchedule instance
        action: 'time-in' or 'time-out'
        current_time: Current datetime
        
    Returns:
        tuple: (is_valid, error_response)
    """
    today = schedule.date
    
    if action == 'time-in':
        # Early clock-in restriction
        restriction_hours = float(employee.early_login_restriction_hours or 1.0)
        earliest_allowed_time = datetime.combine(today, schedule.scheduled_time_in) - timedelta(hours=restriction_hours)
        
        if current_time < earliest_allowed_time:
            error_response = {
                'error': f'Cannot clock in more than {restriction_hours} hour{"s" if restriction_hours != 1 else ""} before scheduled time. Earliest allowed time: {earliest_allowed_time.strftime("%I:%M %p")}',
                'scheduled_time': schedule.scheduled_time_in.strftime("%I:%M %p"),
                'earliest_allowed': earliest_allowed_time.strftime("%I:%M %p")
            }
            return False, error_response
        
        # Late clock-in restriction (2 hours after end time)
        scheduled_end_time = datetime.combine(today, schedule.scheduled_time_out)
        if schedule.scheduled_time_out < schedule.scheduled_time_in:
            scheduled_end_time += timedelta(days=1)  # Handle overnight shifts
        
        latest_allowed_time = scheduled_end_time + timedelta(hours=2)
        
        if current_time > latest_allowed_time:
            error_response = {
                'error': f'Cannot clock in after your shift has ended. Your scheduled time was {schedule.scheduled_time_in.strftime("%I:%M %p")} - {schedule.scheduled_time_out.strftime("%I:%M %p")}. Latest allowed clock-in: {latest_allowed_time.strftime("%I:%M %p")}',
                'scheduled_time': f"{schedule.scheduled_time_in.strftime('%I:%M %p')} - {schedule.scheduled_time_out.strftime('%I:%M %p')}",
                'latest_allowed': latest_allowed_time.strftime("%I:%M %p")
            }
            return False, error_response
    
    elif action == 'time-out':
        # Late clock-out restriction (4 hours after end time)
        scheduled_end_time = datetime.combine(today, schedule.scheduled_time_out)
        if schedule.scheduled_time_out < schedule.scheduled_time_in:
            scheduled_end_time += timedelta(days=1)  # Handle overnight shifts
        
        latest_allowed_time = scheduled_end_time + timedelta(hours=4)
        
        if current_time > latest_allowed_time:
            error_response = {
                'error': f'Cannot clock out after your shift has ended. Your scheduled time was {schedule.scheduled_time_in.strftime("%I:%M %p")} - {schedule.scheduled_time_out.strftime("%I:%M %p")}. Latest allowed clock-out: {latest_allowed_time.strftime("%I:%M %p")}',
                'scheduled_time': f"{schedule.scheduled_time_in.strftime('%I:%M %p')} - {schedule.scheduled_time_out.strftime('%I:%M %p')}",
                'latest_allowed': latest_allowed_time.strftime("%I:%M %p")
            }
            return False, error_response
    
    return True, None
```

### Overnight Shift Handling
```python
def _handle_overnight_shift(self, scheduled_time_in, scheduled_time_out, date):
    """
    Handle overnight shifts that cross midnight.
    
    Args:
        scheduled_time_in: Scheduled start time
        scheduled_time_out: Scheduled end time
        date: Schedule date
        
    Returns:
        tuple: (start_datetime, end_datetime)
    """
    start_datetime = datetime.combine(date, scheduled_time_in)
    end_datetime = datetime.combine(date, scheduled_time_out)
    
    # If end time is before start time, it's an overnight shift
    if scheduled_time_out < scheduled_time_in:
        end_datetime += timedelta(days=1)
    
    return start_datetime, end_datetime
```

## 🗄️ Database Models

### EmployeeSchedule Model
```python
class EmployeeSchedule(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    date = models.DateField()
    scheduled_time_in = models.TimeField()
    scheduled_time_out = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['employee', 'date']
        indexes = [
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['date']),
        ]
    
    def __str__(self):
        return f"{self.employee} - {self.date} ({self.scheduled_time_in} - {self.scheduled_time_out})"
    
    def is_overnight_shift(self):
        """Check if this is an overnight shift."""
        return self.scheduled_time_out < self.scheduled_time_in
    
    def get_shift_duration_hours(self):
        """Get shift duration in hours, handling overnight shifts."""
        start_dt = datetime.combine(self.date, self.scheduled_time_in)
        end_dt = datetime.combine(self.date, self.scheduled_time_out)
        
        if self.is_overnight_shift():
            end_dt += timedelta(days=1)
        
        duration = end_dt - start_dt
        return duration.total_seconds() / 3600
```

### TimeEntry Model
```python
class TimeEntry(models.Model):
    ENTRY_TYPES = [
        ('time_in', 'Time In'),
        ('time_out', 'Time Out'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    entry_type = models.CharField(max_length=10, choices=ENTRY_TYPES)
    timestamp = models.DateTimeField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    accuracy = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['employee', 'timestamp']),
            models.Index(fields=['entry_type', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.employee} - {self.entry_type} at {self.timestamp}"
```

## 🔧 Configuration and Customization

### Environment Variables
```bash
# Time validation settings
TIME_VALIDATION_ENABLED=true
EARLY_LOGIN_RESTRICTION_HOURS=1.0
CLOCK_IN_FLEXIBILITY_HOURS=2
CLOCK_OUT_FLEXIBILITY_HOURS=4

# Geolocation settings
GEOLOCATION_REQUIRED=true
MAX_GEOLOCATION_ACCURACY=100
```

### Custom Validation Rules
```python
class CustomTimeValidationPolicy(BasePolicy):
    """Custom time validation policy for specific business rules."""
    
    def __init__(self, employee=None, context=None):
        super().__init__(employee, context)
        self.required_context = ['time_in', 'time_out', 'date', 'schedule']
    
    def apply(self, **kwargs):
        """Apply custom validation rules."""
        # Implement custom business logic here
        pass
    
    def validate_break_time(self, time_in, time_out, schedule):
        """Validate break time compliance."""
        # Custom break time validation
        pass
    
    def validate_overtime_limits(self, time_in, time_out, schedule):
        """Validate overtime limits."""
        # Custom overtime validation
        pass
```

## 🧪 Testing

### Unit Tests
```python
class TimeValidationTestCase(TestCase):
    def setUp(self):
        self.employee = Employee.objects.create(
            user=User.objects.create_user(username='testuser'),
            early_login_restriction_hours=1.0
        )
        self.schedule = EmployeeSchedule.objects.create(
            employee=self.employee,
            date=date.today(),
            scheduled_time_in=time(7, 0),  # 7:00 AM
            scheduled_time_out=time(16, 0)  # 4:00 PM
        )
    
    def test_early_clock_in_restriction(self):
        """Test that clock-in is blocked more than 1 hour early."""
        current_time = datetime.combine(date.today(), time(5, 30))  # 5:30 AM
        
        with self.assertRaises(ValidationError):
            self._validate_clock_in(current_time)
    
    def test_late_clock_in_restriction(self):
        """Test that clock-in is blocked more than 2 hours after end time."""
        current_time = datetime.combine(date.today(), time(18, 30))  # 6:30 PM
        
        with self.assertRaises(ValidationError):
            self._validate_clock_in(current_time)
    
    def test_overnight_shift_handling(self):
        """Test overnight shift time calculations."""
        overnight_schedule = EmployeeSchedule.objects.create(
            employee=self.employee,
            date=date.today(),
            scheduled_time_in=time(22, 0),  # 10:00 PM
            scheduled_time_out=time(6, 0)   # 6:00 AM
        )
        
        # Test that end time is properly adjusted
        start_dt, end_dt = self._handle_overnight_shift(
            overnight_schedule.scheduled_time_in,
            overnight_schedule.scheduled_time_out,
            overnight_schedule.date
        )
        
        self.assertEqual(end_dt.date(), date.today() + timedelta(days=1))
```

### Integration Tests
```python
class TimeInOutAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser')
        self.employee = Employee.objects.create(user=self.user)
        self.client.force_authenticate(user=self.user)
    
    def test_time_in_without_schedule(self):
        """Test that time-in is blocked without schedule."""
        response = self.client.post('/api/time-in-out/time-in/', {
            'employee_id': self.employee.id,
            'latitude': 40.7128,
            'longitude': -74.0060
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('Schedule required', response.data['error'])
    
    def test_time_in_with_schedule(self):
        """Test successful time-in with valid schedule."""
        EmployeeSchedule.objects.create(
            employee=self.employee,
            date=date.today(),
            scheduled_time_in=time(7, 0),
            scheduled_time_out=time(16, 0)
        )
        
        response = self.client.post('/api/time-in-out/time-in/', {
            'employee_id': self.employee.id,
            'latitude': 40.7128,
            'longitude': -74.0060
        })
        
        self.assertEqual(response.status_code, 200)
```

## 🚀 Performance Optimization

### Database Optimization
```python
# Add database indexes for performance
class EmployeeSchedule(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['date']),
            models.Index(fields=['employee', 'date', 'scheduled_time_in']),
        ]

# Use select_related for related data
schedule = EmployeeSchedule.objects.select_related(
    'employee', 'employee__department', 'employee__department__location'
).filter(employee=employee, date=today).first()
```

### Caching Strategy
```python
from django.core.cache import cache

def get_employee_schedule(employee_id, date):
    """Get employee schedule with caching."""
    cache_key = f"schedule_{employee_id}_{date}"
    
    schedule = cache.get(cache_key)
    if schedule is None:
        schedule = EmployeeSchedule.objects.filter(
            employee_id=employee_id, 
            date=date
        ).first()
        
        if schedule:
            # Cache for 1 hour
            cache.set(cache_key, schedule, 3600)
    
    return schedule
```

### Frontend Optimization
```javascript
// Memoize validation function
const validateSchedule = useCallback(() => {
  // Validation logic
}, [todaySchedule, scheduleQueryError, validateTimeConstraints]);

// Debounce validation calls
const debouncedValidation = useMemo(
  () => debounce(validateSchedule, 300),
  [validateSchedule]
);

// Use React Query for data fetching
const { data: todaySchedule, error: scheduleQueryError } = useQuery({
  queryKey: ['schedule', employee?.id, today],
  queryFn: () => scheduleAPI.getTodaySchedule(employee.id),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

## 🔍 Monitoring and Logging

### Structured Logging
```python
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class TimeValidationLogger:
    @staticmethod
    def log_validation_attempt(employee_id, action, schedule, current_time, result):
        """Log time validation attempts for monitoring."""
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'employee_id': employee_id,
            'action': action,
            'schedule_date': schedule.date.isoformat() if schedule else None,
            'scheduled_time_in': schedule.scheduled_time_in.isoformat() if schedule else None,
            'scheduled_time_out': schedule.scheduled_time_out.isoformat() if schedule else None,
            'current_time': current_time.isoformat(),
            'validation_result': result,
            'validation_success': result is None
        }
        
        logger.info(f"Time validation attempt: {json.dumps(log_data)}")
    
    @staticmethod
    def log_validation_failure(employee_id, action, error_details):
        """Log validation failures for debugging."""
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'employee_id': employee_id,
            'action': action,
            'error': error_details,
            'severity': 'WARNING'
        }
        
        logger.warning(f"Time validation failed: {json.dumps(log_data)}")
```

### Metrics Collection
```python
from django_prometheus.metrics import Counter, Histogram

# Define metrics
time_validation_attempts = Counter(
    'time_validation_attempts_total',
    'Total number of time validation attempts',
    ['action', 'result']
)

time_validation_duration = Histogram(
    'time_validation_duration_seconds',
    'Time validation duration in seconds',
    ['action']
)

# Use in validation
import time

def validate_time_operation(employee, action, schedule, current_time):
    start_time = time.time()
    
    try:
        result = _validate_schedule_compliance(employee, schedule, action, current_time)
        
        # Record metrics
        time_validation_attempts.labels(action=action, result='success').inc()
        
        return result
        
    except Exception as e:
        time_validation_attempts.labels(action=action, result='failure').inc()
        raise
    finally:
        duration = time.time() - start_time
        time_validation_duration.labels(action=action).observe(duration)
```

## 🔧 Extension Points

### Custom Validation Hooks
```python
class TimeValidationHook:
    """Hook system for custom validation rules."""
    
    def __init__(self):
        self.hooks = []
    
    def register_hook(self, hook_function):
        """Register a custom validation hook."""
        self.hooks.append(hook_function)
    
    def execute_hooks(self, employee, action, schedule, current_time):
        """Execute all registered validation hooks."""
        for hook in self.hooks:
            result = hook(employee, action, schedule, current_time)
            if result is not None and not result.get('valid', True):
                return result
        
        return {'valid': True}

# Usage
validation_hooks = TimeValidationHook()

def custom_break_time_validation(employee, action, schedule, current_time):
    """Custom hook for break time validation."""
    # Implement custom logic
    pass

validation_hooks.register_hook(custom_break_time_validation)
```

### Plugin System
```python
class TimeValidationPlugin:
    """Base class for time validation plugins."""
    
    def validate(self, employee, action, schedule, current_time):
        """Override this method to implement custom validation."""
        raise NotImplementedError
    
    def get_plugin_name(self):
        """Return plugin name for identification."""
        return self.__class__.__name__

class OvertimeLimitPlugin(TimeValidationPlugin):
    """Plugin to enforce overtime limits."""
    
    def validate(self, employee, action, schedule, current_time):
        # Implement overtime validation logic
        pass
```

## 📚 Best Practices

### 1. Always Validate on Backend
- Frontend validation is for UX only
- Backend validation is mandatory
- Never trust client-side data

### 2. Use Consistent Error Messages
- Standardize error response format
- Provide actionable error messages
- Include relevant data for debugging

### 3. Handle Edge Cases
- Overnight shifts
- Timezone differences
- DST transitions
- Invalid time data

### 4. Performance Considerations
- Cache frequently accessed data
- Use database indexes
- Minimize API calls
- Implement proper error handling

### 5. Security
- Validate all inputs
- Use proper authentication
- Log security events
- Implement rate limiting

## 🚨 Common Pitfalls

### 1. Timezone Issues
```python
# ❌ Wrong: Using naive datetime
current_time = datetime.now()

# ✅ Correct: Using timezone-aware datetime
from django.utils import timezone
current_time = timezone.now()
```

### 2. Date Comparison Issues
```python
# ❌ Wrong: Comparing time objects directly
if current_time.time() < schedule.scheduled_time_in:
    # This can fail with overnight shifts

# ✅ Correct: Convert to datetime for comparison
current_dt = datetime.combine(date.today(), current_time.time())
scheduled_dt = datetime.combine(schedule.date, schedule.scheduled_time_in)
if current_dt < scheduled_dt:
    # Handle properly
```

### 3. Validation Order
```python
# ❌ Wrong: Validate time before checking schedule
if current_time < earliest_allowed_time:
    return error_response

# ✅ Correct: Check schedule first
if not schedule:
    return schedule_error_response

if current_time < earliest_allowed_time:
    return time_error_response
```

This developer guide provides comprehensive technical details for implementing, extending, and maintaining the Time In/Out system. Follow the best practices and patterns outlined here to ensure a robust and maintainable codebase.
