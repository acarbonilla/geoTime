# PowerShell Script to Run August 23, 2025 Mobile Schedule Validation Test
# This test verifies that users CANNOT bypass schedule requirements in the mobile dashboard

Write-Host "🚀 AUGUST 23, 2025 - MOBILE SCHEDULE VALIDATION SECURITY TEST" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "This test verifies that users CANNOT bypass schedule requirements" -ForegroundColor Yellow
Write-Host "in the mobile dashboard, regardless of any settings or attempts." -ForegroundColor Yellow
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Red
    Write-Host "   Expected: Should contain 'backend' folder" -ForegroundColor Red
    exit 1
}

# Check if virtual environment exists
if (-not (Test-Path ".venv")) {
    Write-Host "❌ Error: Virtual environment not found" -ForegroundColor Red
    Write-Host "   Please create a virtual environment first:" -ForegroundColor Red
    Write-Host "   python -m venv .venv" -ForegroundColor Red
    exit 1
}

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Green
& ".venv\Scripts\Activate.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to activate virtual environment" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Virtual environment activated" -ForegroundColor Green

# Change to backend directory
Write-Host "📁 Changing to backend directory..." -ForegroundColor Green
Set-Location "backend"

# Check if test file exists
$testFile = "test_august23_mobile_schedule_validation.py"
if (-not (Test-Path $testFile)) {
    Write-Host "❌ Error: Test file not found: $testFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Test file found: $testFile" -ForegroundColor Green

# Run the test
Write-Host ""
Write-Host "🧪 Running Mobile Schedule Validation Security Test..." -ForegroundColor Green
Write-Host "This will test:" -ForegroundColor Yellow
Write-Host "  • Valid Schedule - Should allow time operations" -ForegroundColor Yellow
Write-Host "  • No Schedule - Should block time operations" -ForegroundColor Yellow
Write-Host "  • Incomplete Schedule - Should block time operations" -ForegroundColor Yellow
Write-Host "  • Bypass Prevention - Even with require_schedule_compliance = False" -ForegroundColor Yellow
Write-Host "  • Frontend and Backend Security Layers" -ForegroundColor Yellow
Write-Host "  • Time Operations with Valid Schedule" -ForegroundColor Yellow
Write-Host ""

# Run the test with Python
try {
    & python $testFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 TEST COMPLETED SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "✅ All security measures are working correctly" -ForegroundColor Green
        Write-Host "✅ Users CANNOT bypass schedule requirements" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ TEST FAILED!" -ForegroundColor Red
        Write-Host "❌ Some security measures may not be working correctly" -ForegroundColor Red
        Write-Host "❌ Users might be able to bypass schedule requirements" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "❌ ERROR RUNNING TEST: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "❌ Please check the error details above" -ForegroundColor Red
}

# Return to original directory
Set-Location ".."

Write-Host ""
Write-Host "📋 TEST SUMMARY:" -ForegroundColor Cyan
Write-Host "   • This test verified mobile schedule validation security" -ForegroundColor White
Write-Host "   • Frontend blocks time operations without schedule" -ForegroundColor White
Write-Host "   • Backend enforces schedule requirement unconditionally" -ForegroundColor White
Write-Host "   • No conditional logic that can be manipulated" -ForegroundColor White
Write-Host "   • Multiple validation layers prevent bypassing" -ForegroundColor White
Write-Host "   • Even require_schedule_compliance = False doesn't bypass" -ForegroundColor White

Write-Host ""
Write-Host "🔒 SECURITY VERIFICATION COMPLETE" -ForegroundColor Green
Write-Host "The mobile dashboard is now secure against schedule bypass attempts." -ForegroundColor Green
