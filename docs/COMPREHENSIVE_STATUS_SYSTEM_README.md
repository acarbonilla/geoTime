# Comprehensive Status System Implementation

## Overview

This document describes the new comprehensive status system for employee attendance tracking that provides more accurate and detailed status categorization.

## New Status Definitions

### Core Statuses

| Status | Description | Conditions |
|--------|-------------|------------|
| **Present** | Employee worked complete shift | TimeIn is on or before ScheduleIn, TimeOut is on or after ScheduleOut, AND shift duration ≥ 15 minutes |
| **Late** | Employee arrived late | TimeIn is after ScheduleIn, AND shift duration ≥ 15 minutes |
| **UnderTime** | Employee left early | TimeOut is before ScheduleOut, AND shift duration ≥ 15 minutes |
| **Incomplete** | Shift not completed | TimeOut is missing, OR shift duration < 15 minutes, OR more than 1 hour late |
| **Scheduled** | Future shift scheduled | ScheduleIn and ScheduleOut are set for future date |
| **Absent** | No time entries on scheduled day | ScheduleIn & ScheduleOut exist but no TimeIn (on today's date) |
| **Not Yet Scheduled** | No schedule set | ScheduleIn and ScheduleOut are missing (for past or future) |
| **Shift Void** | Invalid shift timing | Both TimeIn and TimeOut occurred before ScheduleIn |

### Legacy Statuses (Maintained for Backward Compatibility)

- `half_day` - Half Day
- `leave` - On Leave  
- `holiday` - Holiday
- `weekend` - Weekend
- `not_scheduled` - Not Scheduled

## Shift Void Logic

**Critical Feature**: When a shift is marked as "Shift Void", all metrics are automatically set to 0:

- **BH (Break Hours)**: 0
- **LT (Late Time)**: 0  
- **UT (UnderTime)**: 0
- **ND (Night Differential)**: 0
- **Overtime Hours**: 0
- **Break Minutes**: 0

This prevents abuse where employees clock in/out before their scheduled start time.

## Suspicious Shift Detection

**New Feature**: The system now automatically detects and flags suspiciously short shifts:

- **Threshold**: Shifts lasting less than 15 minutes are marked as "Incomplete"
- **Purpose**: Catches data entry errors, test entries, or potential time abuse
- **Examples**:
  - Clock in at 11:51 PM, clock out at 11:52 PM (1 minute) → "Incomplete"
  - Clock in at 9:00 AM, clock out at 9:10 AM (10 minutes) → "Incomplete"
  - Clock in at 9:00 AM, clock out at 9:20 AM (20 minutes) → "Present" (if on time)

This rule applies to all statuses (Present, Late, UnderTime) and overrides them when the shift duration is suspiciously short.

## Implementation Details

### Backend Changes

#### 1. Model Updates (`backend/geo/models.py`)

- Added new status choices to `DailyTimeSummary.STATUS_CHOICES`
- Added `calculate_comprehensive_status()` method that implements the new logic
- Automatic metric zeroing for voided shifts

#### 2. Utility Updates (`backend/geo/utils.py`)

- Updated `generate_daily_time_summary_from_entries()` to use new status calculation
- Replaced old status determination logic with comprehensive method

#### 3. Management Command

- **Command**: `python manage.py update_comprehensive_status`
- **Purpose**: Update existing records with new status system
- **Options**:
  - `--start-date YYYY-MM-DD`: Start date for updates
  - `--end-date YYYY-MM-DD`: End date for updates  
  - `--employee-id ID`: Update specific employee only
  - `--dry-run`: Show changes without applying them

### Frontend Changes

#### 1. Status Display (`frontend/src/TeamLeader_Report/TeamLeaderScheduleReport.js`)

- Updated `getStatus()` function to use new logic
- Added "Shift Void" styling in `getStatusStyling()`
- Enhanced `calculateGroupedMetrics()` to implement shift void logic

#### 2. Status Styling

- **Present**: Green border and background
- **Late**: Orange border and background
- **UnderTime**: Purple border and background
- **Incomplete**: Gray border and background
- **Scheduled**: Green border and background
- **Absent**: Red border and background
- **Not Yet Scheduled**: Yellow border and background
- **Shift Void**: Red border and background (darker than absent)

## Usage Examples

### 1. Update All Recent Records

```bash
cd backend
python manage.py update_comprehensive_status
```

### 2. Update Specific Date Range

```bash
python manage.py update_comprehensive_status --start-date 2024-01-01 --end-date 2024-01-31
```

### 3. Update Specific Employee

```bash
python manage.py update_comprehensive_status --employee-id 123
```

### 4. Preview Changes (Dry Run)

```bash
python manage.py update_comprehensive_status --dry-run
```

## Business Rules

### 1. Status Priority

1. **Shift Void** (highest priority) - overrides all other statuses
2. **Scheduled** - for future dates with schedules
3. **Absent** - for current date with schedule but no time entries
4. **Present/Late/UnderTime** - for completed shifts
5. **Incomplete** - for partial shifts
6. **Not Yet Scheduled** - for dates without schedules

### 2. Time Calculations

- **Late Time (LT)**: Only calculated when scheduled times exist
- **UnderTime (UT)**: Only calculated when scheduled times exist
- **Night Differential (ND)**: Calculated for all shifts (10 PM - 6 AM)
- **Break Hours (BH)**: Actual work time minus break deductions

### 3. Break Deductions

- **4+ hours**: 30-minute break deduction
- **7+ hours**: 60-minute break deduction
- **Less than 4 hours**: No break deduction

## Migration Strategy

### Phase 1: Backend Implementation
- [x] Update model with new status choices
- [x] Implement comprehensive status calculation method
- [x] Update utility functions
- [x] Create management command

### Phase 2: Frontend Updates
- [x] Update status display logic
- [x] Add new status styling
- [x] Implement shift void logic in metrics calculation

### Phase 3: Data Migration
- [ ] Run management command on existing data
- [ ] Verify status accuracy
- [ ] Update any hardcoded status references

### Phase 4: Testing & Validation
- [ ] Test with various time entry scenarios
- [ ] Verify shift void logic works correctly
- [ ] Validate metric calculations
- [ ] Test edge cases (night shifts, cross-midnight, etc.)

## Testing Scenarios

### 1. Normal Day Shift
- **Schedule**: 9:00 AM - 5:00 PM
- **Time In**: 8:55 AM, **Time Out**: 5:05 PM
- **Expected Status**: Present
- **Expected Metrics**: BH > 0, LT = 0, UT = 0

### 2. Late Arrival
- **Schedule**: 9:00 AM - 5:00 PM  
- **Time In**: 9:15 AM, **Time Out**: 5:00 PM
- **Expected Status**: Late
- **Expected Metrics**: BH > 0, LT = 15, UT = 0

### 3. Early Departure
- **Schedule**: 9:00 AM - 5:00 PM
- **Time In**: 9:00 AM, **Time Out**: 4:30 PM
- **Expected Status**: UnderTime
- **Expected Metrics**: BH > 0, LT = 0, UT = 30

### 4. Shift Void
- **Schedule**: 9:00 AM - 5:00 PM
- **Time In**: 7:00 AM, **Time Out**: 8:00 AM
- **Expected Status**: Shift Void
- **Expected Metrics**: BH = 0, LT = 0, UT = 0, ND = 0

### 5. Incomplete Shift
- **Schedule**: 9:00 AM - 5:00 PM
- **Time In**: 9:00 AM, **Time Out**: None
- **Expected Status**: Incomplete
- **Expected Metrics**: BH = 0, LT = 0, UT = 0, ND = 0

### 6. Suspiciously Short Shift
- **Schedule**: 11:00 PM - 9:00 AM (next day)
- **Time In**: 11:51 PM, **Time Out**: 11:52 PM
- **Expected Status**: Incomplete (less than 15 minutes)
- **Expected Metrics**: BH = 0, LT = 0, UT = 0, ND = 0

## Troubleshooting

### Common Issues

1. **Status not updating**: Ensure `calculate_comprehensive_status()` is called
2. **Metrics not zeroing**: Check shift void detection logic
3. **Frontend not reflecting changes**: Clear browser cache and refresh

### Debug Commands

```bash
# Check current status distribution
python manage.py shell
>>> from geo.models import DailyTimeSummary
>>> DailyTimeSummary.objects.values('status').annotate(count=Count('id')).order_by('-count')

# Test status calculation on specific record
>>> summary = DailyTimeSummary.objects.first()
>>> summary.calculate_comprehensive_status()
>>> print(f"Status: {summary.status}")
```

## Support

For issues or questions about the new status system:

1. Check the Django logs for errors
2. Run the management command with `--dry-run` to preview changes
3. Verify the status calculation logic in the model method
4. Test with sample data to isolate the issue

## Future Enhancements

1. **Status History**: Track status changes over time
2. **Custom Status Rules**: Allow per-department status customization
3. **Status Notifications**: Alert managers to status changes
4. **Status Analytics**: Dashboard showing status distribution trends
