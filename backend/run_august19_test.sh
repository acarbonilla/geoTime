#!/bin/bash
# AUGUST 19, 2020 - NIGHT SHIFT TEST CASE
# This script runs the test case for August 19, 2020 with a nightshift schedule:
# - Schedule: 7:00 PM - 4:00 AM (night shift)
# - Time In: 6:40 PM (early arrival)
# - Time Out: 4:10 AM (next day)
# - Calculate BH and ND with minus 1 hour break
# - Clean test - no prior schedule on this date

echo "AUGUST 19, 2020 - NIGHT SHIFT TEST CASE"
echo "============================================================"
echo "Schedule: 7:00 PM - 4:00 AM (night shift)"
echo "Time In: 6:40 PM (early arrival)"
echo "Time Out: 4:10 AM (next day)"
echo "Calculate BH and ND with minus 1 hour break"
echo "Clean test - no prior schedule on this date"
echo "============================================================"
echo ""

# Check if we're in the backend directory
if [ ! -f "manage.py" ]; then
    echo "Error: Please run this script from the backend directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Check if .venv exists
if [ ! -d ".venv" ]; then
    echo "Error: .venv directory not found. Please ensure virtual environment is set up."
    exit 1
fi

# Activate virtual environment and run the test
echo "Activating virtual environment and running test..."
echo ""

# Source the virtual environment
source .venv/bin/activate

# Run the test
python test_august19_nightshift.py

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Test completed successfully!"
else
    echo ""
    echo "❌ Test failed with exit code: $?"
fi

# Deactivate virtual environment
deactivate

echo ""
echo "Test execution completed."
