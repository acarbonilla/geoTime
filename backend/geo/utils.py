from datetime import datetime, date, time, timedelta
from decimal import Decimal
from typing import List, Dict, Tuple, Optional
from django.utils import timezone
from django.db.models import Q, Sum, Count, Avg, Min, Max
from django.db import transaction
import logging
import math
from decimal import Decimal, ROUND_HALF_UP

logger = logging.getLogger(__name__)

def adjust_nightshift_times(schedule_in, schedule_out, time_in=None, time_out=None, base_date=None):
    """
    Adjust nightshift times to handle cross-date schedules properly.
    
    This function implements the nightshift cross-date logic to solve the problem where:
    - Night shift starts: 10:00 PM (same day)
    - Night shift ends: 6:00 AM (next day)
    - Problem: schedule_out.time() < schedule_in.time() (6:00 AM < 10:00 PM)
    - Solution: Add 1 day to schedule_out for proper calculations
    
    Args:
        schedule_in: Time object for scheduled start time
        schedule_out: Time object for scheduled end time
        time_in: Time object for actual start time (optional)
        time_out: Time object for actual end time (optional)
        base_date: Base date for calculations (defaults to today)
    
    Returns:
        dict: Adjusted times with proper date handling
    """
    if not base_date:
        base_date = timezone.now().date()
    
    # Convert to datetime for easier manipulation
    schedule_in_dt = datetime.combine(base_date, schedule_in) if schedule_in else None
    schedule_out_dt = datetime.combine(base_date, schedule_out) if schedule_out else None
    time_in_dt = datetime.combine(base_date, time_in) if time_in else None
    time_out_dt = datetime.combine(base_date, time_out) if time_out else None
    
    # Adjust night shift logic: if schedule_out is on next day, but should count for the current date
    if schedule_in_dt and schedule_out_dt:
        if schedule_out_dt.time() < schedule_in_dt.time():
            # This is a night shift crossing midnight
            schedule_out_dt = schedule_in_dt + timedelta(days=1)
            logger.debug(f"Night shift detected: {schedule_in_dt.time()} - {schedule_out_dt.time()} (adjusted)")
    
    # Apply the same logic to actual time_out if time_out is earlier than time_in
    if time_in_dt and time_out_dt and time_out_dt.time() < time_in_dt.time():
        # Actual time out is on next day
        time_out_dt = time_in_dt + timedelta(days=1)
        logger.debug(f"Actual time out adjusted for next day: {time_in_dt.time()} - {time_out_dt.time()}")
    
    return {
        'schedule_in_dt': schedule_in_dt,
        'schedule_out_dt': schedule_out_dt,
        'time_in_dt': time_in_dt,
        'time_out_dt': time_out_dt,
        'is_night_shift': schedule_in and schedule_out and schedule_out < schedule_in,
        'base_date': base_date
    }

def calculate_nightshift_duration(schedule_in, schedule_out, time_in=None, time_out=None, base_date=None):
    """
    Calculate duration for night shifts with proper date handling.
    
    Args:
        schedule_in: Time object for scheduled start time
        schedule_out: Time object for scheduled end time
        time_in: Time object for actual start time (optional)
        time_out: Time object for actual end time (optional)
        base_date: Base date for calculations
    
    Returns:
        dict: Duration calculations with proper night shift handling
    """
    adjusted_times = adjust_nightshift_times(schedule_in, schedule_out, time_in, time_out, base_date)
    
    # Calculate scheduled duration
    scheduled_duration = None
    if adjusted_times['schedule_in_dt'] and adjusted_times['schedule_out_dt']:
        scheduled_duration = adjusted_times['schedule_out_dt'] - adjusted_times['schedule_in_dt']
    
    # Calculate actual duration
    actual_duration = None
    if adjusted_times['time_in_dt'] and adjusted_times['time_out_dt']:
        actual_duration = adjusted_times['time_out_dt'] - adjusted_times['time_in_dt']
    
    # Calculate night differential hours (10 PM to 6 AM)
    night_differential_hours = 0
    if adjusted_times['time_in_dt'] and adjusted_times['time_out_dt']:
        night_start = datetime.combine(base_date, time(22, 0))  # 10:00 PM
        night_end = datetime.combine(base_date + timedelta(days=1), time(6, 0))  # 6:00 AM next day
        
        # Find overlap with night period
        effective_start = max(adjusted_times['time_in_dt'], night_start)
        effective_end = min(adjusted_times['time_out_dt'], night_end)
        
        if effective_start < effective_end:
            night_duration = effective_end - effective_start
            night_differential_hours = night_duration.total_seconds() / 3600
    
    return {
        'scheduled_duration': scheduled_duration,
        'actual_duration': actual_duration,
        'night_differential_hours': round(night_differential_hours, 2),
        'is_night_shift': adjusted_times['is_night_shift'],
        'adjusted_times': adjusted_times
    }

def get_attendance_status_enhanced(schedule_in, schedule_out, time_in, time_out, base_date=None):
    """
    Enhanced attendance status determination with night shift support.
    
    Args:
        schedule_in: Time object for scheduled start time
        schedule_out: Time object for scheduled end time
        time_in: Time object for actual start time
        time_out: Time object for actual end time
        base_date: Base date for calculations
    
    Returns:
        str: Attendance status
    """
    if not schedule_in and not schedule_out:
        return "not_yet_scheduled"
    
    if schedule_in and schedule_out and not time_in and not time_out:
        return "absent"
    
    if time_in and not time_out:
        # Incomplete if no time-out after 1 hour
        time_now = timezone.now()
        if time_in:
            time_in_dt = datetime.combine(base_date or timezone.now().date(), time_in)
            diff = (time_now - time_in_dt).total_seconds() / 3600
            return "incomplete" if diff > 1 else "waiting_timeout"
    
    if time_in and time_out:
        # Use adjusted times for proper comparison
        adjusted_times = adjust_nightshift_times(schedule_in, schedule_out, time_in, time_out, base_date)
        
        if adjusted_times['schedule_in_dt'] and adjusted_times['time_in_dt']:
            late = adjusted_times['time_in_dt'] > adjusted_times['schedule_in_dt']
        else:
            late = False
        
        if adjusted_times['schedule_out_dt'] and adjusted_times['time_out_dt']:
            undertime = adjusted_times['time_out_dt'] < adjusted_times['schedule_out_dt']
        else:
            undertime = False
        
        if not late and not undertime:
            return "present"
        elif late and undertime:
            return "late_and_undertime"
        elif late:
            return "late"
        elif undertime:
            return "undertime"
    
    return "unknown"

