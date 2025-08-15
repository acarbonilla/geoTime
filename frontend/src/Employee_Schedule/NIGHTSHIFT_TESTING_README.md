# 🌙 Night Shift Grouping Test Suite

## 🎯 **Overview**

This test suite provides comprehensive testing tools for the night shift grouping logic implemented in `ScheduleReport.js`. It includes both a visual test interface and a programmatic test runner.

## 📁 **Files**

### 1. **`test_nightshift_grouping.html`** - Visual Test Interface
- **Purpose**: Interactive web interface for testing night shift scenarios
- **Features**: Editable date/time fields, predefined scenarios, real-time results
- **Usage**: Open in any web browser

### 2. **`test_nightshift_runner.js`** - Programmatic Test Runner
- **Purpose**: Automated testing of the grouping logic
- **Features**: 5 predefined test scenarios, console output, validation
- **Usage**: Run in browser console on Schedule Report page

## 🚀 **Quick Start**

### **Option 1: Visual Testing (Recommended for Manual Testing)**

1. **Open the test interface:**
   ```bash
   # Navigate to the file in your browser
   frontend/src/Employee_Schedule/test_nightshift_grouping.html
   ```

2. **Select a scenario:**
   - Basic Night Shift
   - Early Timeout
   - Incomplete Night Shift
   - Multiple Night Shifts
   - Mixed Schedule
   - Custom Test

3. **Edit any fields:**
   - Change dates, times, scheduled hours
   - Modify time-in/time-out values
   - Adjust day selections

4. **Test the logic:**
   - Click "🧪 Test Grouping Logic"
   - View results in real-time
   - Check debug information

### **Option 2: Programmatic Testing (Recommended for Automated Testing)**

1. **Open your Schedule Report page** in the browser

2. **Open browser console** (F12 → Console)

3. **Load the test runner:**
   ```javascript
   // Copy and paste the entire content of test_nightshift_runner.js
   // Or load it as a script tag
   ```

4. **Run the tests:**
   ```javascript
   runNightShiftTests()
   ```

## 📋 **Test Scenarios**

### **1. Basic Night Shift** ✅
- **Input**: Aug 15 (9:41 PM in) → Aug 16 (12:21 AM out)
- **Expected**: Grouped on Aug 15 row, Aug 16 row preserved
- **Logic**: Standard night shift crossing midnight

### **2. Early Timeout (Before 6 AM)** ✅
- **Input**: Aug 20 (10:45 PM in) → Aug 21 (3:15 AM out)
- **Expected**: Grouped on Aug 20 row, Aug 21 row preserved
- **Logic**: Very early timeout detection

### **3. Incomplete Night Shift** ⚠️
- **Input**: Aug 25 (8:55 PM in) → No timeout
- **Expected**: Marked as incomplete, Aug 26 row available
- **Logic**: Missing timeout handling

### **4. Regular Day Shift** 📋
- **Input**: Aug 18-19 (9 AM - 5 PM shifts)
- **Expected**: No grouping, standard display
- **Logic**: Day shift detection

### **5. Late Night Shift Start** ❌
- **Input**: Aug 30 (12:15 AM in) → Aug 31 (7:45 AM out)
- **Expected**: No grouping (starts at midnight)
- **Logic**: Boundary condition testing

## 🧪 **Testing the Logic**

### **What Gets Tested**

1. **Night Shift Detection**
   - Scheduled start time ≥ 6:00 PM (18:00)
   - Scheduled end time < 12:00 PM (12:00)

2. **Timeout Detection**
   - Main `time_out` field before 6:00 AM
   - `time_entries` array before 6:00 AM

3. **Row Preservation**
   - Next day row maintained for new time-ins
   - Proper grouping without data loss

4. **Display Formatting**
   - Date ranges (e.g., "Aug 15 → Aug 16")
   - Time indicators (e.g., "12:21 AM (Next day: Aug 16)")
   - Status indicators ("🌙 Nightshift", "📝 Previous timeout used")

### **Validation Rules**

```javascript
// Night shift criteria
const isNightshift = scheduledInHour >= 18 && scheduledOutHour < 12;

// Timeout detection
const hasNextDayTimeout = timeoutHour < 6;

// Row preservation
const hasPreviousNightshiftTimeout = true; // For next day rows
```

