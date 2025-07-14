from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView, CreateAPIView, UpdateAPIView, DestroyAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.db.models import Count, Q
from .models import Location, Department, Employee, TimeEntry
from .serializers import (
    LocationSerializer, LocationListSerializer,
    DepartmentSerializer, DepartmentListSerializer,
    EmployeeSerializer, EmployeeListSerializer,
    UserSerializer, TimeEntrySerializer, TimeEntryListSerializer,
    TimeInOutSerializer, TimeReportSerializer
)
from django.utils import timezone


class RoleBasedPermissionMixin:
    """Mixin to add role-based permissions to views"""
    
    def get_queryset(self):
        """Filter queryset based on user's role"""
        user = self.request.user
        if not hasattr(user, 'employee_profile'):
            return self.model.objects.none()
        
        employee = user.employee_profile
        
        if employee.can_view_company_data():
            # Management and IT Support can view all data
            return super().get_queryset()
        elif employee.can_view_department_data():
            # Supervisor can view department data
            return super().get_queryset().filter(department=employee.department)
        elif employee.can_view_team_data():
            # Team Leader can view team data
            team_members = employee.get_team_members()
            return super().get_queryset().filter(id__in=team_members.values_list('id', flat=True))
        else:
            # Employee can only view their own data
            return super().get_queryset().filter(employee=employee)


