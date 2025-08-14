/**
 * Dayshift Test Cases for BH, LT, UT Calculations
 * 
 * This file contains specific test cases for dayshift scenarios
 * including the user's requested test case:
 * 
 * Schedule: 7:00 AM - 4:00 PM
 * Actual: 6:40 AM - 4:10 PM
 * 
 * Expected Results:
 * - BH (Billed Hours): 8 hours (480 minutes)
 * - LT (Late Time): 0 minutes
 * - UT (Undertime): 0 minutes
 * - Early Time: 20 minutes
 */

import moment from 'moment';

// Import the calculation functions from the main test file
import { 
  calculateBilledHours, 
  calculateNightDifferential, 
  calculateUndertimeMinutes,
  calculateLateMinutes,
  calculateEarlyMinutes
} from './test_calculations.js';

// Main test case - User's requested scenario
const mainTestCase = {
  name: "Dayshift - Main Test Case",
  schedule: { in: "07:00", out: "16:00" },
  actual: { in: "06:40", out: "16:10" },
  date: "2024-08-14",
  expected: {
    bh: 480, // 8 hours = 480 minutes (after 1h break deduction)
    nd: 0, // No night differential for dayshift
    ut: 0, // No undertime
    late: 0, // No late time
    early: 20 // 20 minutes early
  }
};

// Additional dayshift test cases
const dayshiftTestCases = [
  {
    name: "Dayshift - Standard 8 Hour Shift",
    schedule: { in: "08:00", out: "17:00" },
    actual: { in: "08:00", out: "17:00" },
    date: "2024-08-14",
    expected: {
      bh: 480, // 9h - 1h break = 8h = 480 min
      nd: 0, // No night differential
      ut: 0, // No undertime
      late: 0, // No late time
      early: 0 // No early time
    }
  },
  {
    name: "Dayshift - Late Arrival",
    schedule: { in: "08:00", out: "17:00" },
    actual: { in: "08:30", out: "17:00" },
    date: "2024-08-14",
    expected: {
      bh: 450, // 8h 30m - 1h break = 7h 30m = 450 min
      nd: 0, // No night differential
      ut: 30, // 30 minutes undertime
      late: 30, // 30 minutes late
      early: 0 // No early time
    }
  },
  {
    name: "Dayshift - Early Departure",
    schedule: { in: "08:00", out: "17:00" },
    actual: { in: "08:00", out: "15:00" },
    date: "2024-08-14",
    expected: {
      bh: 360, // 7h - 1h break = 6h = 360 min
      nd: 0, // No night differential
      ut: 120, // 2 hours undertime
      late: 0, // No late time
      early: 0 // No early time
    }
  },
  {
    name: "Dayshift - Short Shift (No 1h Break)",
    schedule: { in: "09:00", out: "13:00" },
    actual: { in: "09:00", out: "13:00" },
    date: "2024-08-14",
    expected: {
      bh: 210, // 4h - 30m break = 3h 30m = 210 min
      nd: 0, // No night differential
      ut: 0, // No undertime
      late: 0, // No late time
      early: 0 // No early time
    }
  }
];

