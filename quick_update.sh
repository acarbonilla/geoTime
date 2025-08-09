#!/bin/bash

# GeoTime Quick Update Script
# For minor updates that don't require full backup process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
APP_USER="geotime"
APP_DIR="/opt/geoTime"  # Updated to match production server location
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
SERVICE_NAME="geotime"

print_status() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo -e "${GREEN}Starting Quick Update...${NC}"

# Quick code update
print_status "Updating code..."
cd $APP_DIR
git pull origin main

# Quick backend update
print_status "Updating backend..."
cd $BACKEND_DIR
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Quick frontend update
print_status "Updating frontend..."
cd $FRONTEND_DIR
npm install
npm run build

# Restart services
print_status "Restarting services..."
sudo systemctl restart $SERVICE_NAME
sudo systemctl restart nginx

print_success "Quick update completed!" 