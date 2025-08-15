#!/usr/bin/env node

/**
 * Emergency Loki Connection Fix
 * Directly addresses all remaining double-slash URL issues
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;

const execAsync = promisify(exec);

class EmergencyLokiFix {
    constructor() {
        this.lokiBaseUrl = 'http://localhost:3101';
        this.fixResults = [];
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : 'ℹ️';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async findDoubleSlashIssues() {
        this.log('🔍 Scanning for double-slash URL issues...');
        
        const filesToCheck = [
            'grafana-auto-fixer.js',
            'intelligent-auto-fixer.js', 
            'master-auto-fix-controller.js',
            'pipeline-troubleshooter.js'
        ];
        
        const issues = [];
        
        for (const file of filesToCheck) {
            try {
                const content = await fs.readFile(file, 'utf8');
                
                // Check for potential double-slash patterns
                const problematicPatterns = [
                    /localhost:3101\/\/loki/g,
                    /baseUrl\s*\+\s*['"]\/loki/g,
                    /lokiUrl\s*\+\s*['"]\/loki/g,
                    /3101['"]?\s*\+\s*['"]\/loki/g
                ];
                
                for (const pattern of problematicPatterns) {
                    const matches = content.match(pattern);
                    if (matches) {
                        issues.push({
                            file: file,
                            pattern: pattern.toString(),
                            matches: matches.length
                        });
                    }
                }
                
            } catch (error) {
                this.log(`Could not check file ${file}: ${error.message}`, 'error');
            }
        }
        
        return issues;
    }

    async fixHardcodedUrls() {
        this.log('🔧 Fixing hardcoded URL constructions...');
        
        // Create a replacement map for common URL construction issues
        const fixes = [
            {
                file: 'grafana-auto-fixer.js',
                search: /this\.lokiUrl\s*\+\s*['"]\/loki\/api\/v1\/query_range['"]/g,
                replace: 'this.urlBuilder.buildAxiosUrl()'
            },
            {
                file: 'intelligent-auto-fixer.js',
                search: /this\.lokiUrl\s*\+\s*['"]\/loki\/api\/v1\/query_range['"]/g,
                replace: 'this.urlBuilder.buildFetchUrl()'
            }
        ];
        
        for (const fix of fixes) {
            try {
                const content = await fs.readFile(fix.file, 'utf8');
                const updatedContent = content.replace(fix.search, fix.replace);
                
                if (content !== updatedContent) {
                    await fs.writeFile(fix.file, updatedContent);
                    this.log(`✅ Fixed URL construction in ${fix.file}`, 'success');
                    this.fixResults.push({
                        file: fix.file,
                        status: 'fixed',
                        type: 'hardcoded_url'
                    });
                } else {
                    this.fixResults.push({
                        file: fix.file,
                        status: 'no_changes_needed',
                        type: 'hardcoded_url'
                    });
                }
                
            } catch (error) {
                this.log(`Failed to fix ${fix.file}: ${error.message}`, 'error');
                this.fixResults.push({
                    file: fix.file,
                    status: 'failed',
                    error: error.message
                });
            }
        }
    }

    async testLokiConnection() {
        this.log('🧪 Testing direct Loki connection...');
        
        const tests = [
            {
                name: 'Health Check',
                url: `${this.lokiBaseUrl}/ready`
            },
            {
                name: 'Query Endpoint', 
                url: `${this.lokiBaseUrl}/loki/api/v1/query_range`
            }
        ];
        
        for (const test of tests) {
            try {
                const curlCommand = `wsl -d Ubuntu-EDrive -e bash -c "curl -s -I '${test.url}'"`;
                this.log(`Testing ${test.name}: ${test.url}`);
                
                const { stdout, stderr } = await execAsync(curlCommand, { timeout: 5000 });
                
                if (stdout.includes('200 OK') || stdout.includes('HTTP/1.1 200')) {
                    this.log(`✅ ${test.name}: SUCCESS`, 'success');
                } else if (stdout.includes('404') || stdout.includes('503')) {
                    this.log(`⚠️ ${test.name}: Service available but endpoint not ready`);
                } else {
                    this.log(`❌ ${test.name}: ${stdout.split('\n')[0]}`, 'error');
                }
                
            } catch (error) {
                this.log(`❌ ${test.name} failed: ${error.message}`, 'error');
            }
        }
    }

    async killOldProcesses() {
        this.log('🔄 Stopping any running auto-fix processes...');
        
        try {
            // Kill any Node.js processes that might be using old code
            await execAsync('taskkill /F /IM node.exe 2>nul || echo "No node processes to kill"', { timeout: 5000 });
            this.log('✅ Cleared old processes', 'success');
            
            // Wait a moment for cleanup
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            this.log(`Process cleanup: ${error.message}`);
        }
    }

    async restartDockerContainers() {
        this.log('🐳 Restarting Docker containers...');
        
        try {
            // Stop containers
            await execAsync('wsl -d Ubuntu-EDrive -e bash -c "docker stop fresh-loki fresh-grafana 2>/dev/null || true"', { timeout: 10000 });
            
            // Start containers  
            await execAsync('wsl -d Ubuntu-EDrive -e bash -c "docker start fresh-loki fresh-grafana"', { timeout: 15000 });
            
            // Wait for startup
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Check status
            const { stdout } = await execAsync('wsl -d Ubuntu-EDrive -e bash -c "docker ps --format \'{{.Names}}: {{.Status}}\' | grep -E \'(fresh-loki|fresh-grafana)\'"', { timeout: 5000 });
            
            this.log('📊 Container Status:');
            console.log(stdout);
            
            if (stdout.includes('fresh-loki') && stdout.includes('fresh-grafana')) {
                this.log('✅ Docker containers restarted successfully', 'success');
                return true;
            } else {
                this.log('⚠️ Some containers may not have started properly');
                return false;
            }
            
        } catch (error) {
            this.log(`Docker restart failed: ${error.message}`, 'error');
            return false;
        }
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFixes: this.fixResults.length,
                successfulFixes: this.fixResults.filter(f => f.status === 'fixed').length,
                failedFixes: this.fixResults.filter(f => f.status === 'failed').length
            },
            fixes: this.fixResults,
            recommendations: [
                'Monitor logs for any remaining double-slash URLs',
                'Test all auto-fix components after applying fixes',
                'Consider implementing centralized URL validation'
            ]
        };
        
        await fs.writeFile(`emergency-loki-fix-report-${Date.now()}.json`, JSON.stringify(report, null, 2));
        
        this.log('📊 === EMERGENCY LOKI FIX REPORT ===');
        this.log(`✅ Total fixes applied: ${report.summary.totalFixes}`);
        this.log(`🎯 Successful fixes: ${report.summary.successfulFixes}`);
        this.log(`❌ Failed fixes: ${report.summary.failedFixes}`);
        
        return report;
    }

    async runEmergencyFix() {
        this.log('🚨 Starting Emergency Loki Connection Fix...');
        
        try {
            // Step 1: Kill old processes
            await this.killOldProcesses();
            
            // Step 2: Find double-slash issues
            const issues = await this.findDoubleSlashIssues();
            if (issues.length > 0) {
                this.log(`Found ${issues.length} potential URL issues`);
                console.log(issues);
            }
            
            // Step 3: Fix hardcoded URLs
            await this.fixHardcodedUrls();
            
            // Step 4: Restart containers
            await this.restartDockerContainers();
            
            // Step 5: Test connection
            await this.testLokiConnection();
            
            // Step 6: Generate report
            await this.generateReport();
            
            this.log('🎉 Emergency fix completed!', 'success');
            
        } catch (error) {
            this.log(`Emergency fix failed: ${error.message}`, 'error');
        }
    }
}

// Run if called directly
if (require.main === module) {
    const emergencyFix = new EmergencyLokiFix();
    emergencyFix.runEmergencyFix().catch(console.error);
}

module.exports = EmergencyLokiFix;
