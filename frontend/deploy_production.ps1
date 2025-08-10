# Production Deployment Script for GeoTime Frontend (PowerShell)
# This script builds the frontend for production deployment

Write-Host "🚀 Starting production build for GeoTime Frontend..." -ForegroundColor Green

# Check if we're in the frontend directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the frontend directory" -ForegroundColor Red
    exit 1
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Clean previous build
Write-Host "🧹 Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build"
}

# Build for production
Write-Host "🔨 Building for production..." -ForegroundColor Yellow
npm run build:prod

# Check if build was successful
if (Test-Path "build") {
    Write-Host "✅ Production build completed successfully!" -ForegroundColor Green
    Write-Host "📁 Build output: $(Get-Location)\build" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔍 Build contents:" -ForegroundColor Cyan
    Get-ChildItem "build" | Format-Table Name, Length, LastWriteTime
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Copy the 'build' folder to your production web server" -ForegroundColor White
    Write-Host "2. Ensure your web server is configured to serve from the build directory" -ForegroundColor White
    Write-Host "3. Verify the API URL is correctly set to: https://iais.online/api" -ForegroundColor White
    Write-Host "4. Test authentication and API calls" -ForegroundColor White
} else {
    Write-Host "❌ Build failed! Please check the error messages above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Deployment script completed!" -ForegroundColor Green
