# Dayshift Calculation Tests

This directory contains comprehensive test cases for dayshift scenarios, specifically designed to validate the calculation of BH (Billed Hours), LT (Late Time), UT (Undertime), and Early Time for regular day shifts.

## 🎯 Main Test Case

**Your Requested Scenario:**
- **Schedule:** 7:00 AM - 4:00 PM (9 hours)
- **Actual:** 6:40 AM - 4:10 PM (9 hours 30 minutes)

**Expected Results:**
- **BH (Billed Hours):** 8 hours (480 minutes)
- **ND (Night Differential):** 0 hours (dayshift)
- **UT (Undertime):** 0 minutes
- **LT (Late Time):** 0 minutes
- **Early Time:** 20 minutes

## 📊 Calculation Breakdown

### Step-by-Step Calculation:

1. **Gross Time Worked:** 6:40 AM - 4:10 PM = 9 hours 30 minutes = 570 minutes
2. **Break Deduction:** 1 hour (since shift > 8 hours) = 60 minutes
3. **Net Time Worked:** 570 - 60 = 510 minutes
4. **BH (Billed Hours):** Capped to scheduled time (9h - 1h break = 8h = 480 min)
5. **ND (Night Differential):** 0 (dayshift, no night hours)
6. **UT (Undertime):** 0 (no undertime since effective = scheduled)
7. **LT (Late Time):** 0 (no late arrival)
8. **Early Time:** 20 minutes (06:40 vs 07:00)

## 🧪 Test Files

### 1. `test_dayshift.js`
- Contains the main test logic and calculation functions
- Includes multiple dayshift test scenarios
- Exports functions for use in other files

### 2. `test_dayshift.html`
- Interactive test page with visual results
- Shows expected vs actual results
- Displays detailed console output
- Modern, responsive design

### 3. `test_calculations.js` (Updated)
- Enhanced with dayshift test cases
- Added functions for calculating late time and early time
- Comprehensive test suite for both night and day shifts

## 🚀 How to Run Tests

### Option 1: Browser Test Page
1. Open `test_dayshift.html` in a web browser
2. Click "Run Dayshift Tests" button
3. View results and console output

### Option 2: Console/Node.js
```javascript
// Import and run tests
import { runAllDayshiftTests } from './test_dayshift.js';

// Run all dayshift tests
const results = runAllDayshiftTests();
console.log(results);
```

### Option 3: Individual Test Cases
```javascript
import { runSingleTest, mainTestCase } from './test_dayshift.js';

// Run just the main test case
const result = runSingleTest(mainTestCase);
console.log(result);
```

## 📋 Test Scenarios Included

### 1. Main Test Case (Your Request)
- Schedule: 7:00 AM - 4:00 PM
- Actual: 6:40 AM - 4:10 PM
- Tests early arrival and late departure

### 2. Standard 8-Hour Shift
- Schedule: 8:00 AM - 5:00 PM
- Actual: 8:00 AM - 5:00 PM
- Perfect attendance scenario

### 3. Late Arrival
- Schedule: 8:00 AM - 5:00 PM
- Actual: 8:30 AM - 5:00 PM
- Tests late time calculation

### 4. Early Departure
- Schedule: 8:00 AM - 5:00 PM
- Actual: 8:00 AM - 3:00 PM
- Tests undertime calculation

### 5. Short Shift (No 1h Break)
- Schedule: 9:00 AM - 1:00 PM
- Actual: 9:00 AM - 1:00 PM
- Tests 30-minute break deduction

## 🔧 Key Functions

### `calculateBilledHours(timeIn, timeOut, scheduledIn, scheduledOut, date)`
- Calculates actual hours worked
- Applies break deductions automatically
- Caps time to scheduled hours (abuse prevention)

### `calculateLateMinutes(timeIn, scheduledIn, date)`
- Calculates late arrival time
- Returns positive minutes if late, 0 if on time or early

### `calculateEarlyMinutes(timeIn, scheduledIn, date)`
- Calculates early arrival time
- Returns positive minutes if early, 0 if on time or late

### `calculateUndertimeMinutes(timeIn, timeOut, scheduledIn, scheduledOut, date)`
- Calculates undertime based on scheduled vs actual hours
- Uses dynamic BH calculation with proper break consideration

### `calculateNightDifferential(timeIn, timeOut, scheduledIn, scheduledOut, date)`
- Calculates night differential hours
- Returns 0 for dayshift scenarios

## 📈 Expected Results Summary

| Test Case | BH | ND | UT | LT | Early |
|-----------|----|----|----|----|-------|
| Main Test | 8h | 0h | 0min | 0min | 20min |
| Standard | 8h | 0h | 0min | 0min | 0min |
| Late Arrival | 7.5h | 0h | 30min | 30min | 0min |
| Early Departure | 6h | 0h | 2h | 0min | 0min |
| Short Shift | 3.5h | 0h | 0min | 0min | 0min |

## 🎯 Key Testing Points

1. **Break Deduction Logic:** 1 hour for shifts ≥8 hours, 30 minutes for shifts ≥4 hours
2. **Abuse Prevention:** Early arrivals are capped to scheduled start time
3. **Late Departure Handling:** Late departures are capped to scheduled end time
4. **Dayshift vs Nightshift:** ND calculation returns 0 for day hours
5. **Time Precision:** All calculations use minute precision for accuracy

## 🐛 Troubleshooting

### Common Issues:
1. **Import Errors:** Ensure all files are in the same directory
2. **Module Loading:** Use a local web server for ES6 modules
3. **Console Output:** Check browser console for detailed logs
4. **Test Failures:** Review expected vs actual values for discrepancies

### Running Locally:
```bash
# Start a local web server
python -m http.server 8000
# or
npx serve .

# Open test_dayshift.html in browser
```

## 📝 Notes

- All times are in 24-hour format (HH:MM)
- Break deductions are automatic based on shift duration
- Abuse prevention caps actual times to scheduled times
- Tests include tolerance for floating-point precision
- Console output provides detailed calculation steps

## 🔄 Updates

- **v1.0:** Initial dayshift test implementation
- **v1.1:** Added early time calculation
- **v1.2:** Enhanced test coverage and documentation
- **v1.3:** Improved HTML test interface

---

For questions or issues, refer to the main test documentation or check the console output for detailed calculation steps.