## 🎨 **Visual Indicators**

### **Row Styling**
- **🔵 Blue Background**: Night shift rows
- **🟢 Green Background**: Next day rows (available for new time-ins)
- **⚪ White Background**: Regular day shifts

### **Status Badges**
- **🌙 Nightshift**: Complete night shift
- **📝 Previous timeout used**: Next day row
- **⚠️ Incomplete**: Missing timeout
- **📋 Regular**: Standard day shift

## 🔧 **Custom Testing**

### **Modifying Test Data**

1. **Edit the HTML form:**
   - Change any date or time field
   - Modify scheduled hours
   - Adjust day selections

2. **Create new scenarios:**
   ```javascript
   // Add to scenarios object in test_nightshift_runner.js
   custom_scenario: {
       name: "My Custom Test",
       description: "Custom night shift scenario",
       input: { /* your data */ },
       expected: { /* expected results */ }
   }
   ```

### **Testing Edge Cases**

- **Very early timeouts**: 1:00 AM, 2:30 AM
- **Late night starts**: 11:00 PM, 11:30 PM
- **Short night shifts**: 10:00 PM - 2:00 AM
- **Long night shifts**: 8:00 PM - 8:00 AM
- **Weekend patterns**: Fri → Sat, Sat → Sun

## 📊 **Interpreting Results**

### **Successful Grouping**
```
✅ Nightshift: Yes
✅ Has Time-in: Yes  
✅ Has Next Day Timeout: Yes

📊 Grouped Records:
   1. 🌙 Nightshift: Aug 15 → Aug 16 | 12:21 AM (Next day: Aug 16)
   2. 📅 Next Day: Aug 16 | -
```

### **Incomplete Night Shift**
```
✅ Nightshift: Yes
✅ Has Time-in: Yes
❌ Has Next Day Timeout: No

📊 Grouped Records:
   1. 🌙 Nightshift: Aug 25 (Incomplete) | -
   2. 📋 Regular: Aug 26 | -
```

### **Regular Day Shift**
```
❌ Nightshift: No
❌ Has Time-in: No
❌ Has Next Day Timeout: No

📊 Grouped Records:
   1. 📋 Regular: Aug 18 | 5:15 PM
   2. 📋 Regular: Aug 19 | 5:10 PM
```

## 🐛 **Debugging**

### **Common Issues**

1. **Wrong time format**: Ensure times are in HH:MM format
2. **Date mismatch**: Check that dates are consecutive
3. **Missing fields**: All required fields must be present
4. **Logic errors**: Verify night shift criteria

### **Debug Information**

The test interface shows:
- **Input data**: What was entered
- **Logic analysis**: How the system interpreted the data
- **Grouping results**: Final output with row types
- **JSON output**: Raw data for detailed inspection

## 🚀 **Integration with Real System**

### **Testing Against Live Data**

1. **Load the test runner** on your Schedule Report page
2. **Compare results** with the actual grouping logic
3. **Verify consistency** between test and production
4. **Report discrepancies** if found

### **Performance Testing**

- Test with large datasets (100+ records)
- Verify grouping logic performance
- Check memory usage with complex scenarios

## 📈 **Test Results**

### **Expected Success Rate: 100%**

All predefined scenarios should pass:
- ✅ Basic Night Shift
- ✅ Early Timeout
- ✅ Incomplete Night Shift  
- ✅ Regular Day Shift
- ✅ Late Night Shift Start

### **If Tests Fail**

1. **Check the logic** in `ScheduleReport.js`
2. **Verify input data** format
3. **Review grouping criteria** (18:00+ start, <12:00 end)
4. **Check timeout detection** (<6:00 AM rule)

## 🎯 **Next Steps**

### **After Testing**

1. **Verify all scenarios pass**
2. **Test with real data** from your system
3. **Create additional scenarios** if needed
4. **Document any edge cases** found

### **Continuous Testing**

- Run tests after code changes
- Test new night shift patterns
- Validate export functionality
- Monitor performance impact

---

**Happy Testing! 🧪✨**

This test suite ensures your night shift grouping logic works correctly across all scenarios and edge cases.
