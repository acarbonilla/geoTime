from django.core.management.base import BaseCommand
from geo.models import Employee, EmployeeSchedule, TimeEntry, DailyTimeSummary
from django.contrib.auth.models import User
from datetime import datetime

class Command(BaseCommand):
    help = 'Investigate all August data in the database to find source of August 23 data'

    def handle(self, *args, **options):
        self.stdout.write('🔍 Investigating all August data in the database...')
        
        # Check all employees for August data
        self.stdout.write('\n👥 Checking all employees for August data...')
        
        employees = Employee.objects.all()
        for employee in employees:
            august_schedules = EmployeeSchedule.objects.filter(
                employee=employee,
                date__month=8,
                date__year=2025
            ).order_by('date')
            
            if august_schedules.exists():
                self.stdout.write(f'\n👤 Employee: {employee.full_name} (ID: {employee.id})')
                self.stdout.write(f'   User: {employee.user.username if employee.user else "No user"}')
                
                for schedule in august_schedules:
                    self.stdout.write(f'   📅 {schedule.date}: {schedule.scheduled_time_in} - {schedule.scheduled_time_out} (Nightshift: {schedule.is_night_shift})')
                    if schedule.notes:
                        self.stdout.write(f'      Notes: {schedule.notes}')
                
                # Check time entries for this employee in August
                august_time_entries = TimeEntry.objects.filter(
                    employee=employee,
                    event_time__month=8,
                    event_time__year=2025
                ).order_by('event_time')
                
                if august_time_entries.exists():
                    self.stdout.write(f'   ⏰ Time Entries:')
                    for entry in august_time_entries:
                        self.stdout.write(f'      {entry.event_time.date()} {entry.event_time.time()}: {entry.entry_type}')
                
                # Check daily summaries for this employee in August
                august_summaries = DailyTimeSummary.objects.filter(
                    employee=employee,
                    date__month=8,
                    date__year=2025
                ).order_by('date')
                
                if august_summaries.exists():
                    self.stdout.write(f'   📊 Daily Summaries:')
                    for summary in august_summaries:
                        status = summary.status or 'N/A'
                        time_in = summary.time_in.strftime('%I:%M %p') if summary.time_in else 'N/A'
                        time_out = summary.time_out.strftime('%I:%M %p') if summary.time_out else 'N/A'
                        self.stdout.write(f'      {summary.date}: {time_in} - {time_out} | Status: {status}')
        
        # Check for any orphaned data
        self.stdout.write('\n🔍 Checking for orphaned data...')
        
        # Check schedules without employees
        orphaned_schedules = EmployeeSchedule.objects.filter(
            date__month=8,
            date__year=2025
        ).exclude(employee__isnull=False)
        
        if orphaned_schedules.exists():
            self.stdout.write(f'   ⚠️ Found {orphaned_schedules.count()} orphaned schedules in August')
            for schedule in orphaned_schedules:
                self.stdout.write(f'      {schedule.date}: {schedule.scheduled_time_in} - {schedule.scheduled_time_out}')
        
        # Check time entries without employees
        orphaned_entries = TimeEntry.objects.filter(
            event_time__month=8,
            event_time__year=2025
        ).exclude(employee__isnull=False)
        
        if orphaned_entries.exists():
            self.stdout.write(f'   ⚠️ Found {orphaned_entries.count()} orphaned time entries in August')
            for entry in orphaned_entries:
                self.stdout.write(f'      {entry.event_time.date()} {entry.event_time.time()}: {entry.entry_type}')
        
        # Check daily summaries without employees
        orphaned_summaries = DailyTimeSummary.objects.filter(
            date__month=8,
            date__year=2025
        ).exclude(employee__isnull=False)
        
        if orphaned_summaries.exists():
            self.stdout.write(f'   ⚠️ Found {orphaned_summaries.count()} orphaned daily summaries in August')
            for summary in orphaned_summaries:
                self.stdout.write(f'      {summary.date}: {summary.status or "N/A"}')
        
        # Check specifically for August 23 data
        self.stdout.write('\n🎯 Specifically checking for August 23 data...')
        
        august_23_schedules = EmployeeSchedule.objects.filter(date__date='2025-08-23')
        august_23_entries = TimeEntry.objects.filter(event_time__date='2025-08-23')
        august_23_summaries = DailyTimeSummary.objects.filter(date__date='2025-08-23')
        
        if august_23_schedules.exists():
            self.stdout.write(f'   📅 August 23 Schedules: {august_23_schedules.count()}')
            for schedule in august_23_schedules:
                employee_name = schedule.employee.full_name if schedule.employee else "ORPHANED"
                self.stdout.write(f'      Employee: {employee_name} | {schedule.scheduled_time_in} - {schedule.scheduled_time_out}')
        
        if august_23_entries.exists():
            self.stdout.write(f'   ⏰ August 23 Time Entries: {august_23_entries.count()}')
            for entry in august_23_entries:
                employee_name = entry.employee.full_name if entry.employee else "ORPHANED"
                self.stdout.write(f'      Employee: {employee_name} | {entry.event_time.time()} | {entry.entry_type}')
        
        if august_23_summaries.exists():
            self.stdout.write(f'   📊 August 23 Daily Summaries: {august_23_summaries.count()}')
            for summary in august_23_summaries:
                employee_name = summary.employee.full_name if summary.employee else "ORPHANED"
                self.stdout.write(f'      Employee: {employee_name} | Status: {summary.status or "N/A"}')
        
        self.stdout.write('\n💡 To clean up unwanted data, you can:')
        self.stdout.write('   1. Delete specific records by date')
        self.stdout.write('   2. Clear all August data and recreate')
        self.stdout.write('   3. Check if there are other test scripts running')
