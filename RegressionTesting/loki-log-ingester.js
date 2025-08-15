#!/usr/bin/env node
/**
 * Log Generator and Loki Ingester
 * Generates regression test logs and sends them to Loki
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class LokiLogIngester {
    constructor() {
        this.lokiUrl = 'http://localhost:3100';
        this.streams = [];
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    // Generate realistic regression test logs
    generateTestLogs() {
        const tests = [
            { name: 'API Authentication Test', status: 'passed', duration: '2.3s' },
            { name: 'Database Connection Test', status: 'failed', duration: '5.1s', error: 'Connection timeout after 5000ms' },
            { name: 'User Login Flow Test', status: 'passed', duration: '1.8s' },
            { name: 'Payment Processing Test', status: 'error', duration: '3.2s', error: 'Payment gateway returned 500 error' },
            { name: 'Email Notification Test', status: 'passed', duration: '0.9s' },
            { name: 'File Upload Test', status: 'failed', duration: '4.5s', error: 'File size exceeded maximum limit' },
            { name: 'Cache Invalidation Test', status: 'passed', duration: '1.2s' },
            { name: 'SSL Certificate Test', status: 'error', duration: '2.7s', error: 'Certificate expired on 2025-08-15' },
            { name: 'Load Balancer Test', status: 'passed', duration: '3.1s' },
            { name: 'Backup System Test', status: 'failed', duration: '6.8s', error: 'Backup verification failed' }
        ];

        const logs = [];
        const now = Date.now() * 1000000; // Convert to nanoseconds
        
        tests.forEach((test, index) => {
            const timestamp = (now + (index * 1000000000)).toString(); // 1 second apart
            
            // Start log
            logs.push({
                timestamp,
                line: `[INFO] Starting ${test.name}...`,
                labels: { job: 'regression-tests', level: 'info', test: test.name }
            });

            // Progress log
            logs.push({
                timestamp: (parseInt(timestamp) + 500000000).toString(), // 0.5s later
                line: `[DEBUG] ${test.name} - Executing test steps...`,
                labels: { job: 'regression-tests', level: 'debug', test: test.name }
            });

            // Result log
            const resultTimestamp = (parseInt(timestamp) + 1000000000).toString(); // 1s later
            
            if (test.status === 'passed') {
                logs.push({
                    timestamp: resultTimestamp,
                    line: `[INFO] ${test.name} PASSED in ${test.duration}`,
                    labels: { job: 'regression-tests', level: 'info', test: test.name, status: 'passed' }
                });
                this.testResults.passed++;
            } else if (test.status === 'failed') {
                logs.push({
                    timestamp: resultTimestamp,
                    line: `[ERROR] ${test.name} FAILED in ${test.duration}: ${test.error}`,
                    labels: { job: 'regression-tests', level: 'error', test: test.name, status: 'failed' }
                });
                this.testResults.failed++;
                this.testResults.errors.push(`${test.name}: ${test.error}`);
            } else if (test.status === 'error') {
                logs.push({
                    timestamp: resultTimestamp,
                    line: `[ERROR] ${test.name} ERROR in ${test.duration}: ${test.error}`,
                    labels: { job: 'regression-tests', level: 'error', test: test.name, status: 'error' }
                });
                this.testResults.failed++;
                this.testResults.errors.push(`${test.name}: ${test.error}`);
            }
        });

        // Summary log
        const summaryTimestamp = (now + (tests.length * 1000000000)).toString();
        logs.push({
            timestamp: summaryTimestamp,
            line: `[INFO] Regression Test Summary: ${this.testResults.passed} passed, ${this.testResults.failed} failed`,
            labels: { job: 'regression-tests', level: 'info', type: 'summary' }
        });

        return logs;
    }

    // Convert logs to Loki format
    formatForLoki(logs) {
        const streams = {};
        
        logs.forEach(log => {
            const labelKey = JSON.stringify(log.labels);
            
            if (!streams[labelKey]) {
                streams[labelKey] = {
                    stream: log.labels,
                    values: []
                };
            }
            
            streams[labelKey].values.push([log.timestamp, log.line]);
        });

        return {
            streams: Object.values(streams)
        };
    }

    // Send logs to Loki
    async sendToLoki(data) {
        const fetch = await import('node-fetch').then(m => m.default).catch(() => null);
        
        if (!fetch) {
            console.log('📦 Installing node-fetch for HTTP requests...');
            return new Promise((resolve, reject) => {
                const npm = spawn('npm', ['install', 'node-fetch@2'], { shell: true, stdio: 'pipe' });
                npm.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ node-fetch installed successfully');
                        // Retry the function after installation
                        delete require.cache[require.resolve('node-fetch')];
                        this.sendToLoki(data).then(resolve).catch(reject);
                    } else {
                        reject(new Error('Failed to install node-fetch'));
                    }
                });
            });
        }

        try {
            console.log('📡 Sending logs to Loki...');
            
            const response = await fetch(`${this.lokiUrl}/loki/api/v1/push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                console.log('✅ Successfully sent logs to Loki');
                return true;
            } else {
                const errorText = await response.text();
                console.error(`❌ Failed to send logs to Loki: ${response.status} - ${errorText}`);
                return false;
            }
        } catch (error) {
            console.error('❌ Error sending logs to Loki:', error.message);
            
            // Try with curl as fallback
            console.log('🔄 Trying with curl as fallback...');
            return this.sendWithCurl(data);
        }
    }

    // Fallback method using curl
    async sendWithCurl(data) {
        const tempFile = path.join(__dirname, 'temp-loki-logs.json');
        
        try {
            fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
            
            return new Promise((resolve) => {
                const curl = spawn('curl', [
                    '-X', 'POST',
                    '-H', 'Content-Type: application/json',
                    '--data-binary', `@${tempFile}`,
                    `${this.lokiUrl}/loki/api/v1/push`
                ], { stdio: 'pipe' });

                let output = '';
                curl.stdout.on('data', (data) => output += data.toString());
                curl.stderr.on('data', (data) => output += data.toString());

                curl.on('close', (code) => {
                    fs.unlinkSync(tempFile);
                    
                    if (code === 0) {
                        console.log('✅ Successfully sent logs via curl');
                        resolve(true);
                    } else {
                        console.error('❌ Curl failed:', output);
                        resolve(false);
                    }
                });
            });
        } catch (error) {
            console.error('❌ Curl fallback failed:', error.message);
            return false;
        }
    }

    // Run the complete log generation and ingestion process
    async run() {
        console.log('🚀 Starting Log Generation and Ingestion Process');
        console.log('=' * 50);
        
        // Check if Loki is accessible
        console.log('🔍 Checking Loki connectivity...');
        try {
            const response = await fetch(`${this.lokiUrl}/ready`).catch(() => null);
            if (!response || !response.ok) {
                console.log('⚠️  Loki not accessible, will still generate logs');
            } else {
                console.log('✅ Loki is accessible');
            }
        } catch (error) {
            console.log('⚠️  Loki connectivity check failed, proceeding anyway');
        }

        // Generate test logs
        console.log('📝 Generating regression test logs...');
        const logs = this.generateTestLogs();
        console.log(`✅ Generated ${logs.length} log entries`);

        // Format for Loki
        const lokiData = this.formatForLoki(logs);
        console.log(`📊 Created ${lokiData.streams.length} log streams`);

        // Send to Loki
        const success = await this.sendToLoki(lokiData);
        
        // Print summary
        console.log('\n' + '=' * 50);
        console.log('📈 TEST RESULTS SUMMARY');
        console.log('=' * 50);
        console.log(`✅ Passed Tests: ${this.testResults.passed}`);
        console.log(`❌ Failed Tests: ${this.testResults.failed}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n🚨 ERRORS FOUND:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }

        console.log(`\n📡 Log Ingestion: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        if (success) {
            console.log('\n🎯 You can now query Loki for logs with:');
            console.log('   • All logs: {job="regression-tests"}');
            console.log('   • Errors only: {job="regression-tests"}|~"(?i)(error|failed)"');
            console.log('   • Specific test: {job="regression-tests",test="API Authentication Test"}');
        }

        return success;
    }
}

// Auto-run if called directly
if (require.main === module) {
    const ingester = new LokiLogIngester();
    ingester.run().catch(console.error);
}

module.exports = LokiLogIngester;
