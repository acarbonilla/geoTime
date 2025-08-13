# Schedule Time Validation Rules

## Overview
This document outlines the comprehensive time validation rules implemented to prevent users from clocking in/out outside of their scheduled work hours, while maintaining flexibility for legitimate late arrivals and early departures.

## Problem Solved
**Previous Issue**: Users could clock in/out even after their scheduled time (e.g., 7:00 AM - 4:00 PM) had passed, allowing unauthorized time tracking outside of work hours.

**Solution**: Implemented multi-layered validation that enforces schedule compliance while providing reasonable flexibility windows.

## Validation Rules

### 1. Clock-In Restrictions

#### Early Clock-In
- **Rule**: Cannot clock in more than 1 hour before scheduled start time
- **Example**: If scheduled at 7:00 AM, earliest allowed is 6:00 AM
- **Purpose**: Prevents excessive early arrivals that could inflate work hours

#### Late Clock-In
- **Rule**: Cannot clock in more than 2 hours after scheduled end time
- **Example**: If scheduled 7:00 AM - 4:00 PM, latest allowed clock-in is 6:00 PM
- **Purpose**: Prevents clocking in after shift has completely ended

#### Late Clock-In (Within Window)
- **Rule**: Can clock in up to 2 hours after scheduled end time
- **Example**: If scheduled 7:00 AM - 4:00 PM, can clock in until 6:00 PM
- **Purpose**: Allows flexibility for legitimate late arrivals while maintaining control

### 2. Clock-Out Restrictions

#### Late Clock-Out
- **Rule**: Cannot clock out more than 4 hours after scheduled end time
- **Example**: If scheduled 7:00 AM - 4:00 PM, latest allowed clock-out is 8:00 PM
- **Purpose**: Prevents excessive overtime without proper authorization

#### Early Clock-Out
- **Rule**: No restriction on early clock-out
- **Purpose**: Allows employees to leave early if needed (e.g., sick, emergency)

### 3. Overnight Shift Handling

#### Cross-Midnight Shifts
- **Rule**: Automatically detects and handles shifts that cross midnight
- **Example**: 10:00 PM - 6:00 AM shift is properly calculated
- **Purpose**: Ensures accurate time calculations for night shift workers

## Implementation Layers

### 1. Frontend Validation (Mobile & Desktop)
- **Schedule Check**: Validates schedule exists before enabling buttons
- **Time Validation**: Prevents clock-in/out outside allowed windows
- **User Feedback**: Clear error messages explaining restrictions
- **Button State**: Disables buttons when validation fails

### 2. Backend Validation (API)
- **Schedule Requirement**: Mandatory schedule check for all time operations
- **Time Window Enforcement**: Strict validation of time constraints
- **Team Leader Override**: Custom timestamp validation for supervisors
- **Error Responses**: Detailed error messages with specific time restrictions

### 3. Database Constraints
- **Schedule Validation**: Ensures schedule exists before processing time entries
- **Data Integrity**: Prevents orphaned time entries without schedules

## User Experience

### Allowed Scenarios
✅ **Normal Clock-In**: Within 1 hour before scheduled time
✅ **On-Time Clock-In**: At or after scheduled start time
✅ **Late Clock-In**: Up to 2 hours after scheduled end time
✅ **Early Clock-Out**: Before scheduled end time
✅ **On-Time Clock-Out**: At or after scheduled end time
✅ **Late Clock-Out**: Up to 4 hours after scheduled end time

### Blocked Scenarios
❌ **Too Early**: More than 1 hour before scheduled start time
❌ **Too Late Clock-In**: More than 2 hours after scheduled end time
❌ **Excessive Overtime**: More than 4 hours after scheduled end time
❌ **No Schedule**: Attempting to clock in/out without a schedule

## Error Messages

### Clock-In Too Early
```
Cannot clock in more than 1 hour before scheduled time. 
Earliest allowed time: 6:00 AM
Scheduled time: 7:00 AM
```

### Clock-In After Shift Ended
```
Cannot clock in after your shift has ended. 
Your scheduled time was 7:00 AM - 4:00 PM. 
Latest allowed clock-in: 6:00 PM
```

### Clock-Out Too Late
```
Cannot clock out after your shift has ended. 
Your scheduled time was 7:00 AM - 4:00 PM. 
Latest allowed clock-out: 8:00 PM
```

### No Schedule
```
No work schedule found for today (08/12/2025). 
Please contact your supervisor to set up your schedule before clocking in/out.
```

## Configuration Options

### Employee Settings
- **`early_login_restriction_hours`**: Default 1.0 hour (configurable per employee)
- **`require_schedule_compliance`**: Always enforced (no bypass)

### System Settings
- **Clock-in flexibility**: 2 hours after scheduled end time
- **Clock-out flexibility**: 4 hours after scheduled end time
- **Early arrival window**: 1 hour before scheduled start time

## Security Features

### 1. No Bypass Possible
- **Frontend**: Prevents user interaction when validation fails
- **Backend**: Enforces rules regardless of frontend state
- **Database**: Schedule requirement enforced at data level

### 2. Team Leader Controls
- **Custom Timestamps**: Can set specific clock-in/out times
- **Same Validation**: Must still comply with time window rules
- **Audit Trail**: All custom timestamps are logged

### 3. Comprehensive Logging
- **Validation Failures**: Logged for security monitoring
- **Policy Decisions**: Tracked for compliance reporting
- **User Actions**: Full audit trail of all time operations

## Testing Scenarios

### Test Case 1: Normal Schedule (7:00 AM - 4:00 PM)
1. **6:00 AM**: ✅ Can clock in (1 hour early)
2. **7:00 AM**: ✅ Can clock in (on time)
3. **4:00 PM**: ✅ Can clock out (on time)
4. **6:00 PM**: ✅ Can clock in (2 hours late)
5. **8:00 PM**: ✅ Can clock out (4 hours late)
6. **9:00 PM**: ❌ Cannot clock in (3 hours late)
7. **9:00 PM**: ❌ Cannot clock out (5 hours late)

### Test Case 2: No Schedule
1. **Any Time**: ❌ Cannot clock in/out
2. **Error Message**: "No work schedule found for today"

### Test Case 3: Incomplete Schedule
1. **Missing Time In**: ❌ Cannot clock in/out
2. **Missing Time Out**: ❌ Cannot clock in/out
3. **Error Message**: "Your schedule is incomplete"

## Benefits

### 1. **Compliance**
- Enforces company work hour policies
- Prevents unauthorized overtime
- Ensures accurate time tracking

### 2. **Security**
- No bypass of schedule requirements
- Comprehensive validation at all levels
- Full audit trail of all operations

### 3. **Flexibility**
- Reasonable windows for late arrivals
- Accommodates legitimate overtime
- Handles overnight shifts properly

### 4. **User Experience**
- Clear error messages
- Immediate feedback on restrictions
- Consistent behavior across platforms

## Conclusion

The implemented time validation rules provide a robust solution that:

1. **Prevents abuse** of the time tracking system
2. **Maintains flexibility** for legitimate work scenarios
3. **Ensures compliance** with company policies
4. **Provides security** through multiple validation layers
5. **Offers clear feedback** to users about restrictions

Users can no longer clock in/out after their scheduled time has passed, ensuring that time tracking remains accurate and compliant with work schedules.
