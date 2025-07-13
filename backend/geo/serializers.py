from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Location, Department, Employee, TimeEntry


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']
        read_only_fields = ['id']


class LocationSerializer(serializers.ModelSerializer):
    """Serializer for Location model"""
    class Meta:
        model = Location
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model"""
    location = LocationSerializer(read_only=True)
    location_id = serializers.IntegerField(write_only=True)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True)
    
    class Meta:
        model = Department
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class EmployeeSerializer(serializers.ModelSerializer):
    """Serializer for Employee model"""
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.IntegerField(write_only=True)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True)
    manager_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    full_name = serializers.CharField(read_only=True)
    email = serializers.CharField(read_only=True)
    
    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class EmployeeListSerializer(serializers.ModelSerializer):
    """Simplified serializer for Employee list views"""
    user = UserSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    location_name = serializers.CharField(source='department.location.name', read_only=True)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True)
    
    class Meta:
        model = Employee
        fields = [
            'id', 'employee_id', 'user', 'department_name', 'location_name',
            'position', 'employment_status', 'hire_date', 'manager_name',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class DepartmentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for Department list views"""
    location_name = serializers.CharField(source='location.name', read_only=True)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True)
    employee_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'location_name', 'manager_name',
            'employee_count', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_employee_count(self, obj):
        return obj.employees.count()


class LocationListSerializer(serializers.ModelSerializer):
    """Simplified serializer for Location list views"""
    department_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Location
        fields = [
            'id', 'name', 'city', 'country', 'timezone_name',
            'coordinates', 'department_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_department_count(self, obj):
        return obj.departments.count()


class TimeEntrySerializer(serializers.ModelSerializer):
    """Serializer for TimeEntry model"""
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    department_name = serializers.CharField(source='employee.department.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    formatted_timestamp = serializers.CharField(read_only=True)
    
    class Meta:
        model = TimeEntry
        fields = '__all__'
        read_only_fields = ['id', 'timestamp', 'ip_address', 'device_info']


class TimeEntryListSerializer(serializers.ModelSerializer):
    """Simplified serializer for TimeEntry list views"""
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    department_name = serializers.CharField(source='employee.department.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    
    class Meta:
        model = TimeEntry
        fields = [
            'id', 'employee_name', 'employee_id', 'department_name', 'entry_type',
            'timestamp', 'location_name', 'notes', 'ip_address'
        ]
        read_only_fields = ['id', 'timestamp', 'ip_address']


class TimeInOutSerializer(serializers.ModelSerializer):
    """Serializer for time in/out operations"""
    employee_id = serializers.IntegerField(write_only=True)
    location_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    latitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    longitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = TimeEntry
        fields = ['employee_id', 'location_id', 'latitude', 'longitude', 'notes', 'entry_type']
        read_only_fields = ['entry_type']


class TimeReportSerializer(serializers.Serializer):
    """Serializer for time reports"""
    employee_id = serializers.IntegerField()
    employee_name = serializers.CharField()
    total_hours = serializers.FloatField()
    total_days = serializers.IntegerField()
    average_hours_per_day = serializers.FloatField()
    time_entries = TimeEntryListSerializer(many=True) 