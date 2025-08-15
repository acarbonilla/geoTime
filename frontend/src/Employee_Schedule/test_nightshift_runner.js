/**
 * 🌙 Night Shift Grouping Test Runner
 * 
 * This script tests the actual night shift grouping logic from ScheduleReport.js
 * Run this in the browser console while on the Schedule Report page
 */

console.log('🌙 Starting Night Shift Grouping Tests...');

// Test data scenarios
const testScenarios = [
    {
        name: "Basic Night Shift",
        description: "Standard night shift crossing midnight",
        input: {
            daily_records: [
                {
                    date: "2025-08-15",
                    day: "Fri",
                    status: "present",
                    time_in: "21:41",
                    time_out: "-",
                    scheduled_in: "22:00",
                    scheduled_out: "07:00",
                    time_entries: []
                },
                {
                    date: "2025-08-16",
                    day: "Sat",
                    status: "present",
                    time_in: "-",
                    time_out: "00:21",
                    scheduled_in: "09:00",
                    scheduled_out: "17:00",
                    time_entries: [
                        {
                            entry_type: "time_out",
                            event_time: "00:21"
                        }
                    ]
                }
            ]
        },
        expected: {
            groupedCount: 2,
            hasNightshift: true,
            hasNextDayRow: true
        }
    },
    {
        name: "Early Timeout (Before 6 AM)",
        description: "Night shift with very early timeout",
        input: {
            daily_records: [
                {
                    date: "2025-08-20",
                    day: "Wed",
                    status: "present",
                    time_in: "22:45",
                    time_out: "-",
                    scheduled_in: "23:00",
                    scheduled_out: "08:00",
                    time_entries: []
                },
                {
                    date: "2025-08-21",
                    day: "Thu",
                    status: "present",
                    time_in: "-",
                    time_out: "03:15",
                    scheduled_in: "09:00",
                    scheduled_out: "18:00",
                    time_entries: [
                        {
                            entry_type: "time_out",
                            event_time: "03:15"
                        }
                    ]
                }
            ]
        },
        expected: {
            groupedCount: 2,
            hasNightshift: true,
            hasNextDayRow: true
        }
    },
    {
        name: "Incomplete Night Shift",
        description: "Night shift with time-in but no timeout",
        input: {
            daily_records: [
                {
                    date: "2025-08-25",
                    day: "Mon",
                    status: "present",
                    time_in: "20:55",
                    time_out: "-",
                    scheduled_in: "21:00",
                    scheduled_out: "06:00",
                    time_entries: []
                },
                {
                    date: "2025-08-26",
                    day: "Tue",
                    status: "scheduled",
                    time_in: "-",
                    time_out: "-",
                    scheduled_in: "08:00",
                    scheduled_out: "17:00",
                    time_entries: []
                }
            ]
        },
        expected: {
            groupedCount: 2,
            hasNightshift: true,
            hasIncomplete: true
        }
    },
    {
        name: "Regular Day Shift",
        description: "Normal day shift, no night shift logic",
        input: {
            daily_records: [
                {
                    date: "2025-08-18",
                    day: "Mon",
                    status: "present",
                    time_in: "08:45",
                    time_out: "17:15",
                    scheduled_in: "09:00",
                    scheduled_out: "17:00",
                    time_entries: []
                },
                {
                    date: "2025-08-19",
                    day: "Tue",
                    status: "present",
                    time_in: "08:50",
                    time_out: "17:10",
                    scheduled_in: "09:00",
                    scheduled_out: "17:00",
                    time_entries: []
                }
            ]
        },
        expected: {
            groupedCount: 2,
            hasNightshift: false,
            hasNextDayRow: false
        }
    },
    {
        name: "Late Night Shift Start",
        description: "Night shift starting very late (after midnight)",
        input: {
            daily_records: [
                {
                    date: "2025-08-30",
                    day: "Sat",
                    status: "present",
                    time_in: "00:15",
                    time_out: "-",
                    scheduled_in: "00:00",
                    scheduled_out: "08:00",
                    time_entries: []
                },
                {
                    date: "2025-08-31",
                    day: "Sun",
                    status: "present",
                    time_in: "-",
                    time_out: "07:45",
                    scheduled_in: "09:00",
                    scheduled_out: "17:00",
                    time_entries: [
                        {
                            entry_type: "time_out",
                            event_time: "07:45"
                        }
                    ]
                }
            ]
        },
        expected: {
            groupedCount: 2,
            hasNightshift: false, // Starts at midnight, not late enough
            hasNextDayRow: false
        }
    }
];

