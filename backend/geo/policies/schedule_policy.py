"""
Schedule Policy

Centralizes all business rules for schedule management including:
- Schedule validation
- Schedule conflicts
- Schedule changes
- Schedule compliance
"""

from datetime import datetime, timedelta, time
from typing import Dict, Any, List, Optional
from .base_policy import BasePolicy


class SchedulePolicy(BasePolicy):
    """
    Policy for handling all schedule-related business rules.
    """
    
    def __init__(self, employee=None, context: Dict[str, Any] = None):
        super().__init__(employee, context)
        self.required_context = []
    
    def apply(self, action: str, schedule_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Apply schedule policy for the given action.
        
        Args:
            action: Action being performed (create, update, delete, validate)
            schedule_data: Schedule data to validate
            **kwargs: Additional context
            
        Returns:
            Dictionary with validation results and any policy decisions
        """
        if action == 'create':
            return self._validate_schedule_creation(schedule_data)
        elif action == 'update':
            return self._validate_schedule_update(schedule_data)
        elif action == 'delete':
            return self._validate_schedule_deletion(schedule_data)
        elif action == 'validate':
            return self._validate_schedule_compliance(schedule_data)
        else:
            raise ValueError(f"Unknown schedule action: {action}")
    
    def _validate_schedule_creation(self, schedule_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate new schedule creation.
        
        Args:
            schedule_data: New schedule data
            
        Returns:
            Validation results
        """
        result = {
            'valid': True,
            'warnings': [],
            'errors': [],
            'policy_decisions': []
        }
        
        # Validate required fields
        required_fields = ['scheduled_time_in', 'scheduled_time_out', 'date']
        for field in required_fields:
            if field not in schedule_data or not schedule_data[field]:
                result['valid'] = False
                result['errors'].append(f"Missing required field: {field}")
        
        if not result['valid']:
            return result
        
        # Validate time logic
        time_in = schedule_data['scheduled_time_in']
        time_out = schedule_data['scheduled_time_out']
        date = schedule_data['date']
        
        # Check for overnight shift
        is_overnight = time_out < time_in
        
        # Validate shift duration
        if is_overnight:
            # Overnight shift: add 24 hours to end time for calculation
            end_time = datetime.combine(date, time_out) + timedelta(days=1)
            start_time = datetime.combine(date, time_in)
        else:
            end_time = datetime.combine(date, time_out)
            start_time = datetime.combine(date, time_in)
        
        duration_minutes = int((end_time - start_time).total_seconds() / 60)
        
        # Check minimum shift duration
        min_shift_minutes = self.get_setting('min_shift_duration_minutes', 60)
        if duration_minutes < min_shift_minutes:
            result['valid'] = False
            result['errors'].append(f"Shift too short: {duration_minutes} minutes (minimum: {min_shift_minutes})")
        
        # Check maximum shift duration
        max_shift_minutes = self.get_setting('max_shift_duration_minutes', 1440)  # 24 hours
        if duration_minutes > max_shift_minutes:
            result['valid'] = False
            result['errors'].append(f"Shift too long: {duration_minutes} minutes (maximum: {max_shift_minutes})")
        
        # Check for schedule conflicts
        conflicts = self._check_schedule_conflicts(schedule_data)
        if conflicts:
            result['warnings'].extend(conflicts)
        
        # Check compliance with employee restrictions
        compliance_issues = self._check_employee_compliance(schedule_data)
        if compliance_issues:
            result['warnings'].extend(compliance_issues)
        
        # Log policy decision
        self.log_policy_decision(
            "schedule_creation_validated",
            f"Schedule validation: {'PASSED' if result['valid'] else 'FAILED'}",
            validation_result=result
        )
        
        return result
    
    def _validate_schedule_update(self, schedule_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate schedule update.
        
        Args:
            schedule_data: Updated schedule data
            
        Returns:
            Validation results
        """
        # For updates, we need to check if the change is allowed
        result = self._validate_schedule_creation(schedule_data)
        
        # Additional validation for updates
        if 'original_schedule' in self.context:
            original = self.context['original_schedule']
            
            # Check if change is within allowed timeframe
            change_deadline_hours = self.get_setting('schedule_change_deadline_hours', 24)
            schedule_date = schedule_data['date']
            current_time = datetime.now()
            
            if schedule_date.date() <= current_time.date():
                time_until_schedule = (datetime.combine(schedule_date, time.min) - current_time).total_seconds() / 3600
                
                if time_until_schedule < change_deadline_hours:
                    result['warnings'].append(
                        f"Schedule change requested {time_until_schedule:.1f} hours before shift "
                        f"(deadline: {change_deadline_hours} hours)"
                    )
        
        return result
    
    def _validate_schedule_deletion(self, schedule_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate schedule deletion.
        
        Args:
            schedule_data: Schedule to be deleted
            
        Returns:
            Validation results
        """
        result = {
            'valid': True,
            'warnings': [],
            'errors': [],
            'policy_decisions': []
        }
        
        # Check if deletion is allowed based on timing
        schedule_date = schedule_data['date']
        current_time = datetime.now()
        
        if schedule_date.date() <= current_time.date():
            result['warnings'].append("Deleting schedule for today or past date")
            
            # Check if there are time entries for this schedule
            if 'has_time_entries' in self.context and self.context['has_time_entries']:
                result['valid'] = False
                result['errors'].append("Cannot delete schedule with existing time entries")
        
        return result
    
    def _validate_schedule_compliance(self, schedule_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate schedule compliance with company policies.
        
        Args:
            schedule_data: Schedule to validate
            
        Returns:
            Compliance validation results
        """
        result = {
            'compliant': True,
            'violations': [],
            'warnings': [],
            'policy_decisions': []
        }
        
        # Check rest period compliance
        rest_violations = self._check_rest_period_compliance(schedule_data)
        if rest_violations:
            result['compliant'] = False
            result['violations'].extend(rest_violations)
        
        # Check weekly hour limits
        weekly_violations = self._check_weekly_hour_limits(schedule_data)
        if weekly_violations:
            result['warnings'].extend(weekly_violations)
        
        # Check consecutive day limits
        consecutive_violations = self._check_consecutive_day_limits(schedule_data)
        if consecutive_violations:
            result['warnings'].extend(consecutive_violations)
        
        return result
    
    def _check_schedule_conflicts(self, schedule_data: Dict[str, Any]) -> List[str]:
        """
        Check for schedule conflicts.
        
        Args:
            schedule_data: Schedule data to check
            
        Returns:
            List of conflict warnings
        """
        conflicts = []
        
        # This would typically check against existing schedules in the database
        # For now, we'll return a placeholder
        if 'check_conflicts' in self.context and self.context['check_conflicts']:
            conflicts.append("Schedule conflict check would be performed here")
        
        return conflicts
    
    def _check_employee_compliance(self, schedule_data: Dict[str, Any]) -> List[str]:
        """
        Check if schedule complies with employee-specific restrictions.
        
        Args:
            schedule_data: Schedule data to check
            
        Returns:
            List of compliance warnings
        """
        warnings = []
        
        if not self.employee:
            return warnings
        
        # Check if employee requires schedule compliance
        if hasattr(self.employee, 'require_schedule_compliance') and self.employee.require_schedule_compliance:
            # Additional compliance checks could go here
            pass
        
        return warnings
    
    def _check_rest_period_compliance(self, schedule_data: Dict[str, Any]) -> List[str]:
        """
        Check rest period compliance.
        
        Args:
            schedule_data: Schedule data to check
            
        Returns:
            List of rest period violations
        """
        violations = []
        
        # Check minimum rest period between shifts
        min_rest_hours = self.get_setting('min_rest_period_hours', 8)
        
        # This would typically check against other schedules
        # For now, we'll return a placeholder
        if 'check_rest_periods' in self.context and self.context['check_rest_periods']:
            violations.append("Rest period compliance check would be performed here")
        
        return violations
    
    def _check_weekly_hour_limits(self, schedule_data: Dict[str, Any]) -> List[str]:
        """
        Check weekly hour limits.
        
        Args:
            schedule_data: Schedule data to check
            
        Returns:
            List of weekly hour warnings
        """
        warnings = []
        
        # Check maximum weekly hours
        max_weekly_hours = self.get_setting('max_weekly_hours', 40)
        
        # This would typically calculate total hours for the week
        # For now, we'll return a placeholder
        if 'check_weekly_hours' in self.context and self.context['check_weekly_hours']:
            warnings.append("Weekly hour limit check would be performed here")
        
        return warnings
    
    def _check_consecutive_day_limits(self, schedule_data: Dict[str, Any]) -> List[str]:
        """
        Check consecutive day limits.
        
        Args:
            schedule_data: Schedule data to check
            
        Returns:
            List of consecutive day warnings
        """
        warnings = []
        
        # Check maximum consecutive work days
        max_consecutive_days = self.get_setting('max_consecutive_work_days', 6)
        
        # This would typically check against other schedules
        # For now, we'll return a placeholder
        if 'check_consecutive_days' in self.context and self.context['check_consecutive_days']:
            warnings.append("Consecutive day limit check would be performed here")
        
        return warnings