class LoginAPIView(APIView):
    """API View for user login"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Handle user login"""
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({
                'error': 'Username and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Authenticate user
        user = authenticate(username=username, password=password)
        
        if user is not None:
            # Login user (creates session)
            login(request, user)
            
            # Get employee info if exists
            try:
                employee = user.employee_profile
                employee_data = {
                    'id': employee.id,
                    'employee_id': employee.employee_id,
                    'position': employee.position,
                    'role': employee.role,
                    'role_display': employee.role_display,
                    'department': employee.department.name,
                    'location': employee.department.location.name,
                    'can_view_team_data': employee.can_view_team_data(),
                    'can_view_department_data': employee.can_view_department_data(),
                    'can_view_company_data': employee.can_view_company_data(),
                    'can_manage_users': employee.can_manage_users(),
                }
            except Employee.DoesNotExist:
                employee_data = None
            
            return Response({
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'is_staff': user.is_staff
                },
                'employee': employee_data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Invalid username or password'
            }, status=status.HTTP_401_UNAUTHORIZED)


class LogoutAPIView(APIView):
    """API View for user logout"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Handle user logout"""
        logout(request)
        return Response({
            'message': 'Logout successful'
        }, status=status.HTTP_200_OK)


class UserProfileAPIView(APIView):
    """API View for getting current user profile"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current user profile"""
        user = request.user
        
        try:
            employee = user.employee_profile
            employee_data = {
                'id': employee.id,
                'employee_id': employee.employee_id,
                'position': employee.position,
                'department': employee.department.name,
                'location': employee.department.location.name,
                'hire_date': employee.hire_date,
                'employment_status': employee.employment_status
            }
        except Employee.DoesNotExist:
            employee_data = None
        
        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'is_staff': user.is_staff
            },
            'employee': employee_data
        }, status=status.HTTP_200_OK)


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
        """Get all departments for a specific location"""
        location = self.get_object()
        departments = location.departments.all()
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
        departments = self.queryset.filter(is_active=True)
        serializer = self.get_serializer(departments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        """Get all employees for a specific department"""
        department = self.get_object()
        employees = department.employees.all()
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get department statistics"""
        department = self.get_object()
        stats = {
            'total_employees': department.employees.count(),
            'active_employees': department.employees.filter(employment_status='active').count(),
            'location_name': department.location.name if department.location else None,
            'manager_name': department.manager.full_name if department.manager else None,
        }
        return Response(stats)


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
        employees = self.get_queryset().filter(employment_status='active')
        serializer = self.get_serializer(employees, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_department(self, request):
        """Get employees grouped by department"""
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        employee = user.employee_profile
        queryset = self.get_queryset()
        
        departments = Department.objects.filter(employees__in=queryset).distinct()
        result = []
        
        for dept in departments:
            dept_employees = queryset.filter(department=dept)
            result.append({
                'department': dept.name,
                'employee_count': dept_employees.count(),
                'employees': EmployeeListSerializer(dept_employees, many=True).data
            })
        
        return Response(result)

    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """Get employees grouped by location"""
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        employee = user.employee_profile
        queryset = self.get_queryset()
        
        locations = Location.objects.filter(departments__employees__in=queryset).distinct()
        result = []
        
        for location in locations:
            location_employees = queryset.filter(department__location=location)
            result.append({
                'location': location.name,
                'employee_count': location_employees.count(),
                'employees': EmployeeListSerializer(location_employees, many=True).data
            })
        
        return Response(result)

    @action(detail=True, methods=['get'])
    def subordinates(self, request, pk=None):
        """Get all subordinates for a specific employee"""
        employee = self.get_object()
        if not employee.can_view_team_data():
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        subordinates = employee.get_subordinates()
        serializer = EmployeeListSerializer(subordinates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def profile(self, request, pk=None):
        """Get detailed profile of an employee"""
        employee = self.get_object()
        serializer = EmployeeSerializer(employee)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get employee statistics based on user role"""
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        employee = user.employee_profile
        queryset = self.get_queryset()
        
        stats = {
            'total_employees': queryset.count(),
            'active_employees': queryset.filter(employment_status='active').count(),
            'by_role': queryset.values('role').annotate(count=Count('id')),
            'by_department': queryset.values('department__name').annotate(count=Count('id')),
        }
        
        if employee.can_view_company_data():
            stats.update({
                'by_location': queryset.values('department__location__name').annotate(count=Count('id')),
                'recent_hires': queryset.filter(hire_date__gte=timezone.now().date() - timezone.timedelta(days=30)).count(),
            })
        
        return Response(stats)


# API Views for specific functionality
class DashboardAPIView(APIView):
    """API View for dashboard data based on user role"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get dashboard data based on user's role"""
        user = request.user
        try:
            employee = user.employee_profile
        except Employee.DoesNotExist:
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Base dashboard data
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
                'position': employee.position,
                'role': employee.role,
                'role_display': employee.role_display,
                'department': employee.department.name,
                'location': employee.department.location.name,
            },
            'permissions': {
                'can_view_team_data': employee.can_view_team_data(),
                'can_view_department_data': employee.can_view_department_data(),
                'can_view_company_data': employee.can_view_company_data(),
                'can_manage_users': employee.can_manage_users(),
            }
        }
        
        # Role-specific data
        if employee.role == 'employee':
            dashboard_data.update(self._get_employee_dashboard(employee))
        elif employee.role == 'team_leader':
            dashboard_data.update(self._get_team_leader_dashboard(employee))
        elif employee.role == 'supervisor':
            dashboard_data.update(self._get_supervisor_dashboard(employee))
        elif employee.role == 'management':
            dashboard_data.update(self._get_management_dashboard(employee))
        elif employee.role == 'it_support':
            dashboard_data.update(self._get_it_support_dashboard(employee))
        
        return Response(dashboard_data)
    
    def _get_employee_dashboard(self, employee):
        """Get dashboard data for regular employees"""
        today_entries = TimeEntry.objects.filter(
            employee=employee,
            timestamp__date=timezone.now().date()
        ).order_by('timestamp')
        
        return {
            'dashboard_type': 'employee',
            'today_entries': TimeEntryListSerializer(today_entries, many=True).data,
            'current_status': self._get_current_status(employee),
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
        employees = Employee.objects.filter(department=department)
        return {
            'total_employees': employees.count(),
            'active_employees': employees.filter(employment_status='active').count(),
            'departments': Department.objects.count(),
        }
    
    def _get_company_stats(self):
        """Get company-wide statistics"""
        return {
            'total_employees': Employee.objects.count(),
            'active_employees': Employee.objects.filter(employment_status='active').count(),
            'total_departments': Department.objects.count(),
            'total_locations': Location.objects.count(),
        }
    
    def _get_system_stats(self):
        """Get system statistics for IT support"""
        return {
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'total_time_entries': TimeEntry.objects.count(),
            'today_entries': TimeEntry.objects.filter(timestamp__date=timezone.now().date()).count(),
        }


class SearchAPIView(APIView):
    """API View for global search functionality"""
    
    def get(self, request):
        """Search across all models"""
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': 'Query parameter "q" is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        results = {
            'locations': [],
            'departments': [],
            'employees': []
        }
        
        # Search locations
        locations = Location.objects.filter(
            Q(name__icontains=query) | 
            Q(city__icontains=query) | 
            Q(country__icontains=query)
        )[:10]
        results['locations'] = LocationListSerializer(locations, many=True).data
        
        # Search departments
        departments = Department.objects.filter(
            Q(name__icontains=query) | 
            Q(code__icontains=query) |
            Q(description__icontains=query)
        )[:10]
        results['departments'] = DepartmentListSerializer(departments, many=True).data
        
        # Search employees
        employees = Employee.objects.filter(
            Q(user__first_name__icontains=query) | 
            Q(user__last_name__icontains=query) |
            Q(user__email__icontains=query) |
            Q(employee_id__icontains=query) |
            Q(position__icontains=query)
        )[:10]
        results['employees'] = EmployeeListSerializer(employees, many=True).data
        
        return Response(results)


class EmployeeHierarchyAPIView(APIView):
    """API View for employee hierarchy visualization"""
    
    def get(self, request):
        """Get employee hierarchy data"""
        employees = Employee.objects.select_related('user', 'department', 'manager').all()
        
        hierarchy = []
        for employee in employees:
            if not employee.manager:  # Top level employees
                hierarchy.append({
                    'id': employee.id,
                    'name': employee.full_name,
                    'position': employee.position,
                    'department': employee.department.name if employee.department else None,
                    'subordinates': self._get_subordinates(employee.id, employees)
                })
        
        return Response(hierarchy)
    
    def _get_subordinates(self, manager_id, all_employees):
        """Recursively get subordinates for a manager"""
        subordinates = []
        for employee in all_employees:
            if employee.manager and employee.manager.id == manager_id:
                subordinates.append({
                    'id': employee.id,
                    'name': employee.full_name,
                    'position': employee.position,
                    'department': employee.department.name if employee.department else None,
                    'subordinates': self._get_subordinates(employee.id, all_employees)
                })
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

    def get_serializer_class(self):
        if self.action == 'list':
            return TimeEntryListSerializer
        return TimeEntrySerializer

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's time entries"""
        # Use UTC for date filtering to match stored timestamps
        from datetime import datetime
        
        # Get current time in UTC
        utc_now = timezone.now()
        today_start = utc_now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timezone.timedelta(days=1)
        
        today_entries = self.get_queryset().filter(
            timestamp__gte=today_start,
            timestamp__lt=today_end
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
        # Use UTC for date filtering to match stored timestamps
        
        # Get current time in UTC
        utc_now = timezone.now()
        today_start = utc_now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timezone.timedelta(days=1)
        
        today_entries = self.get_queryset().filter(
            employee=employee,
            timestamp__gte=today_start,
            timestamp__lt=today_end
        ).order_by('timestamp')
        
        if not today_entries.exists():
            return Response({
                'status': 'not_started',
                'message': 'No time entries for today'
            })
        
        last_entry = today_entries.last()
        session_data = {
            'status': 'clocked_in' if last_entry.entry_type == 'time_in' else 'clocked_out',
            'last_entry': TimeEntryListSerializer(last_entry).data,
            'today_entries': TimeEntryListSerializer(today_entries, many=True).data,
        }
        
        # Calculate total hours if clocked out
        if last_entry.entry_type == 'time_out':
            time_in_entries = today_entries.filter(entry_type='time_in')
            time_out_entries = today_entries.filter(entry_type='time_out')
            
            total_hours = 0
            for i, time_in in enumerate(time_in_entries):
                if i < len(time_out_entries):
                    time_out = time_out_entries[i]
                    duration = time_out.timestamp - time_in.timestamp
                    total_hours += duration.total_seconds() / 3600
            
            session_data['total_hours'] = round(total_hours, 2)
        
        return Response(session_data)


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
    
    def validate_geofence(self, employee_id, latitude, longitude, location_id=None):
        """
        Validate if employee is within the allowed geofence.
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
                'message': f'Outside geofence. Distance: {distance:.1f}m, Allowed: {allowed_radius}m',
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
        
        # Geofencing validation
        geofence_result = self.validate_geofence(employee_id, latitude, longitude, location_id)
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
        
        time_entry = TimeEntry.objects.create(
            employee=employee,
            entry_type=entry_type,
            location=location,
            notes=notes,
            ip_address=self.get_client_ip(request),
            device_info=self.get_device_info(request)
        )
        
        response_data = {
            'message': f'Successfully {action.replace("-", " ")}',
            'time_entry': TimeEntrySerializer(time_entry).data
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
        
        if not all([employee_id, latitude, longitude]):
            return Response({
                'error': 'employee_id, latitude, and longitude are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Use the same validation logic as TimeInOutAPIView
        time_in_out_view = TimeInOutAPIView()
        validation_result = time_in_out_view.validate_geofence(employee_id, latitude, longitude, location_id)
        
        return Response(validation_result)


class TimeReportAPIView(APIView):
    """API View for time reports"""
    
    def get(self, request):
        """Get time reports for employees"""
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
        
        # Get time entries for the date range
        time_entries = TimeEntry.objects.filter(
            employee=employee,
            timestamp__date__range=[start_date, end_date]
        ).order_by('timestamp')
        
        # Calculate hours worked
        total_hours = 0
        current_time_in = None
        
        for entry in time_entries:
            if entry.entry_type == 'time_in':
                current_time_in = entry.timestamp
            elif entry.entry_type == 'time_out' and current_time_in:
                duration = entry.timestamp - current_time_in
                total_hours += duration.total_seconds() / 3600
                current_time_in = None
        
        # Calculate days worked
        days_worked = time_entries.filter(entry_type='time_in').values('timestamp__date').distinct().count()
        
        # Calculate average hours per day
        average_hours = total_hours / days_worked if days_worked > 0 else 0
        
        report_data = {
            'employee_id': employee.id,
            'employee_name': employee.full_name,
            'total_hours': round(total_hours, 2),
            'total_days': days_worked,
            'average_hours_per_day': round(average_hours, 2),
            'time_entries': TimeEntryListSerializer(time_entries, many=True).data
        }
        
        return Response(report_data)
