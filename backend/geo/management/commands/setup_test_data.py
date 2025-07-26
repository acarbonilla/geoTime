from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from geo.models import Employee, Department, Location, TimeEntry
from datetime import datetime, timedelta, date
from django.utils import timezone

def create_open_time_in_for_team_members():
    today = timezone.now().date()
    for dept in Department.objects.filter(team_leaders__isnull=False):
        for emp in dept.employees.filter(employment_status='active'):
            # Remove any time_out entries for today
            TimeEntry.objects.filter(employee=emp, entry_type='time_out', timestamp__date=today).delete()
            # Remove all but the latest time_in for today
            time_in_entries = TimeEntry.objects.filter(employee=emp, entry_type='time_in', timestamp__date=today).order_by('-timestamp')
            if time_in_entries.count() > 1:
                # Keep only the latest
                time_in_entries.exclude(id=time_in_entries.first().id).delete()
            # If no time_in for today, create one
            if not time_in_entries.exists():
                TimeEntry.objects.create(employee=emp, entry_type='time_in')
                print(f"Created time_in for {emp.full_name}")
            else:
                print(f"{emp.full_name} already has an open session or is clocked in.")

class Command(BaseCommand):
    help = 'Create test data for Employee, Department, Location, and TimeEntry.'

    def handle(self, *args, **options):
        # 1. Create or get a Location
        location, _ = Location.objects.get_or_create(
            name='ZFC Office',
            defaults={
                'latitude': 10.0,
                'longitude': 123.0,
                'timezone_name': 'Asia/Manila'
            }
        )
        self.stdout.write(self.style.SUCCESS(f'Location: {location.name}'))

        # 2. Create or get a Department
        department, _ = Department.objects.get_or_create(
            name='IT Department',
            location=location
        )
        self.stdout.write(self.style.SUCCESS(f'Department: {department.name}'))

        # 3. Create or get a User
        user, _ = User.objects.get_or_create(
            username='johndoe',
            defaults={'first_name': 'John', 'last_name': 'Doe'}
        )
        self.stdout.write(self.style.SUCCESS(f'User: {user.username}'))

        # 4. Create or get an Employee
        employee, _ = Employee.objects.get_or_create(
            user=user,
            defaults={
                'employee_id': 'EMP001',
                'department': department,
                'hire_date': date(2020, 1, 1)
            }
        )
        self.stdout.write(self.style.SUCCESS(f'Employee: {employee.employee_id}'))

        # 5. Create Time Entries for today and yesterday
        now = datetime.now()
        entries = [
            TimeEntry(employee=employee, entry_type='time_in', timestamp=now - timedelta(hours=8), location=location),
            TimeEntry(employee=employee, entry_type='time_out', timestamp=now - timedelta(hours=4), location=location),
            TimeEntry(employee=employee, entry_type='time_in', timestamp=now - timedelta(days=1, hours=8), location=location),
            TimeEntry(employee=employee, entry_type='time_out', timestamp=now - timedelta(days=1, hours=4), location=location),
        ]
        TimeEntry.objects.bulk_create(entries)
        self.stdout.write(self.style.SUCCESS('Test time entries created!'))

        # Call this function at the end of your setup script
        create_open_time_in_for_team_members() 