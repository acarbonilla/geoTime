# GeoTime Production Deployment Guide

This guide provides step-by-step instructions for safely deploying your geoTime application to production.

## Prerequisites

- Production server (VPS/Cloud instance)
- Domain name configured
- SSL certificate
- PostgreSQL database
- Git repository access

## Step 1: Server Preparation

### 1.1 Update Server
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Required Software
```bash
# Install Python, Node.js, and other dependencies
sudo apt install python3 python3-pip python3-venv nodejs npm nginx postgresql postgresql-contrib git curl -y

# Install Node.js 18+ (if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 1.3 Create Application User
```bash
sudo adduser geotime
sudo usermod -aG sudo geotime
sudo su - geotime
```

## Step 2: Database Setup

### 2.1 Configure PostgreSQL
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

### 2.2 Test Database Connection
```bash
psql -h localhost -U geotime_user -d geotime_prod
```

## Step 3: Backend Deployment

### 3.1 Clone Repository
```bash
cd /home/geotime
git clone https://github.com/your-username/geoTime.git
cd geoTime/backend
```

### 3.2 Create Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 3.3 Create Production Environment File
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

### 3.4 Generate Secret Key
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3.5 Run Database Migrations
```bash
python manage.py migrate
```

### 3.6 Create Superuser
```bash
python manage.py createsuperuser
```

### 3.7 Collect Static Files
```bash
python manage.py collectstatic --noinput
```

### 3.8 Test Django Application
```bash
python manage.py runserver 0.0.0.0:8000
```

## Step 4: Frontend Deployment

### 4.1 Navigate to Frontend Directory
```bash
cd /home/geotime/geoTime/frontend
```

### 4.2 Install Dependencies
```bash
npm install
```

### 4.3 Update API Configuration
Edit `src/api.js` to point to your production backend:
```javascript
const API_BASE_URL = 'https://your-domain.com/api';
```

### 4.4 Build Production Version
```bash
npm run build
```

## Step 5: Gunicorn Configuration

### 5.1 Install Gunicorn
```bash
cd /home/geotime/geoTime/backend
source .venv/bin/activate
pip install gunicorn
```

### 5.2 Create Gunicorn Service File
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
ExecStart=/home/geotime/geoTime/backend/.venv/bin/gunicorn --workers 3 --bind unix:/home/geotime/geoTime/backend/geotime.sock backend.wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always

[Install]
WantedBy=multi-user.target
```

### 5.3 Start Gunicorn Service
```bash
sudo systemctl daemon-reload
sudo systemctl start geotime
sudo systemctl enable geotime
sudo systemctl status geotime
```

## Step 6: Nginx Configuration

### 6.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/geotime
```

Add the following content:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend (React App)
    location / {
        root /home/geotime/geoTime/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://unix:/home/geotime/geoTime/backend/geotime.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://unix:/home/geotime/geoTime/backend/geotime.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Files
    location /static/ {
        alias /home/geotime/geoTime/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Media Files (if any)
    location /media/ {
        alias /home/geotime/geoTime/backend/media/;
    }
}
```

### 6.2 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/geotime /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: SSL Certificate (Let's Encrypt)

### 7.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 7.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 7.3 Set Up Auto-renewal
```bash
sudo crontab -e
```

Add this line:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 8: Security Hardening

### 8.1 Configure Firewall
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 8.2 Update Django Settings for Production
Edit `/home/geotime/geoTime/backend/backend/settings.py`:

```python
# Security Settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = 'DENY'

# HTTPS Settings
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Session Security
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
```

### 8.3 Restart Services
```bash
sudo systemctl restart geotime
sudo systemctl restart nginx
```

## Step 9: Monitoring and Logging

### 9.1 Set Up Log Rotation
```bash
sudo nano /etc/logrotate.d/geotime
```

Add:
```
/home/geotime/geoTime/backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 geotime geotime
}
```

### 9.2 Monitor Application
```bash
# Check service status
sudo systemctl status geotime
sudo systemctl status nginx

# Check logs
sudo journalctl -u geotime -f
sudo tail -f /var/log/nginx/error.log
```

## Step 10: Backup Strategy

### 10.1 Database Backup Script
Create `/home/geotime/backup_db.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/geotime/backups"
mkdir -p $BACKUP_DIR

pg_dump -h localhost -U geotime_user geotime_prod > $BACKUP_DIR/geotime_db_$DATE.sql
gzip $BACKUP_DIR/geotime_db_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "geotime_db_*.sql.gz" -mtime +7 -delete
```

### 10.2 Set Up Automated Backups
```bash
chmod +x /home/geotime/backup_db.sh
crontab -e
```

Add:
```
0 2 * * * /home/geotime/backup_db.sh
```

## Step 11: Deployment Checklist

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

## Step 12: Post-Deployment Testing

### 12.1 Test Application Features
- User registration/login
- Time tracking functionality
- Geofencing features
- Reports generation
- Admin panel access

### 12.2 Performance Testing
```bash
# Test API endpoints
curl -X GET https://your-domain.com/api/health/
curl -X POST https://your-domain.com/api/login/ -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'
```

### 12.3 Security Testing
- Check for common vulnerabilities
- Verify HTTPS redirects
- Test CORS configuration
- Validate input sanitization

## Troubleshooting

### Common Issues:

1. **Permission Denied**: Check file permissions and ownership
2. **Database Connection**: Verify PostgreSQL configuration
3. **Static Files Not Loading**: Check STATIC_ROOT and collectstatic
4. **SSL Issues**: Verify certificate installation
5. **Service Not Starting**: Check logs with `journalctl -u geotime`

### Useful Commands:
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

## Maintenance

### Regular Tasks:
1. **Weekly**: Check logs for errors
2. **Monthly**: Update system packages
3. **Quarterly**: Review security settings
4. **Annually**: Renew SSL certificates

### Update Process:
1. Pull latest code from repository
2. Update dependencies
3. Run migrations
4. Restart services
5. Test functionality

This deployment guide ensures a secure, scalable, and maintainable production environment for your geoTime application. 