from .models import TimeEntry, WorkSession, Employee
import logging


class OvertimeCalculator:
    """Utility class for calculating overtime, breaks, and work sessions"""
    
    def __init__(self, employee: Employee):
        self.employee = employee
        self.daily_work_hours = float(employee.daily_work_hours)  # 8 hours actual work
        self.overtime_threshold = float(employee.overtime_threshold_hours)  # 8 hours
        self.total_schedule_hours = float(employee.total_schedule_hours)  # 9 hours total
        self.flexible_break_hours = float(employee.flexible_break_hours)  # 1 hour flexible break
        self.lunch_break_minutes = employee.lunch_break_minutes
        self.break_threshold_minutes = employee.break_threshold_minutes
    
    def analyze_daily_sessions(self, date: datetime.date) -> Dict:
        """
        Analyze all time entries for a given date and return detailed breakdown
        """
        # Get all time entries for the date
        time_entries = TimeEntry.objects.filter(
            employee=self.employee,
            timestamp__date=date
        ).order_by('timestamp')
        
        if not time_entries.exists():
            return {
                'date': date,
                'total_hours': 0,
                'actual_work_hours': 0,  # Fix for KeyError
                'regular_hours': 0,
                'overtime_hours': 0,
                'break_hours': 0,
                'lunch_break_hours': 0,
                'flexible_break_hours': self.flexible_break_hours,
                'sessions': [],
                'breaks': [],
                'is_overtime': False,
                'overtime_threshold_reached': False,
                'total_schedule_hours': self.total_schedule_hours,
                'daily_work_hours': self.daily_work_hours
            }
        
        # Group entries into sessions
        sessions = self._group_entries_into_sessions(time_entries)
        
        # Calculate totals
        total_hours = sum(session['duration_hours'] for session in sessions)
        
        # For flexible break system: calculate actual work hours
        # All time counts as work time for overtime calculation
        # Only the first 9 hours count toward the daily schedule
        actual_work_hours = total_hours  # All time counts as work for overtime
        flexible_break_used = min(self.flexible_break_hours, max(0, total_hours - self.total_schedule_hours))
        
        # Calculate overtime based on actual work hours
        regular_hours = min(actual_work_hours, self.overtime_threshold)
        overtime_hours = max(0, actual_work_hours - self.overtime_threshold)
        
        # For flexible breaks, we don't track individual breaks
        break_hours = 0
        lunch_break_hours = 0
        
        # Check if overtime threshold is reached
        overtime_threshold_reached = actual_work_hours > self.overtime_threshold
        
        return {
            'date': date,
            'total_hours': round(total_hours, 2),
            'actual_work_hours': round(actual_work_hours, 2),
            'regular_hours': round(regular_hours, 2),
            'overtime_hours': round(overtime_hours, 2),
            'break_hours': round(break_hours, 2),
            'lunch_break_hours': round(lunch_break_hours, 2),
            'flexible_break_hours': self.flexible_break_hours,
            'flexible_break_used': round(flexible_break_used, 2),
            'sessions': sessions,
            'breaks': [],  # No individual breaks tracked in flexible system
            'is_overtime': overtime_hours > 0,
            'overtime_threshold_reached': overtime_threshold_reached,
            'overtime_threshold': self.overtime_threshold,
            'total_schedule_hours': self.total_schedule_hours,
            'daily_work_hours': self.daily_work_hours
        }
    
    def _group_entries_into_sessions(self, time_entries: List[TimeEntry]) -> List[Dict]:
        """
        Group time entries into work sessions (no break detection for flexible breaks)
        """
        sessions = []
        time_in_entries = [e for e in time_entries if e.entry_type == 'time_in']
        time_out_entries = [e for e in time_entries if e.entry_type == 'time_out']
        
        # Calculate cumulative hours worked
        cumulative_hours = 0
        
        for i, time_in in enumerate(time_in_entries):
            if i < len(time_out_entries):
                time_out = time_out_entries[i]
                duration = (time_out.timestamp - time_in.timestamp).total_seconds() / 3600
                
                # Determine if this session contributes to overtime
                # All time counts as work time for overtime calculation
                session_work_hours = duration  # All session time counts as work
                is_overtime = cumulative_hours >= self.overtime_threshold
                
                session_data = {
                    'time_in': time_in.timestamp if time_in else None,
                    'time_out': time_out.timestamp if time_out else None,
                    'start_time': time_in.timestamp,
                    'end_time': time_out.timestamp,
                    'duration_hours': duration,
                    'work_hours': session_work_hours,
                    'is_overtime': is_overtime,
                    'is_break': False,  # No individual breaks in flexible system
                    'is_lunch_break': False,
                    'session_type': 'overtime' if is_overtime else 'regular',
                    'cumulative_hours_before': cumulative_hours
                }
                
                sessions.append(session_data)
                cumulative_hours += session_work_hours
        
        return sessions
    
    def _get_session_type(self, is_overtime: bool, is_break: bool, is_lunch_break: bool) -> str:
        """Determine session type based on flags"""
        if is_lunch_break:
            return 'lunch'
        elif is_break:
            return 'break'
        elif is_overtime:
            return 'overtime'
        else:
            return 'regular'
    
    def get_current_session_status(self) -> Dict:
        """
        Get current session status with overtime alerts
        """
        from datetime import datetime, time
        from django.utils import timezone
        local_tz = timezone.get_current_timezone()
        today_local = timezone.localtime(timezone.now(), local_tz).date()
        start_of_day = datetime.combine(today_local, time.min)
        end_of_day = datetime.combine(today_local, time.max)
        start_of_day = timezone.make_aware(start_of_day, local_tz)
        end_of_day = timezone.make_aware(end_of_day, local_tz)

        today_entries = TimeEntry.objects.filter(
            employee=self.employee,
            timestamp__gte=start_of_day,
            timestamp__lte=end_of_day
        ).order_by('timestamp')
        today_analysis = self.analyze_daily_sessions(today_local)

        # Find any open session (time_in with no time_out after it)
        last_time_in = TimeEntry.objects.filter(
            employee=self.employee,
            entry_type='time_in'
        ).order_by('-timestamp').first()
        active_session = None
        if last_time_in:
            # Is there a time_out after this time_in?
            has_time_out = TimeEntry.objects.filter(
                employee=self.employee,
                entry_type='time_out',
                timestamp__gt=last_time_in.timestamp
            ).exists()
            if not has_time_out:
                # Calculate current session duration
                current_duration = (timezone.now() - last_time_in.timestamp).total_seconds() / 3600
                # Calculate actual work hours including current session
                actual_work_hours = today_analysis['total_hours'] + current_duration
                active_session = {
                    'start_time': last_time_in.timestamp,
                    'current_duration': round(current_duration, 2),
                    'is_overtime': actual_work_hours > self.overtime_threshold,
                    'hours_until_overtime': max(0, self.overtime_threshold - today_analysis['actual_work_hours'])
                }

        return {
            'today_analysis': today_analysis,
            'active_session': active_session,
            'overtime_threshold': self.overtime_threshold,
            'daily_work_hours': self.daily_work_hours,
            'total_schedule_hours': self.total_schedule_hours,
            'flexible_break_hours': self.flexible_break_hours
        }
    
    def create_work_sessions(self, date: datetime.date) -> List[WorkSession]:
        """
        Create WorkSession objects from time entries for a given date
        """
        time_entries = TimeEntry.objects.filter(
            employee=self.employee,
            timestamp__date=date
        ).order_by('timestamp')
        
        # Delete existing work sessions for this date
        WorkSession.objects.filter(
            employee=self.employee,
            start_time__date=date
        ).delete()
        
        sessions = self._group_entries_into_sessions(time_entries)
        work_sessions = []
        
        for session_data in sessions:
            work_session = WorkSession.objects.create(
                employee=self.employee,
                session_type=session_data['session_type'],
                time_in_entry=session_data['time_in'],
                time_out_entry=session_data['time_out'],
                start_time=session_data['start_time'],
                end_time=session_data['end_time'],
                duration_hours=session_data['duration_hours'],
                is_overtime=session_data['is_overtime'],
                is_break=session_data['is_break']
            )
            work_sessions.append(work_session)
        
        return work_sessions


