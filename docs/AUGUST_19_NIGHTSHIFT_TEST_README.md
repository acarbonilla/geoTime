# August 19, 2020 - Night Shift Test Case

## Overview
This test case validates the calculation of Billed Hours (BH) and Night Differential (ND) for a night shift schedule with early arrival and overtime. This is a **clean test** with no prior schedule on this date, which helps isolate any issues with the night differential calculation.

## Test Scenario
- **Date**: August 19, 2020
- **Schedule**: 7:00 PM - 4:00 AM (night shift, crosses midnight)
- **Time In**: 6:40 PM (20 minutes early arrival)
- **Time Out**: 4:10 AM (next day, 10 minutes overtime)
- **Shift Type**: Night Shift (is_night_shift = True)
- **Test Type**: Clean test - no prior schedule on this date

## Expected Calculations

### 1. Billed Hours (BH)
- **Calculation**: Actual Time Worked = Time Out - Time In
- **Time In**: 18:40 (6:40 PM) on August 19
- **Time Out**: 04:10 (4:10 AM) on August 20
- **Duration**: 9 hours 30 minutes
- **Break Deduction**: 1 hour (flexible break system)
- **Final BH**: 8.50 hours

### 2. Night Differential (ND)
- **ND Period**: 10:00 PM (22:00) to 6:00 AM (06:00)
- **Total ND Hours**: 6 hours (from 10:00 PM to 4:00 AM)
- **HR Rule**: Subtract 1 hour break from ND
- **Final ND**: 5.00 hours

### 3. Late Calculation
- **Scheduled Start**: 19:00 (7:00 PM)
- **Actual Start**: 18:40 (6:40 PM)
- **Difference**: -20 minutes (early arrival)
- **Grace Period**: 5 minutes
- **Final Late**: 0 minutes (early arrival)

### 4. Under Time (UT)
- **Scheduled Duration**: 9 hours (7:00 PM to 4:00 AM)
- **Scheduled Work Time**: 8 hours (after 1-hour break deduction)
- **Actual Work Time**: 8.50 hours
- **UT**: 0 minutes (no undertime, actually overtime)

### 5. Overtime
- **Threshold**: 8.0 hours
- **Actual Work**: 8.50 hours
- **Overtime**: 0.50 hours

## Test Files

### 1. `test_august19_nightshift.py`
Main test script that:
- Creates test data (employee, schedule, time entries)
- Calculates expected values manually
- Runs system calculations
- Compares results and reports success/failure

### 2. `run_august19_test.ps1`
PowerShell script for Windows environments to run the test.

### 3. `run_august19_test.sh`
Bash script for Unix/Linux environments to run the test.

## Running the Test

### Windows (PowerShell)
```powershell
cd backend
.\run_august19_test.ps1
```

### Unix/Linux (Bash)
```bash
cd backend
chmod +x run_august19_test.sh
./run_august19_test.sh
```

### Direct Python Execution
```bash
cd backend
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
python test_august19_nightshift.py
```

## Test Data Creation

The test script will:
1. Create or use existing test employee (ALS00005)
2. Create schedule for August 19, 2020: 7:00 PM - 4:00 AM
3. Create time entry for 6:40 PM (time in)
4. Create time entry for 4:10 AM next day (time out)
5. Calculate daily summary using the system
6. Compare results with manual calculations

## Key Validation Points

1. **Cross-day Handling**: Ensures night shifts crossing midnight are handled correctly
2. **Early Arrival**: Validates that early arrivals don't count as late
3. **Break Deduction**: Confirms 1-hour break is properly deducted from ND
4. **Overtime Calculation**: Verifies overtime is calculated correctly for night shifts
5. **Night Differential**: Ensures ND is calculated for the correct time period (10 PM - 6 AM)
6. **Clean Test**: No prior schedule interference, isolated testing environment

## Expected Output

The test should show:
- ✅ All calculations match expected values
- BH: 8.50 hours
- Late: 0 minutes
- UT: 0 minutes
- Overtime: 0.50 hours
- ND: 5.00 hours (after 1-hour break deduction)

## Why This Test Case?

This test case is particularly important because:

1. **Clean Environment**: No prior schedule data to interfere with calculations
2. **Different Year**: Tests the system with 2020 data (different from August 12, 2025)
3. **Isolation**: Helps identify if the night differential calculation issue is data-specific or systemic
4. **Validation**: Confirms that the timezone fix we implemented works for different dates

## Notes

- This test case specifically validates the HR rule of subtracting 1 hour break from night differential
- The flexible break system is used (1 hour break deducted from total schedule)
- Early arrivals within grace period are not penalized
- Night shifts are properly identified and handled
- Cross-day time entries are correctly processed
- This is a clean test with no prior schedule interference
