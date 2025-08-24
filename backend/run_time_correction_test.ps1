# PowerShell script to test TimeCorrection workflow
# Make sure you're in the backend directory

Write-Host "Testing TimeCorrection Workflow..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Activate virtual environment
if (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & ".venv\Scripts\Activate.ps1"
} else {
    Write-Host "Virtual environment not found at .venv\Scripts\Activate.ps1" -ForegroundColor Red
    Write-Host "Please make sure you're in the backend directory and virtual environment exists." -ForegroundColor Red
    exit 1
}

# Run the test script
Write-Host "Running TimeCorrection workflow test..." -ForegroundColor Yellow
python test_time_correction_workflow.py

Write-Host "Test completed!" -ForegroundColor Green
Write-Host "Check the output above for any errors or success messages." -ForegroundColor Cyan
