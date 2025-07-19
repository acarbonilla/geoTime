from django.shortcuts import render
from django.contrib.auth.models import User
from django.db.models import Q, Count, Avg
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import Location, Department, Employee, TimeEntry, WorkSession, TimeCorrectionRequest
from .serializers import (
    LocationSerializer, LocationListSerializer, DepartmentSerializer, DepartmentListSerializer,
    EmployeeSerializer, EmployeeListSerializer, TimeEntrySerializer, TimeEntryListSerializer,
    TimeInOutSerializer, WorkSessionSerializer, OvertimeAnalysisSerializer, CurrentSessionStatusSerializer,
    TimeCorrectionRequestSerializer
)
from .utils import OvertimeCalculator, BreakDetector
from django.http import HttpResponse
import csv
from django.utils import timezone
from datetime import timedelta


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
            return super().get_queryset().filter(employee=employee)


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
                'department': user.employee_profile.department.name,
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
    filterset_fields = ['location', 'is_active', 'manager']
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
    filterset_fields = ['department', 'employment_status', 'manager', 'hire_date', 'role']
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
        """Get subordinates for a specific employee"""
        employee = self.get_object()
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
        today_entries = TimeEntry.objects.filter(
            employee=employee,
            timestamp__date=timezone.now().date()
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
        team_members = employee.get_team_members()
        team_entries = TimeEntry.objects.filter(
            employee__in=team_members,
            timestamp__date=timezone.now().date()
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
        department_employees = Employee.objects.filter(department=employee.department)
        department_entries = TimeEntry.objects.filter(
            employee__in=department_employees,
            timestamp__date=timezone.now().date()
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
        all_employees = Employee.objects.filter(employment_status='active')
        all_entries = TimeEntry.objects.filter(
            timestamp__date=timezone.now().date()
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
        all_employees = Employee.objects.all()
        all_entries = TimeEntry.objects.filter(
            timestamp__date=timezone.now().date()
        ).order_by('timestamp')
        
        return {
            'dashboard_type': 'it_support',
            'total_employees': all_employees.count(),
            'system_stats': self._get_system_stats(),
            'all_entries': TimeEntryListSerializer(all_entries, many=True).data,
            'active_users': User.objects.filter(is_active=True).count(),
        }
    
    def _get_current_status(self, employee):
        """Get current time status for employee"""
        today_entries = TimeEntry.objects.filter(
            employee=employee,
            timestamp__date=timezone.now().date()
        ).order_by('timestamp')
        
        if not today_entries.exists():
            return 'not_started'
        
        last_entry = today_entries.last()
        if last_entry.entry_type == 'time_in':
            return 'clocked_in'
        else:
            return 'clocked_out'
    
    def _get_team_attendance(self, team_members):
        """Get team attendance summary"""
        attendance = {'present': 0, 'absent': 0, 'late': 0}
        for member in team_members:
            today_entries = TimeEntry.objects.filter(
                employee=member,
                timestamp__date=timezone.now().date()
            )
            if today_entries.exists():
                attendance['present'] += 1
            else:
                attendance['absent'] += 1
        return attendance
    
    def _get_department_attendance(self, department):
        """Get department attendance summary"""
        employees = Employee.objects.filter(department=department, employment_status='active')
        attendance = {'present': 0, 'absent': 0, 'total': employees.count()}
        for employee in employees:
            today_entries = TimeEntry.objects.filter(
                employee=employee,
                timestamp__date=timezone.now().date()
            )
            if today_entries.exists():
                attendance['present'] += 1
            else:
                attendance['absent'] += 1
        return attendance
    
    def _get_company_attendance(self):
        """Get company-wide attendance summary"""
        employees = Employee.objects.filter(employment_status='active')
        attendance = {'present': 0, 'absent': 0, 'total': employees.count()}
        for employee in employees:
            today_entries = TimeEntry.objects.filter(
                employee=employee,
                timestamp__date=timezone.now().date()
            )
            if today_entries.exists():
                attendance['present'] += 1
            else:
                attendance['absent'] += 1
        return attendance
    
    def _get_department_stats(self, department):
        """Get department statistics"""
        return {
            'total_employees': department.employees.filter(employment_status='active').count(),
            'avg_tenure': 0,  # Placeholder for future calculation
        }
    
    def _get_company_stats(self):
        """Get company-wide statistics"""
        return {
            'total_employees': Employee.objects.filter(employment_status='active').count(),
            'total_departments': Department.objects.filter(is_active=True).count(),
            'total_locations': Location.objects.count(),
        }
    
    def _get_system_stats(self):
        """Get system statistics"""
        return {
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'total_time_entries': TimeEntry.objects.count(),
            'today_entries': TimeEntry.objects.filter(timestamp__date=timezone.now().date()).count(),
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
    filterset_fields = ['employee', 'entry_type', 'location', 'timestamp']
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

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's time entries (local time zone)"""
        from django.utils import timezone
        today_local = timezone.localdate()
        today_entries = self.get_queryset().filter(
            timestamp__date=today_local
        )
        serializer = TimeEntryListSerializer(today_entries, many=True)
        return Response(serializer.data)

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
        
        # Geofencing validation
        geofence_result = self.validate_geofence(employee_id, latitude, longitude, accuracy, location_id)
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
        
        # Get the last time entry for this employee
        last_entry = TimeEntry.objects.filter(employee=employee).order_by('-timestamp').first()

        if action == 'time-in':
            if last_entry and last_entry.entry_type == 'time_in':
                return Response({'error': 'Already clocked in. Please clock out first.'}, status=400)
            # Allow time-in (even if last session was today or yesterday)
            # ... create new time-in entry ...

        elif action == 'time-out':
            if not last_entry or last_entry.entry_type != 'time_in':
                # Block if no open session
                return Response({'error': 'No open session to clock out from.'}, status=400)
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
        
        time_entry = TimeEntry.objects.create(
            employee=employee,
            entry_type=entry_type,
            location=location,
            notes=notes,
            ip_address=self.get_client_ip(request),
            device_info=self.get_device_info(request),
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy
        )
        
        # Log the successful attempt
        print(f"[AUDIT] Time {action} for employee {employee_id} at ({latitude}, {longitude}) accuracy={accuracy}m")

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
