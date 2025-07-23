from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .models import Location, Department, Employee, TimeEntry, WorkSession, OvertimeRequest


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'country', 'state', 'geofence_radius', 'min_accuracy_meters', 'timezone_name', 'created_at')
    list_filter = ('country', 'state', 'timezone_name', 'created_at')
    search_fields = ('name', 'city', 'country', 'state', 'display_name')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'display_name', 'city', 'state', 'country')
        }),
        ('Coordinates', {
            'fields': ('latitude', 'longitude', 'geofence_radius', 'min_accuracy_meters')
        }),
        ('Timezone', {
            'fields': ('timezone_name', 'timezone_offset')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'location', 'manager', 'employee_count', 'is_active', 'created_at')
    list_filter = ('is_active', 'location', 'created_at')
    search_fields = ('name', 'code', 'description')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'description', 'is_active')
        }),
        ('Organization', {
            'fields': ('location', 'manager')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def employee_count(self, obj):
        return obj.employees.filter(employment_status='active').count()
    employee_count.short_description = 'Active Employees'


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'employee_id', 'department', 'role', 'position', 'employment_status', 'hire_date')
    list_filter = ('role', 'employment_status', 'department', 'hire_date', 'created_at')
    search_fields = ('user__first_name', 'user__last_name', 'user__email', 'employee_id', 'position')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'employee_id', 'position')
        }),
        ('Organization', {
            'fields': ('department', 'role', 'manager')
        }),
        ('Employment Details', {
            'fields': ('hire_date', 'employment_status', 'phone', 'emergency_contact')
        }),
        ('Overtime Configuration', {
            'fields': ('daily_work_hours', 'overtime_threshold_hours', 'total_schedule_hours', 'flexible_break_hours', 'lunch_break_minutes', 'break_threshold_minutes'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def full_name(self, obj):
        return obj.user.get_full_name()
    full_name.short_description = 'Full Name'


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ('employee_name', 'entry_type', 'timestamp', 'location', 'ip_address')
    list_filter = ('entry_type', 'timestamp', 'location', 'employee__department', 'employee__role')
    search_fields = ('employee__user__first_name', 'employee__user__last_name', 'employee__employee_id', 'notes')
    readonly_fields = ('timestamp', 'ip_address', 'device_info')
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Employee Information', {
            'fields': ('employee',)
        }),
        ('Time Entry Details', {
            'fields': ('entry_type', 'timestamp', 'location')
        }),
        ('Additional Information', {
            'fields': ('notes', 'ip_address', 'device_info'),
            'classes': ('collapse',)
        }),
    )
    
    def employee_name(self, obj):
        return obj.employee.full_name
    employee_name.short_description = 'Employee'


@admin.register(WorkSession)
class WorkSessionAdmin(admin.ModelAdmin):
    list_display = ('employee_name', 'session_type', 'start_time', 'end_time', 'duration_formatted', 'is_overtime', 'is_break')
    list_filter = ('session_type', 'is_overtime', 'is_break', 'start_time', 'employee__department')
    search_fields = ('employee__user__first_name', 'employee__user__last_name', 'employee__employee_id', 'notes')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'start_time'
    
    fieldsets = (
        ('Employee Information', {
            'fields': ('employee',)
        }),
        ('Session Details', {
            'fields': ('session_type', 'start_time', 'end_time', 'duration_hours')
        }),
        ('Classification', {
            'fields': ('is_overtime', 'is_break')
        }),
        ('Time Entries', {
            'fields': ('time_in_entry', 'time_out_entry'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('notes', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def employee_name(self, obj):
        return obj.employee.full_name
    employee_name.short_description = 'Employee'
    
    def duration_formatted(self, obj):
        if obj.duration_hours:
            hours = int(obj.duration_hours)
            minutes = int((obj.duration_hours - hours) * 60)
            return f'{hours}h {minutes}m'
        return 'N/A'
    duration_formatted.short_description = 'Duration'


@admin.register(OvertimeRequest)
class OvertimeRequestAdmin(admin.ModelAdmin):
    list_display = ('employee_name', 'date', 'start_time', 'end_time', 'status', 'approver_name', 'created_at')
    list_filter = ('status', 'date', 'approver')
    search_fields = ('employee__user__first_name', 'employee__user__last_name', 'employee__employee_id', 'reason')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Overtime Details', {
            'fields': ('employee', 'date', 'start_time', 'end_time', 'reason', 'status', 'approver', 'comments')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def employee_name(self, obj):
        return obj.employee.full_name
    employee_name.short_description = 'Employee'

    def approver_name(self, obj):
        return obj.approver.get_full_name() if obj.approver else ''
    approver_name.short_description = 'Approver'
