from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Location, Department, Employee, TimeEntry, WorkSession, 
    TimeCorrectionRequest, OvertimeRequest, LeaveRequest, ChangeScheduleRequest,
    ScheduleTemplate, EmployeeSchedule, DailyTimeSummary
)


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
    
    def to_representation(self, instance):
        """Custom representation to include formatted address"""
        data = super().to_representation(instance)
        # Create a formatted address from available fields
        address_parts = []
        if instance.address:
            address_parts.append(instance.address)
        if instance.city:
            address_parts.append(instance.city)
        if instance.state:
            address_parts.append(instance.state)
        if instance.country:
            address_parts.append(instance.country)
        
        data['formatted_address'] = ', '.join(address_parts) if address_parts else 'No address available'
        return data


class LocationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'name', 'city', 'country', 'state', 'display_name', 'geofence_radius', 'latitude', 'longitude']


class DepartmentSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    team_leader_names = serializers.SerializerMethodField()
    employee_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_employee_count(self, obj):
        return obj.employees.filter(employment_status='active').count()
    
    def get_team_leader_names(self, obj):
        return [tl.full_name for tl in obj.team_leaders.all()]


class DepartmentListSerializer(serializers.ModelSerializer):
    location = LocationListSerializer(read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    employee_count = serializers.SerializerMethodField()
    team_leader_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'location', 'location_name', 'employee_count', 'is_active', 'team_leader_names']
    
    def get_employee_count(self, obj):
        return obj.employees.filter(employment_status='active').count()
    def get_team_leader_names(self, obj):
        return [tl.full_name for tl in obj.team_leaders.all()]


class EmployeeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    team_leader_names = serializers.SerializerMethodField()
    subordinates_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_subordinates_count(self, obj):
        return obj.get_subordinates().count()
    def get_team_leader_names(self, obj):
        if obj.department:
            return [tl.full_name for tl in obj.department.team_leaders.all()]
        return []


class EmployeeListSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    department = DepartmentListSerializer(read_only=True)
    team_leader_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = [
            'id', 'user_id', 'username', 'first_name', 'last_name', 'email', 'full_name',
            'employee_id', 'department', 'position', 'role', 'hire_date',
            'employment_status', 'phone', 'emergency_contact',
            'daily_work_hours', 'overtime_threshold_hours', 'total_schedule_hours',
            'flexible_break_hours', 'lunch_break_minutes', 'break_threshold_minutes',
            'team_leader_names'
        ]
    def get_team_leader_names(self, obj):
        if obj.department:
            return [tl.full_name for tl in obj.department.team_leaders.all()]
        return []


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
    updated_by = serializers.SerializerMethodField()
    event_time = serializers.DateTimeField(allow_null=True, required=False)
    updated_on = serializers.DateTimeField(read_only=True)

    class Meta:
        model = TimeEntry
        fields = [
            'id', 'employee_pk', 'employee_id', 'user_id', 'username',
            'employee_name', 'department_name', 'location_name',
            'entry_type', 'timestamp', 'event_time', 'updated_on', 'location', 'latitude', 'longitude', 'accuracy', 'notes', 'overtime', 'ip_address', 'formatted_timestamp', 'updated_by'
        ]
        read_only_fields = ['id', 'timestamp', 'ip_address']

    def get_updated_by(self, obj):
        if obj.updated_by:
            return {
                'id': obj.updated_by.id,
                'username': obj.updated_by.username,
            }
        return None