class BreakDetector:
    """Utility class for detecting and analyzing breaks"""
    
    @staticmethod
    def detect_breaks(time_entries: List[TimeEntry], break_threshold_minutes: int = 30) -> List[Dict]:
        """
        Detect breaks between time entries
        """
        breaks = []
        sorted_entries = sorted(time_entries, key=lambda x: x.timestamp)
        
        for i in range(len(sorted_entries) - 1):
            current_entry = sorted_entries[i]
            next_entry = sorted_entries[i + 1]
            
            if current_entry.entry_type == 'time_out' and next_entry.entry_type == 'time_in':
                gap = (next_entry.timestamp - current_entry.timestamp).total_seconds() / 60
                
                if gap >= break_threshold_minutes:
                    break_data = {
                        'start_time': current_entry.timestamp,
                        'end_time': next_entry.timestamp,
                        'duration_minutes': gap,
                        'duration_hours': gap / 60,
                        'is_lunch_break': BreakDetector._is_lunch_break(next_entry.timestamp, gap),
                        'break_type': BreakDetector._get_break_type(gap)
                    }
                    breaks.append(break_data)
        
        return breaks
    
    @staticmethod
    def _is_lunch_break(time_in: datetime, duration_minutes: float) -> bool:
        """Determine if a break is a lunch break"""
        # Lunch break typically occurs between 11 AM and 2 PM and is longer than 30 minutes
        lunch_start = time_in.replace(hour=11, minute=0, second=0, microsecond=0)
        lunch_end = time_in.replace(hour=14, minute=0, second=0, microsecond=0)
        
        return (lunch_start <= time_in <= lunch_end and duration_minutes >= 30)
    
    @staticmethod
    def _get_break_type(duration_minutes: float) -> str:
        """Categorize break type based on duration"""
        if duration_minutes >= 60:
            return 'lunch'
        elif duration_minutes >= 30:
            return 'long_break'
        elif duration_minutes >= 15:
            return 'short_break'
        else:
            return 'brief_pause' 


