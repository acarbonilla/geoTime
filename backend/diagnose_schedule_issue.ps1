# PowerShell script to diagnose the schedule display issue in production
# This script checks the current state of schedule data to identify the problem

Write-Host "🔍 Diagnosing Schedule Display Issue in Production" -ForegroundColor Green
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

# Activate virtual environment and run the diagnostic
Write-Host "🚀 Activating virtual environment and running diagnostic..." -ForegroundColor Cyan

# Activate virtual environment
& .\.venv\Scripts\Activate.ps1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to activate virtual environment" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Virtual environment activated successfully" -ForegroundColor Green

# Run the diagnostic script
Write-Host "🔍 Running schedule display diagnostic..." -ForegroundColor Cyan
python diagnose_schedule_issue.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Diagnostic completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Diagnostic failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

# Deactivate virtual environment
deactivate
Write-Host "🔌 Virtual environment deactivated" -ForegroundColor Yellow

Write-Host "=" * 60 -ForegroundColor Green
Write-Host "🎉 Diagnostic script execution completed!" -ForegroundColor Green
Write-Host "💡 Review the output above to understand the issue" -ForegroundColor Yellow
Write-Host "🔧 If needed, run the fix script: .\fix_schedule_display.ps1" -ForegroundColor Cyan
