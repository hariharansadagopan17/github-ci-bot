#!/usr/bin/env node

/**
 * Pipeline Failure Generator and Auto-Fix Demonstrator
 * Creates controlled test failures to demonstrate pipeline rerunning and auto-fixing capabilities
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class PipelineTestRunner {
    constructor() {
        this.testResults = {
            failuresGenerated: [],
            fixesApplied: [],
            pipelinesTriggered: [],
            totalTests: 0
        };
    }

    async generateTestFailures() {
        console.log('🧪 Generating Test Failures for Pipeline Rerun Demonstration...\n');
        
        // Create a temporary test file with intentional failures
        const failingTestPath = path.join(__dirname, 'temp-failing-test.js');
        
        const failingTestCode = `
// Temporary failing test for pipeline demonstration
const assert = require('assert');

describe('Pipeline Rerun Test Suite', () => {
    it('should demonstrate pipeline failure detection', () => {
        console.log('❌ Intentional failure for testing pipeline rerun capabilities');
        throw new Error('Simulated test failure for pipeline rerun demonstration');
    });
    
    it('should show auto-fix pattern detection', () => {
        console.log('⚠️ Another test failure to trigger auto-fix system');
        assert.strictEqual(1, 2, 'Mathematical impossibility to test error handling');
    });
    
    it('should trigger regression script validation', () => {
        console.log('🔍 Testing regression script auto-fixing capabilities');
        const undefinedVariable = nonExistentFunction();
        console.log(undefinedVariable);
    });
});
`;
        
        try {
            await fs.writeFile(failingTestPath, failingTestCode);
            this.testResults.failuresGenerated.push({
                type: 'Failing Test Suite',
                file: 'temp-failing-test.js',
                status: 'created'
            });
            
            console.log('✅ Created failing test suite for demonstration');
            return failingTestPath;
            
        } catch (error) {
            console.error('❌ Failed to create failing test:', error.message);
            return null;
        }
    }

    async runFailingTests(testPath) {
        console.log('🏃 Running Failing Tests to Trigger Pipeline Issues...\n');
        
        try {
            // Try to run the failing tests with mocha if available
            await execAsync(`npx mocha ${testPath} --reporter json`, {
                timeout: 10000
            });
            
        } catch (testError) {
            // Expected to fail - capture the failure details
            console.log('✅ Test failures generated successfully');
            console.log('📊 Test Output Preview:');
            console.log(testError.stdout ? testError.stdout.slice(0, 500) + '...' : 'No stdout');
            
            this.testResults.failuresGenerated.push({
                type: 'Test Execution Failure',
                error: testError.message.slice(0, 200),
                status: 'failed_as_expected'
            });
            
            return true;
        }
        
        return false;
    }

    async demonstrateAutoFixPatterns() {
        console.log('🔧 Demonstrating Auto-Fix Pattern Detection...\n');
        
        // Create scenarios that would trigger our intelligent auto-fixer patterns
        const autoFixScenarios = [
            {
                pattern: 'Docker Container Issue',
                action: 'Check Docker containers and restart if needed',
                test: async () => {
                    try {
                        const { stdout } = await execAsync('wsl -d Ubuntu-EDrive -e bash -c "docker ps --format \'{{.Names}}\'"');
                        return stdout.includes('fresh-loki') && stdout.includes('fresh-grafana');
                    } catch (error) {
                        return false;
                    }
                }
            },
            {
                pattern: 'Node Module Issue',
                action: 'Reinstall dependencies and update package.json',
                test: async () => {
                    try {
                        await fs.access(path.join(__dirname, 'node_modules'));
                        return true;
                    } catch (error) {
                        return false;
                    }
                }
            },
            {
                pattern: 'Loki Connection Issue',
                action: 'Validate Loki URL construction and container health',
                test: async () => {
                    try {
                        const LokiUrlBuilder = require('./loki-url-builder');
                        const urlBuilder = new LokiUrlBuilder('http://localhost:3101');
                        const url = urlBuilder.buildAxiosUrl('/ready');
                        return !url.includes('//loki'); // No double slashes
                    } catch (error) {
                        return false;
                    }
                }
            }
        ];
        
        for (const scenario of autoFixScenarios) {
            console.log(`🔍 Testing: ${scenario.pattern}`);
            console.log(`   Action: ${scenario.action}`);
            
            try {
                const result = await scenario.test();
                console.log(`   Status: ${result ? '✅ HEALTHY' : '⚠️ NEEDS ATTENTION'}`);
                
                this.testResults.fixesApplied.push({
                    pattern: scenario.pattern,
                    status: result ? 'healthy' : 'needs_fix',
                    action: scenario.action
                });
                
            } catch (error) {
                console.log(`   Status: ❌ ERROR - ${error.message}`);
                this.testResults.fixesApplied.push({
                    pattern: scenario.pattern,
                    status: 'error',
                    error: error.message
                });
            }
        }
    }

    async simulatePipelineRerun() {
        console.log('\n🔄 Simulating Pipeline Rerun Process...\n');
        
        // Simulate the steps that would happen in a real pipeline rerun
        const pipelineSteps = [
            'Detecting failed pipeline runs',
            'Analyzing failure patterns',
            'Applying automated fixes',
            'Validating fix effectiveness',
            'Triggering new pipeline run'
        ];
        
        for (let i = 0; i < pipelineSteps.length; i++) {
            const step = pipelineSteps[i];
            console.log(`📋 Step ${i + 1}/5: ${step}...`);
            
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Simulate step outcomes
            const success = Math.random() > 0.2; // 80% success rate
            console.log(`   ${success ? '✅' : '⚠️'} ${success ? 'Completed' : 'Completed with warnings'}`);
            
            this.testResults.pipelinesTriggered.push({
                step: step,
                status: success ? 'success' : 'warning',
                timestamp: new Date().toISOString()
            });
        }
        
        console.log('\n🎉 Pipeline rerun simulation completed!');
    }

    async cleanupTestFiles() {
        console.log('\n🧹 Cleaning up test files...');
        
        const tempFiles = [
            path.join(__dirname, 'temp-failing-test.js')
        ];
        
        for (const file of tempFiles) {
            try {
                await fs.unlink(file);
                console.log(`✅ Removed: ${path.basename(file)}`);
            } catch (error) {
                // File might not exist, which is fine
                console.log(`ℹ️ Skipped: ${path.basename(file)} (not found)`);
            }
        }
    }

    async generateFinalReport() {
        console.log('\n📊 === PIPELINE RERUN DEMONSTRATION REPORT ===\n');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: this.testResults.totalTests,
                failuresGenerated: this.testResults.failuresGenerated.length,
                fixesApplied: this.testResults.fixesApplied.length,
                pipelinesTriggered: this.testResults.pipelinesTriggered.length
            },
            details: this.testResults,
            demonstration: {
                autoFixPatternsValidated: this.testResults.fixesApplied.filter(f => f.status === 'healthy').length,
                pipelineStepsCompleted: this.testResults.pipelinesTriggered.length,
                overallStatus: 'demonstration_complete'
            }
        };
        
        // Display summary
        console.log(`✅ Test Failures Generated: ${report.summary.failuresGenerated}`);
        console.log(`🔧 Auto-Fix Patterns Tested: ${report.summary.fixesApplied}`);
        console.log(`🔄 Pipeline Steps Simulated: ${report.summary.pipelinesTriggered}`);
        
        console.log('\n📋 Auto-Fix Pattern Results:');
        for (const fix of this.testResults.fixesApplied) {
            const statusIcon = fix.status === 'healthy' ? '✅' : fix.status === 'needs_fix' ? '⚠️' : '❌';
            console.log(`   ${statusIcon} ${fix.pattern}: ${fix.status.toUpperCase()}`);
        }
        
        // Save detailed report
        const reportPath = path.join(__dirname, `pipeline-demo-report-${Date.now()}.json`);
        try {
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            console.log(`\n💾 Detailed report saved: ${path.basename(reportPath)}`);
        } catch (error) {
            console.log(`\n❌ Failed to save report: ${error.message}`);
        }
        
        return report;
    }

    async runCompleteDemo() {
        console.log('🚀 Starting Pipeline Rerun and Auto-Fix Demonstration...\n');
        
        try {
            // Step 1: Generate test failures
            const testPath = await this.generateTestFailures();
            if (testPath) {
                await this.runFailingTests(testPath);
            }
            
            // Step 2: Demonstrate auto-fix patterns
            await this.demonstrateAutoFixPatterns();
            
            // Step 3: Simulate pipeline rerun process
            await this.simulatePipelineRerun();
            
            // Step 4: Generate final report
            await this.generateFinalReport();
            
            // Step 5: Cleanup
            await this.cleanupTestFiles();
            
            console.log('\n🎉 Pipeline rerun demonstration completed successfully!');
            
        } catch (error) {
            console.error('❌ Demo failed:', error.message);
            await this.cleanupTestFiles(); // Cleanup even on failure
        }
    }
}

// CLI execution
if (require.main === module) {
    const testRunner = new PipelineTestRunner();
    testRunner.runCompleteDemo().catch(console.error);
}

module.exports = PipelineTestRunner;
