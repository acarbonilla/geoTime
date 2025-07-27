#!/bin/bash

# GeoTime Deployment Script
# This script automates the deployment process for the geoTime application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="geotime"
APP_USER="geotime"
APP_DIR="/home/$APP_USER/geoTime"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
SERVICE_NAME="geotime"
DOMAIN="your-domain.com"  # Change this to your actual domain

echo -e "${GREEN}Starting GeoTime Deployment...${NC}"

# Function to print status messages
print_status() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check if user exists
if ! id "$APP_USER" &>/dev/null; then
    print_error "User $APP_USER does not exist. Please create the user first."
    exit 1
fi

# Step 1: Update code from repository
print_status "Updating code from repository..."
cd $APP_DIR
git pull origin main

# Step 2: Backend deployment
print_status "Deploying backend..."
cd $BACKEND_DIR

# Activate virtual environment
source .venv/bin/activate

# Install/update dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt

# Run database migrations
print_status "Running database migrations..."
python manage.py migrate

# Collect static files
print_status "Collecting static files..."
python manage.py collectstatic --noinput

# Step 3: Frontend deployment
print_status "Deploying frontend..."
cd $FRONTEND_DIR

# Install/update dependencies
print_status "Installing Node.js dependencies..."
npm install

# Build production version
print_status "Building frontend for production..."
npm run build

# Step 4: Restart services
print_status "Restarting services..."
sudo systemctl restart $SERVICE_NAME
sudo systemctl restart nginx

# Step 5: Check service status
print_status "Checking service status..."
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    print_success "Backend service is running"
else
    print_error "Backend service failed to start"
    sudo systemctl status $SERVICE_NAME
    exit 1
fi

if sudo systemctl is-active --quiet nginx; then
    print_success "Nginx service is running"
else
    print_error "Nginx service failed to start"
    sudo systemctl status nginx
    exit 1
fi

# Step 6: Health check
print_status "Performing health check..."
sleep 5  # Wait for services to fully start

# Test if the application is responding
if curl -f -s "https://$DOMAIN/api/" > /dev/null; then
    print_success "Application is responding correctly"
else
    print_error "Application health check failed"
    exit 1
fi

print_success "Deployment completed successfully!"
print_status "Your application is now live at: https://$DOMAIN" 