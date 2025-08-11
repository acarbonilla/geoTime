#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run August 19, 2020 Night Shift Test Case
    
.DESCRIPTION
    This script runs the test case for August 19, 2020 with a nightshift schedule:
    - Schedule: 7:00 PM - 4:00 AM (night shift)
    - Time In: 6:40 PM (early arrival)
    - Time Out: 4:10 AM (next day)
    - Calculate BH and ND with minus 1 hour break
    - Clean test - no prior schedule on this date
    
.PARAMETER None
    
.EXAMPLE
    .\run_august19_test.ps1
    
.NOTES
    Make sure you're in the backend directory and have the .venv activated
#>

Write-Host "AUGUST 19, 2020 - NIGHT SHIFT TEST CASE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Schedule: 7:00 PM - 4:00 AM (night shift)" -ForegroundColor Yellow
Write-Host "Time In: 6:40 PM (early arrival)" -ForegroundColor Yellow
Write-Host "Time Out: 4:10 AM (next day)" -ForegroundColor Yellow
Write-Host "Calculate BH and ND with minus 1 hour break" -ForegroundColor Yellow
Write-Host "Clean test - no prior schedule on this date" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "manage.py")) {
    Write-Host "Error: Please run this script from the backend directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Red
    exit 1
}

# Check if .venv exists
if (-not (Test-Path ".venv")) {
    Write-Host "Error: .venv directory not found. Please ensure virtual environment is set up." -ForegroundColor Red
    exit 1
}

# Activate virtual environment and run the test
Write-Host "Activating virtual environment and running test..." -ForegroundColor Green
Write-Host ""

try {
    # Run the test using the virtual environment's Python
    & ".venv\Scripts\python.exe" "test_august19_nightshift.py"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Test completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Test failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error running test: $_" -ForegroundColor Red
    Write-Host "Stack trace:" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
}

Write-Host ""
Write-Host "Test execution completed." -ForegroundColor Cyan