def calculate_daily_summary(employee, date):
    """
    Calculate daily time summary for an employee on a specific date.
    Returns a DailyTimeSummary object.
    
    FIXED VERSION: Properly handles event_time vs timestamp and cross-day time entries
    """
    from .models import DailyTimeSummary, TimeEntry, EmployeeSchedule
    from datetime import datetime, timedelta
    
    # Get or create daily summary
    summary, created = DailyTimeSummary.objects.get_or_create(
        employee=employee,
        date=date,
        defaults={
            'status': 'absent',
            'is_weekend': date.weekday() >= 5,  # Saturday = 5, Sunday = 6
        }
    )
    
    # Get time entries for this date using event_time (actual working time)
    time_in_entry = TimeEntry.objects.filter(
        employee=employee,
        entry_type='time_in',
        event_time__date=date
    ).first()
    
    time_out_entry = TimeEntry.objects.filter(
        employee=employee,
        entry_type='time_out',
        event_time__date=date
    ).first()
    
    # ENHANCED: Comprehensive night shift time out detection
    if not time_out_entry:
        # Strategy 1: Check next day for time out (common night shift pattern)
        next_day = date + timedelta(days=1)
        next_day_time_out = TimeEntry.objects.filter(
            employee=employee,
            entry_type='time_out',
            event_time__date=next_day
        ).first()
        
        if next_day_time_out:
            # Verify this time out belongs to the current day's shift
            # Check if time out is before 6 AM (typical night shift end time)
            if next_day_time_out.event_time.time().hour < 6:
                time_out_entry = next_day_time_out
        
        # Strategy 2: Check previous day for time out (if this is a time out day)
        if not time_out_entry:
            prev_day = date - timedelta(days=1)
            prev_day_time_in = TimeEntry.objects.filter(
                employee=employee,
                entry_type='time_in',
                event_time__date=prev_day
            ).first()
            
            if prev_day_time_in and prev_day_time_in.event_time.time().hour >= 18:  # Started at 6 PM or later
                # This might be a night shift that ended today
                current_day_time_out = TimeEntry.objects.filter(
                    employee=employee,
                    entry_type='time_out',
                    event_time__date=date
                ).first()
                
                if current_day_time_out and current_day_time_out.event_time.time().hour < 6:
                    # This time out belongs to the previous day's night shift
                    # We need to update the previous day's summary, not this one
                    pass  # This will be handled when processing the previous day
        
        # Strategy 3: Look for time out within a reasonable time window
        if not time_out_entry:
            # Search for time out entries within 12 hours after time in
            if time_in_entry and time_in_entry.event_time:
                time_in_dt = time_in_entry.event_time
                # Look for time out within 12 hours after time in
                time_window_end = time_in_dt + timedelta(hours=12)
                
                # Search in a broader range
                potential_time_out = TimeEntry.objects.filter(
                    employee=employee,
                    entry_type='time_out',
                    event_time__gte=time_in_dt,
                    event_time__lte=time_window_end
                ).order_by('event_time').first()
                
                if potential_time_out:
                    time_out_entry = potential_time_out
    
    # Get scheduled times for this date
    try:
        schedule = EmployeeSchedule.objects.get(employee=employee, date=date)
        summary.scheduled_time_in = schedule.scheduled_time_in
        summary.scheduled_time_out = schedule.scheduled_time_out
        summary.schedule_reference = schedule
    except EmployeeSchedule.DoesNotExist:
        summary.scheduled_time_in = None
        summary.scheduled_time_out = None
        summary.schedule_reference = None
    
    # FIXED: Always use event_time if available, regardless of date
    if time_in_entry:
        # Prioritize event_time over timestamp for actual time values
        if time_in_entry.event_time:
            # Convert to local timezone before extracting time
            if time_in_entry.event_time.tzinfo:
                local_time = time_in_entry.event_time.astimezone(timezone.get_current_timezone())
                summary.time_in = local_time.time()
            else:
                summary.time_in = time_in_entry.event_time.time()
        else:
            summary.time_in = time_in_entry.timestamp.time()
        summary.time_in_entry = time_in_entry
    
    if time_out_entry:
        # Prioritize event_time over timestamp for actual time values
        if time_out_entry.event_time:
            # Convert to local timezone before extracting time
            if time_out_entry.event_time.tzinfo:
                local_time = time_out_entry.event_time.astimezone(timezone.get_current_timezone())
                summary.time_out = local_time.time()
            else:
                summary.time_out = time_out_entry.event_time.time()
        else:
            summary.time_out = time_out_entry.timestamp.time()
        summary.time_out_entry = time_out_entry
    
    # Determine status
    if time_in_entry and time_out_entry:
        summary.status = 'present'
    elif time_in_entry and not time_out_entry:
        summary.status = 'present'  # Still working
    else:
        summary.status = 'not_scheduled'
    
    # Calculate metrics if we have both time in and out
    if summary.time_in and summary.time_out:
        summary.calculate_metrics()
    
    summary.save()
    return summary


def apply_template_to_schedule(employee, template, start_date, end_date, weekdays_only=False, overwrite_existing=False):
    """
    Apply a schedule template to a date range for an employee.
    
    Args:
        employee: Employee object
        template: ScheduleTemplate object
        start_date: Start date (inclusive)
        end_date: End date (inclusive)
        weekdays_only: If True, only apply to weekdays (Monday-Friday)
        overwrite_existing: If True, replace existing schedules instead of skipping them
    
    Returns:
        dict: Contains 'schedules_created', 'dates_updated', 'dates_skipped', 'skipped_dates_list'
    """
    from .models import EmployeeSchedule
    from datetime import timedelta
    
    schedules_created = 0
    dates_updated = 0
    dates_skipped = 0
    skipped_dates_list = []
    current_date = start_date
    
    while current_date <= end_date:
        # Skip weekends if weekdays_only is True
        if weekdays_only and current_date.weekday() >= 5:
            current_date += timedelta(days=1)
            continue
        
        # Check if schedule already exists for this date
        existing_schedule = EmployeeSchedule.objects.filter(
            employee=employee,
            date=current_date
        ).first()
        
        if existing_schedule:
            if overwrite_existing:
                # Update existing schedule
                existing_schedule.scheduled_time_in = template.time_in
                existing_schedule.scheduled_time_out = template.time_out
                existing_schedule.is_night_shift = template.is_night_shift
                existing_schedule.template_used = template
                existing_schedule.save()
                dates_updated += 1
            else:
                # Skip this date and record it
                dates_skipped += 1
                skipped_dates_list.append(current_date.strftime('%Y-%m-%d'))
        else:
            # Create new schedule
            EmployeeSchedule.objects.create(
                employee=employee,
                date=current_date,
                scheduled_time_in=template.time_in,
                scheduled_time_out=template.time_out,
                is_night_shift=template.is_night_shift,
                template_used=template,
            )
            schedules_created += 1
        
        current_date += timedelta(days=1)
    
    return {
        'schedules_created': schedules_created,
        'dates_updated': dates_updated,
        'dates_skipped': dates_skipped,
        'skipped_dates_list': skipped_dates_list
    }


