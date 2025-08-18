from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, time, timedelta, date
from geo.models import Employee, EmployeeSchedule, TimeEntry, DailyTimeSummary
from django.contrib.auth.models import User
import pytz

class Command(BaseCommand):
    help = 'Set up production nightshift test data with flexible user selection and production deployment guidance'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Username to create test data for (default: doejames)',
            default='doejames'
        )
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date for the test week (YYYY-MM-DD format)',
            default='2025-08-18'  # Monday, August 18, 2025
        )
        parser.add_argument(
            '--production-mode',
            action='store_true',
            help='Enable production mode with enhanced validation'
        )
        parser.add_argument(
            '--list-users',
            action='store_true',
            help='List all available users and employees'
        )

    def list_available_users(self):
        """List all available users and employees for selection"""
        self.stdout.write('👥 Available Users and Employees:')
        self.stdout.write('=' * 50)
        
        users = User.objects.all()
        employees = Employee.objects.all()
        
        self.stdout.write('📋 Users:')
        for user in users:
            self.stdout.write(f'   • {user.username} ({user.first_name} {user.last_name})')
        
        self.stdout.write('\n👤 Employees:')
        for employee in employees:
            dept = employee.department.name if employee.department else 'No Dept'
            pos = employee.position if employee.position else 'No Position'
            self.stdout.write(f'   • {employee.user.username} - {employee.full_name} | {dept} | {pos}')
        
        self.stdout.write('\n💡 Use --username <username> to select a specific user for testing')

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

    def validate_user(self, username):
        """Validate that the user exists and has proper setup"""
        try:
            user = User.objects.get(username=username)
            employee = Employee.objects.get(user=user)
            
            # Validation checks
            if not employee.employment_status:
                self.stdout.write(f'⚠️  Warning: Employee {username} has no employment status')
            
            if not employee.department:
                self.stdout.write(f'⚠️  Warning: Employee {username} has no department assigned')
            
            if not employee.position:
                self.stdout.write(f'⚠️  Warning: Employee {username} has no position assigned')
            
            return user, employee
            
        except (User.DoesNotExist, Employee.DoesNotExist) as e:
            self.stdout.write(f'❌ User validation failed: {e}')
            return None, None

    def handle(self, *args, **options):
        # Check if user wants to list available users
        if options.get('list_users', False):
            self.list_available_users()
            return
        
        username = options.get('username', 'doejames')
        production_mode = options.get('production_mode', False)
        
        if production_mode:
            self.stdout.write('🔒 PRODUCTION MODE ENABLED - Enhanced validation active')
            self.stdout.write(f'🌙 Setting up PRODUCTION nightshift test data for {username}...')
        else:
            self.stdout.write(f'🌙 Setting up nightshift test data for {username}...')
        
        # Get or validate user
        user, employee = self.validate_user(username)
        
        if not user or not employee:
            self.stdout.write(f'❌ User {username} validation failed. Cannot proceed.')
            self.stdout.write('💡 Use --list-users to see available users')
            return
        
        self.stdout.write(f'✅ User validated: {employee.full_name}')
        self.stdout.write(f'🏢 Department: {employee.department.name if employee.department else "Not assigned"}')
        self.stdout.write(f'📍 Position: {employee.position if employee.position else "Not assigned"}')
        self.stdout.write(f'👤 Role: {employee.role if hasattr(employee, "role") else "Not specified"}')
        
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
                    'notes': f'Nightshift test - {day_name} ({username})'
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
                schedule.notes = f'Nightshift test - {day_name} ({username})'
                schedule.save()
                self.stdout.write(f'🔄 Updated schedule for {day_name} ({current_date})')
        
        # Create realistic time entries with various scenarios
        self.stdout.write('\n⏰ Creating time entries with realistic scenarios...')
        
        # Realistic scenarios:
        # Monday: Slightly late (8:12 PM) - common scenario
        monday_time_in = datetime.combine(monday, time(20, 12))  # 8:12 PM
        monday_time_in = pytz.timezone('Asia/Manila').localize(monday_time_in)
        
        tuesday_time_out = datetime.combine(monday + timedelta(days=1), time(5, 8))  # 5:08 AM
        tuesday_time_out = pytz.timezone('Asia/Manila').localize(tuesday_time_out)
        
        # Tuesday: On time within grace period (8:03 PM) - good employee
        tuesday_time_in = datetime.combine(monday + timedelta(days=1), time(20, 3))  # 8:03 PM
        tuesday_time_in = pytz.timezone('Asia/Manila').localize(tuesday_time_in)
        
        wednesday_time_out = datetime.combine(monday + timedelta(days=2), time(4, 52))  # 4:52 AM
        wednesday_time_out = pytz.timezone('Asia/Manila').localize(wednesday_time_out)
        
        # Wednesday: Early arrival (7:45 PM) - proactive employee
        wednesday_time_in = datetime.combine(monday + timedelta(days=2), time(19, 45))  # 7:45 PM
        wednesday_time_in = pytz.timezone('Asia/Manila').localize(wednesday_time_in)
        
        thursday_time_out = datetime.combine(monday + timedelta(days=3), time(5, 15))  # 5:15 AM
        thursday_time_out = pytz.timezone('Asia/Manila').localize(thursday_time_out)
        
        # Thursday: Late beyond grace period (8:18 PM) - traffic issues
        thursday_time_in = datetime.combine(monday + timedelta(days=3), time(20, 18))  # 8:18 PM
        thursday_time_in = pytz.timezone('Asia/Manila').localize(thursday_time_in)
        
        friday_time_out = datetime.combine(monday + timedelta(days=4), time(5, 0))  # 5:00 AM
        friday_time_out = pytz.timezone('Asia/Manila').localize(friday_time_out)
        
        # Friday: Perfect timing (8:00 PM) - end of week motivation
        friday_time_in = datetime.combine(monday + timedelta(days=4), time(20, 0))  # 8:00 PM
        friday_time_in = pytz.timezone('Asia/Manila').localize(friday_time_in)
        
        # Create all time entries
        time_entries_data = [
            # Monday
            (monday, monday_time_in, 'time_in', 'Slightly late arrival (12 min late, beyond grace)'),
            (monday + timedelta(days=1), tuesday_time_out, 'time_out', 'Slightly late departure (8 min late)'),
            # Tuesday
            (monday + timedelta(days=1), tuesday_time_in, 'time_in', 'Good timing (3 min late, within grace period)'),
            (monday + timedelta(days=2), wednesday_time_out, 'time_out', 'Early departure (8 min early)'),
            # Wednesday
            (monday + timedelta(days=2), wednesday_time_in, 'time_in', 'Proactive early arrival (15 min early)'),
            (monday + timedelta(days=3), thursday_time_out, 'time_out', 'Slightly late departure (15 min late)'),
            # Thursday
            (monday + timedelta(days=3), thursday_time_in, 'time_in', 'Traffic delay (18 min late, beyond grace)'),
            (monday + timedelta(days=4), friday_time_out, 'time_out', 'On time departure'),
            # Friday
            (monday + timedelta(days=4), friday_time_in, 'time_in', 'Perfect timing (on time)'),
            (monday + timedelta(days=5), friday_time_out, 'time_out', 'Perfect timing (on time)'),
        ]
        
        for entry_date, event_time, entry_type, notes in time_entries_data:
            time_entry, created = TimeEntry.objects.get_or_create(
                employee=employee,
                entry_type=entry_type,
                event_time__date=entry_date,
                defaults={
                    'event_time': event_time,
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
        
        # Create or update daily summaries with complete data
        self.stdout.write('\n📊 Creating daily summaries with enhanced metrics...')
        
        summary_data = [
            # Monday: 8:12 PM - 5:08 AM (8.93 hours, 12 min late beyond grace, 8 min late)
            (monday, monday_time_in.time(), tuesday_time_out.time(), 'late', 8.93, 12, 0),
            # Tuesday: 8:03 PM - 4:52 AM (8.82 hours, 0 min late within grace, 8 min early)
            (monday + timedelta(days=1), tuesday_time_in.time(), wednesday_time_out.time(), 'undertime', 8.82, 0, 8),
            # Wednesday: 7:45 PM - 5:15 AM (9.50 hours, 0 min late early, 15 min late)
            (monday + timedelta(days=2), wednesday_time_in.time(), thursday_time_out.time(), 'overtime', 9.50, 0, 0),
            # Thursday: 8:18 PM - 5:00 AM (8.70 hours, 18 min late beyond grace, 0 min early)
            (monday + timedelta(days=3), thursday_time_in.time(), friday_time_out.time(), 'late', 8.70, 18, 0),
            # Friday: 8:00 PM - 5:00 AM (9.00 hours, 0 min late on time, 0 min early)
            (monday + timedelta(days=4), friday_time_in.time(), friday_time_out.time(), 'present', 9.00, 0, 0),
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
            
            # Calculate night differential in MINUTES
            nd_minutes = self.calculate_night_differential_minutes(time_in, time_out, schedule_in, schedule_out)
            summary.night_differential_hours = nd_minutes / 60.0  # Convert back to hours for storage
            
            # Store notes
            summary.notes = f'ND: {nd_minutes} min ({nd_minutes/60:.2f}h) | {username} | Nightshift'
            
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
        self.stdout.write('🎯 Nightshift Test Scenario Summary:')
        self.stdout.write(f'👤 Employee: {employee.full_name} ({username})')
        self.stdout.write(f'🏢 Department: {employee.department.name if employee.department else "Not assigned"}')
        self.stdout.write(f'📍 Position: {employee.position if employee.position else "Not assigned"}')
        self.stdout.write(f'📅 Week: {monday} to {monday + timedelta(days=4)}')
        self.stdout.write(f'⏰ Schedule: {schedule_in.strftime("%I:%M %p")} - {schedule_out.strftime("%I:%M %p")}')
        self.stdout.write(f'🌙 Shift Type: Nightshift (Monday-Friday)')
        self.stdout.write(f'⏰ Grace Period: {grace_period_minutes} minutes')
        self.stdout.write('')
        self.stdout.write('📊 Daily Breakdown with Realistic Scenarios:')
        self.stdout.write('  Monday: 8:12 PM → 5:08 AM (8.93h, Late 12min beyond grace, Late 8min)')
        self.stdout.write('  Tuesday: 8:03 PM → 4:52 AM (8.82h, On Time within grace, Early 8min)')
        self.stdout.write('  Wednesday: 7:45 PM → 5:15 AM (9.50h, On Time early, Late 15min)')
        self.stdout.write('  Thursday: 8:18 PM → 5:00 AM (8.70h, Late 18min beyond grace, On Time)')
        self.stdout.write('  Friday: 8:00 PM → 5:00 AM (9.00h, On Time, On Time)')
        self.stdout.write('')
        self.stdout.write('💡 Grace Period Logic:')
        self.stdout.write('   • 8:00 PM or earlier = On Time (0 min late)')
        self.stdout.write('   • 8:01 PM to 8:05 PM = On Time (0 min late) - Grace Period')
        self.stdout.write('   • 8:06 PM and beyond = Late (actual minutes late) - Beyond Grace Period')
        self.stdout.write('')
        self.stdout.write('🌙 Night Differential (10 PM to 6 AM):')
        self.stdout.write('   • Calculates overlap with 10 PM - 6 AM period')
        self.stdout.write('   • Accounts for cross-midnight shifts')
        self.stdout.write('   • More precise calculations in minutes')
        self.stdout.write('')
        self.stdout.write('🚀 Testing Ready:')
        self.stdout.write('💡 The frontend should now display:')
        self.stdout.write('   - Complete week of nightshifts with time in/out')
        self.stdout.write('   - Proper grace period logic (5 minutes)')
        self.stdout.write('   - Night differential in minutes for precision')
        self.stdout.write('   - Realistic scenarios and timing')
        self.stdout.write('')
        self.stdout.write('🌐 PRODUCTION DEPLOYMENT GUIDE:')
        self.stdout.write('')
        self.stdout.write('📋 For Production Environment:')
        self.stdout.write('   1. Deploy the updated code to production')
        self.stdout.write('   2. Run this command with production username:')
        self.stdout.write(f'      python manage.py setup_production_nightshift_test --username carbonillaat --production-mode')
        self.stdout.write('   3. Verify production user exists: carbonillaat, marinasl, rachot, bontiae, germanr')
        self.stdout.write('   4. Test with real production data and permissions')
        self.stdout.write('')
        self.stdout.write('🔧 Available Production Users:')
        self.stdout.write('   • carbonillaat (Production Admin)')
        self.stdout.write('   • marinasl (Production Employee)')
        self.stdout.write('   • rachot (Production Employee)')
        self.stdout.write('   • bontiae (Production Employee)')
        self.stdout.write('   • germanr (Production Employee)')
        self.stdout.write('')
        self.stdout.write('💡 Use --list-users to see all available users in current environment')
