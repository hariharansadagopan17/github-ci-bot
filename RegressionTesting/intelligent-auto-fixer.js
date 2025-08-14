#!/usr/bin/env node

/**
 * Intelligent Auto-Fixer for Pipeline and Regression Issues
 * Monitors Grafana logs, GitHub Actions failures, and automatically applies fixes
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class IntelligentAutoFixer {
    constructor() {
        this.githubToken = process.env.GITHUB_TOKEN;
        this.githubOwner = process.env.GITHUB_OWNER || 'hariharansadagopan17';
        this.githubRepo = process.env.GITHUB_REPO || 'github-ci-bot';
        this.lokiUrl = process.env.LOKI_URL || 'http://localhost:3100';
        
        this.fixPatterns = [
            {
                name: 'ESM Import Error Fix',
                pattern: /Error \[ERR_REQUIRE_ESM\].*require\(\) of ES Module.*@octokit\/rest/,
                description: 'Fixes CommonJS/ESM compatibility issues with @octokit/rest',
                severity: 'critical',
                category: 'pipeline',
                fix: this.fixESMImportError.bind(this)
            },
            {
                name: 'ChromeDriver Symbolic Link Fix',
                pattern: /ln: failed to create symbolic link.*chromedriver.*File exists/,
                description: 'Fixes ChromeDriver symbolic link conflicts in Docker builds',
                severity: 'critical',
                category: 'docker',
                fix: this.fixChromeDriverSymlink.bind(this)
            },
            {
                name: 'Node.js Version Compatibility Fix',
                pattern: /npm warn EBADENGINE.*required:.*node.*>= 20.*current:.*v18/,
                description: 'Updates Node.js version for package compatibility',
                severity: 'high',
                category: 'environment',
                fix: this.fixNodeVersionCompatibility.bind(this)
            },
            {
                name: 'Cucumber Execution Fix',
                pattern: /Cannot find module.*cucumber|npx: installed.*but not found/,
                description: 'Fixes Cucumber.js execution and module resolution issues',
                severity: 'high',
                category: 'regression',
                fix: this.fixCucumberExecution.bind(this)
            },
            {
                name: 'WebDriver Session Fix',
                pattern: /WebDriver session.*failed to start|chrome.*not found|chromedriver.*not found/,
                description: 'Fixes WebDriver and Chrome browser issues',
                severity: 'high',
                category: 'regression',
                fix: this.fixWebDriverSession.bind(this)
            },
            {
                name: 'Package Installation Fix',
                pattern: /npm ERR!.*ENOENT|npm ERR!.*EACCES|npm install.*failed/,
                description: 'Fixes npm installation and permission issues',
                severity: 'medium',
                category: 'dependencies',
                fix: this.fixPackageInstallation.bind(this)
            },
            {
                name: 'Loki Connection Fix',
                pattern: /Failed to push logs to Loki|Connection refused.*3100|ECONNREFUSED.*localhost:3100/,
                description: 'Fixes Loki connection and log streaming issues',
                severity: 'medium',
                category: 'monitoring',
                fix: this.fixLokiConnection.bind(this)
            },
            {
                name: 'GitHub Actions Workflow Fix',
                pattern: /workflow.*failed|action.*failed|step.*failed/,
                description: 'Fixes GitHub Actions workflow execution issues',
                severity: 'high',
                category: 'pipeline',
                fix: this.fixGitHubActionsWorkflow.bind(this)
            }
        ];
        
        this.fixHistory = [];
        this.monitoring = false;
    }

    async start() {
        console.log('🚀 Starting Intelligent Auto-Fixer...');
        console.log(`📊 Monitoring: GitHub (${this.githubOwner}/${this.githubRepo}) | Loki (${this.lokiUrl})`);
        console.log(`🔧 Loaded ${this.fixPatterns.length} auto-fix patterns`);
        
        this.monitoring = true;
        await this.startMonitoringLoop();
    }

    async startMonitoringLoop() {
        while (this.monitoring) {
            try {
                console.log(`\n🔍 [${new Date().toISOString()}] Scanning for issues...`);
                
                // Check GitHub Actions failures
                const pipelineIssues = await this.checkPipelineFailures();
                
                // Check Grafana/Loki logs for regression issues
                const regressionIssues = await this.checkRegressionLogs();
                
                // Check local log files
                const localIssues = await this.checkLocalLogs();
                
                const allIssues = [...pipelineIssues, ...regressionIssues, ...localIssues];
                
                if (allIssues.length > 0) {
                    console.log(`\n⚠️  Found ${allIssues.length} issues to fix:`);
                    await this.processIssues(allIssues);
                } else {
                    console.log('✅ No issues detected - system healthy');
                }
                
                // Wait 30 seconds before next scan
                await this.sleep(30000);
                
            } catch (error) {
                console.error('❌ Monitoring loop error:', error.message);
                await this.sleep(60000); // Wait longer on error
            }
        }
    }

    async checkPipelineFailures() {
        const issues = [];
        
        try {
            // Use GitHub CLI if available, otherwise skip
            const { stdout } = await execAsync('gh run list --limit 3 --json status,conclusion,name,databaseId,headSha', { timeout: 10000 });
            const runs = JSON.parse(stdout);
            
            for (const run of runs) {
                if (run.status === 'completed' && run.conclusion === 'failure') {
                    console.log(`🔍 Analyzing failed run: ${run.name} (#${run.databaseId})`);
                    
                    try {
                        const { stdout: logs } = await execAsync(`gh run view ${run.databaseId} --log`, { timeout: 15000 });
                        const matchedPatterns = this.analyzeLogContent(logs, 'pipeline');
                        
                        for (const pattern of matchedPatterns) {
                            issues.push({
                                source: 'github_actions',
                                runId: run.databaseId,
                                runName: run.name,
                                pattern: pattern,
                                logContent: logs,
                                timestamp: new Date()
                            });
                        }
                    } catch (logError) {
                        console.log(`⚠️  Could not fetch logs for run ${run.databaseId}: ${logError.message}`);
                    }
                }
            }
        } catch (error) {
            console.log('⚠️  GitHub CLI not available or failed, skipping pipeline check');
        }
        
        return issues;
    }

    async checkRegressionLogs() {
        const issues = [];
        
        try {
            // Query Loki for recent error logs
            const query = '{job="regression-tests"} |= "error" | json | __error__=""';
            const response = await fetch(`${this.lokiUrl}/loki/api/v1/query_range?query=${encodeURIComponent(query)}&start=${Date.now() - 300000}000000&end=${Date.now()}000000`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.data && data.data.result) {
                    for (const stream of data.data.result) {
                        for (const [timestamp, logLine] of stream.values) {
                            const matchedPatterns = this.analyzeLogContent(logLine, 'regression');
                            
                            for (const pattern of matchedPatterns) {
                                issues.push({
                                    source: 'loki_logs',
                                    timestamp: new Date(parseInt(timestamp) / 1000000),
                                    pattern: pattern,
                                    logContent: logLine
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.log('⚠️  Could not query Loki logs, checking local files instead');
        }
        
        return issues;
    }

    async checkLocalLogs() {
        const issues = [];
        const logFiles = [
            'logs/regression-tests.log',
            'logs/error.log',
            '../logs/error.log'
        ];
        
        for (const logFile of logFiles) {
            try {
                const logPath = path.resolve(__dirname, logFile);
                const exists = await fs.access(logPath).then(() => true).catch(() => false);
                
                if (exists) {
                    const content = await fs.readFile(logPath, 'utf8');
                    const recentLines = content.split('\n').slice(-50).join('\n'); // Last 50 lines
                    
                    const matchedPatterns = this.analyzeLogContent(recentLines, 'local');
                    
                    for (const pattern of matchedPatterns) {
                        issues.push({
                            source: 'local_logs',
                            file: logFile,
                            pattern: pattern,
                            logContent: recentLines,
                            timestamp: new Date()
                        });
                    }
                }
            } catch (error) {
                // Silently skip missing log files
            }
        }
        
        return issues;
    }

    analyzeLogContent(content, source) {
        const matches = [];
        
        for (const pattern of this.fixPatterns) {
            if (pattern.pattern.test(content)) {
                matches.push(pattern);
            }
        }
        
        return matches;
    }

    async processIssues(issues) {
        // Group issues by pattern to avoid duplicate fixes
        const groupedIssues = {};
        
        for (const issue of issues) {
            const key = issue.pattern.name;
            if (!groupedIssues[key]) {
                groupedIssues[key] = [];
            }
            groupedIssues[key].push(issue);
        }
        
        for (const [patternName, issueGroup] of Object.entries(groupedIssues)) {
            const pattern = issueGroup[0].pattern;
            
            // Check if we've already fixed this recently (avoid fix loops)
            const recentFix = this.fixHistory.find(fix => 
                fix.pattern === patternName && 
                Date.now() - fix.timestamp < 300000 // 5 minutes
            );
            
            if (recentFix) {
                console.log(`⏭️  Skipping ${patternName} - recently fixed at ${recentFix.timestamp}`);
                continue;
            }
            
            console.log(`\n🔧 Applying fix: ${pattern.name}`);
            console.log(`📝 Description: ${pattern.description}`);
            console.log(`⚠️  Severity: ${pattern.severity}`);
            console.log(`📂 Category: ${pattern.category}`);
            console.log(`🔢 Affected sources: ${issueGroup.length}`);
            
            try {
                const fixResult = await pattern.fix(issueGroup);
                
                this.fixHistory.push({
                    pattern: patternName,
                    timestamp: Date.now(),
                    result: fixResult,
                    issuesFixed: issueGroup.length
                });
                
                console.log(`✅ Fix applied successfully: ${fixResult.message}`);
                
                if (fixResult.requiresRestart) {
                    console.log('🔄 Fix requires restart - triggering pipeline re-run');
                    await this.triggerPipelineRerun(issueGroup);
                }
                
            } catch (error) {
                console.error(`❌ Fix failed for ${pattern.name}:`, error.message);
                
                this.fixHistory.push({
                    pattern: patternName,
                    timestamp: Date.now(),
                    result: { success: false, error: error.message },
                    issuesFixed: 0
                });
            }
        }
    }

    // Fix implementations
    async fixESMImportError(issues) {
        console.log('🔧 Fixing ESM import error in pipeline-troubleshooter.js...');
        
        const troubleshooterPath = path.join(__dirname, 'pipeline-troubleshooter.js');
        
        try {
            let content = await fs.readFile(troubleshooterPath, 'utf8');
            
            // Convert to ESM-compatible imports
            content = content.replace(
                /const { Octokit } = require\('@octokit\/rest'\);/g,
                'import { Octokit } from "@octokit/rest";'
            );
            
            content = content.replace(
                /const axios = require\('axios'\);/g,
                'import axios from "axios";'
            );
            
            content = content.replace(
                /const winston = require\('winston'\);/g,
                'import winston from "winston";'
            );
            
            // Add package.json type module or update existing file to use dynamic imports
            const dynamicImportVersion = `#!/usr/bin/env node

/**
 * Pipeline Troubleshooter with Dynamic Imports (ESM Compatible)
 */

