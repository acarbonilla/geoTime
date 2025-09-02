#!/bin/bash

# Bash script to run the August 20, 2025 Night Shift Test Case
# This script runs the test case for the night shift scenario

echo "============================================================"
echo "AUGUST 20, 2025 NIGHT SHIFT TEST CASE"
echo "============================================================"

echo ""
echo "Starting test case execution..."

# Navigate to the backend directory
cd backend

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
else
    echo "Virtual environment not found. Please ensure you're in the correct directory."
    exit 1
fi

# Run the test case (now located in the backend directory)
echo ""
echo "Running August 20 night shift test case..."
python3 test_august20_nightshift.py

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Test case completed successfully!"
else
    echo ""
    echo "✗ Test case failed with exit code: $?"
fi

echo ""
echo "============================================================"
echo "TEST EXECUTION COMPLETED"
echo "============================================================"

# Return to original directory
cd ..
