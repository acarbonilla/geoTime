from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from geo.utils import recalculate_incorrect_statuses


class Command(BaseCommand):
    help = 'Fix incorrect status assignments in DailyTimeSummary records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date for recalculation (YYYY-MM-DD format, defaults to 30 days ago)'
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='End date for recalculation (YYYY-MM-DD format, defaults to today)'
        )
        parser.add_argument(
            '--employee-id',
            type=int,
            help='Specific employee ID to process (optional)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes'
        )

    def handle(self, *args, **options):
        # Parse dates
        if options['start_date']:
            start_date = date.fromisoformat(options['start_date'])
        else:
            start_date = date.today() - timedelta(days=30)
        
        if options['end_date']:
            end_date = date.fromisoformat(options['end_date'])
        else:
            end_date = date.today()
        
        # Get employee if specified
        employee = None
        if options['employee_id']:
            from geo.models import Employee
            try:
                employee = Employee.objects.get(id=options['employee_id'])
                self.stdout.write(f"Processing employee: {employee.full_name}")
            except Employee.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Employee with ID {options['employee_id']} not found"))
                return
        
        self.stdout.write(f"Starting status fix for period: {start_date} to {end_date}")
        
        if options['dry_run']:
            self.stdout.write("DRY RUN MODE - No changes will be made")
            # For dry run, we'll just show what would be processed
            from geo.models import DailyTimeSummary, Employee
            if employee:
                summaries = DailyTimeSummary.objects.filter(
                    employee=employee,
                    date__gte=start_date,
                    date__lte=end_date
                ).exclude(status='present').exclude(status='late')
            else:
                summaries = DailyTimeSummary.objects.filter(
                    date__gte=start_date,
                    date__lte=end_date
                ).exclude(status='present').exclude(status='late')
            
            self.stdout.write(f"Would process {summaries.count()} summaries")
            
            # Show some examples
            for summary in summaries[:5]:
                self.stdout.write(f"  - {summary.employee.full_name} on {summary.date}: {summary.status}")
            
            if summaries.count() > 5:
                self.stdout.write(f"  ... and {summaries.count() - 5} more")
        else:
            # Actually run the fix
            result = recalculate_incorrect_statuses(
                start_date=start_date,
                end_date=end_date,
                employee=employee
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Status fix completed!\n"
                    f"Total processed: {result['total_processed']}\n"
                    f"Fixed: {result['fixed_count']}\n"
                    f"Period: {result['start_date']} to {result['end_date']}"
                )
            )
