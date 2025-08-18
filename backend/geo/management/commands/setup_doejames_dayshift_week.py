from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, time, timedelta, date
from geo.models import Employee, EmployeeSchedule, TimeEntry, DailyTimeSummary
from django.contrib.auth.models import User
import pytz

class Command(BaseCommand):
    help = 'Set up complete week of dayshift data for doejames from August 25-29 with realistic time entries'

    def calculate_late_minutes_with_grace_period(self, actual_time, scheduled_time, grace_period_minutes=5):
        """Calculate late minutes with grace period logic"""
        # Convert to total minutes for easier calculation
        actual_total_minutes = actual_time.hour * 60 + actual_time.minute
        scheduled_total_minutes = scheduled_time.hour * 60 + scheduled_time.minute
        
        # Calculate late minutes
        if actual_total_minutes > scheduled_total_minutes:
            late_minutes = actual_total_minutes - scheduled_total_minutes
            # Apply grace period
            if late_minutes <= grace_period_minutes:
                return 0  # Within grace period
            else:
                return late_minutes  # Beyond grace period
        else:
            return 0  # Early or on time

    def calculate_day_differential_minutes(self, time_in, time_out, scheduled_in, scheduled_out):
        """Calculate day differential in minutes (6 AM to 6 PM)"""
        if not time_in or not time_out:
            return 0
        
        # Convert to datetime for calculations
        base_date = datetime.now().date()
        time_in_dt = datetime.combine(base_date, time_in)
        time_out_dt = datetime.combine(base_date, time_out)
        
        # Day period: 6 AM (06:00) to 6 PM (18:00)
        day_start = datetime.combine(base_date, time(6, 0))   # 6 AM
        day_end = datetime.combine(base_date, time(18, 0))    # 6 PM
        
        # Find overlap with day period
        overlap_start = max(time_in_dt, day_start)
        overlap_end = min(time_out_dt, day_end)
        
        if overlap_end > overlap_start:
            # Calculate overlap in minutes
            overlap_minutes = int((overlap_end - overlap_start).total_seconds() / 60)
            return max(0, overlap_minutes)
        
        return 0

    def handle(self, *args, **options):
        self.stdout.write('☀️ Setting up complete week of dayshift data for doejames (August 25-29)...')
        
        # Get or create doejames user
        try:
            user = User.objects.get(username='doejames')
            employee = Employee.objects.get(user=user)
            self.stdout.write(f'✅ Found employee: {employee.full_name}')
        except (User.DoesNotExist, Employee.DoesNotExist):
            self.stdout.write('❌ User doejames not found. Please create the user first.')
            return
        
        # Dayshift dates: August 25-29, 2025 (Monday-Friday)
        start_date = date(2025, 8, 25)  # Monday, August 25, 2025
        self.stdout.write(f'📅 Setting up dayshift week: {start_date} to {start_date + timedelta(days=4)}')
        
        # Dayshift times: 7:00 AM to 4:00 PM
        schedule_in = time(7, 0)   # 7:00 AM
        schedule_out = time(16, 0)  # 4:00 PM
        grace_period_minutes = 5
        
        # Create schedules for Monday-Friday
        weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        schedules_created = 0
        
        for i, day_name in enumerate(weekdays):
            current_date = start_date + timedelta(days=i)
            
            # Check if schedule already exists
            schedule, created = EmployeeSchedule.objects.get_or_create(
                employee=employee,
                date=current_date,
                defaults={
                    'scheduled_time_in': schedule_in,
                    'scheduled_time_out': schedule_out,
                    'is_night_shift': False,
                    'notes': f'Dayshift test - {day_name}'
                }
            )
            
            if created:
                schedules_created += 1
                self.stdout.write(f'✅ Created dayshift schedule for {day_name} ({current_date})')
            else:
                # Update existing schedule
                schedule.scheduled_time_in = schedule_in
                schedule.scheduled_time_out = schedule_out
                schedule.is_night_shift = False
                schedule.notes = f'Dayshift test - {day_name}'
                schedule.save()
                self.stdout.write(f'🔄 Updated dayshift schedule for {day_name} ({current_date})')
        
        # Create realistic time entries for the entire week with grace period logic
        self.stdout.write('\n⏰ Creating time entries for the entire dayshift week with grace period...')
        
        # Monday: Time-in 7:15 AM (15 min late, beyond grace period), Time-out 4:15 PM (15 min late)
        monday_time_in = datetime.combine(start_date, time(7, 15))  # 7:15 AM
        monday_time_in = pytz.timezone('Asia/Manila').localize(monday_time_in)
        
        monday_time_out = datetime.combine(start_date, time(16, 15))  # 4:15 PM
        monday_time_out = pytz.timezone('Asia/Manila').localize(monday_time_out)
        
        # Tuesday: Time-in 7:05 AM (5 min late, exactly at grace period limit - should be "On Time"), Time-out 3:45 PM (15 min early)
        tuesday_time_in = datetime.combine(start_date + timedelta(days=1), time(7, 5))  # 7:05 AM
        tuesday_time_in = pytz.timezone('Asia/Manila').localize(tuesday_time_in)
        
        tuesday_time_out = datetime.combine(start_date + timedelta(days=1), time(15, 45))  # 3:45 PM
        tuesday_time_out = pytz.timezone('Asia/Manila').localize(tuesday_time_out)
        
        # Wednesday: Time-in 6:55 AM (5 min early, on time), Time-out 4:30 PM (30 min late)
        wednesday_time_in = datetime.combine(start_date + timedelta(days=2), time(6, 55))  # 6:55 AM
        wednesday_time_in = pytz.timezone('Asia/Manila').localize(wednesday_time_in)
        
        wednesday_time_out = datetime.combine(start_date + timedelta(days=2), time(16, 30))  # 4:30 PM
        wednesday_time_out = pytz.timezone('Asia/Manila').localize(wednesday_time_out)
        
        # Thursday: Time-in 7:06 AM (6 min late, beyond grace period), Time-out 4:00 PM (on time)
        thursday_time_in = datetime.combine(start_date + timedelta(days=3), time(7, 6))  # 7:06 AM
        thursday_time_in = pytz.timezone('Asia/Manila').localize(thursday_time_in)
        
        thursday_time_out = datetime.combine(start_date + timedelta(days=3), time(16, 0))  # 4:00 PM
        thursday_time_out = pytz.timezone('Asia/Manila').localize(thursday_time_out)
        
        # Friday: Time-in 7:00 AM (on time), Time-out 4:00 PM (on time)
        friday_time_in = datetime.combine(start_date + timedelta(days=4), time(7, 0))  # 7:00 AM
        friday_time_in = pytz.timezone('Asia/Manila').localize(friday_time_in)
        
        friday_time_out = datetime.combine(start_date + timedelta(days=4), time(16, 0))  # 4:00 PM
        friday_time_out = pytz.timezone('Asia/Manila').localize(friday_time_out)
        
        # Create all time entries
        time_entries_data = [
            # Monday
            (start_date, monday_time_in, 'time_in', 'Test dayshift time-in (15 min late, beyond grace period)'),
            (start_date, monday_time_out, 'time_out', 'Test dayshift time-out (15 min late)'),
            # Tuesday
            (start_date + timedelta(days=1), tuesday_time_in, 'time_in', 'Test dayshift time-in (5 min late, exactly at grace period limit)'),
            (start_date + timedelta(days=1), tuesday_time_out, 'time_out', 'Test dayshift time-out (15 min early)'),
            # Wednesday
            (start_date + timedelta(days=2), wednesday_time_in, 'time_in', 'Test dayshift time-in (5 min early, on time)'),
            (start_date + timedelta(days=2), wednesday_time_out, 'time_out', 'Test dayshift time-out (30 min late)'),
            # Thursday
            (start_date + timedelta(days=3), thursday_time_in, 'time_in', 'Test dayshift time-in (6 min late, beyond grace period)'),
            (start_date + timedelta(days=3), thursday_time_out, 'time_out', 'Test dayshift time-out (on time)'),
            # Friday
            (start_date + timedelta(days=4), friday_time_in, 'time_in', 'Test dayshift time-in (on time)'),
            (start_date + timedelta(days=4), friday_time_out, 'time_out', 'Test dayshift time-out (on time)'),
        ]
        
        for entry_date, event_time, entry_type, notes in time_entries_data:
            time_entry, created = TimeEntry.objects.get_or_create(
                employee=employee,
                entry_type=entry_type,
                event_time__date=entry_date,
                defaults={
                    'event_time': event_time,
                    'location': None,
                    'notes': notes
                }
            )
            
            if created:
                self.stdout.write(f'✅ Created {entry_type} for {entry_date}: {event_time.strftime("%I:%M %p")}')
            else:
                time_entry.event_time = event_time
                time_entry.notes = notes
                time_entry.save()
                self.stdout.write(f'🔄 Updated {entry_type} for {entry_date}: {event_time.strftime("%I:%M %p")}')
        
        # Create or update daily summaries with complete data and grace period logic
        self.stdout.write('\n📊 Creating daily summaries with grace period logic and day differential in minutes...')
        
        summary_data = [
            # Monday: 7:15 AM - 4:15 PM (9.0 hours, 15 min late beyond grace, 15 min late)
            (start_date, monday_time_in.time(), monday_time_out.time(), 'late', 9.0, 15, 0),
            # Tuesday: 7:05 AM - 3:45 PM (8.67 hours, 0 min late within grace, 15 min early)
            (start_date + timedelta(days=1), tuesday_time_in.time(), tuesday_time_out.time(), 'undertime', 8.67, 0, 15),
            # Wednesday: 6:55 AM - 4:30 PM (9.58 hours, 0 min late early, 30 min late)
            (start_date + timedelta(days=2), wednesday_time_in.time(), wednesday_time_out.time(), 'overtime', 9.58, 0, 0),
            # Thursday: 7:06 AM - 4:00 PM (8.9 hours, 6 min late beyond grace, 0 min early)
            (start_date + timedelta(days=3), thursday_time_in.time(), thursday_time_out.time(), 'late', 8.9, 6, 0),
            # Friday: 7:00 AM - 4:00 PM (9.00 hours, 0 min late on time, 0 min early)
            (start_date + timedelta(days=4), friday_time_in.time(), friday_time_out.time(), 'present', 9.00, 0, 0),
        ]
        
        for current_date, time_in, time_out, status, billed_hours, late_minutes, undertime_minutes in summary_data:
            summary, created = DailyTimeSummary.objects.get_or_create(
                employee=employee,
                date=current_date,
                defaults={
                    'scheduled_time_in': schedule_in,
                    'scheduled_time_out': schedule_out,
                    'status': status
                }
            )
            
            # Update with complete data
            summary.time_in = time_in
            summary.time_out = time_out
            summary.status = status
            summary.billed_hours = billed_hours
            summary.late_minutes = late_minutes
            summary.undertime_minutes = undertime_minutes
            
            # Calculate day differential in MINUTES (6 AM to 6 PM period)
            day_minutes = self.calculate_day_differential_minutes(time_in, time_out, schedule_in, schedule_out)
            summary.night_differential_hours = 0.0  # No night differential for dayshift
            
            # Store day differential in minutes in the notes field
            summary.notes = f'Day Differential: {day_minutes} minutes ({day_minutes/60:.2f} hours) | Dayshift'
            
            # Link to time entries
            time_in_entry = TimeEntry.objects.filter(
                employee=employee,
                entry_type='time_in',
                event_time__date=current_date
            ).first()
            
            time_out_entry = TimeEntry.objects.filter(
                employee=employee,
                entry_type='time_out',
                event_time__date=current_date
            ).first()
            
            if time_in_entry:
                summary.time_in_entry = time_in_entry
            if time_out_entry:
                summary.time_out_entry = time_out_entry
            
            summary.save()
            
            if created:
                self.stdout.write(f'✅ Created summary for {current_date}: {status} | Day Diff: {day_minutes} min')
            else:
                self.stdout.write(f'🔄 Updated summary for {current_date}: {status} | Day Diff: {day_minutes} min')
        
        self.stdout.write('')
        self.stdout.write('🎯 Dayshift Week Test Scenario Summary (August 25-29):')
        self.stdout.write(f'👤 Employee: {employee.full_name}')
        self.stdout.write(f'📅 Week: {start_date} to {start_date + timedelta(days=4)}')
        self.stdout.write(f'⏰ Schedule: {schedule_in.strftime("%I:%M %p")} - {schedule_out.strftime("%I:%M %p")}')
        self.stdout.write(f'☀️ Shift Type: Dayshift (Monday-Friday)')
        self.stdout.write(f'⏰ Grace Period: {grace_period_minutes} minutes')
        self.stdout.write('')
        self.stdout.write('📊 Daily Breakdown with Grace Period Logic:')
        self.stdout.write('  Monday: 7:15 AM → 4:15 PM (9.0h, Late 15min beyond grace, Late 15min)')
        self.stdout.write('  Tuesday: 7:05 AM → 3:45 PM (8.67h, On Time within grace, Early 15min)')
        self.stdout.write('  Wednesday: 6:55 AM → 4:30 PM (9.58h, On Time early, Late 30min)')
        self.stdout.write('  Thursday: 7:06 AM → 4:00 PM (8.9h, Late 6min beyond grace, On Time)')
        self.stdout.write('  Friday: 7:00 AM → 4:00 PM (9.00h, On Time, On Time)')
        self.stdout.write('')
        self.stdout.write('💡 Grace Period Logic:')
        self.stdout.write('   • 7:00 AM or earlier = On Time (0 min late)')
        self.stdout.write('   • 7:01 AM to 7:05 AM = On Time (0 min late) - Grace Period')
        self.stdout.write('   • 7:06 AM and beyond = Late (actual minutes late) - Beyond Grace Period')
        self.stdout.write('')
        self.stdout.write('☀️ Day Differential (6 AM to 6 PM):')
        self.stdout.write('   • Calculates overlap with 6 AM - 6 PM period')
        self.stdout.write('   • No night differential for dayshift')
        self.stdout.write('   • More precise calculations in minutes')
        self.stdout.write('')
        self.stdout.write('🚀 Now you can test the ScheduleReport component with both scenarios!')
        self.stdout.write('💡 The frontend should now display:')
        self.stdout.write('   - Complete week of dayshifts with time in/out')
        self.stdout.write('   - Proper grace period logic (5 minutes)')
        self.stdout.write('   - Day differential in minutes for precision')
        self.stdout.write('   - Both nightshift (Aug 18-22) and dayshift (Aug 25-29) data')
        self.stdout.write('   - Different statuses: Late, Undertime, Overtime, Present')
        self.stdout.write('')
        self.stdout.write('🌙 Complete Test Coverage:')
        self.stdout.write('   • Aug 18-22: Nightshift (8 PM - 5 AM) with cross-midnight logic')
        self.stdout.write('   • Aug 25-29: Dayshift (7 AM - 4 PM) with standard day logic')
        self.stdout.write('   • Both scenarios include grace period and precise calculations')
