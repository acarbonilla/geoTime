from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Tuple, Optional
from django.utils import timezone
from .models import TimeEntry, WorkSession, Employee


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
        today = timezone.now().date()
        # Debug: print all time entries for today
        today_entries = TimeEntry.objects.filter(employee=self.employee, timestamp__date=today).order_by('timestamp')
        print(f"[DEBUG] Today's date (backend): {today}")
        print(f"[DEBUG] TimeEntry timestamps for today:")
        for entry in today_entries:
            print(f"  - {entry.entry_type} at {entry.timestamp} (UTC)")
        today_analysis = self.analyze_daily_sessions(today)
        
        # Get current active session
        active_session = None
        last_entry = TimeEntry.objects.filter(
            employee=self.employee,
            timestamp__date=today
        ).order_by('-timestamp').first()
        
        if last_entry and last_entry.entry_type == 'time_in':
            # Calculate current session duration
            current_duration = (timezone.now() - last_entry.timestamp).total_seconds() / 3600
            total_hours_today = today_analysis['total_hours'] + current_duration
            
            # Calculate actual work hours including current session
            # All time counts as work time for overtime calculation
            actual_work_hours = total_hours_today
            
            active_session = {
                'start_time': last_entry.timestamp,
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