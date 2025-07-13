from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .models import Location, Department, Employee, TimeEntry


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'country', 'timezone_name', 'coordinates', 'created_at')
    list_filter = ('country', 'timezone_name', 'created_at')
    search_fields = ('name', 'city', 'country', 'state')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'latitude', 'longitude')
        }),
        ('Location Details', {
            'fields': ('city', 'state', 'country', 'display_name')
        }),
        ('Timezone', {
            'fields': ('timezone_name', 'timezone_offset')
        }),
        ('Geofencing', {
            'fields': ('geofence_radius',)
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
    readonly_fields = ('created_at', 'updated_at', 'employee_count')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'description')
        }),
        ('Organization', {
            'fields': ('location', 'manager')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Employee Information', {
            'fields': ('employee_count',),
            'description': 'Total number of employees in this department'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def employee_count(self, obj):
        return obj.employees.count()
    employee_count.short_description = 'Employees'


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'employee_id', 'department', 'position', 'role', 'employment_status', 'hire_date')
    list_filter = ('role', 'employment_status', 'department', 'hire_date', 'created_at')
    search_fields = ('user__first_name', 'user__last_name', 'user__email', 'employee_id', 'position')
    readonly_fields = ('created_at', 'updated_at', 'role_display')
    list_editable = ('role', 'employment_status')  # Allow quick editing of role and status
    ordering = ('user__first_name', 'user__last_name')
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'employee_id')
        }),
        ('Employment Details', {
            'fields': ('department', 'position', 'hire_date', 'employment_status')
        }),
        ('Role & Permissions', {
            'fields': ('role', 'role_display'),
            'description': 'Role determines access levels and dashboard features'
        }),
        ('Organization', {
            'fields': ('manager',),
            'description': 'Manager for team hierarchy and reporting structure'
        }),
        ('Contact Information', {
            'fields': ('phone', 'emergency_contact')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def full_name(self, obj):
        return obj.full_name
    full_name.short_description = 'Full Name'
    full_name.admin_order_field = 'user__first_name'
    
    def role_display(self, obj):
        role_colors = {
            'employee': '#6B7280',      # Gray
            'team_leader': '#3B82F6',   # Blue
            'supervisor': '#8B5CF6',    # Purple
            'management': '#059669',    # Green
            'it_support': '#DC2626',    # Red
        }
        color = role_colors.get(obj.role, '#6B7280')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.role_display
        )
    role_display.short_description = 'Role'
    
    # Add actions for bulk role updates
    actions = ['make_employee', 'make_team_leader', 'make_supervisor', 'make_management', 'make_it_support']
    
    def make_employee(self, request, queryset):
        updated = queryset.update(role='employee')
        self.message_user(request, f'{updated} employee(s) were successfully marked as Employee.')
    make_employee.short_description = "Mark selected employees as Employee"
    
    def make_team_leader(self, request, queryset):
        updated = queryset.update(role='team_leader')
        self.message_user(request, f'{updated} employee(s) were successfully marked as Team Leader.')
    make_team_leader.short_description = "Mark selected employees as Team Leader"
    
    def make_supervisor(self, request, queryset):
        updated = queryset.update(role='supervisor')
        self.message_user(request, f'{updated} employee(s) were successfully marked as Supervisor.')
    make_supervisor.short_description = "Mark selected employees as Supervisor"
    
    def make_management(self, request, queryset):
        updated = queryset.update(role='management')
        self.message_user(request, f'{updated} employee(s) were successfully marked as Management.')
    make_management.short_description = "Mark selected employees as Management"
    
    def make_it_support(self, request, queryset):
        updated = queryset.update(role='it_support')
        self.message_user(request, f'{updated} employee(s) were successfully marked as IT Support.')
    make_it_support.short_description = "Mark selected employees as IT Support"
    
    # Add changelist view customization
    def changelist_view(self, request, extra_context=None):
        # Add role statistics to the changelist view
        extra_context = extra_context or {}
        role_stats = Employee.objects.values('role').annotate(count=Count('id')).order_by('role')
        extra_context['role_stats'] = role_stats
        return super().changelist_view(request, extra_context)


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
