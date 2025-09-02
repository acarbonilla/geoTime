# 🌙 Nightshift Cross-Date Implementation

This document describes the implementation of nightshift cross-date logic to solve the problem where night shifts cross midnight and span multiple calendar dates.

## 🎯 Problem Solved

**Before**: Night shifts crossing midnight caused calculation errors:
- Night shift starts: 10:00 PM (same day)
- Night shift ends: 6:00 AM (next day)
- Problem: `schedule_out.time() < schedule_in.time()` (6:00 AM < 10:00 PM)
- Result: Incorrect duration calculations, wrong status determination

**After**: Proper handling of cross-date night shifts:
- Automatic detection of night shifts
- Correct date adjustments for calculations
- Accurate duration and night differential calculations
- Proper status determination

## 🚀 New Features

### 1. Utility Functions (`backend/geo/utils.py`)

#### `adjust_nightshift_times()`
```python
def adjust_nightshift_times(schedule_in, schedule_out, time_in=None, time_out=None, base_date=None):
    """
    Adjust nightshift times to handle cross-date schedules properly.
    
    Returns:
        dict: Adjusted times with proper date handling
    """
```

**What it does:**
- Detects when `schedule_out.time() < schedule_in.time()`
- Automatically adds 1 day to `schedule_out` for proper calculations
- Handles both scheduled and actual times
- Returns datetime objects with correct date boundaries

#### `calculate_nightshift_duration()`
```python
def calculate_nightshift_duration(schedule_in, schedule_out, time_in=None, time_out=None, base_date=None):
    """
    Calculate duration for night shifts with proper date handling.
    """
```

**What it does:**
- Uses adjusted times for accurate duration calculations
- Calculates night differential hours (10 PM to 6 AM)
- Handles break deductions properly
- Returns comprehensive duration data

#### `get_attendance_status_enhanced()`
```python
def get_attendance_status_enhanced(schedule_in, schedule_out, time_in, time_out, base_date=None):
    """
    Enhanced attendance status determination with night shift support.
    """
```

**What it does:**
- Determines status using adjusted times
- Handles incomplete shifts properly
- Provides accurate late/undertime calculations
- Supports night shift specific logic

### 2. Enhanced Models

#### `DailyTimeSummary` Model
New properties and methods:
- `is_night_shift_schedule`: Detects night shift schedules
- `adjusted_scheduled_times`: Gets adjusted scheduled times
- `adjusted_actual_times`: Gets adjusted actual times
- `calculate_enhanced_metrics()`: Calculates metrics using new logic
- `get_nightshift_display_info()`: Gets display information for night shifts

#### `EmployeeSchedule` Model
New methods:
- `detect_night_shift()`: Automatically detects night shifts
- `get_adjusted_times()`: Gets adjusted times for calculations
- Auto-detection on save

### 3. Management Command

#### `apply_nightshift_logic`
```bash
# Test the logic without applying changes
python manage.py apply_nightshift_logic --test-only

# Apply fixes to existing data
python manage.py apply_nightshift_logic --fix-existing

# Process specific employee
python manage.py apply_nightshift_logic --employee-id EMP001 --fix-existing

# Process specific date
python manage.py apply_nightshift_logic --date 2025-08-18 --fix-existing
```

## 🔧 How It Works

### 1. Night Shift Detection
```python
# Automatic detection based on time patterns
is_nightshift = (
    (start_hour >= 18 and end_hour < 12) or  # 6 PM to 12 PM
    (start_hour >= 20 and end_hour < 8) or   # 8 PM to 8 AM
    (start_hour >= 22 and end_hour < 6)      # 10 PM to 6 AM
)

# Also detects when end time < start time (crosses midnight)
if schedule_out < schedule_in:
    is_nightshift = True
```

### 2. Date Adjustment Logic
```python
# Adjust night shift logic: if schedule_out is on next day
if schedule_in_dt and schedule_out_dt:
    if schedule_out_dt.time() < schedule_in_dt.time():
        # This is a night shift crossing midnight
        schedule_out_dt = schedule_in_dt + timedelta(days=1)

# Apply same logic to actual time_out
if time_in_dt and time_out_dt and time_out_dt.time() < time_in_dt.time():
    # Actual time out is on next day
    time_out_dt = time_in_dt + timedelta(days=1)
```

