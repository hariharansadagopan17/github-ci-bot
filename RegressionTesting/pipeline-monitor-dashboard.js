#!/usr/bin/env node

/**
 * Real-time Pipeline Monitoring Dashboard
 * Monitors pipeline failures and provides interactive troubleshooting
 */

const readline = require('readline');
const { spawn } = require('child_process');

// Dynamic import for ES modules
let chalk;

async function initializeChalk() {
    if (!chalk) {
        try {
            chalk = (await import('chalk')).default;
        } catch (error) {
            // Fallback to simple console colors if chalk is not available
            chalk = {
                blue: { bold: (text) => `\x1b[1m\x1b[34m${text}\x1b[0m` },
                yellow: (text) => `\x1b[33m${text}\x1b[0m`,
                green: (text) => `\x1b[32m${text}\x1b[0m`,
                red: (text) => `\x1b[31m${text}\x1b[0m`,
                cyan: (text) => `\x1b[36m${text}\x1b[0m`,
                gray: (text) => `\x1b[90m${text}\x1b[0m`
            };
        }
    }
    return chalk;
}
const PipelineTroubleshooter = require('./pipeline-troubleshooter');

class PipelineMonitorDashboard {
    constructor() {
        this.troubleshooter = null; // Will be initialized dynamically
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.isMonitoring = false;
        this.monitorInterval = null;
        this.chalk = null;
    }

    async initialize() {
        // Initialize chalk and troubleshooter
        this.chalk = await initializeChalk();
        
        // Dynamic import for the troubleshooter
        try {
            const PipelineTroubleshooter = require('./pipeline-troubleshooter');
            this.troubleshooter = new PipelineTroubleshooter();
        } catch (error) {
            console.log('Warning: Pipeline troubleshooter not available:', error.message);
            // Create a mock troubleshooter for basic functionality
            this.troubleshooter = {
                octokit: {
                    rest: {
                        actions: {
                            listWorkflowRunsForRepo: async () => ({ data: { workflow_runs: [] } })
                        }
                    }
                },
                owner: 'hariharansadagopan17',
                repo: 'github-ci-bot',
                monitorPipelines: async () => console.log('Troubleshooter not fully initialized'),
                troubleshootFailedRun: async () => console.log('Troubleshoot functionality not available'),
                queryGrafanaLogs: async () => ({ data: { result: [] } }),
                restartPipeline: async () => console.log('Restart functionality not available')
            };
        }
    }

    async start() {
        await this.initialize();
        console.log(this.chalk.blue.bold('\n🔧 CI/CD Pipeline Troubleshooting Dashboard'));
        console.log(this.chalk.gray('─'.repeat(50)));
        
        await this.showMainMenu();
    }

    async showMainMenu() {
        console.log(this.chalk.yellow('\n📋 Available Commands:'));
        console.log('1. 🔍 Check current pipeline status');
        console.log('2. 🚨 Monitor for failures (continuous)');
        console.log('3. 🛠️  Run troubleshooter on recent failures');
        console.log('4. 📊 View Grafana logs');
        console.log('5. 🔄 Restart failed pipeline');
        console.log('6. 📈 Generate troubleshooting report');
        console.log('7. ⚙️  Configure troubleshooter settings');
        console.log('8. 🚪 Exit');
        
        this.rl.question(this.chalk.cyan('\nSelect option (1-8): '), async (answer) => {
            await this.handleMenuSelection(answer.trim());
        });
    }

    async handleMenuSelection(option) {
        switch (option) {
            case '1':
                await this.checkPipelineStatus();
                break;
            case '2':
                await this.startContinuousMonitoring();
                break;
            case '3':
                await this.runTroubleshooter();
                break;
            case '4':
                await this.viewGrafanaLogs();
                break;
            case '5':
                await this.restartFailedPipeline();
                break;
            case '6':
                await this.generateReport();
                break;
            case '7':
                await this.configureSettings();
                break;
            case '8':
                await this.exit();
                return;
            default:
                console.log(chalk.red('❌ Invalid option. Please select 1-8.'));
                break;
        }
        
        // Return to menu after operation
        setTimeout(() => this.showMainMenu(), 2000);
    }

