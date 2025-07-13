from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User


class Location(models.Model):
    """Model for storing location data with timezone information"""
    
    name = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    timezone_name = models.CharField(max_length=100, default='UTC')
    timezone_offset = models.IntegerField(default=0)
    geofence_radius = models.IntegerField(default=100, help_text='Radius in meters for geofencing')
    city = models.CharField(max_length=255, blank=True, null=True)
    country = models.CharField(max_length=255, blank=True, null=True)
    state = models.CharField(max_length=255, blank=True, null=True)
    display_name = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Location'
        verbose_name_plural = 'Locations'
    
    def __str__(self):
        return f"{self.name or 'Location'} at {self.latitude}, {self.longitude}"
    
    @property
    def coordinates(self):
        return f"{self.latitude}, {self.longitude}"
    
    def calculate_distance_to(self, lat, lng):
        """
        Calculate distance from this location to given coordinates using Haversine formula.
        Returns distance in meters.
        """
        import math
        
        # Convert to radians
        lat1, lon1 = math.radians(float(self.latitude)), math.radians(float(self.longitude))
        lat2, lon2 = math.radians(float(lat)), math.radians(float(lng))
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        # Earth's radius in meters
        R = 6371000
        distance = R * c
        
        return distance
    
    def is_within_geofence(self, lat, lng):
        """
        Check if given coordinates are within the geofence radius.
        Returns True if within radius, False otherwise.
        """
        distance = self.calculate_distance_to(lat, lng)
        return distance <= self.geofence_radius


class Department(models.Model):
    """Model for storing department information"""
    
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=10, unique=True, blank=True, null=True)  # e.g., "IT", "HR"
    description = models.TextField(blank=True, null=True)
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='departments')
    manager = models.ForeignKey('Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_departments')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'
    
    def __str__(self):
        return f"{self.name} - {self.location.name if self.location else 'No Location'}"


class Employee(models.Model):
    """Model for storing employee information"""
    
    EMPLOYMENT_STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('terminated', 'Terminated'),
        ('on_leave', 'On Leave'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile')
    employee_id = models.CharField(max_length=20, unique=True)  # Company employee ID
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='employees')
    position = models.CharField(max_length=255, blank=True, null=True)
    hire_date = models.DateField()
    employment_status = models.CharField(max_length=20, choices=EMPLOYMENT_STATUS_CHOICES, default='active')
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    phone = models.CharField(max_length=20, blank=True, null=True)
    emergency_contact = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['user__first_name', 'user__last_name']
        verbose_name = 'Employee'
        verbose_name_plural = 'Employees'
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.employee_id}"
    
    @property
    def full_name(self):
        return self.user.get_full_name()
    
    @property
    def email(self):
        return self.user.email


class TimeEntry(models.Model):
    """Model for tracking employee time in/out"""
    
    ENTRY_TYPE_CHOICES = [
        ('time_in', 'Time In'),
        ('time_out', 'Time Out'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='time_entries')
    entry_type = models.CharField(max_length=10, choices=ENTRY_TYPE_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    location = models.ForeignKey(Location, on_delete=models.CASCADE, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_info = models.CharField(max_length=255, blank=True, null=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Time Entry'
        verbose_name_plural = 'Time Entries'
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.entry_type} at {self.timestamp}"
    
    @property
    def formatted_timestamp(self):
        """Return formatted timestamp in local timezone"""
        return self.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    
    @property
    def is_time_in(self):
        """Check if this is a time in entry"""
        return self.entry_type == 'time_in'
    
    @property
    def is_time_out(self):
        """Check if this is a time out entry"""
        return self.entry_type == 'time_out'
