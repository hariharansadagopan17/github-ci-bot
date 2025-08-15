#!/usr/bin/env powershell
# Query Loki for the specific logs we just ingested

Write-Host "Querying for recently ingested regression test logs..." -ForegroundColor Green

try {
    # First, let's check all available labels
    Write-Host "`nChecking available labels..." -ForegroundColor Cyan
    $labelsResponse = Invoke-RestMethod -Uri "http://localhost:3100/loki/api/v1/labels" -Method Get
    Write-Host "Labels: $($labelsResponse.data -join ', ')" -ForegroundColor White
    
    # Check job label values
    Write-Host "`nChecking job values..." -ForegroundColor Cyan
    $jobResponse = Invoke-RestMethod -Uri "http://localhost:3100/loki/api/v1/label/job/values" -Method Get
    Write-Host "Job values: $($jobResponse.data -join ', ')" -ForegroundColor White
    
    # Query for all regression-tests logs (no time filter first)
    Write-Host "`nQuerying all regression-tests logs (no time filter)..." -ForegroundColor Green
    $query = "%7Bjob=%22regression-tests%22%7D"  # {job="regression-tests"}
    $allLogsUrl = "http://localhost:3100/loki/api/v1/query?query=$query&limit=1000"
    
    Write-Host "URL: $allLogsUrl" -ForegroundColor Cyan
    $allResponse = Invoke-RestMethod -Uri $allLogsUrl -Method Get
    
    if ($allResponse.status -eq "success") {
        Write-Host "`nFound $($allResponse.data.result.Count) log streams" -ForegroundColor Green
        
        if ($allResponse.data.result.Count -gt 0) {
            foreach ($stream in $allResponse.data.result) {
                Write-Host "`n--- Log Stream ---" -ForegroundColor Yellow
                Write-Host "Labels: $($stream.stream | ConvertTo-Json -Compress)" -ForegroundColor White
                
                Write-Host "Sample entries:" -ForegroundColor Yellow
                for ($i = 0; $i -lt [Math]::Min(5, $stream.values.Count); $i++) {
                    $entry = $stream.values[$i]
                    $timestamp = $entry[0]
                    $message = $entry[1]
                    $readableTime = [DateTimeOffset]::FromUnixTimeNanoseconds([long]$timestamp).ToString("yyyy-MM-dd HH:mm:ss.fff")
                    Write-Host "  [$readableTime] $message" -ForegroundColor White
                }
            }
            
            # Now query for error logs specifically
            Write-Host "`n" + "="*60 -ForegroundColor Red
            Write-Host "QUERYING FOR ERROR LOGS" -ForegroundColor Red
            Write-Host "="*60 -ForegroundColor Red
            
            $errorQuery = "%7Bjob=%22regression-tests%22%7D%7C%7E%22%28%3Fi%29%28error%7Cfailed%29%22"  # {job="regression-tests"}|~"(?i)(error|failed)"
            $errorUrl = "http://localhost:3100/loki/api/v1/query?query=$errorQuery&limit=100"
            
            Write-Host "Error query URL: $errorUrl" -ForegroundColor Cyan
            $errorResponse = Invoke-RestMethod -Uri $errorUrl -Method Get
            
            if ($errorResponse.status -eq "success") {
                Write-Host "`nFound $($errorResponse.data.result.Count) error log streams" -ForegroundColor Red
                
                foreach ($stream in $errorResponse.data.result) {
                    Write-Host "`n🚨 ERROR STREAM" -ForegroundColor Red
                    Write-Host "Labels: $($stream.stream | ConvertTo-Json -Compress)" -ForegroundColor White
                    
                    foreach ($entry in $stream.values) {
                        $timestamp = $entry[0]
                        $message = $entry[1]
                        $readableTime = [DateTimeOffset]::FromUnixTimeNanoseconds([long]$timestamp).ToString("yyyy-MM-dd HH:mm:ss.fff")
                        Write-Host "  [$readableTime] $message" -ForegroundColor Red
                    }
                }
            }
        } else {
            Write-Host "No regression test logs found - ingestion may have failed" -ForegroundColor Red
        }
    } else {
        Write-Host "Query failed: $($allResponse.error)" -ForegroundColor Red
    }
    
    # Your original curl command (simplified)
    Write-Host "`n" + "="*60 -ForegroundColor Green
    Write-Host "TESTING YOUR ORIGINAL CURL COMMAND" -ForegroundColor Green
    Write-Host "="*60 -ForegroundColor Green
    
    Write-Host "Running: curl for regression test error logs..." -ForegroundColor Cyan
    $curlResult = & curl -s "http://localhost:3100/loki/api/v1/query?query=%7Bjob=%22regression-tests%22%7D%7C%7E%22%28%3Fi%29%28error%7Cfailed%29%22&limit=100"
    
    if ($curlResult) {
        Write-Host "Curl result:" -ForegroundColor Green
        Write-Host $curlResult -ForegroundColor White
        
        # Parse and beautify the JSON response
        try {
            $curlJson = $curlResult | ConvertFrom-Json
            if ($curlJson.status -eq "success") {
                Write-Host "`nParsed Results:" -ForegroundColor Green
                Write-Host "Status: $($curlJson.status)" -ForegroundColor White
                Write-Host "Result Count: $($curlJson.data.result.Count)" -ForegroundColor White
                Write-Host "Result Type: $($curlJson.data.resultType)" -ForegroundColor White
            }
        } catch {
            Write-Host "Could not parse JSON response" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No curl result received" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
