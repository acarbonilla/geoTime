/**
 * 🧪 Test Time Validation Logic
 * 
 * This script tests the time validation logic in EmployeeDashboard.js
 * Run this in the browser console to verify the validation works
 */

console.log('🧪 Testing Time Validation Logic...');

// Test data simulating different time formats
const testSchedules = [
  {
    name: "Standard Time (HH:MM)",
    scheduled_time_in: "07:00",
    scheduled_time_out: "16:00",
    expected: "Valid format"
  },
  {
    name: "Time with Seconds (HH:MM:SS)",
    scheduled_time_in: "07:00:00",
    scheduled_time_out: "16:00:00",
    expected: "Valid format with seconds"
  },
  {
    name: "Night Shift Time",
    scheduled_time_in: "22:00",
    scheduled_time_out: "07:00",
    expected: "Valid night shift format"
  },
  {
    name: "Invalid Time Format",
    scheduled_time_in: "invalid",
    scheduled_time_out: "also-invalid",
    expected: "Should show error"
  }
];

// Test the time parsing logic
function testTimeParsing(scheduledTimeStr) {
  console.log(`\n📊 Testing time parsing for: "${scheduledTimeStr}"`);
  
  try {
    // Handle different time formats (HH:MM or HH:MM:SS)
    let hours, minutes;
    if (scheduledTimeStr.includes(':')) {
      const timeParts = scheduledTimeStr.split(':');
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
      
      console.log(`  Split result: [${timeParts.join(', ')}]`);
      console.log(`  Parsed hours: ${hours} (type: ${typeof hours})`);
      console.log(`  Parsed minutes: ${minutes} (type: ${typeof minutes})`);
      
      // Validate parsed values
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error(`  ❌ Invalid time format: ${scheduledTimeStr}, Parsed: { hours: ${hours}, minutes: ${minutes} }`);
        return { valid: false, error: 'Invalid time format', hours, minutes };
      }
      
      console.log(`  ✅ Valid time format: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      return { valid: true, hours, minutes };
      
    } else {
      console.error(`  ❌ Unexpected time format: ${scheduledTimeStr}`);
      return { valid: false, error: 'Unexpected time format' };
    }
    
  } catch (error) {
    console.error(`  ❌ Parsing error: ${error.message}`);
    return { valid: false, error: error.message };
  }
}

// Test the time validation logic
function testTimeValidation(scheduledTimeStr, currentTime = new Date()) {
  console.log(`\n⏰ Testing time validation for: "${scheduledTimeStr}" at ${currentTime.toLocaleTimeString()}`);
  
  const parseResult = testTimeParsing(scheduledTimeStr);
  if (!parseResult.valid) {
    return parseResult;
  }
  
  try {
    const { hours, minutes } = parseResult;
    
    // Create scheduled time for today
    const scheduledTime = new Date(currentTime);
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // Calculate time difference in hours
    const timeDiffHours = (scheduledTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
    
    console.log(`  Current time: ${currentTime.toLocaleTimeString()}`);
    console.log(`  Scheduled time: ${scheduledTime.toLocaleTimeString()}`);
    console.log(`  Time difference: ${timeDiffHours.toFixed(2)} hours`);
    
    let status, message;
    if (timeDiffHours > 1) {
      const earliestTime = new Date(scheduledTime.getTime() - 60 * 60 * 1000);
      status = 'wait';
      message = `⏳ You can clock in starting at ${earliestTime.toLocaleTimeString()}`;
      console.log(`  Status: ${status} - ${message}`);
    } else if (timeDiffHours > 0) {
      status = 'ready';
      message = '✅ You can clock in now (within 1 hour of schedule)';
      console.log(`  Status: ${status} - ${message}`);
    } else {
      status = 'ready';
      message = '✅ You can clock in now';
      console.log(`  Status: ${status} - ${message}`);
    }
    
    return { 
      valid: true, 
      status, 
      message, 
      hours, 
      minutes, 
      timeDiffHours,
      scheduledTime: scheduledTime.toLocaleTimeString()
    };
    
  } catch (error) {
    console.error(`  ❌ Validation error: ${error.message}`);
    return { valid: false, error: error.message };
  }
}

// Test all scenarios
console.log('\n🎯 Running Time Validation Tests...');

testSchedules.forEach((schedule, index) => {
  console.log(`\n${index + 1}. Testing: ${schedule.name}`);
  console.log(`   Schedule: ${schedule.scheduled_time_in} - ${schedule.scheduled_time_out}`);
  console.log(`   Expected: ${schedule.expected}`);
  
  const result = testTimeValidation(schedule.scheduled_time_in);
  
  if (result.valid) {
    console.log(`   ✅ Result: ${result.message}`);
  } else {
    console.log(`   ❌ Result: ${result.error}`);
  }
});

// Test with current time
console.log('\n🕐 Testing with current time...');
const now = new Date();
const currentTimeResult = testTimeValidation("07:00:00", now);

// Export for testing
window.testTimeParsing = testTimeParsing;
window.testTimeValidation = testTimeValidation;
window.testSchedules = testSchedules;

console.log('\n🚀 Test completed! Functions exported to window for manual testing.');
console.log('💡 Try: testTimeValidation("07:00:00") or testTimeValidation("22:00")');
