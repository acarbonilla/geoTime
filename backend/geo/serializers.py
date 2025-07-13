from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Location, Department, Employee


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