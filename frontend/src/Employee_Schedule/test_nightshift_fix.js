// Test file to verify night shift fix works with production data
// This simulates the data structure from the production environment

// Mock moment for testing
const moment = (date) => {
  const d = new Date(date);
  return {
    format: (fmt) => {
      if (fmt === 'MMM DD') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate().toString().padStart(2, '0')}`;
      }
      return date;
    }
  };
};

// Mock production data structure
const mockProductionData = [
  {
    date: '2024-08-18',
    day: 'Mon',
    status: 'present',
    time_in: '21:12:00',
    time_out: '22:50:00', // This is incomplete - should be 06:50 AM next day
    scheduled_in: '21:00:00',
    scheduled_out: '06:00:00',
    billed_hours: 468,
    late_minutes: 17,
    undertime_minutes: 12,
    night_differential: 6
  },
  {
    date: '2024-08-19',
    day: 'Tue',
    status: 'present',
    time_in: '-',
    time_out: '06:50:00', // This belongs to Aug 18 nightshift
    scheduled_in: '21:00:00',
    scheduled_out: '06:00:00',
    billed_hours: 0,
    late_minutes: 0,
    undertime_minutes: 0,
    night_differential: 0
  }
];

// Mock the processSingleNightshiftsSpanningMidnight function
const processSingleNightshiftsSpanningMidnight = (dailyRecords) => {
  console.log('🔍 Processing single nightshifts spanning midnight:', dailyRecords);
  const processedRecords = [];
  
  for (let i = 0; i < dailyRecords.length; i++) {
    const currentRecord = dailyRecords[i];
    const nextRecord = dailyRecords[i + 1];
    
    console.log(`🔍 Processing record ${i}:`, {
      date: currentRecord.date,
      time_in: currentRecord.time_in,
      time_out: currentRecord.time_out,
      scheduled_in: currentRecord.scheduled_in,
      scheduled_out: currentRecord.scheduled_out
    });
    
    // Check if current record is a nightshift
    const isCurrentNightshift = currentRecord.scheduled_in && currentRecord.scheduled_out && (
      (parseInt(currentRecord.scheduled_in.split(':')[0]) >= 18 && 
       parseInt(currentRecord.scheduled_out.split(':')[0]) < 12) ||
      (parseInt(currentRecord.scheduled_in.split(':')[0]) >= 20 && 
       parseInt(currentRecord.scheduled_out.split(':')[0]) < 8) ||
      (parseInt(currentRecord.scheduled_in.split(':')[0]) > parseInt(currentRecord.scheduled_out.split(':')[0]))
    );
    
    console.log(`🔍 Record ${i} nightshift check:`, {
      isNightshift: isCurrentNightshift,
      scheduledInHour: currentRecord.scheduled_in ? parseInt(currentRecord.scheduled_in.split(':')[0]) : null,
      scheduledOutHour: currentRecord.scheduled_out ? parseInt(currentRecord.scheduled_out.split(':')[0]) : null
    });
    
    if (isCurrentNightshift) {
      // Check if this nightshift has time in but no time out (incomplete)
      const hasTimeIn = currentRecord.time_in && currentRecord.time_in !== '-';
      const hasTimeOut = currentRecord.time_out && currentRecord.time_out !== '-';
      
      console.log(`🔍 Nightshift ${i} time check:`, {
        hasTimeIn,
        hasTimeOut,
        timeIn: currentRecord.time_in,
        timeOut: currentRecord.time_out
      });
      
      if (hasTimeIn && !hasTimeOut && nextRecord) {
        // Look for time out on the next day that belongs to this nightshift
        let nextDayTimeout = null;
        
        console.log(`🔍 Looking for next day timeout for nightshift ${i}:`, {
          nextRecordDate: nextRecord.date,
          nextRecordTimeOut: nextRecord.time_out,
          nextRecordTimeEntries: nextRecord.time_entries
        });
        
        // Check if next day has time out before 6 AM (likely belongs to previous nightshift)
        if (nextRecord.time_out && nextRecord.time_out !== '-') {
          const timeOutHour = parseInt(nextRecord.time_out.split(':')[0]);
          console.log(`🔍 Next day time out hour: ${timeOutHour}`);
          if (timeOutHour < 6) {
            nextDayTimeout = {
              event_time: nextRecord.time_out,
              date: nextRecord.date
            };
            console.log(`✅ Found next day timeout:`, nextDayTimeout);
          }
        }
        
        if (nextDayTimeout) {
          // Create enhanced record with next day timeout
          const enhancedRecord = {
            ...currentRecord,
            isNightshift: true,
            nextDayTimeout: nextDayTimeout,
            nextDayDate: nextDayTimeout.date,
            displayTimeOut: `${nextDayTimeout.event_time} (Next day: ${moment(nextDayTimeout.date).format('MMM DD')})`,
            // Mark the next day record as a timeout-only record
            _nextDayRecord: {
              ...nextRecord,
              isNightshiftTimeout: true,
              previousDayDate: currentRecord.date,
              previousDayInfo: `Timeout from ${moment(currentRecord.date).format('MMM DD')} night shift`
            }
          };
          
          console.log(`✅ Created enhanced nightshift record:`, enhancedRecord);
          processedRecords.push(enhancedRecord);
          
          // Skip the next record since it's now part of the previous nightshift
          i++;
          continue;
        }
      }
    }
    
    // Check if this record was marked as a timeout-only record by a previous nightshift
    if (currentRecord._nextDayRecord) {
      // This record was processed as part of a previous nightshift, skip it
      console.log(`⏭️ Skipping record ${i} (already processed as next day timeout):`, currentRecord.date);
      continue;
    }
    
    // Regular record, add as-is
    console.log(`📝 Adding regular record ${i}:`, currentRecord.date);
    processedRecords.push(currentRecord);
  }
  
  console.log(`✅ Final processed records:`, processedRecords);
  return processedRecords;
};

// Test the function
console.log('🧪 Testing night shift fix with production data...');
const result = processSingleNightshiftsSpanningMidnight(mockProductionData);

console.log('\n📊 Test Results:');
console.log('Input records:', mockProductionData.length);
console.log('Output records:', result.length);
console.log('Expected: 1 record (Aug 18 with next day timeout)');
console.log('Actual:', result.length, 'records');

if (result.length === 1) {
  const nightshiftRecord = result[0];
  console.log('\n✅ SUCCESS: Night shift properly grouped!');
  console.log('Date:', nightshiftRecord.date);
  console.log('Time In:', nightshiftRecord.time_in);
  console.log('Time Out:', nightshiftRecord.displayTimeOut);
  console.log('Is Nightshift:', nightshiftRecord.isNightshift);
  console.log('Next Day Timeout:', nightshiftRecord.nextDayTimeout);
} else {
  console.log('\n❌ FAILED: Night shift not properly grouped');
  console.log('Result:', result);
}

// Export for testing in browser console
window.testNightshiftFix = () => {
  console.log('🧪 Testing night shift fix...');
  const result = processSingleNightshiftsSpanningMidnight(mockProductionData);
  console.log('Test result:', result);
  return result;
};

console.log('\n🚀 Test ready! Run "testNightshiftFix()" in console to test again.');
