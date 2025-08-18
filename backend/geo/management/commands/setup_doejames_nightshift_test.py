from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, time, timedelta, date
from geo.models import Employee, EmployeeSchedule, TimeEntry, DailyTimeSummary
from django.contrib.auth.models import User
import pytz

class Command(BaseCommand):
    help = 'Set up test data for doejames with Monday-Friday nightshift schedule'

    def add_arguments(self, parser):
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date for the test week (YYYY-MM-DD format)',
            default='2025-08-18'  # Monday, August 18, 2025 (matches frontend)
        )

    def handle(self, *args, **options):
        self.stdout.write('🌙 Setting up doejames nightshift test data...')
        
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
        
        # Create sample time entries for Monday (to test the functionality)
        monday_date = monday
        tuesday_date = monday + timedelta(days=1)
        
        # Monday time-in at 8:15 PM (15 minutes late)
        monday_time_in = datetime.combine(monday_date, time(20, 15))  # 8:15 PM
        monday_time_in = pytz.timezone('Asia/Manila').localize(monday_time_in)
        
        # Tuesday time-out at 4:45 AM (15 minutes early)
        tuesday_time_out = datetime.combine(tuesday_date, time(4, 45))  # 4:45 AM
        tuesday_time_out = pytz.timezone('Asia/Manila').localize(tuesday_time_out)
        
        # Create or update time entries
        time_in_entry, created = TimeEntry.objects.get_or_create(
            employee=employee,
            entry_type='time_in',
            event_time__date=monday_date,
            defaults={
                'event_time': monday_time_in,
                'location': None,
                'notes': 'Test nightshift time-in (15 min late)'
            }
        )
        
        if created:
            self.stdout.write(f'✅ Created time-in entry for Monday: {monday_time_in.strftime("%I:%M %p")}')
        else:
            time_in_entry.event_time = monday_time_in
            time_in_entry.notes = 'Test nightshift time-in (15 min late)'
            time_in_entry.save()
            self.stdout.write(f'🔄 Updated time-in entry for Monday: {monday_time_in.strftime("%I:%M %p")}')
        
        time_out_entry, created = TimeEntry.objects.get_or_create(
            employee=employee,
            entry_type='time_out',
            event_time__date=tuesday_date,
            defaults={
                'event_time': tuesday_time_out,
                'location': None,
                'notes': 'Test nightshift time-out (15 min early)'
            }
        )
        
        if created:
            self.stdout.write(f'✅ Created time-out entry for Tuesday: {tuesday_time_out.strftime("%I:%M %p")}')
        else:
            time_out_entry.event_time = tuesday_time_out
            time_out_entry.notes = 'Test nightshift time-out (15 min early)'
            time_out_entry.save()
            self.stdout.write(f'🔄 Updated time-out entry for Tuesday: {tuesday_time_out.strftime("%I:%M %p")}')
        
        # Create or update daily summaries
        for i in range(5):  # Monday to Friday
            current_date = monday + timedelta(days=i)
            
            summary, created = DailyTimeSummary.objects.get_or_create(
                employee=employee,
                date=current_date,
                defaults={
                    'scheduled_time_in': schedule_in,
                    'scheduled_time_out': schedule_out,
                    'status': 'scheduled'
                }
            )
            
            # Update with actual data for Monday
            if current_date == monday_date:
                summary.time_in = time_in_entry.event_time.time()
                summary.time_in_entry = time_in_entry
                summary.status = 'late'  # 15 minutes late
                summary.billed_hours = 8.50  # 8:15 PM to 4:45 AM = 8.5 hours
                summary.late_minutes = 15
                summary.undertime_minutes = 15
                summary.night_differential_hours = 8.50  # Full shift is night differential
                summary.save()
                self.stdout.write(f'✅ Updated Monday summary with time entries')
            elif current_date == tuesday_date:
                summary.time_out = time_out_entry.event_time.time()
                summary.time_out_entry = time_out_entry
                summary.save()
                self.stdout.write(f'✅ Updated Tuesday summary with time-out entry')
            else:
                summary.save()
        
        self.stdout.write('')
        self.stdout.write('🎯 Test Scenario Summary:')
        self.stdout.write(f'👤 Employee: {employee.full_name}')
        self.stdout.write(f'📅 Week: {monday} to {monday + timedelta(days=4)}')
        self.stdout.write(f'⏰ Schedule: {schedule_in.strftime("%I:%M %p")} - {schedule_out.strftime("%I:%M %p")}')
        self.stdout.write(f'🌙 Nightshift: Monday-Friday (crosses midnight)')
        self.stdout.write(f'📊 Monday: Time-in 8:15 PM (15 min late), Time-out 4:45 AM next day (15 min early)')
        self.stdout.write(f'📊 Tuesday: Time-out 4:45 AM (from previous nightshift)')
        self.stdout.write('')
        self.stdout.write('🚀 Now you can test the ScheduleReport component!')
        self.stdout.write('💡 The frontend should now display:')
        self.stdout.write('   - Monday nightshift with cross-date indicator')
        self.stdout.write('   - Tuesday with previous nightshift timeout')
        self.stdout.write('   - Consecutive nightshift grouping (if enabled)')
