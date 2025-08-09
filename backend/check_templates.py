#!/usr/bin/env python
"""
Django shell script to check templates and test API functionality
Run this with: python manage.py shell < check_templates.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import ScheduleTemplate, Employee, User
from geo.utils import get_available_templates
from geo.serializers import ScheduleTemplateSerializer

def check_templates():
    print("=== Checking Schedule Templates ===")
    
    # Check if there are any templates in the database
    all_templates = ScheduleTemplate.objects.all()
    print(f"Total templates in database: {all_templates.count()}")
    
    if all_templates.exists():
        print("\nAll templates:")
        for template in all_templates:
            print(f"- {template.name} ({template.template_type}) - {template.time_in} to {template.time_out}")
    
    # Check if there are any employees
    employees = Employee.objects.all()
    print(f"\nTotal employees: {employees.count()}")
    
    if employees.exists():
        print("\nEmployees:")
        for emp in employees[:5]:  # Show first 5
            print(f"- {emp.user.username} ({emp.employee_id}) - {emp.department}")
    
    # Test get_available_templates function
    if employees.exists():
        employee = employees.first()
        print(f"\n=== Testing get_available_templates for {employee.user.username} ===")
        
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
        print(f"\n=== Testing serializer for template: {template.name} ===")
        
        try:
            serializer = ScheduleTemplateSerializer(template)
            data = serializer.data
            print(f"Serialized data: {data}")
        except Exception as e:
            print(f"Error serializing template: {e}")

if __name__ == "__main__":
    check_templates() 