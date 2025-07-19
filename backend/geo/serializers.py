from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Location, Department, Employee, TimeEntry, WorkSession, TimeCorrectionRequest


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class LocationSerializer(serializers.ModelSerializer):
    """Serializer for Location model"""
    class Meta:
        model = Location
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class LocationListSerializer(serializers.ModelSerializer):
    """Simplified serializer for Location model in lists"""
    class Meta:
        model = Location
        fields = ['id', 'name', 'city', 'country', 'state', 'display_name', 'geofence_radius']


class DepartmentSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True)
    employee_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_employee_count(self, obj):
        return obj.employees.filter(employment_status='active').count()


class DepartmentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for Department model in lists"""
    location = LocationListSerializer(read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    employee_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'location', 'location_name', 'employee_count', 'is_active']
    
    def get_employee_count(self, obj):
        return obj.employees.filter(employment_status='active').count()


class EmployeeSerializer(serializers.ModelSerializer):
    """Serializer for Employee model"""
    user = UserSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True)
    subordinates_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_subordinates_count(self, obj):
        return obj.get_subordinates().count()


class EmployeeListSerializer(serializers.ModelSerializer):
    """Simplified serializer for Employee model in lists"""
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    department = DepartmentListSerializer(read_only=True)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True)
    
    class Meta:
        model = Employee
        fields = [
            'id', 'user_id', 'username', 'first_name', 'last_name', 'email', 'full_name',
            'employee_id', 'department', 'position', 'role', 'hire_date',
            'employment_status', 'manager_name', 'phone', 'emergency_contact',
            'daily_work_hours', 'overtime_threshold_hours', 'total_schedule_hours',
            'flexible_break_hours', 'lunch_break_minutes', 'break_threshold_minutes'
        ]


class TimeEntrySerializer(serializers.ModelSerializer):
    """Serializer for TimeEntry model"""
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_pk = serializers.IntegerField(source='employee.id', read_only=True)
    user_id = serializers.IntegerField(source='employee.user.id', read_only=True)
    username = serializers.CharField(source='employee.user.username', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    department_name = serializers.CharField(source='employee.department.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    formatted_timestamp = serializers.CharField(read_only=True)
    
    class Meta:
        model = TimeEntry
        fields = [
            'id', 'employee_pk', 'employee_id', 'user_id', 'username',
            'employee_name', 'department_name', 'location_name',
            'entry_type', 'timestamp', 'location', 'latitude', 'longitude', 'accuracy', 'notes', 'ip_address', 'formatted_timestamp'
        ]
        read_only_fields = ['id', 'timestamp', 'ip_address']


class TimeEntryListSerializer(serializers.ModelSerializer):
    """Simplified serializer for TimeEntry model in lists"""
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    department_name = serializers.CharField(source='employee.department.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    formatted_timestamp = serializers.CharField(read_only=True)
    
    class Meta:
        model = TimeEntry
        fields = [
            'id', 'employee_name', 'employee_id', 'department_name', 'location_name',
            'entry_type', 'timestamp', 'latitude', 'longitude', 'accuracy', 'formatted_timestamp', 'notes'
        ]
        read_only_fields = ['id', 'timestamp']


class TimeInOutSerializer(serializers.ModelSerializer):
    """Serializer for time in/out operations"""
    employee_id = serializers.IntegerField(write_only=True)
    location_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    latitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    longitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    accuracy = serializers.FloatField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = TimeEntry
        fields = ['employee_id', 'location_id', 'latitude', 'longitude', 'accuracy', 'notes', 'entry_type']
        read_only_fields = ['entry_type']


class WorkSessionSerializer(serializers.ModelSerializer):
    """Serializer for WorkSession model"""
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    session_type_display = serializers.CharField(source='get_session_type_display', read_only=True)
    duration_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkSession
        fields = [
            'id', 'employee_name', 'employee_id', 'session_type', 'session_type_display',
            'start_time', 'end_time', 'duration_hours', 'duration_formatted',
            'is_overtime', 'is_break', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_duration_formatted(self, obj):
        """Format duration as hours and minutes"""
        if not obj.duration_hours:
            return '0h 0m'
        
        hours = int(obj.duration_hours)
        minutes = int((obj.duration_hours - hours) * 60)
        return f'{hours}h {minutes}m'


class OvertimeAnalysisSerializer(serializers.Serializer):
    """Serializer for overtime analysis results"""
    date = serializers.DateField()
    total_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    actual_work_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    regular_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    overtime_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    break_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    lunch_break_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    flexible_break_hours = serializers.DecimalField(max_digits=4, decimal_places=2)
    flexible_break_used = serializers.DecimalField(max_digits=4, decimal_places=2)
    is_overtime = serializers.BooleanField()
    overtime_threshold_reached = serializers.BooleanField()
    overtime_threshold = serializers.DecimalField(max_digits=4, decimal_places=2)
    total_schedule_hours = serializers.DecimalField(max_digits=4, decimal_places=2)
    daily_work_hours = serializers.DecimalField(max_digits=4, decimal_places=2)
    sessions = serializers.ListField()
    breaks = serializers.ListField()


class CurrentSessionStatusSerializer(serializers.Serializer):
    """Serializer for current session status with overtime alerts"""
    today_analysis = OvertimeAnalysisSerializer()
    active_session = serializers.DictField(allow_null=True)
    overtime_threshold = serializers.DecimalField(max_digits=4, decimal_places=2)
    daily_work_hours = serializers.DecimalField(max_digits=4, decimal_places=2)
    total_schedule_hours = serializers.DecimalField(max_digits=4, decimal_places=2)
    flexible_break_hours = serializers.DecimalField(max_digits=4, decimal_places=2) 


class TimeCorrectionRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)

    class Meta:
        model = TimeCorrectionRequest
        fields = [
            'id', 'employee', 'employee_name', 'date', 'requested_time_in', 'requested_time_out',
            'reason', 'status', 'submitted_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_name', 'response_message'
        ]
        read_only_fields = ['id', 'submitted_at', 'reviewed_at', 'reviewed_by', 'employee_name', 'reviewed_by_name'] 