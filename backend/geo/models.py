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
    early_login_restriction_hours = models.DecimalField(max_digits=4, decimal_places=2, default=1.00,
                                                       help_text='Hours before scheduled time when early login is allowed (e.g., 1 hour)')
    require_schedule_compliance = models.BooleanField(default=True,
                                                     help_text='Whether this employee must comply with scheduled times')
    
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
    timestamp = models.DateTimeField(auto_now_add=True, help_text='When this record was created in the system')
    updated_on = models.DateTimeField(auto_now=True)
    event_time = models.DateTimeField(help_text='The actual/corrected time of the event (this is the time used for calculations)')
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
    
    def save(self, *args, **kwargs):
        """Override save to ensure event_time is set"""
        if not self.event_time:
            # If no event_time is provided, use the current timestamp
            from django.utils import timezone
            self.event_time = timezone.now()
        super().save(*args, **kwargs)
    
    @property
    def working_date(self):
        """Get the working date based on event_time (not timestamp)"""
        return self.event_time.date() if self.event_time else self.timestamp.date()


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
    
    def detect_night_shift(self):
        """Automatically detect if this is a night shift"""
        if self.scheduled_time_in and self.scheduled_time_out:
            # Night shift: starts late (after 6 PM) and ends early (before 12 PM)
            start_hour = self.scheduled_time_in.hour
            end_hour = self.scheduled_time_out.hour
            
            # Check if it's a night shift pattern
            is_night = (
                (start_hour >= 18 and end_hour < 12) or  # 6 PM to 12 PM
                (start_hour >= 20 and end_hour < 8) or   # 8 PM to 8 AM
                (start_hour >= 22 and end_hour < 6)      # 10 PM to 6 AM
            )
            
            # Also check if end time is before start time (crosses midnight)
            if self.scheduled_time_out < self.scheduled_time_in:
                is_night = True
            
            # CRITICAL FIX: Don't call self.save() here to avoid recursion!
            # Just set the field value, the parent save() method will handle it
            self.is_night_shift = is_night
            return is_night
        
        return False
    
    def get_adjusted_times(self):
        """Get scheduled times adjusted for night shift cross-date logic"""
        from .utils import adjust_nightshift_times
        
        adjusted = adjust_nightshift_times(
            self.scheduled_time_in,
            self.scheduled_time_out,
            base_date=self.date
        )
        
        return {
            'schedule_in_dt': adjusted['schedule_in_dt'],
            'schedule_out_dt': adjusted['schedule_out_dt'],
            'is_night_shift': adjusted['is_night_shift'],
            'duration_hours': adjusted['schedule_out_dt'].hour - adjusted['schedule_in_dt'].hour if adjusted['schedule_in_dt'] and adjusted['schedule_out_dt'] else 0
        }
    
    def save(self, *args, **kwargs):
        """Override save to automatically detect night shifts"""
        # Auto-detect night shift before saving
        if self.scheduled_time_in and self.scheduled_time_out:
            self.detect_night_shift()
        
        super().save(*args, **kwargs)
    
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
        ('late', 'Late'),
        ('undertime', 'UnderTime'),
        ('incomplete', 'Incomplete'),
        ('scheduled', 'Scheduled'),
        ('absent', 'Absent'),
        ('not_yet_scheduled', 'Not Yet Scheduled'),
        ('shift_void', 'Shift Void'),
        # Keep legacy statuses for backward compatibility
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
    def is_night_shift_schedule(self):
        """Check if this schedule is a night shift (crosses midnight)"""
        if self.scheduled_time_in and self.scheduled_time_out:
            return self.scheduled_time_out < self.scheduled_time_in
        return False
    
    @property
    def adjusted_scheduled_times(self):
        """Get scheduled times adjusted for night shift cross-date logic"""
        from .utils import adjust_nightshift_times
        
        if not self.scheduled_time_in or not self.scheduled_time_out:
            return None
        
        adjusted = adjust_nightshift_times(
            self.scheduled_time_in,
            self.scheduled_time_out,
            base_date=self.date
        )
        
        return {
            'schedule_in_dt': adjusted['schedule_in_dt'],
            'schedule_out_dt': adjusted['schedule_out_dt'],
            'is_night_shift': adjusted['is_night_shift']
        }
    
    @property
    def adjusted_actual_times(self):
        """Get actual times adjusted for night shift cross-date logic"""
        from .utils import adjust_nightshift_times
        
        if not self.time_in or not self.time_out:
            return None
        
        adjusted = adjust_nightshift_times(
            self.scheduled_time_in,
            self.scheduled_time_out,
            self.time_in,
            self.time_out,
            self.date
        )
        
        return {
            'time_in_dt': adjusted['time_in_dt'],
            'time_out_dt': adjusted['time_out_dt'],
            'is_night_shift': adjusted['is_night_shift']
        }
    
    def calculate_enhanced_metrics(self):
        """Calculate enhanced metrics using night shift cross-date logic"""
        from .utils import calculate_nightshift_duration, get_attendance_status_enhanced
        
        if not self.scheduled_time_in or not self.scheduled_time_out:
            return
        
        # Calculate duration with night shift support
        duration_data = calculate_nightshift_duration(
            self.scheduled_time_in,
            self.scheduled_time_out,
            self.time_in,
            self.time_out,
            self.date
        )
        
        # Update night differential
        if duration_data['night_differential_hours'] > 0:
            self.night_differential_hours = duration_data['night_differential_hours']
        
        # Calculate billed hours with proper break deduction
        if duration_data['actual_duration']:
            total_minutes = duration_data['actual_duration'].total_seconds() / 60
            
            # Apply break deduction based on shift duration
            break_deduction = 0
            if total_minutes >= 420:  # 7 hours or more
                break_deduction = 60  # 1 hour break
            elif total_minutes >= 240:  # 4 hours or more
                break_deduction = 30  # 30 minutes break
            
            billed_minutes = max(0, total_minutes - break_deduction)
            self.billed_hours = round(billed_minutes / 60, 2)
        
        # Calculate late minutes with night shift support
        if self.time_in and self.scheduled_time_in:
            adjusted_times = self.adjusted_scheduled_times
            if adjusted_times and adjusted_times['schedule_in_dt']:
                time_in_dt = datetime.combine(self.date, self.time_in)
                if time_in_dt > adjusted_times['schedule_in_dt']:
                    late_duration = time_in_dt - adjusted_times['schedule_in_dt']
                    late_minutes = late_duration.total_seconds() / 60
                    
                    # Apply late rules: 5 minutes grace period, then add 5 minutes penalty
                    if late_minutes <= 5:
                        self.late_minutes = 0
                    else:
                        self.late_minutes = int(late_minutes + 5)
        
        # Calculate undertime with night shift support
        if self.time_in and self.time_out and self.scheduled_time_in and self.scheduled_time_out:
            adjusted_times = self.adjusted_scheduled_times
            if adjusted_times and adjusted_times['schedule_out_dt']:
                time_out_dt = datetime.combine(self.date, self.time_out)
                if time_out_dt < adjusted_times['schedule_out_dt']:
                    undertime_duration = adjusted_times['schedule_out_dt'] - time_out_dt
                    self.undertime_minutes = int(undertime_duration.total_seconds() / 60)
        
        # Update status using enhanced logic
        new_status = get_attendance_status_enhanced(
            self.scheduled_time_in,
            self.scheduled_time_out,
            self.time_in,
            self.time_out,
            self.date
        )
        
        if new_status != "unknown":
            self.status = new_status
        
        # Save the updated metrics
        self.save(update_fields=[
            'billed_hours', 'late_minutes', 'undertime_minutes', 
            'night_differential_hours', 'status', 'updated_at'
        ])
    
    def get_nightshift_display_info(self):
        """Get display information for night shifts"""
        if not self.is_night_shift_schedule:
            return None
        
        adjusted = self.adjusted_scheduled_times
        if not adjusted:
            return None
        
        return {
            'start_date': self.date,
            'end_date': (self.date + timedelta(days=1)) if adjusted['is_night_shift'] else self.date,
            'start_time': self.scheduled_time_in.strftime('%I:%M %p') if self.scheduled_time_in else '-',
            'end_time': self.scheduled_time_out.strftime('%I:%M %p') if self.scheduled_time_out else '-',
            'crosses_midnight': adjusted['is_night_shift'],
            'duration_hours': round(self.billed_hours + (self.total_break_minutes / 60), 2) if self.billed_hours else 0
        }
    
    @property
    def formatted_billed_hours(self):
        """Get formatted billed hours"""
        try:
            return f"{self.billed_hours:.2f}" if self.billed_hours and self.billed_hours > 0 else '-'
        except (AttributeError, ValueError, TypeError):
            return '-'
    
    @property
    def formatted_billed_minutes(self):
        """Get formatted billed hours as minutes"""
        try:
            if self.billed_hours and self.billed_hours > 0:
                minutes = int(self.billed_hours * 60)
                return str(minutes)
            elif self.status in ['present', 'late', 'half_day'] and self.time_in and self.time_out:
                # For present days with time entries, calculate BH as Time Out - Scheduled Time In
                from datetime import datetime, timedelta
                try:
                    # Use scheduled time in if available, otherwise use actual time in
                    if self.scheduled_time_in:
                        # BH = Time Out - Scheduled Time In
                        scheduled_start_dt = datetime.combine(self.date, self.scheduled_time_in)
                        time_out_dt = datetime.combine(self.date, self.time_out)
                        
                        if time_out_dt < scheduled_start_dt:
                            time_out_dt += timedelta(days=1)  # Handle overnight shifts
                        
                        # Calculate BH as Time Out - Scheduled Time In
                        bh_minutes = int((time_out_dt - scheduled_start_dt).total_seconds() / 60)
                        
                        # Ensure BH is not negative (if time out is before scheduled time in)
                        bh_minutes = max(0, bh_minutes)
                        
                        # For flexible break system: only apply break deductions for sessions longer than 4 hours
                        if bh_minutes < 240:  # Less than 4 hours
                            # All time counts as work time for short sessions
                            work_minutes = bh_minutes
                        else:
                            # For longer sessions, apply flexible break deduction
                            flexible_break_minutes = int(self.employee.flexible_break_hours * 60)
                            work_minutes = bh_minutes - min(flexible_break_minutes, bh_minutes)
                        
                        return str(max(0, work_minutes))
                    else:
                        # Fallback to original calculation if no scheduled time in
                        start_dt = datetime.combine(self.date, self.time_in)
                        end_dt = datetime.combine(self.date, self.time_out)
                        
                        if end_dt < start_dt:
                            end_dt += timedelta(days=1)  # Handle overnight shifts
                        
                        total_minutes = int((end_dt - start_dt).total_seconds() / 60)
                        
                        # For flexible break system: all time counts as work time for short sessions
                        if total_minutes < 240:  # Less than 4 hours
                            work_minutes = total_minutes
                        else:
                            flexible_break_minutes = int(self.employee.flexible_break_hours * 60)
                            work_minutes = total_minutes - min(flexible_break_minutes, total_minutes)
                        
                        return str(max(0, work_minutes))
                except (ValueError, TypeError, AttributeError):
                    return '0'
            elif self.status == 'absent' and self.scheduled_time_in and self.scheduled_time_out:
                # For absent days with a schedule, show scheduled hours
                from datetime import datetime, timedelta
                try:
                    start_dt = datetime.combine(self.date, self.scheduled_time_in)
                    end_dt = datetime.combine(self.date, self.scheduled_time_out)
                    
                    if end_dt < start_dt:
                        end_dt += timedelta(days=1)  # Handle overnight shifts
                    
                    scheduled_minutes = int((end_dt - start_dt).total_seconds() / 60)
                    return str(scheduled_minutes)
                except (ValueError, TypeError, AttributeError):
                    return '0'
            else:
                return '0'  # Show "0" for absent days without schedule or other cases
        except (AttributeError, ValueError, TypeError):
            return '0'
    
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
        
        from datetime import datetime, timedelta
        from decimal import Decimal
        
        # Get scheduled times for abuse prevention logic
        scheduled_start = None
        scheduled_end = None
        
        if self.scheduled_time_in and self.scheduled_time_out:
            scheduled_start = datetime.combine(self.date, self.scheduled_time_in)
            scheduled_end = datetime.combine(self.date, self.scheduled_time_out)
            
            # Handle overnight shifts
            if scheduled_end < scheduled_start:
                scheduled_end += timedelta(days=1)
        
        # Apply business rules for dayshift schedules
        effective_start_dt = datetime.combine(self.date, self.time_in)
        effective_end_dt = datetime.combine(self.date, self.time_out)
        
        # Handle overnight shifts
        if effective_end_dt < effective_start_dt:
            effective_end_dt += timedelta(days=1)
        
        # NEW BUSINESS RULES FOR DAYSHIFT SCHEDULES
        if scheduled_start and scheduled_end:
            # Check if this is a dayshift (doesn't cross midnight)
            is_dayshift = scheduled_end > scheduled_start
            
            if is_dayshift:
                # DAYSHIFT RULES:
                # 1. If time in is early within 1 hour of scheduled time, round up to scheduled time
                # 2. If time out is more than scheduled time, round down to scheduled time
                
                # Calculate time difference for early arrival
                time_diff_minutes = int((scheduled_start - effective_start_dt).total_seconds() / 60)
                
                if time_diff_minutes > 0 and time_diff_minutes <= 60:
                    # Early arrival within 1 hour - round up to scheduled time
                    effective_start_dt = scheduled_start
                    print(f"DAYSIFT RULE: Early arrival {time_diff_minutes} minutes, rounded up to scheduled time")
                elif time_diff_minutes > 60:
                    # Too early (more than 1 hour) - keep actual time (will be handled by frontend validation)
                    print(f"DAYSIFT RULE: Too early arrival {time_diff_minutes} minutes, keeping actual time")
                
                # Check if time out is beyond scheduled time OR before scheduled time (emergency scenarios)
                if effective_end_dt > scheduled_end:
                    # EMERGENCY TIME-OUT POLICY: Check if this is an emergency situation
                    time_out_diff_minutes = int((effective_end_dt - scheduled_end).total_seconds() / 60)
                    
                    # If time out is more than 2 hours beyond scheduled time, flag as potential emergency
                    if time_out_diff_minutes > 120:  # More than 2 hours late
                        print(f"EMERGENCY POLICY: Time out {time_out_diff_minutes} minutes beyond schedule - potential emergency")
                        
                        # For emergency situations, we'll allow the actual time but flag it for review
                        # The system will create an EmergencyTimeOutRequest for manager approval
                        self._flag_emergency_timeout(time_out_diff_minutes, effective_end_dt)
                    else:
                        # Regular late departure - round down to scheduled time to prevent OT abuse
                        effective_end_dt = scheduled_end
                        print(f"DAYSIFT RULE: Late departure {time_out_diff_minutes} minutes, rounded down to scheduled time")
                
                elif effective_end_dt < scheduled_start:
                    # EMERGENCY TIME-OUT POLICY: Early time-out (before scheduled start) - potential emergency
                    time_out_diff_minutes = int((scheduled_start - effective_end_dt).total_seconds() / 60)
                    
                    print(f"EMERGENCY POLICY: Time out {time_out_diff_minutes} minutes BEFORE scheduled start - potential emergency")
                    
                    # For emergency situations with early time-out, flag it for review
                    # This handles cases where employee has to leave immediately after arriving
                    self._flag_emergency_timeout(-time_out_diff_minutes, effective_end_dt)  # Negative to indicate early
            else:
                # NIGHTSHIFT RULES (existing logic):
                # Round early arrivals to scheduled start time
                if effective_start_dt < scheduled_start:
                    effective_start_dt = scheduled_start
                
                # Round late departures to scheduled end time
                if effective_end_dt > scheduled_end:
                    effective_end_dt = scheduled_end
        
        # Calculate BH using effective times (after business rules)
        bh_minutes = int((effective_end_dt - effective_start_dt).total_seconds() / 60)
        
        # REVERTED: Use actual time worked instead of hardcoded 480 minutes for dayshifts
        if scheduled_start and scheduled_end:
            is_dayshift = scheduled_end > scheduled_start
            
            if is_dayshift:
                # DAYSHIFT: Use actual time worked (after abuse prevention rules)
                # The effective_start_dt and effective_end_dt already have business rules applied
                work_minutes = bh_minutes
                print(f"DAYSIFT RULE: Using actual time worked: {work_minutes} minutes")
            else:
                # NIGHTSHIFT: Use flexible break system
                if bh_minutes < 240:  # Less than 4 hours
                    work_minutes = bh_minutes
                else:
                    flexible_break_minutes = int(self.employee.flexible_break_hours * 60)
                    work_minutes = bh_minutes - min(flexible_break_minutes, bh_minutes)
        else:
            # No schedule: fallback to flexible break system
            if bh_minutes < 240:  # Less than 4 hours
                work_minutes = bh_minutes
            else:
                flexible_break_minutes = int(self.employee.flexible_break_hours * 60)
                work_minutes = bh_minutes - min(flexible_break_minutes, bh_minutes)
        
        # Store BH in hours (for backward compatibility) but calculate everything in minutes first
        self.billed_hours = max(0, work_minutes) / 60
        
        # Calculate late minutes if scheduled time is available
        if self.scheduled_time_in:
            scheduled_start = datetime.combine(self.date, self.scheduled_time_in)
            start_dt = datetime.combine(self.date, self.time_in)
            
            # Late = Time In - Scheduled Time In (negative means early, positive means late)
            late_minutes = int((start_dt - scheduled_start).total_seconds() / 60)
            
            # Apply grace period: if within grace period, not late
            if late_minutes <= self.employee.grace_period_minutes:
                self.late_minutes = 0  # Within grace period
            else:
                self.late_minutes = late_minutes - self.employee.grace_period_minutes  # Late after grace period
        
        # Calculate undertime using effective BH (after business rules)
        effective_bh_minutes = int(self.billed_hours * 60)
        
        if self.scheduled_time_in and self.scheduled_time_out:
            # Calculate scheduled work duration in minutes (excluding breaks)
            scheduled_start = datetime.combine(self.date, self.scheduled_time_in)
            scheduled_end = datetime.combine(self.date, self.scheduled_time_out)
            
            if scheduled_end < scheduled_start:
                scheduled_end += timedelta(days=1)  # Handle overnight shifts
            
            scheduled_duration_minutes = int((scheduled_end - scheduled_start).total_seconds() / 60)
            
            # NEW BUSINESS RULE: Different calculation for dayshift vs nightshift
            is_dayshift = scheduled_end > scheduled_start
            
            if is_dayshift:
                # DAYSHIFT: UT = Scheduled Work Duration - BH (using actual BH)
                # Calculate scheduled work duration excluding breaks
                if scheduled_duration_minutes >= 240:  # 4 hours or more
                    flexible_break_minutes = int(self.employee.flexible_break_hours * 60)
                    scheduled_work_minutes = scheduled_duration_minutes - flexible_break_minutes
                else:
                    scheduled_work_minutes = scheduled_duration_minutes
                
                # UT = Scheduled Work Duration - BH
                self.undertime_minutes = max(0, scheduled_work_minutes - effective_bh_minutes)
                print(f"DAYSIFT RULE: UT = {scheduled_work_minutes} - {effective_bh_minutes} = {self.undertime_minutes} minutes")
            else:
                # NIGHTSHIFT: Use flexible break system
                if scheduled_duration_minutes >= 240:  # 4 hours or more
                    flexible_break_minutes = int(self.employee.flexible_break_hours * 60)
                    scheduled_work_minutes = scheduled_duration_minutes - flexible_break_minutes
                else:
                    scheduled_work_minutes = scheduled_duration_minutes
                
                # UT = Scheduled Work Duration - BH
                self.undertime_minutes = max(0, scheduled_work_minutes - effective_bh_minutes)
        else:
            # Fallback: Use employee's daily work hours instead of hardcoded 480
            daily_work_minutes = int(self.employee.daily_work_hours * 60)
            self.undertime_minutes = max(0, daily_work_minutes - effective_bh_minutes)
        
        # Calculate overtime
        if self.billed_hours > self.employee.overtime_threshold_hours:
            self.overtime_hours = Decimal(str(self.billed_hours)) - self.employee.overtime_threshold_hours
        else:
            self.overtime_hours = Decimal('0.00')
        
        # Calculate night differential using ORIGINAL actual times with ND period rounding
        # According to HR rules: Calculate full night hours, then subtract 1 hour
        # ND should reflect actual hours worked during night periods, with proper rounding to ND boundaries
        
        # Define ND period: 10:00 PM (22:00) to 6:00 AM (06:00)
        nd_start_time = datetime.strptime('22:00', '%H:%M').time()  # 10:00 PM
        nd_end_time = datetime.strptime('06:00', '%H:%M').time()    # 6:00 AM
        
        # Create datetime objects for ND boundaries
        nd_start_dt = datetime.combine(self.date, nd_start_time)      # 10:00 PM same day
        nd_end_dt = datetime.combine(self.date, nd_end_time)          # 6:00 AM same day
        
        # Handle cross-day scenario: if ND end is before ND start, add 1 day
        if nd_end_dt < nd_start_dt:
            nd_end_dt += timedelta(days=1)
        
        # Use ORIGINAL actual times for ND calculation (not abuse-prevented times)
        original_start_dt = datetime.combine(self.date, self.time_in)
        original_end_dt = datetime.combine(self.date, self.time_out)
        
        # Handle overnight shifts in actual times
        if original_end_dt < original_start_dt:
            original_end_dt += timedelta(days=1)
        
        # ND ROUNDING LOGIC: Round to ND period boundaries for accurate calculation
        # Round down early arrivals to ND start (10:00 PM) if before ND period
        if original_start_dt < nd_start_dt:
            nd_work_start = nd_start_dt  # Round down to 10:00 PM
        else:
            nd_work_start = original_start_dt  # Use actual time if during ND period
        
        # ND ABUSE PREVENTION: Round down time out to scheduled end time to prevent ND abuse
        # If employee has a schedule, use scheduled end time instead of actual time out
        if self.scheduled_time_out:
            scheduled_end_dt = datetime.combine(self.date, self.scheduled_time_out)
            # Handle overnight shifts in schedule
            if scheduled_end_dt < datetime.combine(self.date, self.scheduled_time_in):
                scheduled_end_dt += timedelta(days=1)
            
            # Use the earlier of: actual time out OR scheduled end time
            nd_work_end = min(original_end_dt, scheduled_end_dt)
        else:
            # No schedule available, use actual time out with ND boundary rounding
            if original_end_dt > nd_end_dt:
                nd_work_end = nd_end_dt  # Round down to 6:00 AM
            else:
                nd_work_end = original_end_dt  # Use actual time if during ND period
        
        # Calculate ND hours worked
        if nd_work_end > nd_work_start:
            # Calculate total night minutes worked
            total_night_minutes = int((nd_work_end - nd_work_start).total_seconds() / 60)
            total_night_hours = total_night_minutes / 60
            
            # Apply 1-hour break deduction to night differential (HR rule)
            # For 7:00 PM - 4:00 AM shift: 6 hours night - 1 hour break = 5 hours night differential
            self.night_differential_hours = max(0, total_night_hours - 1.0)
        else:
            self.night_differential_hours = Decimal('0.00')
        
        self.save()
    
    def _flag_emergency_timeout(self, time_out_diff_minutes, actual_time_out):
        """Flag an emergency time-out situation for manager review"""
        try:
            from .models import EmergencyTimeOutRequest
            
            # Check if emergency request already exists for this date
            existing_request = EmergencyTimeOutRequest.objects.filter(
                employee=self.employee,
                date=self.date
            ).first()
            
            if not existing_request:
                # Create new emergency time-out request
                EmergencyTimeOutRequest.objects.create(
                    employee=self.employee,
                    date=self.date,
                    scheduled_time_out=self.scheduled_time_out,
                    actual_time_out=actual_time_out.time(),
                    time_out_diff_minutes=time_out_diff_minutes,
                    daily_summary=self,
                    reason="Emergency time-out detected automatically",
                    status='pending'
                )
                print(f"EMERGENCY POLICY: Created emergency time-out request for {self.employee.full_name}")
            else:
                # Update existing request
                existing_request.actual_time_out = actual_time_out.time()
                existing_request.time_out_diff_minutes = time_out_diff_minutes
                existing_request.save()
                print(f"EMERGENCY POLICY: Updated existing emergency time-out request")
                
        except Exception as e:
            print(f"Error creating emergency time-out request: {e}")

    def calculate_comprehensive_status(self):
        """
        Calculate comprehensive status based on new business rules:
        
        Status:
            Present → TimeIn is on or before ScheduleIn, TimeOut is on or after ScheduleOut
            Late → TimeIn is after ScheduleIn
            UnderTime → TimeOut is before ScheduleOut
            Incomplete → TimeOut is missing or more than 1 hour late
            Scheduled → ScheduleIn and ScheduleOut are set
            Absent → ScheduleIn & ScheduleOut exist but no TimeIn (on today's date)
            Not Yet Scheduled → ScheduleIn and ScheduleOut are missing (for past or future)
            Shift Void → Anything not matching above
        
        If void all BH, UT, LT, and ND is 0(zero)
        """
        from datetime import datetime, date, time, timedelta
        
        today = date.today()
        current_date = self.date
        
        # Check if record has scheduled times
        has_scheduled_times = self.scheduled_time_in and self.scheduled_time_out
        
        if has_scheduled_times:
            if current_date > today:
                # Future date with schedule
                new_status = 'scheduled'
            elif current_date == today and not self.time_in:
                # Today with schedule but no time in
                new_status = 'absent'
            else:
                # Past or current date with schedule
                if self.time_in and self.time_out and self.time_in != '-' and self.time_out != '-':
                    # Both time in and time out exist
                    try:
                        # Parse times for comparison
                        time_in_dt = datetime.combine(current_date, self.time_in)
                        time_out_dt = datetime.combine(current_date, self.time_out)
                        scheduled_in_dt = datetime.combine(current_date, self.scheduled_time_in)
                        scheduled_out_dt = datetime.combine(current_date, self.scheduled_time_out)
                        
                        # Handle night shifts crossing midnight
                        if time_out_dt < time_in_dt:
                            time_out_dt += timedelta(days=1)
                        if scheduled_out_dt < scheduled_in_dt:
                            scheduled_out_dt += timedelta(days=1)
                        
                        # Calculate actual duration worked
                        actual_duration_minutes = int((time_out_dt - time_in_dt).total_seconds() / 60)
                        
                        # Check for suspiciously short shifts (less than 15 minutes)
                        if actual_duration_minutes < 15:
                            new_status = 'incomplete'
                        else:
                            # Check if time in is late
                            is_late = time_in_dt > scheduled_in_dt
                            
                            # Check if time out is early (undertime)
                            is_undertime = time_out_dt < scheduled_out_dt
                            
                            if is_late:
                                new_status = 'late'
                            elif is_undertime:
                                new_status = 'undertime'
                            else:
                                new_status = 'present'
                                
                    except (ValueError, TypeError):
                        # If time parsing fails, default to present
                        new_status = 'present'
                elif self.time_in and (not self.time_out or self.time_out == '-'):
                    # Has time in but no time out
                    new_status = 'incomplete'
                else:
                    # No time entries
                    new_status = 'absent'
        else:
            # No scheduled times
            new_status = 'not_yet_scheduled'
        
        # Check for shift void conditions
        is_shift_void = False
        if self.time_in and self.time_out and self.scheduled_time_in:
            try:
                time_in_dt = datetime.combine(current_date, self.time_in)
                scheduled_in_dt = datetime.combine(current_date, self.scheduled_time_in)
                
                # Shift void: both time in and time out are before scheduled start time
                if time_in_dt < scheduled_in_dt:
                    # Check if time out is also before scheduled start
                    time_out_dt = datetime.combine(current_date, self.time_out)
                    if time_out_dt < scheduled_in_dt:
                        is_shift_void = True
                        new_status = 'shift_void'
                        
            except (ValueError, TypeError):
                pass
        
        # Update status
        if self.status != new_status:
            self.status = new_status
        
        # If shift is void, zero out all metrics
        if is_shift_void:
            self.billed_hours = 0
            self.late_minutes = 0
            self.undertime_minutes = 0
            self.night_differential_hours = 0
            self.overtime_hours = 0
            self.total_break_minutes = 0
            self.lunch_break_minutes = 0
        
        return new_status