def copy_schedule_from_previous_month(employee, target_month, target_year, flip_am_pm=False):
    """
    Copy schedule from the previous month to the target month.
    
    Args:
        employee: Employee object
        target_month: Target month (1-12)
        target_year: Target year
        flip_am_pm: If True, flip AM/PM times when copying
    """
    from .models import EmployeeSchedule
    from datetime import datetime, timedelta
    import calendar
    
    # Calculate previous month
    if target_month == 1:
        prev_month = 12
        prev_year = target_year - 1
    else:
        prev_month = target_month - 1
        prev_year = target_year
    
    # Get start and end dates for both months
    prev_start_date = datetime(prev_year, prev_month, 1).date()
    prev_end_date = datetime(prev_year, prev_month, calendar.monthrange(prev_year, prev_month)[1]).date()
    
    target_start_date = datetime(target_year, target_month, 1).date()
    target_end_date = datetime(target_year, target_month, calendar.monthrange(target_year, target_month)[1]).date()
    
    # Get schedules from previous month
    prev_schedules = EmployeeSchedule.objects.filter(
        employee=employee,
        date__gte=prev_start_date,
        date__lte=prev_end_date
    ).order_by('date')
    
    schedules_created = 0
    
    for prev_schedule in prev_schedules:
        # Calculate corresponding date in target month
        day_of_month = prev_schedule.date.day
        
        # Handle cases where target month has fewer days
        try:
            target_date = datetime(target_year, target_month, day_of_month).date()
        except ValueError:
            # If day doesn't exist in target month (e.g., Feb 30), skip it
            continue
        
        if target_date > target_end_date:
            continue
        
        # Create new schedule
        new_schedule = EmployeeSchedule.objects.create(
            employee=employee,
            date=target_date,
            scheduled_time_in=prev_schedule.scheduled_time_in,
            scheduled_time_out=prev_schedule.scheduled_time_out,
            is_night_shift=prev_schedule.is_night_shift,
            template_used=prev_schedule.template_used,
            notes=f"Copied from {prev_schedule.date.strftime('%B %Y')}"
        )
        
        # Flip AM/PM if requested
        if flip_am_pm:
            # Convert times to datetime for easier manipulation
            from datetime import datetime, timedelta
            
            start_dt = datetime.combine(datetime.today(), new_schedule.scheduled_time_in)
            end_dt = datetime.combine(datetime.today(), new_schedule.scheduled_time_out)
            
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
            new_schedule.scheduled_time_in = start_dt.time()
            new_schedule.scheduled_time_out = end_dt.time()
            new_schedule.is_night_shift = not new_schedule.is_night_shift
            new_schedule.save()
        
        schedules_created += 1
    
    return schedules_created


def get_available_templates(employee):
    """
    Get all available schedule templates for an employee.
    Returns templates in order: personal, team, company.
    """
    from .models import ScheduleTemplate
    
    templates = []
    
    # Personal templates
    personal_templates = ScheduleTemplate.objects.filter(
        created_by=employee,
        template_type='personal',
        is_active=True
    )
    templates.extend(personal_templates)
    
    # Team templates
    team_templates = ScheduleTemplate.objects.filter(
        team=employee.department,
        template_type='team',
        is_active=True
    )
    templates.extend(team_templates)
    
    # Company templates
    company_templates = ScheduleTemplate.objects.filter(
        template_type='company',
        is_active=True
    )
    templates.extend(company_templates)
    
    return templates


def create_schedule_template(employee, name, time_in, time_out, template_type='personal', team=None):
    """
    Create a new schedule template.
    
    Args:
        employee: Employee creating the template
        name: Template name
        time_in: Time in (time object)
        time_out: Time out (time object)
        template_type: 'personal', 'team', or 'company'
        team: Department for team templates
    """
    from .models import ScheduleTemplate
    from datetime import datetime, timedelta
    
    # Determine if it's a night shift
    start_dt = datetime.combine(datetime.today(), time_in)
    end_dt = datetime.combine(datetime.today(), time_out)
    is_night_shift = end_dt < start_dt
    
    # Create template
    template = ScheduleTemplate.objects.create(
        name=name,
        time_in=time_in,
        time_out=time_out,
        is_night_shift=is_night_shift,
        template_type=template_type,
        created_by=employee,
        team=team if template_type == 'team' else None
    )
    
    return template


def get_employee_time_report(employee, start_date, end_date):
    """
    Get a complete time report for an employee for a date range.
    Returns data formatted for the report shown in the image.
    """
    from .models import DailyTimeSummary
    from datetime import timedelta
    
    # Ensure we have summaries for the period
    generate_daily_summaries_for_period(employee, start_date, end_date)
    
    # Get all summaries for the period
    summaries = DailyTimeSummary.objects.filter(
        employee=employee,
        date__gte=start_date,
        date__lte=end_date
    ).order_by('date')
    
    # Format data for report
    report_data = []
    total_days = 0
    total_billed_hours = 0
    total_late_minutes = 0
    total_undertime_minutes = 0
    total_night_differential = 0
    total_overtime = 0
    
    for i, summary in enumerate(summaries, 1):
        if summary.status != 'absent':
            total_days += 1
            total_billed_hours += summary.billed_hours
            total_late_minutes += summary.late_minutes
            total_undertime_minutes += summary.undertime_minutes
            total_night_differential += summary.night_differential_hours
            total_overtime += summary.overtime_hours
        
        report_data.append({
            'number': i,
            'date': summary.formatted_date,
            'day': summary.day_of_week,
            'status': summary.get_status_display(),
            'time_in': summary.formatted_time_in,
            'time_out': summary.formatted_time_out,
            'billed_hours': summary.formatted_billed_hours,
            'late_minutes': summary.formatted_late_minutes,
            'undertime_minutes': summary.formatted_undertime_minutes,
            'night_differential': summary.formatted_night_differential,
        })
    
    # Summary totals
    summary_totals = {
        'total_days': total_days,
        'total_overtime': f"{total_overtime:.2f}",
        'total_billed_hours': f"{total_billed_hours:.2f}",
        'total_late_minutes': total_late_minutes,
        'total_undertime_minutes': total_undertime_minutes,
        'total_night_differential': f"{total_night_differential:.2f}",
    }
    
    return {
        'employee': employee,
        'period': f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d')}",
        'data': report_data,
        'totals': summary_totals,
    } 


