#!/usr/bin/env powershell
# Direct curl command test with proper error handling

Write-Host "🚀 TESTING YOUR LOKI CURL COMMAND" -ForegroundColor Green
Write-Host "=" * 50

# Test 1: Simple query for all regression-tests logs (no time filter)
Write-Host "`n📋 TEST 1: Query all regression-tests logs" -ForegroundColor Cyan
$cmd1 = 'curl -s "http://localhost:3100/loki/api/v1/query?query={job=\"regression-tests\"}&limit=100"'
Write-Host "Command: $cmd1" -ForegroundColor Yellow

try {
    $result1 = Invoke-Expression $cmd1
    Write-Host "✅ Result:" -ForegroundColor Green
    Write-Host $result1 -ForegroundColor White
    
    # Parse JSON to show structure
    try {
        $json1 = $result1 | ConvertFrom-Json
        Write-Host "`n📊 Parsed Response:" -ForegroundColor Green
        Write-Host "Status: $($json1.status)" -ForegroundColor White
        Write-Host "Result Type: $($json1.data.resultType)" -ForegroundColor White
        Write-Host "Stream Count: $($json1.data.result.Count)" -ForegroundColor White
    } catch {
        Write-Host "Could not parse JSON" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Query for error logs specifically
Write-Host "`n" + "="*50 -ForegroundColor Red
Write-Host "📋 TEST 2: Query regression-tests ERROR logs" -ForegroundColor Red
$cmd2 = 'curl -s "http://localhost:3100/loki/api/v1/query?query={job=\"regression-tests\"}|~\"(?i)(error|failed)\"&limit=100"'
Write-Host "Command: $cmd2" -ForegroundColor Yellow

try {
    $result2 = Invoke-Expression $cmd2
    Write-Host "✅ Result:" -ForegroundColor Green
    Write-Host $result2 -ForegroundColor White
    
    # Parse JSON to show errors
    try {
        $json2 = $result2 | ConvertFrom-Json
        Write-Host "`n📊 Parsed Response:" -ForegroundColor Green
        Write-Host "Status: $($json2.status)" -ForegroundColor White
        Write-Host "Error Stream Count: $($json2.data.result.Count)" -ForegroundColor White
        
        if ($json2.data.result.Count -gt 0) {
            Write-Host "`n🚨 ERROR LOGS FOUND:" -ForegroundColor Red
            foreach ($stream in $json2.data.result) {
                Write-Host "`nStream Labels: $($stream.stream | ConvertTo-Json -Compress)" -ForegroundColor Yellow
                foreach ($entry in $stream.values) {
                    Write-Host "  $($entry[1])" -ForegroundColor Red
                }
            }
        }
    } catch {
        Write-Host "Could not parse JSON" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Your original curl command format (with time range)
Write-Host "`n" + "="*50 -ForegroundColor Blue
Write-Host "📋 TEST 3: Your original command format with current time" -ForegroundColor Blue

# Generate current timestamps  
$now = Get-Date
$end = [long](($now - (Get-Date "1970-01-01")).TotalSeconds * 1000000000)
$start = [long](($now.AddHours(-1) - (Get-Date "1970-01-01")).TotalSeconds * 1000000000)

$cmd3 = "curl -s `"http://localhost:3100/loki/api/v1/query_range?query={job=\`"regression-tests\`"}|~\`"(?i)(error|failed)\`"&start=$start&end=$end&limit=100`""
Write-Host "Command: $cmd3" -ForegroundColor Yellow

try {
    $result3 = Invoke-Expression $cmd3
    Write-Host "✅ Result:" -ForegroundColor Green
    Write-Host $result3 -ForegroundColor White
    
    # Parse JSON
    try {
        $json3 = $result3 | ConvertFrom-Json
        Write-Host "`n📊 Parsed Response:" -ForegroundColor Green
        Write-Host "Status: $($json3.status)" -ForegroundColor White
        Write-Host "Result Type: $($json3.data.resultType)" -ForegroundColor White
        Write-Host "Stream Count: $($json3.data.result.Count)" -ForegroundColor White
        
        if ($json3.data.result.Count -gt 0) {
            Write-Host "`n🎯 TIME-RANGED ERROR LOGS:" -ForegroundColor Blue
            foreach ($stream in $json3.data.result) {
                Write-Host "`nStream: $($stream.stream | ConvertTo-Json -Compress)" -ForegroundColor Yellow
                foreach ($entry in $stream.values) {
                    $timestamp = $entry[0]
                    $message = $entry[1]
                    $readableTime = [DateTimeOffset]::FromUnixTimeNanoseconds([long]$timestamp).ToString("yyyy-MM-dd HH:mm:ss.fff")
                    Write-Host "  [$readableTime] $message" -ForegroundColor White
                }
            }
        } else {
            Write-Host "`n⚠️  No results in time range. This suggests:" -ForegroundColor Yellow
            Write-Host "     • Logs were ingested at different timestamps" -ForegroundColor White
            Write-Host "     • Try instant query (TEST 2) for validation" -ForegroundColor White
        }
    } catch {
        Write-Host "Could not parse JSON" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" + "="*50 -ForegroundColor Green
Write-Host "✅ CURL COMMAND TESTING COMPLETE" -ForegroundColor Green
Write-Host "=" * 50