    async checkPipelineStatus() {
        console.log(chalk.blue('\n🔍 Checking current pipeline status...'));
        
        try {
            const { data: runs } = await this.troubleshooter.octokit.rest.actions.listWorkflowRunsForRepo({
                owner: this.troubleshooter.owner,
                repo: this.troubleshooter.repo,
                per_page: 5
            });

            console.log(chalk.yellow('\n📊 Recent Pipeline Runs:'));
            console.log('─'.repeat(80));
            
            runs.workflow_runs.forEach((run, index) => {
                const status = this.getStatusIcon(run.conclusion);
                const time = new Date(run.created_at).toLocaleString();
                console.log(`${index + 1}. ${status} ${run.name} - ${time}`);
                console.log(`   Status: ${run.status} | Conclusion: ${run.conclusion || 'N/A'}`);
                console.log(`   URL: ${run.html_url}`);
                console.log();
            });
            
        } catch (error) {
            console.log(chalk.red('❌ Error checking pipeline status:', error.message));
        }
    }

    async startContinuousMonitoring() {
        if (this.isMonitoring) {
            console.log(chalk.yellow('⚠️  Monitoring is already running. Press Ctrl+C to stop.'));
            return;
        }

        console.log(chalk.green('\n🚨 Starting continuous pipeline monitoring...'));
        console.log(chalk.gray('Press Ctrl+C to stop monitoring'));
        
        this.isMonitoring = true;
        
        this.monitorInterval = setInterval(async () => {
            try {
                console.log(chalk.blue(`\n[${new Date().toLocaleTimeString()}] 🔄 Checking for pipeline failures...`));
                
                const { data: runs } = await this.troubleshooter.octokit.rest.actions.listWorkflowRunsForRepo({
                    owner: this.troubleshooter.owner,
                    repo: this.troubleshooter.repo,
                    status: 'failure',
                    per_page: 1
                });

                if (runs.workflow_runs.length > 0) {
                    const failedRun = runs.workflow_runs[0];
                    console.log(chalk.red(`🚨 FAILURE DETECTED: ${failedRun.name}`));
                    console.log(chalk.yellow(`   Run ID: ${failedRun.id}`));
                    console.log(chalk.yellow(`   Time: ${new Date(failedRun.created_at).toLocaleString()}`));
                    console.log(chalk.yellow(`   URL: ${failedRun.html_url}`));
                    
                    // Automatically run troubleshooter
                    console.log(chalk.blue('🛠️  Running automatic troubleshooter...'));
                    await this.troubleshooter.troubleshootFailedRun(failedRun);
                } else {
                    console.log(chalk.green('✅ No failures detected'));
                }
                
            } catch (error) {
                console.log(chalk.red('❌ Monitoring error:', error.message));
            }
        }, 30000); // Check every 30 seconds

        // Handle Ctrl+C to stop monitoring
        process.on('SIGINT', () => {
            this.stopMonitoring();
        });
    }

    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        this.isMonitoring = false;
        console.log(chalk.yellow('\n⏹️  Monitoring stopped'));
    }

    async runTroubleshooter() {
        console.log(chalk.blue('\n🛠️  Running troubleshooter on recent failures...'));
        
        try {
            await this.troubleshooter.monitorPipelines();
            console.log(chalk.green('✅ Troubleshooter completed successfully'));
        } catch (error) {
            console.log(chalk.red('❌ Troubleshooter error:', error.message));
        }
    }

    async viewGrafanaLogs() {
        console.log(chalk.blue('\n📊 Querying recent logs from Grafana/Loki...'));
        
        try {
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - (60 * 60 * 1000)); // Last hour
            
            const logs = await this.troubleshooter.queryGrafanaLogs(
                startTime.toISOString(),
                endTime.toISOString()
            );

            if (logs.data && logs.data.result && logs.data.result.length > 0) {
                console.log(chalk.yellow('\n📝 Recent Error Logs:'));
                console.log('─'.repeat(80));
                
                logs.data.result.forEach(stream => {
                    stream.values.forEach(([timestamp, logLine]) => {
                        const time = new Date(parseInt(timestamp) / 1000000).toLocaleTimeString();
                        const log = JSON.parse(logLine);
                        console.log(`[${time}] ${log.level.toUpperCase()}: ${log.message}`);
                    });
                });
            } else {
                console.log(chalk.green('✅ No recent error logs found'));
            }
            
        } catch (error) {
            console.log(chalk.red('❌ Error querying Grafana logs:', error.message));
        }
    }

    async restartFailedPipeline() {
        console.log(chalk.blue('\n🔄 Finding failed pipeline to restart...'));
        
        try {
            const { data: runs } = await this.troubleshooter.octokit.rest.actions.listWorkflowRunsForRepo({
                owner: this.troubleshooter.owner,
                repo: this.troubleshooter.repo,
                status: 'failure',
                per_page: 1
            });

            if (runs.workflow_runs.length === 0) {
                console.log(chalk.yellow('⚠️  No failed pipelines found to restart'));
                return;
            }

            const failedRun = runs.workflow_runs[0];
            console.log(chalk.yellow(`📋 Found failed run: ${failedRun.name} (ID: ${failedRun.id})`));
            
            await this.troubleshooter.restartPipeline(failedRun);
            console.log(chalk.green('✅ Pipeline restart initiated'));
            
        } catch (error) {
            console.log(chalk.red('❌ Error restarting pipeline:', error.message));
        }
    }

    async generateReport() {
        console.log(chalk.blue('\n📈 Generating comprehensive troubleshooting report...'));
        
        try {
            const reportPath = `./logs/dashboard-report-${Date.now()}.json`;
            const report = {
                timestamp: new Date().toISOString(),
                pipelineStatus: await this.getPipelineStatus(),
                recentFailures: await this.getRecentFailures(),
                troubleshooterStats: await this.getTroubleshooterStats()
            };

            await require('fs').promises.writeFile(reportPath, JSON.stringify(report, null, 2));
            console.log(chalk.green(`✅ Report generated: ${reportPath}`));
            
        } catch (error) {
            console.log(chalk.red('❌ Error generating report:', error.message));
        }
    }

    async configureSettings() {
        console.log(chalk.blue('\n⚙️  Configuration Options:'));
        console.log('1. Set monitoring interval');
        console.log('2. Configure Loki URL');
        console.log('3. Set GitHub repository');
        console.log('4. Back to main menu');
        
        this.rl.question(chalk.cyan('Select option (1-4): '), async (answer) => {
            // Configuration logic would go here
            console.log(chalk.yellow('⚠️  Configuration feature coming soon...'));
        });
    }

    getStatusIcon(conclusion) {
        switch (conclusion) {
            case 'success': return chalk.green('✅');
            case 'failure': return chalk.red('❌');
            case 'cancelled': return chalk.yellow('⏹️');
            default: return chalk.blue('🔄');
        }
    }

    async getPipelineStatus() {
        // Implementation for getting pipeline status
        return { status: 'healthy' };
    }

    async getRecentFailures() {
        // Implementation for getting recent failures
        return [];
    }

    async getTroubleshooterStats() {
        // Implementation for getting troubleshooter statistics
        return { fixesApplied: 0, successRate: 0 };
    }

    async exit() {
        this.stopMonitoring();
        console.log(chalk.blue('\n👋 Goodbye! Pipeline monitoring dashboard closed.'));
        this.rl.close();
        process.exit(0);
    }
}

// Start dashboard if run directly
if (require.main === module) {
    // Check if chalk is available
    try {
        require('chalk');
    } catch (error) {
        console.log('Installing required dependencies...');
        const install = spawn('npm', ['install', 'chalk'], { stdio: 'inherit' });
        install.on('close', (code) => {
            if (code === 0) {
                new PipelineMonitorDashboard().start();
            } else {
                console.error('Failed to install dependencies');
            }
        });
        return;
    }
    
    new PipelineMonitorDashboard().start();
}

module.exports = PipelineMonitorDashboard;
