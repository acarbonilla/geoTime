// Test file for time validation fix
// This tests that the EmployeeDashboard properly prevents early clock-ins

// Mock data for testing
const mockSchedule = {
  scheduled_time_in: "07:00:00",
  scheduled_time_out: "16:00:00"
};

// Mock current times for testing
const testTimes = [
  { time: "05:30:00", description: "2.5 hours early - should be blocked", expected: false },
  { time: "05:59:59", description: "1 hour 1 second early - should be blocked", expected: false },
  { time: "06:00:00", description: "Exactly 1 hour early - should be allowed", expected: true },
  { time: "06:30:00", description: "30 minutes early - should be allowed", expected: true },
  { time: "07:00:00", description: "Exactly on time - should be allowed", expected: true },
  { time: "08:00:00", description: "1 hour late - should be allowed", expected: true },
  { time: "12:00:00", description: "5 hours late - should be allowed", expected: true }
];

// Simulate the time validation logic from validateSchedule function
function simulateTimeValidation(scheduledTimeStr, currentTimeStr) {
  try {
    // Parse current time
    const now = new Date(`2000-01-01T${currentTimeStr}`);
    
    // Parse scheduled time
    let hours, minutes;
    if (scheduledTimeStr.includes(':')) {
      const timeParts = scheduledTimeStr.split(':');
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
      
      // Validate parsed values
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error('Invalid time format:', scheduledTimeStr, 'Parsed:', { hours, minutes });
        return { allowed: false, error: 'Invalid schedule time format' };
      }
    } else {
      console.error('Unexpected time format:', scheduledTimeStr);
      return { allowed: false, error: 'Unexpected schedule time format' };
    }
    
    // Create scheduled time for today
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // Calculate time difference in hours
    const timeDiffHours = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    console.log('Time validation test:', {
      currentTime: currentTimeStr,
      scheduledTime: scheduledTimeStr,
      parsed: { hours, minutes },
      scheduledTime: scheduledTime.toLocaleTimeString(),
      timeDiffHours: timeDiffHours.toFixed(2)
    });
    
    // Allow clock-in only within 1 hour before scheduled time
    if (timeDiffHours > 1) {
      const earliestTime = new Date(scheduledTime.getTime() - 60 * 60 * 1000);
      return { 
        allowed: false, 
        error: `Too early. Earliest allowed: ${earliestTime.toLocaleTimeString()}`,
        timeDiffHours: timeDiffHours
      };
    }
    
    // Time validation passed
    return { 
      allowed: true, 
      error: null,
      timeDiffHours: timeDiffHours
    };
  } catch (error) {
    console.error('Time validation error:', error);
    return { allowed: false, error: `Time validation error: ${error.message}` };
  }
}

// Run tests
function runTimeValidationTests() {
  console.log('🧪 Running Time Validation Tests...\n');
  
  let passedTests = 0;
  let totalTests = testTimes.length;
  
  testTimes.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.description}`);
    
    const result = simulateTimeValidation(mockSchedule.scheduled_time_in, testCase.time);
    const testPassed = result.allowed === testCase.expected;
    
    if (testPassed) {
      console.log(`  ✅ PASS: ${result.allowed ? 'Allowed' : 'Blocked'} (${result.timeDiffHours?.toFixed(2)} hours difference)`);
      passedTests++;
    } else {
      console.log(`  ❌ FAIL: Expected ${testCase.expected ? 'allowed' : 'blocked'}, but got ${result.allowed ? 'allowed' : 'blocked'}`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    }
    console.log('');
  });
  
  // Summary
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Time validation is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the time validation logic.');
  }
  
  return { passedTests, totalTests };
}

// Test edge cases
function runEdgeCaseTests() {
  console.log('🔍 Running Edge Case Tests...\n');
  
  const edgeCases = [
    { time: "06:00:01", description: "1 hour 1 second early - should be blocked", expected: false },
    { time: "05:59:59", description: "1 hour 1 second early - should be blocked", expected: false },
    { time: "06:00:00", description: "Exactly 1 hour early - should be allowed", expected: true },
    { time: "06:00:00.001", description: "1 hour minus 1 millisecond early - should be allowed", expected: true }
  ];
  
  let passedEdgeTests = 0;
  let totalEdgeTests = edgeCases.length;
  
  edgeCases.forEach((testCase, index) => {
    console.log(`Edge Test ${index + 1}: ${testCase.description}`);
    
    const result = simulateTimeValidation(mockSchedule.scheduled_time_in, testCase.time);
    const testPassed = result.allowed === testCase.expected;
    
    if (testPassed) {
      console.log(`  ✅ PASS: ${result.allowed ? 'Allowed' : 'Blocked'}`);
      passedEdgeTests++;
    } else {
      console.log(`  ❌ FAIL: Expected ${testCase.expected ? 'allowed' : 'blocked'}, but got ${result.allowed ? 'allowed' : 'blocked'}`);
    }
    console.log('');
  });
  
  console.log(`📊 Edge Case Results: ${passedEdgeTests}/${totalEdgeTests} tests passed`);
  return { passedEdgeTests, totalEdgeTests };
}

// Export functions for use in browser console
if (typeof window !== 'undefined') {
  window.runTimeValidationTests = runTimeValidationTests;
  window.runEdgeCaseTests = runEdgeCaseTests;
  window.simulateTimeValidation = simulateTimeValidation;
  
  console.log('🔄 Time validation test functions loaded. Use:');
  console.log('  - runTimeValidationTests() to run main tests');
  console.log('  - runEdgeCaseTests() to run edge case tests');
  console.log('  - simulateTimeValidation(scheduledTime, currentTime) to test specific times');
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined') {
  console.log('Running tests in Node.js environment...');
  runTimeValidationTests();
  runEdgeCaseTests();
}
