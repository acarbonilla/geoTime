# PowerShell script to run the August 20, 2025 Night Shift Test Case
# This script runs the test case for the night shift scenario

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "AUGUST 20, 2025 NIGHT SHIFT TEST CASE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "`nStarting test case execution..." -ForegroundColor Yellow

# Navigate to the backend directory
Set-Location "backend"

# Activate virtual environment if it exists
if (Test-Path ".venv") {
    Write-Host "Activating virtual environment..." -ForegroundColor Green
    & ".venv\Scripts\Activate.ps1"
} else {
    Write-Host "Virtual environment not found. Please ensure you're in the correct directory." -ForegroundColor Red
    exit 1
}

# Run the test case (now located in the backend directory)
Write-Host "`nRunning August 20 night shift test case..." -ForegroundColor Green
python "test_august20_nightshift.py"

# Check exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Test case completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n✗ Test case failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "TEST EXECUTION COMPLETED" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Return to original directory
Set-Location ".."
