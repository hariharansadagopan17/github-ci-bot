#!/usr/bin/env node

/**
 * Test Pipeline Failures Generator
 * Creates controlled failures to test the auto-fix system
 */

const fs = require('fs');
const path = require('path');

class TestFailureGenerator {
    constructor() {
        this.logDir = path.join(__dirname, 'logs');
        this.scenarios = [
            'docker_connection_failure',
            'loki_query_timeout', 
            'selenium_driver_timeout',
            'cucumber_step_failure',
            'github_auth_expired'
        ];
    }

    async generateFailures() {
        console.log('🧪 Generating test failures for auto-fix system...');
        
        // Ensure logs directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        for (const scenario of this.scenarios) {
            await this.createFailureScenario(scenario);
            await this.sleep(2000); // Space out failures
        }

        console.log('✅ Test failures generated successfully');
    }

    async createFailureScenario(scenario) {
        const timestamp = new Date().toISOString();
        let logEntry = '';

        switch (scenario) {
            case 'docker_connection_failure':
                logEntry = `[${timestamp}] ERROR: Docker connection failed - Cannot connect to the Docker daemon at unix:///var/run/docker.sock`;
                break;
            case 'loki_query_timeout':
                logEntry = `[${timestamp}] ERROR: Failed to push logs to Loki - Connection timeout localhost:3101`;
                break;
            case 'selenium_driver_timeout':
                logEntry = `[${timestamp}] ERROR: WebDriver session timeout - Could not start Chrome driver`;
                break;
            case 'cucumber_step_failure':
                logEntry = `[${timestamp}] ERROR: Cucumber step failed - Element not found: #login-button`;
                break;
            case 'github_auth_expired':
                logEntry = `[${timestamp}] ERROR: GitHub authentication failed - gh auth token expired`;
                break;
        }

        // Write to error log
        const errorLogPath = path.join(this.logDir, 'error.log');
        fs.appendFileSync(errorLogPath, logEntry + '\n');

        // Write to regression tests log
        const regressionLogPath = path.join(this.logDir, 'regression-tests.log');
        fs.appendFileSync(regressionLogPath, `${logEntry} - Test scenario: ${scenario}\n`);

        console.log(`🔥 Generated failure: ${scenario}`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI usage
if (require.main === module) {
    const generator = new TestFailureGenerator();
    generator.generateFailures().catch(console.error);
}

module.exports = TestFailureGenerator;
