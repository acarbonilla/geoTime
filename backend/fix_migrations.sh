#!/bin/bash

# Production Migration Fix Script
# This script fixes the migration issues for early_login_restriction_hours and require_schedule_compliance fields

echo "🔧 Fixing production migration issues..."
echo "The early_login_restriction_hours and require_schedule_compliance fields already exist in production database."
echo "We need to fake these migrations..."

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Fake the migrations
echo ""
echo "📋 Faking migration 0006_employee_early_login_restriction_hours..."
python manage.py migrate geo 0006 --fake

echo ""
echo "📋 Faking migration 0007_employee_require_schedule_compliance..."
python manage.py migrate geo 0007 --fake

echo ""
echo "✅ Migration fixes completed!"
echo "The migrations have been marked as applied without actually running them."
echo "This is safe because the columns already exist in the production database."

# Verify the migrations
echo ""
echo "📊 Checking migration status..."
python manage.py showmigrations geo

echo ""
echo "🎉 All done! You should now be able to run 'python manage.py migrate' without errors."
