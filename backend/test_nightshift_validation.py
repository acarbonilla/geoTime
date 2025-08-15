#!/usr/bin/env python3
"""
Nightshift Timeout Validation Test Case

This script demonstrates the current validation logic and the issue with
nightshift workers being unable to clock out on the next day due to
missing schedule validation.

Test Scenario:
- Worker clocks in: August 20, 2025 at 8:00 PM
- Worker attempts to clock out: August 21, 2025 at 4:00 AM (next day)
- System blocks timeout due to missing schedule on August 21

Author: AI Assistant
Date: 2025
"""

import os
import sys
import django
from datetime import datetime, date, time, timedelta
from decimal import Decimal

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import Employee, EmployeeSchedule, TimeEntry, DailyTimeSummary
from django.contrib.auth.models import User
from django.utils import timezone

class NightshiftValidationTest:
    """Test class for nightshift validation scenarios"""
    
    def __init__(self):
        self.test_employee = None
        self.test_schedule = None
        self.test_date = date(2025, 8, 20)  # August 20, 2025
        self.next_date = date(2025, 8, 21)  # August 21, 2025
        self.clock_in_time = datetime(2025, 8, 20, 20, 0, 0)  # 8:00 PM
        self.clock_out_time = datetime(2025, 8, 21, 4, 0, 0)   # 4:00 AM next day
        
    def setup_test_data(self):
        """Create test employee and schedule data"""
        print("🔧 Setting up test data...")
        
        # Create test user and employee
        user, created = User.objects.get_or_create(
            username='nightshift_test_user',
            defaults={
                'email': 'nightshift@test.com',
                'first_name': 'Nightshift',
                'last_name': 'Test'
            }
        )
        
        if created:
            print(f"✅ Created test user: {user.username}")
        
        self.test_employee, created = Employee.objects.get_or_create(
            user=user,
            defaults={
                'employee_id': 'NST001',
                'first_name': 'Nightshift',
                'last_name': 'Worker',
                'email': 'nightshift@test.com',
                'require_schedule_compliance': True,
                'early_login_restriction_hours': Decimal('1.0'),
                'overtime_threshold_hours': Decimal('8.0'),
                'flexible_break_hours': Decimal('1.0')
            }
        )
        
        if created:
            print(f"✅ Created test employee: {self.test_employee.employee_id}")
        
        # Create nightshift schedule for August 20
        self.test_schedule, created = EmployeeSchedule.objects.get_or_create(
            employee=self.test_employee,
            date=self.test_date,
            defaults={
                'scheduled_time_in': time(20, 0),  # 8:00 PM
                'scheduled_time_out': time(5, 0),   # 5:00 AM (next day)
                'shift_type': 'nightshift',
                'notes': 'Test nightshift schedule'
            }
        )
        
        if created:
            print(f"✅ Created nightshift schedule: {self.test_schedule.scheduled_time_in} - {self.test_schedule.scheduled_time_out}")
        
        print("✅ Test data setup complete\n")
    
    def simulate_current_validation_logic(self):
        """Simulate the current backend validation logic"""
        print("🔍 Simulating Current Backend Validation Logic")
        print("=" * 60)
        
        # Simulate the current validation from TimeInOutAPIView
        print("📋 Current Validation Steps:")
        print("1. Get current date (date.today())")
        print("2. Look for schedule on current date")
        print("3. If no schedule found, return 'Schedule required' error")
        print("4. If schedule incomplete, return 'Incomplete schedule' error")
        print()
        
        # Test 1: Clock In on August 20 (should work)
        print("🕐 Test 1: Clock In on August 20, 8:00 PM")
        print("-" * 40)
        
        current_date = self.test_date
        print(f"📅 Current date: {current_date}")
        
        # Look for schedule on current date
        schedule = EmployeeSchedule.objects.filter(
            employee=self.test_employee, 
            date=current_date
        ).first()
        
        if schedule:
            print(f"✅ Schedule found: {schedule.scheduled_time_in} - {schedule.scheduled_time_out}")
            print("✅ Clock in allowed - schedule exists for current date")
        else:
            print("❌ No schedule found - clock in blocked")
        
        print()
        
        # Test 2: Clock Out on August 21 (should fail)
        print("🚪 Test 2: Clock Out on August 21, 4:00 AM")
        print("-" * 40)
        
        current_date = self.next_date
        print(f"📅 Current date: {current_date}")
        
        # Look for schedule on current date
        schedule = EmployeeSchedule.objects.filter(
            employee=self.test_employee, 
            date=current_date
        ).first()
        
        if schedule:
            print(f"✅ Schedule found: {schedule.scheduled_time_in} - {schedule.scheduled_time_out}")
            print("✅ Clock out allowed - schedule exists for current date")
        else:
            print("❌ No schedule found for August 21")
            print("❌ Clock out blocked with 'Schedule required' error")
            print("🚨 PROBLEM: Nightshift worker cannot complete their shift!")
        
        print()
        
        # Test 3: Check if there's a schedule from previous day
        print("🔍 Test 3: Check Previous Day Schedule (Nightshift Logic)")
        print("-" * 40)
        
        previous_date = current_date - timedelta(days=1)
        print(f"📅 Previous date: {previous_date}")
        
        previous_schedule = EmployeeSchedule.objects.filter(
            employee=self.test_employee, 
            date=previous_date
        ).first()
        
        if previous_schedule:
            print(f"✅ Previous day schedule found: {previous_schedule.scheduled_time_in} - {previous_schedule.scheduled_time_out}")
            
            # Check if this is a nightshift (crosses midnight)
            if previous_schedule.scheduled_time_out < previous_schedule.scheduled_time_in:
                print("🌙 This is a nightshift schedule (crosses midnight)")
                print("💡 Current system: NO LOGIC to handle next-day timeouts")
                print("🚨 PROBLEM: System doesn't look for previous day schedules")
            else:
                print("☀️ This is a dayshift schedule (doesn't cross midnight)")
        else:
            print("❌ No previous day schedule found")
        
        print()
    
    def demonstrate_enhanced_validation_logic(self):
        """Demonstrate how enhanced validation logic should work"""
        print("🔧 Proposed Enhanced Validation Logic")
        print("=" * 60)
        
        print("📋 Enhanced Validation Steps:")
        print("1. Get current date (date.today())")
        print("2. Look for schedule on current date")
        print("3. If no schedule found AND action is 'time-out':")
        print("   a. Check previous day for nightshift schedule")
        print("   b. If nightshift found, allow timeout within reasonable window")
        print("4. If schedule incomplete, return 'Incomplete schedule' error")
        print()
        
        # Simulate enhanced logic
        print("🧪 Simulating Enhanced Logic for Clock Out on August 21")
        print("-" * 50)
        
        current_date = self.next_date
        action = 'time-out'
        
        print(f"📅 Current date: {current_date}")
        print(f"🎯 Action: {action}")
        
        # Primary schedule lookup
        schedule = EmployeeSchedule.objects.filter(
            employee=self.test_employee, 
            date=current_date
        ).first()
        
        if not schedule and action == 'time-out':
            print("❌ No schedule found for current date")
            print("🔍 Checking for nightshift from previous day...")
            
            # Look for schedule from previous day
            previous_date = current_date - timedelta(days=1)
            previous_schedule = EmployeeSchedule.objects.filter(
                employee=self.test_employee, 
                date=previous_date
            ).first()
            
            if previous_schedule and previous_schedule.scheduled_time_out:
                print(f"✅ Previous day schedule found: {previous_schedule.scheduled_time_in} - {previous_schedule.scheduled_time_out}")
                
                # Check if this is a nightshift (end time < start time)
                if previous_schedule.scheduled_time_out < previous_schedule.scheduled_time_in:
                    print("🌙 This is a nightshift schedule (crosses midnight)")
                    
                    # Calculate scheduled end time with midnight crossing
                    scheduled_end = datetime.combine(previous_date, previous_schedule.scheduled_time_out)
                    if scheduled_end < datetime.combine(previous_date, previous_schedule.scheduled_time_in):
                        scheduled_end += timedelta(days=1)  # Add 24 hours for nightshift
                    
                    print(f"🕐 Scheduled end time (adjusted): {scheduled_end}")
                    print(f"🕐 Current time: {self.clock_out_time}")
                    
                    # Check if current time is within reasonable window
                    time_diff = self.clock_out_time - scheduled_end
                    time_diff_hours = time_diff.total_seconds() / 3600
                    
                    print(f"⏱️ Time difference: {time_diff_hours:.2f} hours")
                    
                    if time_diff.total_seconds() <= 14400:  # 4 hours = 14400 seconds
                        print("✅ Timeout allowed - within 4-hour window after scheduled end")
                        print("🎉 Enhanced logic would allow this nightshift timeout!")
                    else:
                        print("❌ Timeout blocked - too late after scheduled end")
                else:
                    print("☀️ This is a dayshift schedule - no special handling needed")
            else:
                print("❌ No previous day schedule found")
        else:
            print("✅ Schedule found for current date - standard validation applies")
        
        print()
    
    def create_time_entries_and_test(self):
        """Create actual time entries and test the system"""
        print("📝 Creating Actual Time Entries and Testing System")
        print("=" * 60)
        
        # Create time in entry
        print("🕐 Creating Time In Entry...")
        time_in_entry = TimeEntry.objects.create(
            employee=self.test_employee,
            entry_type='time_in',
            timestamp=self.clock_in_time,
            event_time=self.clock_in_time,
            latitude=Decimal('14.5995'),
            longitude=Decimal('120.9842'),
            accuracy=Decimal('10.0')
        )
        print(f"✅ Time in entry created: {time_in_entry.timestamp}")
        
        # Create time out entry (this would normally be blocked)
        print("🚪 Creating Time Out Entry...")
        time_out_entry = TimeEntry.objects.create(
            employee=self.test_employee,
            entry_type='time_out',
            timestamp=self.clock_out_time,
            event_time=self.clock_out_time,
            latitude=Decimal('14.5995'),
            longitude=Decimal('120.9842'),
            accuracy=Decimal('10.0')
        )
        print(f"✅ Time out entry created: {time_out_entry.timestamp}")
        print("💡 Note: In real system, this would be blocked by validation")
        
        # Test daily summary calculation
        print("\n📊 Testing Daily Summary Calculation...")
        print("-" * 40)
        
        # Calculate summary for August 20
        summary_20 = DailyTimeSummary.objects.filter(
            employee=self.test_employee,
            date=self.test_date
        ).first()
        
        if not summary_20:
            summary_20 = DailyTimeSummary.objects.create(
                employee=self.test_employee,
                date=self.test_date
            )
        
        # Calculate metrics
        summary_20.calculate_metrics()
        summary_20.save()
        
        print(f"📅 August 20 Summary:")
        print(f"   Time In: {summary_20.time_in}")
        print(f"   Time Out: {summary_20.time_out}")
        print(f"   Status: {summary_20.status}")
        print(f"   Billed Hours: {summary_20.billed_hours}")
        
        # Calculate summary for August 21
        summary_21 = DailyTimeSummary.objects.filter(
            employee=self.test_employee,
            date=self.next_date
        ).first()
        
        if not summary_21:
            summary_21 = DailyTimeSummary.objects.create(
                employee=self.test_employee,
                date=self.next_date
            )
        
        # Calculate metrics
        summary_21.calculate_metrics()
        summary_21.save()
        
        print(f"\n📅 August 21 Summary:")
        print(f"   Time In: {summary_21.time_in}")
        print(f"   Time Out: {summary_21.time_out}")
        print(f"   Status: {summary_21.status}")
        print(f"   Billed Hours: {summary_21.billed_hours}")
        
        print()
    
    def cleanup_test_data(self):
        """Clean up test data"""
        print("🧹 Cleaning up test data...")
        
        # Delete time entries
        TimeEntry.objects.filter(employee=self.test_employee).delete()
        print("✅ Time entries deleted")
        
        # Delete daily summaries
        DailyTimeSummary.objects.filter(employee=self.test_employee).delete()
        print("✅ Daily summaries deleted")
        
        # Delete schedule
        if self.test_schedule:
            self.test_schedule.delete()
            print("✅ Test schedule deleted")
        
        # Delete employee and user
        if self.test_employee:
            self.test_employee.delete()
            print("✅ Test employee deleted")
        
        if self.test_employee.user:
            self.test_employee.user.delete()
            print("✅ Test user deleted")
        
        print("✅ Cleanup complete\n")
    
    def run_complete_test(self):
        """Run the complete test suite"""
        print("🌙 NIGHTSHIFT TIMEOUT VALIDATION TEST SUITE")
        print("=" * 80)
        print("This test demonstrates the current validation logic and the issue")
        print("with nightshift workers being unable to clock out on the next day.")
        print()
        
        try:
            # Setup test data
            self.setup_test_data()
            
            # Run validation tests
            self.simulate_current_validation_logic()
            
            # Demonstrate enhanced logic
            self.demonstrate_enhanced_validation_logic()
            
            # Create actual entries and test
            self.create_time_entries_and_test()
            
            print("🎯 TEST SUMMARY")
            print("=" * 40)
            print("✅ Clock In: Works correctly for nightshift start")
            print("❌ Clock Out: Blocked due to missing next-day schedule")
            print("❌ Current System: No handling for cross-midnight scenarios")
            print("💡 Solution: Enhanced validation logic needed")
            print()
            print("🔧 RECOMMENDED FIXES:")
            print("1. Enhanced backend validation for nightshift scenarios")
            print("2. Cross-midnight schedule lookup and validation")
            print("3. Flexible time windows for nightshift operations")
            print("4. Automatic next-day schedule creation for nightshifts")
            
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            import traceback
            traceback.print_exc()
        
        finally:
            # Cleanup
            self.cleanup_test_data()

def main():
    """Main function to run the test"""
    print("Starting Nightshift Validation Test...")
    print()
    
    test = NightshiftValidationTest()
    test.run_complete_test()
    
    print("Test completed!")

if __name__ == "__main__":
    main()
