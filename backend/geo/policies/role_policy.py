"""
Role-Based Access Control Policy

Centralizes all role-based permissions and access control logic for the system.
"""

from typing import Dict, Any, List, Optional
from .base_policy import BasePolicy


class RolePolicy(BasePolicy):
    """
    Policy for handling role-based access control and permissions.
    """
    
    # Define role hierarchy and permissions
    ROLE_HIERARCHY = {
        'employee': 1,
        'team_leader': 2,
        'supervisor': 3,
        'management': 4,
        'it_support': 5
    }
    
    # Define permissions for each role
    ROLE_PERMISSIONS = {
        'employee': [
            'view_own_time_entries',
            'create_time_entries',
            'edit_own_time_entries',
            'view_own_schedule',
            'request_time_corrections',
            'request_schedule_changes',
            'request_leave',
            'request_overtime'
        ],
        'team_leader': [
            'view_own_time_entries',
            'create_time_entries',
            'edit_own_time_entries',
            'view_own_schedule',
            'request_time_corrections',
            'request_schedule_changes',
            'request_leave',
            'request_overtime',
            'view_team_data',
            'approve_time_corrections',
            'approve_schedule_changes',
            'approve_leave_requests',
            'approve_overtime_requests',
            'view_team_reports',
            'manage_team_schedules'
        ],
        'supervisor': [
            'view_own_time_entries',
            'create_time_entries',
            'edit_own_time_entries',
            'view_own_schedule',
            'request_time_corrections',
            'request_schedule_changes',
            'request_leave',
            'request_overtime',
            'view_team_data',
            'view_department_data',
            'approve_time_corrections',
            'approve_schedule_changes',
            'approve_leave_requests',
            'approve_overtime_requests',
            'view_team_reports',
            'view_department_reports',
            'manage_team_schedules',
            'manage_department_schedules',
            'override_policies'
        ],
        'management': [
            'view_own_time_entries',
            'create_time_entries',
            'edit_own_time_entries',
            'view_own_schedule',
            'request_time_corrections',
            'request_schedule_changes',
            'request_leave',
            'request_overtime',
            'view_team_data',
            'view_department_data',
            'view_company_data',
            'approve_time_corrections',
            'approve_schedule_changes',
            'approve_leave_requests',
            'approve_overtime_requests',
            'view_team_reports',
            'view_department_reports',
            'view_company_reports',
            'manage_team_schedules',
            'manage_department_schedules',
            'manage_company_schedules',
            'override_policies',
            'manage_employees',
            'configure_system_settings'
        ],
        'it_support': [
            'view_own_time_entries',
            'create_time_entries',
            'edit_own_time_entries',
            'view_own_schedule',
            'request_time_corrections',
            'request_schedule_changes',
            'request_leave',
            'request_overtime',
            'view_team_data',
            'view_department_data',
            'view_company_data',
            'approve_time_corrections',
            'approve_schedule_changes',
            'approve_leave_requests',
            'approve_overtime_requests',
            'view_team_reports',
            'view_department_reports',
            'view_company_reports',
            'manage_team_schedules',
            'manage_department_schedules',
            'manage_company_schedules',
            'override_policies',
            'manage_employees',
            'configure_system_settings',
            'access_admin_panel',
            'manage_system_users',
            'view_system_logs',
            'perform_system_maintenance'
        ]
    }
    
    def __init__(self, employee=None, context: Dict[str, Any] = None):
        super().__init__(employee, context)
        self.required_context = []
    
    def apply(self, action: str, target_employee=None, **kwargs) -> bool:
        """
        Apply role-based access control policy.
        
        Args:
            action: Action being performed
            target_employee: Target employee for the action (if applicable)
            **kwargs: Additional context
            
        Returns:
            True if action is allowed, False otherwise
        """
        if not self.employee:
            self.log_policy_decision("access_denied", "No employee context provided")
            return False
        
        # Check if employee has the required permission
        if not self._has_permission(action):
            self.log_policy_decision(
                "access_denied", 
                f"Employee {self.employee.employee_id} lacks permission: {action}"
            )
            return False
        
        # Check if employee can perform action on target
        if target_employee and not self._can_act_on_target(action, target_employee):
            self.log_policy_decision(
                "access_denied",
                f"Employee {self.employee.employee_id} cannot perform {action} on {target_employee.employee_id}"
            )
            return False
        
        # Log successful access
        self.log_policy_decision(
            "access_granted",
            f"Employee {self.employee.employee_id} granted access to {action}",
            target_employee_id=getattr(target_employee, 'employee_id', None)
        )
        
        return True
    
    def _has_permission(self, action: str) -> bool:
        """
        Check if employee has the required permission.
        
        Args:
            action: Action to check permission for
            
        Returns:
            True if employee has permission, False otherwise
        """
        role = self.employee.role
        if role not in self.ROLE_PERMISSIONS:
            return False
        
        return action in self.ROLE_PERMISSIONS[role]
    
    def _can_act_on_target(self, action: str, target_employee) -> bool:
        """
        Check if employee can perform action on target employee.
        
        Args:
            action: Action being performed
            target_employee: Target employee
            
        Returns:
            True if action is allowed on target, False otherwise
        """
        # Employees can only act on themselves
        if self.employee.role == 'employee':
            return self.employee.id == target_employee.id
        
        # Team leaders can act on their team members
        if self.employee.role == 'team_leader':
            return self._is_team_member(target_employee)
        
        # Supervisors can act on their department
        if self.employee.role == 'supervisor':
            return self._is_in_same_department(target_employee)
        
        # Management and IT support can act on anyone
        if self.employee.role in ['management', 'it_support']:
            return True
        
        return False
    
    def _is_team_member(self, target_employee) -> bool:
        """
        Check if target employee is a member of the current employee's team.
        
        Args:
            target_employee: Target employee to check
            
        Returns:
            True if target is a team member, False otherwise
        """
        # Check if current employee leads any departments
        led_departments = self.employee.led_departments.all()
        
        for dept in led_departments:
            if target_employee.department == dept:
                return True
        
        return False
    
    def _is_in_same_department(self, target_employee) -> bool:
        """
        Check if target employee is in the same department.
        
        Args:
            target_employee: Target employee to check
            
        Returns:
            True if in same department, False otherwise
        """
        return self.employee.department == target_employee.department
    
    def get_effective_role(self) -> str:
        """
        Get the effective role of the employee.
        
        Returns:
            Role string
        """
        return self.employee.role
    
    def get_role_level(self) -> int:
        """
        Get the numeric level of the employee's role.
        
        Returns:
            Role level (higher number = higher authority)
        """
        role = self.employee.role
        return self.ROLE_HIERARCHY.get(role, 0)
    
    def can_override_policies(self) -> bool:
        """
        Check if employee can override system policies.
        
        Returns:
            True if can override, False otherwise
        """
        return self._has_permission('override_policies')
    
    def can_manage_employees(self) -> bool:
        """
        Check if employee can manage other employees.
        
        Returns:
            True if can manage, False otherwise
        """
        return self._has_permission('manage_employees')
    
    def can_view_company_data(self) -> bool:
        """
        Check if employee can view company-wide data.
        
        Returns:
            True if can view, False otherwise
        """
        return self._has_permission('view_company_data')
    
    def get_accessible_employees(self) -> List:
        """
        Get list of employees that the current employee can access.
        
        Returns:
            List of accessible employees
        """
        from ..models import Employee
        
        if self.employee.role == 'employee':
            return [self.employee]
        
        if self.employee.role == 'team_leader':
            # Return team members
            led_departments = self.employee.led_departments.all()
            return Employee.objects.filter(department__in=led_departments)
        
        if self.employee.role == 'supervisor':
            # Return department employees
            return Employee.objects.filter(department=self.employee.department)
        
        if self.employee.role in ['management', 'it_support']:
            # Return all employees
            return Employee.objects.all()
        
        return []
