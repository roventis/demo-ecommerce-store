@echo off
echo ========================================================
echo     DEMO E-COMMERCE PLATFORM - PRODUCTION RUNTIME
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/3] Checking Node.js environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH. Please install Node.js 20+.
    pause
    exit /b 1
)

echo [2/3] Verifying database state...
if not exist "database\demo.sqlite" (
    echo Database not found. Initializing schema and seed data...
    node database\seed.js
) else (
    echo Database verified: database\demo.sqlite
)

echo [3/3] Launching DEMO E-Commerce Engine on http://localhost:3000...
echo.
echo Storefront URL:      http://localhost:3000/
echo Admin Dashboard:    http://localhost:3000/ (Click 'Admin Console' or use Superadmin credentials)
echo Superadmin Login:   admin@demo.com / Admin@123456
echo Customer Login:     priya@example.com / Customer@123
echo.
node server\index.js
pause