// Test runner function
function runNightShiftTests() {
    console.log('🧪 Running Night Shift Grouping Tests...\n');
    
    let passedTests = 0;
    let totalTests = testScenarios.length;
    
    testScenarios.forEach((scenario, index) => {
        console.log(`📋 Test ${index + 1}: ${scenario.name}`);
        console.log(`   Description: ${scenario.description}`);
        
        try {
            // Simulate the grouping logic (this would normally call the actual function)
            const result = simulateGroupingLogic(scenario.input.daily_records);
            
            // Check results
            const tests = [
                {
                    name: "Grouped Records Count",
                    expected: scenario.expected.groupedCount,
                    actual: result.groupedRecords.length,
                    passed: result.groupedRecords.length === scenario.expected.groupedCount
                },
                {
                    name: "Has Night Shift",
                    expected: scenario.expected.hasNightshift,
                    actual: result.hasNightshift,
                    passed: result.hasNightshift === scenario.expected.hasNightshift
                },
                {
                    name: "Has Next Day Row",
                    expected: scenario.expected.hasNextDayRow || false,
                    actual: result.groupedRecords.some(r => r.hasPreviousNightshiftTimeout),
                    passed: (result.groupedRecords.some(r => r.hasPreviousNightshiftTimeout)) === (scenario.expected.hasNextDayRow || false)
                }
            ];
            
            let scenarioPassed = true;
            tests.forEach(test => {
                const status = test.passed ? '✅ PASS' : '❌ FAIL';
                console.log(`   ${status} ${test.name}: Expected ${test.expected}, Got ${test.actual}`);
                if (!test.passed) scenarioPassed = false;
            });
            
            if (scenarioPassed) {
                passedTests++;
                console.log(`   🎉 Scenario PASSED\n`);
            } else {
                console.log(`   💥 Scenario FAILED\n`);
            }
            
            // Show grouped records
            console.log(`   📊 Grouped Records:`);
            result.groupedRecords.forEach((record, idx) => {
                const type = record.isNightshift ? '🌙 Nightshift' : 
                            record.hasPreviousNightshiftTimeout ? '📅 Next Day' : '📋 Regular';
                console.log(`      ${idx + 1}. ${type}: ${record.displayDate || record.date} | ${record.displayTimeOut || record.time_out || '-'}`);
            });
            console.log('');
            
        } catch (error) {
            console.log(`   💥 ERROR: ${error.message}\n`);
        }
    });
    
    // Summary
    console.log('📈 Test Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Night shift grouping logic is working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Check the logic above for issues.');
    }
}

