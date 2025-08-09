from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from geo.models import Employee, TimeEntry, DailyTimeSummary
from datetime import datetime, timedelta
import pytz

User = get_user_model()

class Command(BaseCommand):
    help = 'Test the signals functionality for TimeEntry and DailyTimeSummary'

    def add_arguments(self, parser):
        parser.add_argument(
            '--employee-id',
            type=str,
            help='Employee ID to test with (default: doejane)',
            default='doejane'
        )
        parser.add_argument(
            '--date',
            type=str,
            help='Date to test with (YYYY-MM-DD format, default: today)',
            default=None
        )

    def handle(self, *args, **options):
        employee_id = options['employee_id']
        test_date = options['date']
        
        if test_date:
            try:
                test_date = datetime.strptime(test_date, '%Y-%m-%d').date()
            except ValueError:
                self.stdout.write(
                    self.style.ERROR(f'Invalid date format: {test_date}. Use YYYY-MM-DD format.')
                )
                return
        else:
            test_date = timezone.now().date()

        self.stdout.write(f'Testing signals for employee {employee_id} on {test_date}')
        
        # Get or create employee
        try:
            employee = Employee.objects.get(employee_id=employee_id)
            self.stdout.write(f'Found employee: {employee.user.first_name} {employee.user.last_name} ({employee.employee_id})')
        except Employee.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Employee with ID {employee_id} not found')
            )
            return

        # Check current daily summary
        try:
            existing_summary = DailyTimeSummary.objects.get(
                employee=employee,
                date=test_date
            )
            self.stdout.write(f'Existing daily summary found:')
            self.stdout.write(f'  - Time In: {existing_summary.formatted_time_in or "None"}')
            self.stdout.write(f'  - Time Out: {existing_summary.formatted_time_out or "None"}')
            self.stdout.write(f'  - Status: {existing_summary.status}')
        except DailyTimeSummary.DoesNotExist:
            self.stdout.write('No existing daily summary found for this date')

        # Create a test time entry
        manila_tz = pytz.timezone('Asia/Manila')
        test_time = datetime.combine(test_date, datetime.min.time().replace(hour=9, minute=0))
        test_time = manila_tz.localize(test_time)
        
        self.stdout.write(f'Creating test time entry at {test_time}')
        
        # Check if a time entry already exists for this time
        existing_entry = TimeEntry.objects.filter(
            employee=employee,
            timestamp__date=test_date,
            entry_type='time_in'
        ).first()
        
        if existing_entry:
            self.stdout.write(f'Time entry already exists for {test_date}:')
            self.stdout.write(f'  - ID: {existing_entry.id}')
            self.stdout.write(f'  - Time: {existing_entry.timestamp}')
            self.stdout.write(f'  - Type: {existing_entry.entry_type}')
            
            # Update the existing entry to trigger the signal
            existing_entry.timestamp = test_time
            existing_entry.save()
            self.stdout.write('Updated existing time entry')
        else:
            # Create a new time entry
            time_entry = TimeEntry.objects.create(
                employee=employee,
                timestamp=test_time,
                entry_type='time_in',
                location=None,
                latitude=14.5995,
                longitude=120.9842
            )
            self.stdout.write(f'Created new time entry with ID: {time_entry.id}')

        # Wait a moment for the signal to process
        import time
        time.sleep(1)

        # Check if the daily summary was updated
        try:
            updated_summary = DailyTimeSummary.objects.get(
                employee=employee,
                date=test_date
            )
            self.stdout.write(self.style.SUCCESS('Daily summary updated successfully:'))
            self.stdout.write(f'  - Time In: {updated_summary.formatted_time_in or "None"}')
            self.stdout.write(f'  - Time Out: {updated_summary.formatted_time_out or "None"}')
            self.stdout.write(f'  - Status: {updated_summary.status}')
            self.stdout.write(f'  - Total Hours: {updated_summary.billed_hours or "None"}')
            
            # Check if the time entry is reflected in the summary
            if updated_summary.formatted_time_in:
                self.stdout.write(self.style.SUCCESS('✅ Signal test PASSED - Time entry is reflected in daily summary'))
            else:
                self.stdout.write(self.style.WARNING('⚠️ Signal test PARTIAL - Daily summary exists but time_in not set'))
                
        except DailyTimeSummary.DoesNotExist:
            self.stdout.write(
                self.style.ERROR('❌ Signal test FAILED - Daily summary was not created/updated')
            )

        # Show all time entries for this date
        time_entries = TimeEntry.objects.filter(
            employee=employee,
            timestamp__date=test_date
        ).order_by('timestamp')
        
        if time_entries.exists():
            self.stdout.write(f'\nAll time entries for {test_date}:')
            for entry in time_entries:
                self.stdout.write(f'  - {entry.timestamp.strftime("%H:%M:%S")} ({entry.entry_type})')
        else:
            self.stdout.write(f'\nNo time entries found for {test_date}')
