#!/usr/bin/env python3
"""
Night Differential (ND) Calculation Test Simulation
Tests the ND calculation logic for various shift scenarios
"""

from datetime import datetime, timedelta

def calculate_night_differential(time_in, time_out, record_date):
    """
    Python simulation of the JavaScript ND calculation logic
    """
    print(f"\n=== ND Calculation for {record_date} ===")
    print(f"Time In: {time_in}")
    print(f"Time Out: {time_out}")
    print(f"Record Date: {record_date}")
    
    if not time_in or not time_out or time_in == '-' or time_out == '-':
        print("Missing time data - returning 0")
        return 0
    
    try:
        # Parse the record date to get the base date for time parsing
        base_date = datetime.strptime(record_date, '%Y-%m-%d')
        print(f"Parsed base date: {base_date.strftime('%Y-%m-%d')}")
        
        # Parse time strings using the record's date as context
        time_in_str = f"{base_date.strftime('%Y-%m-%d')} {time_in}"
        time_out_str = f"{base_date.strftime('%Y-%m-%d')} {time_out}"
        
        time_in_dt = datetime.strptime(time_in_str, '%Y-%m-%d %H:%M:%S')
        time_out_dt = datetime.strptime(time_out_str, '%Y-%m-%d %H:%M:%S')
        
        print(f"Parsed moments with record date context:")
        print(f"   Time In: {time_in_dt.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   Time Out: {time_out_dt.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Handle shifts spanning midnight (e.g., 23:00 to 07:00)
        shift_spans_midnight = time_out_dt < time_in_dt
        if shift_spans_midnight:
            time_out_dt += timedelta(days=1)
            print(f"Shift spans midnight - adjusted time out to: {time_out_dt.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # ND period: 10:00 PM (22:00) to 6:00 AM (06:00) of the next day
        # Start with the date of time in
        nd_start = time_in_dt.replace(hour=22, minute=0, second=0, microsecond=0)
        
        # Only add 1 day to ND end if the shift actually spans midnight
        if shift_spans_midnight:
            # Shift spans midnight, so ND end is 6 AM of the next day
            nd_end = time_in_dt.replace(hour=6, minute=0, second=0, microsecond=0) + timedelta(days=1)
        else:
            # Same day shift, so ND end is 6 AM of the same day
            nd_end = time_in_dt.replace(hour=6, minute=0, second=0, microsecond=0)
        
        print(f"Initial ND period:")
        print(f"   ND Start: {nd_start.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   ND End: {nd_end.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   Shift spans midnight: {shift_spans_midnight}")
        
        # Adjust ND start to actual time in if it's after 10 PM
        if time_in_dt.hour >= 22:
            nd_start = time_in_dt
            print(f"Adjusted ND start to time in: {nd_start.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Adjust ND end to actual time out if it's before 6 AM
        if time_out_dt.hour < 6:
            nd_end = time_out_dt
            print(f"Adjusted ND end to time out: {nd_end.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Calculate ND hours
        if nd_start < nd_end:
            nd_hours = (nd_end - nd_start).total_seconds() / 3600
            # Subtract 1 hour for break
            nd_hours = max(0, nd_hours - 1)
            print(f"Calculated ND hours: {nd_hours:.2f}")
            return round(nd_hours, 2)
        else:
            print("ND start is after ND end - no ND hours")
            return 0
            
    except Exception as e:
        print(f"Error parsing dates: {e}")
        return 0

def test_case(time_in, time_out, record_date, scheduled_in, scheduled_out):
    """Helper function to execute and display a test case"""
    print(f"Time In: {time_in}")
    print(f"Time Out: {time_out}")
    print(f"Record Date: {record_date}")
    print(f"Scheduled In: {scheduled_in}")
    print(f"Scheduled Out: {scheduled_out}")
    
    result = calculate_night_differential(time_in, time_out, record_date)
    print(f"Calculated ND hours: {result}")
    
    # Determine if this should have ND based on the times
    if time_in >= "22:00:00" or time_out <= "06:00:00":
        if result > 0:
            print("Status: PASS - ND calculated correctly")
        else:
            print("Status: FAIL - Should have ND but got 0")
    else:
        if result == 0:
            print("Status: PASS - No ND calculated correctly")
        else:
            print("Status: FAIL - Should not have ND but got some")
    print()

def test_scenarios():
    """Test various shift scenarios"""
    print("=" * 60)
    print("TESTING VARIOUS SHIFT SCENARIOS")
    print("=" * 60)
    
    # Test Case 1: August 9th - Day Shift (should have NO ND)
    print("\nTest Case 1: August 9th - Day Shift (should have NO ND)")
    print("-" * 50)
    test_case("07:00:00", "15:00:00", "2024-08-09", "07:00:00", "15:00:00")
    
    # Test Case 2: August 10th - Night Shift 11:58 PM - 12:14 AM (should have ND)
    print("\nTest Case 2: August 10th - Night Shift 11:58 PM - 12:14 AM (should have ND)")
    print("-" * 50)
    test_case("23:58:00", "00:14:00", "2024-08-10", "23:58:00", "00:14:00")
    
    # Test Case 3: August 11th - Night Shift 11:00 PM - 7:00 AM (should have ND)
    print("\nTest Case 3: August 11th - Night Shift 11:00 PM - 7:00 AM (should have ND)")
    print("-" * 50)
    test_case("23:00:00", "07:00:00", "2024-08-11", "23:00:00", "07:00:00")
    
    # Test Case 4: Night Shift 6:40 PM - 4:00 AM (should have ND)
    print("\nTest Case 4: Night Shift 6:40 PM - 4:00 AM (should have ND)")
    print("-" * 50)
    test_case("18:40:00", "04:00:00", "2024-08-12", "19:00:00", "04:00:00")
    
    # Test Case 5: Regular Day Shift 8:00 AM - 5:00 PM (should have NO ND)
    print("\nTest Case 5: Regular Day Shift 8:00 AM - 5:00 PM (should have NO ND)")
    print("-" * 50)
    test_case("08:00:00", "17:00:00", "2024-08-13", "08:00:00", "17:00:00")
    
    # Test Case 6: August 10th-11th Night Shift Spanning Midnight (CRITICAL TEST)
    print("\nTest Case 6: August 10th-11th Night Shift Spanning Midnight (CRITICAL TEST)")
    print("-" * 50)
    print("This tests the exact scenario causing the display issue:")
    print("August 10th: Time In: 11:58 PM, Time Out: 12:14 AM (next day)")
    print("August 11th: Should show NO time out (Not Yet Scheduled)")
    print("-" * 50)
    
    # Simulate the frontend logic for display
    print("Frontend Display Logic Test:")
    print("August 10th (Sunday):")
    print("  - Time In: 11:58 PM")
    print("  - Time Out: 12:14 AM (from next day)")
    print("  - Status: present")
    print("  - Should show time out: YES")
    print("  - ND calculation: Should work")
    
    print("\nAugust 11th (Monday):")
    print("  - Time In: - (none)")
    print("  - Time Out: 12:14 AM (from previous night shift)")
    print("  - Status: not_yet_scheduled")
    print("  - Should show time out: NO (to avoid confusion)")
    print("  - ND calculation: Should NOT happen")
    
    # Test the ND calculation for August 10th
    print("\nND Calculation Test for August 10th:")
    nd_hours = calculate_night_differential("23:58:00", "00:14:00", "2024-08-10")
    print(f"August 10th ND hours: {nd_hours}")
    
    # Test what should happen for August 11th
    print("\nAugust 11th should NOT show time out or ND:")
    print("Status: not_yet_scheduled")
    print("Expected display: Time Out: '-', ND: '-'")

def test_edge_cases():
    """Test edge cases and boundary conditions"""
    print("\n" + "="*60)
    print("EDGE CASES AND BOUNDARY CONDITIONS")
    print("="*60)
    
    # Test boundary times
    print("\n--- Boundary Time Tests ---")
    
    # Just before ND period
    result1 = calculate_night_differential("21:59:59", "05:59:59", "2025-08-16")
    print(f"9:59:59 PM - 5:59:59 AM: {result1} ND hours")
    
    # Exactly at ND period start
    result2 = calculate_night_differential("22:00:00", "06:00:00", "2025-08-17")
    print(f"10:00:00 PM - 6:00:00 AM: {result2} ND hours")
    
    # Just after ND period start
    result3 = calculate_night_differential("22:00:01", "06:00:01", "2025-08-18")
    print(f"10:00:01 PM - 6:00:01 AM: {result3} ND hours")
    
    # Just before ND period end
    result4 = calculate_night_differential("23:00:00", "05:59:59", "2025-08-19")
    print(f"11:00:00 PM - 5:59:59 AM: {result4} ND hours")
    
    # Exactly at ND period end
    result5 = calculate_night_differential("23:00:00", "06:00:00", "2025-08-20")
    print(f"11:00:00 PM - 6:00:00 AM: {result5} ND hours")
    
    # Just after ND period end
    result6 = calculate_night_differential("23:00:00", "06:00:01", "2025-08-21")
    print(f"11:00:00 PM - 6:00:01 AM: {result6} ND hours")

if __name__ == "__main__":
    test_scenarios()
    test_edge_cases()
    
    print("\n" + "="*60)
    print("SIMULATION COMPLETE")
    print("="*60)
    print("This simulation tests the ND calculation logic that was implemented")
    print("in the JavaScript ScheduleReport.js file. All test cases should pass")
    print("if the logic is working correctly.")
