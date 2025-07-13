from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView, CreateAPIView, UpdateAPIView, DestroyAPIView
from django.contrib.auth.models import User
from django.db.models import Count, Q
from .models import Location, Department, Employee
from .serializers import (
    LocationSerializer, LocationListSerializer,
    DepartmentSerializer, DepartmentListSerializer,
    EmployeeSerializer, EmployeeListSerializer,
    UserSerializer
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
