/**
 * Test Script for BH, ND, and UT Calculations
 * 
 * This script validates the calculation functions against expected results
 * for various night shift scenarios.
 */

import moment from 'moment';

// Mock the calculateBilledHours function for testing
const calculateBilledHours = (timeIn, timeOut, recordDate) => {
  if (!timeIn || !timeOut || timeIn === '-' || timeOut === '-') {
    return 0;
  }

  try {
    const baseDate = moment(recordDate, 'YYYY-MM-DD');
    if (!baseDate.isValid()) {
      return 0;
    }

    // Parse actual time worked (time out - time in)
    const timeInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeIn}`);
    let timeOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeOut}`);
    
    if (!timeInMoment.isValid() || !timeOutMoment.isValid()) {
      return 0;
    }

    // Handle night shifts that span midnight
    if (timeOutMoment.isBefore(timeInMoment)) {
      timeOutMoment = moment(timeOutMoment).add(1, 'day');
    }

    // Calculate actual duration worked in minutes
    let durationMinutes = timeOutMoment.diff(timeInMoment, 'minutes');
    
    // Ensure duration is positive
    if (durationMinutes < 0) {
      console.error('Invalid duration calculation:', { timeIn, timeOut, durationMinutes });
      return 0;
    }

    // Apply break deduction based on shift duration
    let breakDeduction = 0;
    if (durationMinutes >= 480) { // 8 hours or more
      breakDeduction = 60; // 1 hour break
      durationMinutes -= 60;
    } else if (durationMinutes >= 240) { // 4 hours or more
      breakDeduction = 30; // 30 minutes break
      durationMinutes -= 30;
    }

    console.log(`BH calculation for ${recordDate}: Actual time worked ${timeInMoment.format('HH:mm')} - ${timeOutMoment.format('HH:mm')} = ${durationMinutes + breakDeduction} minutes - ${breakDeduction} minutes break = ${durationMinutes} minutes (${(durationMinutes/60).toFixed(2)} hours)`);
    
    return Math.max(0, durationMinutes);
  } catch (error) {
    console.error('Error calculating billed hours:', error);
    return 0;
  }
};

// Mock the calculateNightDifferential function for testing
const calculateNightDifferential = (timeIn, timeOut, recordDate) => {
  console.log('calculateNightDifferential called with:', { timeIn, timeOut, recordDate });
  
  if (!timeIn || !timeOut || timeIn === '-' || timeOut === '-') {
    console.log('Invalid input, returning 0');
    return 0;
  }
  
  const baseDate = moment(recordDate, 'YYYY-MM-DD');
  if (!baseDate.isValid()) {
    console.log('Invalid record date, returning 0');
    return 0;
  }
  
  const timeInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeIn}`);
  let timeOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeOut}`);
  
  if (!timeInMoment.isValid() || !timeOutMoment.isValid()) {
    console.log('Invalid moments, returning 0');
    return 0;
  }
  
  // If time out is before time in, it means the shift spans midnight
  if (timeOutMoment.isBefore(timeInMoment)) {
    timeOutMoment = moment(timeOutMoment).add(1, 'day');
    console.log('Shift spans midnight, adjusted timeOutMoment:', timeOutMoment.format('YYYY-MM-DD HH:mm:ss'));
  }
  
  let ndHours = 0;
  
  // ND period: 10:00 PM (22:00) to 6:00 AM (06:00) of the next day
  const ndStart = moment(timeInMoment).set({ hour: 22, minute: 0, second: 0 });
  
  let ndEnd;
  if (timeOutMoment.isBefore(timeInMoment)) {
    // Shift spans midnight, so ND end is 6 AM of the next day
    ndEnd = moment(timeInMoment).add(1, 'day').set({ hour: 6, minute: 0, second: 0 });
  } else {
    // Same day shift, so ND end is 6 AM of the same day
    ndEnd = moment(timeInMoment).set({ hour: 6, minute: 0, second: 0 });
  }
  
  // If time in is after ND start, adjust ND start to time in
  if (timeInMoment.isAfter(ndStart)) {
    ndStart.set({ hour: timeInMoment.hour(), minute: timeInMoment.minute(), second: timeInMoment.second() });
  }
  
  // If time out is before ND end, adjust ND end to time out
  if (timeOutMoment.isBefore(ndEnd)) {
    ndEnd.set({ hour: timeOutMoment.hour(), minute: timeOutMoment.minute(), second: timeOutMoment.second() });
  }
  
  // Calculate ND hours only if there's overlap with ND period
  if (ndStart.isBefore(ndEnd)) {
    const duration = moment.duration(ndEnd.diff(ndStart));
    ndHours = duration.asHours();
  }
  
  // Subtract 1 hour for break
  ndHours = Math.max(0, ndHours - 1);
  
  // Round to 2 decimal places
  const finalND = Math.round(ndHours * 100) / 100;
  console.log('Final ND hours (rounded):', finalND);
  
  return finalND;
};

