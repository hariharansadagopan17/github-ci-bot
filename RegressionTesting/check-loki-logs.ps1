#!/usr/bin/env powershell
# Check what labels and logs are available in Loki

Write-Host "Checking available labels in Loki..." -ForegroundColor Green

try {
    # Get all label names
    $labelsUrl = "http://localhost:3100/loki/api/v1/labels"
    $labelsResponse = Invoke-RestMethod -Uri $labelsUrl -Method Get
    
    if ($labelsResponse.status -eq "success") {
        Write-Host "`nAvailable labels:" -ForegroundColor Yellow
        $labelsResponse.data | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
        
        # Get values for specific labels
        Write-Host "`nChecking job label values..." -ForegroundColor Green
        $jobValuesUrl = "http://localhost:3100/loki/api/v1/label/job/values"
        $jobResponse = Invoke-RestMethod -Uri $jobValuesUrl -Method Get
        
        if ($jobResponse.status -eq "success") {
            Write-Host "Available job values:" -ForegroundColor Yellow
            $jobResponse.data | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
        }
    }
    
    # Try a broader query to see any logs
    Write-Host "`nTrying broader query for any logs..." -ForegroundColor Green
    $now = Get-Date
    $start = [long](($now.AddHours(-1) - (Get-Date "1970-01-01")).TotalSeconds * 1000000000)
    $end = [long](($now - (Get-Date "1970-01-01")).TotalSeconds * 1000000000)
    
    $broadQuery = "%7B__name__=~%22.%2B%22%7D"  # {__name__=~".+"} - match any logs
    $broadUrl = "http://localhost:3100/loki/api/v1/query_range?query=$broadQuery&start=$start&end=$end&limit=10"
    
    Write-Host "Broad query URL: $broadUrl" -ForegroundColor Cyan
    $broadResponse = Invoke-RestMethod -Uri $broadUrl -Method Get
    
    if ($broadResponse.status -eq "success") {
        Write-Host "`nFound $($broadResponse.data.result.Count) log streams in last hour" -ForegroundColor Green
        
        foreach ($stream in $broadResponse.data.result) {
            Write-Host "`n--- Log Stream ---" -ForegroundColor Yellow
            Write-Host "Labels: $($stream.stream | ConvertTo-Json -Compress)" -ForegroundColor White
            
            if ($stream.values.Count -gt 0) {
                $entry = $stream.values[0]
                $timestamp = $entry[0]
                $message = $entry[1]
                $readableTime = [DateTimeOffset]::FromUnixTimeNanoseconds([long]$timestamp).ToString("yyyy-MM-dd HH:mm:ss.fff")
                Write-Host "Latest: [$readableTime] $($message.Substring(0, [Math]::Min(100, $message.Length)))..." -ForegroundColor White
            }
        }
    }
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
