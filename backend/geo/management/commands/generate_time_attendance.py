from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from geo.models import Employee
from geo.utils import generate_daily_summaries_for_period, get_employee_time_attendance_report


class Command(BaseCommand):
    help = 'Generate DailyTimeSummary records by connecting TimeEntry data with EmployeeSchedule data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date (YYYY-MM-DD) for summary generation',
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='End date (YYYY-MM-DD) for summary generation',
        )
        parser.add_argument(
            '--employee-id',
            type=str,
            help='Specific employee ID to process (optional)',
        )
        parser.add_argument(
            '--month',
            type=str,
            help='Month to process (YYYY-MM format)',
        )
        parser.add_argument(
            '--generate-report',
            action='store_true',
            help='Generate and display a sample TIME ATTENDANCE report',
        )

    def handle(self, *args, **options):
        # Determine date range
        if options['month']:
            # Process entire month
            year, month = map(int, options['month'].split('-'))
            start_date = date(year, month, 1)
            if month == 12:
                end_date = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(year, month + 1, 1) - timedelta(days=1)
        elif options['start_date'] and options['end_date']:
            start_date = date.fromisoformat(options['start_date'])
            end_date = date.fromisoformat(options['end_date'])
        else:
            # Default to current month
            today = timezone.now().date()
            start_date = date(today.year, today.month, 1)
            if today.month == 12:
                end_date = date(today.year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)

        # Get employee(s) to process
        if options['employee_id']:
            try:
                employee = Employee.objects.get(employee_id=options['employee_id'])
                employees = [employee]
                self.stdout.write(f"Processing employee: {employee.full_name}")
            except Employee.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"Employee with ID {options['employee_id']} not found")
                )
                return
        else:
            employees = Employee.objects.filter(employment_status='active')
            self.stdout.write(f"Processing {employees.count()} active employees")

        # Generate summaries
        self.stdout.write(f"Generating daily summaries from {start_date} to {end_date}")
        
        total_created = 0
        total_updated = 0
        total_skipped = 0
        
        for employee in employees:
            self.stdout.write(f"Processing {employee.full_name}...")
            
            result = generate_daily_summaries_for_period(start_date, end_date, employee)
            total_created += result['total_created']
            total_updated += result['total_updated']
            total_skipped += result['total_skipped']
            
            self.stdout.write(
                f"  Created: {result['total_created']}, "
                f"Updated: {result['total_updated']}, "
                f"Skipped: {result['total_skipped']}"
            )

        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f"\nSummary Generation Complete!\n"
                f"Total Created: {total_created}\n"
                f"Total Updated: {total_updated}\n"
                f"Total Skipped: {total_skipped}\n"
                f"Total Processed: {total_created + total_updated + total_skipped}"
            )
        )

        # Generate sample report if requested
        if options['generate_report'] and employees:
            self.stdout.write("\n" + "="*80)
            self.stdout.write("SAMPLE TIME ATTENDANCE REPORT")
            self.stdout.write("="*80)
            
            # Use first employee for sample report
            sample_employee = employees[0]
            report = get_employee_time_attendance_report(sample_employee, start_date, end_date)
            
            self.stdout.write(f"Employee: {report['employee']['name']} ({report['employee']['employee_id']})")
            self.stdout.write(f"Department: {report['employee']['department']}")
            self.stdout.write(f"Period: {report['period']['start_date']} to {report['period']['end_date']}")
            self.stdout.write("-" * 80)
            
            # Display daily records
            for record in report['daily_records'][:10]:  # Show first 10 days
                self.stdout.write(
                    f"{record['date']} {record['day']} | "
                    f"Status: {record['status']} | "
                    f"Time In: {record['time_in']} | "
                    f"Time Out: {record['time_out']} | "
                    f"BH: {record['billed_hours']} | "
                    f"LT: {record['late_minutes']} | "
                    f"UT: {record['undertime_minutes']} | "
                    f"ND: {record['night_differential']}"
                )
            
            if len(report['daily_records']) > 10:
                self.stdout.write(f"... and {len(report['daily_records']) - 10} more days")
            
            self.stdout.write("-" * 80)
            self.stdout.write(f"Days Work: {report['summary']['days_worked']}")
            self.stdout.write(f"Total BH: {report['summary']['total_billed_hours']}")
            self.stdout.write(f"Total LT: {report['summary']['total_late_minutes']}")
            self.stdout.write(f"Total UT: {report['summary']['total_undertime_minutes']}")
            self.stdout.write(f"Total ND: {report['summary']['total_night_differential']}") 