// Mock the calculateUndertimeMinutes function for testing
const calculateUndertimeMinutes = (timeIn, timeOut, scheduledIn, scheduledOut, recordDate) => {
  if (!timeIn || !timeOut || !scheduledIn || !scheduledOut || 
      timeIn === '-' || timeOut === '-' || scheduledIn === '-' || scheduledOut === '-') {
    return 0;
  }
  
  const baseDate = moment(recordDate, 'YYYY-MM-DD');
  if (!baseDate.isValid()) {
    return 0;
  }
  
  // Parse scheduled times for UT calculation
  const scheduledInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledIn}`);
  const scheduledOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledOut}`);
  
  if (!scheduledInMoment.isValid() || !scheduledOutMoment.isValid()) {
    return 0;
  }
  
  // Handle scheduled times that span midnight
  if (scheduledOutMoment.isBefore(scheduledInMoment)) {
    scheduledOutMoment.add(1, 'day');
  }
  
  // Calculate scheduled duration (gross - before break deduction)
  const scheduledDuration = moment.duration(scheduledOutMoment.diff(scheduledInMoment));
  const scheduledMinutes = scheduledDuration.asMinutes();
  
  // Calculate scheduled break deduction based on scheduled duration
  let scheduledBreakMinutes = 0;
  if (scheduledMinutes >= 480) { // 8 hours or more
    scheduledBreakMinutes = 60; // 1 hour break
  } else if (scheduledMinutes >= 240) { // 4 hours or more
    scheduledBreakMinutes = 30; // 30 minutes break
  }
  
  // Calculate net scheduled time (after break deduction)
  const netScheduledMinutes = scheduledMinutes - scheduledBreakMinutes;
  
  // Use the dynamic BH calculation (actual time worked)
  const dynamicBHMinutes = calculateBilledHours(timeIn, timeOut, recordDate);
  
  // UT = (Net Scheduled Hours - Dynamic BH)
  const undertimeMinutes = Math.max(0, netScheduledMinutes - dynamicBHMinutes);
  
  console.log(`UT calculation for ${recordDate}: Gross Scheduled ${scheduledMinutes}min - Break ${scheduledBreakMinutes}min = Net Scheduled ${netScheduledMinutes}min - Dynamic BH ${dynamicBHMinutes}min = UT ${undertimeMinutes}min`);
  
  return Math.round(undertimeMinutes);
};

// Test Cases
const testCases = [
  {
    name: "Test Case 1: Standard Night Shift",
    schedule: { in: "19:00", out: "04:00" },
    actual: { in: "18:40", out: "04:05" },
    date: "2024-08-14",
    expected: {
      bh: 505, // 9h 25m - 1h break = 8h 25m = 505 min
      nd: 5.08, // 6h 5m - 1h break = 5h 5m = 5.08h
      ut: 0 // No undertime since actual > scheduled
    }
  },
  {
    name: "Test Case 2: Late Arrival Night Shift",
    schedule: { in: "19:00", out: "04:00" },
    actual: { in: "19:30", out: "04:00" },
    date: "2024-08-14",
    expected: {
      bh: 450, // 8h 30m - 1h break = 7h 30m = 450 min
      nd: 5.5, // 6h 30m - 1h break = 5h 30m = 5.5h
      ut: 30 // 8h scheduled - 7h 30m actual = 30 min
    }
  },
  {
    name: "Test Case 3: Early Departure Night Shift",
    schedule: { in: "19:00", out: "04:00" },
    actual: { in: "19:00", out: "02:00" },
    date: "2024-08-14",
    expected: {
      bh: 360, // 7h - 1h break = 6h = 360 min
      nd: 3, // 4h - 1h break = 3h
      ut: 120 // 8h scheduled - 6h actual = 2h = 120 min
    }
  },
  {
    name: "Test Case 4: Short Night Shift (No 1h Break)",
    schedule: { in: "20:00", out: "02:00" },
    actual: { in: "20:00", out: "02:00" },
    date: "2024-08-14",
    expected: {
      bh: 330, // 6h - 30m break = 5h 30m = 330 min
      nd: 3.5, // 4h - 30m break = 3h 30m = 3.5h
      ut: 0 // No undertime
    }
  },
  {
    name: "Test Case 5: Very Short Night Shift",
    schedule: { in: "21:00", out: "01:00" },
    actual: { in: "21:00", out: "01:00" },
    date: "2024-08-14",
    expected: {
      bh: 210, // 4h - 30m break = 3h 30m = 210 min
      nd: 2.5, // 3h - 30m break = 2h 30m = 2.5h
      ut: 0 // No undertime
    }
  },
  {
    name: "Test Case 6: Extended Night Shift",
    schedule: { in: "18:00", out: "06:00" },
    actual: { in: "18:00", out: "06:00" },
    date: "2024-08-14",
    expected: {
      bh: 660, // 12h - 1h break = 11h = 660 min
      nd: 7, // 8h - 1h break = 7h
      ut: 0 // No undertime
    }
  },
  {
    name: "Test Case 7: Partial Night Shift (Day + Night)",
    schedule: { in: "15:00", out: "03:00" },
    actual: { in: "15:00", out: "03:00" },
    date: "2024-08-14",
    expected: {
      bh: 660, // 12h - 1h break = 11h = 660 min
      nd: 4, // 5h - 1h break = 4h (only 22:00-03:00)
      ut: 0 // No undertime
    }
  },
  {
    name: "Test Case 8: Edge Case - Just Under 8 Hours",
    schedule: { in: "19:00", out: "02:30" },
    actual: { in: "19:00", out: "02:30" },
    date: "2024-08-14",
    expected: {
      bh: 420, // 7h 30m - 30m break = 7h = 420 min
      nd: 4, // 4h 30m - 30m break = 4h
      ut: 0 // No undertime
    }
  },
  {
    name: "Test Case 9: Edge Case - Exactly 8 Hours",
    schedule: { in: "19:00", out: "03:00" },
    actual: { in: "19:00", out: "03:00" },
    date: "2024-08-14",
    expected: {
      bh: 420, // 8h - 1h break = 7h = 420 min
      nd: 4, // 5h - 1h break = 4h
      ut: 0 // No undertime
    }
  },
  {
    name: "Test Case 10: Irregular Night Shift",
    schedule: { in: "20:30", out: "05:30" },
    actual: { in: "20:15", out: "05:45" },
    date: "2024-08-14",
    expected: {
      bh: 510, // 9h 30m - 1h break = 8h 30m = 510 min
      nd: 6.5, // 7h 30m - 1h break = 6h 30m = 6.5h
      ut: 0 // No undertime since actual > scheduled
    }
  }
];

