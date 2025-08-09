from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .models import Location, Department, Employee, TimeEntry, WorkSession, OvertimeRequest, ScheduleTemplate, EmployeeSchedule, DailyTimeSummary


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
    list_display = ('name', 'code', 'location', 'team_leaders_display', 'is_active', 'created_at')
    list_filter = ('is_active', 'location', 'created_at')
    search_fields = ('name', 'code', 'description')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'description', 'is_active')
        }),
        ('Organization', {
            'fields': ('location', 'team_leaders')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def team_leaders_display(self, obj):
        return ", ".join([str(tl) for tl in obj.team_leaders.all()])
    team_leaders_display.short_description = 'Team Leaders'

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
            'fields': ('department', 'role')
        }),
        ('Employment Details', {
            'fields': ('hire_date', 'employment_status', 'phone', 'emergency_contact')
        }),
        ('Overtime Configuration', {
            'fields': ('daily_work_hours', 'overtime_threshold_hours', 'total_schedule_hours', 'flexible_break_hours', 'lunch_break_minutes', 'break_threshold_minutes', 'grace_period_minutes', 'early_login_restriction_hours', 'require_schedule_compliance'),
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
    list_display = ('id', 'employee', 'entry_type', 'timestamp', 'location', 'updated_by')
    list_filter = ('entry_type', 'employee', 'location', 'updated_by')
    search_fields = ('employee__user__username', 'employee__employee_id', 'notes', 'updated_by__username')
    readonly_fields = ('timestamp',)
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


@admin.register(ScheduleTemplate)
class ScheduleTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'template_type', 'time_in', 'time_out', 'is_night_shift', 'created_by', 'team', 'is_active', 'created_at')
    list_filter = ('template_type', 'is_night_shift', 'is_active', 'team', 'created_at')
    search_fields = ('name', 'created_by__user__first_name', 'created_by__user__last_name', 'created_by__employee_id')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Template Information', {
            'fields': ('name', 'template_type', 'is_active')
        }),
        ('Schedule Times', {
            'fields': ('time_in', 'time_out', 'is_night_shift')
        }),
        ('Organization', {
            'fields': ('created_by', 'team')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('created_by__user', 'team')


@admin.register(EmployeeSchedule)
class EmployeeScheduleAdmin(admin.ModelAdmin):
    list_display = ('employee_name', 'date', 'scheduled_time_in', 'scheduled_time_out', 'is_night_shift', 'notes', 'created_at')
    list_filter = ('date', 'is_night_shift', 'employee__department', 'created_at')
    search_fields = ('employee__user__first_name', 'employee__user__last_name', 'employee__employee_id', 'notes')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'date'
    fieldsets = (
        ('Employee Information', {
            'fields': ('employee',)
        }),
        ('Schedule Details', {
            'fields': ('date', 'scheduled_time_in', 'scheduled_time_out', 'is_night_shift')
        }),
        ('Additional Information', {
            'fields': ('notes', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def employee_name(self, obj):
        return obj.employee.full_name
    employee_name.short_description = 'Employee'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('employee__user', 'employee__department')


@admin.register(DailyTimeSummary)
class DailyTimeSummaryAdmin(admin.ModelAdmin):
    list_display = ('employee_name', 'date', 'status', 'time_in', 'time_out', 'scheduled_time_in', 'scheduled_time_out', 'billed_hours', 'late_minutes', 'undertime_minutes', 'night_differential_hours', 'overtime_hours')
    list_filter = ('status', 'date', 'is_weekend', 'is_holiday', 'employee__department', 'calculated_at')
    search_fields = ('employee__user__first_name', 'employee__user__last_name', 'employee__employee_id', 'notes')
    readonly_fields = ('calculated_at', 'updated_at')
    date_hierarchy = 'date'
    ordering = ('-date', 'employee__user__first_name')
    
    fieldsets = (
        ('Employee Information', {
            'fields': ('employee', 'date')
        }),
        ('Time Data', {
            'fields': ('time_in', 'time_out', 'scheduled_time_in', 'scheduled_time_out')
        }),
        ('Calculated Metrics', {
            'fields': ('status', 'billed_hours', 'late_minutes', 'undertime_minutes', 'night_differential_hours', 'overtime_hours')
        }),
        ('Break Tracking', {
            'fields': ('total_break_minutes', 'lunch_break_minutes'),
            'classes': ('collapse',)
        }),
        ('Reference Data', {
            'fields': ('time_in_entry', 'time_out_entry', 'schedule_reference'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('is_weekend', 'is_holiday', 'notes'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('calculated_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def employee_name(self, obj):
        return obj.employee.full_name
    employee_name.short_description = 'Employee'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'employee__user', 
            'employee__department',
            'time_in_entry',
            'time_out_entry',
            'schedule_reference'
        )
