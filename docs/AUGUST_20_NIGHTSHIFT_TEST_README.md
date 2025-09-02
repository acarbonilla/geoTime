# August 20, 2025 Night Shift Test Case

## Overview
This test case validates the time calculation system for a night shift scenario that crosses midnight. It tests the calculation of Late (LT), Billed Hours (BH), Undertime (UT), and Night Differential (ND) for a specific night shift schedule.

## ✅ Test Status: WORKING PERFECTLY
**All calculations are correct and the test passes successfully!**

The test case has been updated to use timezone-aware datetime objects, eliminating the Django warnings about naive datetimes.

## Test Scenario

### Schedule Details
- **Date**: August 20, 2025 (Wednesday)
- **Schedule**: 7:00 PM - 4:00 AM (night shift crossing midnight)
- **Shift Type**: Night Shift (crosses midnight)
- **Total Scheduled Hours**: 9 hours (including 1 hour flexible break)

### Actual Time Entries
- **Time In**: 7:40 PM (40 minutes late from scheduled 7:00 PM)
- **Time Out**: 2:00 AM (2 hours early from scheduled 4:00 AM)

## Expected Calculations

### 1. Late (LT) - Late Time
- **Calculation**: Actual Time In - Scheduled Time In - Grace Period
- **Values**: 7:40 PM - 7:00 PM - 5 minutes = 35 minutes
- **Result**: 35 minutes late (after 5-minute grace period)

### 2. Billed Hours (BH) - Actual Work Time
- **Calculation**: Total Time Worked - Break Time
- **Values**: 
  - Total Time: 7:40 PM to 2:00 AM = 6 hours 20 minutes
  - Break Time: 1 hour (flexible break)
  - Billed Hours: 6.33 hours - 1.00 hour = 5.33 hours
- **Result**: 5.33 hours (5 hours 20 minutes)

### 3. Undertime (UT) - Shortfall from Schedule
- **Calculation**: Scheduled Work Time - Billed Hours
- **Values**:
  - Scheduled Work Time: 8 hours (9 hours total - 1 hour break)
  - Billed Hours: 5.33 hours
  - Undertime: 8.00 - 5.33 = 2.67 hours
- **Result**: 2.67 hours (2 hours 40 minutes)

### 4. Night Differential (ND) - Night Shift Premium
- **Calculation**: Hours worked between 10:00 PM - 6:00 AM, minus 1 hour break
- **Values**:
  - ND Period: 10:00 PM to 6:00 AM
  - Work Period: 7:40 PM to 2:00 AM
  - ND Overlap: 10:00 PM to 2:00 AM = 4 hours
  - Break Deduction: 1 hour
  - Final ND: 4.00 - 1.00 = 3.00 hours
- **Result**: 3.00 hours

## Test Case Files

### Main Test Script
- **File**: `backend/test_august20_nightshift.py`
- **Purpose**: Creates test data and runs calculations
- **Dependencies**: Django environment, geo models
- **Status**: ✅ Working perfectly with timezone-aware datetime objects

### Execution Scripts
- **PowerShell**: `run_august20_nightshift_test.ps1` (Windows)
- **Bash**: `run_august20_nightshift_test.sh` (Unix/Linux)

## Running the Test

### Prerequisites
1. Django backend environment set up
2. Virtual environment activated
3. Database migrations applied
4. Required models available

### Execution Steps

#### Windows (PowerShell)
```powershell
.\run_august20_nightshift_test.ps1
```

#### Unix/Linux (Bash)
```bash
chmod +x run_august20_nightshift_test.sh
./run_august20_nightshift_test.sh
```

#### Manual Execution
```bash
cd backend
source .venv/bin/activate  # or .venv\Scripts\Activate.ps1 on Windows
python test_august20_nightshift.py
```

## Test Data Creation

The test case creates the following test data:

### 1. Location
- **Name**: Test Office - Night Shift
- **Coordinates**: Manila, Philippines (14.5995, 120.9842)
- **Timezone**: Asia/Manila (UTC+8)

### 2. Department
- **Name**: Night Shift Department
- **Code**: NIGHT

