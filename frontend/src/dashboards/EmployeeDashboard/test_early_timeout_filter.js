/**
 * 🧪 Test Early Timeout Filter
 * 
 * This script tests the early timeout filtering logic in EmployeeDashboard.js
 * Run this in the browser console to verify the filtering works
 */

console.log('🧪 Testing Early Timeout Filter Logic...');

// Test data simulating night shift scenario
const testEntries = [
  {
    id: 1,
    entry_type: 'time_in',
    timestamp: '2025-08-15T21:41:00Z',
    formatted_timestamp: '21:41',
    location: { name: 'Office' }
  },
  {
    id: 2,
    entry_type: 'time_out',
    timestamp: '2025-08-16T00:21:00Z', // Early timeout (12:21 AM next day)
    formatted_timestamp: '00:21',
    location: { name: 'Office' }
  },
  {
    id: 3,
    entry_type: 'time_in',
    timestamp: '2025-08-16T07:00:00Z', // Next day time-in (7:00 AM)
    formatted_timestamp: '07:00',
    location: { name: 'Office' }
  },
  {
    id: 4,
    entry_type: 'time_out',
    timestamp: '2025-08-16T16:00:00Z', // Next day time-out (4:00 PM)
    formatted_timestamp: '16:00',
    location: { name: 'Office' }
  }
];

// Test the filtering logic
function testEarlyTimeoutFilter(entries) {
  console.log('📊 Input Entries:');
  entries.forEach((entry, index) => {
    const date = new Date(entry.timestamp).toLocaleDateString();
    const time = new Date(entry.timestamp).toLocaleTimeString();
    console.log(`  ${index + 1}. ${entry.entry_type.toUpperCase()} - ${date} ${time}`);
  });
  
  // Simulate the updated filtering logic
  const sortedEntries = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const filteredEntries = [];
  
  for (let i = 0; i < sortedEntries.length; i++) {
    const currentEntry = sortedEntries[i];
    
    // IMPORTANT: Always preserve time-in entries - they're needed for time-in operations
    if (currentEntry.entry_type === 'time_in') {
      filteredEntries.push(currentEntry);
      continue;
    }
    
    // Check if this is a time-out entry
    if (currentEntry.entry_type === 'time_out') {
      const timeoutHour = new Date(currentEntry.timestamp).getHours();
      
      // Check if this is an early timeout (before 6 AM)
      if (timeoutHour < 6) {
        // Look for the previous time-in entry
        let previousTimeIn = null;
        for (let j = i - 1; j >= 0; j--) {
          if (sortedEntries[j].entry_type === 'time_in') {
            previousTimeIn = sortedEntries[j];
            break;
          }
        }
        
        // If we found a previous time-in and it's from a different day (night shift)
        if (previousTimeIn) {
          const timeInDate = new Date(previousTimeIn.timestamp).toDateString();
          const timeoutDate = new Date(currentEntry.timestamp).toDateString();
          
          if (timeInDate !== timeoutDate) {
            // This is a night shift timeout - don't add it as a separate entry for display
            console.log(`🚫 Filtered out early timeout: ${currentEntry.formatted_timestamp} (night shift)`);
            continue;
          }
        }
      }
    }
    
    // Add the entry to filtered results
    filteredEntries.push(currentEntry);
  }
  
  return filteredEntries;
}

// Test the grouping logic
function testGroupingLogic(entries) {
  console.log('\n📋 Testing Grouping Logic:');
  
  const sorted = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const sessions = [];
  let currentSession = null;

  sorted.forEach(entry => {
    if (entry.entry_type === 'time_in') {
      // Start a new session
      if (currentSession) {
        // If previous session has no time_out, push as active
        sessions.push(currentSession);
      }
      currentSession = {
        date: new Date(entry.timestamp).toLocaleDateString(),
        time_in: entry.formatted_timestamp,
        time_out: null,
        duration: null,
        status: 'Active'
      };
    } else if (entry.entry_type === 'time_out' && currentSession) {
      // Pair with the last time_in
      currentSession.time_out = entry.formatted_timestamp;
      currentSession.status = 'Completed';
      sessions.push(currentSession);
      currentSession = null;
    }
  });
  
  // If there's an unpaired time_in, add as active
  if (currentSession) {
    sessions.push(currentSession);
  }
  
  return sessions;
}

// Run the test
console.log('\n🎯 Running Early Timeout Filter Test...');
const filteredEntries = testEarlyTimeoutFilter(testEntries);

console.log('\n✅ Filtered Entries:');
filteredEntries.forEach((entry, index) => {
  const date = new Date(entry.timestamp).toLocaleDateString();
  const time = new Date(entry.timestamp).toLocaleTimeString();
  console.log(`  ${index + 1}. ${entry.entry_type.toUpperCase()} - ${date} ${time}`);
});

console.log('\n📊 Testing Grouping Logic...');
const sessions = testGroupingLogic(filteredEntries);

console.log('\n🎉 Final Sessions:');
sessions.forEach((session, index) => {
  console.log(`  ${index + 1}. ${session.date}: ${session.time_in} → ${session.time_out || 'Active'} (${session.status})`);
});

// Expected results
console.log('\n📋 Expected Results:');
console.log('  ✅ Early timeout (00:21) should be filtered out for display');
console.log('  ✅ Time-in entry (07:00) should be preserved for time-in operations');
console.log('  ✅ Night shift session should show: Aug 15: 21:41 → 00:21 (Completed)');
console.log('  ✅ Day shift session should show: Aug 16: 07:00 → 16:00 (Completed)');
console.log('  ✅ User can still time in on Aug 16 at 7:00 AM');

// Export for testing
window.testEarlyTimeoutFilter = testEarlyTimeoutFilter;
window.testGroupingLogic = testGroupingLogic;
window.testEntries = testEntries;

console.log('\n🚀 Test completed! Functions exported to window for manual testing.');
