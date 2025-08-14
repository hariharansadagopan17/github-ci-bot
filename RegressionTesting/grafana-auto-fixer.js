#!/usr/bin/env node

/**
 * Grafana Log Monitor and Auto-Fixer Integration
 * Connects to Grafana dashboard and monitors logs in real-time for auto-fixing
 */

const axios = require('axios');
const WebSocket = require('ws');

class GrafanaLogMonitor {
    constructor() {
        this.grafanaUrl = process.env.GRAFANA_URL || 'https://79a151442637.ngrok-free.app';
        this.grafanaUser = process.env.GRAFANA_USER || 'admin';
        this.grafanaPass = process.env.GRAFANA_PASS || 'admin123';
        this.lokiUrl = process.env.LOKI_URL || 'http://localhost:3100';
        
        this.autoFixer = null;
        this.monitoring = false;
        this.logBuffer = [];
    }

    async initialize() {
        console.log('🔌 Initializing Grafana Log Monitor...');
        
        // Import auto-fixer
        const IntelligentAutoFixer = require('./intelligent-auto-fixer');
        this.autoFixer = new IntelligentAutoFixer();
        
        // Test Grafana connection
        await this.testGrafanaConnection();
        
        // Test Loki connection
        await this.testLokiConnection();
        
        console.log('✅ Grafana Log Monitor initialized successfully');
    }

