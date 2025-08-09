from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator


class Location(models.Model):
    """Model for storing location data with timezone information"""
    
    name = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    timezone_name = models.CharField(max_length=100, default='UTC')
    timezone_offset = models.IntegerField(default=0)
    geofence_radius = models.IntegerField(default=100, help_text='Radius in meters for geofencing')
    min_accuracy_meters = models.IntegerField(default=100, help_text='Minimum required location accuracy in meters')
    city = models.CharField(max_length=255, blank=True, null=True)
    country = models.CharField(max_length=255, blank=True, null=True)
    state = models.CharField(max_length=255, blank=True, null=True)
    address = models.TextField(blank=True, null=True, help_text='Full address of the location')
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
        print(f"Geofence center: ({self.latitude}, {self.longitude}), User: ({lat}, {lng}), Radius: {self.geofence_radius}")
        
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
    team_leaders = models.ManyToManyField('Employee', blank=True, related_name='led_departments')
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
    
    ROLE_CHOICES = [
        ('employee', 'Employee'),
        ('team_leader', 'Team Leader'),
        ('supervisor', 'Supervisor'),
        ('management', 'Management'),
        ('it_support', 'IT Support'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile')
    employee_id = models.CharField(max_length=20, unique=True)  # Company employee ID
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='employees')
    position = models.CharField(max_length=255, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    hire_date = models.DateField()
    employment_status = models.CharField(max_length=20, choices=EMPLOYMENT_STATUS_CHOICES, default='active')
    phone = models.CharField(max_length=20, blank=True, null=True)
    emergency_contact = models.CharField(max_length=255, blank=True, null=True)
    
    # Overtime configuration
    daily_work_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8.00, 
                                         help_text='Standard daily work hours before overtime (actual work time)')
    overtime_threshold_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8.00,
                                                 help_text='Hours worked before overtime kicks in (actual work time)')
    total_schedule_hours = models.DecimalField(max_digits=4, decimal_places=2, default=9.00,
                                             help_text='Total hours from time in to time out (including flexible break time)')
    flexible_break_hours = models.DecimalField(max_digits=4, decimal_places=2, default=1.00,
                                             help_text='Flexible break time included in total schedule')
    lunch_break_minutes = models.IntegerField(default=60, 
                                            help_text='Standard lunch break duration in minutes')
    break_threshold_minutes = models.IntegerField(default=30,
                                                help_text='Minimum break duration to be considered a break')
    grace_period_minutes = models.IntegerField(default=5,
                                             help_text='Grace period in minutes before considering late (e.g., 5 minutes)')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['user__first_name', 'user__last_name']
        verbose_name = 'Employee'
        verbose_name_plural = 'Employees'
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.employee_id} ({self.get_role_display()})"
    
    @property
    def full_name(self):
        return self.user.get_full_name()
    
    @property
    def email(self):
        return self.user.email
    
    @property
    def role_display(self):
        return self.get_role_display()
    
    def can_view_team_data(self):
        """Check if employee can view team data"""
        return self.role in ['team_leader', 'supervisor', 'management', 'it_support']
    
    def can_view_department_data(self):
        """Check if employee can view department data"""
        return self.role in ['supervisor', 'management', 'it_support']
    
    def can_view_company_data(self):
        """Check if employee can view company-wide data"""
        return self.role in ['management', 'it_support']
    
    def can_manage_users(self):
        """Check if employee can manage users"""
        return self.role in ['management', 'it_support']
    
    def get_subordinates(self):
        """Get all subordinates for this employee"""
        if self.role in ['team_leader', 'supervisor', 'management']:
            # Get direct reports: all employees in departments this TL leads
            direct_reports = Employee.objects.filter(department__team_leaders=self, employment_status='active').exclude(id=self.id)
            return direct_reports
        return Employee.objects.none()

    def get_team_members(self):
        """Get all team members (including subordinates)"""
        if self.role in ['team_leader', 'supervisor', 'management']:
            # All employees in all departments this TL leads
            team_members = Employee.objects.filter(department__in=self.led_departments.all(), employment_status='active').exclude(id=self.id)
            return team_members
        return Employee.objects.none()


