from django.shortcuts import render
from django.contrib.auth.models import User
from django.db.models import Q, Count, Avg, Sum, F, ExpressionWrapper, DecimalField
from django.db.models.functions import TruncDate, TruncHour
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse, JsonResponse
from datetime import timedelta
import csv
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.exceptions import ValidationError
from django.db import transaction, models
from django.conf import settings
import logging
import traceback

from .models import (
    Location, Department, Employee, TimeEntry, WorkSession, 
    TimeCorrectionRequest, OvertimeRequest, LeaveRequest, ChangeScheduleRequest,
    ScheduleTemplate, EmployeeSchedule, DailyTimeSummary
)
from .serializers import (
    LocationSerializer, LocationListSerializer, DepartmentSerializer, DepartmentListSerializer,
    EmployeeSerializer, EmployeeListSerializer, TimeEntrySerializer, TimeEntryListSerializer,
    TimeInOutSerializer, WorkSessionSerializer, OvertimeAnalysisSerializer, CurrentSessionStatusSerializer,
    TimeCorrectionRequestSerializer, OvertimeRequestSerializer, LeaveRequestSerializer, ChangeScheduleRequestSerializer,
    ScheduleTemplateSerializer, EmployeeScheduleSerializer, DailyTimeSummarySerializer,
    BulkScheduleSerializer, CopyPreviousMonthSerializer, ScheduleReportSerializer
)
from .utils import (
    OvertimeCalculator, BreakDetector,
    calculate_daily_summary, generate_daily_summaries_for_period, 
    apply_template_to_schedule, copy_schedule_from_previous_month,
    get_available_templates, get_employee_time_attendance_report,
    get_employee_schedule_report
)


class RoleBasedPermissionMixin:
    """Mixin for role-based permissions"""
    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'employee_profile'):
            return self.model.objects.none()
        employee = user.employee_profile
        if employee.can_view_company_data():
            return super().get_queryset()
        elif employee.can_view_department_data():
            return super().get_queryset().filter(department=employee.department)
        elif employee.can_view_team_data():
            team_members = employee.get_team_members()
            # Include self in the queryset
            return super().get_queryset().filter(
                Q(id__in=team_members.values_list('id', flat=True)) | Q(id=employee.id)
            )
        else:
            # For regular employees, only show their own record
            return super().get_queryset().filter(id=employee.id)


class LoginAPIView(APIView):
    """API View for user login"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = authenticate(username=username, password=password)
        if user is None:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
            },
            'employee': {
                'id': user.employee_profile.id,
                'employee_id': user.employee_profile.employee_id,
                'full_name': user.employee_profile.full_name,
                'role': user.employee_profile.role,
                'department': DepartmentSerializer(user.employee_profile.department).data,
                'position': user.employee_profile.position,
            }
        })


class LogoutAPIView(APIView):
    """API View for user logout"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # In a real application, you might want to blacklist the token
        return Response({'message': 'Successfully logged out'})


