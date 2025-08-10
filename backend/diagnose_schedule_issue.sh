#!/bin/bash

# Bash script to diagnose the schedule display issue in production
# This script checks the current state of schedule data to identify the problem

echo "🔍 Diagnosing Schedule Display Issue in Production"
echo "============================================================"

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Error: Virtual environment not found. Please ensure .venv exists."
    exit 1
fi

echo "📁 Current directory: $(pwd)"
echo "🐍 Virtual environment: .venv"

# Activate virtual environment and run the diagnostic
echo "🚀 Activating virtual environment and running diagnostic..."

# Activate virtual environment
source .venv/bin/activate

if [ $? -ne 0 ]; then
    echo "❌ Failed to activate virtual environment"
    exit 1
fi

echo "✅ Virtual environment activated successfully"

# Run the diagnostic script
echo "🔍 Running schedule display diagnostic..."
python diagnose_schedule_issue.py

if [ $? -eq 0 ]; then
    echo "✅ Diagnostic completed successfully!"
else
    echo "❌ Diagnostic failed with exit code: $?"
    exit 1
fi

# Deactivate virtual environment
deactivate
echo "🔌 Virtual environment deactivated"

echo "============================================================"
echo "🎉 Diagnostic script execution completed!"
echo "💡 Review the output above to understand the issue"
echo "🔧 If needed, run the fix script: ./fix_schedule_display.sh"
