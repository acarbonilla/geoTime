# 🧪 BH, ND, UT Calculation Test Suite

This test suite validates the Billed Hours (BH), Night Differential (ND), and Undertime (UT) calculations for various night shift scenarios.

## 📁 Files Created

1. **`test_calculations.js`** - Core test logic and validation functions
2. **`test_page.html`** - Interactive web interface for running tests
3. **`TEST_README.md`** - This documentation file

## 🚀 How to Use

### Option 1: Web Interface (Recommended)

1. Open `test_page.html` in your web browser
2. Click the **"🚀 Run All Tests"** button
3. View results in the interactive interface
4. Check console output for detailed calculations

### Option 2: Console Testing

1. Open browser console on any page
2. Import and run the test functions:
```javascript
import { validateCalculations } from './test_calculations.js';
const results = validateCalculations();
```

### Option 3: Node.js Testing

1. Run the test file directly:
```bash
node test_calculations.js
```

## 📋 Test Cases Included

### **Test Case 1: Standard Night Shift**
- **Schedule**: 7:00 PM - 4:00 AM
- **Actual**: 6:40 PM - 4:05 AM
- **Expected BH**: 505 minutes (8.42 hours)
- **Expected ND**: 5.08 hours
- **Expected UT**: 0 minutes

### **Test Case 2: Late Arrival Night Shift**
- **Schedule**: 7:00 PM - 4:00 AM
- **Actual**: 7:30 PM - 4:00 AM
- **Expected BH**: 450 minutes (7.5 hours)
- **Expected ND**: 5.5 hours
- **Expected UT**: 30 minutes

### **Test Case 3: Early Departure Night Shift**
- **Schedule**: 7:00 PM - 4:00 AM
- **Actual**: 7:00 PM - 2:00 AM
- **Expected BH**: 360 minutes (6 hours)
- **Expected ND**: 3 hours
- **Expected UT**: 120 minutes

### **Test Case 4: Short Night Shift (No 1h Break)**
- **Schedule**: 8:00 PM - 2:00 AM
- **Actual**: 8:00 PM - 2:00 AM
- **Expected BH**: 330 minutes (5.5 hours)
- **Expected ND**: 3.5 hours
- **Expected UT**: 0 minutes

### **Test Case 5: Very Short Night Shift**
- **Schedule**: 9:00 PM - 1:00 AM
- **Actual**: 9:00 PM - 1:00 AM
- **Expected BH**: 210 minutes (3.5 hours)
- **Expected ND**: 2.5 hours
- **Expected UT**: 0 minutes

### **Test Case 6: Extended Night Shift**
- **Schedule**: 6:00 PM - 6:00 AM
- **Actual**: 6:00 PM - 6:00 AM
- **Expected BH**: 660 minutes (11 hours)
- **Expected ND**: 7 hours
- **Expected UT**: 0 minutes

### **Test Case 7: Partial Night Shift (Day + Night)**
- **Schedule**: 3:00 PM - 3:00 AM
- **Actual**: 3:00 PM - 3:00 AM
- **Expected BH**: 660 minutes (11 hours)
- **Expected ND**: 4 hours (only 22:00-03:00)
- **Expected UT**: 0 minutes

### **Test Case 8: Edge Case - Just Under 8 Hours**
- **Schedule**: 7:00 PM - 2:30 AM
- **Actual**: 7:00 PM - 2:30 AM
- **Expected BH**: 420 minutes (7 hours)
- **Expected ND**: 4 hours
- **Expected UT**: 0 minutes

### **Test Case 9: Edge Case - Exactly 8 Hours**
- **Schedule**: 7:00 PM - 3:00 AM
- **Actual**: 7:00 PM - 3:00 AM
- **Expected BH**: 420 minutes (7 hours)
- **Expected ND**: 4 hours
- **Expected UT**: 0 minutes

### **Test Case 10: Irregular Night Shift**
- **Schedule**: 8:30 PM - 5:30 AM
- **Actual**: 8:15 PM - 5:45 AM
- **Expected BH**: 510 minutes (8.5 hours)
- **Expected ND**: 6.5 hours
- **Expected UT**: 0 minutes

## 🔧 Calculation Rules

### **BH (Billed Hours)**
- **Formula**: Actual time worked minus break deduction
- **Break Rules**:
  - ≥8 hours: Deduct 1 hour (60 minutes)
  - ≥4 hours: Deduct 30 minutes
  - <4 hours: No deduction

### **ND (Night Differential)**
- **Period**: 10:00 PM (22:00) to 6:00 AM (06:00)
- **Formula**: Hours within ND period minus break deduction
- **Break Rules**: Same as BH

### **UT (Undertime)**
- **Formula**: (Scheduled Hours - Break) - Dynamic BH
- **Break Rules**: Applied to scheduled time before UT calculation

## 📊 Validation Criteria

- **BH Tolerance**: ±1 minute
- **ND Tolerance**: ±0.1 hour
- **UT Tolerance**: ±1 minute

## 🎯 Expected Behaviors

1. **Early Clock In**: BH starts from actual time (not scheduled)
2. **Late Clock Out**: BH includes overtime (not capped at scheduled)
3. **Night Shifts**: Properly handle midnight spanning
4. **Break Deduction**: Applied consistently to BH and ND
5. **UT Calculation**: Reflects actual undertime after breaks

## 🚨 Troubleshooting

### **Common Issues**

1. **Moment.js Not Loaded**: Ensure moment.js is available
2. **Import Errors**: Check file paths and module syntax
3. **Calculation Mismatches**: Verify expected values match business rules

### **Debug Mode**

Enable detailed logging by checking browser console for:
- BH calculation steps
- ND period calculations
- UT breakdown
- Break deduction details

## 📈 Success Metrics

- **All Tests Pass**: ✅ Calculations working correctly
- **Some Tests Fail**: ⚠️ Review specific calculation logic
- **Console Output**: Detailed breakdown of each calculation

## 🔄 Updating Tests

To add new test cases:

1. Add to `testCases` array in both files
2. Include expected values based on business rules
3. Run validation to ensure accuracy
4. Update documentation if needed

## 📞 Support

For questions about test cases or calculation logic:
1. Check console output for detailed calculations
2. Review business rules in the main ScheduleReport component
3. Compare expected vs actual results for failed tests

---

**Happy Testing! 🎉**