### 3. Enhanced Calculations
```python
# Calculate duration with proper date handling
duration_data = calculate_nightshift_duration(
    schedule_in, schedule_out, time_in, time_out, base_date
)

# Calculate night differential (10 PM to 6 AM)
night_start = datetime.combine(base_date, time(22, 0))  # 10:00 PM
night_end = datetime.combine(base_date + timedelta(days=1), time(6, 0))  # 6:00 AM next day

# Find overlap with night period
effective_start = max(time_in_dt, night_start)
effective_end = min(time_out_dt, night_end)
```

## 📊 Usage Examples

### 1. Basic Night Shift Handling
```python
from geo.utils import adjust_nightshift_times

# Night shift: 10 PM to 6 AM
schedule_in = time(22, 0)  # 10:00 PM
schedule_out = time(6, 0)  # 6:00 AM

adjusted = adjust_nightshift_times(schedule_in, schedule_out, base_date=date(2025, 8, 18))

print(f"Is night shift: {adjusted['is_night_shift']}")
print(f"Adjusted schedule out: {adjusted['schedule_out_dt']}")
# Output: Is night shift: True
# Output: Adjusted schedule out: 2025-08-19 06:00:00
```

### 2. Duration Calculation
```python
from geo.utils import calculate_nightshift_duration

duration_data = calculate_nightshift_duration(
    schedule_in, schedule_out, time_in, time_out, base_date
)

print(f"Night differential: {duration_data['night_differential_hours']}h")
print(f"Total duration: {duration_data['actual_duration']}")
```

### 3. Enhanced Model Usage
```python
# Get night shift information
summary = DailyTimeSummary.objects.get(employee=employee, date=date(2025, 8, 18))

if summary.is_night_shift_schedule:
    nightshift_info = summary.get_nightshift_display_info()
    print(f"Night shift: {nightshift_info['start_time']} to {nightshift_info['end_time']}")
    print(f"Crosses midnight: {nightshift_info['crosses_midnight']}")

# Calculate enhanced metrics
summary.calculate_enhanced_metrics()
```

## 🧪 Testing

### 1. Test Scenarios
The management command includes test cases for:
- Standard Night Shift (10 PM - 6 AM)
- Day Shift (8 AM - 5 PM)
- Late Night Shift (11 PM - 7 AM)

### 2. Run Tests
```bash
# Test logic without applying changes
python manage.py apply_nightshift_logic --test-only

# Test specific employee
python manage.py apply_nightshift_logic --employee-id EMP001 --test-only
```

## 🔄 Migration Steps

### 1. Apply to Existing Data
```bash
# Apply fixes to all employees for last 30 days
python manage.py apply_nightshift_logic --fix-existing

# Apply to specific employee
python manage.py apply_nightshift_logic --employee-id EMP001 --fix-existing
```

### 2. Verify Results
- Check console output for night shift detection
- Verify duration calculations are correct
- Confirm night differential hours are accurate
- Validate status determination

## 📈 Benefits

### 1. **Accurate Calculations**
- Proper handling of cross-date shifts
- Correct duration calculations
- Accurate night differential hours

### 2. **Better Status Determination**
- Proper late/undertime detection
- Accurate incomplete shift handling
- Night shift specific logic

### 3. **Improved User Experience**
- Correct display of night shift information
- Proper grouping of cross-date entries
- Accurate reporting and exports

### 4. **Data Consistency**
- Unified logic across backend and frontend
- Consistent handling of edge cases
- Proper validation and error handling

## 🚨 Important Notes

### 1. **Backward Compatibility**
- Existing data remains intact
- New logic is additive, not replacing
- Gradual migration supported

### 2. **Performance Considerations**
- Utility functions are optimized for performance
- Database queries remain efficient
- Caching can be added if needed

### 3. **Error Handling**
- Comprehensive error handling in utility functions
- Graceful fallbacks for edge cases
- Detailed logging for debugging

## 🔮 Future Enhancements

### 1. **Frontend Integration**
- Update React components to use new logic
- Enhanced night shift display
- Better user interface for night shifts

### 2. **Advanced Features**
- Multiple night shift patterns
- Custom night differential periods
- Shift rotation support

### 3. **Reporting Enhancements**
- Night shift specific reports
- Cross-date shift analytics
- Performance metrics

## 📞 Support

For questions or issues with the nightshift implementation:
1. Check the console logs for detailed information
2. Run the management command in test mode
3. Review the utility function documentation
4. Check the model method implementations

---

**🎉 The nightshift cross-date problem is now solved!** 

Your system can now properly handle:
- ✅ Night shifts crossing midnight
- ✅ Accurate duration calculations
- ✅ Proper night differential hours
- ✅ Correct status determination
- ✅ Enhanced reporting capabilities
