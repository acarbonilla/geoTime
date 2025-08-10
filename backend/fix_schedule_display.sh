#!/bin/bash

# Bash script to fix the schedule display issue in production
# This script regenerates daily summaries to ensure scheduled times are properly populated

echo "🔧 Fixing Schedule Display Issue in Production"
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

# Activate virtual environment and run the fix
echo "🚀 Activating virtual environment and running fix..."

# Activate virtual environment
source .venv/bin/activate

if [ $? -ne 0 ]; then
    echo "❌ Failed to activate virtual environment"
    exit 1
fi

echo "✅ Virtual environment activated successfully"

# Run the fix script
echo "🔧 Running schedule display fix..."
python fix_schedule_display.py

if [ $? -eq 0 ]; then
    echo "✅ Schedule display fix completed successfully!"
else
    echo "❌ Schedule display fix failed with exit code: $?"
    exit 1
fi

# Deactivate virtual environment
deactivate
echo "🔌 Virtual environment deactivated"

echo "============================================================"
echo "🎉 Fix script execution completed!"
echo "💡 Check the output above for any errors or warnings"
