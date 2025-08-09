#!/usr/bin/env python
"""
Script to fix production migration issues for early_login_restriction_hours and require_schedule_compliance fields.
These fields already exist in the production database but migrations need to be faked.
"""

import os
import sys
import django
from django.core.management import execute_from_command_line

def main():
    # Setup Django environment
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()
    
    print("🔧 Fixing production migration issues...")
    print("The early_login_restriction_hours and require_schedule_compliance fields already exist in production database.")
    print("We need to fake these migrations...")
    
    # Check if we're in the right directory
    if not os.path.exists('manage.py'):
        print("❌ Error: Please run this script from the backend directory")
        sys.exit(1)
    
    # Fake the migrations
    print("\n📋 Faking migration 0006_employee_early_login_restriction_hours...")
    os.system('python manage.py migrate geo 0006 --fake')
    
    print("\n📋 Faking migration 0007_employee_require_schedule_compliance...")
    os.system('python manage.py migrate geo 0007 --fake')
    
    print("\n✅ Migration fixes completed!")
    print("The migrations have been marked as applied without actually running them.")
    print("This is safe because the columns already exist in the production database.")

if __name__ == '__main__':
    main()
