# 🐳 **Docker Setup and Build Instructions**

## **📋 Prerequisites**

### **1. Install Docker Desktop**

**For Windows:**
1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/
2. Run the installer and follow the setup wizard
3. Restart your computer when prompted
4. Start Docker Desktop from the Start menu
5. Wait for Docker to start (whale icon in system tray)

**Verify Installation:**
```powershell
docker --version
docker-compose --version
```

Expected output:
```
Docker version 24.x.x, build xxxxx
Docker Compose version v2.x.x
```

---

## **🔧 Docker Image Build Fixes**

### **Issues Fixed in Updated Dockerfile:**

1. **❌ Deprecated `apt-key` command**
   - **Fix**: Using `gpg --dearmor` method for Chrome repository key

2. **❌ Missing Chrome dependencies** 
   - **Fix**: Added all required Chrome libraries and fonts

3. **❌ ChromeDriver version mismatch**
   - **Fix**: Using npm to install ChromeDriver for consistency

4. **❌ Security concerns running as root**
   - **Fix**: Created dedicated `testuser` for running tests

5. **❌ Poor error handling in startup script**
   - **Fix**: Added proper cleanup, validation, and error handling

6. **❌ Build context too large**
   - **Fix**: Added `.dockerignore` to exclude unnecessary files

---

## **🚀 Building the Docker Image**

### **Method 1: Basic Build**
```powershell
# Navigate to project directory
cd "d:\AI_bot\Release_Deployment_Bot\github-ci-bot_Changes\RegressionTesting"

# Build the image
docker build -t regression-test-framework .

# Check if image was created
docker images | findstr regression-test-framework
```

### **Method 2: Build with Build Args (Advanced)**
```powershell
# Build with specific Node.js version
docker build --build-arg NODE_VERSION=18 -t regression-test-framework .

# Build for production
docker build --target production -t regression-test-framework:prod .
```

### **Method 3: Multi-stage Build (Optimized)**
```powershell
# Build optimized image
docker build --no-cache -t regression-test-framework:latest .

# Check image size
docker images regression-test-framework
```

---

## **🏃‍♂️ Running the Container**

### **Basic Test Run:**
```powershell
# Run smoke tests
docker run --rm regression-test-framework

# Run specific tests
docker run --rm regression-test-framework ./run-tests.sh npm run test:login

# Run with environment variables
docker run --rm -e HEADLESS=false -e BASE_URL=http://host.docker.internal:3000 regression-test-framework
```

### **Interactive Debug Mode:**
```powershell
# Run container interactively for debugging
docker run -it --rm regression-test-framework /bin/bash

# Inside container, you can run:
# google-chrome --version
# chromedriver --version  
# npm run troubleshoot
# npm run quick-test
```

### **Run with Volume Mounts (Get Reports):**
```powershell
# Mount local directories to get reports and screenshots
docker run --rm \
  -v ${PWD}/reports:/app/reports \
  -v ${PWD}/screenshots:/app/screenshots \
  -v ${PWD}/logs:/app/logs \
  regression-test-framework
```

### **Run Against Local Test Server:**
```powershell
# If you have a test server running locally on port 3000
docker run --rm \
  -e BASE_URL=http://host.docker.internal:3000 \
  regression-test-framework ./run-tests.sh npm test
```

---

## **🔍 Troubleshooting Docker Build Issues**

### **Common Build Errors and Solutions:**

#### **1. "docker: command not found"**
```powershell
# Solution: Install Docker Desktop and restart terminal
# Download from: https://www.docker.com/products/docker-desktop/
```

#### **2. "Cannot connect to the Docker daemon"**
```powershell
# Solution: Start Docker Desktop
# Wait for Docker Desktop to fully start (whale icon should be stable)
```

#### **3. "Package 'google-chrome-stable' has no installation candidate"**
```powershell
# This is fixed in the updated Dockerfile
# The Chrome repository key is now properly configured
```

#### **4. "ChromeDriver version mismatch"**
```powershell
# Fixed by using npm to install ChromeDriver instead of manual download
# This ensures version compatibility
```

#### **5. "Permission denied" errors**
```powershell
# Fixed by using non-root user in container
# All files are properly owned by testuser
```

### **Build Validation Commands:**
```powershell
# 1. Check if Docker is running
docker info

# 2. Clean build (if previous builds failed)
docker system prune -f
docker build --no-cache -t regression-test-framework .

# 3. Test the built image
docker run --rm regression-test-framework ./run-tests.sh echo "Build successful!"

# 4. Check image layers
docker history regression-test-framework
```

---

## **🐳 Docker Compose Alternative**

Create `docker-compose.yml` for easier management:

```yaml
version: '3.8'

services:
  regression-tests:
    build: .
    environment:
      - HEADLESS=true
      - BASE_URL=http://test-server:3000
      - NODE_ENV=production
    volumes:
      - ./reports:/app/reports
      - ./screenshots:/app/screenshots
      - ./logs:/app/logs
    depends_on:
      - test-server
    
  test-server:
    build: .
    command: ["node", "server.js"]
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

**Usage:**
```powershell
# Build and run with docker-compose
docker-compose up --build

# Run only tests (assumes server is running elsewhere)
docker-compose run regression-tests
```

---

## **📊 Image Optimization**

### **Check Image Size:**
```powershell
docker images regression-test-framework --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

### **Optimize Further:**
1. **Use Alpine base image** (smaller but may have compatibility issues)
2. **Multi-stage builds** to separate build and runtime dependencies
3. **Remove unnecessary packages** after installation

---

## **🚨 Common Runtime Issues**

### **1. Chrome crashes in container**
```powershell
# Add Chrome arguments for container environment
# This is handled in the updated DriverManager
```

### **2. Display issues**
```powershell
# Ensure DISPLAY=:99 is set
# Xvfb is properly started in run-tests.sh
```

### **3. Permission issues**
```powershell
# Run with proper user context
docker run --user $(id -u):$(id -g) regression-test-framework
```

---

## **✅ Success Indicators**

After successful build and run:

```
✅ Docker image builds without errors
✅ Chrome and ChromeDriver versions match
✅ Virtual display starts successfully  
✅ Tests run and generate reports
✅ Container exits cleanly
```

---

## **🎯 Quick Start Commands**

```powershell
# Complete workflow:

# 1. Build image
docker build -t regression-test-framework .

# 2. Run smoke tests
docker run --rm regression-test-framework

# 3. Run all tests with reports
docker run --rm -v ${PWD}/reports:/app/reports regression-test-framework ./run-tests.sh npm test

# 4. Debug if needed
docker run -it --rm regression-test-framework /bin/bash
```

Now your Docker build should work successfully! 🎉