def generate_daily_time_summary_from_entries(employee, start_date, end_date=None):
    """
    Generate DailyTimeSummary records by connecting TimeEntry data with EmployeeSchedule data.
    This function creates the TIME ATTENDANCE report data.
    
    Args:
        employee: Employee instance
        start_date: Start date for summary generation
        end_date: End date for summary generation (defaults to start_date if None)
    
    Returns:
        dict: Summary of created/updated records
    """
    from datetime import date, timedelta
    from .models import TimeEntry, EmployeeSchedule, DailyTimeSummary
    
    if end_date is None:
        end_date = start_date
    
    created_count = 0
    updated_count = 0
    skipped_count = 0
    
    current_date = start_date
    while current_date <= end_date:
        try:
            # Get time entries for this date (convert to Manila timezone for proper date filtering)
            import pytz
            manila_tz = pytz.timezone('Asia/Manila')
            
            # Get all time entries for the employee and filter by Manila timezone date
            all_time_entries = TimeEntry.objects.filter(employee=employee).order_by('timestamp')
            time_entries = []
            
            for entry in all_time_entries:
                manila_timestamp = entry.timestamp.astimezone(manila_tz)
                if manila_timestamp.date() == current_date:
                    time_entries.append(entry)
            
            # Get schedule for this date
            try:
                schedule = EmployeeSchedule.objects.get(
                    employee=employee,
                    date=current_date
                )
            except EmployeeSchedule.DoesNotExist:
                schedule = None
            
            # Get or create daily summary
            summary, created = DailyTimeSummary.objects.get_or_create(
                employee=employee,
                date=current_date,
                defaults={
                    'status': 'absent',
                    'is_weekend': current_date.weekday() >= 5,  # Saturday = 5, Sunday = 6
                }
            )
            
            # Extract time in/out from time entries
            time_in_entry = None
            time_out_entry = None
            time_in = None
            time_out = None
            
            # Convert to Manila timezone for proper time extraction
            import pytz
            manila_tz = pytz.timezone('Asia/Manila')
            
            for entry in time_entries:
                # Convert timestamp to Manila timezone
                manila_timestamp = entry.timestamp.astimezone(manila_tz)
                
                if entry.entry_type == 'time_in' and not time_in_entry:
                    time_in_entry = entry
                    time_in = manila_timestamp.time()
                elif entry.entry_type == 'time_out' and not time_out_entry:
                    time_out_entry = entry
                    time_out = manila_timestamp.time()
            
            # Update summary with time entry data
            summary.time_in = time_in
            summary.time_out = time_out
            summary.time_in_entry = time_in_entry
            summary.time_out_entry = time_out_entry
            
            # Update with schedule data
            if schedule:
                summary.scheduled_time_in = schedule.scheduled_time_in
                summary.scheduled_time_out = schedule.scheduled_time_out
                summary.schedule_reference = schedule
            else:
                summary.scheduled_time_in = None
                summary.scheduled_time_out = None
                summary.schedule_reference = None
            
            # Determine status - FIXED LOGIC to prevent incorrect 'absent' status
            from datetime import date
            today = date.today()
            
            # Debug logging for status determination
            debug_info = {
                'date': current_date,
                'employee': employee.full_name,
                'has_time_in': bool(time_in),
                'has_time_out': bool(time_out),
                'has_schedule': bool(schedule),
                'scheduled_in': summary.scheduled_time_in,
                'scheduled_out': summary.scheduled_time_out,
                'is_weekend': summary.is_weekend,
                'is_future': current_date > today
            }
            
            # Use the new comprehensive status calculation method
            summary.calculate_comprehensive_status()
            
            # Detect breaks and set total_break_minutes before calculating metrics
            if time_in and time_out and len(time_entries) > 2:
                # If there are more than 2 entries (time in + time out + potential breaks), detect breaks
                breaks = BreakDetector.detect_breaks(time_entries, employee.break_threshold_minutes)
                total_break_minutes = sum(b['duration_minutes'] for b in breaks)
                summary.total_break_minutes = total_break_minutes
            elif time_in and time_out:
                # For simple time in/out with no detected breaks, use the flexible break time
                summary.total_break_minutes = int(employee.flexible_break_hours * 60)  # Convert hours to minutes
            
            # Calculate metrics
            summary.calculate_metrics()
            
            # Save the summary
            summary.save()
            
            if created:
                created_count += 1
            else:
                updated_count += 1
                
        except Exception as e:
            print(f"Error processing {current_date} for {employee.full_name}: {e}")
            skipped_count += 1
        
        current_date += timedelta(days=1)
    
    return {
        'created': created_count,
        'updated': updated_count,
        'skipped': skipped_count,
        'total_processed': created_count + updated_count + skipped_count
    }


def generate_daily_summaries_for_period(start_date, end_date, employee=None):
    """
    Generate DailyTimeSummary records for all employees or a specific employee for a date range.
    
    Args:
        start_date: Start date for summary generation
        end_date: End date for summary generation
        employee: Specific employee (optional, if None processes all employees)
    
    Returns:
        dict: Summary of processing results
    """
    from .models import Employee
    
    if employee:
        employees = [employee]
    else:
        employees = Employee.objects.filter(employment_status='active')
    
    total_created = 0
    total_updated = 0
    total_skipped = 0
    
    for emp in employees:
        result = generate_daily_time_summary_from_entries(emp, start_date, end_date)
        total_created += result['created']
        total_updated += result['updated']
        total_skipped += result['skipped']
    
    return {
        'employees_processed': len(employees),
        'total_created': total_created,
        'total_updated': total_updated,
        'total_skipped': total_skipped,
        'total_processed': total_created + total_updated + total_skipped
    }


def regenerate_daily_summaries_for_period(employee, start_date, end_date):
    """
    Regenerate daily summaries for a specific period to fix missing time out data.
    This is useful for fixing existing data after backend improvements.
    """
    from datetime import date, timedelta
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Regenerating daily summaries for employee {employee.employee_id} from {start_date} to {end_date}")
        
        current_date = start_date
        summaries_updated = 0
        
        while current_date <= end_date:
            try:
                # Regenerate the daily summary for this date
                summary = generate_daily_summary_for_employee(employee, current_date)
                if summary:
                    summaries_updated += 1
                    logger.info(f"Updated summary for {current_date}")
            except Exception as e:
                logger.warning(f"Error updating summary for {current_date}: {str(e)}")
            
            current_date += timedelta(days=1)
        
        logger.info(f"Successfully updated {summaries_updated} daily summaries")
        return summaries_updated
        
    except Exception as e:
        logger.error(f"Error in regenerate_daily_summaries_for_period: {str(e)}", exc_info=True)
        raise


