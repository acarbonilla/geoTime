from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from geo.models import Location, Department, Employee
from datetime import date


class Command(BaseCommand):
    help = 'Set up test data for geofencing testing'

    def handle(self, *args, **options):
        self.stdout.write('🚀 Setting up test data for geofencing...')
        
        # Create test user
        user, created = User.objects.get_or_create(
            username='testuser',
            defaults={
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john.doe@example.com',
                'is_staff': True
            }
        )
        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write('✅ Created test user: testuser (password: testpass123)')
        else:
            self.stdout.write('ℹ️  Test user already exists')
        
        # Create test location (Manila coordinates)
        location, created = Location.objects.get_or_create(
            name='Manila Office',
            defaults={
                'latitude': 14.5995,
                'longitude': 120.9842,
                'timezone_name': 'Asia/Manila',
                'timezone_offset': 28800,
                'city': 'Manila',
                'country': 'Philippines',
                'state': 'Metro Manila',
                'display_name': 'Manila Office, Metro Manila, Philippines',
                'geofence_radius': 100  # 100 meters
            }
        )
        if created:
            self.stdout.write('✅ Created test location: Manila Office')
        else:
            self.stdout.write('ℹ️  Test location already exists')
        
        # Create test department
        department, created = Department.objects.get_or_create(
            name='IT Department',
            defaults={
                'code': 'IT',
                'description': 'Information Technology Department',
                'location': location,
                'is_active': True
            }
        )
        if created:
            self.stdout.write('✅ Created test department: IT Department')
        else:
            self.stdout.write('ℹ️  Test department already exists')
        
        # Create test employee
        employee, created = Employee.objects.get_or_create(
            user=user,
            defaults={
                'employee_id': 'EMP001',
                'department': department,
                'position': 'Software Developer',
                'hire_date': date.today(),
                'employment_status': 'active',
                'phone': '+63 912 345 6789',
                'emergency_contact': 'Jane Doe (+63 987 654 3210)'
            }
        )
        if created:
            self.stdout.write('✅ Created test employee: John Doe (EMP001)')
        else:
            self.stdout.write('ℹ️  Test employee already exists')
        
        # Set department manager
        if not department.manager:
            department.manager = employee
            department.save()
            self.stdout.write('✅ Set employee as department manager')
        
        self.stdout.write('\n🎯 Test data setup complete!')
        self.stdout.write('\n📋 Test Data Summary:')
        self.stdout.write(f'   User: {user.username} (password: testpass123)')
        self.stdout.write(f'   Employee ID: {employee.employee_id}')
        self.stdout.write(f'   Location: {location.name} ({location.latitude}, {location.longitude})')
        self.stdout.write(f'   Geofence Radius: {location.geofence_radius}m')
        self.stdout.write(f'   Department: {department.name}')
        
        self.stdout.write('\n🧪 To test geofencing:')
        self.stdout.write('   1. Run: python test_geofencing.py')
        self.stdout.write('   2. Or test manually via API endpoints')
        self.stdout.write('   3. Test coordinates near Manila (14.5995, 120.9842)') 