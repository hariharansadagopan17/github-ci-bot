# Simple kubectl installation script
# Run as Administrator for best results

Write-Host "🔧 Installing kubectl..." -ForegroundColor Cyan

# Method 1: Check if kubectl already exists
try {
    $version = kubectl version --client 2>$null
    if ($version) {
        Write-Host "✅ kubectl is already installed!" -ForegroundColor Green
        Write-Host "Version: $($version -split "`n" | Select-Object -First 1)" -ForegroundColor Gray
        exit 0
    }
} catch {
    # kubectl not found, continue with installation
}

Write-Host "📥 Downloading kubectl..." -ForegroundColor Yellow

# Create kubectl directory
$installPath = "C:\kubectl"
$kubectlPath = "$installPath\kubectl.exe"
$downloadUrl = "https://dl.k8s.io/release/v1.28.2/bin/windows/amd64/kubectl.exe"

try {
    # Create directory
    if (!(Test-Path $installPath)) {
        New-Item -ItemType Directory -Force -Path $installPath | Out-Null
        Write-Host "✅ Created directory: $installPath" -ForegroundColor Gray
    }
    
    # Download kubectl
    Write-Host "📡 Downloading from official source..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $downloadUrl -OutFile $kubectlPath -UseBasicParsing
    Write-Host "✅ Downloaded successfully" -ForegroundColor Green
    
    # Add to PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
    if ($currentPath -notlike "*$installPath*") {
        Write-Host "🔧 Adding to system PATH..." -ForegroundColor Gray
        [Environment]::SetEnvironmentVariable("Path", $currentPath + ";$installPath", [EnvironmentVariableTarget]::Machine)
        $env:PATH += ";$installPath"
        Write-Host "✅ Added to PATH" -ForegroundColor Green
    }
    
    # Test installation
    Write-Host "🧪 Testing installation..." -ForegroundColor Gray
    $testVersion = & $kubectlPath version --client 2>$null
    if ($testVersion) {
        Write-Host "🎉 SUCCESS! kubectl installed successfully!" -ForegroundColor Green
        Write-Host "Version: $($testVersion -split "`n" | Select-Object -First 1)" -ForegroundColor Gray
        
        Write-Host ""
        Write-Host "🎯 Next steps:" -ForegroundColor Cyan
        Write-Host "1. Restart your terminal to refresh PATH" -ForegroundColor Gray
        Write-Host "2. Test: kubectl version --client" -ForegroundColor Gray
        Write-Host "3. Run: npm run k8s:validate" -ForegroundColor Gray
        Write-Host "4. Deploy: npm run k8s:deploy-all" -ForegroundColor Gray
    } else {
        Write-Host "❌ Installation verification failed" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Alternative options:" -ForegroundColor Yellow
    Write-Host "1. Enable Kubernetes in Docker Desktop" -ForegroundColor Gray
    Write-Host "2. Manual download: https://dl.k8s.io/release/v1.28.2/bin/windows/amd64/kubectl.exe" -ForegroundColor Gray
    Write-Host "3. Place in C:\kubectl\ and add to PATH manually" -ForegroundColor Gray
    exit 1
}