def get_employee_time_attendance_report(employee, start_date, end_date):
    """
    Get a complete TIME ATTENDANCE report for an employee.
    This matches the format shown in the image.
    
    Args:
        employee: Employee instance
        start_date: Start date for report
        end_date: End date for report
    
    Returns:
        dict: Complete report data
    """
    from .models import DailyTimeSummary, TimeEntry, EmployeeSchedule
    from datetime import date, timedelta
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Starting time attendance report generation for employee {employee.employee_id} from {start_date} to {end_date}")
        
        # Get all daily summaries for the period
        summaries = DailyTimeSummary.objects.filter(
            employee=employee,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')
        
        logger.info(f"Found {summaries.count()} daily summaries for the period")
        
        # Convert to report format
        report_data = []
        total_billed_hours = 0
        total_late_minutes = 0
        total_undertime_minutes = 0
        total_night_differential = 0
        days_worked = 0
        
        current_date = start_date
        while current_date <= end_date:
            try:
                summary = summaries.get(date=current_date)
            except DailyTimeSummary.DoesNotExist:
                summary = None
            except Exception as e:
                logger.warning(f"Error getting summary for {current_date}: {str(e)}")
                summary = None
            
            if summary and summary.status in ['present', 'late', 'half_day']:
                days_worked += 1
                try:
                    total_billed_hours += float(summary.billed_hours or 0)
                    total_late_minutes += summary.late_minutes or 0
                    total_undertime_minutes += summary.undertime_minutes or 0
                    total_night_differential += float(summary.night_differential_hours or 0)
                except (ValueError, TypeError) as e:
                    logger.warning(f"Error processing summary metrics for {current_date}: {str(e)}")
            
            # Create report record with safe property access
            try:
                # ENHANCED: Include TimeEntry data directly for better time out handling
                time_entries_data = []
                if summary:
                    # Get all time entries for this date
                    from .models import TimeEntry
                    date_entries = TimeEntry.objects.filter(
                        employee=employee,
                        event_time__date=current_date
                    ).order_by('event_time')
                    
                    for entry in date_entries:
                        time_entries_data.append({
                            'entry_type': entry.entry_type,
                            'event_time': entry.event_time.strftime('%H:%M:%S') if entry.event_time else None,
                            'timestamp': entry.timestamp.strftime('%H:%M:%S') if entry.timestamp else None,
                            'notes': entry.notes or ''
                        })
                    
                    # Also check for time out entries that might belong to this day's shift
                    if summary.time_in and not summary.time_out:
                        # Look for time out within reasonable time window
                        from datetime import datetime, timedelta
                        if summary.time_in:
                            time_in_dt = datetime.combine(current_date, summary.time_in)
                            time_window_end = time_in_dt + timedelta(hours=12)
                            
                            # Search for time out entries within 12 hours
                            potential_time_out = TimeEntry.objects.filter(
                                employee=employee,
                                entry_type='time_out',
                                event_time__gte=time_in_dt,
                                event_time__lte=time_window_end
                            ).order_by('event_time').first()
                            
                            if potential_time_out:
                                time_entries_data.append({
                                    'entry_type': 'time_out',
                                    'event_time': potential_time_out.event_time.strftime('%H:%M:%S'),
                                    'timestamp': potential_time_out.timestamp.strftime('%H:%M:%S'),
                                    'notes': 'Found via time window search'
                                })
                
                report_data.append({
                    'date': current_date,
                    'day': current_date.strftime('%a'),
                    'status': summary.status if summary else 'absent',
                    'time_in': summary.formatted_time_in if summary else '-',
                    'time_out': summary.formatted_time_out if summary else '-',
                    'scheduled_in': summary.formatted_scheduled_in if summary else '-',
                    'scheduled_out': summary.formatted_scheduled_out if summary else '-',
                    'billed_hours': summary.formatted_billed_minutes if summary else '-',
                    'late_minutes': summary.formatted_late_minutes if summary else '-',
                    'undertime_minutes': summary.formatted_undertime_minutes if summary else '-',
                    'night_differential': summary.formatted_night_differential if summary else '-',
                    'time_entries': time_entries_data,  # NEW: Include TimeEntry data
                })
            except Exception as e:
                logger.warning(f"Error creating report record for {current_date}: {str(e)}")
                # Create a fallback record
                report_data.append({
                    'date': current_date,
                    'day': current_date.strftime('%a'),
                    'status': 'absent',
                    'time_in': '-',
                    'time_out': '-',
                    'scheduled_in': '-',
                    'scheduled_out': '-',
                    'billed_hours': '-',
                    'late_minutes': '-',
                    'undertime_minutes': '-',
                    'night_differential': '-',
                })
            
            current_date += timedelta(days=1)
        
        logger.info(f"Generated report with {len(report_data)} daily records, {days_worked} days worked")
        
        return {
            'employee': {
                'id': employee.id,
                'name': employee.full_name,
                'employee_id': employee.employee_id,
                'department': employee.department.name if employee.department else 'N/A',
            },
            'period': {
                'start_date': start_date,
                'end_date': end_date,
            },
            'summary': {
                'days_worked': days_worked,
                'total_billed_hours': int(total_billed_hours * 60),  # Convert to minutes
                'total_late_minutes': total_late_minutes,
                'total_undertime_minutes': total_undertime_minutes,
                'total_night_differential': round(total_night_differential, 2),
            },
            'daily_records': report_data
        }
    except Exception as e:
        logger.error(f"Error in get_employee_time_attendance_report: {str(e)}", exc_info=True)
        raise 


def get_employee_schedule_report(employee, start_date, end_date):
    """
    Get a schedule report for an employee for a date range.
    Returns data formatted for the frontend schedule report table.
    
    Args:
        employee: Employee instance
        start_date: Start date for report
        end_date: End date for report
    
    Returns:
        list: List of schedule report objects
    """
    from .models import EmployeeSchedule, DailyTimeSummary
    from datetime import date, timedelta
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Starting schedule report generation for employee {employee.employee_id} from {start_date} to {end_date}")
        
        # Get all schedules for the period
        schedules = EmployeeSchedule.objects.filter(
            employee=employee,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')
        
        logger.info(f"Found {schedules.count()} schedules for the period")
        
        # Convert to report format
        report_data = []
        
        for schedule in schedules:
            try:
                # Get corresponding daily summary if available
                try:
                    summary = DailyTimeSummary.objects.get(employee=employee, date=schedule.date)
                    actual_start = summary.time_in
                    actual_end = summary.time_out
                    status = summary.status
                except DailyTimeSummary.DoesNotExist:
                    actual_start = None
                    actual_end = None
                    status = 'scheduled'
                
                report_data.append({
                    'id': schedule.id,
                    'date': schedule.date,
                    'employee_id': employee.id,
                    'employee_name': employee.full_name,
                    'start_time': schedule.scheduled_time_in.strftime('%H:%M') if schedule.scheduled_time_in else None,
                    'end_time': schedule.scheduled_time_out.strftime('%H:%M') if schedule.scheduled_time_out else None,
                    'actual_start_time': actual_start.strftime('%H:%M') if actual_start else None,
                    'actual_end_time': actual_end.strftime('%H:%M') if actual_end else None,
                    'status': status,
                    'is_night_shift': schedule.is_night_shift,
                    'notes': schedule.notes or ''
                })
            except Exception as e:
                logger.warning(f"Error processing schedule for {schedule.date}: {str(e)}")
                # Create a fallback record
                report_data.append({
                    'id': schedule.id,
                    'date': schedule.date,
                    'employee_id': employee.id,
                    'employee_name': employee.full_name,
                    'start_time': schedule.scheduled_time_in.strftime('%H:%M') if schedule.scheduled_time_in else None,
                    'end_time': schedule.scheduled_time_out.strftime('%H:%M') if schedule.scheduled_time_out else None,
                    'actual_start_time': None,
                    'actual_end_time': None,
                    'status': 'scheduled',
                    'is_night_shift': schedule.is_night_shift,
                    'notes': schedule.notes or ''
                })
        
        logger.info(f"Generated schedule report with {len(report_data)} records")
        return report_data
        
    except Exception as e:
        logger.error(f"Error in get_employee_schedule_report: {str(e)}", exc_info=True)
        raise 


def _validate_status_assignment(summary, debug_info):
    """
    Validate that the status assignment is correct and log any anomalies.
    This helps debug issues with incorrect status assignments.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Check for potential issues
    issues = []
    
    # Issue 1: Absent status without schedule
    if summary.status == 'absent' and not debug_info['has_schedule']:
        issues.append("ABSENT status assigned but no schedule exists")
    
    # Issue 2: Not scheduled status with schedule
    if summary.status == 'not_scheduled' and debug_info['has_schedule']:
        issues.append("NOT_SCHEDULED status assigned but schedule exists")
    
    # Issue 3: Weekend status but not actually weekend
    if summary.status == 'weekend' and not debug_info['is_weekend']:
        issues.append("WEEKEND status assigned but date is not weekend")
    
    # Issue 4: Present status without time entries
    if summary.status == 'present' and not debug_info['has_time_in']:
        issues.append("PRESENT status assigned but no time_in entry")
    
    if issues:
        logger.warning(f"Status validation issues for {debug_info['employee']} on {debug_info['date']}: {', '.join(issues)}")
        logger.warning(f"Debug info: {debug_info}")
        logger.warning(f"Final status: {summary.status}")
    
    return len(issues) == 0 


def recalculate_incorrect_statuses(start_date=None, end_date=None, employee=None):
    """
    Recalculate and fix existing DailyTimeSummary records that have incorrect status assignments.
    This is useful after fixing the bug to correct existing data.
    
    Args:
        start_date: Start date for recalculation (defaults to 30 days ago)
        end_date: End date for recalculation (defaults to today)
        employee: Specific employee (optional, if None processes all employees)
    
    Returns:
        dict: Summary of fixed records
    """
    from datetime import date, timedelta
    from .models import Employee, DailyTimeSummary
    
    if start_date is None:
        start_date = date.today() - timedelta(days=30)
    if end_date is None:
        end_date = date.today()
    
    if employee:
        employees = [employee]
    else:
        employees = Employee.objects.filter(employment_status='active')
    
    fixed_count = 0
    total_processed = 0
    
    for emp in employees:
        # Get summaries that might have incorrect statuses
        summaries = DailyTimeSummary.objects.filter(
            employee=emp,
            date__gte=start_date,
            date__lte=end_date
        ).exclude(status='present').exclude(status='late')  # Only check non-present statuses
        
        for summary in summaries:
            total_processed += 1
            original_status = summary.status
            
            # Recalculate status based on current logic
            try:
                # Get schedule for this date
                try:
                    schedule = emp.schedules.get(date=summary.date)
                    has_schedule = True
                except:
                    has_schedule = False
                
                # Get time entries for this date
                time_entries = emp.time_entries.filter(
                    timestamp__date=summary.date
                ).order_by('timestamp')
                
                has_time_in = time_entries.filter(entry_type='time_in').exists()
                has_time_out = time_entries.filter(entry_type='time_out').exists()
                
                # Determine correct status
                if has_time_in and has_time_out:
                    new_status = 'present'
                elif has_time_in and not has_time_out:
                    new_status = 'present'
                elif not has_time_in and not has_time_out:
                    if summary.date > date.today():
                        new_status = 'not_scheduled'
                    elif summary.is_weekend:
                        new_status = 'weekend'
                    else:
                        if has_schedule:
                            new_status = 'absent'
                        else:
                            new_status = 'not_scheduled'
                else:
                    new_status = 'not_scheduled'
                
                # Update if status changed
                if new_status != original_status:
                    summary.status = new_status
                    summary.save()
                    fixed_count += 1
                    print(f"Fixed {emp.full_name} on {summary.date}: {original_status} -> {new_status}")
                
            except Exception as e:
                print(f"Error processing {emp.full_name} on {summary.date}: {e}")
    
    return {
        'total_processed': total_processed,
        'fixed_count': fixed_count,
        'start_date': start_date,
        'end_date': end_date
    } 