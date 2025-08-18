from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, time, timedelta
from geo.models import Employee, EmployeeSchedule, TimeEntry, DailyTimeSummary
from django.contrib.auth.models import User
import pytz

class Command(BaseCommand):
    help = 'Update August 19 data with proper 5-minute grace period logic'

    def handle(self, *args, **options):
        self.stdout.write('⏰ Updating August 19 data with 5-minute grace period logic...')
        
        try:
            user = User.objects.get(username='doejames')
            employee = Employee.objects.get(user=user)
            self.stdout.write(f'✅ Found employee: {employee.full_name}')
        except (User.DoesNotExist, Employee.DoesNotExist):
            self.stdout.write('❌ User doejames not found.')
            return
        
        # August 19, 2025
        august_19 = datetime(2025, 8, 19).date()
        
        # Update the time-in to 8:05 PM (exactly at grace period limit - should be "On Time")
        new_time_in = datetime.combine(august_19, time(20, 5))  # 8:05 PM
        new_time_in = pytz.timezone('Asia/Manila').localize(new_time_in)
        
        # Find and update the time-in entry for August 19
        time_in_entry = TimeEntry.objects.filter(
            employee=employee,
            entry_type='time_in',
            event_time__date=august_19
        ).first()
        
        if time_in_entry:
            time_in_entry.event_time = new_time_in
            time_in_entry.notes = 'Test nightshift time-in (exactly at 5-minute grace period - should be On Time)'
            time_in_entry.save()
            self.stdout.write(f'✅ Updated time-in for August 19: {new_time_in.strftime("%I:%M %p")}')
        else:
            self.stdout.write('❌ No time-in entry found for August 19')
            return
        
        # Calculate the new metrics with grace period logic
        scheduled_time = time(20, 0)  # 8:00 PM
        grace_period_minutes = 5
        
        # Calculate late minutes (with grace period)
        actual_hour = new_time_in.hour
        actual_minute = new_time_in.minute
        scheduled_hour = scheduled_time.hour
        scheduled_minute = scheduled_time.minute
        
        # Convert to total minutes for easier calculation
        actual_total_minutes = actual_hour * 60 + actual_minute
        scheduled_total_minutes = scheduled_hour * 60 + scheduled_minute
        
        # Calculate late minutes
        if actual_total_minutes > scheduled_total_minutes:
            late_minutes = actual_total_minutes - scheduled_total_minutes
            # Apply grace period
            if late_minutes <= grace_period_minutes:
                late_minutes = 0  # Within grace period
                status = 'present'  # On Time
            else:
                late_minutes = late_minutes  # Beyond grace period
                status = 'late'
        else:
            late_minutes = 0  # Early or on time
            status = 'present'
        
        self.stdout.write(f'📊 Grace Period Calculation:')
        self.stdout.write(f'   Scheduled: {scheduled_time.strftime("%I:%M %p")}')
        self.stdout.write(f'   Actual: {new_time_in.strftime("%I:%M %p")}')
        self.stdout.write(f'   Grace Period: {grace_period_minutes} minutes')
        self.stdout.write(f'   Late Minutes: {late_minutes}')
        self.stdout.write(f'   Status: {status}')
        
        # Update the daily summary
        summary = DailyTimeSummary.objects.filter(
            employee=employee,
            date=august_19
        ).first()
        
        if summary:
            summary.time_in = new_time_in.time()
            summary.time_in_entry = time_in_entry
            summary.late_minutes = late_minutes
            summary.status = status
            
            # Recalculate billed hours (8:05 PM to 5:15 AM next day)
            # This should be approximately 9.17 hours
            summary.billed_hours = 9.17
            summary.night_differential_hours = 9.17  # Full shift is night differential
            
            summary.save()
            self.stdout.write(f'✅ Updated daily summary for August 19: {status}')
        else:
            self.stdout.write('❌ No daily summary found for August 19')
        
        self.stdout.write('')
        self.stdout.write('🎯 August 19 Update Summary:')
        self.stdout.write(f'📅 Date: {august_19}')
        self.stdout.write(f'⏰ Time In: {new_time_in.strftime("%I:%M %p")} (exactly at grace period limit)')
        self.stdout.write(f'🎭 Status: {status} (5-minute grace period applied)')
        self.stdout.write(f'⏰ Late Minutes: {late_minutes} (0 = within grace period)')
        self.stdout.write('')
        self.stdout.write('💡 Grace Period Logic:')
        self.stdout.write('   • 8:00 PM or earlier = On Time (0 min late)')
        self.stdout.write('   • 8:01 PM to 8:05 PM = On Time (0 min late) - Grace Period')
        self.stdout.write('   • 8:06 PM = Late (6 min late) - Beyond Grace Period')
        self.stdout.write('   • 8:07 PM = Late (7 min late) - Beyond Grace Period')
        self.stdout.write('')
        self.stdout.write('🚀 Now test the frontend - August 19 should show "On Time" instead of "Late"!')
