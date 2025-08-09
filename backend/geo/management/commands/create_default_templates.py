from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import time
from geo.models import Employee, ScheduleTemplate, Department


class Command(BaseCommand):
    help = 'Create default schedule templates for the system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--employee-id',
            type=str,
            help='Specific employee ID to create personal templates for (optional)',
        )
        parser.add_argument(
            '--department-id',
            type=int,
            help='Specific department ID to create team templates for (optional)',
        )

    def handle(self, *args, **options):
        # Default templates to create
        default_templates = [
            {
                'name': 'Morning Shift',
                'time_in': time(7, 0),  # 7:00 AM
                'time_out': time(16, 0),  # 4:00 PM
                'is_night_shift': False,
                'template_type': 'company'
            },
            {
                'name': 'Night Shift',
                'time_in': time(19, 0),  # 7:00 PM
                'time_out': time(4, 0),  # 4:00 AM
                'is_night_shift': True,
                'template_type': 'company'
            },
            {
                'name': 'Afternoon Shift',
                'time_in': time(9, 0),  # 9:00 AM
                'time_out': time(18, 0),  # 6:00 PM
                'is_night_shift': False,
                'template_type': 'company'
            },
            {
                'name': 'Late Night Shift',
                'time_in': time(22, 0),  # 10:00 PM
                'time_out': time(7, 0),  # 7:00 AM
                'is_night_shift': True,
                'template_type': 'company'
            },
            {
                'name': 'Part Time Morning',
                'time_in': time(8, 0),  # 8:00 AM
                'time_out': time(12, 0),  # 12:00 PM
                'is_night_shift': False,
                'template_type': 'company'
            },
            {
                'name': 'Part Time Afternoon',
                'time_in': time(13, 0),  # 1:00 PM
                'time_out': time(17, 0),  # 5:00 PM
                'is_night_shift': False,
                'template_type': 'company'
            },
        ]
        
        # Get a system admin user for creating company templates
        try:
            admin_employee = Employee.objects.filter(
                role__in=['management', 'it_support']
            ).first()
            
            if not admin_employee:
                # Create a default admin if none exists
                from django.contrib.auth.models import User
                admin_user, created = User.objects.get_or_create(
                    username='system_admin',
                    defaults={
                        'first_name': 'System',
                        'last_name': 'Administrator',
                        'email': 'admin@company.com',
                        'is_staff': True,
                        'is_superuser': True
                    }
                )
                
                # Create admin employee
                from geo.models import Location, Department
                default_location, _ = Location.objects.get_or_create(
                    latitude=0,
                    longitude=0,
                    defaults={'name': 'Default Location'}
                )
                
                default_dept, _ = Department.objects.get_or_create(
                    name='IT',
                    defaults={'location': default_location}
                )
                
                admin_employee = Employee.objects.create(
                    user=admin_user,
                    employee_id='ADMIN001',
                    department=default_dept,
                    role='it_support',
                    hire_date=timezone.now().date()
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating admin employee: {e}')
            )
            return
        
        templates_created = 0
        
        # Create company templates
        for template_data in default_templates:
            if template_data['template_type'] == 'company':
                template, created = ScheduleTemplate.objects.get_or_create(
                    name=template_data['name'],
                    time_in=template_data['time_in'],
                    time_out=template_data['time_out'],
                    template_type='company',
                    defaults={
                        'is_night_shift': template_data['is_night_shift'],
                        'created_by': admin_employee,
                        'is_active': True
                    }
                )
                
                if created:
                    templates_created += 1
                    self.stdout.write(
                        f'Created company template: {template.name} ({template.formatted_time})'
                    )
        
        # Create team templates if department specified
        if options['department_id']:
            try:
                department = Department.objects.get(id=options['department_id'])
                
                # Create team-specific templates
                team_templates = [
                    {
                        'name': f'{department.name} Morning',
                        'time_in': time(8, 0),
                        'time_out': time(17, 0),
                        'is_night_shift': False,
                    },
                    {
                        'name': f'{department.name} Night',
                        'time_in': time(20, 0),
                        'time_out': time(5, 0),
                        'is_night_shift': True,
                    }
                ]
                
                for template_data in team_templates:
                    template, created = ScheduleTemplate.objects.get_or_create(
                        name=template_data['name'],
                        team=department,
                        template_type='team',
                        defaults={
                            'time_in': template_data['time_in'],
                            'time_out': template_data['time_out'],
                            'is_night_shift': template_data['is_night_shift'],
                            'created_by': admin_employee,
                            'is_active': True
                        }
                    )
                    
                    if created:
                        templates_created += 1
                        self.stdout.write(
                            f'Created team template: {template.name} ({template.formatted_time})'
                        )
                        
            except Department.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Department with ID {options["department_id"]} not found')
                )
        
        # Create personal templates if employee specified
        if options['employee_id']:
            try:
                employee = Employee.objects.get(employee_id=options['employee_id'])
                
                # Create personal templates based on employee's typical schedule
                personal_templates = [
                    {
                        'name': 'My Regular Shift',
                        'time_in': time(9, 0),
                        'time_out': time(18, 0),
                        'is_night_shift': False,
                    },
                    {
                        'name': 'My Night Shift',
                        'time_in': time(19, 0),
                        'time_out': time(4, 0),
                        'is_night_shift': True,
                    }
                ]
                
                for template_data in personal_templates:
                    template, created = ScheduleTemplate.objects.get_or_create(
                        name=template_data['name'],
                        created_by=employee,
                        template_type='personal',
                        defaults={
                            'time_in': template_data['time_in'],
                            'time_out': template_data['time_out'],
                            'is_night_shift': template_data['is_night_shift'],
                            'is_active': True
                        }
                    )
                    
                    if created:
                        templates_created += 1
                        self.stdout.write(
                            f'Created personal template for {employee.full_name}: {template.name} ({template.formatted_time})'
                        )
                        
            except Employee.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Employee with ID {options["employee_id"]} not found')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Completed! Created {templates_created} templates')
        ) 