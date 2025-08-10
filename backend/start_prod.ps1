# Production startup script for GeoTime backend
# This script activates the virtual environment and starts Django in production mode

Write-Host "Starting GeoTime Backend in Production Mode..." -ForegroundColor Green

# Activate virtual environment
if (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & ".venv\Scripts\Activate.ps1"
} else {
    Write-Host "Virtual environment not found. Please run 'python -m venv .venv' first." -ForegroundColor Red
    exit 1
}

# Set environment variable
$env:ENVIRONMENT = "production"
Write-Host "Environment set to: $env:ENVIRONMENT" -ForegroundColor Cyan

# Start Django server with gunicorn (production)
Write-Host "Starting Django production server with gunicorn..." -ForegroundColor Yellow
gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 3
