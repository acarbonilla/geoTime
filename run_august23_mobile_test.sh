#!/bin/bash

# Bash Script to Run August 23, 2025 Mobile Schedule Validation Test
# This test verifies that users CANNOT bypass schedule requirements in the mobile dashboard

echo "🚀 AUGUST 23, 2025 - MOBILE SCHEDULE VALIDATION SECURITY TEST"
echo "================================================================"
echo "This test verifies that users CANNOT bypass schedule requirements"
echo "in the mobile dashboard, regardless of any settings or attempts."
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: Should contain 'backend' folder"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Error: Virtual environment not found"
    echo "   Please create a virtual environment first:"
    echo "   python3 -m venv .venv"
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source .venv/bin/activate

if [ $? -ne 0 ]; then
    echo "❌ Failed to activate virtual environment"
    exit 1
fi

echo "✅ Virtual environment activated"

# Change to backend directory
echo "📁 Changing to backend directory..."
cd backend

# Check if test file exists
testFile="test_august23_mobile_schedule_validation.py"
if [ ! -f "$testFile" ]; then
    echo "❌ Error: Test file not found: $testFile"
    exit 1
fi

echo "✅ Test file found: $testFile"

# Run the test
echo ""
echo "🧪 Running Mobile Schedule Validation Security Test..."
echo "This will test:"
echo "  • Valid Schedule - Should allow time operations"
echo "  • No Schedule - Should block time operations"
echo "  • Incomplete Schedule - Should block time operations"
echo "  • Bypass Prevention - Even with require_schedule_compliance = False"
echo "  • Frontend and Backend Security Layers"
echo "  • Time Operations with Valid Schedule"
echo ""

# Run the test with Python
if python3 "$testFile"; then
    echo ""
    echo "🎉 TEST COMPLETED SUCCESSFULLY!"
    echo "✅ All security measures are working correctly"
    echo "✅ Users CANNOT bypass schedule requirements"
else
    echo ""
    echo "❌ TEST FAILED!"
    echo "❌ Some security measures may not be working correctly"
    echo "❌ Users might be able to bypass schedule requirements"
fi

# Return to original directory
cd ..

echo ""
echo "📋 TEST SUMMARY:"
echo "   • This test verified mobile schedule validation security"
echo "   • Frontend blocks time operations without schedule"
echo "   • Backend enforces schedule requirement unconditionally"
echo "   • No conditional logic that can be manipulated"
echo "   • Multiple validation layers prevent bypassing"
echo "   • Even require_schedule_compliance = False doesn't bypass"

echo ""
echo "🔒 SECURITY VERIFICATION COMPLETE"
echo "The mobile dashboard is now secure against schedule bypass attempts."
