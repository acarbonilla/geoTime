#!/bin/bash

# Production Deployment Script for GeoTime Frontend
# This script builds the frontend for production deployment

echo "🚀 Starting production build for GeoTime Frontend..."

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the frontend directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf build/

# Build for production
echo "🔨 Building for production..."
npm run build:prod

# Check if build was successful
if [ -d "build" ]; then
    echo "✅ Production build completed successfully!"
    echo "📁 Build output: $(pwd)/build"
    echo ""
    echo "🔍 Build contents:"
    ls -la build/
    echo ""
    echo "📋 Next steps:"
    echo "1. Copy the 'build' folder to your production web server"
    echo "2. Ensure your web server is configured to serve from the build directory"
    echo "3. Verify the API URL is correctly set to: https://iais.online/api"
    echo "4. Test authentication and API calls"
else
    echo "❌ Build failed! Please check the error messages above."
    exit 1
fi

echo ""
echo "🎉 Deployment script completed!"
