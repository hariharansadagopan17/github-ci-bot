# 🔧 **kubectl Installation Fix Guide**

## **🚨 Chocolatey Installation Failed**

The error suggests a network/download issue with Chocolatey. Here are several alternative methods:

---

## **🎯 Method 1: Docker Desktop Kubernetes (Recommended)**

If you have Docker Desktop, kubectl comes built-in when you enable Kubernetes:

### **Enable Kubernetes:**
1. **Open Docker Desktop**
2. **Settings** → **Kubernetes**
3. **Check "Enable Kubernetes"**
4. **Apply & Restart**

### **Verify kubectl:**
```powershell
# kubectl should now be available
kubectl version --client
```

---

## **🔧 Method 2: Manual Download (Most Reliable)**

Download kubectl directly from official source:

```powershell
# Create directory
mkdir C:\kubectl
cd C:\kubectl

# Download latest kubectl
curl -LO "https://dl.k8s.io/release/v1.28.2/bin/windows/amd64/kubectl.exe"

# Add to PATH (run as Administrator)
$env:PATH += ";C:\kubectl"

# Make permanent (run as Administrator)
[Environment]::SetEnvironmentVariable("Path", $env:PATH + ";C:\kubectl", [EnvironmentVariableTarget]::Machine)

# Verify installation
kubectl version --client
```

---

## **💻 Method 3: PowerShell Script (Automated)**

Run this PowerShell script as Administrator:

```powershell
# Download and install kubectl automatically
$kubectlVersion = "v1.28.2"
$downloadUrl = "https://dl.k8s.io/release/$kubectlVersion/bin/windows/amd64/kubectl.exe"
$installPath = "C:\kubectl"
$kubectlPath = "$installPath\kubectl.exe"

# Create directory
New-Item -ItemType Directory -Force -Path $installPath

# Download kubectl
Write-Host "Downloading kubectl..." -ForegroundColor Green
Invoke-WebRequest -Uri $downloadUrl -OutFile $kubectlPath

# Add to PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
if ($currentPath -notlike "*$installPath*") {
    Write-Host "Adding kubectl to PATH..." -ForegroundColor Green
    [Environment]::SetEnvironmentVariable("Path", $currentPath + ";$installPath", [EnvironmentVariableTarget]::Machine)
}

Write-Host "kubectl installed successfully!" -ForegroundColor Green
Write-Host "Please restart your terminal and run: kubectl version --client" -ForegroundColor Yellow
```

---

## **🍫 Method 4: Fix Chocolatey Issues**

If you want to fix Chocolatey:

### **Update Chocolatey:**
```powershell
# Run as Administrator
choco upgrade chocolatey

# Clear cache
choco cache clear

# Try different source
choco install kubernetes-cli --source https://chocolatey.org/api/v2/
```

### **Alternative Chocolatey Command:**
```powershell
# Try specific version
choco install kubernetes-cli --version=1.28.2

# Or force install
choco install kubernetes-cli --force
```

---

## **📦 Method 5: Scoop Package Manager**

Alternative to Chocolatey:

```powershell
# Install Scoop
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install kubectl via Scoop
scoop install kubectl

# Verify
kubectl version --client
```

---

## **🐳 Method 6: Use Docker Desktop's kubectl**

If you have Docker Desktop running:

```powershell
# Docker Desktop includes kubectl in its PATH
# Check if it's available
docker run --rm -v ${HOME}/.kube:/root/.kube -v ${PWD}:/workdir -w /workdir bitnami/kubectl:latest version --client
```

---

## **✅ Verification Steps**

After installation with any method:

```powershell
# Check kubectl version
kubectl version --client

# Should output something like:
# Client Version: v1.28.2
# Kustomize Version: v5.0.4-0.20230601165947-6ce0bf390ce3
```

---

## **🎯 Quick Fix for Your Setup**

Based on your current situation, I recommend:

### **Option A: Docker Desktop (Easiest)**
1. Enable Kubernetes in Docker Desktop
2. Run our validation script

### **Option B: Manual Download (Most Reliable)**
```powershell
# Run this in PowerShell as Administrator
mkdir C:\kubectl -Force
Invoke-WebRequest -Uri "https://dl.k8s.io/release/v1.28.2/bin/windows/amd64/kubectl.exe" -OutFile "C:\kubectl\kubectl.exe"
$env:PATH += ";C:\kubectl"
[Environment]::SetEnvironmentVariable("Path", $env:PATH, [EnvironmentVariableTarget]::Machine)

# Restart terminal, then test
kubectl version --client
```

---

## **🔍 Test Your Installation**

Once kubectl is installed:

```powershell
# Navigate to your project
cd "D:\AI_bot\Release_Deployment_Bot\github-ci-bot_Changes\RegressionTesting"

# Run our validation script
npm run k8s:validate
```

---

## **🚨 If All Methods Fail**

You can still use your regression framework without kubectl by:

1. **Using Docker only:**
   ```powershell
   npm run docker:build
   npm run docker:test
   ```

2. **Using Docker Compose** (I can create this for you)

3. **Running locally:**
   ```powershell
   npm run server
   npm test
   ```

---

## **💡 Next Steps**

1. **Choose installation method** (Docker Desktop recommended)
2. **Verify kubectl works**: `kubectl version --client`
3. **Enable Kubernetes** in Docker Desktop
4. **Run validation**: `npm run k8s:validate`
5. **Deploy your framework**: `npm run k8s:deploy-all`

Let me know which method works for you, and I can help with the next steps!
