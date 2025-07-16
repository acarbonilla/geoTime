from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from geo.models import Employee, Department, Location, TimeEntry
from datetime import datetime, timedelta, date
from django.core.exceptions import ObjectDoesNotExist

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
            username='jamesdoe',
            defaults={'first_name': 'James', 'last_name': 'Doe'}
        )
        self.stdout.write(self.style.SUCCESS(f'User: {user.username}'))

        # 4. Create or get an Employee
        try:
            employee = Employee.objects.get(employee_id='EMP002')
            # Update fields if needed
            employee.user = user
            employee.department = department
            employee.hire_date = date(2020, 1, 3)
            employee.save()
            created = False
        except ObjectDoesNotExist:
            employee = Employee.objects.create(
                employee_id='EMP002',
                user=user,
                department=department,
                hire_date=date(2020, 1, 3)
            )
            created = True

        self.stdout.write(self.style.SUCCESS(f'Employee: {employee.employee_id} (created={created})'))

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