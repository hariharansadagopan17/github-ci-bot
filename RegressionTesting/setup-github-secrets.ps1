# GitHub Secrets Setup Script (PowerShell)
# This script will help you set up all required GitHub secrets for the CI/CD pipeline

Write-Host "🔐 GitHub Secrets Setup for CI/CD Pipeline" -ForegroundColor Blue
Write-Host "===========================================" -ForegroundColor Blue
Write-Host ""

# Check if GitHub CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ GitHub CLI (gh) is not installed." -ForegroundColor Red
    Write-Host "Please install it from: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Windows Installation:" -ForegroundColor Yellow
    Write-Host "winget install --id GitHub.cli" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Check if user is authenticated
$authStatus = & gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "🔑 Please authenticate with GitHub CLI first:" -ForegroundColor Yellow
    Write-Host "gh auth login" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Repository information
$REPO_OWNER = "hariharansadagopan17"
$REPO_NAME = "github-ci-bot"
$REPO_FULL = "$REPO_OWNER/$REPO_NAME"

Write-Host "📋 Setting up secrets for repository: $REPO_FULL" -ForegroundColor Green
Write-Host ""

# The base64 encoded kubeconfig (from previous command)
$KUBE_CONFIG_B64 = "YXBpVmVyc2lvbjogdjEKY2x1c3RlcnM6Ci0gY2x1c3RlcjoKICAgIGNlcnRpZmljYXRlLWF1dGhvcml0eS1kYXRhOiBMUzB0TFMxQ1JVZEpUaUJEUlZKVVNVWkpRMEZVUlMwdExTMHRDazFKU1VKa2FrTkRRVkl5WjBGM1NVSkJaMGxDUVVSQlMwSm5aM0ZvYTJwUFVGRlJSRUZxUVdwTlUwVjNTSGRaUkZaUlVVUkVRbWh5VFROTmRHTXlWbmtLWkcxV2VVeFhUbWhSUkVVelRsUlZlRTFFVlROTmFsbDNTR2hqVGsxcVZYZFBSRVY2VFZSamVVMXFRVEpYYUdOT1RYcFZkMDlFUlhoTlZHTjVUV3BCTWdwWGFrRnFUVk5GZDBoM1dVUldVVkZFUkVKb2NrMHpUWFJqTWxaNVpHMVdlVXhYVG1oUlJFVXpUbFJWZUUxRVZUTk5hbGwzVjFSQlZFSm5ZM0ZvYTJwUENsQlJTVUpDWjJkeGFHdHFUMUJSVFVKQ2QwNURRVUZUWTNBekswMTVLMU4zV1drMloyeGplbGRJVTFadVptNXJUVTVoU2t4YVpWRTJWR1JIYVhJeWRqY0taRXBPU0c1MlEwUnZZVm96WkdJdmJXZzRObGRUVjFaYU1qZE5iRXRKSzJsVk0weEhNa2RUTVhSbVoyZHZNRWwzVVVSQlQwSm5UbFpJVVRoQ1FXWTRSUXBDUVUxRFFYRlJkMFIzV1VSV1VqQlVRVkZJTDBKQlZYZEJkMFZDTDNwQlpFSm5UbFpJVVRSRlJtZFJWVTFVVUZwdlVEaDBXRVJDV0ROT1pqSXdaSG8zQ25Sd1duZElNVkYzUTJkWlNVdHZXa2w2YWpCRlFYZEpSRkozUVhkU1FVbG5ZMnRvVTBjMlJsTTJRalZZWVRKMlVFeE1WMDkzTmtVeU5FWlBUazl3UkZvS2FYWnhkbmhUTjNsQlowVkRTVVo1TlhGMVFUWTNiemc1V1U5RldsSkVUbVI2VmxOaFFrMVZkbXA1UlhsS1dESlVLekF3YWpSNlkyc0tMUzB0TFMxRlRrUWdRMFZTVkVsR1NVTkJWRVV0TFMwdExRbz0KICAgIHNlcnZlcjogaHR0cHM6Ly8xMjcuMC4wLjE6NjQ0MwogIG5hbWU6IGRlZmF1bHQKY29udGV4dHM6Ci0gY29udGV4dDoKICAgIGNsdXN0ZXI6IGRlZmF1bHQKICAgIHVzZXI6IGRlZmF1bHQKICBuYW1lOiBkZWZhdWx0CmN1cnJlbnQtY29udGV4dDogZGVmYXVsdApraW5kOiBDb25maWcKcHJlZmVyZW5jZXM6IHt9CnVzZXJzOgotIG5hbWU6IGRlZmF1bHQKICB1c2VyOgogICAgY2xpZW50LWNlcnRpZmljYXRlLWRhdGE6IExTMHRMUzFDUlVkSlRpQkRSVkpVU1VaSlEwRlVSUzB0TFMwdENrMUpTVUpyUkVORFFWUmxaMEYzU1VKQlowbEpXalZCVTBKNmFsQnhhVUYzUTJkWlNVdHZXa2w2YWpCRlFYZEpkMGw2UldoTlFqaEhRVEZWUlVGM2Qxa0tZWHBPZWt4WFRuTmhWMVoxWkVNeGFsbFZRWGhPZWxVeFRWUkJNVTU2U1RKTlFqUllSRlJKTVUxRVozaE5la1V6VFdwSmQwNXNiMWhFVkVreVRVUm5lQXBOZWtVelRXcEpkMDVzYjNkTlJFVllUVUpWUjBFeFZVVkRhRTFQWXpOc2VtUkhWblJQYlRGb1l6TlNiR051VFhoR1ZFRlVRbWRPVmtKQlRWUkVTRTQxQ21NelVteGlWSEJvV2tjeGNHSnFRbHBOUWsxSFFubHhSMU5OTkRsQlowVkhRME54UjFOTk5EbEJkMFZJUVRCSlFVSkphVWRZVFZwcFVrdDBLMnc0TUhZS1ZYZG9Sekl5T0cxbGNHWlNhRFJqVDI5MVZUVnZRM2MyTkZoTmMwTlNTR0pPWkhBMVYwZFhSSGRVTmxOdFNrMU5NSE0zZG5CT04yOTNLemxpTm1sSVRncDVRM2gyVGxoNWFsTkVRa2ROUVRSSFFURlZaRVIzUlVJdmQxRkZRWGRKUm05RVFWUkNaMDVXU0ZOVlJVUkVRVXRDWjJkeVFtZEZSa0pSWTBSQmFrRm1Da0puVGxaSVUwMUZSMFJCVjJkQ1UxbFJNRVZQUXpGd1lYZHNlalp3V21aWGFtUkhTWE53YXpKV1ZFRkxRbWRuY1docmFrOVFVVkZFUVdkT1NFRkVRa1VLUVdsQ1ZUTXdjV1ZDVjJoU1FVWkNReTltUzFKM1NIaHJiaTh5VW0xWVdVbFZkM2hrZEdKYVV6RkpNR1YzVVVsblZWSmpOVFF2YTFsdlJWbFJSbXhuZEFwamVVSnFUMmg1TkVsYWJFWnpOaTkwTm0xUk56RnhOMEowWlZVOUNpMHRMUzB0UlU1RUlFTkZVbFJKUmtsRFFWUkZMUzB0TFMwS0xTMHRMUzFDUlVkSlRpQkRSVkpVU1VaSlEwRlVSUzB0TFMwdENrMUpTVUprYWtORFFWSXlaMEYzU1VKQlowbENRVVJCUzBKblozRm9hMnBQVUZGUlJFRnFRV3BOVTBWM1NIZFpSRlpSVVVSRVFtaHlUVE5OZEZreWVIQUtXbGMxTUV4WFRtaFJSRVV6VGxSVmVFMUVWVE5OYWxsM1NHaGpUazFxVlhkUFJFVjZUVlJqZVUxcVFUSlhhR05PVFhwVmQwOUVSWGhOVkdONVRXcEJNZ3BYYWtGcVRWTkZkMGgzV1VSV1VWRkVSRUpvY2swelRYUlpNbmh3V2xjMU1FeFhUbWhSUkVVelRsUlZlRTFFVlROTmFsbDNWMVJCVkVKblkzRm9hMnBQQ2xCUlNVSkNaMmR4YUd0cVQxQlJUVUpDZDA1RFFVRlNWRWRuWkZCaFN6YzNjMEUwVVZvMlExSXdVelU1U1c1dFoycERjVXRsUWxwQ1dWZFRNRW96ZW1FS05rdDJVSHBZYld0YWEzbEJiRWR2YldZdmIyRnlWMjVhUjNVeFNGZDRlRFpsWVhKRGVIcDNObkZ4VVRGdk1FbDNVVVJCVDBKblRsWklVVGhDUVdZNFJRcENRVTFEUVhGUmQwUjNXVVJXVWpCVVFWRklMMEpCVlhkQmQwVkNMM3BCWkVKblRsWklVVFJGUm1kUlZXMUZUa0pFWjNSaFYzTktZeXR4VjFneGJ6TlNDbWxNUzFwT2JGVjNRMmRaU1V0dldrbDZhakJGUVhkSlJGSjNRWGRTUVVsblZWTlRPVVE1UkZGcFZVMTBOalZzU2tWMWJVTTVMMUF6V1hjd01HaFhhSEFLTjJwT1VqWktUa0YxWjBGRFNVWTBSbm8xUldreGJpOVpXVzQ0TWtKd1NXeFVSblJvVXpVeFowTnZjV0ZKZEdvMFFUaHROMUpSU0RRS0xTMHRMUzFGVGtRZ1EwVlNWRWxHU1VOQlZFVXRMUzB0TFFvPQogICAgY2xpZW50LWtleS1kYXRhOiBMUzB0TFMxQ1JVZEpUaUJGUXlCUVVrbFdRVlJGSUV0RldTMHRMUzB0Q2sxSVkwTkJVVVZGU1U4eVRrWkJkVmw2T1d4Qk5rVTBSRXBxTm1WTk5VY3pSR3R3TlVScVJFYzJUMGRGYzBKblR6aFFabmx2UVc5SFEwTnhSMU5OTkRrS1FYZEZTRzlWVVVSUlowRkZhVWxhWTNodFNrVnhNelpZZWxNNVZFTkZZbUppZVZvMmJEbEhTR2gzTm1rMVZHMW5URVJ5YUdONWQwcEZaSE14TW01c1dRcGFXVkJDVUhCTFdXdDNlbE42ZFN0ck0zVnFSRGN4ZG5GSll6TkpURWM0TVdaQlBUMEtMUzB0TFMxRlRrUWdSVU1nVUZKSlZrRlVSU0JMUlZrdExTMHRMUW89Cg=="

