# PowerShell script to fix the schedule display issue in production
# This script regenerates daily summaries to ensure scheduled times are properly populated

Write-Host "🔧 Fixing Schedule Display Issue in Production" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "manage.py")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    exit 1
}

# Check if virtual environment exists
if (-not (Test-Path ".venv")) {
    Write-Host "❌ Error: Virtual environment not found. Please ensure .venv exists." -ForegroundColor Red
    exit 1
}

Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host "🐍 Virtual environment: .venv" -ForegroundColor Yellow

# Activate virtual environment and run the fix
Write-Host "🚀 Activating virtual environment and running fix..." -ForegroundColor Cyan

# Activate virtual environment
& .\.venv\Scripts\Activate.ps1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to activate virtual environment" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Virtual environment activated successfully" -ForegroundColor Green

# Run the fix script
Write-Host "🔧 Running schedule display fix..." -ForegroundColor Cyan
python fix_schedule_display.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Schedule display fix completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Schedule display fix failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

# Deactivate virtual environment
deactivate
Write-Host "🔌 Virtual environment deactivated" -ForegroundColor Yellow

Write-Host "=" * 60 -ForegroundColor Green
Write-Host "🎉 Fix script execution completed!" -ForegroundColor Green
Write-Host "💡 Check the output above for any errors or warnings" -ForegroundColor Yellow
