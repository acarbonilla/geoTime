#!/usr/bin/env python
"""
Development startup script for GeoTime backend.
This script sets the environment to development and starts the Django server.
"""
import os
import sys
import django
from django.core.management import execute_from_command_line

if __name__ == "__main__":
    # Set environment to development
    os.environ['ENVIRONMENT'] = 'development'
    
    # Add the current directory to Python path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    # Set Django settings module
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    
    # Setup Django
    django.setup()
    
    # Start the development server
    execute_from_command_line(['manage.py', 'runserver', '0.0.0.0:8000'])
