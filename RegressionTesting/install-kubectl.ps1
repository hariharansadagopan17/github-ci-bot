# PowerShell script to install kubectl automatically
# Run as Administrator

param(
    [string]$Method = "auto",
    [string]$KubectlVersion = "v1.28.2"
)

Write-Host "🔧 kubectl Installation Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

function Test-AdminRights {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-KubectlManual {
    param([string]$Version)
    
    Write-Host "📥 Installing kubectl manually..." -ForegroundColor Green
    
    $installPath = "C:\kubectl"
    $kubectlPath = "$installPath\kubectl.exe"
    $downloadUrl = "https://dl.k8s.io/release/$Version/bin/windows/amd64/kubectl.exe"
    
    try {
        # Create directory
        New-Item -ItemType Directory -Force -Path $installPath | Out-Null
        Write-Host "   ✅ Created directory: $installPath" -ForegroundColor Gray
        
        # Download kubectl
        Write-Host "   📡 Downloading kubectl $Version..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $downloadUrl -OutFile $kubectlPath -UseBasicParsing
        Write-Host "   ✅ Downloaded successfully" -ForegroundColor Gray
        
        # Add to PATH if not already there
        $currentPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
        if ($currentPath -notlike "*$installPath*") {
            Write-Host "   🔧 Adding kubectl to system PATH..." -ForegroundColor Gray
            [Environment]::SetEnvironmentVariable("Path", $currentPath + ";$installPath", [EnvironmentVariableTarget]::Machine)
            $env:PATH += ";$installPath"
            Write-Host "   ✅ Added to PATH" -ForegroundColor Gray
        } else {
            Write-Host "   ✅ Already in PATH" -ForegroundColor Gray
        }
        
        # Test installation
        $version = & $kubectlPath version --client --output=yaml | Select-String "gitVersion"
        Write-Host "   ✅ kubectl installed successfully!" -ForegroundColor Green
        Write-Host "   📋 Version: $($version -replace 'gitVersion: ', '')" -ForegroundColor Gray
        
        return $true
    }
    catch {
        Write-Host "   ❌ Manual installation failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-DockerDesktop {
    try {
        $dockerPath = Get-Command docker -ErrorAction SilentlyContinue
        if ($dockerPath) {
            $dockerVersion = docker version --format "{{.Client.Version}}" 2>$null
            if ($dockerVersion) {
                Write-Host "   ✅ Docker Desktop found (version $dockerVersion)" -ForegroundColor Gray
                return $true
            }
        }
        Write-Host "   ⚠️ Docker Desktop not found or not running" -ForegroundColor Yellow
        return $false
    }
    catch {
        Write-Host "   ⚠️ Docker Desktop not available" -ForegroundColor Yellow
        return $false
    }
}

function Install-ViaScoop {
    try {
        # Check if Scoop exists
        $scoopPath = Get-Command scoop -ErrorAction SilentlyContinue
        
        if (-not $scoopPath) {
            Write-Host "   📦 Installing Scoop package manager..." -ForegroundColor Gray
            Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
            Invoke-RestMethod get.scoop.sh | Invoke-Expression
        }
        
        Write-Host "   📦 Installing kubectl via Scoop..." -ForegroundColor Gray
        scoop install kubectl
        
        # Test installation
        $version = kubectl version --client 2>$null
        if ($version) {
            Write-Host "   ✅ kubectl installed via Scoop!" -ForegroundColor Green
            return $true
        }
        return $false
    }
    catch {
        Write-Host "   ❌ Scoop installation failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-KubectlInstallation {
    try {
        $version = kubectl version --client 2>$null
        if ($version) {
            Write-Host "✅ kubectl is working!" -ForegroundColor Green
            Write-Host "   📋 $($version -split "`n" | Select-Object -First 1)" -ForegroundColor Gray
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

# Main execution
Write-Host ""

# Check if already installed
Write-Host "🔍 Checking existing kubectl installation..." -ForegroundColor Yellow
if (Test-KubectlInstallation) {
    Write-Host "   ✅ kubectl is already installed and working!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Navigate to your project: cd 'D:\AI_bot\Release_Deployment_Bot\github-ci-bot_Changes\RegressionTesting'" -ForegroundColor Gray
    Write-Host "   2. Run validation: npm run k8s:validate" -ForegroundColor Gray
    Write-Host "   3. Deploy framework: npm run k8s:deploy-all" -ForegroundColor Gray
    exit 0
}

Write-Host "   ⚠️ kubectl not found or not working" -ForegroundColor Yellow
Write-Host ""

# Check admin rights
if (-not (Test-AdminRights)) {
    Write-Host "⚠️ Please run this script as Administrator for best results" -ForegroundColor Yellow
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "🎯 Available installation methods:" -ForegroundColor Cyan
Write-Host "   1. Manual download (most reliable)" -ForegroundColor Gray
Write-Host "   2. Docker Desktop + Kubernetes (if available)" -ForegroundColor Gray
Write-Host "   3. Scoop package manager" -ForegroundColor Gray
Write-Host ""

# Method selection
$success = $false

switch ($Method) {
    "auto" {
        Write-Host "🚀 Attempting automatic installation..." -ForegroundColor Cyan
        
        # Try Docker Desktop first
        Write-Host "1. Checking Docker Desktop..." -ForegroundColor Yellow
        if (Test-DockerDesktop) {
            Write-Host "   💡 Docker Desktop is available! Enable Kubernetes in Docker Desktop settings:" -ForegroundColor Green
            Write-Host "   📋 Docker Desktop → Settings → Kubernetes → Enable Kubernetes" -ForegroundColor Gray
            Write-Host "   📋 After enabling, kubectl will be available automatically" -ForegroundColor Gray
        }
        
        # Try manual installation
        Write-Host ""
        Write-Host "2. Trying manual installation..." -ForegroundColor Yellow
        $success = Install-KubectlManual -Version $KubectlVersion
        
        # If manual fails, try Scoop
        if (-not $success) {
            Write-Host ""
            Write-Host "3. Trying Scoop installation..." -ForegroundColor Yellow
            $success = Install-ViaScoop
        }
    }
    "manual" {
        $success = Install-KubectlManual -Version $KubectlVersion
    }
    "scoop" {
        $success = Install-ViaScoop
    }
    default {
        Write-Host "❌ Invalid method: $Method" -ForegroundColor Red
        Write-Host "   Valid methods: auto, manual, scoop" -ForegroundColor Gray
        exit 1
    }
}

Write-Host ""
Write-Host "=" * 50 -ForegroundColor Cyan

if ($success) {
    Write-Host "🎉 SUCCESS! kubectl has been installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Restart your terminal to refresh PATH" -ForegroundColor Gray
    Write-Host "   2. Test: kubectl version --client" -ForegroundColor Gray
    Write-Host "   3. Navigate to project: cd 'D:\AI_bot\Release_Deployment_Bot\github-ci-bot_Changes\RegressionTesting'" -ForegroundColor Gray
    Write-Host "   4. Run validation: npm run k8s:validate" -ForegroundColor Gray
    Write-Host "   5. Deploy framework: npm run k8s:deploy-all" -ForegroundColor Gray
} else {
    Write-Host "❌ All installation methods failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Manual alternatives:" -ForegroundColor Yellow
    Write-Host "   1. Enable Kubernetes in Docker Desktop (if you have it)" -ForegroundColor Gray
    Write-Host "   2. Download kubectl.exe manually from: https://dl.k8s.io/release/v1.28.2/bin/windows/amd64/kubectl.exe" -ForegroundColor Gray
    Write-Host "   3. Place it in C:\kubectl\ and add to PATH" -ForegroundColor Gray
    Write-Host "   4. Use regression framework with Docker only: npm run docker:test" -ForegroundColor Gray
}

Write-Host ""
