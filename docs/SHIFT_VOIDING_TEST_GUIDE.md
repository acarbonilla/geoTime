# Shift Voiding Logic Test Guide

## Overview
This guide explains how to test the newly implemented "shift voiding" logic in the `TeamLeaderScheduleReport.js` component. The logic sets BH (Billed Hours) and ND (Night Differential) to 0 when both Time In and Time Out occur before the Scheduled In time.

## What Gets Voided
- **BH (Billed Hours)**: Set to 0 when shift is voided
- **ND (Night Differential)**: Set to 0 when shift is voided
- **LT (Late Time)**: Not affected by voiding logic
- **UT (Undertime)**: Not affected by voiding logic

## Voiding Conditions
A shift is considered "voided" when:
1. Both `Time In` AND `Time Out` occur BEFORE `Scheduled In`
2. All times must be valid and present
3. The logic works for both regular shifts and nightshifts

## Test Scenarios

### 1. Normal Shift (Should NOT be voided)
- **Time In**: 09:00 AM
- **Time Out**: 05:00 PM
- **Scheduled In**: 09:00 AM
- **Scheduled Out**: 05:00 PM
- **Expected Result**: BH and ND calculated normally

### 2. Early Clock-in (Should NOT be voided)
- **Time In**: 08:00 AM (early)
- **Time Out**: 05:00 PM (normal)
- **Scheduled In**: 09:00 AM
- **Scheduled Out**: 05:00 PM
- **Expected Result**: BH and ND calculated normally (early clock-in is allowed)

### 3. Both Times Before Schedule (SHOULD be voided - August 14 scenario)
- **Time In**: 01:19 AM
- **Time Out**: 02:30 AM
- **Scheduled In**: 02:00 AM
- **Scheduled Out**: 10:00 AM
- **Expected Result**: BH = 0, ND = 0, "⚠️ Shift voided" note displayed

### 4. Nightshift - Both Times Before Schedule (SHOULD be voided)
- **Time In**: 08:00 PM
- **Time Out**: 10:00 PM
- **Scheduled In**: 09:00 PM
- **Scheduled Out**: 06:00 AM
- **Expected Result**: BH = 0, ND = 0, "⚠️ Shift voided" note displayed

### 5. Nightshift - Normal Times (Should NOT be voided)
- **Time In**: 09:00 PM
- **Time Out**: 06:00 AM
- **Scheduled In**: 09:00 PM
- **Scheduled Out**: 06:00 AM
- **Expected Result**: BH and ND calculated normally

## How to Test

### Method 1: Browser Console Test
1. Navigate to the TeamLeaderScheduleReport page
2. Open browser console (F12)
3. Copy and paste the content of `test_shift_voiding_browser.js`
4. Press Enter to run the tests
5. Review the console output for test results

### Method 2: Component Test Function
1. Navigate to the TeamLeaderScheduleReport page
2. Open browser console (F12)
3. Set test data:
   ```javascript
   window.testShiftVoidingData = {
     timeIn: "01:19 AM",
     timeOut: "02:30 AM", 
     scheduledIn: "02:00 AM",
     scheduledOut: "10:00 AM",
     date: "2025-08-14"
   };
   ```
4. Run the test:
   ```javascript
   window.testShiftVoidingComponent();
   ```

### Method 3: Manual UI Testing
1. Navigate to TeamLeaderScheduleReport
2. Select an employee with voided shift data (e.g., doejames on August 14)
3. Look for "⚠️ Shift voided" notes in the BH and ND columns
4. Verify that BH and ND show 0 for voided shifts
5. Check console logs for "🚫 Shift voided" messages

## Console Logs to Look For

### When Shift is Voided:
```
🚫 Shift voided: Shift voided: Time In (1:19 AM) and Time Out (2:30 AM) both occurred before Scheduled In (2:00 AM)
🚫 BH set to 0 due to voided shift
🚫 ND set to 0 due to voided shift
```

### When Shift is NOT Voided:
```
💼 BH calculation: { actualDurationMinutes: 480, breakDeduction: 60, bh: 420, isVoidedShift: false, voidReason: 'N/A' }
🌙 ND calculation: { timeIn: '9:00 PM', timeOut: '6:00 AM', nightHours: '22:00-05:59', nightMinutes: 540, nd: 540, ... }
```

## UI Indicators

### Main Report Table:
- BH column shows "⚠️ Shift voided" note below the value when voided
- ND column shows "⚠️ Shift voided" note below the value when voided

### Individual Member Report Table:
- Same "⚠️ Shift voided" notes appear in both BH and ND columns

## Expected Behavior Summary

| Scenario | BH | ND | UI Note | Console Log |
|----------|----|----|---------|-------------|
| Normal shift | Calculated normally | Calculated normally | None | Normal calculation logs |
| Early clock-in only | Calculated normally | Calculated normally | None | Normal calculation logs |
| Both times before schedule | 0 | 0 | "⚠️ Shift voided" | "🚫 Shift voided" logs |
| Nightshift voided | 0 | 0 | "⚠️ Shift voided" | "🚫 Shift voided" logs |
| Nightshift normal | Calculated normally | Calculated normally | None | Normal calculation logs |

## Troubleshooting

### If tests fail:
1. Check that moment.js is available in the page
2. Verify the test data format matches expected format
3. Check console for any JavaScript errors
4. Ensure you're on the correct page (TeamLeaderScheduleReport)

### If voiding logic doesn't work:
1. Check console for "🚫 Shift voided" messages
2. Verify the `calculateGroupedMetrics` function is being called
3. Check that scheduled times are being parsed correctly
4. Verify the time comparison logic in the component

## Code Location
The shift voiding logic is implemented in:
- **File**: `frontend/src/TeamLeader_Report/TeamLeaderScheduleReport.js`
- **Function**: `calculateGroupedMetrics` (around lines 1075-1090)
- **UI Notes**: Added to BH and ND table cells (around lines 2270-2296 and 2719-2745)
