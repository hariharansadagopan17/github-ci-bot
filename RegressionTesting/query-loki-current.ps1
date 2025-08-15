#!/usr/bin/env powershell
# Query Loki with current/recent timestamps

Write-Host "Generating current timestamps for Loki query..." -ForegroundColor Green

# Get current time and calculate proper nanosecond timestamps
$now = Get-Date
$end = [long](($now - (Get-Date "1970-01-01")).TotalSeconds * 1000000000)
$start = [long](($now.AddMinutes(-30) - (Get-Date "1970-01-01")).TotalSeconds * 1000000000)

Write-Host "Current time: $($now.ToString("yyyy-MM-dd HH:mm:ss"))" -ForegroundColor Cyan
Write-Host "Query range: Last 30 minutes" -ForegroundColor Cyan
Write-Host "Start timestamp: $start" -ForegroundColor Yellow
Write-Host "End timestamp: $end" -ForegroundColor Yellow

# First, let's see if there are ANY logs in the current timeframe
Write-Host "`nChecking for any logs in current timeframe..." -ForegroundColor Green

try {
    # Query for any logs (no job filter)
    $anyLogsQuery = "%7B__name__=~%22.%2B%22%7D"  # {__name__=~".+"}
    $anyLogsUrl = "http://localhost:3100/loki/api/v1/query_range?query=$anyLogsQuery&start=$start&end=$end&limit=10"
    
    Write-Host "URL: $anyLogsUrl" -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri $anyLogsUrl -Method Get
    
    if ($response.status -eq "success") {
        Write-Host "`nFound $($response.data.result.Count) log streams" -ForegroundColor Green
        
        if ($response.data.result.Count -gt 0) {
            foreach ($stream in $response.data.result) {
                Write-Host "`n--- Log Stream ---" -ForegroundColor Yellow
                Write-Host "Labels: $($stream.stream | ConvertTo-Json -Compress)" -ForegroundColor White
                
                if ($stream.values.Count -gt 0) {
                    Write-Host "Sample entries:" -ForegroundColor Yellow
                    for ($i = 0; $i -lt [Math]::Min(3, $stream.values.Count); $i++) {
                        $entry = $stream.values[$i]
                        $timestamp = $entry[0] 
                        $message = $entry[1]
                        $readableTime = [DateTimeOffset]::FromUnixTimeNanoseconds([long]$timestamp).ToString("yyyy-MM-dd HH:mm:ss.fff")
                        Write-Host "  [$readableTime] $($message.Substring(0, [Math]::Min(150, $message.Length)))..." -ForegroundColor White
                    }
                }
            }
        } else {
            Write-Host "No log streams found in current timeframe." -ForegroundColor Yellow
            Write-Host "This suggests either:" -ForegroundColor Yellow
            Write-Host "  1. No applications are sending logs to Loki" -ForegroundColor White
            Write-Host "  2. Loki configuration issues" -ForegroundColor White
            Write-Host "  3. Log ingestion problems" -ForegroundColor White
        }
        
        # Now try the specific query for regression tests
        Write-Host "`n" + "="*50 -ForegroundColor Cyan
        Write-Host "Trying specific query for regression-tests job..." -ForegroundColor Green
        
        $regressionQuery = "%7Bjob=%22regression-tests%22%7D%7C%7E%22%28?i%29%28error%7Cfailed%29%22"
        $regressionUrl = "http://localhost:3100/loki/api/v1/query_range?query=$regressionQuery&start=$start&end=$end&limit=100"
        
        Write-Host "URL: $regressionUrl" -ForegroundColor Cyan
        $regressionResponse = Invoke-RestMethod -Uri $regressionUrl -Method Get
        
        if ($regressionResponse.status -eq "success") {
            Write-Host "`nRegression test logs with errors: Found $($regressionResponse.data.result.Count) streams" -ForegroundColor Green
            
            foreach ($stream in $regressionResponse.data.result) {
                Write-Host "`n--- Regression Error Log ---" -ForegroundColor Red
                Write-Host "Labels: $($stream.stream | ConvertTo-Json -Compress)" -ForegroundColor White
                
                foreach ($entry in $stream.values) {
                    $timestamp = $entry[0]
                    $message = $entry[1] 
                    $readableTime = [DateTimeOffset]::FromUnixTimeNanoseconds([long]$timestamp).ToString("yyyy-MM-dd HH:mm:ss.fff")
                    Write-Host "[$readableTime] $message" -ForegroundColor Red
                }
            }
        }
        
    } else {
        Write-Host "Query failed: $($response.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response details: $($_.Exception.Response)" -ForegroundColor Red
}
