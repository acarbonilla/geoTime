from django.core.management.base import BaseCommand
from django.utils import timezone
from geo.models import Employee
from geo.utils import calculate_daily_summary
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = 'Fix missing time out data by regenerating daily summaries for a specific period'

    def add_arguments(self, parser):
        parser.add_argument(
            '--employee-id',
            type=str,
            help='Employee ID to fix (e.g., ALS00005)',
        )
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='End date (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--fix-august-13',
            action='store_true',
            help='Fix August 13 specifically for testing',
        )

    def handle(self, *args, **options):
        if options['fix_august_13']:
            # Fix August 13 specifically
            start_date = datetime(2025, 8, 13).date()
            end_date = datetime(2025, 8, 13).date()
            self.stdout.write(f'Fixing August 13 time out data...')
        else:
            # Use provided dates or default to current month
            if options['start_date']:
                start_date = datetime.strptime(options['start_date'], '%Y-%m-%d').date()
            else:
                start_date = timezone.now().date().replace(day=1)
            
            if options['end_date']:
                end_date = datetime.strptime(options['end_date'], '%Y-%m-%d').date()
            else:
                end_date = timezone.now().date()

        # Get employee
        if options['employee_id']:
            try:
                employee = Employee.objects.get(employee_id=options['employee_id'])
            except Employee.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Employee with ID {options["employee_id"]} not found')
                )
                return
        else:
            # Default to Jane Doe for testing
            try:
                employee = Employee.objects.get(employee_id='ALS00005')
            except Employee.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR('Default employee ALS00005 not found. Please specify --employee-id')
                )
                return

        self.stdout.write(f'Fixing time out data for {employee.full_name} ({employee.employee_id})')
        self.stdout.write(f'Period: {start_date} to {end_date}')

        try:
            # Regenerate daily summaries
            summaries_updated = 0
            current_date = start_date
            while current_date <= end_date:
                try:
                    # Calculate the daily summary for this date
                    summary = calculate_daily_summary(employee, current_date)
                    if summary:
                        summaries_updated += 1
                        self.stdout.write(f'Updated summary for {current_date}')
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'Error updating summary for {current_date}: {str(e)}')
                    )
                current_date += timedelta(days=1)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully updated {summaries_updated} daily summaries'
                )
            )
            
            # Show the specific record for August 13 if fixing that date
            if options['fix_august_13']:
                from geo.models import DailyTimeSummary
                try:
                    summary = DailyTimeSummary.objects.get(
                        employee=employee, 
                        date=datetime(2025, 8, 13).date()
                    )
                    self.stdout.write(f'\nAugust 13 Summary:')
                    self.stdout.write(f'  Time In: {summary.time_in}')
                    self.stdout.write(f'  Time Out: {summary.time_out}')
                    self.stdout.write(f'  Status: {summary.status}')
                    if summary.time_out_entry:
                        self.stdout.write(f'  Time Out Entry: {summary.time_out_entry.event_time}')
                except DailyTimeSummary.DoesNotExist:
                    self.stdout.write(self.style.WARNING('August 13 summary not found'))

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error fixing time out data: {str(e)}')
            )
