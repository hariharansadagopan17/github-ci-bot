#!/usr/bin/env powershell
# Parse and display the Loki query results beautifully

Write-Host "🎯 LOKI QUERY RESULTS - REGRESSION TEST ERRORS" -ForegroundColor Green
Write-Host "=" * 60

# Your working curl command
$curlCommand = 'curl.exe -s "http://localhost:3100/loki/api/v1/query?query=%7Bjob=%22regression-tests%22%7D%7C%7E%22%28%3Fi%29%28error%7Cfailed%29%22"'

Write-Host "Command Used:" -ForegroundColor Cyan
Write-Host $curlCommand -ForegroundColor Yellow

# Execute and parse results
try {
    $response = Invoke-Expression $curlCommand
    $json = $response | ConvertFrom-Json
    
    if ($json.status -eq "success") {
        Write-Host "`n✅ QUERY STATUS: SUCCESS" -ForegroundColor Green
        Write-Host "📊 RESULT TYPE: $($json.data.resultType)" -ForegroundColor White
        Write-Host "🔢 STREAMS FOUND: $($json.data.result.Count)" -ForegroundColor White
        Write-Host "📈 ENTRIES RETURNED: $($json.data.stats.summary.totalEntriesReturned)" -ForegroundColor White
        
        Write-Host "`n🚨 ERROR LOGS FOUND:" -ForegroundColor Red
        Write-Host "-" * 40
        
        $errorCount = 0
        foreach ($stream in $json.data.result) {
            $errorCount++
            Write-Host "`n[$errorCount] TEST: $($stream.stream.test)" -ForegroundColor Yellow
            Write-Host "    LEVEL: $($stream.stream.level)" -ForegroundColor White
            Write-Host "    JOB: $($stream.stream.job)" -ForegroundColor White
            
            foreach ($entry in $stream.values) {
                $timestamp = $entry[0]
                $message = $entry[1]
                $readableTime = [DateTimeOffset]::FromUnixTimeNanoseconds([long]$timestamp).ToString("yyyy-MM-dd HH:mm:ss.fff")
                Write-Host "    TIME: $readableTime" -ForegroundColor Cyan
                Write-Host "    MESSAGE: $message" -ForegroundColor Red
            }
        }
        
        Write-Host "`n" + "=" * 60 -ForegroundColor Green
        Write-Host "🎯 SUMMARY" -ForegroundColor Green
        Write-Host "=" * 60 -ForegroundColor Green
        Write-Host "✅ Your curl command works perfectly!" -ForegroundColor Green
        Write-Host "✅ Found $errorCount regression test errors" -ForegroundColor Green
        Write-Host "✅ Query processed $($json.data.stats.summary.totalBytesProcessed) bytes" -ForegroundColor Green
        Write-Host "✅ Execution time: $($json.data.stats.summary.execTime)s" -ForegroundColor Green
        
        Write-Host "`n🚀 READY TO USE:" -ForegroundColor Cyan
        Write-Host "Your Loki query command is working correctly!" -ForegroundColor White
        Write-Host "You can now use it in automation scripts or monitoring systems." -ForegroundColor White
        
    } else {
        Write-Host "❌ Query failed: $($json.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error parsing response: $($_.Exception.Message)" -ForegroundColor Red
}
