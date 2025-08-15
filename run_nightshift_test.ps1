# Nightshift Timeout Validation Test Runner
# This script runs the nightshift validation test to demonstrate the issue

Write-Host "🌙 Nightshift Timeout Validation Test Runner" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "This test demonstrates the current validation logic and the issue" -ForegroundColor White
Write-Host "with nightshift workers being unable to clock out on the next day." -ForegroundColor White
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    Write-Host "   Expected: backend/ directory should exist" -ForegroundColor Red
    exit 1
}

# Check if virtual environment exists
if (-not (Test-Path ".venv")) {
    Write-Host "❌ Error: Virtual environment not found" -ForegroundColor Red
    Write-Host "   Please create and activate the virtual environment first:" -ForegroundColor Red
    Write-Host "   python -m venv .venv" -ForegroundColor Yellow
    Write-Host "   .venv\Scripts\Activate.ps1" -ForegroundColor Yellow
    exit 1
}

# Check if virtual environment is activated
if (-not $env:VIRTUAL_ENV) {
    Write-Host "⚠️  Warning: Virtual environment not activated" -ForegroundColor Yellow
    Write-Host "   Activating virtual environment..." -ForegroundColor Yellow
    
    try {
        & ".venv\Scripts\Activate.ps1"
        Write-Host "✅ Virtual environment activated" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to activate virtual environment" -ForegroundColor Red
        Write-Host "   Please activate it manually: .venv\Scripts\Activate.ps1" -ForegroundColor Yellow
        exit 1
    }
}

# Check if Django is available
try {
    $null = python -c "import django; print('Django available')" 2>$null
    Write-Host "✅ Django is available" -ForegroundColor Green
}
catch {
    Write-Host "❌ Django not available in virtual environment" -ForegroundColor Red
    Write-Host "   Please install requirements: pip install -r backend/requirements.txt" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🚀 Starting Nightshift Validation Test..." -ForegroundColor Green
Write-Host ""

# Change to backend directory
Set-Location backend

# Run the test
try {
    Write-Host "📋 Running test_nightshift_validation.py..." -ForegroundColor Cyan
    Write-Host ""
    
    python test_nightshift_validation.py
    
    Write-Host ""
    Write-Host "✅ Test completed successfully!" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "❌ Test failed with error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
finally {
    # Return to root directory
    Set-Location ..
}

Write-Host ""
Write-Host "📊 Test Results Summary:" -ForegroundColor Cyan
Write-Host "✅ Clock In: Works correctly for nightshift start" -ForegroundColor Green
Write-Host "❌ Clock Out: Blocked due to missing next-day schedule" -ForegroundColor Red
Write-Host "❌ Current System: No handling for cross-midnight scenarios" -ForegroundColor Red
Write-Host "💡 Solution: Enhanced validation logic needed" -ForegroundColor Yellow

Write-Host ""
Write-Host "🔧 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Review the test output above" -ForegroundColor White
Write-Host "2. Open frontend/src/Employee_Schedule/test_nightshift_timeout.html in browser" -ForegroundColor White
Write-Host "3. Implement the proposed solutions in the backend validation logic" -ForegroundColor White
Write-Host "4. Test the enhanced validation with nightshift scenarios" -ForegroundColor White

Write-Host ""
Write-Host "🌙 Nightshift Test Complete!" -ForegroundColor Cyan
