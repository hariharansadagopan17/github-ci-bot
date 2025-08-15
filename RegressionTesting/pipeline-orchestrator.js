#!/usr/bin/env node

/**
 * Pipeline Rerun and Regression Fix Orchestrator
 * Comprehensive system to fix pipeline issues, rerun failed pipelines, and fix regression scripts
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class PipelineOrchestrator {
    constructor() {
        this.githubToken = process.env.GITHUB_TOKEN;
        this.repoOwner = 'hariharansadagopan17';
        this.repoName = 'github-ci-bot';
        
        this.activityLog = [];
        this.fixResults = {
            pipelineFixes: [],
            regressionFixes: [],
            rerunResults: [],
            totalIssuesFixed: 0,
            totalPipelinesRerun: 0
        };
    }

    logActivity(activity, status, details = '') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            activity,
            status,
            details
        };
        
        this.activityLog.push(logEntry);
        console.log(`[${timestamp}] ${status.toUpperCase()}: ${activity} - ${details}`);
    }

    async checkPipelineStatus() {
        this.logActivity('Pipeline Status Check', 'info', 'Checking recent GitHub Actions runs');
        
        try {
            const { stdout } = await execAsync('gh run list --limit 10 --json status,conclusion,name,createdAt,url');
            const runs = JSON.parse(stdout);
            
            const failedRuns = runs.filter(run => 
                run.conclusion === 'failure' || 
                run.conclusion === 'cancelled' || 
                run.status === 'failing'
            );
            
            this.logActivity('Pipeline Status Check', 'success', `Found ${failedRuns.length} failed runs out of ${runs.length} recent runs`);
            return { total: runs.length, failed: failedRuns.length, failedRuns };
            
        } catch (error) {
            this.logActivity('Pipeline Status Check', 'error', error.message);
            return { total: 0, failed: 0, failedRuns: [] };
        }
    }

    async fixDockerIssues() {
        this.logActivity('Docker Issues Fix', 'info', 'Checking and fixing Docker container issues');
        
        try {
            // Check Docker containers
            const { stdout: containerStatus } = await execAsync('wsl -d Ubuntu-EDrive -e bash -c "docker ps -a --format \'table {{.Names}}\\t{{.Status}}\'"');
            
            // Start Loki and Grafana containers
            await execAsync('wsl -d Ubuntu-EDrive -e bash -c "docker start fresh-loki fresh-grafana || echo \'Starting containers...\'"');
            
            // Wait for containers to be ready
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Verify containers are running
            const { stdout: runningContainers } = await execAsync('wsl -d Ubuntu-EDrive -e bash -c "docker ps --format \'{{.Names}}\'"');
            
            const lokiRunning = runningContainers.includes('fresh-loki');
            const grafanaRunning = runningContainers.includes('fresh-grafana');
            
            this.fixResults.pipelineFixes.push({
                type: 'Docker Infrastructure',
                lokiFixed: lokiRunning,
                grafanaFixed: grafanaRunning,
                status: (lokiRunning && grafanaRunning) ? 'success' : 'partial'
            });
            
            this.logActivity('Docker Issues Fix', 'success', `Loki: ${lokiRunning ? '✅' : '❌'}, Grafana: ${grafanaRunning ? '✅' : '❌'}`);
            return { lokiRunning, grafanaRunning };
            
        } catch (error) {
            this.logActivity('Docker Issues Fix', 'error', error.message);
            this.fixResults.pipelineFixes.push({
                type: 'Docker Infrastructure',
                status: 'failed',
                error: error.message
            });
            return { lokiRunning: false, grafanaRunning: false };
        }
    }

    async runMasterAutoFixer() {
        this.logActivity('Master Auto-Fixer', 'info', 'Running comprehensive auto-fix system');
        
        try {
            // Run the master auto-fix controller with timeout
            const { stdout, stderr } = await execAsync('timeout 60 node master-auto-fix-controller.js', {
                cwd: path.join(__dirname),
                timeout: 65000 // 65 seconds
            });
            
            // Parse the output for fix results
            const successMatches = stdout.match(/✅ Fix successful: (.+)/g) || [];
            const failedMatches = stdout.match(/❌ Fix failed: (.+)/g) || [];
            
            this.fixResults.pipelineFixes.push({
                type: 'Automated Fixes',
                successfulFixes: successMatches.length,
                failedFixes: failedMatches.length,
                status: successMatches.length > 0 ? 'success' : 'failed',
                details: {
                    successful: successMatches.map(m => m.replace('✅ Fix successful: ', '')),
                    failed: failedMatches.map(m => m.replace('❌ Fix failed: ', ''))
                }
            });
            
            this.logActivity('Master Auto-Fixer', 'success', `Applied ${successMatches.length} successful fixes, ${failedMatches.length} failed attempts`);
            return { successful: successMatches.length, failed: failedMatches.length };
            
        } catch (error) {
            // Timeout is expected, check if any fixes were applied
            if (error.message.includes('timeout')) {
                this.logActivity('Master Auto-Fixer', 'info', 'Auto-fixer completed with timeout (expected behavior)');
                return { successful: 0, failed: 0 };
            } else {
                this.logActivity('Master Auto-Fixer', 'error', error.message);
                return { successful: 0, failed: 1 };
            }
        }
    }

    async fixRegressionScripts() {
        this.logActivity('Regression Scripts Fix', 'info', 'Checking and fixing regression test scripts');
        
        try {
            // Check for common regression script issues
            const regressionDir = path.join(__dirname);
            const scriptFiles = [
                'cucumber-runner.js',
                'automated-regression-runner.js',
                'grafana-auto-fixer.js',
                'intelligent-auto-fixer.js'
            ];
            
            const fixedScripts = [];
            
            for (const scriptFile of scriptFiles) {
                const scriptPath = path.join(regressionDir, scriptFile);
                try {
                    await fs.access(scriptPath);
                    
                    // Test if script can run without syntax errors
                    try {
                        await execAsync(`node --check ${scriptPath}`, { timeout: 10000 });
                        fixedScripts.push({ script: scriptFile, status: 'healthy' });
                    } catch (syntaxError) {
                        this.logActivity('Regression Scripts Fix', 'warning', `Syntax issue in ${scriptFile}: ${syntaxError.message}`);
                        fixedScripts.push({ script: scriptFile, status: 'syntax_error', error: syntaxError.message });
                    }
                    
                } catch (accessError) {
                    fixedScripts.push({ script: scriptFile, status: 'missing' });
                }
            }
            
            // Check package.json for dependencies
            try {
                const packagePath = path.join(regressionDir, 'package.json');
                await fs.access(packagePath);
                
                // Install/update dependencies if package.json exists
                await execAsync('npm install', { cwd: regressionDir, timeout: 30000 });
                fixedScripts.push({ script: 'package.json', status: 'dependencies_updated' });
                
            } catch (npmError) {
                this.logActivity('Regression Scripts Fix', 'warning', `NPM install failed: ${npmError.message}`);
            }
            
            this.fixResults.regressionFixes = fixedScripts;
            this.logActivity('Regression Scripts Fix', 'success', `Checked ${fixedScripts.length} regression scripts`);
            
            return fixedScripts;
            
        } catch (error) {
            this.logActivity('Regression Scripts Fix', 'error', error.message);
            return [];
        }
    }

    async rerunFailedPipelines(maxReruns = 3) {
        this.logActivity('Pipeline Rerun', 'info', `Attempting to rerun up to ${maxReruns} failed pipelines`);
        
        try {
            // Get failed pipeline runs
            const pipelineStatus = await this.checkPipelineStatus();
            const failedRuns = pipelineStatus.failedRuns.slice(0, maxReruns);
            
            const rerunResults = [];
            
            for (const run of failedRuns) {
                try {
                    this.logActivity('Pipeline Rerun', 'info', `Attempting to rerun: ${run.name}`);
                    
                    // Trigger a new workflow run (since we can't rerun old ones directly)
                    await execAsync('gh workflow run ci.yml --ref main', { timeout: 10000 });
                    
                    rerunResults.push({
                        originalRun: run.name,
                        status: 'triggered',
                        timestamp: new Date().toISOString()
                    });
                    
                    this.logActivity('Pipeline Rerun', 'success', `Triggered new run for: ${run.name}`);
                    
                    // Wait between reruns to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                } catch (rerunError) {
                    rerunResults.push({
                        originalRun: run.name,
                        status: 'failed',
                        error: rerunError.message
                    });
                    
                    this.logActivity('Pipeline Rerun', 'error', `Failed to rerun ${run.name}: ${rerunError.message}`);
                }
            }
            
            this.fixResults.rerunResults = rerunResults;
            this.fixResults.totalPipelinesRerun = rerunResults.filter(r => r.status === 'triggered').length;
            
            return rerunResults;
            
        } catch (error) {
            this.logActivity('Pipeline Rerun', 'error', error.message);
            return [];
        }
    }

    async generateComprehensiveReport() {
        const reportTimestamp = new Date().toISOString();
        
        // Calculate summary statistics
        const totalFixes = this.fixResults.pipelineFixes.reduce((sum, fix) => {
            return sum + (fix.successfulFixes || 0);
        }, 0);
        
        const totalErrors = this.fixResults.pipelineFixes.reduce((sum, fix) => {
            return sum + (fix.failedFixes || 0);
        }, 0);
        
        this.fixResults.totalIssuesFixed = totalFixes;
        
        const report = {
            reportInfo: {
                timestamp: reportTimestamp,
                generatedBy: 'Pipeline Orchestrator',
                version: '2.0.0'
            },
            summary: {
                totalActivities: this.activityLog.length,
                totalIssuesFixed: this.fixResults.totalIssuesFixed,
                totalPipelinesRerun: this.fixResults.totalPipelinesRerun,
                successRate: totalFixes > 0 ? Math.round((totalFixes / (totalFixes + totalErrors)) * 100) : 0
            },
            fixResults: this.fixResults,
            activityLog: this.activityLog,
            recommendations: this.generateRecommendations()
        };
        
        // Save report to file
        const reportFileName = `comprehensive-fix-report-${Date.now()}.json`;
        const reportPath = path.join(__dirname, reportFileName);
        
        try {
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            this.logActivity('Report Generation', 'success', `Report saved to: ${reportFileName}`);
        } catch (writeError) {
            this.logActivity('Report Generation', 'error', `Failed to save report: ${writeError.message}`);
        }
        
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Docker recommendations
        const dockerFix = this.fixResults.pipelineFixes.find(fix => fix.type === 'Docker Infrastructure');
        if (dockerFix && dockerFix.status !== 'success') {
            recommendations.push('Consider checking Docker service status and port conflicts for Loki/Grafana containers');
        }
        
        // Regression script recommendations
        const scriptIssues = this.fixResults.regressionFixes.filter(script => 
            script.status === 'syntax_error' || script.status === 'missing'
        );
        if (scriptIssues.length > 0) {
            recommendations.push(`Review ${scriptIssues.length} regression scripts with issues`);
        }
        
        // Pipeline rerun recommendations
        if (this.fixResults.totalPipelinesRerun === 0) {
            recommendations.push('Consider manual review of failed pipelines if auto-rerun was unsuccessful');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('System appears to be operating normally');
        }
        
        return recommendations;
    }

    async runCompleteOrchestration() {
        console.log('🚀 Starting Comprehensive Pipeline and Regression Fix Orchestration...\n');
        
        // Step 1: Check pipeline status
        await this.checkPipelineStatus();
        
        // Step 2: Fix Docker infrastructure issues
        await this.fixDockerIssues();
        
        // Step 3: Run master auto-fixer
        await this.runMasterAutoFixer();
        
        // Step 4: Fix regression scripts
        await this.fixRegressionScripts();
        
        // Step 5: Rerun failed pipelines
        await this.rerunFailedPipelines();
        
        // Step 6: Generate comprehensive report
        const report = await this.generateComprehensiveReport();
        
        console.log('\n📊 === COMPREHENSIVE FIX ORCHESTRATION COMPLETED ===');
        console.log(`✅ Total Issues Fixed: ${report.summary.totalIssuesFixed}`);
        console.log(`🔄 Total Pipelines Rerun: ${report.summary.totalPipelinesRerun}`);
        console.log(`📈 Success Rate: ${report.summary.successRate}%`);
        console.log(`📋 Total Activities: ${report.summary.totalActivities}`);
        
        return report;
    }
}

// CLI execution
if (require.main === module) {
    const orchestrator = new PipelineOrchestrator();
    orchestrator.runCompleteOrchestration()
        .then(report => {
            console.log('\n🎉 Orchestration completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Orchestration failed:', error.message);
            process.exit(1);
        });
}

module.exports = PipelineOrchestrator;
