"""
Time Calculation Policy

Centralizes all business rules for time calculations including:
- Billed hours calculation
- Early arrival/late departure handling
- Break deductions
- Overtime calculations
- Night differential calculations
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, Tuple
from .base_policy import BasePolicy


class TimeCalculationPolicy(BasePolicy):
    """
    Policy for handling all time-related calculations and business rules.
    """
    
    def __init__(self, employee=None, context: Dict[str, Any] = None):
        super().__init__(employee, context)
        self.required_context = ['time_in', 'time_out', 'date']
    
    def apply(self, time_in: datetime, time_out: datetime, date: datetime.date, 
              scheduled_time_in: datetime.time = None, scheduled_time_out: datetime.time = None) -> Dict[str, Any]:
        """
        Apply time calculation policy and return calculated metrics.
        
        Args:
            time_in: Actual time in
            time_out: Actual time out
            date: Date of the time entry
            scheduled_time_in: Scheduled time in
            scheduled_time_out: Scheduled time out
            
        Returns:
            Dictionary containing all calculated metrics
        """
        # Validate context
        if not self.validate_context(self.required_context):
            raise ValueError("Missing required context for time calculation")
        
        # Store context for policy decisions
        self.context.update({
            'time_in': time_in,
            'time_out': time_out,
            'date': date,
            'scheduled_time_in': scheduled_time_in,
            'scheduled_time_out': scheduled_time_out
        })
        
        # Apply business rules and calculate metrics
        effective_times = self._apply_business_rules()
        billed_hours = self._calculate_billed_hours(effective_times)
        late_minutes = self._calculate_late_minutes()
        undertime_minutes = self._calculate_undertime_minutes(billed_hours)
        overtime_hours = self._calculate_overtime_hours(billed_hours)
        night_differential = self._calculate_night_differential()
        
        result = {
            'billed_hours': billed_hours,
            'late_minutes': late_minutes,
            'undertime_minutes': undertime_minutes,
            'overtime_hours': overtime_hours,
            'night_differential_hours': night_differential,
            'effective_start_time': effective_times['start'],
            'effective_end_time': effective_times['end'],
            'policy_applied': True
        }
        
        self.log_policy_decision(
            "time_calculation_completed",
            f"BH={billed_hours:.2f}h, Late={late_minutes}m, UT={undertime_minutes}m",
            **result
        )
        
        return result
    
    def _apply_business_rules(self) -> Dict[str, datetime]:
        """
        Apply business rules for early arrivals and late departures.
        
        Returns:
            Dictionary with effective start and end times
        """
        time_in = self.context['time_in']
        time_out = self.context['time_out']
        date = self.context['date']
        scheduled_time_in = self.context['scheduled_time_in']
        scheduled_time_out = self.context['scheduled_time_out']
        
        effective_start = datetime.combine(date, time_in.time())
        effective_end = datetime.combine(date, time_out.time())
        
        # Handle overnight shifts
        if effective_end < effective_start:
            effective_end += timedelta(days=1)
        
        # Apply dayshift/nightshift rules if schedule exists
        if scheduled_time_in and scheduled_time_out:
            scheduled_start = datetime.combine(date, scheduled_time_in)
            scheduled_end = datetime.combine(date, scheduled_time_out)
            
            if scheduled_end < scheduled_start:
                scheduled_end += timedelta(days=1)
            
            is_dayshift = scheduled_end > scheduled_start
            
            if is_dayshift:
                effective_start, effective_end = self._apply_dayshift_rules(
                    effective_start, effective_end, scheduled_start, scheduled_end
                )
            else:
                effective_start, effective_end = self._apply_nightshift_rules(
                    effective_start, effective_end, scheduled_start, scheduled_end
                )
        
        return {
            'start': effective_start,
            'end': effective_end
        }
    
    def _apply_dayshift_rules(self, effective_start: datetime, effective_end: datetime,
                             scheduled_start: datetime, scheduled_end: datetime) -> Tuple[datetime, datetime]:
        """
        Apply business rules specific to dayshift schedules.
        """
        # Early arrival rule: within 1 hour, round up to scheduled time
        time_diff_minutes = int((scheduled_start - effective_start).total_seconds() / 60)
        
        if time_diff_minutes > 0 and time_diff_minutes <= 60:
            effective_start = scheduled_start
            self.log_policy_decision(
                "early_arrival_rounded_up",
                f"Early arrival {time_diff_minutes} minutes, rounded to scheduled time"
            )
        elif time_diff_minutes > 60:
            self.log_policy_decision(
                "early_arrival_kept",
                f"Too early arrival {time_diff_minutes} minutes, keeping actual time"
            )
        
        # Late departure rule: round down to scheduled time (unless emergency)
        if effective_end > scheduled_end:
            time_out_diff = int((effective_end - scheduled_end).total_seconds() / 60)
            
            if time_out_diff > 120:  # More than 2 hours - potential emergency
                self.log_policy_decision(
                    "emergency_timeout_detected",
                    f"Time out {time_out_diff} minutes beyond schedule - flagged for review"
                )
                # Keep actual time for emergency situations
            else:
                effective_end = scheduled_end
                self.log_policy_decision(
                    "late_departure_rounded_down",
                    f"Late departure {time_out_diff} minutes, rounded to scheduled time"
                )
        
        return effective_start, effective_end
    
    def _apply_nightshift_rules(self, effective_start: datetime, effective_end: datetime,
                               scheduled_start: datetime, scheduled_end: datetime) -> Tuple[datetime, datetime]:
        """
        Apply business rules specific to nightshift schedules.
        """
        # Round early arrivals to scheduled start time
        if effective_start < scheduled_start:
            effective_start = scheduled_start
            self.log_policy_decision("nightshift_early_arrival_rounded", "Rounded to scheduled start")
        
        # Round late departures to scheduled end time
        if effective_end > scheduled_end:
            effective_end = scheduled_end
            self.log_policy_decision("nightshift_late_departure_rounded", "Rounded to scheduled end")
        
        return effective_start, effective_end
    
    def _calculate_billed_hours(self, effective_times: Dict[str, datetime]) -> Decimal:
        """
        Calculate billed hours based on effective times and break policies.
        """
        start = effective_times['start']
        end = effective_times['end']
        
        # Calculate total minutes worked
        total_minutes = int((end - start).total_seconds() / 60)
        
        # Apply break deduction if session is long enough
        if total_minutes >= 240:  # 4 hours or more
            break_minutes = int(self.get_setting('flexible_break_hours', 1.0) * 60)
            work_minutes = total_minutes - break_minutes
        else:
            work_minutes = total_minutes
        
        billed_hours = max(0, work_minutes) / 60
        
        self.log_policy_decision(
            "billed_hours_calculated",
            f"Total: {total_minutes}m, Break: {total_minutes - work_minutes}m, BH: {billed_hours:.2f}h"
        )
        
        return Decimal(str(billed_hours))
    
    def _calculate_late_minutes(self) -> int:
        """
        Calculate late minutes based on scheduled vs actual time in.
        """
        scheduled_time_in = self.context['scheduled_time_in']
        time_in = self.context['time_in']
        date = self.context['date']
        
        if not scheduled_time_in:
            return 0
        
        scheduled_start = datetime.combine(date, scheduled_time_in)
        actual_start = datetime.combine(date, time_in.time())
        
        late_minutes = int((actual_start - scheduled_start).total_seconds() / 60)
        grace_period = self.get_setting('grace_period_minutes', 5)
        
        if late_minutes <= grace_period:
            final_late = 0
            self.log_policy_decision("grace_period_applied", f"Within {grace_period} minute grace period")
        else:
            final_late = late_minutes - grace_period
            self.log_policy_decision("late_calculated", f"Late {final_late} minutes after grace period")
        
        return max(0, final_late)
    
    def _calculate_undertime_minutes(self, billed_hours: Decimal) -> int:
        """
        Calculate undertime minutes based on scheduled vs actual work time.
        """
        scheduled_time_in = self.context['scheduled_time_in']
        scheduled_time_out = self.context['scheduled_time_out']
        date = self.context['date']
        
        if not (scheduled_time_in and scheduled_time_out):
            # Fallback to employee's daily work hours
            daily_work_minutes = int(self.get_setting('daily_work_hours', 8.0) * 60)
            return max(0, daily_work_minutes - int(billed_hours * 60))
        
        scheduled_start = datetime.combine(date, scheduled_time_in)
        scheduled_end = datetime.combine(date, scheduled_time_out)
        
        if scheduled_end < scheduled_start:
            scheduled_end += timedelta(days=1)
        
        scheduled_duration = int((scheduled_end - scheduled_start).total_seconds() / 60)
        
        # Apply break deduction to scheduled time
        if scheduled_duration >= 240:
            break_minutes = int(self.get_setting('flexible_break_hours', 1.0) * 60)
            scheduled_work_minutes = scheduled_duration - break_minutes
        else:
            scheduled_work_minutes = scheduled_duration
        
        actual_work_minutes = int(billed_hours * 60)
        undertime_minutes = max(0, scheduled_work_minutes - actual_work_minutes)
        
        self.log_policy_decision(
            "undertime_calculated",
            f"Scheduled: {scheduled_work_minutes}m, Actual: {actual_work_minutes}m, UT: {undertime_minutes}m"
        )
        
        return undertime_minutes
    
    def _calculate_overtime_hours(self, billed_hours: Decimal) -> Decimal:
        """
        Calculate overtime hours based on employee threshold.
        """
        threshold = self.get_setting('overtime_threshold_hours', 8.0)
        
        if billed_hours > threshold:
            overtime = billed_hours - threshold
            self.log_policy_decision("overtime_calculated", f"OT: {overtime:.2f}h above {threshold}h threshold")
            return overtime
        
        return Decimal('0.00')
    
    def _calculate_night_differential(self) -> Decimal:
        """
        Calculate night differential hours based on actual time worked during ND period.
        """
        time_in = self.context['time_in']
        time_out = self.context['time_out']
        date = self.context['date']
        
        # Define ND period: 10:00 PM to 6:00 AM
        nd_start = datetime.combine(date, datetime.strptime('22:00', '%H:%M').time())
        nd_end = datetime.combine(date, datetime.strptime('06:00', '%H:%M').time())
        
        if nd_end < nd_start:
            nd_end += timedelta(days=1)
        
        # Use actual times for ND calculation
        actual_start = datetime.combine(date, time_in.time())
        actual_end = datetime.combine(date, time_out.time())
        
        if actual_end < actual_start:
            actual_end += timedelta(days=1)
        
        # Round to ND boundaries
        nd_work_start = max(actual_start, nd_start)
        nd_work_end = min(actual_end, nd_end)
        
        if nd_work_end > nd_work_start:
            total_night_minutes = int((nd_work_end - nd_work_start).total_seconds() / 60)
            total_night_hours = total_night_minutes / 60
            
            # Apply 1-hour break deduction (HR rule)
            night_differential = max(0, total_night_hours - 1.0)
            
            self.log_policy_decision(
                "night_differential_calculated",
                f"ND: {night_differential:.2f}h (total: {total_night_hours:.2f}h - 1h break)"
            )
            
            return Decimal(str(night_differential))
        
        return Decimal('0.00')
