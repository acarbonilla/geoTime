# Production Migration Fix

## Problem
The production database already has the `early_login_restriction_hours` and `require_schedule_compliance` columns, but Django migrations are trying to create them again, causing a `DuplicateColumn` error.

## Solution
We need to fake these migrations since the columns already exist.

## Commands to Run in Production

1. **Navigate to the backend directory:**
   ```bash
   cd /opt/geoTime/backend
   ```

2. **Activate the virtual environment:**
   ```bash
   source ../.venv/bin/activate
   ```

3. **Fake the migrations (mark them as applied without actually running them):**
   ```bash
   python manage.py migrate geo 0006 --fake
   ```

4. **Fake the second migration:**
   ```bash
   python manage.py migrate geo 0007 --fake
   ```

5. **Verify the migrations are applied:**
   ```bash
   python manage.py showmigrations geo
   ```

## What This Does
- `--fake` tells Django to mark the migration as applied without actually running the SQL
- This is safe because the columns already exist in the production database
- Django will update its migration tracking table to know these migrations are "done"

## Alternative Solution (if the above doesn't work)

If the fake migrations don't work, you can manually update the Django migration tracking:

1. **Connect to the database:**
   ```bash
   sudo -u postgres psql geotime_prod
   ```

2. **Check current migrations:**
   ```sql
   SELECT * FROM django_migrations WHERE app = 'geo' ORDER BY id;
   ```

3. **Insert the missing migration records:**
   ```sql
   INSERT INTO django_migrations (app, name, applied) VALUES 
   ('geo', '0006_employee_early_login_restriction_hours', NOW()),
   ('geo', '0007_employee_require_schedule_compliance', NOW());
   ```

4. **Exit the database:**
   ```sql
   \q
   ```

## Verification
After running the fix, you should be able to:
- Run `python manage.py migrate` without errors
- Add new employees through the Django admin interface
- See the new fields in the Employee model admin interface
