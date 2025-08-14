#!/usr/bin/env node

/**
 * Real-time Pipeline Monitoring Dashboard (Simple Version)
 * Monitors pipeline failures and provides interactive troubleshooting
 */

const readline = require('readline');
const { spawn } = require('child_process');

// Simple console colors (no external dependencies)
const colors = {
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`
};

class PipelineMonitorDashboard {
    constructor() {
        this.troubleshooter = null; // Will be initialized dynamically
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.isMonitoring = false;
        this.monitorInterval = null;
    }

    async initialize() {
        // Dynamic import for the troubleshooter
        try {
            const PipelineTroubleshooter = require('./pipeline-troubleshooter');
            this.troubleshooter = new PipelineTroubleshooter();
        } catch (error) {
            console.log(colors.yellow('Warning: Pipeline troubleshooter not available:', error.message));
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
        console.log(colors.bold(colors.blue('\n🔧 CI/CD Pipeline Troubleshooting Dashboard')));
        console.log(colors.gray('─'.repeat(50)));
        
        await this.showMainMenu();
    }

    async showMainMenu() {
        console.log(colors.yellow('\n📋 Available Commands:'));
        console.log('1. 🔍 Check current pipeline status');
        console.log('2. 🚨 Monitor for failures (continuous)');
        console.log('3. 🛠️  Run troubleshooter on recent failures');
        console.log('4. 📊 View Grafana logs');
        console.log('5. 🔄 Restart failed pipeline');
        console.log('6. 📈 Generate troubleshooting report');
        console.log('7. ⚙️  Configure troubleshooter settings');
        console.log('8. 🚪 Exit');
        
        this.rl.question(colors.cyan('\nSelect option (1-8): '), async (answer) => {
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
                console.log(colors.red('❌ Invalid option. Please select 1-8.'));
                break;
        }
        
        // Return to menu after operation
        setTimeout(() => this.showMainMenu(), 2000);
    }

    async checkPipelineStatus() {
        console.log(colors.blue('\n🔍 Checking current pipeline status...'));
        
        try {
            const { data: runs } = await this.troubleshooter.octokit.rest.actions.listWorkflowRunsForRepo({
                owner: this.troubleshooter.owner,
                repo: this.troubleshooter.repo,
                per_page: 5
            });

            console.log(colors.yellow('\n📊 Recent Pipeline Runs:'));
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
            console.log(colors.red('❌ Error checking pipeline status:', error.message));
        }
    }

    async startContinuousMonitoring() {
        if (this.isMonitoring) {
            console.log(colors.yellow('⚠️  Monitoring is already running. Press Ctrl+C to stop.'));
            return;
        }

        console.log(colors.green('\n🚨 Starting continuous pipeline monitoring...'));
        console.log(colors.gray('Press Ctrl+C to stop monitoring'));
        
        this.isMonitoring = true;
        
        this.monitorInterval = setInterval(async () => {
            try {
                console.log(colors.blue(`\n[${new Date().toLocaleTimeString()}] 🔄 Checking for pipeline failures...`));
                
                const { data: runs } = await this.troubleshooter.octokit.rest.actions.listWorkflowRunsForRepo({
                    owner: this.troubleshooter.owner,
                    repo: this.troubleshooter.repo,
                    status: 'failure',
                    per_page: 1
                });

                if (runs.workflow_runs.length > 0) {
                    const failedRun = runs.workflow_runs[0];
                    console.log(colors.red(`🚨 FAILURE DETECTED: ${failedRun.name}`));
                    console.log(colors.yellow(`   Run ID: ${failedRun.id}`));
                    console.log(colors.yellow(`   Time: ${new Date(failedRun.created_at).toLocaleString()}`));
                    console.log(colors.yellow(`   URL: ${failedRun.html_url}`));
                    
                    // Automatically run troubleshooter
                    console.log(colors.blue('🛠️  Running automatic troubleshooter...'));
                    await this.troubleshooter.troubleshootFailedRun(failedRun);
                } else {
                    console.log(colors.green('✅ No failures detected'));
                }
                
            } catch (error) {
                console.log(colors.red('❌ Monitoring error:', error.message));
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
        console.log(colors.yellow('\n⏹️  Monitoring stopped'));
    }

    async runTroubleshooter() {
        console.log(colors.blue('\n🛠️  Running troubleshooter on recent failures...'));
        
        try {
            await this.troubleshooter.monitorPipelines();
            console.log(colors.green('✅ Troubleshooter completed successfully'));
        } catch (error) {
            console.log(colors.red('❌ Troubleshooter error:', error.message));
        }
    }

    async viewGrafanaLogs() {
        console.log(colors.blue('\n📊 Querying recent logs from Grafana/Loki...'));
        
        try {
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - (60 * 60 * 1000)); // Last hour
            
            const logs = await this.troubleshooter.queryGrafanaLogs(
                startTime.toISOString(),
                endTime.toISOString()
            );

            if (logs.data && logs.data.result && logs.data.result.length > 0) {
                console.log(colors.yellow('\n📝 Recent Error Logs:'));
                console.log('─'.repeat(80));
                
                logs.data.result.forEach(stream => {
                    stream.values.forEach(([timestamp, logLine]) => {
                        const time = new Date(parseInt(timestamp) / 1000000).toLocaleTimeString();
                        const log = JSON.parse(logLine);
                        console.log(`[${time}] ${log.level.toUpperCase()}: ${log.message}`);
                    });
                });
            } else {
                console.log(colors.green('✅ No recent error logs found'));
            }
            
        } catch (error) {
            console.log(colors.red('❌ Error querying Grafana logs:', error.message));
        }
    }

    async restartFailedPipeline() {
        console.log(colors.blue('\n🔄 Finding failed pipeline to restart...'));
        
        try {
            const { data: runs } = await this.troubleshooter.octokit.rest.actions.listWorkflowRunsForRepo({
                owner: this.troubleshooter.owner,
                repo: this.troubleshooter.repo,
                status: 'failure',
                per_page: 1
            });

            if (runs.workflow_runs.length === 0) {
                console.log(colors.yellow('⚠️  No failed pipelines found to restart'));
                return;
            }

            const failedRun = runs.workflow_runs[0];
            console.log(colors.yellow(`📋 Found failed run: ${failedRun.name} (ID: ${failedRun.id})`));
            
            await this.troubleshooter.restartPipeline(failedRun);
            console.log(colors.green('✅ Pipeline restart initiated'));
            
        } catch (error) {
            console.log(colors.red('❌ Error restarting pipeline:', error.message));
        }
    }

    async generateReport() {
        console.log(colors.blue('\n📈 Generating comprehensive troubleshooting report...'));
        
        try {
            const reportPath = `./logs/dashboard-report-${Date.now()}.json`;
            const report = {
                timestamp: new Date().toISOString(),
                pipelineStatus: await this.getPipelineStatus(),
                recentFailures: await this.getRecentFailures(),
                troubleshooterStats: await this.getTroubleshooterStats()
            };

            await require('fs').promises.writeFile(reportPath, JSON.stringify(report, null, 2));
            console.log(colors.green(`✅ Report generated: ${reportPath}`));
            
        } catch (error) {
            console.log(colors.red('❌ Error generating report:', error.message));
        }
    }

    async configureSettings() {
        console.log(colors.blue('\n⚙️  Configuration Options:'));
        console.log('1. Set monitoring interval');
        console.log('2. Configure Loki URL');
        console.log('3. Set GitHub repository');
        console.log('4. Back to main menu');
        
        this.rl.question(colors.cyan('Select option (1-4): '), async (answer) => {
            // Configuration logic would go here
            console.log(colors.yellow('⚠️  Configuration feature coming soon...'));
        });
    }

    getStatusIcon(conclusion) {
        switch (conclusion) {
            case 'success': return colors.green('✅');
            case 'failure': return colors.red('❌');
            case 'cancelled': return colors.yellow('⏹️');
            default: return colors.blue('🔄');
        }
    }

    async getPipelineStatus() {
        return { status: 'healthy' };
    }

    async getRecentFailures() {
        return [];
    }

    async getTroubleshooterStats() {
        return { fixesApplied: 0, successRate: 0 };
    }

    async exit() {
        this.stopMonitoring();
        console.log(colors.blue('\n👋 Goodbye! Pipeline monitoring dashboard closed.'));
        this.rl.close();
        process.exit(0);
    }
}

// Start dashboard if run directly
if (require.main === module) {
    new PipelineMonitorDashboard().start().catch(error => {
        console.error('Dashboard error:', error);
        process.exit(1);
    });
}

module.exports = PipelineMonitorDashboard;
