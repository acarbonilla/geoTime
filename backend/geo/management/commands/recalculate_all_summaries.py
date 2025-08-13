from django.core.management.base import BaseCommand
from django.utils import timezone
from geo.models import DailyTimeSummary
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = 'Recalculate all existing daily time summaries with updated calculation logic'

    def add_arguments(self, parser):
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date for recalculation (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='End date for recalculation (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--employee-id',
            type=str,
            help='Specific employee ID to recalculate',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recalculation even if no changes detected',
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
            # Default to last 30 days
            start_date = end_date - timedelta(days=30)
        
        # Get summaries to recalculate
        summaries_query = DailyTimeSummary.objects.filter(
            date__range=[start_date, end_date]
        )
        
        if options['employee_id']:
            summaries_query = summaries_query.filter(employee__employee_id=options['employee_id'])
        
        # Only get summaries that have time entries (can be recalculated)
        summaries_query = summaries_query.filter(
            time_in__isnull=False,
            time_out__isnull=False
        )
        
        summaries = list(summaries_query)
        
        if not summaries:
            self.stdout.write(
                self.style.WARNING('No summaries found to recalculate in the specified date range')
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Found {len(summaries)} summaries to recalculate from {start_date} to {end_date}'
            )
        )
        
        # Recalculate each summary
        recalculated_count = 0
        error_count = 0
        
        for summary in summaries:
            try:
                self.stdout.write(f'Recalculating {summary.employee.full_name} - {summary.date}')
                
                # Store old values for comparison
                old_bh = summary.billed_hours
                old_late = summary.late_minutes
                old_ut = summary.undertime_minutes
                old_nd = summary.night_differential_hours
                old_ot = summary.overtime_hours
                
                # Force recalculation
                summary.calculate_metrics()
                summary.save()
                
                # Check if values changed
                changed = (
                    old_bh != summary.billed_hours or
                    old_late != summary.late_minutes or
                    old_ut != summary.undertime_minutes or
                    old_nd != summary.night_differential_hours or
                    old_ot != summary.overtime_hours
                )
                
                if changed or options['force']:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  ✓ Recalculated: BH={summary.billed_hours:.2f}h, '
                            f'Late={summary.late_minutes}m, UT={summary.undertime_minutes}m, '
                            f'ND={summary.night_differential_hours:.2f}h, OT={summary.overtime_hours:.2f}h'
                        )
                    )
                    recalculated_count += 1
                else:
                    self.stdout.write('  - No changes detected')
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Error recalculating {summary}: {e}')
                )
                error_count += 1
        
        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(
            self.style.SUCCESS(
                f'Recalculation complete!\n'
                f'  - Total processed: {len(summaries)}\n'
                f'  - Successfully recalculated: {recalculated_count}\n'
                f'  - Errors: {error_count}'
            )
        )
        
        if recalculated_count > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    '\nThe system has been updated to use actual time worked instead of '
                    'hardcoded 480 minutes for dayshift schedules. '
                    'All existing summaries have been recalculated with the new logic.'
                )
            )
