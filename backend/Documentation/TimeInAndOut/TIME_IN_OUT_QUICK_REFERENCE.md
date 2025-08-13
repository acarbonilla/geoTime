# Time In/Out System - Quick Reference Guide

## 🚨 Critical Rules (No Bypass Possible)

| Rule | Description | Enforcement |
|------|-------------|-------------|
| **Schedule Required** | Must have schedule before any time operation | Frontend + Backend + Database |
| **Complete Schedule** | Both `scheduled_time_in` and `scheduled_time_out` required | Frontend + Backend |
| **Time Windows** | Clock in/out only within allowed time ranges | Frontend + Backend |

## ⏰ Time Validation Windows

### Clock-In Restrictions
- **Earliest**: 1 hour before scheduled start time
- **Latest**: 2 hours after scheduled end time
- **Example**: 7:00 AM - 4:00 PM schedule
  - ✅ Can clock in: 6:00 AM to 6:00 PM
  - ❌ Blocked: Before 6:00 AM or after 6:00 PM

### Clock-Out Restrictions
- **Earliest**: No restriction (can leave early)
- **Latest**: 4 hours after scheduled end time
- **Example**: 7:00 AM - 4:00 PM schedule
  - ✅ Can clock out: Any time until 8:00 PM
  - ❌ Blocked: After 8:00 PM

## 🔧 Configuration Settings

### Employee Level
```python
# Per employee setting
early_login_restriction_hours = 1.0  # Default: 1 hour
```

### System Level
```python
# Clock-in flexibility (hours after scheduled end)
CLOCK_IN_FLEXIBILITY_HOURS = 2

# Clock-out flexibility (hours after scheduled end)  
CLOCK_OUT_FLEXIBILITY_HOURS = 4

# Early arrival window (hours before scheduled start)
EARLY_ARRIVAL_WINDOW_HOURS = 1
```

## 📱 Dashboard Implementations

### EmployeeDashboard (Wide Screen)
- **File**: `frontend/src/dashboards/EmployeeDashboard/EmployeeDashboard.js`
- **Validation**: `validateSchedule()` function
- **Features**: Full validation + optional time constraints

### MobileDashboard
- **File**: `frontend/src/dashboards/MobileDashboard/MobileDashboard.js`
- **Validation**: Identical logic to EmployeeDashboard
- **Features**: Mobile-optimized + same security

## 🔒 Security Layers

1. **Frontend**: UI blocking + immediate feedback
2. **Backend**: API validation + schedule enforcement
3. **Database**: Schedule requirement constraints
4. **Role-Based**: Team leader custom timestamp support

## ❌ Common Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| "No schedule found" | No schedule for today | Contact supervisor |
| "Schedule incomplete" | Missing time_in/time_out | Complete schedule |
| "Too early" | Before allowed window | Wait until within 1 hour |
| "Shift ended" | After allowed window | Clock in within 2 hours of end |

## 🧪 Testing Checklist

- [ ] No schedule → Time operations blocked
- [ ] Incomplete schedule → Time operations blocked  
- [ ] Too early clock-in → Blocked with clear message
- [ ] Late clock-in (within 2 hours) → Allowed
- [ ] Late clock-in (after 2 hours) → Blocked
- [ ] Early clock-out → Always allowed
- [ ] Late clock-out (within 4 hours) → Allowed
- [ ] Late clock-out (after 4 hours) → Blocked
- [ ] Overnight shifts → Properly calculated

## 🚀 Quick Commands

### Check Current Schedule
```bash
# Backend
python manage.py shell
>>> from geo.models import EmployeeSchedule
>>> schedule = EmployeeSchedule.objects.filter(employee_id=123, date='2025-08-12').first()
>>> print(f"Schedule: {schedule.scheduled_time_in} - {schedule.scheduled_time_out}")
```

### Validate Time Rules
```python
# Test time validation
from datetime import datetime, time
from geo.policies.time_calculation_policy import TimeCalculationPolicy

policy = TimeCalculationPolicy()
result = policy.apply(
    time_in=datetime.now(),
    time_out=datetime.now(),
    date=datetime.now().date(),
    scheduled_time_in=time(7, 0),  # 7:00 AM
    scheduled_time_out=time(16, 0)  # 4:00 PM
)
```

## 📋 API Endpoints

### Time Operations
- `POST /api/time-in-out/time-in/` - Clock in
- `POST /api/time-in-out/time-out/` - Clock out
- `GET /api/schedules/today/` - Get today's schedule

### Required Headers
```
Authorization: Token <user_token>
Content-Type: application/json
```

### Request Format
```json
{
  "employee_id": 123,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 10
}
```

## 🔍 Debug Information

### Frontend Console
```javascript
// Enable debug logging
console.log('Schedule validation:', validateSchedule());
console.log('Current schedule:', todaySchedule);
console.log('Schedule error:', scheduleError);
```

### Backend Logging
```python
import logging
logger = logging.getLogger(__name__)

logger.info(f"Time validation for employee {employee.id}")
logger.info(f"Schedule: {schedule}")
logger.info(f"Current time: {current_time}")
```

## ⚠️ Important Notes

1. **No Bypass**: Schedule validation cannot be disabled
2. **Consistent Behavior**: Both dashboards use identical validation
3. **Overnight Shifts**: Automatically handled (end time +24 hours)
4. **Team Leaders**: Can set custom timestamps but same rules apply
5. **Geolocation**: Required for time tracking (with fallback)

## 📞 Support

- **Schedule Issues**: Contact supervisor/administrator
- **Technical Issues**: Check logs + error messages
- **Configuration**: Review employee and system settings
- **Validation**: Verify time windows and schedule completeness
