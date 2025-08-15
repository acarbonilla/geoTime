/**
 * Test Script for BH, ND, and UT Calculations
 * 
 * This script validates the calculation functions against expected results
 * for various night shift scenarios.
 */

import moment from 'moment';

// Mock the calculateBilledHours function for testing
const calculateBilledHours = (timeIn, timeOut, scheduledIn, scheduledOut, recordDate) => {
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
    
    // Parse scheduled times for abuse prevention
    const scheduledInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledIn}`);
    const scheduledOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledOut}`);
    
    if (!timeInMoment.isValid() || !timeOutMoment.isValid() || 
        !scheduledInMoment.isValid() || !scheduledOutMoment.isValid()) {
      return 0;
    }

    // Handle night shifts that span midnight
    if (timeOutMoment.isBefore(timeInMoment)) {
      timeOutMoment = moment(timeOutMoment).add(1, 'day');
    }
    if (scheduledOutMoment.isBefore(scheduledInMoment)) {
      scheduledOutMoment.add(1, 'day');
    }

    // ABUSE PREVENTION: Cap actual times to scheduled times
    let effectiveTimeIn = timeInMoment;
    let effectiveTimeOut = timeOutMoment;
    
    // If user clocked in early, cap to scheduled time
    if (timeInMoment.isBefore(scheduledInMoment)) {
      effectiveTimeIn = scheduledInMoment.clone();
      console.log(`User clocked in early (${timeInMoment.format('HH:mm')}), capped to scheduled time (${scheduledInMoment.format('HH:mm')})`);
    }
    
         // If user clocked out early, use actual time out (for undertime calculation)
     // If user clocked out late, cap to scheduled time (to prevent abuse)
     if (timeOutMoment.isBefore(scheduledOutMoment)) {
       effectiveTimeOut = timeOutMoment.clone();
       console.log(`User clocked out early (${timeOutMoment.format('HH:mm')}), using actual time out for undertime calculation`);
     } else if (timeOutMoment.isAfter(scheduledOutMoment)) {
       effectiveTimeOut = scheduledOutMoment.clone();
       console.log(`User clocked out late (${timeOutMoment.format('HH:mm')}), capped to scheduled time (${scheduledOutMoment.format('HH:mm')})`);
     }

    // Calculate effective duration worked in minutes (capped to scheduled times)
    let durationMinutes = effectiveTimeOut.diff(effectiveTimeIn, 'minutes');
    
    // Ensure duration is positive
    if (durationMinutes < 0) {
      console.error('Invalid duration calculation:', { effectiveTimeIn: effectiveTimeIn.format('HH:mm'), effectiveTimeOut: effectiveTimeOut.format('HH:mm'), durationMinutes });
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

    console.log(`BH calculation for ${recordDate}: Effective time worked ${effectiveTimeIn.format('HH:mm')} - ${effectiveTimeOut.format('HH:mm')} = ${durationMinutes + breakDeduction} minutes - ${breakDeduction} minutes break = ${durationMinutes} minutes (${(durationMinutes/60).toFixed(2)} hours)`);
    
    return Math.max(0, durationMinutes);
  } catch (error) {
    console.error('Error calculating billed hours:', error);
    return 0;
  }
};

