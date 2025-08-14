@echo off
REM Regression Testing Framework Installation Script for Windows
REM This script sets up the complete testing environment on Windows

echo 🚀 Starting Regression Testing Framework Installation...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed
    pause
    exit /b 1
)

echo ✅ npm found
npm --version

REM Install dependencies
echo.
echo 📦 Installing Node.js dependencies...
if exist package-lock.json (
    echo Using npm ci for faster, reliable builds...
    npm ci
) else (
    echo Using npm install...
    npm install
)

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Create directories
echo.
echo 📁 Setting up directories...
if not exist "reports" mkdir reports
if not exist "screenshots" mkdir screenshots  
if not exist "logs" mkdir logs

echo ✅ Directories created

REM Check if Chrome is installed
echo.
echo 🌐 Checking Google Chrome...
where chrome >nul 2>&1
if %errorlevel% neq 0 (
    where "C:\Program Files\Google\Chrome\Application\chrome.exe" >nul 2>&1
    if %errorlevel% neq 0 (
        where "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" >nul 2>&1
        if %errorlevel% neq 0 (
            echo ⚠️  Google Chrome not found. Please install Chrome for testing.
            echo Visit: https://chrome.google.com/
        ) else (
            echo ✅ Google Chrome found
        )
    ) else (
        echo ✅ Google Chrome found
    )
) else (
    echo ✅ Google Chrome found
)

REM Check Docker
echo.
echo 🐳 Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Docker is not installed. Install Docker for containerized testing.
    echo Visit: https://docs.docker.com/get-docker/
) else (
    echo ✅ Docker found
    docker --version
)

REM Check kubectl
echo.
echo ☸️  Checking Kubernetes CLI...
kubectl version --client >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  kubectl is not installed. Install for Kubernetes deployment.
    echo Visit: https://kubernetes.io/docs/tasks/tools/install-kubectl/
) else (
    echo ✅ kubectl found
    kubectl version --client --short
)

REM Create environment file
echo.
echo ⚙️  Setting up environment configuration...
if not exist .env (
    echo Creating .env file from template...
    copy .env .env.example >nul 2>nul
    echo Please configure .env file with your settings
) else (
    echo ✅ .env file already exists
)

REM Run basic validation
echo.
echo 🧪 Running basic test validation...
call npm run lint >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Linting not configured or failed
) else (
    echo ✅ Linting passed
)

REM Build Docker image if Docker is available
echo.
echo 🏗️  Building Docker image...
docker info >nul 2>&1
if %errorlevel% equ 0 (
    echo Building regression-test-framework Docker image...
    docker build -t regression-test-framework:latest . --no-cache
    if %errorlevel% equ 0 (
        echo ✅ Docker image built successfully
    ) else (
        echo ⚠️  Docker build failed
    )
) else (
    echo ⚠️  Skipping Docker build - Docker not available
)

REM Installation complete
echo.
echo ✅ Installation Complete!
echo.
echo 🎉 Regression Testing Framework is ready!
echo.
echo 📋 Next Steps:
echo 1. Configure your test environment in .env file
echo 2. Run headless tests: npm run test:headless
echo 3. Run browser tests: npm run test:chrome  
echo 4. View reports in: .\reports\
echo 5. Check screenshots: .\screenshots\
echo.
echo 🐳 Docker Usage:
echo • Run in container: docker run --rm -v %cd%\reports:/app/reports regression-test-framework
echo.
echo ☸️  Kubernetes Deployment:
echo • Deploy monitoring: kubectl apply -f k8s\monitoring-stack.yaml
echo • Deploy tests: kubectl apply -f k8s\regression-test-deployment.yaml
echo.
echo 📊 Monitoring:
echo • Metrics: http://localhost:9090/metrics
echo • Health: http://localhost:9090/health  
echo • Grafana: http://localhost:3000 (admin/admin123)
echo.

pause
