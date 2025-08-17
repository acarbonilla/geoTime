from django.core.management.base import BaseCommand
from django.utils import timezone
from geo.models import DailyTimeSummary
from datetime import date, timedelta


class Command(BaseCommand):
    help = 'Update existing DailyTimeSummary records with the new comprehensive status system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date for update (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='End date for update (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--employee-id',
            type=int,
            help='Update only specific employee',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        start_date = options['start_date']
        end_date = options['end_date']
        employee_id = options['employee_id']
        dry_run = options['dry_run']

        # Set default date range if not provided
        if not start_date:
            start_date = (date.today() - timedelta(days=30)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = date.today().strftime('%Y-%m-%d')

        # Convert string dates to date objects
        start_date_obj = date.fromisoformat(start_date)
        end_date_obj = date.fromisoformat(end_date)

        # Build query
        queryset = DailyTimeSummary.objects.filter(
            date__gte=start_date_obj,
            date__lte=end_date_obj
        )

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        total_records = queryset.count()
        updated_count = 0
        status_changes = {}

        self.stdout.write(
            self.style.SUCCESS(
                f'Processing {total_records} records from {start_date} to {end_date}'
                + (f' for employee {employee_id}' if employee_id else '')
                + (' (DRY RUN)' if dry_run else '')
            )
        )

        for summary in queryset:
            old_status = summary.status
            old_bh = summary.billed_hours
            old_lt = summary.late_minutes
            old_ut = summary.undertime_minutes
            old_nd = summary.night_differential_hours

            # Calculate new status
            new_status = summary.calculate_comprehensive_status()

            # Check if status or metrics changed
            status_changed = old_status != new_status
            metrics_changed = (
                old_bh != summary.billed_hours or
                old_lt != summary.late_minutes or
                old_ut != summary.undertime_minutes or
                old_nd != summary.night_differential_hours
            )

            if status_changed or metrics_changed:
                if not dry_run:
                    summary.save()

                updated_count += 1
                
                # Track status changes
                if old_status not in status_changes:
                    status_changes[old_status] = {}
                if new_status not in status_changes[old_status]:
                    status_changes[old_status][new_status] = 0
                status_changes[old_status][new_status] += 1

                self.stdout.write(
                    f'Updated {summary.employee.full_name} - {summary.date}: '
                    f'{old_status} → {new_status}'
                )

                if metrics_changed:
                    self.stdout.write(
                        f'  Metrics: BH:{old_bh}→{summary.billed_hours}, '
                        f'LT:{old_lt}→{summary.late_minutes}, '
                        f'UT:{old_ut}→{summary.undertime_minutes}, '
                        f'ND:{old_nd}→{summary.night_differential_hours}'
                    )

        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f'\nUpdate complete! {updated_count} of {total_records} records updated.'
            )
        )

        if status_changes:
            self.stdout.write('\nStatus Change Summary:')
            for old_status, changes in status_changes.items():
                for new_status, count in changes.items():
                    self.stdout.write(f'  {old_status} → {new_status}: {count} records')

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    '\nThis was a dry run. No changes were made to the database.'
                )
            )
