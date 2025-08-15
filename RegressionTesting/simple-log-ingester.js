#!/usr/bin/env node
/**
 * Fixed Log Ingester with Current Timestamps
 */

const fs = require('fs');
const { spawn } = require('child_process');

async function ingestLogs() {
    console.log('🚀 Ingesting Regression Test Logs with Current Timestamps');
    console.log('=' * 50);

    // Generate logs with current timestamps
    const now = Date.now() * 1000000; // Current time in nanoseconds
    
    const logData = {
        streams: [
            {
                stream: {
                    job: "regression-tests",
                    level: "error",
                    test: "Database Connection Test"
                },
                values: [
                    [now.toString(), "[ERROR] Database Connection Test FAILED in 5.1s: Connection timeout after 5000ms"]
                ]
            },
            {
                stream: {
                    job: "regression-tests", 
                    level: "error",
                    test: "Payment Processing Test"
                },
                values: [
                    [(now + 1000000000).toString(), "[ERROR] Payment Processing Test ERROR in 3.2s: Payment gateway returned 500 error"]
                ]
            },
            {
                stream: {
                    job: "regression-tests",
                    level: "error", 
                    test: "File Upload Test"
                },
                values: [
                    [(now + 2000000000).toString(), "[ERROR] File Upload Test FAILED in 4.5s: File size exceeded maximum limit"]
                ]
            },
            {
                stream: {
                    job: "regression-tests",
                    level: "info",
                    test: "API Authentication Test" 
                },
                values: [
                    [(now + 3000000000).toString(), "[INFO] API Authentication Test PASSED in 2.3s"]
                ]
            },
            {
                stream: {
                    job: "regression-tests",
                    level: "error",
                    test: "SSL Certificate Test"
                },
                values: [
                    [(now + 4000000000).toString(), "[ERROR] SSL Certificate Test ERROR in 2.7s: Certificate expired on 2025-08-15"]
                ]
            }
        ]
    };

    // Write to temp file
    const tempFile = 'temp-logs.json';
    fs.writeFileSync(tempFile, JSON.stringify(logData, null, 2));

    console.log('📡 Sending logs to Loki via curl...');
    
    return new Promise((resolve) => {
        const curlProcess = spawn('curl.exe', [
            '-X', 'POST',
            '-H', 'Content-Type: application/json',
            '--data-binary', `@${tempFile}`,
            'http://localhost:3100/loki/api/v1/push'
        ], { stdio: 'pipe' });

        let output = '';
        curlProcess.stdout.on('data', (data) => output += data.toString());
        curlProcess.stderr.on('data', (data) => output += data.toString());

        curlProcess.on('close', (code) => {
            fs.unlinkSync(tempFile);
            
            if (code === 0) {
                console.log('✅ Successfully sent logs to Loki');
                console.log('📊 Ingested 5 log streams (3 errors, 2 info)');
                resolve(true);
            } else {
                console.error('❌ Failed to send logs:', output);
                resolve(false);
            }
        });
    });
}

// Run the ingestion
ingestLogs().then((success) => {
    if (success) {
        console.log('\n🎯 Now test your curl command:');
        console.log('curl.exe -s "http://localhost:3100/loki/api/v1/query?query=%7Bjob=%22regression-tests%22%7D%7C%7E%22%28%3Fi%29%28error%7Cfailed%29%22"');
    }
});
