#!/bin/bash

# GeoTime Production Update Script
# This script automates the update process for existing production deployments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="geotime"
APP_USER="geotime"
APP_DIR="/opt/geoTime"  # Updated to match production server location
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
SERVICE_NAME="geotime"
DOMAIN="iais.online"  # Updated to match production domain
BACKUP_DIR="/opt/geoTime/backups"  # Updated to match production server location

echo -e "${GREEN}Starting GeoTime Production Update...${NC}"

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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Function to create backup
create_backup() {
    print_step "Creating backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p $BACKUP_DIR
    
    # Create database backup
    cd $BACKEND_DIR
    source .venv/bin/activate
    
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).json"
    print_status "Creating database backup: $BACKUP_FILE"
    
    python manage.py dumpdata > "$BACKUP_DIR/$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        print_success "Database backup created: $BACKUP_FILE"
    else
        print_error "Failed to create database backup"
        exit 1
    fi
}

# Function to check current status
check_status() {
    print_step "Checking current system status..."
    
    # Check if services are running
    if sudo systemctl is-active --quiet $SERVICE_NAME; then
        print_success "Backend service is running"
    else
        print_error "Backend service is not running"
        exit 1
    fi
    
    if sudo systemctl is-active --quiet nginx; then
        print_success "Nginx service is running"
    else
        print_error "Nginx service is not running"
        exit 1
    fi
    
    # Check disk space
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 90 ]; then
        print_error "Disk usage is high: ${DISK_USAGE}%"
        exit 1
    else
        print_success "Disk usage is acceptable: ${DISK_USAGE}%"
    fi
}

# Function to update code
update_code() {
    print_step "Updating code from repository..."
    
    cd $APP_DIR
    
    # Fetch latest changes
    print_status "Fetching latest changes..."
    git fetch origin
    
    # Show recent commits
    print_status "Recent commits:"
    git log --oneline -5
    
    # Check for conflicts
    if ! git merge-base --is-ancestor HEAD origin/main; then
        print_error "Local changes detected. Please commit or stash changes first."
        exit 1
    fi
    
    # Pull latest changes
    print_status "Pulling latest changes..."
    git pull origin main
    
    print_success "Code updated successfully"
}

# Function to update backend
update_backend() {
    print_step "Updating backend..."
    
    cd $BACKEND_DIR
    source .venv/bin/activate
    
    # Update Python dependencies
    print_status "Updating Python dependencies..."
    pip install -r requirements.txt
    
    # Check for pending migrations
    print_status "Checking for pending migrations..."
    PENDING_MIGRATIONS=$(python manage.py showmigrations --list | grep -c "\[ \]")
    
    if [ $PENDING_MIGRATIONS -gt 0 ]; then
        print_status "Found $PENDING_MIGRATIONS pending migrations"
        
        # Run migrations
        print_status "Running database migrations..."
        python manage.py migrate
        
        if [ $? -eq 0 ]; then
            print_success "Migrations completed successfully"
        else
            print_error "Migration failed"
            exit 1
        fi
    else
        print_success "No pending migrations"
    fi
    
    # Collect static files
    print_status "Collecting static files..."
    python manage.py collectstatic --noinput
    
    # Test Django configuration
    print_status "Testing Django configuration..."
    python manage.py check --deploy
    
    print_success "Backend updated successfully"
}

# Function to update frontend
update_frontend() {
    print_step "Updating frontend..."
    
    cd $FRONTEND_DIR
    
    # Install/update dependencies
    print_status "Installing Node.js dependencies..."
    npm install
    
    # Build frontend
    print_status "Building frontend for production..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Frontend built successfully"
    else
        print_error "Frontend build failed"
        exit 1
    fi
}

# Function to restart services
restart_services() {
    print_step "Restarting services..."
    
    # Restart backend service
    print_status "Restarting backend service..."
    sudo systemctl restart $SERVICE_NAME
    
    # Wait a moment for service to start
    sleep 5
    
    # Check service status
    if sudo systemctl is-active --quiet $SERVICE_NAME; then
        print_success "Backend service restarted successfully"
    else
        print_error "Backend service failed to restart"
        sudo systemctl status $SERVICE_NAME
        exit 1
    fi
    
    # Restart Nginx
    print_status "Restarting Nginx..."
    sudo nginx -t && sudo systemctl restart nginx
    
    if sudo systemctl is-active --quiet nginx; then
        print_success "Nginx restarted successfully"
    else
        print_error "Nginx failed to restart"
        sudo systemctl status nginx
        exit 1
    fi
}

# Function to verify update
verify_update() {
    print_step "Verifying update..."
    
    # Wait for services to fully start
    sleep 10
    
    # Test application health
    print_status "Testing application health..."
    
    if curl -f -s "https://$DOMAIN/health/" > /dev/null; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        exit 1
    fi
    
    if curl -f -s "https://$DOMAIN/api/" > /dev/null; then
        print_success "API check passed"
    else
        print_error "API check failed"
        exit 1
    fi
    
    if curl -I -s "https://$DOMAIN/" | grep -q "200 OK"; then
        print_success "Frontend check passed"
    else
        print_error "Frontend check failed"
        exit 1
    fi
    
    print_success "Update verification completed"
}

# Function to cleanup old backups
cleanup_backups() {
    print_step "Cleaning up old backups..."
    
    # Keep only last 7 days of backups
    find $BACKUP_DIR -name "backup_*.json" -mtime +7 -delete
    
    print_success "Old backups cleaned up"
}

# Main update process
main() {
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}  GeoTime Production Update${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    
    # Check if running as correct user
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root"
        exit 1
    fi
    
    if [ "$(whoami)" != "$APP_USER" ]; then
        print_error "This script should be run as $APP_USER"
        exit 1
    fi
    
    # Execute update steps
    check_status
    create_backup
    update_code
    update_backend
    update_frontend
    restart_services
    verify_update
    cleanup_backups
    
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}  Update Completed Successfully!${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    print_status "Your application is now updated and running at: https://$DOMAIN"
    print_status "Monitor the logs for any issues:"
    print_status "  Backend: sudo journalctl -u $SERVICE_NAME -f"
    print_status "  Nginx: sudo tail -f /var/log/nginx/geotime_error.log"
}

# Run main function
main "$@" 