// Mock the calculateNightDifferential function for testing
 const calculateNightDifferential = (timeIn, timeOut, scheduledIn, scheduledOut, recordDate) => {
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
  // Always start ND period at 10 PM of the base date
  const ndStart = moment(baseDate).set({ hour: 22, minute: 0, second: 0 });
  
  // Always end ND period at 6 AM of the next day
  const ndEnd = moment(baseDate).add(1, 'day').set({ hour: 6, minute: 0, second: 0 });
  
  console.log('ND period:', { 
    ndStart: ndStart.format('YYYY-MM-DD HH:mm:ss'), 
    ndEnd: ndEnd.format('YYYY-MM-DD HH:mm:ss'),
    timeIn: timeInMoment.format('YYYY-MM-DD HH:mm:ss'),
    timeOut: timeOutMoment.format('YYYY-MM-DD HH:mm:ss')
  });
  
  // Find the effective start time for ND calculation
  let effectiveNDStart = ndStart;
  if (timeInMoment.isAfter(ndStart)) {
    effectiveNDStart = timeInMoment.clone();
    console.log('Time in is after ND start, using time in as ND start');
  }
  
     // Find the effective end time for ND calculation
   // ABUSE PREVENTION: Cap ND end to scheduled time out if user clocks out late
   let effectiveNDEnd = ndEnd;
   
   // Parse scheduled times for ND abuse prevention
   const scheduledInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledIn || '00:00'}`);
   const scheduledOutMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledOut || '00:00'}`);
   
   if (scheduledOutMoment.isBefore(scheduledInMoment)) {
     scheduledOutMoment.add(1, 'day');
   }
   
   // CRITICAL: Always cap ND end to scheduled time out to prevent abuse
   // This ensures users can't claim extra ND hours by clocking out late
   if (scheduledOutMoment.isBefore(ndEnd)) {
     effectiveNDEnd = scheduledOutMoment.clone();
     console.log(`ND end capped to scheduled time out: ${scheduledOutMoment.format('HH:mm')} (prevents abuse)`);
   } else {
     effectiveNDEnd = ndEnd.clone();
     console.log(`ND end using standard ND period: ${ndEnd.format('HH:mm')}`);
   }
  
  // Calculate ND hours only if there's overlap with ND period
  if (effectiveNDStart.isBefore(effectiveNDEnd)) {
    const duration = moment.duration(effectiveNDEnd.diff(effectiveNDStart));
    ndHours = duration.asHours();
    console.log(`ND overlap found: ${effectiveNDStart.format('HH:mm')} - ${effectiveNDEnd.format('HH:mm')} = ${ndHours} hours`);
  } else {
    console.log('No overlap with ND period');
    return 0;
  }
  
  // Apply break deduction based on total shift duration
  const totalShiftDuration = timeOutMoment.diff(timeInMoment, 'hours');
  let breakDeduction = 0;
  
  if (totalShiftDuration >= 8) {
    breakDeduction = 1; // 1 hour break for 8+ hour shifts
    console.log('ND break deduction: 1 hour (8+ hour shift)');
  } else if (totalShiftDuration >= 4) {
    breakDeduction = 0.5; // 30 minutes break for 4+ hour shifts
    console.log('ND break deduction: 30 minutes (4+ hour shift)');
  } else {
    console.log('ND break deduction: 0 hours (shift < 4 hours)');
  }
  
  // Apply break deduction to ND hours
  ndHours = Math.max(0, ndHours - breakDeduction);
  
  // Round to 2 decimal places
  const finalND = Math.round(ndHours * 100) / 100;
  console.log('Final ND hours (rounded):', finalND);
  
  return finalND;
};

// Mock the calculateLateMinutes function for testing
const calculateLateMinutes = (timeIn, scheduledIn, recordDate) => {
  if (!timeIn || !scheduledIn || timeIn === '-' || scheduledIn === '-') {
    return 0;
  }
  
  const baseDate = moment(recordDate, 'YYYY-MM-DD');
  if (!baseDate.isValid()) {
    return 0;
  }
  
  // Parse actual and scheduled time in
  const timeInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeIn}`);
  const scheduledInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledIn}`);
  
  if (!timeInMoment.isValid() || !scheduledInMoment.isValid()) {
    return 0;
  }
  
  // Calculate late minutes (positive if late, negative if early)
  const lateMinutes = timeInMoment.diff(scheduledInMoment, 'minutes');
  
  // Return only positive values (late arrivals)
  return Math.max(0, lateMinutes);
};

