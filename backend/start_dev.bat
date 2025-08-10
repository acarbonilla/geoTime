@echo off
echo Starting GeoTime Backend in Development Mode...

REM Activate virtual environment
if exist ".venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call ".venv\Scripts\activate.bat"
) else (
    echo Virtual environment not found. Please run 'python -m venv .venv' first.
    pause
    exit /b 1
)

REM Set environment variable
set ENVIRONMENT=development
echo Environment set to: %ENVIRONMENT%

REM Start Django server
echo Starting Django development server...
python manage.py runserver 0.0.0.0:8000