// Validation function
const validateCalculations = () => {
  console.log("🚀 Starting Calculation Validation Tests...\n");
  
  let passedTests = 0;
  let totalTests = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`\n📋 ${testCase.name}`);
    console.log(`   Schedule: ${testCase.schedule.in} - ${testCase.schedule.out}`);
    console.log(`   Actual: ${testCase.actual.in} - ${testCase.actual.out}`);
    console.log(`   Date: ${testCase.date}`);
    
    // Calculate actual results
    const actualBH = calculateBilledHours(testCase.actual.in, testCase.actual.out, testCase.date);
    const actualND = calculateNightDifferential(testCase.actual.in, testCase.actual.out, testCase.date);
    const actualUT = calculateUndertimeMinutes(testCase.actual.in, testCase.actual.out, testCase.schedule.in, testCase.schedule.out, testCase.date);
    
    // Compare with expected results
    const bhPass = Math.abs(actualBH - testCase.expected.bh) <= 1; // Allow 1 minute tolerance
    const ndPass = Math.abs(actualND - testCase.expected.nd) <= 0.1; // Allow 0.1 hour tolerance
    const utPass = Math.abs(actualUT - testCase.expected.ut) <= 1; // Allow 1 minute tolerance
    
    console.log(`\n   Results:`);
    console.log(`   BH: Expected ${testCase.expected.bh}min, Got ${actualBH}min - ${bhPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ND: Expected ${testCase.expected.nd}h, Got ${actualND}h - ${ndPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   UT: Expected ${testCase.expected.ut}min, Got ${actualUT}min - ${utPass ? '✅ PASS' : '❌ FAIL'}`);
    
    if (bhPass && ndPass && utPass) {
      passedTests++;
      console.log(`   🎉 All calculations PASSED!`);
    } else {
      console.log(`   💥 Some calculations FAILED!`);
    }
    
    totalTests++;
    
    // Show detailed breakdown
    console.log(`   📊 Breakdown:`);
    console.log(`   - BH: ${actualBH} minutes (${(actualBH/60).toFixed(2)} hours)`);
    console.log(`   - ND: ${actualND} hours`);
    console.log(`   - UT: ${actualUT} minutes (${(actualUT/60).toFixed(2)} hours)`);
    
    console.log("   " + "─".repeat(60));
  });
  
  // Final summary
  console.log(`\n🏁 VALIDATION COMPLETE!`);
  console.log(`📈 Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`📊 Success Rate: ${((passedTests/totalTests)*100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log(`🎉 ALL TESTS PASSED! Calculations are working correctly.`);
  } else {
    console.log(`⚠️  ${totalTests - passedTests} tests failed. Please review the calculations.`);
  }
  
  return { passedTests, totalTests, successRate: (passedTests/totalTests)*100 };
};

// Export for use in other files
export { validateCalculations, testCases, calculateBilledHours, calculateNightDifferential, calculateUndertimeMinutes };

// Run validation if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.validateCalculations = validateCalculations;
  console.log('🧪 Test script loaded. Run validateCalculations() to test calculations.');
} else {
  // Node.js environment
  validateCalculations();
}