### 3. Employee
- **Username**: testuser_august20_night
- **Employee ID**: NIGHT001
- **Position**: Night Shift Worker
- **Configuration**:
  - Daily Work Hours: 8.00
  - Flexible Break: 1.00 hour
  - Grace Period: 5 minutes
  - Overtime Threshold: 8.00 hours

### 4. Schedule Template
- **Name**: Night Shift 7PM-4AM
- **Time In**: 7:00 PM
- **Time Out**: 4:00 AM
- **Night Shift**: True (crosses midnight)

### 5. Employee Schedule
- **Date**: August 20, 2025
- **Scheduled In**: 7:00 PM
- **Scheduled Out**: 4:00 AM
- **Night Shift**: True

### 6. Time Entries
- **Time In**: 7:40 PM (August 20, 2025) - Timezone-aware
- **Time Out**: 2:00 AM (August 21, 2025) - Timezone-aware

## Calculation Logic

### Late Calculation
```python
late_minutes = actual_time_in - scheduled_time_in
late_after_grace = max(0, late_minutes - grace_period)
```

### Billed Hours Calculation
```python
total_minutes = time_out - time_in  # Handle overnight
billed_minutes = total_minutes - break_minutes
billed_hours = billed_minutes / 60
```

### Undertime Calculation
```python
scheduled_work_minutes = scheduled_duration - break_minutes
undertime_minutes = max(0, scheduled_work_minutes - billed_minutes)
```

### Night Differential Calculation
```python
nd_overlap = overlap(work_period, nd_period_10pm_to_6am)
nd_hours = nd_overlap_minutes / 60
final_nd = max(0, nd_hours - 1.0)  # 1 hour break deduction
```

## Expected Results Summary

| Metric | Expected Value | Description |
|--------|----------------|-------------|
| **Late (LT)** | 35 minutes | Time late after grace period |
| **Billed Hours (BH)** | 5.33 hours | Actual work time minus break |
| **Undertime (UT)** | 2.67 hours | Shortfall from scheduled work time |
| **Night Differential (ND)** | 3.00 hours | Night shift premium hours |

## Validation

The test case performs the following validations:

1. **Data Creation**: Ensures all required test data is created
2. **Calculation Execution**: Runs the system's calculation logic
3. **Manual Verification**: Calculates expected values manually
4. **Comparison**: Compares system results with expected values
5. **Assessment**: Provides overall pass/fail assessment

## Recent Fixes

### ✅ Timezone Warnings Fixed
- **Issue**: Django was showing warnings about naive datetime objects
- **Solution**: Updated test to use `timezone.make_aware()` for time entries
- **Result**: Clean execution without warnings

### ✅ All Calculations Verified
- **Status**: All metrics (LT, BH, UT, ND) are calculating correctly
- **Validation**: Manual calculations match system calculations exactly
- **Assessment**: ✓ ALL CALCULATIONS ARE CORRECT!

## Troubleshooting

### Common Issues

1. **Django Environment**: Ensure Django is properly set up
2. **Database**: Check that migrations are applied
3. **Virtual Environment**: Verify virtual environment is activated
4. **Model Dependencies**: Ensure all required models exist

### Debug Information

The test case provides detailed output including:
- Step-by-step calculation details
- Expected vs. actual values
- Detailed breakdown of each metric
- Overall assessment of calculations

## Business Rules Applied

1. **Grace Period**: 5-minute grace period before late calculation
2. **Break Deduction**: 1-hour flexible break deducted from total time
3. **Night Differential**: 10:00 PM to 6:00 AM period with 1-hour break deduction
4. **Overnight Handling**: Proper handling of shifts crossing midnight
5. **Abuse Prevention**: Rounding early arrivals and late departures to scheduled times

## Use Cases

This test case validates:
- Night shift calculations crossing midnight
- Late arrival handling
- Early departure handling
- Break time deductions
- Night differential calculations
- Overtime and undertime calculations
- Schedule compliance tracking

## Future Enhancements

Potential improvements for the test case:
1. Additional edge cases (holidays, weekends)
2. Multiple break scenarios
3. Overtime threshold testing
4. Different grace period configurations
5. Various night shift schedules
