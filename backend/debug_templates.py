#!/usr/bin/env python
"""
Debug script to check templates and API responses
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import ScheduleTemplate, Employee, User
from geo.utils import get_available_templates
from geo.serializers import ScheduleTemplateSerializer

def debug_templates():
    print("=== Debugging Templates ===")
    
    # Check all templates in database
    all_templates = ScheduleTemplate.objects.all()
    print(f"Total templates in database: {all_templates.count()}")
    
    if all_templates.exists():
        print("\nAll templates in database:")
        for template in all_templates:
            print(f"- ID: {template.id}")
            print(f"  Name: {template.name}")
            print(f"  Type: {template.template_type}")
            print(f"  Created by: {template.created_by}")
            print(f"  Team: {template.team}")
            print(f"  Is Active: {template.is_active}")
            print(f"  Time: {template.time_in} to {template.time_out}")
            print()
    
    # Check employees
    employees = Employee.objects.all()
    print(f"Total employees: {employees.count()}")
    
    if employees.exists():
        employee = employees.first()
        print(f"\nTesting with employee: {employee.user.username} (ID: {employee.id})")
        print(f"Employee department: {employee.department}")
        
        # Test get_available_templates function
        try:
            available_templates = get_available_templates(employee)
            print(f"Available templates count: {len(available_templates)}")
            
            for template in available_templates:
                print(f"- {template.name} ({template.template_type})")
        except Exception as e:
            print(f"Error getting available templates: {e}")
        
        # Test serializer
        if all_templates.exists():
            template = all_templates.first()
            print(f"\nTesting serializer for template: {template.name}")
            
            try:
                serializer = ScheduleTemplateSerializer(template)
                data = serializer.data
                print(f"Serialized data keys: {list(data.keys())}")
                print(f"Template type in serialized data: {data.get('template_type')}")
                print(f"Created by in serialized data: {data.get('created_by')}")
            except Exception as e:
                print(f"Error serializing template: {e}")
    
    # Check the viewset queryset logic
    print(f"\n=== Testing ViewSet Logic ===")
    if employees.exists():
        employee = employees.first()
        print(f"Employee: {employee.user.username}")
        print(f"Employee department: {employee.department}")
        
        # Simulate the viewset get_queryset logic
        from django.db import models
        
        # Company templates (should be visible to all)
        company_templates = ScheduleTemplate.objects.filter(
            template_type='company',
            is_active=True
        )
        print(f"Company templates: {company_templates.count()}")
        
        # Team templates (should be visible if employee is in the team)
        team_templates = ScheduleTemplate.objects.filter(
            template_type='team',
            team=employee.department,
            is_active=True
        )
        print(f"Team templates for {employee.department}: {team_templates.count()}")
        
        # Personal templates (should be visible if created by this employee)
        personal_templates = ScheduleTemplate.objects.filter(
            template_type='personal',
            created_by=employee,
            is_active=True
        )
        print(f"Personal templates for {employee.user.username}: {personal_templates.count()}")
        
        # Combined query (what the viewset should return)
        combined_templates = ScheduleTemplate.objects.filter(
            is_active=True
        ).filter(
            models.Q(template_type='company') |
            models.Q(template_type='team', team=employee.department) |
            models.Q(template_type='personal', created_by=employee)
        )
        print(f"Combined templates (viewset logic): {combined_templates.count()}")

if __name__ == "__main__":
    debug_templates() 