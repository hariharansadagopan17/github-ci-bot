const client = require('prom-client');
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

class MetricsCollector {
    constructor() {
        this.register = new client.Registry();
        this.metricsServer = null;
        this.port = process.env.METRICS_PORT || 9090;
        
        // Initialize default metrics
        this.initializeMetrics();
        
        // Set up metrics collection
        client.collectDefaultMetrics({
            register: this.register,
            prefix: 'regression_test_'
        });
    }

    initializeMetrics() {
        // Test execution metrics
        this.testCounter = new client.Counter({
            name: 'regression_test_total',
            help: 'Total number of regression tests executed',
            labelNames: ['scenario', 'status', 'environment', 'browser']
        });

        this.testDuration = new client.Histogram({
            name: 'regression_test_duration_seconds',
            help: 'Duration of regression test execution in seconds',
            labelNames: ['scenario', 'status', 'environment', 'browser'],
            buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300]
        });

        this.testGauge = new client.Gauge({
            name: 'regression_test_active',
            help: 'Number of currently active regression tests',
            labelNames: ['environment', 'browser']
        });

        // Error tracking metrics
        this.errorCounter = new client.Counter({
            name: 'regression_test_errors_total',
            help: 'Total number of regression test errors',
            labelNames: ['scenario', 'error_type', 'environment', 'browser']
        });

        // Browser metrics
        this.browserActionCounter = new client.Counter({
            name: 'regression_browser_actions_total',
            help: 'Total number of browser actions performed',
            labelNames: ['action', 'scenario', 'environment']
        });

        this.pageLoadDuration = new client.Histogram({
            name: 'regression_page_load_duration_seconds',
            help: 'Duration of page loads in seconds',
            labelNames: ['page', 'scenario', 'environment'],
            buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
        });

        // Screenshot metrics
        this.screenshotCounter = new client.Counter({
            name: 'regression_screenshots_total',
            help: 'Total number of screenshots taken',
            labelNames: ['type', 'scenario', 'environment']
        });

        // Test suite metrics
        this.suiteStartTime = new client.Gauge({
            name: 'regression_suite_start_timestamp',
            help: 'Timestamp when the test suite started'
        });

        this.suiteDuration = new client.Gauge({
            name: 'regression_suite_duration_seconds',
            help: 'Total duration of the test suite execution'
        });

        this.scenarioResultGauge = new client.Gauge({
            name: 'regression_scenario_result',
            help: 'Result of last scenario execution (1 = success, 0 = failure)',
            labelNames: ['scenario', 'environment', 'browser']
        });

