#!/usr/bin/env node

/**
 * Overnight Monitoring Report Generator
 * Monitors pipeline runs, regression tests, system health, and generates detailed reports
 */

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class OvernightMonitor {
    constructor() {
        this.startTime = new Date();
        this.reportData = {
            monitoring: {
                startTime: this.startTime.toISOString(),
                endTime: null,
                duration: null
            },
            pipelines: {
                totalRuns: 0,
                successful: 0,
                failed: 0,
                runs: []
            },
            regressionTests: {
                totalRuns: 0,
                successful: 0,
                failed: 0,
                runs: []
            },
            systemHealth: {
                grafana: { status: 'unknown', checks: [] },
                loki: { status: 'unknown', checks: [] },
                docker: { status: 'unknown', checks: [] },
                autoFixer: { status: 'unknown', activations: 0, fixes: [] }
            },
            issues: {
                detected: [],
                resolved: [],
                pending: []
            },
            summary: {
                overallHealth: 'monitoring',
                keyMetrics: {},
                recommendations: []
            }
        };
    }

    async initialize() {
        console.log('🌙 Overnight Monitoring System Started');
        console.log(`📅 Start Time: ${this.startTime.toLocaleString()}`);
        
        // Create monitoring logs directory
        await fs.mkdir('logs/overnight', { recursive: true });
        
        // Start monitoring loops
        this.startPipelineMonitoring();
        this.startSystemHealthMonitoring();
        this.startAutoFixerMonitoring();
        
        console.log('✅ All monitoring systems active');
    }

    async startPipelineMonitoring() {
        setInterval(async () => {
            try {
                await this.checkPipelineRuns();
            } catch (error) {
                console.error('Pipeline monitoring error:', error.message);
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    async startSystemHealthMonitoring() {
        setInterval(async () => {
            try {
                await this.checkSystemHealth();
            } catch (error) {
                console.error('System health monitoring error:', error.message);
            }
        }, 10 * 60 * 1000); // Every 10 minutes
    }

    async startAutoFixerMonitoring() {
        setInterval(async () => {
            try {
                await this.checkAutoFixerActivity();
            } catch (error) {
                console.error('Auto-fixer monitoring error:', error.message);
            }
        }, 2 * 60 * 1000); // Every 2 minutes
    }

    async checkPipelineRuns() {
        try {
            const { stdout } = await execAsync('gh run list --limit 20 --json status,conclusion,name,createdAt,id,event');
            const runs = JSON.parse(stdout);
            
            const since = new Date(Date.now() - 12 * 60 * 60 * 1000); // Last 12 hours
            const recentRuns = runs.filter(run => new Date(run.createdAt) > since);
            
            for (const run of recentRuns) {
                const existingRun = this.reportData.pipelines.runs.find(r => r.id === run.id);
                if (!existingRun) {
                    this.reportData.pipelines.runs.push({
                        id: run.id,
                        name: run.name,
                        status: run.status,
                        conclusion: run.conclusion,
                        event: run.event,
                        createdAt: run.createdAt,
                        checkedAt: new Date().toISOString()
                    });
                    
                    if (run.conclusion === 'success') {
                        this.reportData.pipelines.successful++;
                    } else if (run.conclusion === 'failure') {
                        this.reportData.pipelines.failed++;
                        // Log failure for detailed analysis
                        await this.analyzePipelineFailure(run);
                    }
                    this.reportData.pipelines.totalRuns++;
                }
            }
            
            console.log(`📊 Pipeline Status: ${this.reportData.pipelines.successful}✅ ${this.reportData.pipelines.failed}❌`);
        } catch (error) {
            console.error('Failed to check pipeline runs:', error.message);
        }
    }

    async analyzePipelineFailure(run) {
        try {
            const { stdout } = await execAsync(`gh run view ${run.id} --log`);
            const logAnalysis = this.analyzeFailureLogs(stdout);
            
            this.reportData.issues.detected.push({
                type: 'pipeline_failure',
                runId: run.id,
                runName: run.name,
                analysis: logAnalysis,
                detectedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error(`Failed to analyze pipeline ${run.id}:`, error.message);
        }
    }

    analyzeFailureLogs(logs) {
        const issues = [];
        
        // Common failure patterns
        if (logs.includes('Error [ERR_REQUIRE_ESM]')) {
            issues.push('ESM module compatibility issue');
        }
        if (logs.includes('npm warn EBADENGINE')) {
            issues.push('Node.js version compatibility issue');
        }
        if (logs.includes('Chrome not found') || logs.includes('chromium-browser not found')) {
            issues.push('Chrome/Chromium installation issue');
        }
        if (logs.includes('ln: failed to create symbolic link')) {
            issues.push('Symbolic link creation failure');
        }
        if (logs.includes('docker: command not found') || logs.includes('Docker build failed')) {
            issues.push('Docker setup issue');
        }
        if (logs.includes('Connection refused') || logs.includes('ECONNREFUSED')) {
            issues.push('Service connection issue');
        }
        
        return issues.length > 0 ? issues : ['Unknown failure - requires manual analysis'];
    }

    async checkSystemHealth() {
        const timestamp = new Date().toISOString();
        
        // Check Grafana
        try {
            const { stdout: dockerPs } = await execAsync('wsl -d Ubuntu-EDrive -e bash -c "docker ps"');
            const grafanaRunning = dockerPs.includes('grafana/grafana');
            this.reportData.systemHealth.grafana.status = grafanaRunning ? 'healthy' : 'down';
            this.reportData.systemHealth.grafana.checks.push({
                timestamp,
                status: this.reportData.systemHealth.grafana.status
            });
        } catch (error) {
            this.reportData.systemHealth.grafana.status = 'error';
            this.reportData.systemHealth.grafana.checks.push({
                timestamp,
                status: 'error',
                error: error.message
            });
        }

        // Check Loki
        try {
            const { stdout } = await execAsync('wsl -d Ubuntu-EDrive -e bash -c "curl -s http://localhost:3100/ready"');
            this.reportData.systemHealth.loki.status = stdout.includes('ready') ? 'healthy' : 'down';
            this.reportData.systemHealth.loki.checks.push({
                timestamp,
                status: this.reportData.systemHealth.loki.status
            });
        } catch (error) {
            this.reportData.systemHealth.loki.status = 'down';
            this.reportData.systemHealth.loki.checks.push({
                timestamp,
                status: 'down',
                error: error.message
            });
        }

        console.log(`🏥 System Health: Grafana(${this.reportData.systemHealth.grafana.status}) Loki(${this.reportData.systemHealth.loki.status})`);
    }

    async checkAutoFixerActivity() {
        try {
            // Check if auto-fixer logs exist and analyze activity
            const logExists = await fs.access('logs/auto-fixer.log').then(() => true).catch(() => false);
            if (logExists) {
                const logs = await fs.readFile('logs/auto-fixer.log', 'utf8');
                const lines = logs.split('\n');
                const recentLines = lines.slice(-50); // Last 50 lines
                
                const activations = recentLines.filter(line => 
                    line.includes('🔧 Applying fix') || line.includes('Auto-fix activated')
                ).length;
                
                if (activations > this.reportData.systemHealth.autoFixer.activations) {
                    const newFixes = activations - this.reportData.systemHealth.autoFixer.activations;
                    this.reportData.systemHealth.autoFixer.fixes.push({
                        timestamp: new Date().toISOString(),
                        count: newFixes,
                        details: recentLines.filter(line => line.includes('🔧'))
                    });
                    this.reportData.systemHealth.autoFixer.activations = activations;
                    console.log(`🔧 Auto-fixer activity detected: ${newFixes} new fixes`);
                }
                
                this.reportData.systemHealth.autoFixer.status = 'active';
            } else {
                this.reportData.systemHealth.autoFixer.status = 'inactive';
            }
        } catch (error) {
            this.reportData.systemHealth.autoFixer.status = 'error';
            console.error('Auto-fixer monitoring error:', error.message);
        }
    }

    async generateReport() {
        const endTime = new Date();
        this.reportData.monitoring.endTime = endTime.toISOString();
        this.reportData.monitoring.duration = Math.round((endTime - this.startTime) / 1000 / 60); // minutes

        // Calculate overall health
        const healthScore = this.calculateHealthScore();
        this.reportData.summary.overallHealth = healthScore > 80 ? 'excellent' : 
                                               healthScore > 60 ? 'good' : 
                                               healthScore > 40 ? 'fair' : 'needs-attention';

        // Generate key metrics
        this.reportData.summary.keyMetrics = {
            pipelineSuccessRate: this.reportData.pipelines.totalRuns > 0 ? 
                Math.round((this.reportData.pipelines.successful / this.reportData.pipelines.totalRuns) * 100) : 0,
            systemUptime: this.calculateSystemUptime(),
            autoFixerEffectiveness: this.reportData.systemHealth.autoFixer.activations,
            totalIssuesDetected: this.reportData.issues.detected.length,
            totalIssuesResolved: this.reportData.issues.resolved.length
        };

        // Generate recommendations
        this.generateRecommendations();

        // Save report
        const reportPath = `logs/overnight/monitoring-report-${endTime.toISOString().split('T')[0]}.json`;
        await fs.writeFile(reportPath, JSON.stringify(this.reportData, null, 2));

        // Generate human-readable report
        const readableReport = this.generateReadableReport();
        const readableReportPath = `logs/overnight/morning-report-${endTime.toISOString().split('T')[0]}.md`;
        await fs.writeFile(readableReportPath, readableReport);

        console.log(`📋 Reports saved:`);
        console.log(`   JSON: ${reportPath}`);
        console.log(`   Readable: ${readableReportPath}`);

        return { reportPath, readableReportPath, data: this.reportData };
    }

    calculateHealthScore() {
        let score = 100;
        
        // Pipeline health (40% weight)
        const pipelineSuccessRate = this.reportData.pipelines.totalRuns > 0 ? 
            (this.reportData.pipelines.successful / this.reportData.pipelines.totalRuns) : 1;
        score -= (1 - pipelineSuccessRate) * 40;
        
        // System health (40% weight)
        const systemHealthScore = (
            (this.reportData.systemHealth.grafana.status === 'healthy' ? 1 : 0) +
            (this.reportData.systemHealth.loki.status === 'healthy' ? 1 : 0) +
            (this.reportData.systemHealth.autoFixer.status === 'active' ? 1 : 0)
        ) / 3;
        score -= (1 - systemHealthScore) * 40;
        
        // Issue resolution (20% weight)
        const issueResolutionRate = this.reportData.issues.detected.length > 0 ?
            (this.reportData.issues.resolved.length / this.reportData.issues.detected.length) : 1;
        score -= (1 - issueResolutionRate) * 20;
        
        return Math.max(0, Math.round(score));
    }

    calculateSystemUptime() {
        const grafanaUptime = this.calculateServiceUptime(this.reportData.systemHealth.grafana.checks);
        const lokiUptime = this.calculateServiceUptime(this.reportData.systemHealth.loki.checks);
        return Math.round((grafanaUptime + lokiUptime) / 2);
    }

    calculateServiceUptime(checks) {
        if (checks.length === 0) return 100;
        const healthyChecks = checks.filter(check => check.status === 'healthy').length;
        return Math.round((healthyChecks / checks.length) * 100);
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Pipeline recommendations
        const pipelineSuccessRate = this.reportData.pipelines.totalRuns > 0 ? 
            (this.reportData.pipelines.successful / this.reportData.pipelines.totalRuns) * 100 : 100;
            
        if (pipelineSuccessRate < 80) {
            recommendations.push({
                priority: 'high',
                category: 'pipeline',
                issue: `Pipeline success rate is ${pipelineSuccessRate.toFixed(1)}%`,
                recommendation: 'Review failed pipeline logs and consider implementing additional auto-fixes'
            });
        }

        // System health recommendations
        if (this.reportData.systemHealth.grafana.status !== 'healthy') {
            recommendations.push({
                priority: 'high',
                category: 'infrastructure',
                issue: 'Grafana service not running properly',
                recommendation: 'Restart Grafana container and check Docker service'
            });
        }

        if (this.reportData.systemHealth.loki.status !== 'healthy') {
            recommendations.push({
                priority: 'high',
                category: 'infrastructure',
                issue: 'Loki service not responding',
                recommendation: 'Check Loki container status and log aggregation pipeline'
            });
        }

        // Auto-fixer recommendations
        if (this.reportData.systemHealth.autoFixer.status !== 'active') {
            recommendations.push({
                priority: 'medium',
                category: 'automation',
                issue: 'Auto-fixer system not active',
                recommendation: 'Restart intelligent auto-fixer service'
            });
        }

        this.reportData.summary.recommendations = recommendations;
    }

    generateReadableReport() {
        const { monitoring, pipelines, systemHealth, issues, summary } = this.reportData;
        
        return `
# 🌅 Morning System Report - ${new Date(monitoring.endTime).toLocaleDateString()}

## 📊 Executive Summary
- **Overall Health**: ${summary.overallHealth.toUpperCase()} (${this.calculateHealthScore()}%)
- **Monitoring Duration**: ${monitoring.duration} minutes
- **Pipeline Success Rate**: ${summary.keyMetrics.pipelineSuccessRate}%
- **System Uptime**: ${summary.keyMetrics.systemUptime}%

## 🚀 Pipeline Activity
- **Total Runs**: ${pipelines.totalRuns}
- **Successful**: ${pipelines.successful} ✅
- **Failed**: ${pipelines.failed} ❌
- **Success Rate**: ${summary.keyMetrics.pipelineSuccessRate}%

### Recent Pipeline Runs
${pipelines.runs.slice(-5).map(run => 
    `- ${run.name}: ${run.conclusion === 'success' ? '✅' : run.conclusion === 'failure' ? '❌' : '⏳'} (${new Date(run.createdAt).toLocaleTimeString()})`
).join('\n')}

## 🏥 System Health Status

### Services
- **Grafana**: ${systemHealth.grafana.status === 'healthy' ? '✅ Healthy' : '❌ ' + systemHealth.grafana.status}
- **Loki**: ${systemHealth.loki.status === 'healthy' ? '✅ Healthy' : '❌ ' + systemHealth.loki.status}
- **Auto-Fixer**: ${systemHealth.autoFixer.status === 'active' ? '✅ Active' : '❌ ' + systemHealth.autoFixer.status}

### Auto-Fixer Activity
- **Total Activations**: ${systemHealth.autoFixer.activations}
- **Recent Fixes**: ${systemHealth.autoFixer.fixes.length}

## 🔍 Issues Detected & Resolved
- **Total Issues Detected**: ${issues.detected.length}
- **Issues Resolved**: ${issues.resolved.length}
- **Pending Issues**: ${issues.pending.length}

### Issue Summary
${issues.detected.slice(-5).map(issue => 
    `- **${issue.type}**: ${issue.analysis?.join(', ') || 'Under analysis'} (${new Date(issue.detectedAt).toLocaleTimeString()})`
).join('\n')}

## 📋 Recommendations

${summary.recommendations.map(rec => 
    `### ${rec.priority.toUpperCase()} Priority - ${rec.category}
**Issue**: ${rec.issue}
**Recommendation**: ${rec.recommendation}
`).join('\n')}

## 🔗 Quick Actions
- View detailed logs: \`logs/overnight/\`
- Check pipeline status: \`gh run list --limit 10\`
- Restart services: \`docker restart grafana loki\`
- Start auto-fixer: \`node intelligent-auto-fixer.js\`

---
*Report generated at: ${new Date(monitoring.endTime).toLocaleString()}*
*Next report will be generated tomorrow morning*
`;
    }

    async stop() {
        console.log('🛑 Stopping overnight monitoring...');
        const report = await this.generateReport();
        console.log('📊 Final report generated');
        return report;
    }
}

// Start monitoring if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const monitor = new OvernightMonitor();
    await monitor.initialize();
    
    // Generate report every hour
    setInterval(async () => {
        try {
            await monitor.generateReport();
            console.log('📋 Hourly report generated');
        } catch (error) {
            console.error('Failed to generate hourly report:', error);
        }
    }, 60 * 60 * 1000); // Every hour
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🌅 Morning! Generating final report...');
        await monitor.stop();
        process.exit(0);
    });
    
    // Keep process alive
    setInterval(() => {
        console.log(`🔄 Monitoring active - ${new Date().toLocaleTimeString()}`);
    }, 15 * 60 * 1000); // Status update every 15 minutes
}

export default OvernightMonitor;