class TimeEntryListSerializer(serializers.ModelSerializer):
    """Simplified serializer for TimeEntry model in lists"""
    updated_by = serializers.SerializerMethodField()
    event_time = serializers.DateTimeField(allow_null=True, required=False)
    updated_on = serializers.DateTimeField(read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    department_name = serializers.CharField(source='employee.department.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    formatted_timestamp = serializers.CharField(read_only=True)
    
    class Meta:
        model = TimeEntry
        fields = [
            'id', 'employee_name', 'employee_id', 'department_name', 'location_name',
            'entry_type', 'timestamp', 'event_time', 'updated_on', 'latitude', 'longitude', 'accuracy', 'formatted_timestamp', 'notes', 'overtime', 'updated_by'
        ]
        read_only_fields = ['id', 'timestamp']
    
    def get_updated_by(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name()
        return None


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
    approver_name = serializers.CharField(source='approver.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)

    class Meta:
        model = TimeCorrectionRequest
        fields = [
            'id', 'employee', 'employee_name', 'date', 'requested_time_in', 'requested_time_out',
            'reason', 'status', 'approver', 'approver_name', 'comments', 'approved_date',
            'submitted_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_name', 'response_message'
        ]
        read_only_fields = ['id', 'submitted_at', 'reviewed_at', 'reviewed_by', 'employee_name', 'approver_name', 'reviewed_by_name', 'approved_date']


class OvertimeRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    approver_name = serializers.CharField(source='approver.get_full_name', read_only=True)

    class Meta:
        model = OvertimeRequest
        fields = [
            'id', 'employee', 'employee_name', 'date', 'start_time', 'end_time',
            'ticket',
            'reason', 'status', 'approver', 'approver_name', 'comments', 'approved_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'employee_name', 'approver_name', 'approved_date'] 


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    approver_name = serializers.CharField(source='approver.get_full_name', read_only=True)
    leave_type_display = serializers.CharField(source='get_leave_type_display', read_only=True)
    duration_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'employee', 'employee_name', 'leave_type', 'leave_type_display',
            'start_date', 'end_date', 'number_days', 'duration_days', 'reason', 'status',
            'approver', 'approver_name', 'comments', 'approved_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'employee_name', 'approver_name', 'leave_type_display', 'duration_days', 'approved_date'] 


class ChangeScheduleRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    approver_name = serializers.CharField(source='approver.get_full_name', read_only=True)

    class Meta:
        model = ChangeScheduleRequest
        fields = [
            'id', 'employee', 'employee_name',
            'original_date', 'original_start_time', 'original_end_time',
            'requested_date', 'requested_start_time', 'requested_end_time',
            'reason', 'status', 'approver', 'approver_name', 'comments', 'approved_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'employee_name', 'approver_name', 'approved_date'] 


class ScheduleTemplateSerializer(serializers.ModelSerializer):
    formatted_time = serializers.CharField(read_only=True)
    duration_hours = serializers.DecimalField(max_digits=4, decimal_places=2, read_only=True)
    created_by_name = serializers.CharField(source='created_by.user.get_full_name', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)

    class Meta:
        model = ScheduleTemplate
        fields = [
            'id', 'name', 'time_in', 'time_out', 'is_night_shift', 
            'template_type', 'created_by', 'team', 'is_active', 
            'created_at', 'updated_at', 'formatted_time', 'duration_hours',
            'created_by_name', 'team_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']

    def create(self, validated_data):
        # Set the created_by to the current user
        validated_data['created_by'] = self.context['request'].user.employee_profile
        return super().create(validated_data)
    
    def validate(self, data):
        # Ensure created_by is not in the data since we set it automatically
        if 'created_by' in data:
            data.pop('created_by')
        return data


class EmployeeScheduleSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    template_name = serializers.CharField(source='template_used.name', read_only=True)
    formatted_time = serializers.CharField(read_only=True)
    duration_hours = serializers.DecimalField(max_digits=4, decimal_places=2, read_only=True)

    class Meta:
        model = EmployeeSchedule
        fields = [
            'id', 'employee', 'date', 'scheduled_time_in', 'scheduled_time_out',
            'is_night_shift', 'template_used', 'notes', 'created_at', 'updated_at',
            'employee_name', 'template_name', 'formatted_time', 'duration_hours'
        ]
        read_only_fields = ['created_at', 'updated_at', 'employee']  # Make employee read-only to prevent modification

    def validate(self, data):
        # Get the request and user
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            raise serializers.ValidationError("Request context not available.")
        
        user = request.user
        
        # Add debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Serializer validation - User: {user.username}")
        logger.info(f"Data to validate: {data}")
        logger.info(f"User is staff: {user.is_staff}")
        logger.info(f"User has employee profile: {hasattr(user, 'employee_profile')}")
        if hasattr(user, 'employee_profile'):
            logger.info(f"User role: {user.employee_profile.role}")
        
        # Staff users can manage any schedules
        if user.is_staff:
            return data
        
        # Check if user has employee profile
        if not hasattr(user, 'employee_profile'):
            raise serializers.ValidationError("Employee profile not found.")
        
        employee = user.employee_profile
        
        # Team leaders can manage their own schedules and team members' schedules
        if employee.role == 'team_leader':
            # For team leaders, we don't need to validate employee field changes
            # since it's read-only and they can manage team member schedules
            return data
        
        # Regular employees can only manage their own schedules
        # Since employee field is now read-only, we don't need to set it during updates
        # The backend will preserve the existing employee field
        if employee.role == 'employee':
            logger.info(f"Employee user updating schedule - employee field will be preserved")
        
        return data

    def create(self, validated_data):
        """Override create to automatically set the employee field"""
        request = self.context.get('request')
        if request and hasattr(request.user, 'employee_profile'):
            # For regular employees, ensure they can only create their own schedules
            if request.user.employee_profile.role == 'employee':
                validated_data['employee'] = request.user.employee_profile
        
        return super().create(validated_data)


class DailyTimeSummarySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    time_in_formatted = serializers.CharField(source='time_in', read_only=True)
    time_out_formatted = serializers.CharField(source='time_out', read_only=True)
    scheduled_time_in_formatted = serializers.CharField(source='scheduled_time_in', read_only=True)
    scheduled_time_out_formatted = serializers.CharField(source='scheduled_time_out', read_only=True)

    class Meta:
        model = DailyTimeSummary
        fields = [
            'id', 'employee', 'date', 'time_in', 'time_out', 'scheduled_time_in', 'scheduled_time_out',
            'status', 'billed_hours', 'late_minutes', 'undertime_minutes', 'night_differential_hours',
            'overtime_hours', 'total_break_minutes', 'lunch_break_minutes', 'time_in_entry', 'time_out_entry',
            'schedule_reference', 'is_weekend', 'is_holiday', 'notes', 'calculated_at', 'updated_at',
            'employee_name', 'time_in_formatted', 'time_out_formatted', 
            'scheduled_time_in_formatted', 'scheduled_time_out_formatted'
        ]
        read_only_fields = ['calculated_at', 'updated_at']


# Bulk Schedule Creation Serializer
class BulkScheduleSerializer(serializers.Serializer):
    template_id = serializers.IntegerField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    weekdays_only = serializers.BooleanField(default=False)
    flip_am_pm = serializers.BooleanField(default=False)
    overwrite_existing = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    employee = serializers.IntegerField(required=False, help_text="Database ID of the employee to create schedules for")

class CheckExistingSchedulesSerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    weekdays_only = serializers.BooleanField(default=False)
    employee = serializers.IntegerField(required=False, help_text="Database ID of the employee to check schedules for")

    def validate(self, data):
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("Start date must be before end date.")
        return data


# Copy Previous Month Serializer
class CopyPreviousMonthSerializer(serializers.Serializer):
    target_month = serializers.IntegerField(min_value=1, max_value=12)
    target_year = serializers.IntegerField()
    flip_am_pm = serializers.BooleanField(default=False)


# Schedule Report Serializer
class ScheduleReportSerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    employee_id = serializers.IntegerField(required=False)

    def validate(self, data):
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("Start date must be before end date.")
        return data 