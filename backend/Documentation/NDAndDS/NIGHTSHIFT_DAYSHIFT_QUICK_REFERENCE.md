# Nightshift and Dayshift Rules - Quick Reference Guide

## 🚨 Shift Type Classification

| Shift Type | Definition | Example | Crosses Midnight |
|------------|------------|---------|------------------|
| **Dayshift** | `scheduled_end > scheduled_start` | 7:00 AM - 4:00 PM | ❌ No |
| **Nightshift** | `scheduled_end < scheduled_start` | 7:00 PM - 4:00 AM | ✅ Yes |

## ⏰ Business Rules Summary

### Dayshift Rules
- **Early Arrival (≤1 hour)**: Round up to scheduled time
- **Early Arrival (>1 hour)**: Keep actual time
- **Late Departure (≤2 hours)**: Round down to scheduled time
- **Late Departure (>2 hours)**: Flag as emergency, keep actual time
- **Early Time-Out**: Flag as emergency

### Nightshift Rules
- **Early Arrival**: Always round to scheduled start time
- **Late Departure**: Always round to scheduled end time
- **Overnight Handling**: Automatic +24 hours adjustment

## 🔢 Core Metrics Calculation

### 1. Billed Hours (BH)

#### Dayshift BH
```python
# Use effective times (after business rules)
bh_minutes = int((effective_end_dt - effective_start_dt).total_seconds() / 60)
work_minutes = bh_minutes  # No break deduction
billed_hours = work_minutes / 60
```

#### Nightshift BH
```python
# Apply flexible break system
if bh_minutes < 240:  # Less than 4 hours
    work_minutes = bh_minutes
else:
    break_minutes = int(employee.flexible_break_hours * 60)
    work_minutes = bh_minutes - break_minutes

billed_hours = work_minutes / 60
```

### 2. Undertime (UT)

#### Formula
```python
# UT = Scheduled Work Time - BH
scheduled_work_minutes = scheduled_duration_minutes - flexible_break_minutes
undertime_minutes = max(0, scheduled_work_minutes - effective_bh_minutes)
```

#### Break Deduction
- **Shifts ≥4 hours**: Subtract `flexible_break_hours`
- **Shifts <4 hours**: No break deduction
- **Default break**: 1 hour

### 3. Late Calculation

#### Grace Period
```python
grace_period = 5  # minutes

if time_diff_minutes <= grace_period:
    late_minutes = 0  # Within grace period
else:
    late_minutes = time_diff_minutes - grace_period
```

#### Early Arrival
```python
if time_diff_minutes < 0:
    late_minutes = 0  # Early arrival = no late
```

### 4. Night Differential (ND)

#### ND Period
- **Start**: 10:00 PM (22:00)
- **End**: 6:00 AM (06:00)

#### Calculation
```python
# Use original actual times (not abuse-prevented)
nd_work_start = max(actual_start_dt, nd_start_dt)
nd_work_end = min(actual_end_dt, scheduled_end_dt)

# Calculate ND hours
total_night_hours = (nd_work_end - nd_work_start).total_seconds() / 3600

# Apply 1-hour break deduction (HR rule)
final_nd_hours = max(0, total_night_hours - 1.0)
```

#### Abuse Prevention
- Round down to ND boundaries
- Use scheduled end time (not actual)
- Apply break deduction

### 5. Overtime
```python
if billed_hours > employee.overtime_threshold_hours:
    overtime_hours = billed_hours - overtime_threshold_hours
else:
    overtime_hours = 0
```

## 🛡️ Abuse Prevention Rules

### Dayshift Abuse Prevention
```python
# Early arrival within 1 hour
if 0 < time_diff_minutes <= 60:
    effective_start_dt = scheduled_start  # Round up

# Late departure within 2 hours
if time_out_diff_minutes <= 120:
    effective_end_dt = scheduled_end      # Round down

# Emergency detection (>2 hours)
if time_out_diff_minutes > 120:
    flag_emergency_timeout()              # Flag for review
```

### Nightshift Abuse Prevention
```python
# Always round to scheduled times
if effective_start_dt < scheduled_start:
    effective_start_dt = scheduled_start

if effective_end_dt > scheduled_end:
    effective_end_dt = scheduled_end
```

## 📊 Calculation Examples

### Example 1: Dayshift (7:00 AM - 4:00 PM)
| Scenario | Time In | Time Out | BH | UT | Late | OT |
|----------|---------|----------|----|----|----|----|
| **Normal** | 7:00 AM | 4:00 PM | 8h | 0h | 0m | 0h |
| **Early (30m)** | 6:30 AM | 4:00 PM | 8h | 0h | 0m | 0h |
| **Late (30m)** | 7:30 AM | 4:30 PM | 8h | 0h | 25m | 0h |
| **Emergency** | 7:00 AM | 7:00 PM | 11h | 0h | 0m | 3h |

### Example 2: Nightshift (7:00 PM - 4:00 AM)
| Scenario | Time In | Time Out | BH | UT | Late | ND |
|----------|---------|----------|----|----|----|----|
| **Normal** | 7:00 PM | 4:00 AM | 8h | 0h | 0m | 5h |
| **Early (20m)** | 6:40 PM | 4:00 AM | 8h | 0h | 0m | 5h |
| **Late (10m)** | 7:00 PM | 4:10 AM | 8h | 0h | 0m | 5h |