    async testGrafanaConnection() {
        try {
            const response = await axios.get(`${this.grafanaUrl}/api/health`, {
                auth: {
                    username: this.grafanaUser,
                    password: this.grafanaPass
                },
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                },
                timeout: 10000
            });
            
            if (response.data.status === 'ok') {
                console.log('✅ Grafana connection successful');
            } else {
                throw new Error('Grafana health check failed');
            }
        } catch (error) {
            console.error('❌ Grafana connection failed:', error.message);
            console.log('⚠️  Will attempt to continue with Loki direct connection only');
        }
    }

    async testLokiConnection() {
        try {
            const response = await axios.get(`${this.lokiUrl}/ready`, { timeout: 5000 });
            console.log('✅ Loki connection successful');
        } catch (error) {
            console.log('⚠️  Loki direct connection failed, will try through WSL');
        }
    }

    async startMonitoring() {
        console.log('🚀 Starting Grafana Log Monitoring...');
        this.monitoring = true;
        
        // Start multiple monitoring approaches
        await Promise.all([
            this.monitorLokiLogs(),
            this.monitorGrafanaQueries(),
            this.monitorLogFiles(),
            this.startAutoFixer()
        ]);
    }

    async monitorLokiLogs() {
        console.log('📊 Starting Loki log monitoring...');
        
        while (this.monitoring) {
            try {
                // Query for recent error and failure logs
                const queries = [
                    '{job="regression-tests"} |= "error" or "failed" or "Error" or "Failed"',
                    '{job="pipeline"} |= "failed" or "error"',
                    '{job="docker"} |= "failed" or "error"',
                    '{source="github_actions"} |= "failed" or "error"'
                ];
                
                for (const query of queries) {
                    const logs = await this.queryLoki(query);
                    if (logs.length > 0) {
                        console.log(`\n📝 Found ${logs.length} log entries matching: ${query}`);
                        await this.processLogEntries(logs, 'loki');
                    }
                }
                
                // Wait 15 seconds before next scan
                await this.sleep(15000);
                
            } catch (error) {
                console.error('❌ Loki monitoring error:', error.message);
                await this.sleep(30000);
            }
        }
    }

    async monitorGrafanaQueries() {
        console.log('📈 Starting Grafana query monitoring...');
        
        while (this.monitoring) {
            try {
                // Query Grafana API for dashboard data
                const response = await axios.post(`${this.grafanaUrl}/api/ds/query`, {
                    queries: [{
                        refId: 'A',
                        expr: 'rate({job="regression-tests"}[5m])',
                        format: 'table',
                        instant: true
                    }]
                }, {
                    auth: {
                        username: this.grafanaUser,
                        password: this.grafanaPass
                    },
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    },
                    timeout: 10000
                });
                
                if (response.data && response.data.results) {
                    await this.processGrafanaResults(response.data.results);
                }
                
                await this.sleep(20000);
                
            } catch (error) {
                console.log('⚠️  Grafana API monitoring unavailable, continuing with other methods');
                await this.sleep(60000);
            }
        }
    }

    async monitorLogFiles() {
        console.log('📁 Starting local log file monitoring...');
        
        const fs = require('fs');
        const path = require('path');
        
        const logFiles = [
            'logs/regression-tests.log',
            'logs/error.log',
            '../logs/error.log'
        ];
        
        // Watch log files for changes
        for (const logFile of logFiles) {
            try {
                const logPath = path.resolve(__dirname, logFile);
                
                if (fs.existsSync(logPath)) {
                    console.log(`👁️  Watching log file: ${logPath}`);
                    
                    fs.watchFile(logPath, { interval: 5000 }, async () => {
                        try {
                            const content = fs.readFileSync(logPath, 'utf8');
                            const recentLines = content.split('\n').slice(-20); // Last 20 lines
                            
                            for (const line of recentLines) {
                                if (line.includes('error') || line.includes('failed') || line.includes('Error') || line.includes('Failed')) {
                                    await this.processLogEntries([{ timestamp: Date.now(), line }], 'local');
                                }
                            }
                        } catch (error) {
                            console.log(`⚠️  Error reading log file ${logPath}:`, error.message);
                        }
                    });
                }
            } catch (error) {
                console.log(`⚠️  Could not watch log file ${logFile}:`, error.message);
            }
        }
    }

    async startAutoFixer() {
        if (this.autoFixer) {
            console.log('🤖 Starting integrated auto-fixer...');
            // Start auto-fixer in background
            setTimeout(() => {
                this.autoFixer.start().catch(error => {
                    console.error('❌ Auto-fixer error:', error.message);
                });
            }, 5000);
        }
    }

    async queryLoki(query) {
        try {
            const start = Date.now() - (5 * 60 * 1000); // 5 minutes ago
            const end = Date.now();
            
            let response;
            
            // Try direct Loki connection first
            try {
                response = await axios.get(`${this.lokiUrl}/loki/api/v1/query_range`, {
                    params: {
                        query: query,
                        start: start * 1000000, // Convert to nanoseconds
                        end: end * 1000000,
                        limit: 100
                    },
                    timeout: 5000
                });
            } catch (error) {
                // Try through WSL if direct connection fails
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);
                
                const curlCommand = `wsl -d Ubuntu-EDrive -e bash -c "curl -s '${this.lokiUrl}/loki/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start}000000&end=${end}000000&limit=100'"`;
                const { stdout } = await execAsync(curlCommand, { timeout: 10000 });
                response = { data: JSON.parse(stdout) };
            }
            
            const logs = [];
            
            if (response.data && response.data.data && response.data.data.result) {
                for (const stream of response.data.data.result) {
                    for (const [timestamp, logLine] of stream.values) {
                        logs.push({
                            timestamp: parseInt(timestamp) / 1000000, // Convert from nanoseconds
                            line: logLine,
                            labels: stream.stream
                        });
                    }
                }
            }
            
            return logs;
            
        } catch (error) {
            console.log('⚠️  Loki query failed:', error.message);
            return [];
        }
    }

    async processLogEntries(logs, source) {
        const errorPatterns = [
            /failed to create symbolic link.*chromedriver/i,
            /ERR_REQUIRE_ESM.*@octokit\/rest/i,
            /npm warn EBADENGINE.*node.*>= 20/i,
            /Cannot find module.*cucumber/i,
            /WebDriver session.*failed/i,
            /npm ERR!/i,
            /Failed to push logs to Loki/i,
            /workflow.*failed/i,
            /chrome.*not found/i,
            /selenium.*error/i
        ];
        
        for (const log of logs) {
            const logLine = typeof log === 'string' ? log : log.line || '';
            
            for (const pattern of errorPatterns) {
                if (pattern.test(logLine)) {
                    console.log(`\n🚨 Critical error detected in ${source}:`);
                    console.log(`📝 Pattern: ${pattern}`);
                    console.log(`📄 Log: ${logLine.substring(0, 100)}...`);
                    console.log(`⏰ Time: ${new Date(log.timestamp || Date.now()).toISOString()}`);
                    
                    // Add to buffer for auto-fixer
                    this.logBuffer.push({
                        source,
                        pattern,
                        logLine,
                        timestamp: log.timestamp || Date.now()
                    });
                    
                    // Trigger immediate fix if critical
                    if (pattern.toString().includes('chromedriver') || pattern.toString().includes('ERR_REQUIRE_ESM')) {
                        await this.triggerImmediateFix(pattern, logLine);
                    }
                    
                    break; // Only match first pattern per log line
                }
            }
        }
    }

    async processGrafanaResults(results) {
        for (const result of results) {
            if (result.error) {
                console.log('🚨 Grafana query error detected:', result.error);
            }
            
            if (result.frames) {
                for (const frame of result.frames) {
                    if (frame.data && frame.data.values) {
                        // Process metric data for anomalies
                        await this.analyzeMetricData(frame.data);
                    }
                }
            }
        }
    }

    async analyzeMetricData(data) {
        // Simple anomaly detection for error rates
        if (data.values && data.values.length > 0) {
            const errorRates = data.values[0] || [];
            
            if (errorRates.length > 0) {
                const avgErrorRate = errorRates.reduce((sum, rate) => sum + (rate || 0), 0) / errorRates.length;
                
                if (avgErrorRate > 0.1) { // More than 10% error rate
                    console.log(`\n⚠️  High error rate detected: ${(avgErrorRate * 100).toFixed(2)}%`);
                    console.log('🔧 Triggering preventive auto-fix...');
                    
                    this.logBuffer.push({
                        source: 'grafana_metrics',
                        pattern: /high error rate/,
                        logLine: `High error rate detected: ${(avgErrorRate * 100).toFixed(2)}%`,
                        timestamp: Date.now()
                    });
                }
            }
        }
    }

    async triggerImmediateFix(pattern, logLine) {
        console.log('🚑 Triggering immediate auto-fix for critical issue...');
        
        if (this.autoFixer) {
            try {
                const issues = [{
                    source: 'immediate',
                    pattern: { name: 'Critical Issue', pattern: pattern },
                    logContent: logLine,
                    timestamp: new Date()
                }];
                
                await this.autoFixer.processIssues(issues);
            } catch (error) {
                console.error('❌ Immediate fix failed:', error.message);
            }
        }
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            totalIssuesDetected: this.logBuffer.length,
            issuesBySource: {},
            topPatterns: {},
            recommendations: []
        };
        
        // Group issues by source
        for (const issue of this.logBuffer) {
            if (!report.issuesBySource[issue.source]) {
                report.issuesBySource[issue.source] = 0;
            }
            report.issuesBySource[issue.source]++;
            
            const patternStr = issue.pattern.toString();
            if (!report.topPatterns[patternStr]) {
                report.topPatterns[patternStr] = 0;
            }
            report.topPatterns[patternStr]++;
        }
        
        // Generate recommendations
        if (report.topPatterns['/chromedriver/']) {
            report.recommendations.push('Consider updating Docker configuration for ChromeDriver compatibility');
        }
        
        if (report.topPatterns['/ERR_REQUIRE_ESM/']) {
            report.recommendations.push('Update pipeline scripts to use ESM-compatible imports');
        }
        
        if (report.topPatterns['/node.*>= 20/']) {
            report.recommendations.push('Upgrade Node.js version to 20+ in all environments');
        }
        
        return report;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async stop() {
        console.log('🛑 Stopping Grafana Log Monitor...');
        this.monitoring = false;
        
        if (this.autoFixer) {
            await this.autoFixer.stop();
        }
        
        // Generate final report
        const report = await this.generateReport();
        
        console.log('\n📊 Final Monitoring Report:');
        console.log(`Total issues detected: ${report.totalIssuesDetected}`);
        console.log('Issues by source:', report.issuesBySource);
        console.log('Recommendations:', report.recommendations);
        
        // Save report
        const fs = require('fs');
        const reportPath = `monitoring-report-${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Report saved to: ${reportPath}`);
    }
}

// CLI usage
if (require.main === module) {
    const monitor = new GrafanaLogMonitor();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        await monitor.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        await monitor.stop();
        process.exit(0);
    });
    
    // Start the monitor
    monitor.initialize()
        .then(() => monitor.startMonitoring())
        .catch(console.error);
}

module.exports = GrafanaLogMonitor;