// Function to run a single test case
const runSingleTest = (testCase) => {
  console.log(`\n🧪 Running: ${testCase.name}`);
  console.log(`   Schedule: ${testCase.schedule.in} - ${testCase.schedule.out}`);
  console.log(`   Actual: ${testCase.actual.in} - ${testCase.actual.out}`);
  console.log(`   Date: ${testCase.date}`);
  
  // Calculate actual results
  const actualBH = calculateBilledHours(
    testCase.actual.in, 
    testCase.actual.out, 
    testCase.schedule.in, 
    testCase.schedule.out, 
    testCase.date
  );
  
  const actualND = calculateNightDifferential(
    testCase.actual.in, 
    testCase.actual.out, 
    testCase.schedule.in, 
    testCase.schedule.out, 
    testCase.date
  );
  
  const actualUT = calculateUndertimeMinutes(
    testCase.actual.in, 
    testCase.actual.out, 
    testCase.schedule.in, 
    testCase.schedule.out, 
    testCase.date
  );
  
  const actualLT = calculateLateMinutes(
    testCase.actual.in, 
    testCase.schedule.in, 
    testCase.date
  );
  
  const actualEarly = calculateEarlyMinutes(
    testCase.actual.in, 
    testCase.schedule.in, 
    testCase.date
  );
  
  // Compare with expected results
  const bhPass = Math.abs(actualBH - testCase.expected.bh) <= 1;
  const ndPass = Math.abs(actualND - testCase.expected.nd) <= 0.1;
  const utPass = Math.abs(actualUT - testCase.expected.ut) <= 1;
  const ltPass = Math.abs(actualLT - testCase.expected.late) <= 1;
  const earlyPass = Math.abs(actualEarly - testCase.expected.early) <= 1;
  
  // Display results
  console.log(`\n   📊 Results:`);
  console.log(`   BH: Expected ${testCase.expected.bh}min, Got ${actualBH}min - ${bhPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   ND: Expected ${testCase.expected.nd}h, Got ${actualND}h - ${ndPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   UT: Expected ${testCase.expected.ut}min, Got ${actualUT}min - ${utPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   LT: Expected ${testCase.expected.late}min, Got ${actualLT}min - ${ltPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Early: Expected ${testCase.expected.early}min, Got ${actualEarly}min - ${earlyPass ? '✅ PASS' : '❌ FAIL'}`);
  
  // Detailed breakdown for the main test case
  if (testCase.name === "Dayshift - Main Test Case") {
    console.log(`\n   📋 Detailed Breakdown for Main Test Case:`);
    console.log(`   Schedule: 07:00 AM - 04:00 PM (9 hours)`);
    console.log(`   Actual: 06:40 AM - 04:10 PM (9 hours 30 minutes)`);
    console.log(`   `);
    console.log(`   Calculations:`);
    console.log(`   - Gross Time: 06:40 - 16:10 = 9h 30m = 570 minutes`);
    console.log(`   - Break Deduction: 1 hour (since > 8 hours) = 60 minutes`);
    console.log(`   - Net Time Worked: 570 - 60 = 510 minutes`);
    console.log(`   - BH (Billed Hours): Capped to scheduled time (9h - 1h break = 8h = 480 min)`);
    console.log(`   - ND (Night Differential): 0 (dayshift, no night hours)`);
    console.log(`   - UT (Undertime): 0 (no undertime since effective = scheduled)`);
    console.log(`   - LT (Late Time): 0 (no late arrival)`);
    console.log(`   - Early Time: 20 minutes (06:40 vs 07:00)`);
  }
  
  const allPassed = bhPass && ndPass && utPass && ltPass && earlyPass;
  console.log(`\n   ${allPassed ? '🎉 ALL TESTS PASSED!' : '💥 SOME TESTS FAILED!'}`);
  
  return {
    name: testCase.name,
    passed: { bh: bhPass, nd: ndPass, ut: utPass, late: ltPass, early: earlyPass },
    actual: { bh: actualBH, nd: actualND, ut: actualUT, late: actualLT, early: actualEarly },
    expected: testCase.expected
  };
};

// Function to run all dayshift tests
const runAllDayshiftTests = () => {
  console.log("🚀 Starting Dayshift Calculation Tests...\n");
  
  const allTestCases = [mainTestCase, ...dayshiftTestCases];
  let passedTests = 0;
  let totalTests = 0;
  
  const results = allTestCases.map(testCase => {
    const result = runSingleTest(testCase);
    const allPassed = Object.values(result.passed).every(pass => pass);
    if (allPassed) passedTests++;
    totalTests++;
    return result;
  });
  
  // Final summary
  console.log(`\n🏁 DAYSHIFT VALIDATION COMPLETE!`);
  console.log(`📈 Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`📊 Success Rate: ${((passedTests/totalTests)*100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log(`🎉 ALL DAYSHIFT TESTS PASSED! Calculations are working correctly.`);
  } else {
    console.log(`⚠️  ${totalTests - passedTests} dayshift tests failed. Please review the calculations.`);
  }
  
  return { passedTests, totalTests, successRate: (passedTests/totalTests)*100, results };
};

// Export functions for use in other files
export { 
  runSingleTest, 
  runAllDayshiftTests, 
  mainTestCase, 
  dayshiftTestCases 
};

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.runAllDayshiftTests = runAllDayshiftTests;
  window.runSingleTest = runSingleTest;
  console.log('🧪 Dayshift test script loaded. Run runAllDayshiftTests() to test dayshift calculations.');
} else {
  // Node.js environment
  runAllDayshiftTests();
}