class TimeEntry(models.Model):
    """Model for tracking employee time in/out"""
    
    ENTRY_TYPE_CHOICES = [
        ('time_in', 'Time In'),
        ('time_out', 'Time Out'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='time_entries')
    entry_type = models.CharField(max_length=10, choices=ENTRY_TYPE_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    event_time = models.DateTimeField(null=True, blank=True, help_text='The actual/corrected time of the event (if different from timestamp)')
    location = models.ForeignKey(Location, on_delete=models.CASCADE, null=True, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True, help_text='Latitude at time entry')
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True, help_text='Longitude at time entry')
    accuracy = models.FloatField(null=True, blank=True, help_text='Location accuracy in meters')
    notes = models.TextField(blank=True, null=True)
    overtime = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True, help_text='Overtime hours for this time entry')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_info = models.CharField(max_length=255, blank=True, null=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_time_entries',
        help_text='User who last updated or corrected this entry'
    )
    
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


class WorkSession(models.Model):
    """Model for tracking work sessions with overtime and break detection"""
    
    SESSION_TYPE_CHOICES = [
        ('regular', 'Regular Work'),
        ('overtime', 'Overtime'),
        ('break', 'Break'),
        ('lunch', 'Lunch Break'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='work_sessions')
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE_CHOICES, default='regular')
    time_in_entry = models.ForeignKey(TimeEntry, on_delete=models.CASCADE, related_name='work_sessions_as_in')
    time_out_entry = models.ForeignKey(TimeEntry, on_delete=models.CASCADE, related_name='work_sessions_as_out', null=True, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    duration_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    is_overtime = models.BooleanField(default=False)
    is_break = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-start_time']
        verbose_name = 'Work Session'
        verbose_name_plural = 'Work Sessions'
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.session_type} ({self.start_time.date()})"
    
    @property
    def is_active(self):
        """Check if this session is currently active (no end time)"""
        return self.end_time is None
    
    @property
    def duration_minutes(self):
        """Get duration in minutes"""
        if self.duration_hours:
            return int(self.duration_hours * 60)
        return 0
    
    def calculate_duration(self):
        """Calculate and update duration if session is complete"""
        if self.end_time and self.start_time:
            duration = self.end_time - self.start_time
            self.duration_hours = duration.total_seconds() / 3600
            self.save(update_fields=['duration_hours'])
            return self.duration_hours
        return None


class TimeCorrectionRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='correction_requests')
    date = models.DateField()
    requested_time_in = models.TimeField(null=True, blank=True)
    requested_time_out = models.TimeField(null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_correction_requests')
    response_message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.employee.full_name} ({self.date}) - {self.status}"


class OvertimeRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='overtime_requests')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    ticket = models.CharField(max_length=255, blank=True, null=True)
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    approver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_overtime_requests')
    comments = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee.full_name} ({self.date}) - {self.status}"


class LeaveRequest(models.Model):
    LEAVE_TYPE_CHOICES = [
        ('vacation', 'Vacation Leave'),
        ('sick', 'Sick Leave'),
        ('personal', 'Personal Leave'),
        ('maternity', 'Maternity Leave'),
        ('paternity', 'Paternity Leave'),
        ('bereavement', 'Bereavement Leave'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    number_days = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, 
                                    help_text='Manual input of number of days (excluding weekends)',
                                    validators=[MinValueValidator(0)])
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    approver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_leave_requests')
    comments = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee.full_name} - {self.get_leave_type_display()} ({self.start_date} to {self.end_date}) - {self.status}"
    
    @property
    def duration_days(self):
        """Calculate the number of days for this leave request"""
        return (self.end_date - self.start_date).days + 1


class ChangeScheduleRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='change_schedule_requests')
    original_date = models.DateField()
    original_start_time = models.TimeField()
    original_end_time = models.TimeField()
    requested_date = models.DateField()
    requested_start_time = models.TimeField()
    requested_end_time = models.TimeField()
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    approver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_change_schedule_requests')
    comments = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee.full_name} - {self.original_date} to {self.requested_date} ({self.status})"


