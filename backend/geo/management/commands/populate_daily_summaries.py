from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from geo.models import Employee, DailyTimeSummary, EmployeeSchedule
from geo.utils import calculate_daily_summary, generate_daily_summaries_for_period


class Command(BaseCommand):
    help = 'Populate daily time summaries from existing time entries and schedules'

    def add_arguments(self, parser):
        parser.add_argument(
            '--employee-id',
            type=str,
            help='Specific employee ID to process (optional)',
        )
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date (YYYY-MM-DD) for processing (default: 30 days ago)',
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='End date (YYYY-MM-DD) for processing (default: today)',
        )
        parser.add_argument(
            '--force-update',
            action='store_true',
            help='Force update existing summaries',
        )

    def handle(self, *args, **options):
        # Parse dates
        if options['end_date']:
            end_date = datetime.strptime(options['end_date'], '%Y-%m-%d').date()
        else:
            end_date = timezone.now().date()
        
        if options['start_date']:
            start_date = datetime.strptime(options['start_date'], '%Y-%m-%d').date()
        else:
            start_date = end_date - timedelta(days=30)
        
        # Get employees to process
        if options['employee_id']:
            employees = Employee.objects.filter(employee_id=options['employee_id'])
            if not employees.exists():
                self.stdout.write(
                    self.style.ERROR(f'Employee with ID {options["employee_id"]} not found')
                )
                return
        else:
            employees = Employee.objects.filter(employment_status='active')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Processing {employees.count()} employees from {start_date} to {end_date}'
            )
        )
        
        total_processed = 0
        total_created = 0
        total_updated = 0
        
        for employee in employees:
            self.stdout.write(f'Processing employee: {employee.full_name}')
            
            # Generate summaries for the period
            summaries = generate_daily_summaries_for_period(employee, start_date, end_date)
            
            for summary in summaries:
                total_processed += 1
                
                if summary.pk:  # Existing summary
                    if options['force_update']:
                        summary.calculate_metrics()
                        total_updated += 1
                else:  # New summary
                    total_created += 1
            
            self.stdout.write(
                f'  - Processed {len(summaries)} days for {employee.full_name}'
            )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Completed! Processed {total_processed} summaries '
                f'({total_created} created, {total_updated} updated)'
            )
        ) 