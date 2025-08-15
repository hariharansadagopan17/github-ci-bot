#!/usr/bin/env powershell
# Query Loki for regression test logs with error patterns

Write-Host "Querying Loki for regression test logs with errors/failures..." -ForegroundColor Green

# Build the query URL with proper escaping
$baseUrl = "http://localhost:3100"
$endpoint = "/loki/api/v1/query_range"
$query = "{job=`"regression-tests`"}|~`"(?i)(error|failed)`""
$start = "1755305663216941056"
$end = "1755305963216941056" 
$limit = "100"

# Manual URL encoding for the query
$encodedQuery = $query -replace '\{', '%7B' -replace '\}', '%7D' -replace '"', '%22' -replace '\|', '%7C' -replace '~', '%7E' -replace '\(', '%28' -replace '\)', '%29' -replace ' ', '%20'
$url = "$baseUrl$endpoint" + "?query=$encodedQuery&start=$start&end=$end&limit=$limit"

Write-Host "Query URL: $url" -ForegroundColor Cyan

try {
    # Make the request using Invoke-RestMethod
    $response = Invoke-RestMethod -Uri $url -Method Get -ContentType "application/json"
    
    if ($response.status -eq "success") {
        Write-Host "`nQuery successful! Found $($response.data.result.Count) log streams" -ForegroundColor Green
        
        foreach ($stream in $response.data.result) {
            Write-Host "`n--- Log Stream ---" -ForegroundColor Yellow
            Write-Host "Labels: $($stream.stream | ConvertTo-Json -Compress)" -ForegroundColor White
            
            Write-Host "`nLog Entries:" -ForegroundColor Yellow
            foreach ($entry in $stream.values) {
                $timestamp = $entry[0]
                $message = $entry[1]
                $readableTime = [DateTimeOffset]::FromUnixTimeNanoseconds([long]$timestamp).ToString("yyyy-MM-dd HH:mm:ss.fff")
                Write-Host "[$readableTime] $message" -ForegroundColor White
            }
        }
    } else {
        Write-Host "Query failed: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "Error querying Loki: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try with curl as fallback
    Write-Host "`nTrying with curl..." -ForegroundColor Yellow
    & curl -s $url
}
