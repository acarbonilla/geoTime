from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, time, timedelta, date
from geo.models import Employee, EmployeeSchedule, TimeEntry, DailyTimeSummary
from django.contrib.auth.models import User
import pytz

class Command(BaseCommand):
    help = 'Set up complete week of nightshift data for doejames with time in/out for every day and 5-minute grace period'

    def add_arguments(self, parser):
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date for the test week (YYYY-MM-DD format)',
            default='2025-08-18'  # Monday, August 18, 2025
        )

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

    def calculate_night_differential_minutes(self, time_in, time_out, scheduled_in, scheduled_out):
        """Calculate night differential in minutes (10 PM to 6 AM)"""
        if not time_in or not time_out:
            return 0
        
        # Convert to datetime for calculations
        base_date = datetime.now().date()
        time_in_dt = datetime.combine(base_date, time_in)
        time_out_dt = datetime.combine(base_date, time_out)
        
        # If time_out is earlier than time_in, it crosses midnight
        if time_out_dt < time_in_dt:
            time_out_dt += timedelta(days=1)
        
        # Night period: 10 PM (22:00) to 6 AM (06:00)
        night_start = datetime.combine(base_date, time(22, 0))  # 10 PM
        night_end = datetime.combine(base_date, time(6, 0))     # 6 AM
        night_end += timedelta(days=1)  # 6 AM next day
        
        # Find overlap with night period
        overlap_start = max(time_in_dt, night_start)
        overlap_end = min(time_out_dt, night_end)
        
        if overlap_end > overlap_start:
            # Calculate overlap in minutes
            overlap_minutes = int((overlap_end - overlap_start).total_seconds() / 60)
            return max(0, overlap_minutes)
        
        return 0

    def handle(self, *args, **options):
        self.stdout.write('🌙 Setting up complete week of nightshift data for doejames with grace period...')
        
        # Get or create doejames user
        try:
            user = User.objects.get(username='doejames')
            employee = Employee.objects.get(user=user)
            self.stdout.write(f'✅ Found employee: {employee.full_name}')
        except (User.DoesNotExist, Employee.DoesNotExist):
            self.stdout.write('❌ User doejames not found. Please create the user first.')
            return
        
        # Parse start date
        try:
            start_date = datetime.strptime(options['start_date'], '%Y-%m-%d').date()
        except ValueError:
            self.stdout.write('❌ Invalid date format. Use YYYY-MM-DD')
            return
        
        # Calculate Monday of the week
        monday = start_date - timedelta(days=start_date.weekday())
        self.stdout.write(f'📅 Setting up week starting: {monday}')
        
        # Nightshift times: 8:00 PM to 5:00 AM
        schedule_in = time(20, 0)  # 8:00 PM
        schedule_out = time(5, 0)   # 5:00 AM
        grace_period_minutes = 5
        
        # Create schedules for Monday-Friday
        weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        schedules_created = 0
        
        for i, day_name in enumerate(weekdays):
            current_date = monday + timedelta(days=i)
            
            # Check if schedule already exists
            schedule, created = EmployeeSchedule.objects.get_or_create(
                employee=employee,
                date=current_date,
                defaults={
                    'scheduled_time_in': schedule_in,
                    'scheduled_time_out': schedule_out,
                    'is_night_shift': True,
                    'notes': f'Nightshift test - {day_name}'
                }
            )
            
            if created:
                schedules_created += 1
                self.stdout.write(f'✅ Created schedule for {day_name} ({current_date})')
            else:
                # Update existing schedule
                schedule.scheduled_time_in = schedule_in
                schedule.scheduled_time_out = schedule_out
                schedule.is_night_shift = True
                schedule.notes = f'Nightshift test - {day_name}'
                schedule.save()
                self.stdout.write(f'🔄 Updated schedule for {day_name} ({current_date})')
        
        # Create realistic time entries for the entire week with grace period logic
        self.stdout.write('\n⏰ Creating time entries for the entire week with grace period...')
        
        # Monday: Time-in 8:15 PM (15 min late, beyond grace period), Time-out 4:45 AM next day (15 min early)
        monday_time_in = datetime.combine(monday, time(20, 15))  # 8:15 PM
        monday_time_in = pytz.timezone('Asia/Manila').localize(monday_time_in)
        
        tuesday_time_out = datetime.combine(monday + timedelta(days=1), time(4, 45))  # 4:45 AM
        tuesday_time_out = pytz.timezone('Asia/Manila').localize(tuesday_time_out)
        
        # Tuesday: Time-in 8:05 PM (5 min late, exactly at grace period limit - should be "On Time"), Time-out 5:15 AM next day (15 min late)
        tuesday_time_in = datetime.combine(monday + timedelta(days=1), time(20, 5))  # 8:05 PM
        tuesday_time_in = pytz.timezone('Asia/Manila').localize(tuesday_time_in)
        
        wednesday_time_out = datetime.combine(monday + timedelta(days=2), time(5, 15))  # 5:15 AM
        wednesday_time_out = pytz.timezone('Asia/Manila').localize(wednesday_time_out)
        
        # Wednesday: Time-in 7:55 PM (5 min early, on time), Time-out 4:30 AM next day (30 min early)
        wednesday_time_in = datetime.combine(monday + timedelta(days=2), time(19, 55))  # 7:55 PM
        wednesday_time_in = pytz.timezone('Asia/Manila').localize(wednesday_time_in)
        
        thursday_time_out = datetime.combine(monday + timedelta(days=3), time(4, 30))  # 4:30 AM
        thursday_time_out = pytz.timezone('Asia/Manila').localize(thursday_time_out)
        
        # Thursday: Time-in 8:06 PM (6 min late, beyond grace period), Time-out 5:30 AM next day (30 min late)
        thursday_time_in = datetime.combine(monday + timedelta(days=3), time(20, 6))  # 8:06 PM
        thursday_time_in = pytz.timezone('Asia/Manila').localize(thursday_time_in)
        
        friday_time_out = datetime.combine(monday + timedelta(days=4), time(5, 30))  # 5:30 AM
        friday_time_out = pytz.timezone('Asia/Manila').localize(friday_time_out)
        
        # Friday: Time-in 8:00 PM (on time), Time-out 5:00 AM next day (on time)
        friday_time_in = datetime.combine(monday + timedelta(days=4), time(20, 0))  # 8:00 PM
        friday_time_in = pytz.timezone('Asia/Manila').localize(friday_time_in)
        
        saturday_time_out = datetime.combine(monday + timedelta(days=5), time(5, 0))  # 5:00 AM
        saturday_time_out = pytz.timezone('Asia/Manila').localize(saturday_time_out)
        
        # Create all time entries
        time_entries_data = [
            # Monday
            (monday, monday_time_in, 'time_in', 'Test nightshift time-in (15 min late, beyond grace period)'),
            (monday + timedelta(days=1), tuesday_time_out, 'time_out', 'Test nightshift time-out (15 min early)'),
            # Tuesday
            (monday + timedelta(days=1), tuesday_time_in, 'time_in', 'Test nightshift time-in (5 min late, exactly at grace period limit)'),
            (monday + timedelta(days=2), wednesday_time_out, 'time_out', 'Test nightshift time-out (15 min late)'),
            # Wednesday
            (monday + timedelta(days=2), wednesday_time_in, 'time_in', 'Test nightshift time-in (5 min early, on time)'),
            (monday + timedelta(days=3), thursday_time_out, 'time_out', 'Test nightshift time-out (30 min early)'),
            # Thursday
            (monday + timedelta(days=3), thursday_time_in, 'time_in', 'Test nightshift time-in (6 min late, beyond grace period)'),
            (monday + timedelta(days=4), friday_time_out, 'time_out', 'Test nightshift time-out (30 min late)'),
            # Friday
            (monday + timedelta(days=4), friday_time_in, 'time_in', 'Test nightshift time-in (on time)'),
            (monday + timedelta(days=5), saturday_time_out, 'time_out', 'Test nightshift time-out (on time)'),
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
        self.stdout.write('\n📊 Creating daily summaries with grace period logic and ND in minutes...')
        
        summary_data = [
            # Monday: 8:15 PM - 4:45 AM (8.5 hours, 15 min late beyond grace, 15 min early)
            (monday, monday_time_in.time(), tuesday_time_out.time(), 'late', 8.50, 15, 15),
            # Tuesday: 8:05 PM - 5:15 AM (9.17 hours, 0 min late within grace, 15 min late)
            (monday + timedelta(days=1), tuesday_time_in.time(), wednesday_time_out.time(), 'present', 9.17, 0, 0),
            # Wednesday: 7:55 PM - 4:30 AM (8.58 hours, 0 min late early, 30 min early)
            (monday + timedelta(days=2), wednesday_time_in.time(), thursday_time_out.time(), 'undertime', 8.58, 0, 30),
            # Thursday: 8:06 PM - 5:30 AM (9.17 hours, 6 min late beyond grace, 30 min late)
            (monday + timedelta(days=3), thursday_time_in.time(), friday_time_out.time(), 'late', 9.17, 6, 0),
            # Friday: 8:00 PM - 5:00 AM (9.00 hours, 0 min late on time, 0 min early)
            (monday + timedelta(days=4), friday_time_in.time(), saturday_time_out.time(), 'present', 9.00, 0, 0),
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
            
            # Calculate night differential in MINUTES (not hours)
            nd_minutes = self.calculate_night_differential_minutes(time_in, time_out, schedule_in, schedule_out)
            summary.night_differential_hours = nd_minutes / 60.0  # Convert back to hours for storage (legacy field)
            
            # Store ND in minutes in a custom field or use existing field differently
            # For now, we'll store the minutes value in the notes field for demonstration
            summary.notes = f'ND: {nd_minutes} minutes ({nd_minutes/60:.2f} hours)'
            
            # Link to time entries
            time_in_entry = TimeEntry.objects.filter(
                employee=employee,
                entry_type='time_in',
                event_time__date=current_date
            ).first()
            
            time_out_entry = TimeEntry.objects.filter(
                employee=employee,
                entry_type='time_out',
                event_time__date=current_date + timedelta(days=1)
            ).first()
            
            if time_in_entry:
                summary.time_in_entry = time_in_entry
            if time_out_entry:
                summary.time_out_entry = time_out_entry
            
            summary.save()
            
            if created:
                self.stdout.write(f'✅ Created summary for {current_date}: {status} | ND: {nd_minutes} min')
            else:
                self.stdout.write(f'🔄 Updated summary for {current_date}: {status} | ND: {nd_minutes} min')
        
        self.stdout.write('')
        self.stdout.write('🎯 Complete Week Test Scenario Summary with Grace Period:')
        self.stdout.write(f'👤 Employee: {employee.full_name}')
        self.stdout.write(f'📅 Week: {monday} to {monday + timedelta(days=4)}')
        self.stdout.write(f'⏰ Schedule: {schedule_in.strftime("%I:%M %p")} - {schedule_out.strftime("%I:%M %p")}')
        self.stdout.write(f'🌙 Nightshift: Monday-Friday (crosses midnight)')
        self.stdout.write(f'⏰ Grace Period: {grace_period_minutes} minutes')
        self.stdout.write('')
        self.stdout.write('📊 Daily Breakdown with Grace Period Logic:')
        self.stdout.write('  Monday: 8:15 PM → 4:45 AM (8.5h, Late 15min beyond grace, Early 15min)')
        self.stdout.write('  Tuesday: 8:05 PM → 5:15 AM (9.17h, On Time within grace, Late 15min)')
        self.stdout.write('  Wednesday: 7:55 PM → 4:30 AM (8.58h, On Time early, Early 30min)')
        self.stdout.write('  Thursday: 8:06 PM → 5:30 AM (9.17h, Late 6min beyond grace, Late 30min)')
        self.stdout.write('  Friday: 8:00 PM → 5:00 AM (9.00h, On Time, On Time)')
        self.stdout.write('')
        self.stdout.write('💡 Grace Period Logic:')
        self.stdout.write('   • 8:00 PM or earlier = On Time (0 min late)')
        self.stdout.write('   • 8:01 PM to 8:05 PM = On Time (0 min late) - Grace Period')
        self.stdout.write('   • 8:06 PM = Late (6 min late) - Beyond Grace Period')
        self.stdout.write('')
        self.stdout.write('🌙 Night Differential (ND) in Minutes:')
        self.stdout.write('   • More precise than hours')
        self.stdout.write('   • Calculates overlap with 10 PM - 6 AM period')
        self.stdout.write('   • Accounts for cross-midnight shifts')
        self.stdout.write('')
        self.stdout.write('🚀 Now you can test the ScheduleReport component!')
        self.stdout.write('💡 The frontend should now display:')
        self.stdout.write('   - Complete week of nightshifts with time in/out')
        self.stdout.write('   - Proper grace period logic (5 minutes)')
        self.stdout.write('   - Night differential in minutes for precision')
        self.stdout.write('   - Cross-date indicators for each nightshift')
        self.stdout.write('   - Consecutive nightshift grouping (if enabled)')
