# Centralized Policy System

## Overview

The centralized policy system is designed to eliminate rule inconsistencies and provide a single source of truth for all business logic in the GeoTime application. This system ensures that all business rules, permissions, and calculations are applied consistently across the entire application.

## 🎯 **Why This System?**

### **Before (Problems)**
- ❌ Business rules scattered across models, views, and utilities
- ❌ Different rules in different parts of the system
- ❌ Hard to maintain and update policies
- ❌ Inconsistent behavior across the application
- ❌ Difficult to test business logic
- ❌ Risk of policy conflicts

### **After (Benefits)**
- ✅ **Single Source of Truth** - All policies in one place
- ✅ **Consistent Behavior** - Same rules everywhere
- ✅ **Easy Maintenance** - Change once, affects everywhere
- ✅ **Better Testing** - Centralized logic is easier to test
- ✅ **Audit Trail** - All policy decisions are logged
- ✅ **Role-Based Access** - Centralized permission system

## 🏗️ **Architecture**

```
geo/policies/
├── __init__.py                 # Package initialization
├── base_policy.py             # Base class for all policies
├── time_calculation_policy.py # Time calculation business rules
├── role_policy.py             # Role-based access control
├── schedule_policy.py         # Schedule validation rules
├── overtime_policy.py         # Overtime calculation rules
├── break_policy.py            # Break time rules
├── usage_example.py           # Usage examples
└── README.md                  # This file
```

## 🔧 **Core Components**

### 1. **BasePolicy** (`base_policy.py`)
- Abstract base class for all policies
- Common functionality: logging, context validation, settings
- Ensures consistent policy structure

### 2. **TimeCalculationPolicy** (`time_calculation_policy.py`)
- **Billed Hours Calculation** - Actual time worked vs. scheduled
- **Early Arrival Rules** - Within 1 hour, round up to scheduled time
- **Late Departure Rules** - Round down to scheduled time (unless emergency)
- **Break Deductions** - Flexible break system
- **Overtime Calculations** - Based on employee thresholds
- **Night Differential** - ND period calculations with break deductions

### 3. **RolePolicy** (`role_policy.py`)
- **Role Hierarchy** - Employee → Team Leader → Supervisor → Management → IT Support
- **Permission System** - Granular permissions for each role
- **Access Control** - Who can act on whom
- **Team Management** - Department and team-based access

### 4. **SchedulePolicy** (`schedule_policy.py`)
- **Schedule Validation** - Time logic, duration limits
- **Conflict Detection** - Overlapping schedules
- **Compliance Checking** - Rest periods, weekly limits
- **Change Management** - Update/deletion rules

## 📋 **Usage Examples**

### **Basic Policy Usage**

```python
from geo.policies import TimeCalculationPolicy, RolePolicy

# Create policy instances
time_policy = TimeCalculationPolicy(employee=current_employee)
role_policy = RolePolicy(employee=current_employee)

# Apply time calculation policy
result = time_policy.apply(
    time_in=time_in_datetime,
    time_out=time_out_datetime,
    date=date,
    scheduled_time_in=scheduled_in,
    scheduled_time_out=scheduled_out
)

# Check permissions
can_approve = role_policy.apply('approve_time_corrections')
```

### **Integration in Views**

```python
def create_schedule_view(request):
    employee = request.user.employee_profile
    
    # Check permissions
    role_policy = RolePolicy(employee=employee)
    if not role_policy.apply('manage_team_schedules'):
        return JsonResponse({'error': 'Insufficient permissions'}, status=403)
    
    # Validate schedule
    schedule_policy = SchedulePolicy(employee=employee)
    validation = schedule_policy.apply('create', schedule_data)
    
    if not validation['valid']:
        return JsonResponse({'error': validation['errors']}, status=400)
    
    # Create schedule if validation passes
    # ...
```

### **Integration in Models**

```python
class EmployeeSchedule(models.Model):
    def clean(self):
        super().clean()
        
        # Use policy for validation
        schedule_policy = SchedulePolicy(employee=self.employee)
        validation = schedule_policy.apply('create', {
            'scheduled_time_in': self.scheduled_time_in,
            'scheduled_time_out': self.scheduled_time_out,
            'date': self.date
        })
        
        if not validation['valid']:
            raise ValidationError(validation['errors'])
```

## 🔄 **Migration Strategy**

### **Phase 1: Create Policies**
- ✅ Create policy classes (COMPLETED)
- ✅ Move business logic from models to policies
- ✅ Create usage examples

### **Phase 2: Integrate Policies**
- 🔄 Update models to use policies
- 🔄 Update views to use policies
- 🔄 Update utilities to use policies

### **Phase 3: Remove Old Logic**
- ⏳ Remove business logic from models
- ⏳ Remove duplicate calculations
- ⏳ Clean up old code

### **Phase 4: Testing & Validation**
- ⏳ Test all policies thoroughly
- ⏳ Validate consistency across application
- ⏳ Performance testing

## 🧪 **Testing Policies**

```python
# Test time calculation policy
def test_time_calculation_policy():
    employee = Employee.objects.create(...)
    policy = TimeCalculationPolicy(employee=employee)
    
    result = policy.apply(
        time_in=datetime(2025, 1, 1, 8, 0),  # 8:00 AM
        time_out=datetime(2025, 1, 1, 17, 0), # 5:00 PM
        date=date(2025, 1, 1),
        scheduled_time_in=time(8, 0),
        scheduled_time_out=time(17, 0)
    )
    
    assert result['billed_hours'] == Decimal('8.00')
    assert result['late_minutes'] == 0
    assert result['undertime_minutes'] == 0
```

## 📊 **Policy Decision Logging**

All policy decisions are automatically logged for audit purposes:

```python
# Policy automatically logs decisions
policy.log_policy_decision(
    "time_calculation_completed",
    f"BH={billed_hours:.2f}h, Late={late_minutes}m",
    **result
)
```

Log entries include:
- Policy name
- Decision made
- Employee context
- Reason for decision
- Additional context data

## 🚀 **Next Steps**

1. **Review Policies** - Ensure all business rules are captured
2. **Update Models** - Integrate policies into existing models
3. **Update Views** - Use policies for validation and access control
4. **Test Thoroughly** - Validate all policy combinations
5. **Document Rules** - Create comprehensive policy documentation
6. **Train Team** - Ensure developers understand the system

## 🤝 **Contributing**

When adding new business rules:

1. **Don't** add logic directly to models/views
2. **Do** create or update appropriate policies
3. **Do** add comprehensive tests
4. **Do** update this documentation
5. **Do** log all policy decisions

## 📞 **Support**

For questions about the policy system:
1. Check this README
2. Review usage examples
3. Check policy implementation
4. Ask the development team

---

**Remember: All business logic goes through policies. No exceptions!**
