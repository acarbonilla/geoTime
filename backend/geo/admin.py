from django.contrib import admin
from .models import Location, Department, Employee


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
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'location', 'manager', 'is_active', 'created_at')
    list_filter = ('is_active', 'location', 'created_at')
    search_fields = ('name', 'code', 'description')
    readonly_fields = ('created_at', 'updated_at')
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
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'employee_id', 'department', 'position', 'employment_status', 'hire_date')
    list_filter = ('employment_status', 'department', 'hire_date', 'created_at')
    search_fields = ('user__first_name', 'user__last_name', 'user__email', 'employee_id', 'position')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'employee_id')
        }),
        ('Employment Details', {
            'fields': ('department', 'position', 'hire_date', 'employment_status')
        }),
        ('Organization', {
            'fields': ('manager',)
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