        // Register all metrics
        this.register.registerMetric(this.testCounter);
        this.register.registerMetric(this.testDuration);
        this.register.registerMetric(this.testGauge);
        this.register.registerMetric(this.errorCounter);
        this.register.registerMetric(this.browserActionCounter);
        this.register.registerMetric(this.pageLoadDuration);
        this.register.registerMetric(this.screenshotCounter);
        this.register.registerMetric(this.suiteStartTime);
        this.register.registerMetric(this.suiteDuration);
        this.register.registerMetric(this.scenarioResultGauge);
    }

    async initialize() {
        try {
            // Record suite start time
            this.suiteStartTime.set(Date.now() / 1000);
            
            // Start metrics server
            await this.startMetricsServer();
            
            logger.info(`Metrics collector initialized. Server running on port ${this.port}`);
        } catch (error) {
            logger.error('Failed to initialize metrics collector:', error);
            throw error;
        }
    }

    async startMetricsServer() {
        return new Promise((resolve, reject) => {
            const app = express();
            
            // Health check endpoint
            app.get('/health', (req, res) => {
                res.status(200).json({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime()
                });
            });
            
            // Metrics endpoint
            app.get('/metrics', async (req, res) => {
                try {
                    res.set('Content-Type', this.register.contentType);
                    const metrics = await this.register.metrics();
                    res.end(metrics);
                } catch (error) {
                    res.status(500).end(error.message);
                }
            });
            
            // Test metrics summary endpoint
            app.get('/test-summary', async (req, res) => {
                try {
                    const summary = await this.getTestSummary();
                    res.json(summary);
                } catch (error) {
                    res.status(500).json({ error: error.message });
                }
            });
            
            this.metricsServer = app.listen(this.port, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    recordTestStart(scenarioName, browser = 'chrome', environment = process.env.TEST_ENV || 'development') {
        this.testGauge.inc({ environment, browser });
        
        logger.testInfo(`Test started: ${scenarioName}`, {
            metrics: {
                event: 'test_start',
                scenario: scenarioName,
                browser,
                environment
            }
        });
    }

    recordTestSuccess(scenarioName, duration = 0, browser = 'chrome', environment = process.env.TEST_ENV || 'development') {
        // Ensure duration is a valid number
        const validDuration = (typeof duration === 'number' && !isNaN(duration)) ? duration : 0;
        const durationSeconds = validDuration / 1000;
        
        this.testCounter.inc({ scenario: scenarioName, status: 'success', environment, browser });
        this.testDuration.observe({ scenario: scenarioName, status: 'success', environment, browser }, durationSeconds);
        this.scenarioResultGauge.set({ scenario: scenarioName, environment, browser }, 1);
        this.testGauge.dec({ environment, browser });
        
        logger.testInfo(`Test passed: ${scenarioName}`, {
            metrics: {
                event: 'test_success',
                scenario: scenarioName,
                duration: durationSeconds,
                browser,
                environment
            }
        });
    }

    recordTestFailure(scenarioName, error, duration = 0, browser = 'chrome', environment = process.env.TEST_ENV || 'development') {
        // Ensure duration is a valid number
        const validDuration = (typeof duration === 'number' && !isNaN(duration)) ? duration : 0;
        const durationSeconds = validDuration / 1000;
        const errorType = error ? error.name || 'UnknownError' : 'TestFailure';
        
        this.testCounter.inc({ scenario: scenarioName, status: 'failure', environment, browser });
        this.testDuration.observe({ scenario: scenarioName, status: 'failure', environment, browser }, durationSeconds);
        this.errorCounter.inc({ scenario: scenarioName, error_type: errorType, environment, browser });
        this.scenarioResultGauge.set({ scenario: scenarioName, environment, browser }, 0);
        this.testGauge.dec({ environment, browser });
        
        logger.testError(`Test failed: ${scenarioName}`, error, {
            metrics: {
                event: 'test_failure',
                scenario: scenarioName,
                duration: durationSeconds,
                errorType,
                browser,
                environment
            }
        });
    }

    recordTestCompletion(scenarioName, duration, isFailure, browser = 'chrome', environment = process.env.TEST_ENV || 'development') {
        if (isFailure) {
            this.recordTestFailure(scenarioName, null, duration, browser, environment);
        } else {
            this.recordTestSuccess(scenarioName, duration, browser, environment);
        }
    }

    recordBrowserAction(action, scenarioName, environment = process.env.TEST_ENV || 'development') {
        this.browserActionCounter.inc({ action, scenario: scenarioName, environment });
        
        logger.browserAction(action, '', {
            metrics: {
                event: 'browser_action',
                action,
                scenario: scenarioName,
                environment
            }
        });
    }

    recordPageLoad(page, duration, scenarioName, environment = process.env.TEST_ENV || 'development') {
        const durationSeconds = duration / 1000;
        this.pageLoadDuration.observe({ page, scenario: scenarioName, environment }, durationSeconds);
        
        logger.testInfo(`Page loaded: ${page}`, {
            metrics: {
                event: 'page_load',
                page,
                duration: durationSeconds,
                scenario: scenarioName,
                environment
            }
        });
    }

    recordScreenshot(type, scenarioName, environment = process.env.TEST_ENV || 'development') {
        this.screenshotCounter.inc({ type, scenario: scenarioName, environment });
        
        logger.testInfo(`Screenshot taken: ${type}`, {
            metrics: {
                event: 'screenshot',
                type,
                scenario: scenarioName,
                environment
            }
        });
    }

    async getTestSummary() {
        try {
            const metrics = await this.register.getMetricsAsJSON();
            const summary = {
                timestamp: new Date().toISOString(),
                environment: process.env.TEST_ENV || 'development',
                buildNumber: process.env.BUILD_NUMBER || '1',
                gitBranch: process.env.GIT_BRANCH || 'main',
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                totalErrors: 0,
                averageDuration: 0,
                screenshots: 0,
                browserActions: 0
            };

            // Process metrics to build summary
            for (const metric of metrics) {
                switch (metric.name) {
                    case 'regression_test_total':
                        for (const value of metric.values) {
                            summary.totalTests += value.value;
                            if (value.labels.status === 'success') {
                                summary.passedTests += value.value;
                            } else if (value.labels.status === 'failure') {
                                summary.failedTests += value.value;
                            }
                        }
                        break;
                    case 'regression_test_errors_total':
                        for (const value of metric.values) {
                            summary.totalErrors += value.value;
                        }
                        break;
                    case 'regression_screenshots_total':
                        for (const value of metric.values) {
                            summary.screenshots += value.value;
                        }
                        break;
                    case 'regression_browser_actions_total':
                        for (const value of metric.values) {
                            summary.browserActions += value.value;
                        }
                        break;
                }
            }

            summary.successRate = summary.totalTests > 0 ? 
                (summary.passedTests / summary.totalTests * 100).toFixed(2) : 0;

            return summary;
        } catch (error) {
            logger.error('Failed to generate test summary:', error);
            throw error;
        }
    }

    async generateReport() {
        try {
            const summary = await this.getTestSummary();
            const reportPath = path.join(__dirname, '../reports/metrics-report.json');
            
            await fs.ensureDir(path.dirname(reportPath));
            await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
            
            // Record suite completion
            const suiteStartTimestamp = await this.suiteStartTime.get();
            const suiteDuration = (Date.now() / 1000) - suiteStartTimestamp.values[0].value;
            this.suiteDuration.set(suiteDuration);
            
            logger.info(`Metrics report generated: ${reportPath}`, {
                metrics: {
                    event: 'report_generated',
                    summary,
                    suiteDuration
                }
            });
            
            return summary;
        } catch (error) {
            logger.error('Failed to generate metrics report:', error);
            throw error;
        }
    }

    async cleanup() {
        try {
            if (this.metricsServer) {
                this.metricsServer.close();
                logger.info('Metrics server closed');
            }
            
            // Generate final report
            await this.generateReport();
            
        } catch (error) {
            logger.error('Error during metrics collector cleanup:', error);
        }
    }
}

// Export singleton instance
module.exports = new MetricsCollector();
