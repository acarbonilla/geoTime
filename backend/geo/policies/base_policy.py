"""
Base Policy Class

All policies should inherit from this base class to ensure consistent structure
and common functionality across the policy system.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class BasePolicy(ABC):
    """
    Base class for all policies in the system.
    
    Provides common functionality and ensures consistent policy structure.
    """
    
    def __init__(self, employee=None, context: Dict[str, Any] = None):
        """
        Initialize policy with employee and context.
        
        Args:
            employee: Employee instance for employee-specific policies
            context: Additional context data for policy decisions
        """
        self.employee = employee
        self.context = context or {}
        self.logger = logger
        
    def log_policy_decision(self, decision: str, reason: str = None, **kwargs):
        """
        Log policy decisions for audit and debugging purposes.
        
        Args:
            decision: The decision made by the policy
            reason: Reason for the decision
            **kwargs: Additional context data
        """
        log_data = {
            'policy': self.__class__.__name__,
            'decision': decision,
            'employee_id': getattr(self.employee, 'employee_id', None) if self.employee else None,
            'reason': reason,
            **kwargs
        }
        
        self.logger.info(f"Policy Decision: {log_data}")
        
    def validate_context(self, required_keys: List[str]) -> bool:
        """
        Validate that required context keys are present.
        
        Args:
            required_keys: List of required context keys
            
        Returns:
            True if all required keys are present, False otherwise
        """
        missing_keys = [key for key in required_keys if key not in self.context]
        if missing_keys:
            self.logger.warning(f"Missing required context keys: {missing_keys}")
            return False
        return True
    
    def get_setting(self, key: str, default: Any = None) -> Any:
        """
        Get a setting value, with fallback to employee-specific settings.
        
        Args:
            key: Setting key to retrieve
            default: Default value if setting not found
            
        Returns:
            Setting value or default
        """
        # First try to get from employee-specific settings
        if self.employee and hasattr(self.employee, key):
            return getattr(self.employee, key)
        
        # Fall back to Django settings
        return getattr(settings, key, default)
    
    @abstractmethod
    def apply(self, *args, **kwargs) -> Any:
        """
        Apply the policy logic. Must be implemented by subclasses.
        
        Returns:
            Policy result
        """
        pass
    
    def __str__(self):
        return f"{self.__class__.__name__}(employee={getattr(self.employee, 'employee_id', 'None')})"
    
    def __repr__(self):
        return self.__str__()
