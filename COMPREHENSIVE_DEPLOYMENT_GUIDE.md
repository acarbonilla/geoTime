# GeoTime Comprehensive Deployment Guide

This guide provides complete instructions for deploying and maintaining your geoTime application in production, covering both initial setup and ongoing maintenance.

## 🏠 Production Server Information

### Current Production Environment
- **Domain**: iais.online, www.iais.online
- **Server Location**: /opt/geoTime
- **IP Address**: 178.128.18.58
- **Server Type**: VPS/Cloud instance
- **Deployment Date**: [To be filled when deployed]

### Server Access
- **SSH Access**: `ssh user@178.128.18.58`
- **Application Directory**: `/opt/geoTime`
- **Backend Directory**: `/opt/geoTime/backend`
- **Frontend Directory**: `/opt/geoTime/frontend`

### Environment Details
- **Python Version**: 3.x
- **Node.js Version**: 18+
- **Database**: PostgreSQL
- **Web Server**: Nginx
- **Application Server**: Gunicorn
- **SSL Certificate**: Let's Encrypt (auto-renewal configured)

### Notes
- **Recorded Date**: December 2024
- **Server Status**: Production ready
- **Last Updated**: [To be filled when updated]
- **Deployment Path**: All scripts and configurations have been updated to use `/opt/geoTime` as the application directory

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Deployment](#initial-deployment)
3. [Ongoing Maintenance](#ongoing-maintenance)
4. [Troubleshooting](#troubleshooting)
5. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### For Initial Deployment
- Production server (VPS/Cloud instance)
- Domain name configured
- SSL certificate
- PostgreSQL database
- Git repository access

### For Updates
- Existing production server is running
- SSH access to the server
- Git repository access
- Backup of current production data

---

## Initial Deployment

### Step 1: Server Preparation

#### 1.1 Update Server
```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.2 Install Required Software
```bash
# Install Python, Node.js, and other dependencies
sudo apt install python3 python3-pip python3-venv nodejs npm nginx postgresql postgresql-contrib git curl -y

# Install Node.js 18+ (if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 1.3 Create Application User
```bash
sudo adduser geotime
sudo usermod -aG sudo geotime
sudo su - geotime
```

### Step 2: Database Setup

#### 2.1 Configure PostgreSQL
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE geotime_prod;
CREATE USER geotime_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE geotime_prod TO geotime_user;
ALTER USER geotime_user CREATEDB;
\q
```

#### 2.2 Test Database Connection
```bash
psql -h localhost -U geotime_user -d geotime_prod
```

### Step 3: Backend Deployment

#### 3.1 Clone Repository
```bash
cd /home/geotime
git clone https://github.com/your-username/geoTime.git
cd geoTime/backend
```

#### 3.2 Create Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### 3.3 Create Production Environment File
```bash
nano .env
```

Add the following content:
```env
DEBUG=False
SECRET_KEY=your_very_secure_secret_key_here
DATABASE_URL=postgres://geotime_user:your_secure_password@localhost:5432/geotime_prod
STATIC_URL=/static/
ALLOWED_HOSTS=your-domain.com,www.your-domain.com,your-server-ip
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

#### 3.4 Generate Secret Key
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### 3.5 Run Database Migrations
```bash
python manage.py migrate
```

#### 3.6 Create Superuser
```bash
python manage.py createsuperuser
```

#### 3.7 Collect Static Files
```bash
python manage.py collectstatic --noinput
```

### Step 4: Frontend Deployment

#### 4.1 Install Node.js Dependencies
```bash
cd /home/geotime/geoTime/frontend
npm install
```

#### 4.2 Build Production Version
```bash
npm run build
```

#### 4.3 Test Build
```bash
npm run test
```

### Step 5: Nginx Configuration

#### 5.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/geotime
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Frontend
    location / {
        root /home/geotime/geoTime/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /home/geotime/geoTime/backend/staticfiles/;
    }
}
```

#### 5.2 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/geotime /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Gunicorn Service

#### 6.1 Create Service File
```bash
sudo nano /etc/systemd/system/geotime.service
```

Add the following content:
```ini
[Unit]
Description=GeoTime Django Application
After=network.target

[Service]
User=geotime
Group=geotime
WorkingDirectory=/home/geotime/geoTime/backend
Environment="PATH=/home/geotime/geoTime/backend/.venv/bin"
ExecStart=/home/geotime/geoTime/backend/.venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 backend.wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always

[Install]
WantedBy=multi-user.target
```

#### 6.2 Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable geotime
sudo systemctl start geotime
```

### Step 7: SSL Certificate

#### 7.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### 7.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Step 8: Firewall Configuration

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Step 9: Backup Strategy

#### 9.1 Create Backup Script
```bash
nano /home/geotime/backup_db.sh
```

Add the following content:
```bash
#!/bin/bash
BACKUP_DIR="/home/geotime/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

pg_dump -h localhost -U geotime_user geotime_prod > $BACKUP_DIR/geotime_db_$DATE.sql
gzip $BACKUP_DIR/geotime_db_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "geotime_db_*.sql.gz" -mtime +7 -delete
```

#### 9.2 Set Up Automated Backups
```bash
chmod +x /home/geotime/backup_db.sh
crontab -e
```

Add:
```
0 2 * * * /home/geotime/backup_db.sh
```

---

## Ongoing Maintenance

### Pre-Update Checklist

#### 1. Create Backup
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

#### 2. Check Current Status
```bash
# Check if services are running
sudo systemctl status geotime
sudo systemctl status nginx

# Check disk space
df -h

# Check memory usage
free -h
```

### Update Process

#### Step 1: Update Code

##### 1.1 Pull Latest Changes
```bash
cd /home/geotime/geoTime
git fetch origin
git log --oneline -10  # Review recent commits
git pull origin main
```

##### 1.2 Review Changes
```bash
# Check what files have changed
git diff HEAD~1

# Check for any new dependencies
git diff HEAD~1 -- requirements.txt
git diff HEAD~1 -- package.json
```

#### Step 2: Backend Update

##### 2.1 Update Python Dependencies
```bash
cd /home/geotime/geoTime/backend
source .venv/bin/activate

# Update dependencies
pip install -r requirements.txt

# Check for any new packages
pip list --outdated
```

##### 2.2 Run Database Migrations
```bash
# Check pending migrations
python manage.py showmigrations

# Run migrations
python manage.py migrate

# Verify migration status
python manage.py showmigrations
```

##### 2.3 Update Static Files
```bash
# Collect static files
python manage.py collectstatic --noinput
```

##### 2.4 Test Backend
```bash
# Test Django configuration
python manage.py check --deploy

# Test database connection
python manage.py dbshell
# Type \q to exit
```

#### Step 3: Frontend Update

##### 3.1 Update Node.js Dependencies
```bash
cd /home/geotime/geoTime/frontend

# Update dependencies
npm install

# Check for outdated packages
npm outdated
```

##### 3.2 Build Frontend
```bash
# Build production version
npm run build

# Test build
npm run test
```

#### Step 4: Restart Services

##### 4.1 Restart Backend
```bash
sudo systemctl restart geotime
sudo systemctl status geotime
```

##### 4.2 Restart Nginx (if needed)
```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

#### Step 5: Health Checks

##### 5.1 Test Application
```bash
# Test API endpoints
curl -X GET https://your-domain.com/api/health/
curl -X POST https://your-domain.com/api/login/ -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'

# Test frontend
curl -I https://your-domain.com/
```

##### 5.2 Monitor Logs
```bash
# Check for errors
sudo journalctl -u geotime -f
sudo tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

### Common Issues

#### 1. Permission Denied
```bash
# Check file permissions and ownership
sudo chown -R geotime:geotime /home/geotime/geoTime/
sudo chmod -R 755 /home/geotime/geoTime/
```

#### 2. Database Connection Issues
```bash
# Verify PostgreSQL configuration
sudo systemctl status postgresql
psql -h localhost -U geotime_user -d geotime_prod
```

#### 3. Static Files Not Loading
```bash
# Check STATIC_ROOT and collectstatic
python manage.py collectstatic --noinput --clear
sudo chown -R geotime:geotime /home/geotime/geoTime/backend/staticfiles/
```

#### 4. SSL Issues
```bash
# Verify certificate installation
sudo certbot certificates
sudo nginx -t
```

#### 5. Service Not Starting
```bash
# Check logs
sudo journalctl -u geotime -f
sudo systemctl status geotime
```

### Update-Specific Issues

#### 1. Migration Errors
```bash
# Check migration status
python manage.py showmigrations

# Fake migrations if needed
python manage.py migrate --fake

# Reset migrations if necessary
python manage.py migrate --fake-initial
```

#### 2. Frontend Build Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Useful Commands
```bash
# Check service status
sudo systemctl status geotime nginx

# View logs
sudo journalctl -u geotime -f
sudo tail -f /var/log/nginx/error.log

# Restart services
sudo systemctl restart geotime nginx

# Check disk space
df -h

# Check memory usage
free -h
```

---

## Monitoring & Maintenance

### Performance Monitoring
```bash
# Check system resources
htop
iotop

# Check application performance
curl -w "@curl-format.txt" -o /dev/null -s "https://your-domain.com/api/"
```

### Error Monitoring
```bash
# Check for errors in logs
grep -i error /var/log/nginx/geotime_error.log
grep -i error /home/geotime/geoTime/backend/logs/django.log
```

### Regular Maintenance Tasks

#### Weekly
- Check logs for errors
- Monitor system resources
- Verify backup completion

#### Monthly
- Update system packages
- Review security settings
- Check SSL certificate expiration

#### Quarterly
- Review and update dependencies
- Performance optimization
- Security audit

#### Annually
- Renew SSL certificates
- Major version updates
- Infrastructure review

### Update Checklist

#### Pre-Update
- [ ] Backup created
- [ ] Current status documented
- [ ] Low-traffic period identified

#### During Update
- [ ] Code updated from repository
- [ ] Dependencies updated
- [ ] Database migrations applied
- [ ] Static files collected
- [ ] Frontend built
- [ ] Services restarted

#### Post-Update
- [ ] Health checks passed
- [ ] Functional testing completed
- [ ] Monitoring active
- [ ] User feedback collected

### Best Practices

1. **Always backup before updating**
2. **Test updates in staging environment first**
3. **Update during low-traffic periods**
4. **Monitor closely after updates**
5. **Have a rollback plan ready**
6. **Communicate updates to users**
7. **Document any configuration changes**
8. **Keep dependencies updated**
9. **Monitor security advisories**
10. **Regular performance reviews**

---

## Deployment Checklist

### Initial Deployment
- [ ] Server updated and secured
- [ ] Database configured and tested
- [ ] Backend deployed and running
- [ ] Frontend built and deployed
- [ ] SSL certificate installed
- [ ] Nginx configured and tested
- [ ] Firewall configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] All services running
- [ ] Application accessible via HTTPS

### Post-Deployment Testing
- [ ] User registration/login
- [ ] Time tracking functionality
- [ ] Geofencing features
- [ ] Reports generation
- [ ] Admin panel access
- [ ] Performance testing
- [ ] Security testing

This comprehensive guide ensures a secure, scalable, and maintainable production environment for your geoTime application throughout its entire lifecycle. 