class ScheduleTemplate(models.Model):
    """Model for storing reusable schedule templates"""
    
    TEMPLATE_TYPE_CHOICES = [
        ('personal', 'Personal'),
        ('team', 'Team'),
        ('company', 'Company'),
    ]
    
    name = models.CharField(max_length=255, help_text='Template name (e.g., "Morning Shift", "Night Shift")')
    time_in = models.TimeField()
    time_out = models.TimeField()
    is_night_shift = models.BooleanField(default=False, help_text='Check if this is a night shift (crosses midnight)')
    
    # Template ownership and sharing
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPE_CHOICES, default='personal')
    created_by = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='created_templates')
    team = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True, 
                           related_name='team_templates', help_text='Team this template belongs to (for team templates)')
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['template_type', 'name']
        verbose_name = 'Schedule Template'
        verbose_name_plural = 'Schedule Templates'
    
    def __str__(self):
        return f"{self.name} ({self.time_in.strftime('%H:%M')} - {self.time_out.strftime('%H:%M')})"
    
    @property
    def duration_hours(self):
        """Calculate duration in hours"""
        from datetime import datetime, timedelta
        
        start_dt = datetime.combine(datetime.today(), self.time_in)
        end_dt = datetime.combine(datetime.today(), self.time_out)
        
        if self.is_night_shift and end_dt < start_dt:
            end_dt += timedelta(days=1)
        
        duration = end_dt - start_dt
        return duration.total_seconds() / 3600
    
    @property
    def formatted_time(self):
        """Get formatted time range"""
        return f"{self.time_in.strftime('%I:%M %p')} - {self.time_out.strftime('%I:%M %p')}"
    
    def flip_am_pm(self):
        """Create a new template with AM/PM flipped"""
        from datetime import datetime, timedelta
        
        # Convert to datetime for easier manipulation
        start_dt = datetime.combine(datetime.today(), self.time_in)
        end_dt = datetime.combine(datetime.today(), self.time_out)
        
        # Flip AM/PM
        if start_dt.hour < 12:  # AM to PM
            start_dt += timedelta(hours=12)
        else:  # PM to AM
            start_dt -= timedelta(hours=12)
        
        if end_dt.hour < 12:  # AM to PM
            end_dt += timedelta(hours=12)
        else:  # PM to AM
            end_dt -= timedelta(hours=12)
        
        # Create new template
        new_template = ScheduleTemplate.objects.create(
            name=f"{self.name} (Flipped)",
            time_in=start_dt.time(),
            time_out=end_dt.time(),
            is_night_shift=not self.is_night_shift,
            template_type=self.template_type,
            created_by=self.created_by,
            team=self.team
        )
        
        return new_template


class EmployeeSchedule(models.Model):
    """Model for storing employee's actual monthly schedules"""
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='schedules')
    date = models.DateField()
    
    # Scheduled times
    scheduled_time_in = models.TimeField()
    scheduled_time_out = models.TimeField()
    is_night_shift = models.BooleanField(default=False, help_text='Check if this is a night shift (crosses midnight)')
    
    # Reference to template used (optional)
    template_used = models.ForeignKey(ScheduleTemplate, on_delete=models.SET_NULL, null=True, blank=True, 
                                    related_name='applied_schedules')
    
    # Metadata
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['employee', 'date']
        ordering = ['date', 'employee__user__first_name']
        verbose_name = 'Employee Schedule'
        verbose_name_plural = 'Employee Schedules'
        indexes = [
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['date', 'scheduled_time_in']),
        ]
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.date} ({self.scheduled_time_in.strftime('%H:%M')} - {self.scheduled_time_out.strftime('%H:%M')})"
    
    @property
    def day_of_week(self):
        """Get day of week name"""
        return self.date.strftime('%a')
    
    @property
    def formatted_time(self):
        """Get formatted time range"""
        return f"{self.scheduled_time_in.strftime('%I:%M %p')} - {self.scheduled_time_out.strftime('%I:%M %p')}"
    
    @property
    def duration_hours(self):
        """Calculate duration in hours"""
        from datetime import datetime, timedelta
        
        start_dt = datetime.combine(self.date, self.scheduled_time_in)
        end_dt = datetime.combine(self.date, self.scheduled_time_out)
        
        if self.is_night_shift and end_dt < start_dt:
            end_dt += timedelta(days=1)
        
        duration = end_dt - start_dt
        return duration.total_seconds() / 3600
    
    def is_weekday(self):
        """Check if this is a weekday (Monday-Friday)"""
        return self.date.weekday() < 5  # Monday = 0, Friday = 4
    
    def flip_am_pm(self):
        """Flip AM/PM times for this schedule"""
        from datetime import datetime, timedelta
        
        # Convert to datetime for easier manipulation
        start_dt = datetime.combine(self.date, self.scheduled_time_in)
        end_dt = datetime.combine(self.date, self.scheduled_time_out)
        
        # Flip AM/PM
        if start_dt.hour < 12:  # AM to PM
            start_dt += timedelta(hours=12)
        else:  # PM to AM
            start_dt -= timedelta(hours=12)
        
        if end_dt.hour < 12:  # AM to PM
            end_dt += timedelta(hours=12)
        else:  # PM to AM
            end_dt -= timedelta(hours=12)
        
        # Update the schedule
        self.scheduled_time_in = start_dt.time()
        self.scheduled_time_out = end_dt.time()
        self.is_night_shift = not self.is_night_shift
        self.save()


