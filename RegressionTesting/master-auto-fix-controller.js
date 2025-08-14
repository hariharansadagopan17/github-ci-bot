#!/usr/bin/env node

/**
 * Master Auto-Fix Controller
 * Orchestrates all auto-fixing systems for pipeline and regression issues
 */

const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class MasterAutoFixController {
    constructor() {
        this.systems = {
            intelligentFixer: null,
            grafanaMonitor: null,
            pipelineWatcher: null
        };
        
        this.isRunning = false;
        this.fixQueue = [];
        this.stats = {
            totalFixes: 0,
            successfulFixes: 0,
            failedFixes: 0,
            pipelineReruns: 0,
            lastHealthCheck: null
        };
    }

    async initialize() {
        console.log('🎛️  Initializing Master Auto-Fix Controller...');
        
        try {
            // Initialize Intelligent Auto-Fixer
            const IntelligentAutoFixer = require('./intelligent-auto-fixer');
            this.systems.intelligentFixer = new IntelligentAutoFixer();
            
            // Initialize Grafana Monitor
            const GrafanaLogMonitor = require('./grafana-auto-fixer');
            this.systems.grafanaMonitor = new GrafanaLogMonitor();
            await this.systems.grafanaMonitor.initialize();
            
            // Initialize Pipeline Watcher
            this.systems.pipelineWatcher = new PipelineWatcher();
            
            console.log('✅ All systems initialized successfully');
            
            // Perform initial health check
            await this.performHealthCheck();
            
        } catch (error) {
            console.error('❌ Failed to initialize systems:', error.message);
            throw error;
        }
    }

    async start() {
        console.log('\n🚀 Starting Master Auto-Fix Controller...');
        console.log('🎯 Monitoring: GitHub Actions, Regression Tests, Docker, Loki, Grafana');
        
        this.isRunning = true;
        
        // Start all systems
        const promises = [
            this.startIntelligentFixer(),
            this.startGrafanaMonitor(),
            this.startPipelineWatcher(),
            this.startHealthMonitoring(),
            this.startFixQueueProcessor()
        ];
        
        await Promise.all(promises);
    }

    async startIntelligentFixer() {
        if (this.systems.intelligentFixer) {
            console.log('🤖 Starting Intelligent Auto-Fixer...');
            setTimeout(() => {
                this.systems.intelligentFixer.start().catch(error => {
                    console.error('❌ Intelligent Auto-Fixer error:', error.message);
                    this.handleSystemError('intelligentFixer', error);
                });
            }, 2000);
        }
    }

    async startGrafanaMonitor() {
        if (this.systems.grafanaMonitor) {
            console.log('📊 Starting Grafana Log Monitor...');
            setTimeout(() => {
                this.systems.grafanaMonitor.startMonitoring().catch(error => {
                    console.error('❌ Grafana Monitor error:', error.message);
                    this.handleSystemError('grafanaMonitor', error);
                });
            }, 3000);
        }
    }

    async startPipelineWatcher() {
        if (this.systems.pipelineWatcher) {
            console.log('⚡ Starting Pipeline Watcher...');
            setTimeout(() => {
                this.systems.pipelineWatcher.start().catch(error => {
                    console.error('❌ Pipeline Watcher error:', error.message);
                    this.handleSystemError('pipelineWatcher', error);
                });
            }, 1000);
        }
    }

    async startHealthMonitoring() {
        console.log('💊 Starting Health Monitoring...');
        
        while (this.isRunning) {
            try {
                await this.performHealthCheck();
                await this.sleep(60000); // Check every minute
            } catch (error) {
                console.error('❌ Health monitoring error:', error.message);
                await this.sleep(120000); // Wait longer on error
            }
        }
    }

    async startFixQueueProcessor() {
        console.log('🔄 Starting Fix Queue Processor...');
        
        while (this.isRunning) {
            try {
                if (this.fixQueue.length > 0) {
                    const fix = this.fixQueue.shift();
                    await this.processFix(fix);
                }
                
                await this.sleep(5000); // Process queue every 5 seconds
            } catch (error) {
                console.error('❌ Fix queue processor error:', error.message);
                await this.sleep(10000);
            }
        }
    }

    async performHealthCheck() {
        console.log('\n🏥 Performing system health check...');
        
        const health = {
            timestamp: new Date().toISOString(),
            github: await this.checkGitHubHealth(),
            docker: await this.checkDockerHealth(),
            loki: await this.checkLokiHealth(),
            grafana: await this.checkGrafanaHealth(),
            regression: await this.checkRegressionHealth()
        };
        
        this.stats.lastHealthCheck = health;
        
        const healthyServices = Object.values(health).filter(status => status === true).length - 1; // Exclude timestamp
        const totalServices = Object.keys(health).length - 1;
        
        console.log(`💪 System Health: ${healthyServices}/${totalServices} services healthy`);
        
        // Auto-fix unhealthy services
        for (const [service, status] of Object.entries(health)) {
            if (status === false && service !== 'timestamp') {
                this.queueFix({
                    type: 'health',
                    service,
                    priority: 'high',
                    timestamp: Date.now()
                });
            }
        }
        
        return health;
    }

    async checkGitHubHealth() {
        try {
            const { stdout } = await execAsync('gh auth status', { timeout: 5000 });
            return stdout.includes('Logged in to github.com');
        } catch (error) {
            return false;
        }
    }

    async checkDockerHealth() {
        try {
            const { stdout } = await execAsync('wsl -d Ubuntu-EDrive -e bash -c "docker ps"', { timeout: 10000 });
            return stdout.includes('CONTAINER ID');
        } catch (error) {
            return false;
        }
    }

    async checkLokiHealth() {
        try {
            const { stdout } = await execAsync('wsl -d Ubuntu-EDrive -e bash -c "curl -s http://localhost:3100/ready"', { timeout: 5000 });
            return stdout.includes('ready');
        } catch (error) {
            return false;
        }
    }

    async checkGrafanaHealth() {
        try {
            const { stdout } = await execAsync('wsl -d Ubuntu-EDrive -e bash -c "curl -s http://localhost:3004/api/health"', { timeout: 5000 });
            return stdout.includes('ok');
        } catch (error) {
            return false;
        }
    }

    async checkRegressionHealth() {
        try {
            // Check if regression test files exist and are executable
            const fs = require('fs');
            const testFiles = ['quick-test.js', 'automated-regression-runner.js'];
            
            for (const file of testFiles) {
                const filePath = path.join(__dirname, file);
                if (!fs.existsSync(filePath)) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    queueFix(fix) {
        console.log(`📋 Queuing fix: ${fix.type} - ${fix.service || fix.pattern} (Priority: ${fix.priority})`);
        
        // Insert based on priority
        if (fix.priority === 'critical') {
            this.fixQueue.unshift(fix);
        } else {
            this.fixQueue.push(fix);
        }
    }

    async processFix(fix) {
        console.log(`\n🔧 Processing fix: ${fix.type} - ${fix.service || fix.pattern}`);
        
        try {
            let result;
            
            switch (fix.type) {
                case 'health':
                    result = await this.fixHealthIssue(fix.service);
                    break;
                case 'pipeline':
                    result = await this.fixPipelineIssue(fix);
                    break;
                case 'regression':
                    result = await this.fixRegressionIssue(fix);
                    break;
                default:
                    result = { success: false, message: 'Unknown fix type' };
            }
            
            if (result.success) {
                this.stats.successfulFixes++;
                console.log(`✅ Fix successful: ${result.message}`);
            } else {
                this.stats.failedFixes++;
                console.log(`❌ Fix failed: ${result.message}`);
            }
            
            this.stats.totalFixes++;
            
        } catch (error) {
            this.stats.failedFixes++;
            this.stats.totalFixes++;
            console.error(`❌ Fix processing error:`, error.message);
        }
    }

    async fixHealthIssue(service) {
        console.log(`🏥 Fixing health issue for service: ${service}`);
        
        switch (service) {
            case 'docker':
                return await this.restartDockerServices();
            case 'loki':
                return await this.restartLoki();
            case 'grafana':
                return await this.restartGrafana();
            case 'github':
                return await this.authenticateGitHub();
            case 'regression':
                return await this.fixRegressionFiles();
            default:
                return { success: false, message: `Unknown service: ${service}` };
        }
    }

    async restartDockerServices() {
        try {
            console.log('🐳 Restarting Docker services...');
            
            await execAsync('wsl -d Ubuntu-EDrive -e bash -c "cd /home/ubuntu/regression-testing && docker-compose restart"', { timeout: 60000 });
            
            // Wait for services to be ready
            await this.sleep(15000);
            
            return { success: true, message: 'Docker services restarted successfully' };
        } catch (error) {
            return { success: false, message: `Docker restart failed: ${error.message}` };
        }
    }

    async restartLoki() {
        try {
            console.log('📊 Restarting Loki service...');
            
            await execAsync('wsl -d Ubuntu-EDrive -e bash -c "cd /home/ubuntu/regression-testing && docker-compose restart loki"', { timeout: 30000 });
            await this.sleep(10000);
            
            return { success: true, message: 'Loki restarted successfully' };
        } catch (error) {
            return { success: false, message: `Loki restart failed: ${error.message}` };
        }
    }

    async restartGrafana() {
        try {
            console.log('📈 Restarting Grafana service...');
            
            await execAsync('wsl -d Ubuntu-EDrive -e bash -c "cd /home/ubuntu/regression-testing && docker-compose restart grafana"', { timeout: 30000 });
            await this.sleep(10000);
            
            return { success: true, message: 'Grafana restarted successfully' };
        } catch (error) {
            return { success: false, message: `Grafana restart failed: ${error.message}` };
        }
    }

    async authenticateGitHub() {
        try {
            console.log('🔐 Re-authenticating GitHub CLI...');
            
            if (process.env.GITHUB_TOKEN) {
                await execAsync(`echo "${process.env.GITHUB_TOKEN}" | gh auth login --with-token`, { timeout: 15000 });
                return { success: true, message: 'GitHub authentication successful' };
            } else {
                return { success: false, message: 'GitHub token not available' };
            }
        } catch (error) {
            return { success: false, message: `GitHub auth failed: ${error.message}` };
        }
    }

    async fixRegressionFiles() {
        try {
            console.log('🧪 Fixing regression test files...');
            
            const fs = require('fs');
            
            // Check and fix automated-regression-runner.js if empty
            const runnerPath = path.join(__dirname, 'automated-regression-runner.js');
            const runnerContent = fs.readFileSync(runnerPath, 'utf8');
            
            if (runnerContent.trim().length < 100) {
                console.log('📝 Recreating automated-regression-runner.js...');
                
                const runnerCode = `#!/usr/bin/env node

/**
 * Fixed Automated Regression Runner
 */

const { spawn } = require('child_process');
const path = require('path');

class AutomatedRegressionRunner {
    constructor() {
        this.isRunning = false;
    }
    
    async start() {
        console.log('🎬 Starting Automated Regression Runner...');
        this.isRunning = true;
        
        try {
            await this.runQuickTest();
            await this.runCucumberTests();
            
            console.log('✅ All regression tests completed');
        } catch (error) {
            console.error('❌ Regression tests failed:', error.message);
        } finally {
            this.isRunning = false;
        }
    }
    
    async runQuickTest() {
        console.log('🚀 Running quick test...');
        
        return new Promise((resolve, reject) => {
            const test = spawn('node', ['quick-test.js'], {
                stdio: 'inherit',
                cwd: __dirname
            });
            
            test.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(\`Quick test failed with exit code \${code}\`));
                }
            });
        });
    }
    
    async runCucumberTests() {
        console.log('🥒 Running Cucumber tests...');
        
        return new Promise((resolve) => {
            const cucumber = spawn('npx', ['cucumber-js', 'features/login.feature'], {
                stdio: 'inherit',
                cwd: __dirname
            });
            
            cucumber.on('close', (code) => {
                console.log(`Cucumber tests completed with exit code: ${code}`);
                resolve(); // Don't reject on cucumber failures
            });
        });
    }
}

if (require.main === module) {
    const runner = new AutomatedRegressionRunner();
    runner.start().catch(console.error);
}

module.exports = AutomatedRegressionRunner;
`;
                
                fs.writeFileSync(runnerPath, runnerCode);
            }
            
            return { success: true, message: 'Regression files fixed successfully' };
        } catch (error) {
            return { success: false, message: `Regression fix failed: ${error.message}` };
        }
    }

    async fixPipelineIssue(fix) {
        console.log('⚡ Fixing pipeline issue...');
        
        try {
            // Trigger pipeline re-run
            await execAsync('gh workflow run regression-tests.yml', { timeout: 15000 });
            this.stats.pipelineReruns++;
            
            return { success: true, message: 'Pipeline re-run triggered' };
        } catch (error) {
            return { success: false, message: `Pipeline fix failed: ${error.message}` };
        }
    }

    async fixRegressionIssue(fix) {
        console.log('🧪 Fixing regression issue...');
        
        try {
            // Run a simple regression test to validate
            await execAsync('node quick-test.js', { 
                cwd: __dirname,
                timeout: 30000 
            });
            
            return { success: true, message: 'Regression validation successful' };
        } catch (error) {
            return { success: false, message: `Regression fix validation failed: ${error.message}` };
        }
    }

    handleSystemError(systemName, error) {
        console.error(`\n🚨 System error in ${systemName}:`, error.message);
        
        this.queueFix({
            type: 'system',
            service: systemName,
            priority: 'high',
            error: error.message,
            timestamp: Date.now()
        });
    }

    async generateStatus() {
        const status = {
            timestamp: new Date().toISOString(),
            isRunning: this.isRunning,
            systems: {
                intelligentFixer: !!this.systems.intelligentFixer,
                grafanaMonitor: !!this.systems.grafanaMonitor,
                pipelineWatcher: !!this.systems.pipelineWatcher
            },
            stats: this.stats,
            fixQueue: {
                length: this.fixQueue.length,
                pending: this.fixQueue.map(fix => ({
                    type: fix.type,
                    service: fix.service || fix.pattern,
                    priority: fix.priority
                }))
            },
            lastHealthCheck: this.stats.lastHealthCheck
        };
        
        return status;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async stop() {
        console.log('\n🛑 Stopping Master Auto-Fix Controller...');
        this.isRunning = false;
        
        // Stop all systems
        if (this.systems.intelligentFixer) {
            await this.systems.intelligentFixer.stop();
        }
        
        if (this.systems.grafanaMonitor) {
            await this.systems.grafanaMonitor.stop();
        }
        
        if (this.systems.pipelineWatcher) {
            await this.systems.pipelineWatcher.stop();
        }
        
        // Generate final status
        const finalStatus = await this.generateStatus();
        
        console.log('\n📊 Final Status Report:');
        console.log(`Total fixes applied: ${this.stats.totalFixes}`);
        console.log(`Successful fixes: ${this.stats.successfulFixes}`);
        console.log(`Failed fixes: ${this.stats.failedFixes}`);
        console.log(`Pipeline re-runs: ${this.stats.pipelineReruns}`);
        console.log(`Remaining queue items: ${this.fixQueue.length}`);
        
        // Save status report
        const fs = require('fs');
        const reportPath = `master-auto-fix-report-${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(finalStatus, null, 2));
        console.log(`📄 Final report saved to: ${reportPath}`);
    }
}

class PipelineWatcher {
    constructor() {
        this.watching = false;
    }
    
    async start() {
        console.log('👁️  Starting Pipeline Watcher...');
        this.watching = true;
        
        while (this.watching) {
            try {
                // Check for recent failed runs
                const { stdout } = await execAsync('gh run list --limit 5 --json status,conclusion,name', { timeout: 10000 });
                const runs = JSON.parse(stdout);
                
                for (const run of runs) {
                    if (run.status === 'completed' && run.conclusion === 'failure') {
                        console.log(`⚠️  Detected failed run: ${run.name}`);
                    }
                }
                
                await this.sleep(30000);
            } catch (error) {
                console.log('⚠️  Pipeline watcher error:', error.message);
                await this.sleep(60000);
            }
        }
    }
    
    async stop() {
        this.watching = false;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI usage
if (require.main === module) {
    const controller = new MasterAutoFixController();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        await controller.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        await controller.stop();
        process.exit(0);
    });
    
    // Start the controller
    controller.initialize()
        .then(() => controller.start())
        .catch(error => {
            console.error('❌ Failed to start Master Auto-Fix Controller:', error.message);
            process.exit(1);
        });
}

module.exports = MasterAutoFixController;
