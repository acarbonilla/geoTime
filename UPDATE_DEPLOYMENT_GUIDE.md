# GeoTime Production Update Guide

This guide provides step-by-step instructions for safely updating your existing geoTime production deployment.

## Prerequisites

- Existing production server is running
- SSH access to the server
- Git repository access
- Backup of current production data

## Pre-Update Checklist

### 1. Create Backup
```bash
# Connect to your production server
ssh user@your-server-ip

# Create database backup
cd /home/geotime/geoTime/backend
source .venv/bin/activate
python manage.py dumpdata > backup_$(date +%Y%m%d_%H%M%S).json

# Or use the backup script if you have one
/home/geotime/backup_db.sh
```

### 2. Check Current Status
```bash
# Check if services are running
sudo systemctl status geotime
sudo systemctl status nginx

# Check disk space
df -h

# Check memory usage
free -h
```

## Step 1: Update Code

### 1.1 Pull Latest Changes
```bash
cd /home/geotime/geoTime
git fetch origin
git log --oneline -10  # Review recent commits
git pull origin main
```

### 1.2 Review Changes
```bash
# Check what files have changed
git diff HEAD~1

# Check for any new dependencies
git diff HEAD~1 -- requirements.txt
git diff HEAD~1 -- package.json
```

## Step 2: Backend Update

### 2.1 Update Python Dependencies
```bash
cd /home/geotime/geoTime/backend
source .venv/bin/activate

# Update dependencies
pip install -r requirements.txt

# Check for any new packages
pip list --outdated
```

### 2.2 Run Database Migrations
```bash
# Check pending migrations
python manage.py showmigrations

# Run migrations
python manage.py migrate

# Verify migration status
python manage.py showmigrations
```

### 2.3 Update Static Files
```bash
# Collect static files
python manage.py collectstatic --noinput
```

### 2.4 Test Backend
```bash
# Test Django configuration
python manage.py check --deploy

# Test database connection
python manage.py dbshell
# Type \q to exit
```

## Step 3: Frontend Update

### 3.1 Update Node.js Dependencies
```bash
cd /home/geotime/geoTime/frontend

# Install/update dependencies
npm install

# Check for outdated packages
npm outdated
```

### 3.2 Build Frontend
```bash
# Build production version
npm run build

# Verify build output
ls -la build/
```

## Step 4: Service Restart

### 4.1 Restart Backend Service
```bash
# Restart Gunicorn service
sudo systemctl restart geotime

# Check service status
sudo systemctl status geotime

# Check logs for any errors
sudo journalctl -u geotime -f --no-pager -n 50
```

### 4.2 Restart Nginx
```bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx
```

## Step 5: Post-Update Verification

### 5.1 Health Check
```bash
# Test application health
curl -f https://your-domain.com/health/
curl -f https://your-domain.com/api/

# Check if frontend loads
curl -I https://your-domain.com/
```

### 5.2 Functional Testing
Test the following features:
- User login/logout
- Time tracking functionality
- Geofencing features
- Reports generation
- Admin panel access

### 5.3 Monitor Logs
```bash
# Monitor application logs
sudo journalctl -u geotime -f

# Monitor Nginx logs
sudo tail -f /var/log/nginx/geotime_error.log
sudo tail -f /var/log/nginx/geotime_access.log
```

## Step 6: Rollback Plan (If Needed)

### 6.1 Quick Rollback
If issues occur, you can quickly rollback:

```bash
# Revert to previous commit
cd /home/geotime/geoTime
git reset --hard HEAD~1

# Restart services
sudo systemctl restart geotime
sudo systemctl restart nginx

# Restore database if needed
python manage.py loaddata backup_YYYYMMDD_HHMMSS.json
```

### 6.2 Database Rollback
```bash
# If migrations caused issues, you can rollback specific migrations
python manage.py migrate geo 0001  # Rollback to specific migration
```

## Automated Update Script

Use the provided `update.sh` script for automated updates:

```bash
# Make script executable
chmod +x /home/geotime/geoTime/update.sh

# Run update
./update.sh
```

## Monitoring After Update

### 1. Performance Monitoring
```bash
# Check system resources
htop
iotop

# Check application performance
curl -w "@curl-format.txt" -o /dev/null -s "https://your-domain.com/api/"
```

### 2. Error Monitoring
```bash
# Check for errors in logs
grep -i error /var/log/nginx/geotime_error.log
grep -i error /home/geotime/geoTime/backend/logs/django.log
```

### 3. User Feedback
Monitor user reports and application metrics for any issues.

## Update Checklist

- [ ] Backup created
- [ ] Code updated from repository
- [ ] Dependencies updated
- [ ] Database migrations applied
- [ ] Static files collected
- [ ] Frontend built
- [ ] Services restarted
- [ ] Health checks passed
- [ ] Functional testing completed
- [ ] Monitoring active

## Troubleshooting Common Update Issues

### 1. Migration Errors
```bash
# Check migration status
python manage.py showmigrations

# Fake migrations if needed
python manage.py migrate --fake

# Reset migrations if necessary
python manage.py migrate --fake-initial
```

### 2. Static Files Not Loading
```bash
# Recollect static files
python manage.py collectstatic --noinput --clear

# Check file permissions
sudo chown -R geotime:geotime /home/geotime/geoTime/backend/staticfiles/
```

### 3. Service Won't Start
```bash
# Check service logs
sudo journalctl -u geotime -n 100

# Check configuration
python manage.py check --deploy

# Test Gunicorn manually
cd /home/geotime/geoTime/backend
source .venv/bin/activate
gunicorn --bind 127.0.0.1:8000 backend.wsgi:application
```

### 4. Frontend Build Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Best Practices for Updates

1. **Always backup before updating**
2. **Test updates in staging environment first**
3. **Update during low-traffic periods**
4. **Monitor closely after updates**
5. **Have a rollback plan ready**
6. **Communicate updates to users**
7. **Document any configuration changes**

This update process ensures minimal downtime and safe deployment of your geoTime application updates. 