class DailyTimeSummary(models.Model):
    """Model for storing calculated daily time summary data for reporting"""
    
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('half_day', 'Half Day'),
        ('leave', 'On Leave'),
        ('holiday', 'Holiday'),
        ('weekend', 'Weekend'),
        ('not_scheduled', '-'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='daily_summaries')
    date = models.DateField()
    
    # Time entries
    time_in = models.TimeField(null=True, blank=True)
    time_out = models.TimeField(null=True, blank=True)
    
    # Scheduled times (from EmployeeSchedule)
    scheduled_time_in = models.TimeField(null=True, blank=True)
    scheduled_time_out = models.TimeField(null=True, blank=True)
    
    # Calculated metrics
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_scheduled')
    billed_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0.00, 
                                     help_text='Total billed/worked hours (BH)')
    late_minutes = models.IntegerField(default=0, help_text='Minutes late (LT)')
    undertime_minutes = models.IntegerField(default=0, help_text='Undertime minutes (UT)')
    night_differential_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0.00, 
                                                 help_text='Night differential hours (ND)')
    overtime_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0.00, 
                                       help_text='Overtime hours worked')
    
    # Break tracking
    total_break_minutes = models.IntegerField(default=0, help_text='Total break time in minutes')
    lunch_break_minutes = models.IntegerField(default=0, help_text='Lunch break time in minutes')
    
    # Reference to source data
    time_in_entry = models.ForeignKey(TimeEntry, on_delete=models.SET_NULL, null=True, blank=True, 
                                     related_name='daily_summary_as_in')
    time_out_entry = models.ForeignKey(TimeEntry, on_delete=models.SET_NULL, null=True, blank=True, 
                                      related_name='daily_summary_as_out')
    schedule_reference = models.ForeignKey(EmployeeSchedule, on_delete=models.SET_NULL, null=True, blank=True, 
                                         related_name='daily_summaries')
    
    # Metadata
    is_weekend = models.BooleanField(default=False)
    is_holiday = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    calculated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['employee', 'date']
        ordering = ['-date', 'employee__user__first_name']
        verbose_name = 'Daily Time Summary'
        verbose_name_plural = 'Daily Time Summaries'
        indexes = [
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['date', 'status']),
        ]
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.date} ({self.status})"
    
    @property
    def day_of_week(self):
        """Get day of week name"""
        return self.date.strftime('%a')
    
    @property
    def formatted_date(self):
        """Get formatted date for display"""
        return self.date.strftime('%b %d')
    
    @property
    def formatted_time_in(self):
        """Get formatted time in"""
        try:
            return self.time_in.strftime('%H:%M') if self.time_in else '-'
        except (AttributeError, ValueError):
            return '-'
    
    @property
    def formatted_time_out(self):
        """Get formatted time out"""
        try:
            return self.time_out.strftime('%H:%M') if self.time_out else '-'
        except (AttributeError, ValueError):
            return '-'
    
    @property
    def formatted_scheduled_in(self):
        """Get formatted scheduled time in"""
        try:
            return self.scheduled_time_in.strftime('%H:%M') if self.scheduled_time_in else '-'
        except (AttributeError, ValueError):
            return '-'
    
    @property
    def formatted_scheduled_out(self):
        """Get formatted scheduled time out"""
        try:
            return self.scheduled_time_out.strftime('%H:%M') if self.scheduled_time_out else '-'
        except (AttributeError, ValueError):
            return '-'
    
    @property
    def formatted_billed_hours(self):
        """Get formatted billed hours"""
        try:
            return f"{self.billed_hours:.2f}" if self.billed_hours and self.billed_hours > 0 else '-'
        except (AttributeError, ValueError, TypeError):
            return '-'
    
    @property
    def formatted_late_minutes(self):
        """Get formatted late minutes"""
        try:
            return str(self.late_minutes) if self.late_minutes and self.late_minutes > 0 else '-'
        except (AttributeError, ValueError, TypeError):
            return '-'
    
    @property
    def formatted_undertime_minutes(self):
        """Get formatted undertime minutes"""
        try:
            return str(self.undertime_minutes) if self.undertime_minutes and self.undertime_minutes > 0 else '-'
        except (AttributeError, ValueError, TypeError):
            return '-'
    
    @property
    def formatted_night_differential(self):
        """Get formatted night differential hours"""
        try:
            return f"{self.night_differential_hours:.2f}" if self.night_differential_hours and self.night_differential_hours > 0 else '-'
        except (AttributeError, ValueError, TypeError):
            return '-'
    
    def calculate_metrics(self):
        """Calculate all metrics based on time entries and scheduled times"""
        if not self.time_in or not self.time_out:
            return
        
        # Calculate billed hours (actual work time)
        from datetime import datetime, timedelta
        start_dt = datetime.combine(self.date, self.time_in)
        end_dt = datetime.combine(self.date, self.time_out)
        
        if end_dt < start_dt:
            end_dt += timedelta(days=1)  # Handle overnight shifts
        
        total_minutes = (end_dt - start_dt).total_seconds() / 60
        work_minutes = total_minutes - self.total_break_minutes
        self.billed_hours = work_minutes / 60
        
        # Calculate late minutes if scheduled time is available
        if self.scheduled_time_in:
            scheduled_start = datetime.combine(self.date, self.scheduled_time_in)
            grace_period_end = scheduled_start + timedelta(minutes=self.employee.grace_period_minutes)
            
            if start_dt > grace_period_end:
                # Only count late minutes after grace period
                self.late_minutes = int((start_dt - scheduled_start).total_seconds() / 60)
            else:
                # Within grace period, not late
                self.late_minutes = 0
        
        # Calculate undertime if scheduled time is available
        if self.scheduled_time_out and self.scheduled_time_in:
            scheduled_end = datetime.combine(self.date, self.scheduled_time_out)
            if scheduled_end < scheduled_start:
                scheduled_end += timedelta(days=1)
            
            scheduled_duration = (scheduled_end - scheduled_start).total_seconds() / 3600
            if self.billed_hours < scheduled_duration:
                self.undertime_minutes = int((scheduled_duration - self.billed_hours) * 60)
        
        # Calculate overtime
        if self.billed_hours > self.employee.overtime_threshold_hours:
            self.overtime_hours = self.billed_hours - self.employee.overtime_threshold_hours
        
        # Calculate night differential (hours worked between 10 PM and 6 AM)
        # According to HR rules: Calculate full night hours, then subtract 1 hour
        night_start = datetime.combine(self.date, datetime.strptime('22:00', '%H:%M').time())
        night_end = datetime.combine(self.date, datetime.strptime('06:00', '%H:%M').time())
        
        if start_dt < night_end:
            night_end += timedelta(days=1)
        
        night_work_start = max(start_dt, night_start)
        night_work_end = min(end_dt, night_end)
        
        if night_work_end > night_work_start:
            # Calculate total night hours worked (10 PM to 6 AM)
            total_night_hours = (night_work_end - night_work_start).total_seconds() / 3600
            
            # Apply 1-hour break deduction to night differential (HR rule)
            # For 7:00 PM - 4:00 AM shift: 6 hours night - 1 hour break = 5 hours night differential
            self.night_differential_hours = max(0, total_night_hours - 1.0)
        
        self.save()