class EmergencyTimeOutRequest(models.Model):
    """Model for handling emergency time-out situations"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
        ('deleted', 'Time Entry Deleted'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='emergency_timeout_requests')
    date = models.DateField()
    
    # Time information
    scheduled_time_out = models.TimeField(help_text='Originally scheduled time out')
    actual_time_out = models.TimeField(help_text='Actual time out recorded')
    time_out_diff_minutes = models.IntegerField(help_text='Minutes beyond scheduled time')
    
    # Reference to daily summary
    daily_summary = models.ForeignKey(DailyTimeSummary, on_delete=models.CASCADE, related_name='emergency_requests')
    
    # Request details
    reason = models.TextField(help_text='Reason for emergency time-out')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Manager review
    reviewed_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, 
                                  related_name='reviewed_emergency_requests')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    manager_comments = models.TextField(blank=True, help_text='Manager comments on the request')
    
    # Action taken
    action_taken = models.CharField(max_length=50, blank=True, 
                                  help_text='Action taken: approved, denied, or deleted time entry')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Emergency Time-Out Request'
        verbose_name_plural = 'Emergency Time-Out Requests'
        unique_together = ['employee', 'date']  # One request per employee per date
    
    def __str__(self):
        return f"Emergency Time-Out: {self.employee.full_name} - {self.date}"
    
    @property
    def formatted_time_out_diff(self):
        """Format time difference in hours and minutes"""
        hours = self.time_out_diff_minutes // 60
        minutes = self.time_out_diff_minutes % 60
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"
    
    def approve_request(self, manager, comments=""):
        """Approve the emergency time-out request"""
        self.status = 'approved'
        self.reviewed_by = manager
        self.reviewed_at = timezone.now()
        self.manager_comments = comments
        self.action_taken = 'approved'
        self.save()
    
    def deny_request(self, manager, comments=""):
        """Deny the emergency time-out request"""
        self.status = 'denied'
        self.reviewed_by = manager
        self.reviewed_at = timezone.now()
        self.manager_comments = comments
        self.action_taken = 'denied'
        self.save()
    
    def delete_time_entry(self, manager, comments=""):
        """Delete the time entry for this date (clean slate)"""
        self.status = 'deleted'
        self.reviewed_by = manager
        self.reviewed_at = timezone.now()
        self.manager_comments = comments
        self.action_taken = 'deleted time entry'
        
        # Delete the time entries for this date
        from .models import TimeEntry
        TimeEntry.objects.filter(
            employee=self.employee,
            event_time__date=self.date
        ).delete()
        
        # Delete the daily summary
        if self.daily_summary:
            self.daily_summary.delete()
        
        self.save()
        print(f"EMERGENCY POLICY: Time entries deleted for {self.employee.full_name} on {self.date}")
