from django.core.management.base import BaseCommand
from geo.models import Employee, EmployeeSchedule, TimeEntry, DailyTimeSummary
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Check what data exists for doejames in the database'

    def handle(self, *args, **options):
        self.stdout.write('🔍 Checking doejames data in database...')
        
        try:
            user = User.objects.get(username='doejames')
            employee = Employee.objects.get(user=user)
            self.stdout.write(f'✅ Found employee: {employee.full_name}')
        except (User.DoesNotExist, Employee.DoesNotExist):
            self.stdout.write('❌ User doejames not found.')
            return
        
        # Check EmployeeSchedule data
        self.stdout.write('\n📅 EmployeeSchedule Data:')
        schedules = EmployeeSchedule.objects.filter(employee=employee).order_by('date')[:10]
        if schedules:
            for schedule in schedules:
                self.stdout.write(f'  {schedule.date}: {schedule.scheduled_time_in} - {schedule.scheduled_time_out} (Nightshift: {schedule.is_night_shift})')
        else:
            self.stdout.write('  No schedules found')
        
        # Check TimeEntry data
        self.stdout.write('\n⏰ TimeEntry Data:')
        time_entries = TimeEntry.objects.filter(employee=employee).order_by('-event_time')[:10]
        if time_entries:
            for entry in time_entries:
                self.stdout.write(f'  {entry.event_time.date()} {entry.event_time.time()}: {entry.entry_type}')
        else:
            self.stdout.write('  No time entries found')
        
        # Check DailyTimeSummary data
        self.stdout.write('\n📊 DailyTimeSummary Data:')
        summaries = DailyTimeSummary.objects.filter(employee=employee).order_by('date')[:10]
        if summaries:
            for summary in summaries:
                status = summary.status or 'N/A'
                time_in = summary.time_in.strftime('%I:%M %p') if summary.time_in else 'N/A'
                time_out = summary.time_out.strftime('%I:%M %p') if summary.time_out else 'N/A'
                self.stdout.write(f'  {summary.date}: {time_in} - {time_out} | Status: {status}')
        else:
            self.stdout.write('  No daily summaries found')
        
        # Check for any data in August
        self.stdout.write('\n🔍 Checking for August data:')
        august_schedules = EmployeeSchedule.objects.filter(
            employee=employee,
            date__month=8
        ).order_by('date')
        
        if august_schedules:
            self.stdout.write(f'  Found {august_schedules.count()} schedules in August:')
            for schedule in august_schedules:
                self.stdout.write(f'    {schedule.date}: {schedule.scheduled_time_in} - {schedule.scheduled_time_out}')
        else:
            self.stdout.write('  No August schedules found')
        
        # Check for any data in January
        self.stdout.write('\n🔍 Checking for January data:')
        january_schedules = EmployeeSchedule.objects.filter(
            employee=employee,
            date__month=1
        ).order_by('date')
        
        if january_schedules:
            self.stdout.write(f'  Found {january_schedules.count()} schedules in January:')
            for schedule in january_schedules:
                self.stdout.write(f'    {schedule.date}: {schedule.scheduled_time_in} - {schedule.scheduled_time_out}')
        else:
            self.stdout.write('  No January schedules found')