Write-Host "🔍 Using pre-obtained Kubernetes configuration..." -ForegroundColor Green
Write-Host ""

# Set the KUBE_CONFIG secret
Write-Host "🔐 Setting KUBE_CONFIG secret..." -ForegroundColor Yellow
$KUBE_CONFIG_B64 | & gh secret set KUBE_CONFIG --repo $REPO_FULL

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ KUBE_CONFIG secret set successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to set KUBE_CONFIG secret" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Optional: Set Loki URL if needed
Write-Host "🔧 Optional: Setting LOKI_URL secret..." -ForegroundColor Yellow
$LOKI_URL = "http://localhost:3100"
$LOKI_URL | & gh secret set LOKI_URL --repo $REPO_FULL

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ LOKI_URL secret set successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️ Warning: Failed to set LOKI_URL secret (optional)" -ForegroundColor Yellow
}

Write-Host ""

# Verify secrets are set
Write-Host "🔍 Verifying secrets..." -ForegroundColor Yellow
$secrets = & gh secret list --repo $REPO_FULL

Write-Host "📋 Current repository secrets:" -ForegroundColor Blue
$secrets
Write-Host ""

# Check for required secrets
if ($secrets -match "KUBE_CONFIG") {
    Write-Host "✅ KUBE_CONFIG secret is set" -ForegroundColor Green
} else {
    Write-Host "❌ KUBE_CONFIG secret is missing" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 GitHub secrets setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. Push any change to trigger the pipeline:" -ForegroundColor White
Write-Host "   git add . ; git commit -m 'feat: activate CI/CD pipeline' ; git push" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Monitor the pipeline at:" -ForegroundColor White
Write-Host "   https://github.com/$REPO_FULL/actions" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. View logs in Grafana dashboard:" -ForegroundColor White
Write-Host "   Check your ngrok tunnel URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Use troubleshooting tools:" -ForegroundColor White
Write-Host "   npm run pipeline:dashboard" -ForegroundColor Cyan
Write-Host "   npm run pipeline:troubleshoot" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔧 Pipeline Features Now Active:" -ForegroundColor Blue
Write-Host "✅ Automated testing on every push" -ForegroundColor Green
Write-Host "✅ Docker image build and push" -ForegroundColor Green
Write-Host "✅ Kubernetes deployment" -ForegroundColor Green
Write-Host "✅ Self-healing pipeline troubleshooting" -ForegroundColor Green
Write-Host "✅ Grafana log monitoring" -ForegroundColor Green
Write-Host "✅ Automatic issue creation for failures" -ForegroundColor Green
Write-Host ""
