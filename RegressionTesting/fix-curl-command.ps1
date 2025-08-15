#!/usr/bin/env powershell
# CURL Command Fix Script
# Addresses the double-slash URL issue in Loki queries

Write-Host "CURL COMMAND VARIATIONS" -ForegroundColor Green
Write-Host "=" * 50

# Original problematic command (with URL encoding issues)
Write-Host "`nORIGINAL (with issues):" -ForegroundColor Red
$originalCmd = 'wsl -d Ubuntu-EDrive -e bash -c "curl -s ''http://localhost:3101//loki/api/v1/query_range?query=%7Bjob%3D%22regression-tests%22%7D%20%7C~%20%22(%3Fi)(error%7Cfailed)%22&start=1755285222567000000&end=1755285522567000000&limit=100''"'
Write-Host $originalCmd

# Fixed version 1: Remove double slash
Write-Host "`nFIXED VERSION 1 (remove double slash):" -ForegroundColor Green
$fixedCmd1 = 'wsl -d Ubuntu-EDrive -e bash -c "curl -s ''http://localhost:3101/loki/api/v1/query_range?query=%7Bjob%3D%22regression-tests%22%7D%20%7C~%20%22(%3Fi)(error%7Cfailed)%22&start=1755285222567000000&end=1755285522567000000&limit=100''"'
Write-Host $fixedCmd1

# Fixed version 2: Simplified with readable query
Write-Host "`nFIXED VERSION 2 (readable query):" -ForegroundColor Green
$fixedCmd2 = 'wsl bash -c "curl -s \"http://localhost:3101/loki/api/v1/query_range?query={job=\\\"regression-tests\\\"}|~\\\"(?i)(error|failed)\\\"&start=1755285222567000000&end=1755285522567000000&limit=100\""'
Write-Host $fixedCmd2

# Fixed version 3: With dynamic timestamps
Write-Host "`nFIXED VERSION 3 (with current timestamps):" -ForegroundColor Green
$now = Get-Date
$start = [long](($now.AddMinutes(-5) - (Get-Date "1970-01-01")).TotalSeconds * 1000000000)
$end = [long](($now - (Get-Date "1970-01-01")).TotalSeconds * 1000000000)
$dynamicCmd = "wsl bash -c `"curl -s 'http://localhost:3101/loki/api/v1/query_range?query={job=\`"regression-tests\`"}|~\`"(?i)(error|failed)\`"&start=$start&end=$end&limit=100'`""
Write-Host $dynamicCmd

Write-Host "`nKEY DIFFERENCES:" -ForegroundColor Yellow
Write-Host "- Removed double slash: //loki -> /loki"
Write-Host "- Simplified quoting structure"
Write-Host "- Made query parameters readable"
Write-Host "- Added dynamic timestamp generation"

Write-Host "`nREADY TO TEST:" -ForegroundColor Cyan
Write-Host "Copy any of the fixed versions above and run them in PowerShell!"