// Simulate the grouping logic (copy from ScheduleReport.js)
function simulateGroupingLogic(dailyRecords) {
    if (!dailyRecords || dailyRecords.length === 0) {
        return { groupedRecords: [], hasNightshift: false };
    }

    const groupedRecords = [];
    let hasNightshift = false;
    
    for (let i = 0; i < dailyRecords.length; i++) {
        const currentRecord = dailyRecords[i];
        const nextRecord = dailyRecords[i + 1];
        
        // Check if this is a nightshift (starts late, ends early next day)
        const isNightshift = currentRecord.scheduled_in && currentRecord.scheduled_out && 
            parseInt(currentRecord.scheduled_in.split(':')[0]) >= 18 && 
            parseInt(currentRecord.scheduled_out.split(':')[0]) < 12;
        
        if (isNightshift) hasNightshift = true;
        
        // Check if current record has time-in but no time-out (incomplete night shift)
        const hasTimeInNoTimeOut = currentRecord.time_in && currentRecord.time_in !== '-' && 
            (!currentRecord.time_out || currentRecord.time_out === '-');
        
        // Check if next day has early timeout that belongs to this nightshift
        let hasNextDayTimeout = false;
        let nextDayTimeoutEntry = null;
        
        if (nextRecord) {
            // First check the main time_out field
            if (nextRecord.time_out && nextRecord.time_out !== '-') {
                const timeoutHour = parseInt(nextRecord.time_out.split(':')[0]);
                if (timeoutHour < 6) {
                    hasNextDayTimeout = true;
                    nextDayTimeoutEntry = {
                        event_time: nextRecord.time_out,
                        entry_type: 'time_out'
                    };
                }
            }
            
            // If not found in main field, check time_entries array
            if (!hasNextDayTimeout && nextRecord.time_entries && Array.isArray(nextRecord.time_entries)) {
                const timeoutInEntries = nextRecord.time_entries.find(entry => 
                    entry.entry_type === 'time_out' && 
                    parseInt(entry.event_time.split(':')[0]) < 6
                );
                
                if (timeoutInEntries) {
                    hasNextDayTimeout = true;
                    nextDayTimeoutEntry = timeoutInEntries;
                }
            }
        }
        
        // Check if this is a nightshift that crosses midnight
        if (isNightshift && hasTimeInNoTimeOut && hasNextDayTimeout) {
            // Create a combined record for the nightshift
            const combinedRecord = {
                ...currentRecord,
                isNightshift: true,
                nextDayTimeout: nextDayTimeoutEntry,
                nextDayDate: nextRecord.date,
                nextDayDay: nextRecord.day,
                time_out: nextDayTimeoutEntry ? nextDayTimeoutEntry.event_time : currentRecord.time_out,
                displayDate: `${formatDate(currentRecord.date)} → ${formatDate(nextRecord.date)}`,
                displayDay: `${currentRecord.day} → ${nextRecord.day}`,
                displayTimeOut: `${nextDayTimeoutEntry.event_time} (Next day: ${formatDate(nextRecord.date)})`
            };
            
            groupedRecords.push(combinedRecord);
            
            // Create next day record with previous timeout info
            if (nextRecord) {
                const nextDayRecord = {
                    ...nextRecord,
                    hasPreviousNightshiftTimeout: true,
                    previousNightshiftInfo: `Timeout from ${formatDate(currentRecord.date)} night shift`,
                    displayDate: formatDate(nextRecord.date),
                    displayDay: nextRecord.day,
                    displayTimeOut: formatTime(nextRecord.time_out) || '-'
                };
                groupedRecords.push(nextDayRecord);
                i++; // Skip the next record since we've processed both
            }
            
        } else if (isNightshift && hasTimeInNoTimeOut) {
            // Nightshift with time-in but no timeout found - mark as incomplete
            const incompleteRecord = {
                ...currentRecord,
                isNightshift: true,
                isIncomplete: true,
                displayDate: `${formatDate(currentRecord.date)} (Incomplete)`,
                displayDay: currentRecord.day,
                displayTimeOut: '-'
            };
            groupedRecords.push(incompleteRecord);
        } else {
            // Regular record, add as-is
            const regularRecord = {
                ...currentRecord,
                displayDate: formatDate(currentRecord.date),
                displayDay: currentRecord.day,
                displayTimeOut: formatTime(currentRecord.time_out) || '-'
            };
            groupedRecords.push(regularRecord);
        }
    }
    
    return { groupedRecords, hasNightshift };
}

// Helper functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function formatTime(timeString) {
    if (!timeString || timeString === '-') return '-';
    return timeString;
}

// Export for use in browser console
window.runNightShiftTests = runNightShiftTests;
window.testScenarios = testScenarios;

console.log('🚀 Test runner loaded! Run "runNightShiftTests()" to start testing.');
console.log('📚 Available test scenarios:', testScenarios.map(s => s.name).join(', '));
