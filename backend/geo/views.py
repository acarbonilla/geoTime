from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView, CreateAPIView, UpdateAPIView, DestroyAPIView
from django.contrib.auth.models import User
from django.db.models import Count, Q
from .models import Location, Department, Employee, TimeEntry
from .serializers import (
    LocationSerializer, LocationListSerializer,
    DepartmentSerializer, DepartmentListSerializer,
    EmployeeSerializer, EmployeeListSerializer,
    UserSerializer, TimeEntrySerializer, TimeEntryListSerializer,
    TimeInOutSerializer, TimeReportSerializer
)


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


class EmployeeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Employee model with full CRUD operations.
    Provides filtering by department, status, and search functionality.
    """
    queryset = Employee.objects.all()
    filterset_fields = ['department', 'employment_status', 'manager', 'hire_date']
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
        employees = self.queryset.filter(employment_status='active')
        serializer = self.get_serializer(employees, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_department(self, request):
        """Get employees grouped by department"""
        department_id = request.query_params.get('department_id')
        if department_id:
            employees = self.queryset.filter(department_id=department_id)
        else:
            employees = self.queryset.all()
        
        serializer = self.get_serializer(employees, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """Get employees by location"""
        location_id = request.query_params.get('location_id')
        if location_id:
            employees = self.queryset.filter(department__location_id=location_id)
        else:
            employees = self.queryset.all()
        
        serializer = self.get_serializer(employees, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def subordinates(self, request, pk=None):
        """Get all subordinates for a specific employee"""
        employee = self.get_object()
        subordinates = employee.subordinates.all()
        serializer = self.get_serializer(subordinates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def profile(self, request, pk=None):
        """Get detailed employee profile"""
        employee = self.get_object()
        serializer = EmployeeSerializer(employee)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get employee statistics"""
        stats = {
            'total_employees': self.queryset.count(),
            'active_employees': self.queryset.filter(employment_status='active').count(),
            'inactive_employees': self.queryset.filter(employment_status='inactive').count(),
            'terminated_employees': self.queryset.filter(employment_status='terminated').count(),
            'on_leave_employees': self.queryset.filter(employment_status='on_leave').count(),
        }
        return Response(stats)


# API Views for specific functionality
class DashboardAPIView(APIView):
    """API View for dashboard statistics"""
    
    def get(self, request):
        """Get overall dashboard statistics"""
        stats = {
            'total_locations': Location.objects.count(),
            'total_departments': Department.objects.count(),
            'total_employees': Employee.objects.count(),
            'active_employees': Employee.objects.filter(employment_status='active').count(),
            'locations_by_country': Location.objects.values('country').annotate(count=Count('id')).order_by('-count')[:5],
            'departments_by_location': Department.objects.values('location__name').annotate(count=Count('id')).order_by('-count')[:5],
        }
        return Response(stats)


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


class TimeEntryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TimeEntry model with full CRUD operations.
    Provides filtering by employee, entry type, and date range.
    """
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
        from datetime import date
        today = date.today()
        entries = self.queryset.filter(timestamp__date=today)
        serializer = self.get_serializer(entries, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_employee(self, request):
        """Get time entries for a specific employee"""
        employee_id = request.query_params.get('employee_id')
        if employee_id:
            entries = self.queryset.filter(employee_id=employee_id)
        else:
            entries = self.queryset.all()
        
        serializer = self.get_serializer(entries, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def current_session(self, request):
        """Get current working session for an employee"""
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response({'error': 'employee_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the latest time in entry for today
        from datetime import date
        today = date.today()
        latest_time_in = self.queryset.filter(
            employee_id=employee_id,
            entry_type='time_in',
            timestamp__date=today
        ).order_by('-timestamp').first()
        
        if not latest_time_in:
            return Response({'status': 'not_clocked_in'})
        
        # Check if there's a time out after the latest time in
        latest_time_out = self.queryset.filter(
            employee_id=employee_id,
            entry_type='time_out',
            timestamp__date=today,
            timestamp__gt=latest_time_in.timestamp
        ).order_by('-timestamp').first()
        
        if latest_time_out:
            return Response({'status': 'clocked_out', 'time_out': latest_time_out.timestamp})
        else:
            return Response({
                'status': 'clocked_in',
                'time_in': latest_time_in.timestamp,
                'session_duration': (timezone.now() - latest_time_in.timestamp).total_seconds() / 3600
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
        
        # Check for duplicate entries (prevent double time-in or time-out)
        from datetime import date
        today = date.today()
        
        if action == 'time-in':
            # Check if already clocked in today
            existing_time_in = TimeEntry.objects.filter(
                employee=employee,
                entry_type='time_in',
                timestamp__date=today
            ).order_by('-timestamp').first()
            
            if existing_time_in:
                # Check if there's no time out after the latest time in
                latest_time_out = TimeEntry.objects.filter(
                    employee=employee,
                    entry_type='time_out',
                    timestamp__date=today,
                    timestamp__gt=existing_time_in.timestamp
                ).order_by('-timestamp').first()
                
                if not latest_time_out:
                    return Response({'error': 'Already clocked in today'}, status=status.HTTP_400_BAD_REQUEST)
        
        elif action == 'time-out':
            # Check if clocked in today
            latest_time_in = TimeEntry.objects.filter(
                employee=employee,
                entry_type='time_in',
                timestamp__date=today
            ).order_by('-timestamp').first()
            
            if not latest_time_in:
                return Response({'error': 'Not clocked in today'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if already clocked out after the latest time in
            latest_time_out = TimeEntry.objects.filter(
                employee=employee,
                entry_type='time_out',
                timestamp__date=today,
                timestamp__gt=latest_time_in.timestamp
            ).order_by('-timestamp').first()
            
            if latest_time_out:
                return Response({'error': 'Already clocked out today'}, status=status.HTTP_400_BAD_REQUEST)
        
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