## ⚙️ Configuration Settings

### Employee Settings
```python
class Employee(models.Model):
    flexible_break_hours = 1.00      # Default: 1 hour
    daily_work_hours = 8.00         # Default: 8 hours
    overtime_threshold_hours = 8.00  # Default: 8 hours
```

### System Settings
```python
# Grace period for late arrivals
GRACE_PERIOD_MINUTES = 5

# Emergency timeout threshold
EMERGENCY_TIMEOUT_THRESHOLD = 120  # 2 hours

# Early arrival limit for dayshifts
EARLY_ARRIVAL_LIMIT = 60           # 1 hour

# ND period
ND_START_TIME = '22:00'            # 10:00 PM
ND_END_TIME = '06:00'              # 6:00 AM
ND_BREAK_DEDUCTION = 1.0           # 1 hour
```

## 🔍 Debug Commands

### Check Shift Type
```python
# Backend shell
python manage.py shell
>>> from geo.models import DailyTimeSummary
>>> summary = DailyTimeSummary.objects.get(id=123)
>>> scheduled_start = summary.scheduled_time_in
>>> scheduled_end = summary.scheduled_time_out
>>> is_dayshift = scheduled_end > scheduled_start
>>> print(f"Shift type: {'Dayshift' if is_dayshift else 'Nightshift'}")
```

### Verify Calculations
```python
# Test time calculation policy
from geo.policies.time_calculation_policy import TimeCalculationPolicy

policy = TimeCalculationPolicy(employee=employee)
result = policy.apply(
    time_in=datetime.now(),
    time_out=datetime.now(),
    date=date.today(),
    scheduled_time_in=time(7, 0),
    scheduled_time_out=time(16, 0)
)

print(f"BH: {result['billed_hours']:.2f}h")
print(f"UT: {result['undertime_minutes']}m")
print(f"Late: {result['late_minutes']}m")
print(f"ND: {result['night_differential_hours']:.2f}h")
```

## 🧪 Testing Checklist

### Dayshift Testing
- [ ] Early arrival ≤1 hour → Rounded up to scheduled time
- [ ] Early arrival >1 hour → Kept as actual time
- [ ] Late departure ≤2 hours → Rounded down to scheduled time
- [ ] Late departure >2 hours → Flagged as emergency
- [ ] Early time-out → Flagged as emergency

### Nightshift Testing
- [ ] Early arrival → Rounded to scheduled start time
- [ ] Late departure → Rounded to scheduled end time
- [ ] Overnight shift → Properly handled (+24 hours)
- [ ] ND calculation → Correct period and break deduction

### Calculation Testing
- [ ] BH calculation → Correct after business rules
- [ ] UT calculation → Scheduled work time - BH
- [ ] Late calculation → Grace period applied
- [ ] ND calculation → Boundaries and abuse prevention
- [ ] Overtime calculation → Above threshold

## ❌ Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **Incorrect BH** | Business rules not applied | Verify rule application order |
| **Wrong ND** | ND boundaries incorrect | Check 10:00 PM - 6:00 AM period |
| **UT errors** | Break deduction wrong | Verify flexible_break_hours setting |
| **Shift misclassification** | Schedule times wrong | Check scheduled_time_in/out |
| **Emergency not flagged** | Threshold too high | Verify EMERGENCY_TIMEOUT_THRESHOLD |

## 📋 Quick Formulas

### BH (Billed Hours)
```
Dayshift: BH = Effective End Time - Effective Start Time
Nightshift: BH = (Effective End Time - Effective Start Time) - Break Time
```

### UT (Undertime)
```
UT = Scheduled Work Time - BH
Scheduled Work Time = Scheduled Duration - Break Time
```

### Late
```
Late = Actual Time In - Scheduled Time In - Grace Period
Grace Period = 5 minutes
```

### ND (Night Differential)
```
ND = Hours worked in ND period - 1 hour break
ND Period = 10:00 PM - 6:00 AM
```

### Overtime
```
OT = BH - Overtime Threshold
Default Threshold = 8 hours
```

## 🚀 Performance Tips

### Database Optimization
```python
# Add indexes for time calculations
class DailyTimeSummary(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['date', 'scheduled_time_in']),
            models.Index(fields=['date', 'scheduled_time_out']),
        ]
```

### Caching Strategy
```python
# Cache calculation results
from django.core.cache import cache

def get_cached_calculation(employee_id, date):
    cache_key = f"time_calculation_{employee_id}_{date}"
    return cache.get(cache_key) or calculate_and_cache(employee_id, date)
```

## 📞 Support

- **Calculation Issues**: Check business rule application order
- **ND Problems**: Verify ND period boundaries and abuse prevention
- **Configuration**: Review employee and system settings
- **Performance**: Add database indexes and implement caching
- **Testing**: Use provided test cases and debug commands

---

**Last Updated:** August 2025  
**Version:** 1.0  
**Maintainer:** Development Team
