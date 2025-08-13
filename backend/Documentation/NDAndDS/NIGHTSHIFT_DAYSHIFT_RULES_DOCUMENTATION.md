# Nightshift and Dayshift Rules Documentation

## Overview
This document provides comprehensive documentation for the business rules and calculations applied to Nightshift and Dayshift schedules in the GeoTime system. The system implements different calculation logic for each shift type to ensure accurate time tracking and prevent abuse while maintaining flexibility for legitimate work scenarios.

## Table of Contents
1. [Shift Type Classification](#shift-type-classification)
2. [Dayshift Rules and Calculations](#dayshift-rules-and-calculations)
3. [Nightshift Rules and Calculations](#nightshift-rules-and-calculations)
4. [Core Metrics Calculation](#core-metrics-calculation)
5. [Business Rules Implementation](#business-rules-implementation)
6. [Examples and Test Cases](#examples-and-test-cases)
7. [Configuration and Settings](#configuration-and-settings)
8. [Troubleshooting](#troubleshooting)

## Shift Type Classification

### Automatic Detection
The system automatically classifies shifts based on schedule times:

```python
# Check if this is a dayshift (doesn't cross midnight)
is_dayshift = scheduled_end > scheduled_start

# Examples:
# Dayshift: 7:00 AM - 4:00 PM (scheduled_end > scheduled_start)
# Nightshift: 7:00 PM - 4:00 AM (scheduled_end < scheduled_start)
```

### Shift Characteristics

#### Dayshift
- **Definition**: Schedule where end time is after start time on the same day
- **Example**: 7:00 AM - 4:00 PM
- **Crosses Midnight**: No
- **Business Rules**: Abuse prevention with early arrival and late departure handling

#### Nightshift
- **Definition**: Schedule where end time is before start time (crosses midnight)
- **Example**: 7:00 PM - 4:00 AM
- **Crosses Midnight**: Yes
- **Business Rules**: Strict rounding to scheduled times

## Dayshift Rules and Calculations

### 1. Early Arrival Rules

#### Within 1 Hour Early
- **Rule**: If time in is within 1 hour of scheduled start time, round up to scheduled time
- **Purpose**: Prevents abuse of early arrivals while allowing reasonable flexibility
- **Implementation**:
```python
time_diff_minutes = int((scheduled_start - effective_start_dt).total_seconds() / 60)

if time_diff_minutes > 0 and time_diff_minutes <= 60:
    # Early arrival within 1 hour - round up to scheduled time
    effective_start_dt = scheduled_start
    print(f"DAYSIFT RULE: Early arrival {time_diff_minutes} minutes, rounded up to scheduled time")
```

#### More Than 1 Hour Early
- **Rule**: If time in is more than 1 hour early, keep actual time
- **Purpose**: Allows legitimate early arrivals while flagging for review
- **Implementation**:
```python
elif time_diff_minutes > 60:
    # Too early (more than 1 hour) - keep actual time
    print(f"DAYSIFT RULE: Too early arrival {time_diff_minutes} minutes, keeping actual time")
```

### 2. Late Departure Rules

#### Regular Late Departure
- **Rule**: If time out is beyond scheduled time (but not emergency), round down to scheduled time
- **Purpose**: Prevents overtime abuse while maintaining flexibility
- **Implementation**:
```python
if effective_end_dt > scheduled_end:
    time_out_diff_minutes = int((effective_end_dt - scheduled_end).total_seconds() / 60)
    
    if time_out_diff_minutes <= 120:  # 2 hours or less
        # Regular late departure - round down to scheduled time
        effective_end_dt = scheduled_end
        print(f"DAYSIFT RULE: Late departure {time_out_diff_minutes} minutes, rounded down to scheduled time")
```

#### Emergency Time-Out Detection
- **Rule**: If time out is more than 2 hours beyond scheduled time, flag as potential emergency
- **Purpose**: Allows legitimate emergency situations while flagging for review
- **Implementation**:
```python
if time_out_diff_minutes > 120:  # More than 2 hours late
    print(f"EMERGENCY POLICY: Time out {time_out_diff_minutes} minutes beyond schedule - potential emergency")
    
    # For emergency situations, allow actual time but flag for review
    self._flag_emergency_timeout(time_out_diff_minutes, effective_end_dt)
```

### 3. Early Time-Out Detection
- **Rule**: If time out is before scheduled start time, flag as potential emergency
- **Purpose**: Handles cases where employee has to leave immediately after arriving
- **Implementation**:
```python
elif effective_end_dt < scheduled_start:
    # EMERGENCY TIME-OUT POLICY: Early time-out - potential emergency
    time_out_diff_minutes = int((scheduled_start - effective_end_dt).total_seconds() / 60)
    
    print(f"EMERGENCY POLICY: Time out {time_out_diff_minutes} minutes BEFORE scheduled start - potential emergency")
    
    # Flag for review
    self._flag_emergency_timeout(-time_out_diff_minutes, effective_end_dt)
```

## Nightshift Rules and Calculations

### 1. Early Arrival Rules
- **Rule**: Round early arrivals to scheduled start time
- **Purpose**: Prevents abuse of early arrivals in nightshift scenarios
- **Implementation**:
```python
# NIGHTSHIFT RULES: Round early arrivals to scheduled start time
if effective_start_dt < scheduled_start:
    effective_start_dt = scheduled_start
```

### 2. Late Departure Rules
- **Rule**: Round late departures to scheduled end time
- **Purpose**: Prevents overtime abuse in nightshift scenarios
- **Implementation**:
```python
# Round late departures to scheduled end time
if effective_end_dt > scheduled_end:
    effective_end_dt = scheduled_end
```

### 3. Overnight Shift Handling
- **Rule**: Automatically detect and handle shifts crossing midnight
- **Implementation**:
```python
# Handle overnight shifts
if scheduled_end < scheduled_start:
    scheduled_end += timedelta(days=1)

if effective_end_dt < effective_start_dt:
    effective_end_dt += timedelta(days=1)
```

## Core Metrics Calculation

### 1. Billed Hours (BH)

#### Dayshift BH Calculation
```python
if is_dayshift:
    # DAYSHIFT: Use actual time worked (after abuse prevention rules)
    # The effective_start_dt and effective_end_dt already have business rules applied
    work_minutes = bh_minutes
    print(f"DAYSIFT RULE: Using actual time worked: {work_minutes} minutes")
```

#### Nightshift BH Calculation
```python
else:
    # NIGHTSHIFT: Use flexible break system
    if bh_minutes < 240:  # Less than 4 hours
        work_minutes = bh_minutes
    else:
        flexible_break_minutes = int(self.employee.flexible_break_hours * 60)
        work_minutes = bh_minutes - min(flexible_break_minutes, bh_minutes)
```

#### Final BH Calculation
```python
# Calculate BH using effective times (after business rules)
bh_minutes = int((effective_end_dt - effective_start_dt).total_seconds() / 60)

# Store BH in hours
self.billed_hours = max(0, work_minutes) / 60
```

### 2. Undertime (UT) Calculation

#### Dayshift UT Calculation
```python
if is_dayshift:
    # DAYSHIFT: UT = Scheduled Work Duration - BH (using actual BH)
    # Calculate scheduled work duration excluding breaks
    if scheduled_duration_minutes >= 240:  # 4 hours or more
        flexible_break_minutes = int(self.employee.flexible_break_hours * 60)
        scheduled_work_minutes = scheduled_duration_minutes - flexible_break_minutes
    else:
        scheduled_work_minutes = scheduled_duration_minutes
    
    # UT = Scheduled Work Duration - BH
    self.undertime_minutes = max(0, scheduled_work_minutes - effective_bh_minutes)
    print(f"DAYSIFT RULE: UT = {scheduled_work_minutes} - {effective_bh_minutes} = {self.undertime_minutes} minutes")
```

#### Nightshift UT Calculation
```python
else:
    # NIGHTSHIFT: Use flexible break system
    if scheduled_duration_minutes >= 240:  # 4 hours or more
        flexible_break_minutes = int(self.employee.flexible_break_hours * 60)
        scheduled_work_minutes = scheduled_duration_minutes - flexible_break_minutes
    else:
        scheduled_work_minutes = scheduled_duration_minutes
    
    # UT = Scheduled Work Duration - BH
    self.undertime_minutes = max(0, scheduled_work_minutes - effective_bh_minutes)
```

### 3. Late Calculation

#### Grace Period Implementation
```python
# Calculate late minutes with grace period
grace_period_minutes = 5  # 5-minute grace period

if time_diff_minutes <= grace_period_minutes:
    late_minutes = 0  # Within grace period
else:
    late_minutes = time_diff_minutes - grace_period_minutes
```

#### Late Calculation Logic
```python
# Calculate time difference for early arrival
time_diff_minutes = int((scheduled_start - effective_start_dt).total_seconds() / 60)

if time_diff_minutes < 0:
    # Early arrival
    late_minutes = 0
else:
    # Late arrival
    grace_period = 5  # minutes
    if time_diff_minutes <= grace_period:
        late_minutes = 0  # Within grace period
    else:
        late_minutes = time_diff_minutes - grace_period
```

### 4. Night Differential (ND) Calculation

#### ND Period Definition
```python
# Define ND period: 10:00 PM (22:00) to 6:00 AM (06:00)
nd_start_time = datetime.strptime('22:00', '%H:%M').time()  # 10:00 PM
nd_end_time = datetime.strptime('06:00', '%H:%M').time()    # 6:00 AM

# Create datetime objects for ND boundaries
nd_start_dt = datetime.combine(self.date, nd_start_time)      # 10:00 PM same day
nd_end_dt = datetime.combine(self.date, nd_end_time)          # 6:00 AM same day

# Handle cross-day scenario
if nd_end_dt < nd_start_dt:
    nd_end_dt += timedelta(days=1)
```

#### ND Calculation with Abuse Prevention
```python
# Use ORIGINAL actual times for ND calculation (not abuse-prevented times)
original_start_dt = datetime.combine(self.date, self.time_in)
original_end_dt = datetime.combine(self.date, self.time_out)

# Handle overnight shifts in actual times
if original_end_dt < original_start_dt:
    original_end_dt += timedelta(days=1)

# ND ROUNDING LOGIC: Round to ND period boundaries
if original_start_dt < nd_start_dt:
    nd_work_start = nd_start_dt  # Round down to 10:00 PM
else:
    nd_work_start = original_start_dt  # Use actual time if during ND period

# ND ABUSE PREVENTION: Round down time out to scheduled end time
if self.scheduled_time_out:
    scheduled_end_dt = datetime.combine(self.date, self.scheduled_time_out)
    if scheduled_end_dt < datetime.combine(self.date, self.scheduled_time_in):
        scheduled_end_dt += timedelta(days=1)
    
    # Use the earlier of: actual time out OR scheduled end time
    nd_work_end = min(original_end_dt, scheduled_end_dt)
else:
    # No schedule available, use actual time out with ND boundary rounding
    if original_end_dt > nd_end_dt:
        nd_work_end = nd_end_dt  # Round down to 6:00 AM
    else:
        nd_work_end = original_end_dt  # Use actual time if during ND period
```

#### Final ND Calculation
```python
# Calculate ND hours worked
if nd_work_end > nd_work_start:
    # Calculate total night minutes worked
    total_night_minutes = int((nd_work_end - nd_work_start).total_seconds() / 60)
    total_night_hours = total_night_minutes / 60
    
    # Apply 1-hour break deduction to night differential (HR rule)
    self.night_differential_hours = max(0, total_night_hours - 1.0)
else:
    self.night_differential_hours = Decimal('0.00')
```

### 5. Overtime Calculation
```python
# Calculate overtime
if self.billed_hours > self.employee.overtime_threshold_hours:
    self.overtime_hours = Decimal(str(self.billed_hours)) - self.employee.overtime_threshold_hours
else:
    self.overtime_hours = Decimal('0.00')
```

## Business Rules Implementation

### 1. Abuse Prevention System

#### Frontend Validation
- Schedule requirement enforcement
- Time window restrictions
- Immediate user feedback

#### Backend Validation
- Business rule application
- Effective time calculation
- Abuse detection and flagging

#### Database Constraints
- Schedule existence validation
- Data integrity enforcement

### 2. Emergency Situation Handling

#### Emergency Detection
```python
def _flag_emergency_timeout(self, time_out_diff_minutes, actual_time_out):
    """Flag an emergency time-out situation for manager review"""
    if time_out_diff_minutes > 120:  # More than 2 hours
        # Create emergency timeout request
        EmergencyTimeOutRequest.objects.create(
            employee=self.employee,
            date=self.date,
            time_out_diff_minutes=time_out_diff_minutes,
            actual_time_out=actual_time_out,
            status='pending_review'
        )
```

#### Manager Review Process
- Emergency situations flagged for review
- Manager approval required for overtime
- Audit trail maintained

### 3. Flexible Break System

#### Break Application Rules
```python
# Apply break deduction if session is long enough
if total_minutes >= 240:  # 4 hours or more
    flexible_break_minutes = int(self.employee.flexible_break_hours * 60)
    work_minutes = total_minutes - flexible_break_minutes
else:
    work_minutes = total_minutes
```

#### Break Configuration
- Configurable per employee
- Default: 1 hour
- Applied to shifts 4+ hours

## Examples and Test Cases

### Example 1: Dayshift Schedule (7:00 AM - 4:00 PM)

#### Scenario
- **Schedule**: 7:00 AM - 4:00 PM
- **Time In**: 6:30 AM (30 minutes early)
- **Time Out**: 4:30 PM (30 minutes late)

#### Calculations
```python
# Early arrival: 30 minutes (within 1 hour limit)
# Business rule: Round up to scheduled time
effective_start = 7:00 AM

# Late departure: 30 minutes (within 2 hours)
# Business rule: Round down to scheduled time
effective_end = 4:00 PM

# BH = 9 hours (4:00 PM - 7:00 AM)
# Break deduction: 1 hour
# Final BH = 8 hours

# UT = Scheduled work time - BH
# Scheduled work time = 9 hours - 1 hour break = 8 hours
# UT = 8 - 8 = 0 hours

# Late = 0 minutes (within grace period)
# Overtime = 0 hours (below 8-hour threshold)
```

### Example 2: Nightshift Schedule (7:00 PM - 4:00 AM)

#### Scenario
- **Schedule**: 7:00 PM - 4:00 AM (next day)
- **Time In**: 6:40 PM (20 minutes early)
- **Time Out**: 4:10 AM (10 minutes late)

#### Calculations
```python
# Early arrival: 20 minutes
# Business rule: Round to scheduled time
effective_start = 7:00 PM

# Late departure: 10 minutes
# Business rule: Round to scheduled time
effective_end = 4:00 AM

# BH = 9 hours (4:00 AM - 7:00 PM, next day)
# Break deduction: 1 hour
# Final BH = 8 hours

# UT = Scheduled work time - BH
# Scheduled work time = 9 hours - 1 hour break = 8 hours
# UT = 8 - 8 = 0 hours

# Late = 0 minutes (early arrival)
# Overtime = 0 hours (below 8-hour threshold)

# ND Calculation:
# ND period: 10:00 PM - 6:00 AM
# ND hours: 6 hours (10:00 PM to 4:00 AM)
# Break deduction: 1 hour
# Final ND = 5 hours
```

### Example 3: Emergency Time-Out Scenario

#### Scenario
- **Schedule**: 7:00 AM - 4:00 PM
- **Time In**: 7:00 AM (on time)
- **Time Out**: 7:00 PM (3 hours late)

#### Calculations
```python
# Late departure: 3 hours (more than 2 hours)
# Business rule: Flag as emergency, keep actual time
effective_start = 7:00 AM
effective_end = 7:00 PM

# BH = 12 hours (7:00 PM - 7:00 AM)
# Break deduction: 1 hour
# Final BH = 11 hours

# Emergency flag: Created for manager review
# Overtime: 3 hours (11 - 8 threshold)
```

## Configuration and Settings

### 1. Employee-Level Settings

#### Flexible Break Hours
```python
class Employee(models.Model):
    flexible_break_hours = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        default=1.00,
        help_text="Flexible break hours for shifts 4+ hours"
    )
```

#### Daily Work Hours
```python
daily_work_hours = models.DecimalField(
    max_digits=3, 
    decimal_places=2, 
    default=8.00,
    help_text="Standard daily work hours"
    )
```

#### Overtime Threshold
```python
overtime_threshold_hours = models.DecimalField(
    max_digits=3, 
    decimal_places=2, 
    default=8.00,
    help_text="Hours threshold for overtime calculation"
)
```

### 2. System-Level Settings

#### Grace Period
```python
# Grace period for late arrivals (minutes)
GRACE_PERIOD_MINUTES = 5
```

#### Emergency Threshold
```python
# Emergency timeout threshold (minutes)
EMERGENCY_TIMEOUT_THRESHOLD = 120  # 2 hours
```

#### Early Arrival Limit
```python
# Early arrival limit for dayshifts (minutes)
EARLY_ARRIVAL_LIMIT = 60  # 1 hour
```

### 3. Environment Variables
```bash
# Time calculation settings
FLEXIBLE_BREAK_HOURS=1.0
GRACE_PERIOD_MINUTES=5
EMERGENCY_TIMEOUT_THRESHOLD=120
EARLY_ARRIVAL_LIMIT=60

# ND settings
ND_START_TIME=22:00
ND_END_TIME=06:00
ND_BREAK_DEDUCTION=1.0
```

## Troubleshooting

### Common Issues

#### 1. Incorrect BH Calculation

**Symptoms**: Billed hours don't match expected values
**Causes**:
- Business rules not applied correctly
- Break deduction calculation errors
- Overnight shift handling issues

**Solutions**:
- Verify business rule application
- Check break deduction logic
- Validate overnight shift calculations

#### 2. ND Calculation Errors

**Symptoms**: Night differential hours incorrect
**Causes**:
- ND period boundary issues
- Break deduction not applied
- Abuse prevention rounding errors

**Solutions**:
- Verify ND period boundaries
- Check break deduction application
- Review abuse prevention logic

#### 3. Business Rule Violations

**Symptoms**: Rules not applied as expected
**Causes**:
- Shift type misclassification
- Rule application order issues
- Configuration setting problems

**Solutions**:
- Verify shift type detection
- Check rule application order
- Validate configuration settings

### Debug Information

#### Enable Debug Logging
```python
import logging
logger = logging.getLogger(__name__)

logger.info(f"Shift type: {'Dayshift' if is_dayshift else 'Nightshift'}")
logger.info(f"Effective start: {effective_start_dt}")
logger.info(f"Effective end: {effective_end_dt}")
logger.info(f"BH calculation: {bh_minutes} minutes")
```

#### Business Rule Logging
```python
# Log business rule decisions
print(f"DAYSIFT RULE: Early arrival {time_diff_minutes} minutes, rounded up to scheduled time")
print(f"NIGHTSHIFT RULE: Early arrival rounded to scheduled start")
print(f"EMERGENCY POLICY: Time out {time_out_diff_minutes} minutes beyond schedule")
```

### Performance Considerations

#### Database Optimization
```python
# Add indexes for performance
class DailyTimeSummary(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['date', 'scheduled_time_in']),
            models.Index(fields=['date', 'scheduled_time_out']),
        ]
```

#### Calculation Caching
```python
# Cache calculation results
from django.core.cache import cache

def get_cached_calculation(employee_id, date):
    cache_key = f"time_calculation_{employee_id}_{date}"
    return cache.get(cache_key)
```

## Conclusion

The Nightshift and Dayshift rules system provides:

1. **Accurate Time Tracking**: Proper calculation of all metrics
2. **Abuse Prevention**: Business rules prevent time tracking abuse
3. **Flexibility**: Reasonable allowances for legitimate scenarios
4. **Emergency Handling**: Proper flagging of emergency situations
5. **Consistency**: Uniform application across all shift types
6. **Auditability**: Complete audit trail of all calculations

The system successfully balances accuracy with flexibility, ensuring proper time tracking while preventing abuse and maintaining compliance with company policies.
