"""
Usage Examples for Centralized Policies

This file demonstrates how to use the centralized policy system
to ensure consistent business rules across the application.
"""

from .time_calculation_policy import TimeCalculationPolicy
from .role_policy import RolePolicy
from .schedule_policy import SchedulePolicy
from datetime import datetime, time


def example_time_calculation():
    """
    Example of using the time calculation policy.
    """
    # Create policy instance for a specific employee
    from ..models import Employee
    
    # Get employee (this would come from your authentication system)
    employee = Employee.objects.first()
    
    # Create time calculation policy
    time_policy = TimeCalculationPolicy(employee=employee)
    
    # Apply policy to calculate time metrics
    result = time_policy.apply(
        time_in=datetime.now().replace(hour=8, minute=0),  # 8:00 AM
        time_out=datetime.now().replace(hour=17, minute=0),  # 5:00 PM
        date=datetime.now().date(),
        scheduled_time_in=time(8, 0),  # 8:00 AM
        scheduled_time_out=time(17, 0)  # 5:00 PM
    )
    
    print("Time Calculation Result:", result)
    return result


def example_role_based_access():
    """
    Example of using the role policy for access control.
    """
    from ..models import Employee
    
    # Get current employee (from authentication)
    current_employee = Employee.objects.first()
    
    # Create role policy
    role_policy = RolePolicy(employee=current_employee)
    
    # Check if employee can view team data
    can_view_team = role_policy.apply('view_team_data')
    print(f"Can view team data: {can_view_team}")
    
    # Check if employee can approve time corrections
    can_approve = role_policy.apply('approve_time_corrections')
    print(f"Can approve time corrections: {can_approve}")
    
    # Check if employee can manage other employees
    can_manage = role_policy.can_manage_employees()
    print(f"Can manage employees: {can_manage}")
    
    return {
        'can_view_team': can_view_team,
        'can_approve': can_approve,
        'can_manage': can_manage
    }


def example_schedule_validation():
    """
    Example of using the schedule policy for validation.
    """
    from ..models import Employee
    
    # Get employee
    employee = Employee.objects.first()
    
    # Create schedule policy
    schedule_policy = SchedulePolicy(employee=employee)
    
    # Validate new schedule
    schedule_data = {
        'scheduled_time_in': time(9, 0),  # 9:00 AM
        'scheduled_time_out': time(18, 0),  # 6:00 PM
        'date': datetime.now().date()
    }
    
    # Validate schedule creation
    result = schedule_policy.apply('create', schedule_data)
    print("Schedule Validation Result:", result)
    
    return result


def example_integration_in_views():
    """
    Example of how to integrate policies in Django views.
    """
    from django.http import JsonResponse
    from django.views.decorators.http import require_http_methods
    from django.contrib.auth.decorators import login_required
    
    @login_required
    @require_http_methods(["POST"])
    def create_schedule_view(request):
        """
        Example view showing policy integration.
        """
        try:
            # Get current employee
            employee = request.user.employee_profile
            
            # Create policies
            role_policy = RolePolicy(employee=employee)
            schedule_policy = SchedulePolicy(employee=employee)
            
            # Check if user can create schedules
            if not role_policy.apply('manage_team_schedules'):
                return JsonResponse({
                    'error': 'Insufficient permissions to create schedules'
                }, status=403)
            
            # Get schedule data from request
            schedule_data = {
                'scheduled_time_in': request.POST.get('time_in'),
                'scheduled_time_out': request.POST.get('time_out'),
                'date': request.POST.get('date')
            }
            
            # Validate schedule using policy
            validation_result = schedule_policy.apply('create', schedule_data)
            
            if not validation_result['valid']:
                return JsonResponse({
                    'error': 'Schedule validation failed',
                    'details': validation_result['errors']
                }, status=400)
            
            # If validation passes, create the schedule
            # ... schedule creation logic here ...
            
            return JsonResponse({
                'success': True,
                'message': 'Schedule created successfully',
                'warnings': validation_result['warnings']
            })
            
        except Exception as e:
            return JsonResponse({
                'error': f'An error occurred: {str(e)}'
            }, status=500)


def example_integration_in_models():
    """
    Example of how to integrate policies in Django models.
    """
    from django.db import models
    from django.core.exceptions import ValidationError
    
    class ExampleScheduleModel(models.Model):
        """
        Example model showing policy integration.
        """
        employee = models.ForeignKey('Employee', on_delete=models.CASCADE)
        scheduled_time_in = models.TimeField()
        scheduled_time_out = models.TimeField()
        date = models.DateField()
        
        def clean(self):
            """
            Use policy for validation during model clean.
            """
            super().clean()
            
            # Create schedule policy
            schedule_policy = SchedulePolicy(employee=self.employee)
            
            # Validate schedule
            schedule_data = {
                'scheduled_time_in': self.scheduled_time_in,
                'scheduled_time_out': self.scheduled_time_out,
                'date': self.date
            }
            
            validation_result = schedule_policy.apply('create', schedule_data)
            
            if not validation_result['valid']:
                raise ValidationError({
                    'scheduled_time_in': validation_result['errors'],
                    'scheduled_time_out': validation_result['errors']
                })
        
        def save(self, *args, **kwargs):
            """
            Use policy for validation during save.
            """
            self.clean()
            super().save(*args, **kwargs)


if __name__ == "__main__":
    # Run examples
    print("=== Time Calculation Policy Example ===")
    example_time_calculation()
    
    print("\n=== Role Policy Example ===")
    example_role_based_access()
    
    print("\n=== Schedule Policy Example ===")
    example_schedule_validation()