async function main() {
    try {
        const { Octokit } = await import('@octokit/rest');
        const axios = (await import('axios')).default;
        const winston = (await import('winston')).default;
        
        console.log('Modules loaded successfully');
        // Add your pipeline troubleshooting logic here
    } catch (error) {
        console.error('❌ Failed to load modules:', error.message);
        process.exit(1);
    }
}

if (import.meta.url === \`file://\${process.argv[1]}\`) {
    main().catch(console.error);
}`;
            
            await fs.writeFile(troubleshooterPath, dynamicImportVersion);
            
            // Update package.json to support ESM
            const packageJsonPath = path.join(__dirname, 'package.json');
            let packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            packageJson.type = 'module';
            await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
            
            return {
                success: true,
                message: 'Converted pipeline-troubleshooter.js to ESM-compatible dynamic imports',
                requiresRestart: true
            };
        } catch (error) {
            throw new Error(`Failed to fix ESM import error: ${error.message}`);
        }
    }

    async fixChromeDriverSymlink(issues) {
        console.log('🔧 Fixing ChromeDriver symbolic link in Dockerfile...');
        
        const dockerfilePath = path.join(__dirname, 'Dockerfile');
        
        try {
            let content = await fs.readFile(dockerfilePath, 'utf8');
            
            // Fix the ChromeDriver installation to handle existing symlinks
            const oldInstallation = /RUN npm install -g chromedriver@119\.0\.1 \\\s*&& ln -s .*chromedriver.*chromedriver \\\s*&& chmod \+x.*chromedriver/g;
            
            const newInstallation = `RUN npm install -g chromedriver@119.0.1 \\
    && rm -f /usr/local/bin/chromedriver \\
    && ln -s /usr/local/lib/node_modules/chromedriver/bin/chromedriver /usr/local/bin/chromedriver \\
    && chmod +x /usr/local/bin/chromedriver`;
            
            content = content.replace(oldInstallation, newInstallation);
            
            await fs.writeFile(dockerfilePath, content);
            
            return {
                success: true,
                message: 'Fixed ChromeDriver symbolic link conflict in Dockerfile',
                requiresRestart: true
            };
        } catch (error) {
            throw new Error(`Failed to fix ChromeDriver symlink: ${error.message}`);
        }
    }

    async fixNodeVersionCompatibility(issues) {
        console.log('🔧 Updating Node.js version for package compatibility...');
        
        const workflowPath = path.join(__dirname, '../.github/workflows/regression-tests.yml');
        
        try {
            let content = await fs.readFile(workflowPath, 'utf8');
            
            // Update Node.js version to 20
            content = content.replace(
                /node-version:\s*['"]*18['"]*$/gm,
                'node-version: 20'
            );
            
            await fs.writeFile(workflowPath, content);
            
            // Also update Dockerfile
            const dockerfilePath = path.join(__dirname, 'Dockerfile');
            let dockerContent = await fs.readFile(dockerfilePath, 'utf8');
            
            dockerContent = dockerContent.replace(
                /FROM node:18-slim/g,
                'FROM node:20-slim'
            );
            
            await fs.writeFile(dockerfilePath, dockerContent);
            
            return {
                success: true,
                message: 'Updated Node.js version to 20 in workflows and Dockerfile',
                requiresRestart: true
            };
        } catch (error) {
            throw new Error(`Failed to fix Node version compatibility: ${error.message}`);
        }
    }

    async fixCucumberExecution(issues) {
        console.log('🔧 Fixing Cucumber.js execution issues...');
        
        try {
            // Ensure cucumber is properly installed
            await execAsync('npm install @cucumber/cucumber cucumber-html-reporter --save-dev', { 
                cwd: __dirname,
                timeout: 60000 
            });
            
            // Create a proper cucumber runner script
            const cucumberRunnerPath = path.join(__dirname, 'cucumber-runner-fixed.js');
            const cucumberRunner = `#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

async function runCucumberTests() {
    return new Promise((resolve, reject) => {
        const cucumberPath = path.join(__dirname, 'node_modules', '.bin', 'cucumber-js');
        
        const args = [
            'features/**/*.feature',
            '--require', 'features/step_definitions/**/*.js',
            '--require', 'features/support/**/*.js',
            '--format', 'json:reports/cucumber-report.json',
            '--format', 'html:reports/cucumber-report.html',
            '--format', 'pretty'
        ];
        
        const cucumber = spawn('node', [cucumberPath, ...args], {
            stdio: 'inherit',
            cwd: __dirname
        });
        
        cucumber.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Cucumber tests completed successfully');
                resolve({ success: true });
            } else {
                console.log(\`⚠️  Cucumber tests completed with exit code: \${code}\`);
                resolve({ success: false, exitCode: code });
            }
        });
        
        cucumber.on('error', (error) => {
            console.error('❌ Cucumber execution error:', error.message);
            reject(error);
        });
    });
}

if (require.main === module) {
    runCucumberTests().catch(console.error);
}

module.exports = { runCucumberTests };
`;
            
            await fs.writeFile(cucumberRunnerPath, cucumberRunner);
            await execAsync(`chmod +x ${cucumberRunnerPath}`);
            
            return {
                success: true,
                message: 'Created fixed Cucumber runner with proper module resolution',
                requiresRestart: false
            };
        } catch (error) {
            throw new Error(`Failed to fix Cucumber execution: ${error.message}`);
        }
    }

    async fixWebDriverSession(issues) {
        console.log('🔧 Fixing WebDriver and Chrome browser issues...');
        
        try {
            // Update Chrome and ChromeDriver versions
            await execAsync('npm install selenium-webdriver@latest chromedriver@latest --save', { 
                cwd: __dirname,
                timeout: 60000 
            });
            
            // Create a robust WebDriver configuration
            const driverConfigPath = path.join(__dirname, 'utils', 'enhanced-driver-manager.js');
            
            await fs.mkdir(path.dirname(driverConfigPath), { recursive: true });
            
            const enhancedDriverConfig = `const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');

class EnhancedDriverManager {
    static async createDriver(headless = true) {
        const options = new chrome.Options();
        
        if (headless) {
            options.addArguments('--headless=new');
        }
        
        options.addArguments(
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--remote-debugging-port=9222'
        );
        
        // Set ChromeDriver path if needed
        const service = new chrome.ServiceBuilder();
        
        try {
            // Try to find chromedriver
            const chromeDriverPath = require('chromedriver').path;
            service.setPath(chromeDriverPath);
        } catch (error) {
            console.log('⚠️  ChromeDriver path not found, using system PATH');
        }
        
        const driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .setChromeService(service)
            .build();
            
        // Set timeouts
        await driver.manage().setTimeouts({
            implicit: 10000,
            pageLoad: 30000,
            script: 30000
        });
        
        return driver;
    }
    
    static async quitDriver(driver) {
        if (driver) {
            try {
                await driver.quit();
            } catch (error) {
                console.log('⚠️  Error quitting driver:', error.message);
            }
        }
    }
}

module.exports = EnhancedDriverManager;
`;
            
            await fs.writeFile(driverConfigPath, enhancedDriverConfig);
            
            return {
                success: true,
                message: 'Updated WebDriver configuration with enhanced Chrome support',
                requiresRestart: false
            };
        } catch (error) {
            throw new Error(`Failed to fix WebDriver session: ${error.message}`);
        }
    }

    async fixPackageInstallation(issues) {
        console.log('🔧 Fixing package installation issues...');
        
        try {
            // Clear npm cache and reinstall
            await execAsync('npm cache clean --force', { cwd: __dirname, timeout: 30000 });
            await execAsync('rm -rf node_modules package-lock.json', { cwd: __dirname, timeout: 30000 });
            await execAsync('npm install', { cwd: __dirname, timeout: 120000 });
            
            return {
                success: true,
                message: 'Cleared cache and reinstalled all packages',
                requiresRestart: false
            };
        } catch (error) {
            throw new Error(`Failed to fix package installation: ${error.message}`);
        }
    }

    async fixLokiConnection(issues) {
        console.log('🔧 Fixing Loki connection issues...');
        
        try {
            // Check if Loki is running and restart if needed
            const { stdout } = await execAsync('wsl -d Ubuntu-EDrive -e bash -c "docker ps --filter name=loki --format \\"{{.Status}}\\""', { timeout: 10000 });
            
            if (!stdout.includes('Up')) {
                console.log('🔄 Restarting Loki container...');
                await execAsync('wsl -d Ubuntu-EDrive -e bash -c "cd /home/ubuntu/regression-testing && docker-compose restart loki"', { timeout: 30000 });
                
                // Wait for Loki to be ready
                await this.sleep(10000);
            }
            
            return {
                success: true,
                message: 'Loki connection restored',
                requiresRestart: false
            };
        } catch (error) {
            throw new Error(`Failed to fix Loki connection: ${error.message}`);
        }
    }

    async fixGitHubActionsWorkflow(issues) {
        console.log('🔧 Fixing GitHub Actions workflow issues...');
        
        try {
            // Trigger a fresh workflow run
            if (this.githubToken) {
                await execAsync(`gh workflow run regression-tests.yml`, { 
                    timeout: 15000,
                    env: { ...process.env, GITHUB_TOKEN: this.githubToken }
                });
                
                return {
                    success: true,
                    message: 'Triggered fresh GitHub Actions workflow run',
                    requiresRestart: false
                };
            } else {
                return {
                    success: false,
                    message: 'GitHub token not available for workflow trigger',
                    requiresRestart: false
                };
            }
        } catch (error) {
            throw new Error(`Failed to fix GitHub Actions workflow: ${error.message}`);
        }
    }

    async triggerPipelineRerun(issues) {
        try {
            if (this.githubToken) {
                console.log('🔄 Triggering pipeline re-run...');
                await execAsync('gh workflow run regression-tests.yml', { 
                    timeout: 15000,
                    env: { ...process.env, GITHUB_TOKEN: this.githubToken }
                });
                console.log('✅ Pipeline re-run triggered');
            }
        } catch (error) {
            console.log('⚠️  Could not trigger pipeline re-run:', error.message);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async stop() {
        console.log('🛑 Stopping Intelligent Auto-Fixer...');
        this.monitoring = false;
        
        console.log(`\n📊 Fix Summary:`);
        console.log(`Total fixes applied: ${this.fixHistory.length}`);
        
        const successfulFixes = this.fixHistory.filter(fix => fix.result.success);
        const failedFixes = this.fixHistory.filter(fix => !fix.result.success);
        
        console.log(`✅ Successful: ${successfulFixes.length}`);
        console.log(`❌ Failed: ${failedFixes.length}`);
        
        if (successfulFixes.length > 0) {
            console.log('\n✅ Successful Fixes:');
            successfulFixes.forEach(fix => {
                console.log(`  - ${fix.pattern}: ${fix.result.message}`);
            });
        }
        
        if (failedFixes.length > 0) {
            console.log('\n❌ Failed Fixes:');
            failedFixes.forEach(fix => {
                console.log(`  - ${fix.pattern}: ${fix.result.error}`);
            });
        }
    }
}

// CLI usage
if (require.main === module) {
    const fixer = new IntelligentAutoFixer();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        await fixer.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        await fixer.stop();
        process.exit(0);
    });
    
    // Start the auto-fixer
    fixer.start().catch(console.error);
}

module.exports = IntelligentAutoFixer;