class UserProfileAPIView(APIView):
    """API View for getting current user profile"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        employee = user.employee_profile
        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
            },
            'employee': {
                'id': employee.id,
                'employee_id': employee.employee_id,
                'full_name': employee.full_name,
                'role': employee.role,
                'department': employee.department.name,
                'position': employee.position,
                'hire_date': employee.hire_date,
                'employment_status': employee.employment_status,
                'daily_work_hours': employee.daily_work_hours,
                'overtime_threshold_hours': employee.overtime_threshold_hours,
                'lunch_break_minutes': employee.lunch_break_minutes,
                'break_threshold_minutes': employee.break_threshold_minutes,
            }
        })


class LocationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Location model with full CRUD operations.
    Provides filtering by country, timezone, and search functionality.
    """
    queryset = Location.objects.all()
    filterset_fields = ['country', 'timezone_name', 'city', 'state']
    search_fields = ['name', 'city', 'country', 'state', 'display_name']
    ordering_fields = ['name', 'city', 'country', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return LocationListSerializer
        return LocationSerializer

    @action(detail=False, methods=['get'])
    def countries(self, request):
        """Get list of unique countries"""
        countries = Location.objects.values_list('country', flat=True).distinct().exclude(country__isnull=True)
        return Response(list(countries))

    @action(detail=False, methods=['get'])
    def timezones(self, request):
        """Get list of unique timezones"""
        timezones = Location.objects.values_list('timezone_name', flat=True).distinct()
        return Response(list(timezones))

    @action(detail=True, methods=['get'])
    def departments(self, request, pk=None):
        """Get departments for a specific location"""
        location = self.get_object()
        departments = location.departments.filter(is_active=True)
        serializer = DepartmentListSerializer(departments, many=True)
        return Response(serializer.data)


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Department model with full CRUD operations.
    Provides filtering by location, status, and search functionality.
    """
    queryset = Department.objects.all()
    filterset_fields = ['location', 'is_active', 'team_leaders']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return DepartmentListSerializer
        return DepartmentSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active departments"""
        active_departments = self.get_queryset().filter(is_active=True)
        serializer = DepartmentListSerializer(active_departments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        """Get employees for a specific department"""
        department = self.get_object()
        employees = department.employees.filter(employment_status='active')
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get department statistics"""
        department = self.get_object()
        total_employees = department.employees.filter(employment_status='active').count()
        
        present_today = 0
        
        for employee in department.employees.filter(employment_status='active'):
            if TimeEntry.objects.filter(
                employee=employee,
                timestamp__date=timezone.now().date()
            ).exists():
                present_today += 1
        
        return Response({
            'department_name': department.name,
            'total_employees': total_employees,
            'present_today': present_today,
            'absent_today': total_employees - present_today
        })


class EmployeeViewSet(RoleBasedPermissionMixin, viewsets.ModelViewSet):
    """
    ViewSet for Employee model with full CRUD operations.
    Provides filtering by department, status, and search functionality.
    Role-based access control implemented.
    """
    model = Employee
    queryset = Employee.objects.all()
    filterset_fields = ['department', 'employment_status', 'hire_date', 'role']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'employee_id', 'position']
    ordering_fields = ['user__first_name', 'user__last_name', 'employee_id', 'hire_date', 'created_at']
    ordering = ['user__first_name', 'user__last_name']

    def get_serializer_class(self):
        if self.action == 'list':
            return EmployeeListSerializer
        return EmployeeSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active employees"""
        active_employees = self.get_queryset().filter(employment_status='active')
        serializer = EmployeeListSerializer(active_employees, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_department(self, request):
        """Get employees grouped by department"""
        department_id = request.query_params.get('department_id')
        if department_id:
            employees = self.get_queryset().filter(department_id=department_id)
        else:
            employees = self.get_queryset()
        
        # Group by department
        departments = Department.objects.filter(employees__in=employees).distinct()
        result = []
        
        for dept in departments:
            dept_employees = employees.filter(department=dept)
            result.append({
                'department': {
                    'id': dept.id,
                    'name': dept.name,
                    'code': dept.code,
                },
                'employee_count': dept_employees.count(),
                'employees': EmployeeListSerializer(dept_employees, many=True).data
            })
        
        return Response(result)

    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """Get employees grouped by location"""
        location_id = request.query_params.get('location_id')
        if location_id:
            employees = self.get_queryset().filter(department__location_id=location_id)
        else:
            employees = self.get_queryset()
        
        # Group by location
        locations = Location.objects.filter(departments__employees__in=employees).distinct()
        result = []
        
        for loc in locations:
            loc_employees = employees.filter(department__location=loc)
            result.append({
                'location': {
                    'id': loc.id,
                    'name': loc.name,
                    'city': loc.city,
                    'country': loc.country,
                },
                'employee_count': loc_employees.count(),
                'employees': EmployeeListSerializer(loc_employees, many=True).data
            })
        
        return Response(result)

    @action(detail=True, methods=['get'])
    def subordinates(self, request, pk=None):
        """Get subordinates for a specific employee (team leader logic: all employees in departments this TL leads)"""
        employee = self.get_object()
        # get_subordinates already uses the new department.team_leaders logic
        subordinates = employee.get_subordinates()
        serializer = EmployeeListSerializer(subordinates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def profile(self, request, pk=None):
        """Get detailed profile for a specific employee"""
        employee = self.get_object()
        serializer = EmployeeSerializer(employee)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get employee statistics"""
        total_employees = self.get_queryset().filter(employment_status='active').count()
        present_today = 0
        
        for employee in self.get_queryset().filter(employment_status='active'):
            if TimeEntry.objects.filter(
                employee=employee,
                timestamp__date=timezone.now().date()
            ).exists():
                present_today += 1
        
        return Response({
            'total_employees': total_employees,
            'present_today': present_today,
            'absent_today': total_employees - present_today
        })

    @action(detail=False, methods=['get'])
    def absent_today(self, request):
        """Get employees (team, department, or self) who are absent today (no time entry for today)"""
        from django.utils import timezone
        today = timezone.now().date()
        queryset = self.get_queryset().filter(employment_status='active')
        absent_employees = []
        for employee in queryset:
            if not TimeEntry.objects.filter(employee=employee, timestamp__date=today).exists():
                absent_employees.append(employee)
        serializer = EmployeeListSerializer(absent_employees, many=True)
        return Response(serializer.data)


class DashboardAPIView(APIView):
    """API View for dashboard data based on user role"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        employee = user.employee_profile
        
        # Get overtime calculator for this employee
        overtime_calc = OvertimeCalculator(employee)
        current_status = overtime_calc.get_current_session_status()
        
        # Use DepartmentSerializer to serialize the department (with location)
        department_data = DepartmentSerializer(employee.department).data
        
        dashboard_data = {
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
            },
            'employee': {
                'id': employee.id,
                'employee_id': employee.employee_id,
                'full_name': employee.full_name,
                'role': employee.role,
                'department': department_data,
                'position': employee.position,
                'daily_work_hours': employee.daily_work_hours,
                'overtime_threshold_hours': employee.overtime_threshold_hours,
            },
            'current_status': current_status,
        }
        
        # Role-specific data
        if employee.role == 'employee':
            dashboard_data.update(self._get_employee_dashboard(employee, overtime_calc))
        elif employee.role == 'team_leader':
            dashboard_data.update(self._get_team_leader_dashboard(employee))
        elif employee.role == 'supervisor':
            dashboard_data.update(self._get_supervisor_dashboard(employee))
        elif employee.role == 'management':
            dashboard_data.update(self._get_management_dashboard(employee))
        elif employee.role == 'it_support':
            dashboard_data.update(self._get_it_support_dashboard(employee))
        
        return Response(dashboard_data)
    
    def _get_employee_dashboard(self, employee, overtime_calc):
        """Get dashboard data for regular employees"""
        today = timezone.now().date()
        today_entries = TimeEntry.objects.filter(
            employee=employee
        ).filter(
            Q(timestamp__date=today) | Q(event_time__date=today)
        ).order_by('timestamp')
        
        # Get overtime analysis
        today_analysis = overtime_calc.analyze_daily_sessions(timezone.now().date())
        
        return {
            'dashboard_type': 'employee',
            'today_entries': TimeEntryListSerializer(today_entries, many=True).data,
            'overtime_analysis': today_analysis,
            'recent_entries': TimeEntryListSerializer(
                TimeEntry.objects.filter(employee=employee).order_by('-timestamp')[:10], 
                many=True
            ).data,
        }
    
    def _get_team_leader_dashboard(self, employee):
        """Get dashboard data for team leaders"""
        today = timezone.now().date()
        team_members = employee.get_team_members()
        team_entries = TimeEntry.objects.filter(
            employee__in=team_members
        ).filter(
            Q(timestamp__date=today) | Q(event_time__date=today)
        ).order_by('timestamp')
        
        return {
            'dashboard_type': 'team_leader',
            'team_members_count': team_members.count(),
            'team_attendance': self._get_team_attendance(team_members),
            'team_entries': TimeEntryListSerializer(team_entries, many=True).data,
            'pending_approvals': 0,  # Placeholder for future approval system
        }
    
    def _get_supervisor_dashboard(self, employee):
        """Get dashboard data for supervisors"""
        today = timezone.now().date()
        department_employees = Employee.objects.filter(department=employee.department)
        department_entries = TimeEntry.objects.filter(
            employee__in=department_employees
        ).filter(
            Q(timestamp__date=today) | Q(event_time__date=today)
        ).order_by('timestamp')
        
        return {
            'dashboard_type': 'supervisor',
            'department_employees_count': department_employees.count(),
            'department_attendance': self._get_department_attendance(employee.department),
            'department_entries': TimeEntryListSerializer(department_entries, many=True).data,
            'department_stats': self._get_department_stats(employee.department),
        }
    
    def _get_management_dashboard(self, employee):
        """Get dashboard data for management"""
        today = timezone.now().date()
        all_employees = Employee.objects.filter(employment_status='active')
        all_entries = TimeEntry.objects.filter(
            Q(timestamp__date=today) | Q(event_time__date=today)
        ).order_by('timestamp')
        
        return {
            'dashboard_type': 'management',
            'total_employees': all_employees.count(),
            'company_attendance': self._get_company_attendance(),
            'all_entries': TimeEntryListSerializer(all_entries, many=True).data,
            'company_stats': self._get_company_stats(),
        }
    
    def _get_it_support_dashboard(self, employee):
        """Get dashboard data for IT support"""
        today = timezone.now().date()
        all_employees = Employee.objects.all()
        all_entries = TimeEntry.objects.filter(
            Q(timestamp__date=today) | Q(event_time__date=today)
        ).order_by('timestamp')
        
        return {
            'dashboard_type': 'it_support',
            'total_employees': all_employees.count(),
            'system_stats': self._get_system_stats(),
            'all_entries': TimeEntryListSerializer(all_entries, many=True).data,
            'active_users': User.objects.filter(is_active=True).count(),
        }
    
    def _get_current_status(self, employee):
        """Get current session status for an employee"""
        today = timezone.now().date()
        
        # Get today's time entries
        today_entries = TimeEntry.objects.filter(
            employee=employee
        ).filter(
            Q(timestamp__date=today) | Q(event_time__date=today)
        ).order_by('timestamp')
        
        if not today_entries.exists():
            return {
                'status': 'not_clocked_in',
                'message': 'No time entries for today',
                'last_action': None,
                'current_time': timezone.now()
            }
        
        # Get the latest entry
        latest_entry = today_entries.last()
        
        if latest_entry.entry_type == 'time_in':
            return {
                'status': 'clocked_in',
                'message': f'Clocked in at {latest_entry.timestamp.strftime("%H:%M")}',
                'last_action': latest_entry,
                'current_time': timezone.now()
            }
        else:
            return {
                'status': 'clocked_out',
                'message': f'Clocked out at {latest_entry.timestamp.strftime("%H:%M")}',
                'last_action': latest_entry,
                'current_time': timezone.now()
            }

    def _get_team_attendance(self, team_members):
        """Get team attendance for today"""
        today = timezone.now().date()
        
        attendance_data = []
        for member in team_members:
            # Get today's entries for this member
            today_entries = TimeEntry.objects.filter(
                employee=member
            ).filter(
                Q(timestamp__date=today) | Q(event_time__date=today)
            ).order_by('timestamp')
            
            if today_entries.exists():
                first_entry = today_entries.first()
                last_entry = today_entries.last()
                
                status = 'present'
                if first_entry.entry_type == 'time_in':
                    status = 'clocked_in' if last_entry.entry_type == 'time_in' else 'clocked_out'
                else:
                    status = 'clocked_out'
                
                attendance_data.append({
                    'employee_id': member.id,
                    'employee_name': member.full_name,
                    'status': status,
                    'first_entry': first_entry.timestamp.strftime('%H:%M'),
                    'last_entry': last_entry.timestamp.strftime('%H:%M') if last_entry != first_entry else None
                })
            else:
                attendance_data.append({
                    'employee_id': member.id,
                    'employee_name': member.full_name,
                    'status': 'absent',
                    'first_entry': None,
                    'last_entry': None
                })
        
        return attendance_data

    def _get_department_attendance(self, department):
        """Get department attendance for today"""
        today = timezone.now().date()
        
        # Get all active employees in the department
        employees = department.employees.filter(employment_status='active')
        
        attendance_data = []
        for employee in employees:
            # Get today's entries for this employee
            today_entries = TimeEntry.objects.filter(
                employee=employee
            ).filter(
                Q(timestamp__date=today) | Q(event_time__date=today)
            ).order_by('timestamp')
            
            if today_entries.exists():
                first_entry = today_entries.first()
                last_entry = today_entries.last()
                
                status = 'present'
                if first_entry.entry_type == 'time_in':
                    status = 'clocked_in' if last_entry.entry_type == 'time_in' else 'clocked_out'
                else:
                    status = 'clocked_out'
                
                attendance_data.append({
                    'employee_id': employee.id,
                    'employee_name': employee.full_name,
                    'status': status,
                    'first_entry': first_entry.timestamp.strftime('%H:%M'),
                    'last_entry': last_entry.timestamp.strftime('%H:%M') if last_entry != first_entry else None
                })
            else:
                attendance_data.append({
                    'employee_id': employee.id,
                    'employee_name': employee.full_name,
                    'status': 'absent',
                    'first_entry': None,
                    'last_entry': None
                })
        
        return attendance_data

    def _get_company_attendance(self):
        """Get company-wide attendance for today"""
        today = timezone.now().date()
        
        # Get all active employees
        employees = Employee.objects.filter(employment_status='active')
        
        attendance_data = []
        for employee in employees:
            # Get today's entries for this employee
            today_entries = TimeEntry.objects.filter(
                employee=employee
            ).filter(
                Q(timestamp__date=today) | Q(event_time__date=today)
            ).order_by('timestamp')
            
            if today_entries.exists():
                first_entry = today_entries.first()
                last_entry = today_entries.last()
                
                status = 'present'
                if first_entry.entry_type == 'time_in':
                    status = 'clocked_in' if last_entry.entry_type == 'time_in' else 'clocked_out'
                else:
                    status = 'clocked_out'
                
                attendance_data.append({
                    'employee_id': employee.id,
                    'employee_name': employee.full_name,
                    'department': employee.department.name,
                    'status': status,
                    'first_entry': first_entry.timestamp.strftime('%H:%M'),
                    'last_entry': last_entry.timestamp.strftime('%H:%M') if last_entry != first_entry else None
                })
            else:
                attendance_data.append({
                    'employee_id': employee.id,
                    'employee_name': employee.full_name,
                    'department': employee.department.name,
                    'status': 'absent',
                    'first_entry': None,
                    'last_entry': None
                })
        
        return attendance_data

    def _get_department_stats(self, department):
        """Get department statistics for today"""
        today = timezone.now().date()
        
        # Get all active employees in the department
        employees = department.employees.filter(employment_status='active')
        total_employees = employees.count()
        
        # Count present employees
        present_employees = 0
        for employee in employees:
            today_entries = TimeEntry.objects.filter(
                employee=employee
            ).filter(
                Q(timestamp__date=today) | Q(event_time__date=today)
            ).exists()
            
            if today_entries:
                present_employees += 1
        
        return {
            'total_employees': total_employees,
            'present_employees': present_employees,
            'absent_employees': total_employees - present_employees,
            'attendance_rate': (present_employees / total_employees * 100) if total_employees > 0 else 0
        }

    def _get_company_stats(self):
        """Get company-wide statistics for today"""
        today = timezone.now().date()
        
        # Get all active employees
        employees = Employee.objects.filter(employment_status='active')
        total_employees = employees.count()
        
        # Count present employees
        present_employees = 0
        for employee in employees:
            today_entries = TimeEntry.objects.filter(
                employee=employee
            ).filter(
                Q(timestamp__date=today) | Q(event_time__date=today)
            ).exists()
            
            if today_entries:
                present_employees += 1
        
        return {
            'total_employees': total_employees,
            'present_employees': present_employees,
            'absent_employees': total_employees - present_employees,
            'attendance_rate': (present_employees / total_employees * 100) if total_employees > 0 else 0
        }

    def _get_system_stats(self):
        """Get system-wide statistics"""
        today = timezone.now().date()
        
        return {
            'total_employees': Employee.objects.filter(employment_status='active').count(),
            'total_departments': Department.objects.filter(is_active=True).count(),
            'total_locations': Location.objects.count(),
            'today_entries': TimeEntry.objects.filter(
                Q(timestamp__date=today) | Q(event_time__date=today)
            ).count(),
        }


class SearchAPIView(APIView):
    """API View for search functionality"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        query = request.query_params.get('q', '')
        search_type = request.query_params.get('type', 'all')
        
        if not query:
            return Response({'error': 'Query parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        results = {}
        
        if search_type in ['all', 'employees']:
            employees = Employee.objects.filter(
                Q(user__first_name__icontains=query) |
                Q(user__last_name__icontains=query) |
                Q(employee_id__icontains=query) |
                Q(position__icontains=query)
            )[:10]
            results['employees'] = EmployeeListSerializer(employees, many=True).data
        
        if search_type in ['all', 'departments']:
            departments = Department.objects.filter(
                Q(name__icontains=query) |
                Q(code__icontains=query)
            )[:10]
            results['departments'] = DepartmentListSerializer(departments, many=True).data
        
        if search_type in ['all', 'locations']:
            locations = Location.objects.filter(
                Q(name__icontains=query) |
                Q(city__icontains=query) |
                Q(country__icontains=query)
            )[:10]
            results['locations'] = LocationListSerializer(locations, many=True).data
        
        return Response(results)


class EmployeeHierarchyAPIView(APIView):
    """API View for employee hierarchy"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        employee = user.employee_profile
        
        if not employee.can_view_team_data():
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        all_employees = Employee.objects.filter(employment_status='active')
        hierarchy = self._get_subordinates(employee.id, all_employees)
        
        return Response({
            'employee': {
                'id': employee.id,
                'name': employee.full_name,
                'role': employee.role,
                'department': employee.department.name,
            },
            'hierarchy': hierarchy
        })
    
    def _get_subordinates(self, manager_id, all_employees):
        """Recursively get subordinates"""
        subordinates = []
        for emp in all_employees:
            if emp.manager_id == manager_id:
                subordinate_data = {
                    'id': emp.id,
                    'name': emp.full_name,
                    'role': emp.role,
                    'department': emp.department.name,
                    'subordinates': self._get_subordinates(emp.id, all_employees)
                }
                subordinates.append(subordinate_data)
        return subordinates


class TimeEntryViewSet(RoleBasedPermissionMixin, viewsets.ModelViewSet):
    """
    ViewSet for TimeEntry model with full CRUD operations.
    Provides filtering by employee, entry type, and date range.
    Role-based access control implemented.
    """
    model = TimeEntry
    queryset = TimeEntry.objects.all()
    filterset_fields = ['employee', 'entry_type', 'location', 'timestamp', 'employee__department']
    search_fields = ['employee__user__first_name', 'employee__user__last_name', 'employee__employee_id', 'notes']
    ordering_fields = ['timestamp', 'employee__user__first_name']
    ordering = ['-timestamp']

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'employee_profile'):
            return TimeEntry.objects.none()
        employee = user.employee_profile
        if employee.can_view_company_data():
            return TimeEntry.objects.all()
        elif employee.can_view_department_data():
            return TimeEntry.objects.filter(employee__department=employee.department)
        elif employee.can_view_team_data():
            team_members = employee.get_team_members()
            return TimeEntry.objects.filter(
                Q(employee__in=team_members) | Q(employee=employee)
            )
        else:
            return TimeEntry.objects.filter(employee=employee)

    def get_serializer_class(self):
        if self.action == 'list':
            return TimeEntryListSerializer
        return TimeEntrySerializer

    def list(self, request, *args, **kwargs):
        date_str = request.query_params.get('date')
        queryset = self.get_queryset()
        if date_str:
            try:
                from datetime import datetime
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(
                    Q(timestamp__date=date) | Q(event_time__date=date)
                )
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
            serializer = self.get_serializer(queryset, many=True)
            return Response({'entries': serializer.data})
        # Default DRF behavior if no date param
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's time entries (local time zone)"""
        from django.utils import timezone
        today_local = timezone.localdate()
        today_entries = self.get_queryset().filter(
            Q(timestamp__date=today_local) | Q(event_time__date=today_local)
        )
        serializer = TimeEntryListSerializer(today_entries, many=True)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """Custom partial update to handle timestamp updates"""
        print(f"[DEBUG] partial_update called with data: {request.data}")
        print(f"[DEBUG] User: {request.user}")
        
        instance = self.get_object()
        print(f"[DEBUG] TimeEntry instance: {instance.id}")
        
        user = request.user
        
        # Check if user has permission to update this time entry
        if not hasattr(user, 'employee_profile'):
            print("[DEBUG] No employee profile found")
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_403_FORBIDDEN)
        
        employee = user.employee_profile
        print(f"[DEBUG] Employee: {employee.full_name}, Role: {employee.role}")
        print(f"[DEBUG] TimeEntry employee: {instance.employee.full_name}")
        
        # Allow Team Leaders to edit time entries (for operational purposes)
        can_update = employee.role == 'team_leader'
        
        # Additional check: Team Leaders can only edit entries of their team members
        if can_update:
            # First try the standard team members method
            team_members = employee.get_team_members()
            print(f"[DEBUG] Team members from led_departments: {[tm.full_name for tm in team_members]}")
            
            # If no team members found via led_departments, try department-based approach
            if not team_members.exists():
                print(f"[DEBUG] No team members found via led_departments, trying department-based approach")
                # Get all employees in the same department as the team leader
                team_members = Employee.objects.filter(
                    department=employee.department,
                    employment_status='active'
                ).exclude(id=employee.id)
                print(f"[DEBUG] Team members from same department: {[tm.full_name for tm in team_members]}")
            
            print(f"[DEBUG] Entry employee in team: {instance.employee in team_members}")
            if instance.employee not in team_members:
                can_update = False
                print(f"[DEBUG] Permission denied: Entry employee not in team members")
        
        print(f"[DEBUG] Can update: {can_update}")
        
        if not can_update:
            print("[DEBUG] Permission denied")
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Handle timestamp update
        if 'timestamp' in request.data:
            print(f"[DEBUG] Processing timestamp: {request.data['timestamp']}")
            try:
                from datetime import datetime
                import pytz
                
                timestamp_str = request.data['timestamp']
                
                # Try to parse ISO format first
                try:
                    new_timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                except ValueError:
                    # Fallback to basic parsing
                    new_timestamp = datetime.fromisoformat(timestamp_str)
                
                print(f"[DEBUG] Parsed timestamp: {new_timestamp}")
                
                # If the parsed datetime is naive, assume UTC
                if new_timestamp.tzinfo is None:
                    new_timestamp = pytz.UTC.localize(new_timestamp)
                
                instance.timestamp = new_timestamp
                instance.updated_by = user
                instance.updated_on = timezone.now()
                
            except Exception as e:
                print(f"[DEBUG] Timestamp parsing error: {e}")
                return Response({
                    'error': 'Invalid timestamp format',
                    'details': str(e),
                    'received_timestamp': timestamp_str
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle other fields
        if 'notes' in request.data:
            print(f"[DEBUG] Processing notes: {request.data['notes']}")
            instance.notes = request.data['notes']
            instance.updated_by = user
            instance.updated_on = timezone.now()
        
        if 'overtime' in request.data:
            print(f"[DEBUG] Processing overtime: {request.data['overtime']}")
            # Store overtime in the dedicated overtime field
            try:
                overtime_value = float(request.data['overtime'])
                instance.overtime = overtime_value
                instance.updated_by = user
                instance.updated_on = timezone.now()
                print(f"[DEBUG] Overtime set to: {overtime_value}")
            except (ValueError, TypeError) as e:
                print(f"[DEBUG] Invalid overtime value: {request.data['overtime']}")
                return Response({
                    'error': 'Invalid overtime value. Must be a number.',
                    'details': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            print("[DEBUG] Saving instance...")
            instance.save()
            print("[DEBUG] Instance saved successfully")
        except Exception as e:
            print(f"[DEBUG] Save error: {e}")
            return Response({
                'error': 'Failed to save time entry',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Return updated data
        serializer = self.get_serializer(instance)
        print(f"[DEBUG] Returning updated data: {serializer.data}")
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def team_today(self, request):
        """
        Get today's time entries for all team members (for team leaders and above), grouped by employee.
        Also include the current user (team leader) in the result.
        If ?active_only=true, only include currently clocked-in employees.
        """
        from django.utils import timezone
        from datetime import timedelta
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=404)
        employee = user.employee_profile

        if not employee.can_view_team_data():
            return Response({'error': 'Permission denied'}, status=403)

        today = timezone.now().date()
        team_members = list(employee.get_team_members())
        team_members.append(employee)

        active_only = request.query_params.get('active_only', 'false').lower() == 'true'
        result = []
        for member in team_members:
            yesterday = today - timedelta(days=1)
            today_entries = TimeEntry.objects.filter(
                employee=member
            ).filter(
                Q(timestamp__date=today) | Q(event_time__date=today)
            ).order_by('timestamp')
            yest_entries = TimeEntry.objects.filter(
                employee=member
            ).filter(
                Q(timestamp__date=yesterday) | Q(event_time__date=yesterday)
            ).order_by('timestamp')

            is_active = False
            # Check for open session from yesterday
            if yest_entries.exists():
                last_yest_in = yest_entries.filter(entry_type='time_in').last()
                last_yest_out = yest_entries.filter(entry_type='time_out').last()
                if last_yest_in and (not last_yest_out or last_yest_out.timestamp < last_yest_in.timestamp):
                    today_out = today_entries.filter(entry_type='time_out', timestamp__gt=last_yest_in.timestamp).first()
                    if not today_out:
                        is_active = True
            # Check for open session today
            if today_entries.exists():
                last_today_in = today_entries.filter(entry_type='time_in').last()
                last_today_out = today_entries.filter(entry_type='time_out').last()
                if last_today_in and (not last_today_out or last_today_out.timestamp < last_today_in.timestamp):
                    is_active = True

            if active_only and not is_active:
                continue

            result.append({
                'employee': {
                    'id': member.id,
                    'name': member.full_name,
                    'employee_id': member.employee_id,
                    'department': member.department.name if member.department else '',
                    'role': member.role,
                    'username': member.user.username,
                },
                'entries': TimeEntryListSerializer(today_entries, many=True).data
            })

        return Response(result)

    @action(detail=False, methods=['get'])
    def by_employee(self, request):
        """Get time entries grouped by employee"""
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        employee = user.employee_profile
        queryset = self.get_queryset()
        
        employees = Employee.objects.filter(time_entries__in=queryset).distinct()
        result = []
        
        for emp in employees:
            emp_entries = queryset.filter(employee=emp)
            result.append({
                'employee': {
                    'id': emp.id,
                    'name': emp.full_name,
                    'employee_id': emp.employee_id,
                    'department': emp.department.name,
                },
                'entry_count': emp_entries.count(),
                'entries': TimeEntryListSerializer(emp_entries, many=True).data
            })
        
        return Response(result)

    @action(detail=False, methods=['get'])
    def current_session(self, request):
        """Get current time tracking session for the user"""
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        employee = user.employee_profile
        
        # Get overtime calculator
        overtime_calc = OvertimeCalculator(employee)
        current_status = overtime_calc.get_current_session_status()
        
        return Response(current_status)

    @action(detail=False, methods=['get'])
    def overtime_analysis(self, request):
        """Get overtime analysis for the current user"""
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        employee = user.employee_profile
        date_str = request.query_params.get('date')
        
        if date_str:
            try:
                from datetime import datetime
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        else:
            date = timezone.now().date()
        
        overtime_calc = OvertimeCalculator(employee)
        analysis = overtime_calc.analyze_daily_sessions(date)
        
        return Response(analysis)

    @action(detail=False, methods=['post'])
    def create_work_sessions(self, request):
        """Create work sessions from time entries for a specific date"""
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        employee = user.employee_profile
        date_str = request.data.get('date')
        
        if date_str:
            try:
                from datetime import datetime
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        else:
            date = timezone.now().date()
        
        overtime_calc = OvertimeCalculator(employee)
        work_sessions = overtime_calc.create_work_sessions(date)
        
        return Response({
            'message': f'Created {len(work_sessions)} work sessions for {date}',
            'work_sessions': WorkSessionSerializer(work_sessions, many=True).data
        })

    @action(detail=False, methods=['get'])
    def attendance_analytics(self, request):
        """Get comprehensive attendance analytics for team leaders"""
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        employee = user.employee_profile
        
        if not employee.can_view_team_data():
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get date range from query params
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        from datetime import datetime, timedelta
        if start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        else:
            # Default to last 7 days
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=6)
        
        # Get team members
        team_members = list(employee.get_team_members())
        team_members.append(employee)
        
        analytics = {
            'date_range': {
                'start_date': start_date,
                'end_date': end_date,
                'days': (end_date - start_date).days + 1
            },
            'team_summary': {
                'total_members': len(team_members),
                'active_members': 0,
                'inactive_members': 0
            },
            'daily_stats': [],
            'member_stats': [],
            'attendance_trends': {
                'present_rate': 0,
                'late_rate': 0,
                'absent_rate': 0,
                'early_departure_rate': 0
            }
        }
        
        total_present_days = 0
        total_late_days = 0
        total_absent_days = 0
        total_early_departure_days = 0
        total_possible_days = 0
        
        # Process each team member
        for member in team_members:
            if member.employment_status != 'active':
                analytics['team_summary']['inactive_members'] += 1
                continue
            
            analytics['team_summary']['active_members'] += 1
            
            member_stats = {
                'employee_id': member.id,
                'employee_name': member.full_name,
                'employee_code': member.employee_id,
                'department': member.department.name if member.department else 'No Department',
                'total_days_worked': 0,
                'total_hours_worked': 0,
                'total_overtime_hours': 0,
                'late_arrivals': 0,
                'early_departures': 0,
                'absent_days': 0,
                'attendance_rate': 0,
                'average_work_hours': 0
            }
            
            # Process each day in the date range
            current_date = start_date
            while current_date <= end_date:
                total_possible_days += 1
                
                # Get entries for this day
                day_entries = TimeEntry.objects.filter(
                    employee=member
                ).filter(
                    Q(timestamp__date=current_date) | Q(event_time__date=current_date)
                ).order_by('timestamp')
                
                if day_entries.exists():
                    total_present_days += 1
                    member_stats['total_days_worked'] += 1
                    
                    # Check for late arrival (after 9:00 AM)
                    first_entry = day_entries.first()
                    if first_entry and first_entry.entry_type == 'time_in':
                        entry_time = first_entry.event_time or first_entry.timestamp
                        if entry_time.hour >= 9:
                            total_late_days += 1
                            member_stats['late_arrivals'] += 1
                    
                    # Check for early departure (before 5:00 PM)
                    last_entry = day_entries.last()
                    if last_entry and last_entry.entry_type == 'time_out':
                        entry_time = last_entry.event_time or last_entry.timestamp
                        if entry_time.hour < 17:
                            total_early_departure_days += 1
                            member_stats['early_departures'] += 1
                    
                    # Calculate work hours for this day
                    day_hours = 0
                    for i in range(0, len(day_entries) - 1, 2):
                        if (day_entries[i].entry_type == 'time_in' and 
                            day_entries[i + 1].entry_type == 'time_out'):
                            time_in = day_entries[i].event_time or day_entries[i].timestamp
                            time_out = day_entries[i + 1].event_time or day_entries[i + 1].timestamp
                            hours = (time_out - time_in).total_seconds() / 3600
                            day_hours += hours
                    
                    member_stats['total_hours_worked'] += day_hours
                    overtime = max(0, day_hours - 8)  # Assuming 8-hour workday
                    member_stats['total_overtime_hours'] += overtime
                else:
                    total_absent_days += 1
                    member_stats['absent_days'] += 1
                
                current_date += timedelta(days=1)
            
            # Calculate member averages
            if member_stats['total_days_worked'] > 0:
                member_stats['average_work_hours'] = member_stats['total_hours_worked'] / member_stats['total_days_worked']
                member_stats['attendance_rate'] = (member_stats['total_days_worked'] / analytics['date_range']['days']) * 100
            
            analytics['member_stats'].append(member_stats)
        
        # Calculate overall trends
        if total_possible_days > 0:
            analytics['attendance_trends']['present_rate'] = (total_present_days / total_possible_days) * 100
            analytics['attendance_trends']['late_rate'] = (total_late_days / total_possible_days) * 100
            analytics['attendance_trends']['absent_rate'] = (total_absent_days / total_possible_days) * 100
            analytics['attendance_trends']['early_departure_rate'] = (total_early_departure_days / total_possible_days) * 100
        
        return Response(analytics)


class TimeInOutAPIView(APIView):
    """API View for time in/out operations"""
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def get_device_info(self, request):
        """Get device information"""
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        return user_agent[:255]  # Limit to 255 characters
    
    def validate_geofence(self, employee_id, latitude, longitude, accuracy, location_id=None):
        """
        Validate if employee is within the allowed geofence and accuracy.
        Returns dict with validation result and details.
        """
        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return {
                'valid': False,
                'message': 'Employee not found'
            }
        
        # If no coordinates provided, allow the action (for testing/development)
        if latitude is None or longitude is None:
            return {
                'valid': True,
                'message': 'No coordinates provided - geofencing bypassed'
            }
        
        # Determine which location to check against
        target_location = None
        
        # If specific location_id provided, use that
        if location_id:
            try:
                target_location = Location.objects.get(id=location_id)
            except Location.DoesNotExist:
                return {
                    'valid': False,
                    'message': 'Specified location not found'
                }
        else:
            # Use employee's department location
            target_location = employee.department.location
        
        if not target_location:
            return {
                'valid': False,
                'message': 'No location assigned to employee'
            }
        
        min_accuracy = getattr(target_location, 'min_accuracy_meters', 100)
        if accuracy is not None and accuracy > min_accuracy:
            return {
                'valid': False,
                'message': f'Location accuracy is too low: {accuracy:.1f}m (min required: {min_accuracy}m)'
            }
        
        # Calculate distance
        distance = target_location.calculate_distance_to(latitude, longitude)
        allowed_radius = target_location.geofence_radius
        
        # Check if within geofence
        if distance <= allowed_radius:
            return {
                'valid': True,
                'message': f'Within geofence ({distance:.1f}m from {target_location.name})',
                'distance': round(distance, 1),
                'allowed_radius': allowed_radius,
                'location_name': target_location.name
            }
        else:
            return {
                'valid': False,
                'message': f'Too far away from allowed area: you are {distance:.1f}m from {target_location.name}, but the allowed radius is {allowed_radius}m.',
                'distance': round(distance, 1),
                'allowed_radius': allowed_radius,
                'location_name': target_location.name
            }
    
    def post(self, request, action):
        """Handle time in/out requests with geofencing validation"""
        serializer = TimeInOutSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        employee_id = serializer.validated_data['employee_id']
        location_id = serializer.validated_data.get('location_id')
        latitude = serializer.validated_data.get('latitude')
        longitude = serializer.validated_data.get('longitude')
        notes = serializer.validated_data.get('notes', '')
        accuracy = serializer.validated_data.get('accuracy', None)
        override_geofence = request.data.get('override_geofence', False)
        # Ensure boolean (handle string values from frontend)
        if isinstance(override_geofence, str):
            override_geofence = override_geofence.lower() == 'true'
        print("override_geofence:", override_geofence)
        user = request.user
        is_tl = False
        is_team_leader_user = False
        
        # Check if the current user is a team leader
        if hasattr(user, 'employee_profile'):
            is_team_leader_user = user.employee_profile.role == 'team_leader'
            print(f"User {user.id} role: {user.employee_profile.role}")
            print(f"User {user.id} is team leader: {is_team_leader_user}")
            print(f"Request location_id: {location_id}")
            print(f"Request employee_id: {employee_id}")
        
        # Check if user is TL for the specific location (only for team leaders)
        if location_id and hasattr(user, 'employee_profile') and user.employee_profile.role == 'team_leader':
            tl_employee = user.employee_profile
            is_tl = Department.objects.filter(team_leaders=tl_employee, location_id=location_id).exists()
            managed_location_ids = set(
                Department.objects.filter(team_leaders=tl_employee).values_list('location_id', flat=True)
            )
            print(f"Team Leader {tl_employee.id} checking location {location_id}")
            print(f"Managed locations: {managed_location_ids}")
            if int(location_id) not in managed_location_ids:
                return Response({'error': 'You do not have permission to use this location.'}, status=403)
        
        # Geofencing validation - Skip for Team Leaders (they can clock in/out from anywhere)
        if not is_team_leader_user:
            print(f"Regular employee {employee_id} - checking geofence")
            geofence_result = self.validate_geofence(employee_id, latitude, longitude, accuracy, location_id)
            print(f"Geofence result: {geofence_result}")
            if not geofence_result['valid']:
                return Response({
                    'error': 'Geofence validation failed',
                    'details': geofence_result['message'],
                    'distance': geofence_result.get('distance'),
                    'allowed_radius': geofence_result.get('allowed_radius')
                }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Validate action
        if action not in ['time-in', 'time-out']:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
        
        entry_type = 'time_in' if action == 'time-in' else 'time_out'
        
        # NEW: ENFORCE SCHEDULE COMPLIANCE - Block if no schedule exists
        from datetime import date
        today = date.today()
        schedule = EmployeeSchedule.objects.filter(employee=employee, date=today).first()
        
        if not schedule:
            return Response({
                'error': 'Schedule required',
                'details': 'No schedule found for today. Please contact your supervisor to set up your schedule before clocking in/out.',
                'date': today.isoformat()
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not schedule.scheduled_time_in or not schedule.scheduled_time_out:
            return Response({
                'error': 'Incomplete schedule',
                'details': 'Your schedule for today is incomplete. Please contact your supervisor to complete your schedule before clocking in/out.',
                'date': today.isoformat()
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the last time entry for this employee
        last_entry = TimeEntry.objects.filter(employee=employee).order_by('-timestamp').first()

        if action == 'time-in':
            if last_entry and last_entry.entry_type == 'time_in':
                # Allow override for team leaders with custom timestamp
                custom_timestamp = request.data.get('timestamp')
                if not (custom_timestamp and hasattr(user, 'employee_profile') and user.employee_profile.role == 'team_leader'):
                    return Response({'error': 'Already clocked in. Please clock out first.'}, status=400)
            
            # Check for early time-in restriction (more than employee's early_login_restriction_hours before scheduled time)
            try:
                from datetime import datetime, timedelta
                restriction_hours = float(employee.early_login_restriction_hours or 1.0)
                earliest_allowed_time = datetime.combine(today, schedule.scheduled_time_in) - timedelta(hours=restriction_hours)
                current_time = timezone.now()
                
                # For team leaders with custom timestamp, we'll check after timestamp is parsed
                if not (custom_timestamp and hasattr(user, 'employee_profile') and user.employee_profile.role == 'team_leader'):
                    if current_time < earliest_allowed_time:
                        return Response({
                            'error': f'Cannot clock in more than {restriction_hours} hour{"s" if restriction_hours != 1 else ""} before scheduled time. Earliest allowed time: {earliest_allowed_time.strftime("%I:%M %p")}',
                            'scheduled_time': schedule.scheduled_time_in.strftime("%I:%M %p"),
                            'earliest_allowed': earliest_allowed_time.strftime("%I:%M %p")
                        }, status=400)
                    
                    # NEW: Check for late time-in (after scheduled shift has ended)
                    scheduled_end_time = datetime.combine(today, schedule.scheduled_time_out)
                    # Handle overnight shifts
                    if schedule.scheduled_time_out < schedule.scheduled_time_in:
                        scheduled_end_time += timedelta(days=1)
                    
                    # Allow clock-in up to 2 hours after scheduled end time for flexibility
                    latest_allowed_time = scheduled_end_time + timedelta(hours=2)
                    
                    if current_time > latest_allowed_time:
                        return Response({
                            'error': f'Cannot clock in after your shift has ended. Your scheduled time was {schedule.scheduled_time_in.strftime("%I:%M %p")} - {schedule.scheduled_time_out.strftime("%I:%M %p")}. Latest allowed clock-in: {latest_allowed_time.strftime("%I:%M %p")}',
                            'scheduled_time': f"{schedule.scheduled_time_in.strftime('%I:%M %p')} - {schedule.scheduled_time_out.strftime('%I:%M %p')}",
                            'latest_allowed': latest_allowed_time.strftime("%I:%M %p")
                        }, status=400)
                        
            except Exception as e:
                # CRITICAL: Only allow bypass for Team Leaders, block for regular employees
                if hasattr(user, 'employee_profile') and user.employee_profile.role == 'team_leader':
                    # Log Team Leader bypass for audit purposes
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Team Leader {user.username} bypass due to validation error: {e}")
                    # Allow Team Leader to proceed with caution
                else:
                    # Block regular employees on any validation error for security
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"CRITICAL: Validation error for regular employee {employee.employee_id}: {e}")
                    return Response({
                        'error': 'Time validation failed. Clock-in blocked for security.',
                        'details': 'Please contact your supervisor if you believe this is an error.',
                        'employee_id': employee.employee_id,
                        'action': action
                    }, status=500)
            
            # Allow time-in (even if last session was today or yesterday)
            # ... create new time-in entry ...

        elif action == 'time-out':
            if not last_entry or last_entry.entry_type != 'time_in':
                # Allow override for team leaders with custom timestamp
                custom_timestamp = request.data.get('timestamp')
                if not (custom_timestamp and hasattr(user, 'employee_profile') and user.employee_profile.role == 'team_leader'):
                    return Response({'error': 'No open session to clock out from.'}, status=400)
            
            # NEW: Check for late time-out (after scheduled shift has ended)
            try:
                from datetime import datetime, timedelta
                scheduled_end_time = datetime.combine(today, schedule.scheduled_time_out)
                # Handle overnight shifts
                if schedule.scheduled_time_out < schedule.scheduled_time_in:
                    scheduled_end_time += timedelta(days=1)
                
                current_time = timezone.now()
                
                # For team leaders with custom timestamp, we'll check after timestamp is parsed
                if not (custom_timestamp and hasattr(user, 'employee_profile') and user.employee_profile.role == 'team_leader'):
                    # Allow clock-out up to 4 hours after scheduled end time for flexibility
                    latest_allowed_time = scheduled_end_time + timedelta(hours=4)
                    
                    if current_time > latest_allowed_time:
                        return Response({
                            'error': f'Cannot clock out after your shift has ended. Your scheduled time was {schedule.scheduled_time_in.strftime("%I:%M %p")} - {schedule.scheduled_time_out.strftime("%I:%M %p")}. Latest allowed clock-out: {latest_allowed_time.strftime("%I:%M %p")}',
                            'scheduled_time': f"{schedule.scheduled_time_in.strftime('%I:%M %p')} - {schedule.scheduled_time_out.strftime('%I:%M %p')}",
                            'latest_allowed': latest_allowed_time.strftime("%I:%M %p")
                        }, status=400)
                        
            except Exception as e:
                # CRITICAL: Only allow bypass for Team Leaders, block for regular employees
                if hasattr(user, 'employee_profile') and user.employee_profile.role == 'team_leader':
                    # Log Team Leader bypass for audit purposes
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Team Leader {user.username} bypass due to validation error: {e}")
                    # Allow Team Leader to proceed with caution
                else:
                    # Block regular employees on any validation error for security
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"CRITICAL: Validation error for regular employee {employee.employee_id}: {e}")
                    return Response({
                        'error': 'Time validation failed. Clock-out blocked for security.',
                        'details': 'Please contact your supervisor if you believe this is an error.',
                        'employee_id': employee.employee_id,
                        'action': action
                    }, status=500)
            
            # Allow time-out (even if session started yesterday)
            # ... create new time-out entry ...
        
        # Create time entry
        location = None
        if location_id:
            try:
                location = Location.objects.get(id=location_id)
            except Location.DoesNotExist:
                pass
        else:
            # Automatically use employee's department location
            location = employee.department.location

        # --- NEW: Handle custom timestamp for team leaders ---
        from django.utils import timezone
        import pytz
        entry_timestamp = None
        custom_timestamp = request.data.get('timestamp')
        if custom_timestamp and hasattr(user, 'employee_profile') and user.employee_profile.role == 'team_leader':
            try:
                from dateutil.parser import parse as parse_date
                entry_timestamp = parse_date(custom_timestamp)
                # If the parsed datetime is naive, assume UTC
                if entry_timestamp.tzinfo is None:
                    entry_timestamp = pytz.UTC.localize(entry_timestamp)
                
                # Check for early time-in restriction for team leaders with custom timestamp
                if action == 'time-in':
                    try:
                        from datetime import datetime, timedelta
                        # Use the already-fetched schedule instead of querying again
                        restriction_hours = float(employee.early_login_restriction_hours or 1.0)
                        earliest_allowed_time = datetime.combine(today, schedule.scheduled_time_in) - timedelta(hours=restriction_hours)
                        earliest_allowed_time = pytz.UTC.localize(earliest_allowed_time)
                        
                        if entry_timestamp < earliest_allowed_time:
                            return Response({
                                'error': f'Cannot clock in more than {restriction_hours} hour{"s" if restriction_hours != 1 else ""} before scheduled time. Earliest allowed time: {earliest_allowed_time.strftime("%I:%M %p")}',
                                'scheduled_time': schedule.scheduled_time_in.strftime("%I:%M %p"),
                                'earliest_allowed': earliest_allowed_time.strftime("%I:%M %p")
                            }, status=400)
                        
                        # NEW: Check for late time-in for team leaders with custom timestamp
                        scheduled_end_time = datetime.combine(today, schedule.scheduled_time_out)
                        # Handle overnight shifts
                        if schedule.scheduled_time_out < schedule.scheduled_time_in:
                            scheduled_end_time += timedelta(days=1)
                        scheduled_end_time = pytz.UTC.localize(scheduled_end_time)
                        
                        # Allow clock-in up to 2 hours after scheduled end time for flexibility
                        latest_allowed_time = scheduled_end_time + timedelta(hours=2)
                        latest_allowed_time = pytz.UTC.localize(latest_allowed_time)
                        
                        if entry_timestamp > latest_allowed_time:
                            return Response({
                                'error': f'Cannot clock in after your shift has ended. Your scheduled time was {schedule.scheduled_time_in.strftime("%I:%M %p")} - {schedule.scheduled_time_out.strftime("%I:%M %p")}. Latest allowed clock-in: {latest_allowed_time.strftime("%I:%M %p")}',
                                'scheduled_time': f"{schedule.scheduled_time_in.strftime('%I:%M %p')} - {schedule.scheduled_time_out.strftime('%I:%M %p')}",
                                'latest_allowed': latest_allowed_time.strftime("%I:%M %p")
                            }, status=400)
                            
                    except Exception as e:
                        # Team Leader validation error - log warning but allow to proceed
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.warning(f"Team Leader {user.username} validation error: {e}")
                        # Team Leaders can bypass validation errors for operational flexibility
                
                # NEW: Check for late time-out for team leaders with custom timestamp
                elif action == 'time-out':
                    try:
                        from datetime import datetime, timedelta
                        scheduled_end_time = datetime.combine(today, schedule.scheduled_time_out)
                        # Handle overnight shifts
                        if schedule.scheduled_time_out < schedule.scheduled_time_in:
                            scheduled_end_time += timedelta(days=1)
                        scheduled_end_time = pytz.UTC.localize(scheduled_end_time)
                        
                        # Allow clock-out up to 4 hours after scheduled end time for flexibility
                        latest_allowed_time = scheduled_end_time + timedelta(hours=4)
                        latest_allowed_time = pytz.UTC.localize(latest_allowed_time)
                        
                        if entry_timestamp > latest_allowed_time:
                            return Response({
                                'error': f'Cannot clock out after your shift has ended. Your scheduled time was {schedule.scheduled_time_in.strftime("%I:%M %p")} - {schedule.scheduled_time_out.strftime("%I:%M %p")}. Latest allowed clock-out: {latest_allowed_time.strftime("%I:%M %p")}',
                                'scheduled_time': f"{schedule.scheduled_time_in.strftime('%I:%M %p')} - {schedule.scheduled_time_out.strftime('%I:%M %p')}",
                                'latest_allowed': latest_allowed_time.strftime("%I:%M %p")
                            }, status=400)
                            
                    except Exception as e:
                        # Team Leader validation error - log warning but allow to proceed
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.warning(f"Team Leader {user.username} validation error: {e}")
                        # Team Leaders can bypass validation errors for operational flexibility
                        
            except Exception as e:
                print(f"Failed to parse timestamp: {custom_timestamp} ({e})")
                return Response({'error': 'Invalid timestamp format.', 'details': str(e), 'raw': custom_timestamp}, status=400)
        else:
            entry_timestamp = timezone.now()
        # --- END NEW ---

        event_time = None
        custom_event_time = request.data.get('event_time')
        if custom_event_time and hasattr(user, 'employee_profile') and user.employee_profile.role == 'team_leader':
            try:
                from dateutil.parser import parse as parse_date
                event_time = parse_date(custom_event_time)
                if event_time.tzinfo is None:
                    import pytz
                    event_time = pytz.UTC.localize(event_time)
            except Exception as e:
                print(f"Failed to parse event_time: {custom_event_time} ({e})")
                return Response({'error': 'Invalid event_time format.', 'details': str(e), 'raw': custom_event_time}, status=400)

        time_entry = TimeEntry.objects.create(
            employee=employee,
            entry_type=entry_type,
            location=location,
            notes=notes,
            ip_address=self.get_client_ip(request),
            device_info=self.get_device_info(request),
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            timestamp=entry_timestamp,
            updated_on=entry_timestamp,  # Set updated_on to the same as timestamp
            updated_by=user,
            event_time=event_time
        )
        
        # Log the successful attempt
        print(f"[AUDIT] Time {action} for employee {employee_id} at ({latitude}, {longitude}) accuracy={accuracy}m by user {user.username} at {entry_timestamp}")

        # Refresh employee instance to ensure latest DB state
        employee.refresh_from_db()
        
        # Get overtime analysis for response
        overtime_calc = OvertimeCalculator(employee)
        current_status = overtime_calc.get_current_session_status()
        
        response_data = {
            'message': f'Successfully {action.replace("-", " ")}',
            'time_entry': TimeEntrySerializer(time_entry).data,
            'overtime_status': current_status
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class GeofenceValidationAPIView(APIView):
    """API View for geofence validation (frontend immediate feedback)"""
    
    def post(self, request):
        """Validate if coordinates are within geofence for immediate frontend feedback"""
        employee_id = request.data.get('employee_id')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        location_id = request.data.get('location_id')
        accuracy = request.data.get('accuracy')
        
        if not all([employee_id, latitude, longitude]):
            return Response({
                'error': 'employee_id, latitude, and longitude are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Use the same validation logic as TimeInOutAPIView
        time_in_out_view = TimeInOutAPIView()
        validation_result = time_in_out_view.validate_geofence(employee_id, latitude, longitude, accuracy, location_id)
        
        return Response(validation_result)


class TimeReportAPIView(APIView):
    """API View for time reports with overtime analysis"""
    
    def get(self, request):
        """Get time reports for employees with overtime breakdown"""
        employee_id = request.query_params.get('employee_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not all([employee_id, start_date, end_date]):
            return Response({'error': 'employee_id, start_date, and end_date are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Parse dates
        from datetime import datetime
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Get overtime calculator
        overtime_calc = OvertimeCalculator(employee)
        
        # Analyze each day in the range
        daily_analyses = []
        total_regular_hours = 0
        total_overtime_hours = 0
        total_break_hours = 0
        total_lunch_break_hours = 0
        
        current_date = start_date
        while current_date <= end_date:
            daily_analysis = overtime_calc.analyze_daily_sessions(current_date)
            daily_analyses.append(daily_analysis)
            
            total_regular_hours += daily_analysis['regular_hours']
            total_overtime_hours += daily_analysis['overtime_hours']
            total_break_hours += daily_analysis['break_hours']
            total_lunch_break_hours += daily_analysis['lunch_break_hours']
            
            current_date += timezone.timedelta(days=1)
        
        # Calculate days worked
        days_worked = len([a for a in daily_analyses if a['total_hours'] > 0])
        
        # Calculate average hours per day
        total_hours = total_regular_hours + total_overtime_hours
        average_hours = total_hours / days_worked if days_worked > 0 else 0
        
        report_data = {
            'employee_id': employee.id,
            'employee_name': employee.full_name,
            'report_period': {
                'start_date': start_date,
                'end_date': end_date,
                'days_worked': days_worked
            },
            'hours_summary': {
                'total_hours': round(total_hours, 2),
                'regular_hours': round(total_regular_hours, 2),
                'overtime_hours': round(total_overtime_hours, 2),
                'break_hours': round(total_break_hours, 2),
                'lunch_break_hours': round(total_lunch_break_hours, 2),
                'average_hours_per_day': round(average_hours, 2)
            },
            'daily_analyses': daily_analyses,
            'overtime_threshold': employee.overtime_threshold_hours,
            'daily_work_hours': employee.daily_work_hours
        }
        
        return Response(report_data)


class WorkSessionViewSet(RoleBasedPermissionMixin, viewsets.ModelViewSet):
    """
    ViewSet for WorkSession model with overtime and break analysis
    """
    model = WorkSession
    queryset = WorkSession.objects.all()
    serializer_class = WorkSessionSerializer
    filterset_fields = ['employee', 'session_type', 'is_overtime', 'is_break', 'start_time']
    ordering_fields = ['start_time', 'duration_hours']
    ordering = ['-start_time']

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's work sessions"""
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        employee = user.employee_profile
        today = timezone.now().date()
        
        work_sessions = self.get_queryset().filter(
            employee=employee,
            start_time__date=today
        )
        
        serializer = WorkSessionSerializer(work_sessions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_date(self, request):
        """Get work sessions for a specific date"""
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        employee = user.employee_profile
        date_str = request.query_params.get('date')
        
        if not date_str:
            return Response({'error': 'date parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from datetime import datetime
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        work_sessions = self.get_queryset().filter(
            employee=employee,
            start_time__date=date
        )
        
        serializer = WorkSessionSerializer(work_sessions, many=True)
        return Response(serializer.data)


class ReportDownloadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        employee = user.employee_profile

        from_date = request.GET.get('from')
        to_date = request.GET.get('to')
        range_type = request.GET.get('range', 'week')
        today = timezone.localtime(timezone.now()).date()

        if from_date and to_date:
            try:
                start_date = datetime.strptime(from_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(to_date, '%Y-%m-%d').date()
            except ValueError:
                return HttpResponse('Invalid date format', status=400)
        else:
            if range_type == 'week':
                start_date = today - timedelta(days=today.weekday())
            elif range_type == 'month':
                start_date = today.replace(day=1)
            elif range_type == 'year':
                start_date = today.replace(month=1, day=1)
            else:
                return HttpResponse('Invalid range', status=400)
            end_date = today

        entries = employee.timeentry_set.filter(
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date
        ).order_by('timestamp')

        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="time_entries_{start_date}_to_{end_date}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Date/Time', 'Type', 'Location', 'Notes'])
        for entry in entries:
            writer.writerow([
                timezone.localtime(entry.timestamp).strftime('%Y-%m-%d %H:%M:%S'),
                entry.entry_type,
                getattr(entry.location, 'name', '') if entry.location else '',
                entry.notes or ''
            ])

        return response


class ReportPreviewAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        employee = user.employee_profile

        from_date = request.GET.get('from')
        to_date = request.GET.get('to')
        range_type = request.GET.get('range', 'week')
        today = timezone.localtime(timezone.now()).date()

        if from_date and to_date:
            try:
                start_date = datetime.strptime(from_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(to_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format'}, status=400)
        else:
            if range_type == 'week':
                start_date = today - timedelta(days=today.weekday())
            elif range_type == 'month':
                start_date = today.replace(day=1)
            elif range_type == 'year':
                start_date = today.replace(month=1, day=1)
            else:
                return Response({'error': 'Invalid range'}, status=400)
            end_date = today

        entries = employee.timeentry_set.filter(
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date
        ).order_by('timestamp')

        data = [
            {
                'datetime': timezone.localtime(entry.timestamp).strftime('%Y-%m-%d %H:%M:%S'),
                'type': entry.entry_type,
                'location': getattr(entry.location, 'name', '') if entry.location else '',
                'notes': entry.notes or ''
            }
            for entry in entries
        ]
        response = Response({'entries': data})
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response


class TimeCorrectionRequestViewSet(viewsets.ModelViewSet):
    queryset = TimeCorrectionRequest.objects.all()
    serializer_class = TimeCorrectionRequestSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status']

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'employee_profile'):
            return TimeCorrectionRequest.objects.none()
        employee = user.employee_profile
        # Team leaders see requests from their team
        if employee.can_view_team_data():
            team_members = employee.get_team_members()
            return TimeCorrectionRequest.objects.filter(employee__in=team_members)
        # Employees see their own requests
        return TimeCorrectionRequest.objects.filter(employee=employee)
        
    def create(self, request, *args, **kwargs):
        print("Received time correction request data:", getattr(request, 'data', request.POST))
        try:
            # Get user from request, handling both regular and test requests
            user = getattr(request, 'user', None)
            if not user:
                print("No user found in request")
                return Response(
                    {'detail': 'Authentication required'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Ensure the employee is set to the current user's employee profile
            if not hasattr(user, 'employee_profile'):
                return Response(
                    {'detail': 'User has no associated employee profile'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Create a mutable copy of the request data
            data = getattr(request, 'data', request.POST).copy()
            
            # Set the employee to the current user's employee profile
            data['employee'] = user.employee_profile.id
            
            # Validate the data
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            
            # Save the time correction request
            self.perform_create(serializer)
            
            # Return success response
            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
                headers=headers
            )
            
        except Exception as e:
            print(f"Error creating time correction request: {str(e)}")
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        """Approve a time correction request and apply the correction to TimeEntry"""
        print(f"[DEBUG] Approve method called for correction request {pk}")
        try:
            correction_request = self.get_object()
            print(f"[DEBUG] Found correction request: {correction_request.id}")
            print(f"[DEBUG] Employee: {correction_request.employee.full_name}")
            print(f"[DEBUG] Date: {correction_request.date}")
            print(f"[DEBUG] Requested time in: {correction_request.requested_time_in}")
            print(f"[DEBUG] Requested time out: {correction_request.requested_time_out}")
            print(f"[DEBUG] Status: {correction_request.status}")
            
            # Check if request is pending
            if correction_request.status != 'pending':
                print(f"[DEBUG] Request is not pending, status: {correction_request.status}")
                return Response(
                    {'detail': 'Only pending requests can be approved.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if user has permission to approve (team leader)
            user = getattr(request, 'user', None)
            if not user:
                print(f"[DEBUG] No user found in request")
                return Response(
                    {'detail': 'Authentication required'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            if not hasattr(user, 'employee_profile'):
                print(f"[DEBUG] User has no employee profile")
                return Response(
                    {'detail': 'User has no associated employee profile'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            approver = user.employee_profile
            print(f"[DEBUG] Approver: {approver.full_name}, Role: {approver.role}")
            
            # Check if approver is a team leader and has authority over the employee
            if not approver.can_view_team_data():
                print(f"[DEBUG] Approver cannot view team data")
                return Response(
                    {'detail': 'You do not have permission to approve this request.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            team_members = approver.get_team_members()
            print(f"[DEBUG] Team members: {[tm.full_name for tm in team_members]}")
            if correction_request.employee not in team_members:
                print(f"[DEBUG] Employee not in team members")
                return Response(
                    {'detail': 'You can only approve requests from your team members.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get comments from request
            comments = request.data.get('comments', '')
            print(f"[DEBUG] Comments: {comments}")
            
            with transaction.atomic():
                print(f"[DEBUG] Starting transaction")
                # Update the correction request
                correction_request.status = 'approved'
                correction_request.reviewed_by = approver
                correction_request.reviewed_at = timezone.now()
                correction_request.response_message = comments
                correction_request.save()
                print(f"[DEBUG] Updated correction request status to approved")
                
                # Apply the correction to TimeEntry records
                print(f"[DEBUG] Calling _apply_time_correction")
                self._apply_time_correction(correction_request)
                print(f"[DEBUG] Time correction applied successfully")
                
                return Response({
                    'detail': 'Time correction request approved and applied successfully.',
                    'status': 'approved'
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            print(f"[DEBUG] Error in approve method: {str(e)}")
            return Response(
                {'detail': f'Error approving request: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """Reject a time correction request"""
        try:
            correction_request = self.get_object()
            
            # Check if request is pending
            if correction_request.status != 'pending':
                return Response(
                    {'detail': 'Only pending requests can be rejected.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if user has permission to reject (team leader)
            user = request.user
            if not hasattr(user, 'employee_profile'):
                return Response(
                    {'detail': 'User has no associated employee profile'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            approver = user.employee_profile
            
            # Check if approver is a team leader and has authority over the employee
            if not approver.can_view_team_data():
                return Response(
                    {'detail': 'You do not have permission to reject this request.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            team_members = approver.get_team_members()
            if correction_request.employee not in team_members:
                return Response(
                    {'detail': 'You can only reject requests from your team members.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get comments from request
            comments = request.data.get('comments', '')
            
            # Update the correction request
            correction_request.status = 'denied'
            correction_request.reviewed_by = approver
            correction_request.reviewed_at = timezone.now()
            correction_request.response_message = comments
            correction_request.save()
            
            return Response({
                'detail': 'Time correction request rejected.',
                'status': 'denied'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'detail': f'Error rejecting request: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _apply_time_correction(self, correction_request):
        """Apply the time correction to the actual TimeEntry records"""
        try:
            employee = correction_request.employee
            date = correction_request.date
            
            # Find existing TimeEntry records for this employee and date
            # Include both timestamp and event_time date filtering
            time_entries = TimeEntry.objects.filter(
                employee=employee
            ).filter(
                Q(timestamp__date=date) | Q(event_time__date=date)
            ).order_by('timestamp')
            
            print(f"Found {time_entries.count()} existing time entries for {employee.full_name} on {date}")
            
            # Apply time in correction if requested
            if correction_request.requested_time_in:
                print(f"Processing time in correction: {correction_request.requested_time_in}")
                # Find or create time in entry
                time_in_entry = time_entries.filter(entry_type='time_in').first()
                
                if time_in_entry:
                    # Update existing time in entry
                    print(f"Updating existing time in entry: {time_in_entry.id}")
                    # Create datetime in the correct timezone
                    corrected_datetime = timezone.datetime.combine(date, correction_request.requested_time_in)
                    corrected_time = timezone.make_aware(corrected_datetime, timezone=timezone.get_current_timezone())
                    time_in_entry.event_time = corrected_time
                    time_in_entry.notes = f"Corrected via approved request. Original: {time_in_entry.timestamp}"
                    time_in_entry.save()
                    print(f"Updated time in entry with event_time: {time_in_entry.event_time}")
                else:
                    # Create new time in entry
                    print(f"Creating new time in entry")
                    # Create datetime in the correct timezone
                    corrected_datetime = timezone.datetime.combine(date, correction_request.requested_time_in)
                    corrected_time = timezone.make_aware(corrected_datetime, timezone=timezone.get_current_timezone())
                    new_time_in = TimeEntry.objects.create(
                        employee=employee,
                        entry_type='time_in',
                        timestamp=corrected_time,
                        event_time=corrected_time,
                        notes=f"Created via approved time correction request"
                    )
                    print(f"Created new time in entry: {new_time_in.id}")
                    print(f"Created time in entry with event_time: {new_time_in.event_time}")
            
            # Apply time out correction if requested
            if correction_request.requested_time_out:
                print(f"Processing time out correction: {correction_request.requested_time_out}")
                # Find or create time out entry
                time_out_entry = time_entries.filter(entry_type='time_out').first()
                
                if time_out_entry:
                    # Update existing time out entry
                    print(f"Updating existing time out entry: {time_out_entry.id}")
                    # Create datetime in the correct timezone
                    corrected_datetime = timezone.datetime.combine(date, correction_request.requested_time_out)
                    corrected_time = timezone.make_aware(corrected_datetime, timezone=timezone.get_current_timezone())
                    time_out_entry.event_time = corrected_time
                    time_out_entry.notes = f"Corrected via approved request. Original: {time_out_entry.timestamp}"
                    time_out_entry.save()
                    print(f"Updated time out entry with event_time: {time_out_entry.event_time}")
                else:
                    # Create new time out entry
                    print(f"Creating new time out entry")
                    # Create datetime in the correct timezone
                    corrected_datetime = timezone.datetime.combine(date, correction_request.requested_time_out)
                    corrected_time = timezone.make_aware(corrected_datetime, timezone=timezone.get_current_timezone())
                    new_time_out = TimeEntry.objects.create(
                        employee=employee,
                        entry_type='time_out',
                        timestamp=corrected_time,
                        event_time=corrected_time,
                        notes=f"Created via approved time correction request"
                    )
                    print(f"Created new time out entry: {new_time_out.id}")
                    print(f"Created time out entry with event_time: {new_time_out.event_time}")
            
            print(f"Time correction applied successfully for employee {employee.full_name} on {date}")
            
        except Exception as e:
            print(f"Error applying time correction: {str(e)}")
            raise e


class OvertimeRequestViewSet(viewsets.ModelViewSet):
    queryset = OvertimeRequest.objects.all()
    serializer_class = OvertimeRequestSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status']

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'employee_profile'):
            return OvertimeRequest.objects.none()
        employee = user.employee_profile
        # Team leaders/managers see requests from their team
        if employee.can_view_team_data():
            team_members = employee.get_team_members()
            return OvertimeRequest.objects.filter(employee__in=team_members)
        # Employees see their own requests
        return OvertimeRequest.objects.filter(employee=employee)

    def create(self, request, *args, **kwargs):
        if not hasattr(request.user, 'employee_profile'):
            return Response({'detail': 'User has no associated employee profile'}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()
        data['employee'] = request.user.employee_profile.id

        # Set approver to Team Leader (department.manager.user) if available
        employee = request.user.employee_profile
        approver = None
        if employee.department and employee.department.team_leaders.exists():
            approver = employee.department.team_leaders.first().user
        if approver:
            data['approver'] = approver.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'pending':
            return Response({'detail': 'Only pending requests can be updated.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'pending':
            return Response({'detail': 'Only pending requests can be updated.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'pending':
            return Response({'detail': 'Only pending requests can be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        """Approve an overtime request (team leader/manager only)"""
        overtime_request = self.get_object()
        user = request.user
        if not hasattr(user, 'employee_profile') or not user.employee_profile.can_view_team_data():
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if overtime_request.status != 'pending':
            return Response({'detail': 'Only pending requests can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        overtime_request.status = 'approved'
        overtime_request.approver = user
        overtime_request.comments = request.data.get('comments', '')
        overtime_request.save()
        return Response(self.get_serializer(overtime_request).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """Reject an overtime request (team leader/manager only)"""
        overtime_request = self.get_object()
        user = request.user
        if not hasattr(user, 'employee_profile') or not user.employee_profile.can_view_team_data():
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if overtime_request.status != 'pending':
            return Response({'detail': 'Only pending requests can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        overtime_request.status = 'rejected'
        overtime_request.approver = user
        overtime_request.comments = request.data.get('comments', '')
        overtime_request.save()
        return Response(self.get_serializer(overtime_request).data)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'leave_type']

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'employee_profile'):
            return LeaveRequest.objects.none()
        employee = user.employee_profile
        
        # Team leaders/managers see requests from their team
        if employee.can_view_team_data():
            try:
                # Get departments where this employee is a team leader
                led_departments = employee.led_departments.all()
                if led_departments.exists():
                    team_members = Employee.objects.filter(
                        department__in=led_departments, 
                        employment_status='active'
                    ).exclude(id=employee.id)
                    return LeaveRequest.objects.filter(employee__in=team_members)
                else:
                    # If no departments led, return empty queryset
                    return LeaveRequest.objects.none()
            except Exception as e:
                # Fallback to empty queryset if there's an error
                return LeaveRequest.objects.none()
        
        # Employees see their own requests
        return LeaveRequest.objects.filter(employee=employee)

    def create(self, request, *args, **kwargs):
        if not hasattr(request.user, 'employee_profile'):
            return Response({'detail': 'User has no associated employee profile'}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()
        data['employee'] = request.user.employee_profile.id

        # Set approver to Team Leader (department.manager.user) if available
        employee = request.user.employee_profile
        approver = None
        if employee.department and employee.department.team_leaders.exists():
            approver = employee.department.team_leaders.first().user
        if approver:
            data['approver'] = approver.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'pending':
            return Response({'detail': 'Only pending requests can be updated.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'pending':
            return Response({'detail': 'Only pending requests can be updated.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'pending':
            return Response({'detail': 'Only pending requests can be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        leave_request = self.get_object()
        user = request.user
        if not hasattr(user, 'employee_profile') or not user.employee_profile.can_view_team_data():
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if leave_request.status != 'pending':
            return Response({'detail': 'Only pending requests can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        leave_request.status = 'approved'
        leave_request.approver = user
        leave_request.comments = request.data.get('comments', '')
        leave_request.save()
        return Response(self.get_serializer(leave_request).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        leave_request = self.get_object()
        user = request.user
        if not hasattr(user, 'employee_profile') or not user.employee_profile.can_view_team_data():
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if leave_request.status != 'pending':
            return Response({'detail': 'Only pending requests can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        leave_request.status = 'rejected'
        leave_request.approver = user
        leave_request.comments = request.data.get('comments', '')
        leave_request.save()
        return Response(self.get_serializer(leave_request).data)


class ChangeScheduleRequestViewSet(viewsets.ModelViewSet):
    queryset = ChangeScheduleRequest.objects.all()
    serializer_class = ChangeScheduleRequestSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status']

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'employee_profile'):
            return ChangeScheduleRequest.objects.none()
        employee = user.employee_profile
        # Team leaders/managers see requests from their team
        if employee.can_view_team_data():
            team_members = employee.get_team_members()
            return ChangeScheduleRequest.objects.filter(employee__in=team_members)
        # Employees see their own requests
        return ChangeScheduleRequest.objects.filter(employee=employee)

    def create(self, request, *args, **kwargs):
        if not hasattr(request.user, 'employee_profile'):
            return Response({'detail': 'User has no associated employee profile'}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()
        data['employee'] = request.user.employee_profile.id

        # Set approver to Team Leader (department.manager.user) if available
        employee = request.user.employee_profile
        approver = None
        if employee.department and employee.department.team_leaders.exists():
            approver = employee.department.team_leaders.first().user
        if approver:
            data['approver'] = approver.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Update a schedule with restrictions for employees"""
        # Check if user is employee and trying to modify past schedule
        if not request.user.is_staff and not (hasattr(request.user, 'employee_profile') and request.user.employee_profile.role == 'team_leader'):
            from datetime import date
            instance = self.get_object()
            
            # Check if schedule is for past date
            if instance.date < date.today():
                return Response(
                    {'error': 'You are not allowed to Update/Add. Contact your TeamLeader.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if trying to modify today's schedule (employees cannot modify daily schedules)
            if instance.date == date.today():
                return Response(
                    {'error': 'You are not allowed to Update/Add. Contact your TeamLeader.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """Partial update a schedule with restrictions for employees"""
        # Check if user is employee and trying to modify past schedule
        if not request.user.is_staff and not (hasattr(request.user, 'employee_profile') and request.user.employee_profile.role == 'team_leader'):
            from datetime import date
            instance = self.get_object()
            
            # Check if schedule is for past date
            if instance.date < date.today():
                return Response(
                    {'error': 'You are not allowed to Update/Add. Contact your TeamLeader.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if trying to modify today's schedule (employees cannot modify daily schedules)
            if instance.date == date.today():
                return Response(
                    {'error': 'You are not allowed to Update/Add. Contact your TeamLeader.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'pending':
            return Response({'detail': 'Only pending requests can be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        change_request = self.get_object()
        user = request.user
        if not hasattr(user, 'employee_profile') or not user.employee_profile.can_view_team_data():
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if change_request.status != 'pending':
            return Response({'detail': 'Only pending requests can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        change_request.status = 'approved'
        change_request.approver = user
        change_request.comments = request.data.get('comments', '')
        change_request.save()
        return Response(self.get_serializer(change_request).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        change_request = self.get_object()
        user = request.user
        if not hasattr(user, 'employee_profile') or not user.employee_profile.can_view_team_data():
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if change_request.status != 'pending':
            return Response({'detail': 'Only pending requests can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        change_request.status = 'rejected'
        change_request.approver = user
        change_request.comments = request.data.get('comments', '')
        change_request.save()
        return Response(self.get_serializer(change_request).data)

    def check_object_permissions(self, request, obj):
        """Check if user has permission to access/modify this specific schedule"""
        user = request.user
        
        # Staff can access any schedule
        if user.is_staff:
            return
        
        # Check if user has employee profile
        if not hasattr(user, 'employee_profile'):
            raise PermissionDenied("Employee profile not found.")
        
        employee = user.employee_profile
        
        # Team leaders can access schedules for their team members
        if employee.role == 'team_leader':
            # Check if the schedule belongs to a team member
            # Use the same logic as get_subordinates() method
            from .models import Employee
            if Employee.objects.filter(
                department=obj.employee.department,
                department__team_leaders=employee,
                employment_status='active'
            ).exists():
                return
            else:
                raise PermissionDenied("You can only access schedules for employees in departments you lead.")
        
        # Regular employees can only access their own schedules
        if obj.employee != employee:
            raise PermissionDenied("You can only access your own schedules.")
        
        return super().check_object_permissions(request, obj)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tl_departments_and_locations(request):
    # Get the Employee object for the logged-in user
    try:
        employee = Employee.objects.get(user=request.user)
    except Employee.DoesNotExist:
        return Response({'detail': 'Employee profile not found.'}, status=404)

    # Get all departments where this employee is a team leader (TL)
    departments = Department.objects.filter(team_leaders=employee).prefetch_related('employees', 'location')
    
    # Prepare department data with employees
    department_data = []
    for dept in departments:
        dept_serializer = DepartmentSerializer(dept)
        dept_data = dept_serializer.data
        
        # Add employees to department data
        employees = dept.employees.filter(employment_status='active')
        employee_serializer = EmployeeListSerializer(employees, many=True)
        dept_data['employees'] = employee_serializer.data
        
        department_data.append(dept_data)

    # Get all unique locations for these departments
    locations = Location.objects.filter(departments__team_leaders=employee).distinct()
    location_serializer = LocationSerializer(locations, many=True)

    return Response({
        'departments': department_data,
        'locations': location_serializer.data,
    })


class ScheduleTemplateViewSet(viewsets.ModelViewSet):
    queryset = ScheduleTemplate.objects.filter(is_active=True)
    serializer_class = ScheduleTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            # Staff can see all templates
            return ScheduleTemplate.objects.filter(is_active=True)
        else:
            # Employees can see company, team, and personal templates
            employee = user.employee_profile
            return ScheduleTemplate.objects.filter(
                is_active=True
            ).filter(
                models.Q(template_type='company') |
                models.Q(template_type='team', team=employee.department) |
                models.Q(template_type='personal', created_by=employee)
            )

    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get available templates for the current user"""
        templates = get_available_templates(request.user.employee_profile)
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)


class EmployeeScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # Disable pagination to show all results

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            # Staff can see all schedules
            return EmployeeSchedule.objects.all()
        elif hasattr(user, 'employee_profile') and user.employee_profile.role == 'team_leader':
            # Team Leaders can see their own schedules and their team members' schedules
            # Use the same logic as get_subordinates() method
            from .models import Employee
            team_members = Employee.objects.filter(
                department__team_leaders=user.employee_profile,
                employment_status='active'
            )
            return EmployeeSchedule.objects.filter(employee__in=team_members)
        else:
            # Regular employees can only see their own schedules
            return EmployeeSchedule.objects.filter(employee=user.employee_profile)

    def create(self, request, *args, **kwargs):
        """Create a new schedule, automatically setting the employee"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Creating schedule - User: {request.user.username}")
        logger.info(f"Request data: {request.data}")
        logger.info(f"User is staff: {request.user.is_staff}")
        logger.info(f"User has employee profile: {hasattr(request.user, 'employee_profile')}")
        if hasattr(request.user, 'employee_profile'):
            logger.info(f"User role: {request.user.employee_profile.role}")
        
        # Check if user is employee and trying to create schedule for past date
        # Team leaders can create schedules for today and future dates for themselves and team members
        if not request.user.is_staff and not (hasattr(request.user, 'employee_profile') and request.user.employee_profile.role == 'team_leader'):
            from datetime import date
            from django.utils import timezone
            schedule_date = request.data.get('date')
            if schedule_date:
                try:
                    schedule_date = date.fromisoformat(schedule_date)
                    today = timezone.now().date()
                    if schedule_date < today:
                        return Response(
                            {'error': 'You are not allowed to Update/Add. Contact your TeamLeader.'}, 
                            status=status.HTTP_403_FORBIDDEN
                        )
                except (ValueError, TypeError):
                    pass
        
        # Check if schedule already exists for this date
        from .models import EmployeeSchedule, Employee
        schedule_date = request.data.get('date')
        target_employee_id = request.data.get('employee')
        
        logger.info(f"Schedule creation - Date: {schedule_date}, Target Employee ID: {target_employee_id}")
        logger.info(f"Request data keys: {list(request.data.keys())}")
        
        # For team leaders, validate they can only create schedules for team members
        if hasattr(request.user, 'employee_profile') and request.user.employee_profile.role == 'team_leader':
            if target_employee_id:
                try:
                    # target_employee_id is the database ID, we need to validate it's a team member
                    target_employee = Employee.objects.filter(id=target_employee_id).first()
                    if not target_employee:
                        return Response(
                            {'error': 'Target employee not found.'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Check if target employee is someone the team leader can manage
                    # Use the same logic as get_subordinates() method
                    if not Employee.objects.filter(
                        department=target_employee.department,
                        department__team_leaders=request.user.employee_profile,
                        employment_status='active'
                    ).exists():
                        return Response(
                            {'error': 'You can only create schedules for employees in departments you lead.'}, 
                            status=status.HTTP_403_FORBIDDEN
                        )
                    
                    logger.info(f"Team leader creating schedule for team member: {target_employee.employee_id} (DB ID: {target_employee.id})")
                    
                    # Only check for existing schedule if we're trying to create one
                    # This prevents blocking legitimate new schedule creation
                    logger.info(f"Proceeding with schedule creation for team member")
                    
                except Exception as e:
                    logger.error(f"Error finding target employee: {str(e)}")
                    return Response(
                        {'error': 'Error finding target employee.'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                # No employee specified, default to team leader's own schedule
                request.data['employee'] = request.user.employee_profile.id
                logger.info(f"Team leader creating schedule for themselves (DB ID: {request.user.employee_profile.id})")
                
                # Only check for existing schedule if we're trying to create one
                logger.info(f"Proceeding with schedule creation for team leader")
        
        # For regular employees, ensure they can only create their own schedules
        elif not request.user.is_staff:
            request.data['employee'] = request.user.employee_profile.id
            
            # Only check for existing schedule if we're trying to create one
            logger.info(f"Proceeding with schedule creation for regular employee")
        

        

        
        logger.info(f"Final request data before creation: {request.data}")
        logger.info(f"Employee field value: {request.data.get('employee')}")
        
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating schedule: {str(e)}")
            logger.error(f"Request data: {request.data}")
            logger.error(f"User: {request.user.username}")
            logger.error(f"User role: {getattr(request.user.employee_profile, 'role', 'N/A') if hasattr(request.user, 'employee_profile') else 'No profile'}")
            # Check for specific error types and provide better messages
            error_message = str(e)
            if 'unique' in error_message.lower():
                # This is a unique constraint violation
                schedule_date = request.data.get('date')
                employee_id = request.data.get('employee')
                
                try:
                    from .models import Employee
                    employee = Employee.objects.get(id=employee_id)
                    error_message = f'A schedule already exists for {employee.employee_id} on {schedule_date}. Please edit the existing schedule instead of creating a new one.'
                except:
                    error_message = f'A schedule already exists for this employee on {schedule_date}. Please edit the existing schedule instead of creating a new one.'
                
                return Response(
                    {'error': error_message}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                return Response(
                    {'error': f'Error creating schedule: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

    def update(self, request, *args, **kwargs):
        """Update a schedule with restrictions for employees"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Updating schedule - User: {request.user.username}")
        logger.info(f"Schedule instance: {self.get_object()}")
        
        # Check if user is employee and trying to modify past schedule
        if not request.user.is_staff and not (hasattr(request.user, 'employee_profile') and request.user.employee_profile.role == 'team_leader'):
            from datetime import date
            from django.utils import timezone
            instance = self.get_object()
            
            # Check if schedule is for past date
            today = timezone.now().date()
            if instance.date < today:
                return Response(
                    {'error': 'You are not allowed to Update/Add. Contact your TeamLeader.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if trying to modify today's schedule (employees cannot modify daily schedules)
            if instance.date == today:
                return Response(
                    {'error': 'You are not allowed to Update/Add. Contact your TeamLeader.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # For team leaders, validate they can only modify schedules for team members or themselves
        if hasattr(request.user, 'employee_profile') and request.user.employee_profile.role == 'team_leader':
            instance = self.get_object()
            from .models import Employee
            
            # Check if the schedule belongs to a team member or the team leader themselves
            # Use the same logic as get_subordinates() method
            if not Employee.objects.filter(
                department=instance.employee.department,
                department__team_leaders=request.user.employee_profile,
                employment_status='active'
            ).exists():
                return Response(
                    {'error': 'You can only modify schedules for employees in departments you lead.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            logger.info(f"Team leader updating schedule for: {instance.employee.employee_id}")
        
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """Partial update a schedule with restrictions for employees"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Partial updating schedule - User: {request.user.username}")
        logger.info(f"Schedule instance: {self.get_object()}")
        
        # Check if user is employee and trying to modify past schedule
        if not request.user.is_staff and not (hasattr(request.user, 'employee_profile') and request.user.employee_profile.role == 'team_leader'):
            from datetime import date
            from django.utils import timezone
            instance = self.get_object()
            
            # Check if schedule is for past date
            today = timezone.now().date()
            if instance.date < today:
                return Response(
                    {'error': 'You are not allowed to Update/Add. Contact your TeamLeader.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if trying to modify today's schedule (employees cannot modify daily schedules)
            if instance.date == today:
                return Response(
                    {'error': 'You are not allowed to Update/Add. Contact your TeamLeader.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # For team leaders, validate they can only modify schedules for team members or themselves
        if hasattr(request.user, 'employee_profile') and request.user.employee_profile.role == 'team_leader':
            instance = self.get_object()
            from .models import Employee
            
            # Check if the schedule belongs to a team member or the team leader themselves
            # Use the same logic as get_subordinates() method
            if not Employee.objects.filter(
                department=instance.employee.department,
                department__team_leaders=request.user.employee_profile,
                employment_status='active'
            ).exists():
                return Response(
                    {'error': 'You can only modify schedules for employees in departments you lead.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            logger.info(f"Team leader partial updating schedule for: {instance.employee.employee_id}")
        
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete a schedule with restrictions for employees"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Deleting schedule - User: {request.user.username}")
        logger.info(f"Schedule instance: {self.get_object()}")
        
        # Only staff and team leaders can delete schedules
        if not request.user.is_staff and not (hasattr(request.user, 'employee_profile') and request.user.employee_profile.role == 'team_leader'):
            return Response(
                {'error': 'You are not allowed to delete schedules. Contact your TeamLeader.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # For team leaders, validate they can only delete schedules for team members or themselves
        if hasattr(request.user, 'employee_profile') and request.user.employee_profile.role == 'team_leader':
            instance = self.get_object()
            from .models import Employee
            
            # Check if the schedule belongs to a team member or the team leader themselves
            # Use the same logic as get_subordinates() method
            from .models import Employee
            if not Employee.objects.filter(
                department=instance.employee.department,
                department__team_leaders=request.user.employee_profile,
                employment_status='active'
            ).exists():
                return Response(
                    {'error': 'You can only delete schedules for employees in departments you lead.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"Team leader deleting schedule for: {instance.employee.employee_id}")
        
        return super().destroy(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"List schedules request - User: {request.user.username}")
        
        # Filter by date range if provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        employee_id = request.query_params.get('employee')
        
        logger.info(f"List params - start_date: {start_date}, end_date: {end_date}, employee_id: {employee_id}")
        
        queryset = self.get_queryset()
        logger.info(f"Initial queryset count: {queryset.count()}")
        
        # Debug: Check what's in the initial queryset
        if queryset.count() > 0:
            logger.info(f"Initial queryset sample: {list(queryset[:5].values('id', 'employee_id', 'date', 'employee__employee_id'))}")
        else:
            logger.info("Initial queryset is empty")
        
        # Filter by specific employee if provided and user has access
        if employee_id:
            logger.info(f"Employee ID provided: {employee_id} (type: {type(employee_id)})")
            if request.user.is_staff or (hasattr(request.user, 'employee_profile') and request.user.employee_profile.role == 'team_leader'):
                # Staff and Team Leaders can filter by specific employee
                # Try to filter by database ID first, then by employee_id string
                try:
                    # Check if employee_id is a number (database ID)
                    if str(employee_id).isdigit():
                        logger.info(f"Filtering by database ID: {employee_id}")
                        queryset = queryset.filter(employee_id=employee_id)
                        logger.info(f"Filtered by database ID: {employee_id}")
                        
                        # Debug: Check what's in the queryset
                        logger.info(f"Queryset after employee filter: {list(queryset.values('id', 'employee_id', 'date', 'employee__employee_id'))}")
                        
                    else:
                        # It's an employee_id string
                        logger.info(f"Filtering by employee_id string: {employee_id}")
                        queryset = queryset.filter(employee__employee_id=employee_id)
                        logger.info(f"Filtered by employee_id string: {employee_id}")
                        
                        # Debug: Check what's in the queryset
                        logger.info(f"Queryset after employee filter: {list(queryset.values('id', 'employee_id', 'date', 'employee__employee_id'))}")
                        
                except Exception as e:
                    logger.error(f"Error in employee filtering: {str(e)}")
                    # Fallback to employee_id string
                    queryset = queryset.filter(employee__employee_id=employee_id)
                    logger.info(f"Fallback filtered by employee_id string: {employee_id}")
            else:
                # Regular employees can only see their own schedules
                queryset = queryset.filter(employee=request.user.employee_profile)
                logger.info(f"Filtered by current user profile")
        else:
            logger.info("No employee ID provided, showing all accessible schedules")
        
        logger.info(f"Queryset count after employee filter: {queryset.count()}")
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def team_members(self, request):
        """Get all team members that the team leader can manage"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Team members request - User: {request.user.username}")
        
        # Only team leaders can access this endpoint
        if not hasattr(request.user, 'employee_profile') or request.user.employee_profile.role != 'team_leader':
            return Response(
                {'error': 'Only Team Leaders can access team members.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            from .models import Employee
            
            # Get all team members in the same department
            team_members = Employee.objects.filter(department=request.user.employee_profile.department)
            logger.info(f"Found {team_members.count()} team members")
            
            # Serialize team member data
            team_data = []
            for member in team_members:
                team_data.append({
                    'id': member.id,
                    'employee_id': member.employee_id,
                    'first_name': member.user.first_name,
                    'last_name': member.user.last_name,
                    'email': member.user.email,
                    'role': member.role,
                    'department': member.department.name if member.department else None,
                    'is_team_leader': member.role == 'team_leader'
                })
            
            return Response({
                'team_members': team_data,
                'total_count': len(team_data),
                'department': request.user.employee_profile.department.name if request.user.employee_profile.department else None
            })
            
        except Exception as e:
            logger.error(f"Error getting team members: {str(e)}")
            return Response(
                {'error': f'Error getting team members: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def team_schedules(self, request):
        """Get all schedules for team members (Team Leaders only)"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Team schedules request - User: {request.user.username}")
        
        # Only team leaders can access this endpoint
        if not hasattr(request.user, 'employee_profile') or request.user.employee_profile.role != 'team_leader':
            return Response(
                {'error': 'Only Team Leaders can access team schedules.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            from .models import Employee
            from django.utils import timezone
            
            # Get date range from query params
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Get all team members in the same department
            team_members = Employee.objects.filter(department=request.user.employee_profile.department)
            logger.info(f"Found {team_members.count()} team members")
            
            # Get schedules for all team members
            queryset = EmployeeSchedule.objects.filter(employee__in=team_members)
            
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            if end_date:
                queryset = queryset.filter(date__lte=end_date)
            
            # Order by date and employee name
            queryset = queryset.order_by('date', 'employee__user__first_name')
            
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'team_schedules': serializer.data,
                'team_members_count': team_members.count(),
                'schedules_count': queryset.count(),
                'date_range': {
                    'start_date': start_date,
                    'end_date': end_date
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting team schedules: {str(e)}")
            return Response(
                {'error': f'Error getting team schedules: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def test_create(self, request):
        """Test endpoint to debug schedule creation"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Test create endpoint - User: {request.user.username}")
        logger.info(f"Request data: {request.data}")
        logger.info(f"Request user: {request.user}")
        logger.info(f"User is staff: {request.user.is_staff}")
        logger.info(f"User has employee profile: {hasattr(request.user, 'employee_profile')}")
        if hasattr(request.user, 'employee_profile'):
            logger.info(f"User role: {request.user.employee_profile.role}")
            logger.info(f"User department: {request.user.employee_profile.department}")
        
        return Response({
            'message': 'Test endpoint working',
            'user': request.user.username,
            'data': request.data,
            'is_staff': request.user.is_staff,
            'has_profile': hasattr(request.user, 'employee_profile'),
            'role': getattr(request.user.employee_profile, 'role', 'N/A') if hasattr(request.user, 'employee_profile') else 'No profile'
        })

    @action(detail=False, methods=['post'])
    def apply_template(self, request):
        """Apply a template to a date range"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Apply template request - User: {request.user.username}")
        logger.info(f"Request data: {request.data}")
        
        serializer = BulkScheduleSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # Check if user is employee and trying to create schedules for past dates
                if not request.user.is_staff:
                    from datetime import date
                    from django.utils import timezone
                    start_date = serializer.validated_data['start_date']
                    end_date = serializer.validated_data['end_date']
                    
                    # Check if any date in the range is in the past
                    today = timezone.now().date()
                    if start_date < today:
                        return Response(
                            {'error': 'You are not allowed to Update/Add. Contact your TeamLeader.'}, 
                            status=status.HTTP_403_FORBIDDEN
                        )
                    
                    # Check if trying to modify today's schedule (employees cannot modify daily schedules)
                    if start_date <= today <= end_date:
                        return Response(
                            {'error': 'You are not allowed to Update/Add. Contact your TeamLeader.'}, 
                            status=status.HTTP_403_FORBIDDEN
                        )
                
                template_id = serializer.validated_data['template_id']
                template = ScheduleTemplate.objects.get(id=template_id)
                
                # Determine which employee to create schedules for
                target_employee = None
                if 'employee' in serializer.validated_data and serializer.validated_data['employee']:
                    # Team leader is creating schedules for a team member
                    from .models import Employee
                    target_employee = Employee.objects.filter(id=serializer.validated_data['employee']).first()
                    if not target_employee:
                        return Response(
                            {'error': 'Target employee not found'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Validate that team leader can manage this employee
                    if not Employee.objects.filter(
                        department=target_employee.department,
                        department__team_leaders=request.user.employee_profile,
                        employment_status='active'
                    ).exists():
                        return Response(
                            {'error': 'You can only create schedules for employees in departments you lead.'}, 
                            status=status.HTTP_403_FORBIDDEN
                        )
                    
                    logger.info(f"Team leader creating bulk schedules for team member: {target_employee.employee_id} (DB ID: {target_employee.id})")
                else:
                    # Creating schedules for the current user
                    target_employee = request.user.employee_profile
                    logger.info(f"Creating bulk schedules for current user: {target_employee.employee_id}")
                
                result = apply_template_to_schedule(
                    employee=target_employee,
                    template=template,
                    start_date=serializer.validated_data['start_date'],
                    end_date=serializer.validated_data['end_date'],
                    weekdays_only=serializer.validated_data['weekdays_only'],
                    overwrite_existing=serializer.validated_data['overwrite_existing']
                )
                
                # Build detailed message
                message = f'Successfully created {result["schedules_created"]} schedules'
                if result["dates_updated"] > 0:
                    message += f', updated {result["dates_updated"]} existing schedules'
                if result["dates_skipped"] > 0:
                    message += f', skipped {result["dates_skipped"]} existing dates'
                
                return Response({
                    'message': message,
                    'schedules_created': result["schedules_created"],
                    'dates_updated': result["dates_updated"],
                    'dates_skipped': result["dates_skipped"],
                    'skipped_dates_list': result["skipped_dates_list"]
                })
            except ScheduleTemplate.DoesNotExist:
                return Response(
                    {'error': 'Template not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            except Exception as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def check_existing_schedules(self, request):
        """Check for existing schedules in a date range"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Check existing schedules request - User: {request.user.username}")
        logger.info(f"Request data: {request.data}")
        
        from .serializers import CheckExistingSchedulesSerializer
        
        serializer = CheckExistingSchedulesSerializer(data=request.data)
        logger.info(f"Serializer is valid: {serializer.is_valid()}")
        if not serializer.is_valid():
            logger.error(f"Serializer errors: {serializer.errors}")
            logger.error(f"Request data that failed validation: {request.data}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        if serializer.is_valid():
            try:
                # Check if user is employee and trying to check past dates
                if not request.user.is_staff:
                    from datetime import date
                    start_date = serializer.validated_data['start_date']
                    end_date = serializer.validated_data['end_date']
                    
                    # Check if any date in the range is in the past
                    if start_date < date.today():
                        return Response(
                            {'error': 'You are not allowed to Update/Add. Contact your TeamLeader.'}, 
                            status=status.HTTP_403_FORBIDDEN
                        )
                
                from .models import EmployeeSchedule
                from datetime import timedelta
                
                start_date = serializer.validated_data['start_date']
                end_date = serializer.validated_data['end_date']
                weekdays_only = serializer.validated_data['weekdays_only']
                
                # Determine which employee to check schedules for
                target_employee = None
                if 'employee' in serializer.validated_data and serializer.validated_data['employee']:
                    # Team leader is checking schedules for a team member
                    from .models import Employee
                    target_employee = Employee.objects.filter(id=serializer.validated_data['employee']).first()
                    if not target_employee:
                        return Response(
                            {'error': 'Target employee not found'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Validate that team leader can check schedules for this employee
                    if not Employee.objects.filter(
                        department=target_employee.department,
                        department__team_leaders=request.user.employee_profile,
                        employment_status='active'
                    ).exists():
                        return Response(
                            {'error': 'You can only check schedules for employees in departments you lead.'}, 
                            status=status.HTTP_403_FORBIDDEN
                        )
                    
                    logger.info(f"Team leader checking existing schedules for team member: {target_employee.employee_id} (DB ID: {target_employee.id})")
                else:
                    # Checking schedules for the current user
                    target_employee = request.user.employee_profile
                    logger.info(f"Checking existing schedules for current user: {target_employee.employee_id}")
                
                # Get existing schedules in the date range
                existing_schedules = EmployeeSchedule.objects.filter(
                    employee=target_employee,
                    date__gte=start_date,
                    date__lte=end_date
                ).order_by('date')
                
                # Filter by weekdays if needed
                if weekdays_only:
                    existing_schedules = [
                        schedule for schedule in existing_schedules 
                        if schedule.date.weekday() < 5  # Monday = 0, Friday = 4
                    ]
                
                existing_dates = [schedule.date.strftime('%Y-%m-%d') for schedule in existing_schedules]
                
                return Response({
                    'has_existing_schedules': len(existing_dates) > 0,
                    'existing_dates_count': len(existing_dates),
                    'existing_dates': existing_dates,
                    'message': f'Found {len(existing_dates)} existing schedules in the selected date range.'
                })
                
            except Exception as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def copy_previous_month(self, request):
        """Copy schedules from previous month"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Copy previous month request - User: {request.user.username}")
        logger.info(f"Request data: {request.data}")
        
        try:
            from datetime import datetime, timedelta
            from dateutil.relativedelta import relativedelta
            
            # Get the target month from request data or use current month
            target_month = request.data.get('target_month')
            if target_month:
                try:
                    target_date = datetime.strptime(target_month, '%Y-%m').date()
                except ValueError:
                    return Response(
                        {'error': 'Invalid target_month format. Use YYYY-MM format.'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                target_date = datetime.now().date()
            
            # Calculate previous month
            previous_month = target_date - relativedelta(months=1)
            
            # Determine which employee to copy schedules for
            target_employee = None
            if 'employee' in request.data and request.data['employee']:
                # Team leader is copying schedules for a team member
                from .models import Employee
                target_employee = Employee.objects.filter(id=request.data['employee']).first()
                if not target_employee:
                    return Response(
                        {'error': 'Target employee not found'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validate that team leader can copy schedules for this employee
                if not Employee.objects.filter(
                    department=target_employee.department,
                    department__team_leaders=request.user.employee_profile,
                    employment_status='active'
                ).exists():
                    return Response(
                        {'error': 'You can only copy schedules for employees in departments you lead.'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                logger.info(f"Team leader copying schedules for team member: {target_employee.employee_id} (DB ID: {target_employee.id})")
            else:
                # Copying schedules for the current user
                target_employee = request.user.employee_profile
                logger.info(f"Copying schedules for current user: {target_employee.employee_id}")
            
            result = copy_schedule_from_previous_month(
                employee=target_employee,
                target_month=target_date,
                previous_month=previous_month
            )
            
            return Response({
                'message': f'Successfully copied {result} schedules from {previous_month.strftime("%B %Y")} to {target_date.strftime("%B %Y")}',
                'schedules_copied': result
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's schedule for the current employee"""
        try:
            from datetime import date
            today = date.today()
            
            # Get today's schedule for the current employee
            schedule = EmployeeSchedule.objects.filter(
                employee=request.user.employee_profile,
                date=today
            ).first()
            
            if not schedule:
                return Response({}, status=status.HTTP_200_OK)
            
            serializer = self.get_serializer(schedule)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def report(self, request):
        """Get schedule report for a date range"""
        serializer = ScheduleReportSerializer(data=request.query_params)
        if serializer.is_valid():
            try:
                # Check if a specific employee is requested
                employee_id = request.query_params.get('employee_id')
                
                if employee_id and employee_id != 'all':
                    # Get the requested employee
                    try:
                        from .models import Employee
                        target_employee = Employee.objects.get(id=employee_id)
                        
                        # For team leaders, verify they can access this employee's data
                        if request.user.employee_profile.role == 'team_leader':
                            # Check if the target employee is a subordinate
                            subordinates = request.user.employee_profile.get_subordinates()
                            if not subordinates.filter(id=employee_id).exists():
                                return Response(
                                    {'error': 'Access denied. You can only view reports for your team members.'}, 
                                    status=status.HTTP_403_FORBIDDEN
                                )
                        
                        employee = target_employee
                    except Employee.DoesNotExist:
                        return Response(
                            {'error': 'Employee not found'}, 
                            status=status.HTTP_404_NOT_FOUND
                        )
                else:
                    # Use the logged-in user's employee profile
                    employee = request.user.employee_profile
                
                report_data = get_employee_schedule_report(
                    employee=employee,
                    start_date=serializer.validated_data['start_date'],
                    end_date=serializer.validated_data['end_date']
                )
                return Response(report_data)
            except Exception as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DailyTimeSummaryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DailyTimeSummarySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            # Staff can see all summaries
            return DailyTimeSummary.objects.all()
        else:
            # Employees can only see their own summaries
            return DailyTimeSummary.objects.filter(employee=user.employee_profile)

    def list(self, request, *args, **kwargs):
        # Filter by date range if provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = self.get_queryset()
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate daily summaries for a date range"""
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            result = generate_daily_summaries_for_period(
                employee=request.user.employee_profile,
                start_date=start_date,
                end_date=end_date
            )
            
            return Response({
                'message': f'Successfully generated {result} daily summaries',
                'summaries_generated': result
            })
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def generate_summaries(self, request):
        """Generate DailyTimeSummary records by connecting TimeEntry with EmployeeSchedule data"""
        from datetime import date
        from .utils import generate_daily_summaries_for_period
        
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        employee_id = request.data.get('employee_id')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = date.fromisoformat(start_date)
            end_date = date.fromisoformat(end_date)
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get employee if specified
        employee = None
        if employee_id:
            try:
                employee = Employee.objects.get(employee_id=employee_id)
            except Employee.DoesNotExist:
                return Response(
                    {'error': f'Employee with ID {employee_id} not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Generate summaries
        result = generate_daily_summaries_for_period(start_date, end_date, employee)
        
        return Response({
            'message': 'Daily summaries generated successfully',
            'result': result
        })

    @action(detail=False, methods=['get'])
    def time_attendance_report(self, request):
        """Get TIME ATTENDANCE report for an employee"""
        from datetime import date
        from .utils import get_employee_time_attendance_report
        import logging
        import traceback
        
        logger = logging.getLogger(__name__)
        
        employee_id = request.query_params.get('employee_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        logger.info(f"Time attendance report request - employee_id: {employee_id}, start_date: {start_date}, end_date: {end_date}")
        
        if not employee_id or not start_date or not end_date:
            logger.error("Missing required parameters for time attendance report")
            return Response(
                {'error': 'employee_id, start_date, and end_date are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            employee = Employee.objects.get(employee_id=employee_id)
            logger.info(f"Found employee: {employee.full_name} ({employee.employee_id})")
        except Employee.DoesNotExist:
            logger.error(f"Employee with ID {employee_id} not found")
            return Response(
                {'error': f'Employee with ID {employee_id} not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error finding employee {employee_id}: {str(e)}")
            return Response(
                {'error': f'Error finding employee: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            start_date = date.fromisoformat(start_date)
            end_date = date.fromisoformat(end_date)
            logger.info(f"Parsed dates - start_date: {start_date}, end_date: {end_date}")
        except ValueError as e:
            logger.error(f"Invalid date format: {e}")
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error parsing dates: {str(e)}")
            return Response(
                {'error': f'Error parsing dates: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Check if user has permission to view this employee's data
        try:
            if not request.user.is_staff and request.user.employee_profile != employee:
                logger.warning(f"User {request.user.username} attempted to access data for employee {employee.employee_id} without permission")
                return Response(
                    {'error': 'You do not have permission to view this employee\'s data'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except Exception as e:
            logger.error(f"Error checking permissions: {str(e)}")
            return Response(
                {'error': f'Error checking permissions: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            # Generate report
            logger.info(f"Generating time attendance report for employee {employee.employee_id} from {start_date} to {end_date}")
            report = get_employee_time_attendance_report(employee, start_date, end_date)
            logger.info(f"Successfully generated report with {len(report.get('daily_records', []))} daily records")
            return Response(report)
        except Exception as e:
            logger.error(f"Error generating time attendance report: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to generate report: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

