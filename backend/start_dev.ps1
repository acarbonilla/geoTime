# Development startup script for GeoTime backend
# This script activates the virtual environment and starts Django in development mode

Write-Host "Starting GeoTime Backend in Development Mode..." -ForegroundColor Green

# Activate virtual environment
if (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & ".venv\Scripts\Activate.ps1"
} else {
    Write-Host "Virtual environment not found. Please run 'python -m venv .venv' first." -ForegroundColor Red
    exit 1
}

# Set environment variable
$env:ENVIRONMENT = "development"
Write-Host "Environment set to: $env:ENVIRONMENT" -ForegroundColor Cyan

# Start Django server
Write-Host "Starting Django development server..." -ForegroundColor Yellow
python manage.py runserver 0.0.0.0:8000
