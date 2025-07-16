from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from geo.models import Employee, Department, Location, TimeEntry
from datetime import datetime, timedelta, date

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