// Mock the calculateEarlyMinutes function for testing
const calculateEarlyMinutes = (timeIn, scheduledIn, recordDate) => {
  if (!timeIn || !scheduledIn || timeIn === '-' || scheduledIn === '-') {
    return 0;
  }
  
  const baseDate = moment(recordDate, 'YYYY-MM-DD');
  if (!baseDate.isValid()) {
    return 0;
  }
  
  // Parse actual and scheduled time in
  const timeInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${timeIn}`);
  const scheduledInMoment = moment(`${baseDate.format('YYYY-MM-DD')} ${scheduledIn}`);
  
  if (!timeInMoment.isValid() || !scheduledInMoment.isValid()) {
    return 0;
  }
  
  // Calculate early minutes (positive if early, negative if late)
  const earlyMinutes = scheduledInMoment.diff(timeInMoment, 'minutes');
  
  // Return only positive values (early arrivals)
  return Math.max(0, earlyMinutes);
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
  const dynamicBHMinutes = calculateBilledHours(timeIn, timeOut, scheduledIn, scheduledOut, recordDate);
  
  // UT = (Net Scheduled Hours - Dynamic BH)
  const undertimeMinutes = Math.max(0, netScheduledMinutes - dynamicBHMinutes);
  
  console.log(`UT calculation for ${recordDate}: Gross Scheduled ${scheduledMinutes}min - Break ${scheduledBreakMinutes}min = Net Scheduled ${netScheduledMinutes}min - Dynamic BH ${dynamicBHMinutes}min = UT ${undertimeMinutes}min`);
  
  return Math.round(undertimeMinutes);
};

// Test Cases
const testCases = [
     {
     name: "Test Case 1: Standard Night Shift (Abuse Prevention)",
     schedule: { in: "19:00", out: "04:00" },
     actual: { in: "18:40", out: "04:05" },
     date: "2024-08-14",
            expected: {
         bh: 480, // 9h - 1h break = 8h = 480 min (capped to scheduled)
         nd: 5.00, // 6h - 1h break = 5h (capped to scheduled time out)
         ut: 0 // No undertime since effective = scheduled
       }
   },
     {
     name: "Test Case 2: Late Arrival Night Shift",
     schedule: { in: "19:00", out: "04:00" },
     actual: { in: "19:30", out: "04:00" },
     date: "2024-08-14",
     expected: {
       bh: 450, // 8h 30m - 1h break = 7h 30m = 450 min
       nd: 5.0, // 6h - 1h break = 5h (ND period is 19:30-04:00, not 22:00-04:00)
       late: 30 // User arrived 30 minutes late (19:30 instead of 19:00)
     }
   },
     {
     name: "Test Case 3: Early Departure Night Shift",
     schedule: { in: "19:00", out: "04:00" },
     actual: { in: "19:00", out: "02:00" },
     date: "2024-08-14",
     expected: {
       bh: 390, // 7h (19:00-02:00) - 30m break = 6h 30m = 390 min (using actual time out)
       nd: 3.5, // 4h (22:00-02:00) - 30m break = 3h 30m = 3.5h
       ut: 90 // 9h scheduled - 60m break = 8h net - 6h 30m actual = 1h 30m = 90 min
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
    name: "Test Case 10: Dayshift - Early In, Late Out",
    schedule: { in: "07:00", out: "16:00" },
    actual: { in: "06:40", out: "16:10" },
    date: "2024-08-14",
    expected: {
      bh: 480, // 9h - 1h break = 8h = 480 min (capped to scheduled time)
      nd: 0, // No night differential for dayshift
      ut: 0 // No undertime since effective = scheduled
    }
  },
  {
    name: "Test Case 11: Dayshift - Late Arrival",
    schedule: { in: "07:00", out: "16:00" },
    actual: { in: "07:30", out: "16:00" },
    date: "2024-08-14",
    expected: {
      bh: 450, // 8h 30m - 1h break = 7h 30m = 450 min
      nd: 0, // No night differential for dayshift
      late: 30 // User arrived 30 minutes late (07:30 instead of 07:00)
    }
  },
  {
    name: "Test Case 12: Dayshift - Early Departure",
    schedule: { in: "07:00", out: "16:00" },
    actual: { in: "07:00", out: "14:00" },
    date: "2024-08-14",
    expected: {
      bh: 360, // 7h - 1h break = 6h = 360 min
      nd: 0, // No night differential for dayshift
      ut: 120 // 8h scheduled - 6h actual = 2h = 120 min
    }
  },
  {
    name: "Test Case 13: Dayshift - Short Shift (No 1h Break)",
    schedule: { in: "08:00", out: "12:00" },
    actual: { in: "08:00", out: "12:00" },
    date: "2024-08-14",
    expected: {
      bh: 210, // 4h - 30m break = 3h 30m = 210 min
      nd: 0, // No night differential for dayshift
      ut: 0 // No undertime
    }
  },
  {
    name: "Test Case 13A: Dayshift - User Requested Scenario (Main Test)",
    schedule: { in: "07:00", out: "16:00" },
    actual: { in: "06:40", out: "16:10" },
    date: "2024-08-14",
    expected: {
      bh: 480, // 9h - 1h break = 8h = 480 min (capped to scheduled time)
      nd: 0, // No night differential for dayshift
      ut: 0, // No undertime since effective = scheduled
      late: 0, // No late time since early arrival is capped
      early: 20 // 20 minutes early arrival (06:40 vs 07:00)
    }
  },
  {
    name: "Test Case 13B: Dayshift - Detailed Calculation Breakdown",
    schedule: { in: "07:00", out: "16:00" },
    actual: { in: "06:40", out: "16:10" },
    date: "2024-08-14",
    expected: {
      bh: 480, // 8 hours = 480 minutes (after 1h break deduction)
      nd: 0, // No night differential for dayshift
      ut: 0, // No undertime
      late: 0, // No late time
      early: 20 // 20 minutes early
    },
    explanation: `
      SCHEDULE: 07:00 AM - 04:00 PM (9 hours)
      ACTUAL: 06:40 AM - 04:10 PM (9 hours 30 minutes)
      
      CALCULATIONS:
      - Gross Time: 06:40 - 16:10 = 9h 30m = 570 minutes
      - Break Deduction: 1 hour (since > 8 hours) = 60 minutes
      - Net Time Worked: 570 - 60 = 510 minutes
      - BH (Billed Hours): Capped to scheduled time (9h - 1h break = 8h = 480 min)
      - ND (Night Differential): 0 (dayshift, no night hours)
      - UT (Undertime): 0 (no undertime since effective = scheduled)
      - LT (Late Time): 0 (no late arrival)
      - Early Time: 20 minutes (06:40 vs 07:00)
    `
  },
  {
    name: "Test Case 14: Irregular Night Shift",
    schedule: { in: "20:30", out: "05:30" },
    actual: { in: "20:15", out: "05:45" },
    date: "2024-08-14",
    expected: {
      bh: 510, // 9h 30m - 1h break = 8h 30m = 510 min
      nd: 6.5, // 7h 30m - 1h break = 6h 30m = 6.5h
      ut: 0 // No undertime since actual > scheduled
    }
  },
  {
    name: "Test Case 15: 8-Hour Night Shift Spanning Midnight",
    schedule: { in: "21:00", out: "05:00" },
    actual: { in: "21:00", out: "05:00" },
    date: "2024-08-14",
    expected: {
      bh: 420, // 8h - 1h break = 7h = 420 min
      nd: 7, // 7h - 1h break = 6h (10:00 PM - 5:00 AM)
      ut: 0 // No undertime
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
    const actualBH = calculateBilledHours(testCase.actual.in, testCase.actual.out, testCase.schedule.in, testCase.schedule.out, testCase.date);
    const actualND = calculateNightDifferential(testCase.actual.in, testCase.actual.out, testCase.date);
    const actualUT = calculateUndertimeMinutes(testCase.actual.in, testCase.actual.out, testCase.schedule.in, testCase.schedule.out, testCase.date);
    const actualLT = calculateLateMinutes(testCase.actual.in, testCase.schedule.in, testCase.date);
    const actualEarly = calculateEarlyMinutes(testCase.actual.in, testCase.schedule.in, testCase.date);
    
    // Compare with expected results
    const bhPass = Math.abs(actualBH - testCase.expected.bh) <= 1; // Allow 1 minute tolerance
    const ndPass = Math.abs(actualND - testCase.expected.nd) <= 0.1; // Allow 0.1 hour tolerance
    
    // Handle late, early, and undertime cases
    let adjustmentPass = true;
    let expectedValue = 0;
    let isLateCase = false;
    let isEarlyCase = false;
    
    if (testCase.expected.late !== undefined) {
      // This is a late arrival case
      expectedValue = testCase.expected.late;
      isLateCase = true;
      adjustmentPass = Math.abs(actualLT - expectedValue) <= 1;
    } else if (testCase.expected.early !== undefined) {
      // This is an early arrival case
      expectedValue = testCase.expected.early;
      isEarlyCase = true;
      adjustmentPass = Math.abs(actualEarly - expectedValue) <= 1;
    } else {
      // This is an undertime case
      expectedValue = testCase.expected.ut;
      adjustmentPass = Math.abs(actualUT - expectedValue) <= 1;
    }
    
    console.log(`\n   Results:`);
    console.log(`   BH: Expected ${testCase.expected.bh}min, Got ${actualBH}min - ${bhPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ND: Expected ${testCase.expected.nd}h, Got ${actualND}h - ${ndPass ? '✅ PASS' : '❌ FAIL'}`);
    
    if (isLateCase) {
      console.log(`   LT: Expected ${testCase.expected.late}min, Got ${actualLT}min - ${adjustmentPass ? '✅ PASS' : '❌ FAIL'}`);
    } else if (isEarlyCase) {
      console.log(`   Early: Expected ${testCase.expected.early}min, Got ${actualEarly}min - ${adjustmentPass ? '✅ PASS' : '❌ FAIL'}`);
    } else {
      console.log(`   UT: Expected ${testCase.expected.ut}min, Got ${actualUT}min - ${adjustmentPass ? '✅ PASS' : '❌ FAIL'}`);
    }
    
    if (bhPass && ndPass && adjustmentPass) {
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
    if (isLateCase) {
      console.log(`   - LT: ${actualLT} minutes (${(actualLT/60).toFixed(2)} hours)`);
    } else if (isEarlyCase) {
      console.log(`   - Early: ${actualEarly} minutes (${(actualEarly/60).toFixed(2)} hours)`);
    } else {
      console.log(`   - UT: ${actualUT} minutes (${(actualUT/60).toFixed(2)} hours)`);
    }
    
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
export { validateCalculations, testCases, calculateBilledHours, calculateNightDifferential, calculateUndertimeMinutes, calculateLateMinutes, calculateEarlyMinutes };

// Run validation if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.validateCalculations = validateCalculations;
  console.log('🧪 Test script loaded. Run validateCalculations() to test calculations.');
} else {
  // Node.js environment
  validateCalculations();
}
