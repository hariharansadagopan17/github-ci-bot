const { Before, After, BeforeAll, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const DriverManager = require('../../utils/driverManager');
const logger = require('../../utils/logger');
const metricsCollector = require('../../utils/metricsCollector');
const ScreenshotHelper = require('../../utils/screenshotHelper');
const fs = require('fs-extra');
const path = require('path');

// Set default timeout for steps
setDefaultTimeout(60000);

let driverManager;
const screenshotHelper = new ScreenshotHelper();

BeforeAll(async function () {
    logger.info('Starting regression test suite...');
    
    // Initialize metrics collection
    await metricsCollector.initialize();
    
    // Ensure directories exist
    await fs.ensureDir(path.join(__dirname, '../../reports'));
    await fs.ensureDir(path.join(__dirname, '../../screenshots'));
    
    // Initialize driver manager
    driverManager = new DriverManager();
    
    logger.info('Test suite initialization completed');
});

Before(async function (scenario) {
    logger.info(`Starting scenario: ${scenario.pickle.name}`);
    
    // Record test start metrics
    metricsCollector.recordTestStart(scenario.pickle.name);
    
    try {
        // Get a fresh driver instance for each scenario
        this.driver = await driverManager.getDriver();
        this.scenario = scenario;
        
        logger.info(`Driver initialized for scenario: ${scenario.pickle.name}`);
    } catch (error) {
        logger.error(`Failed to initialize driver for scenario ${scenario.pickle.name}:`, error);
        throw error;
    }
});

After(async function (scenario) {
    const scenarioName = scenario.pickle.name;
    const isFailure = scenario.result.status === 'FAILED';
    
    try {
        // Check if driver exists and is still valid
        if (this.driver) {
            try {
                // Test if driver is still responsive
                await this.driver.getTitle();
            } catch (driverError) {
                logger.warn(`Driver is no longer responsive for scenario ${scenarioName}:`, driverError.message);
                this.driver = null; // Clear invalid driver reference
            }
        }
        
        if (isFailure) {
            logger.error(`Scenario failed: ${scenarioName}`);
            
            // Take failure screenshot only if driver is available
            if (this.driver) {
                try {
                    await screenshotHelper.takeScreenshot(this.driver, `failure_${scenarioName.replace(/\s+/g, '_')}`);
                } catch (screenshotError) {
                    logger.warn(`Failed to take failure screenshot for ${scenarioName}:`, screenshotError.message);
                }
            } else {
                logger.warn(`Cannot take failure screenshot for ${scenarioName}: Driver not available`);
            }
            
            // Record failure metrics
            metricsCollector.recordTestFailure(scenarioName, scenario.result.exception);
        } else {
            logger.info(`Scenario passed: ${scenarioName}`);
            metricsCollector.recordTestSuccess(scenarioName);
        }
        
        // Capture browser logs if available
        if (this.driver) {
            try {
                const logs = await this.driver.manage().logs().get('browser');
                if (logs.length > 0) {
                    logger.info(`Browser logs for ${scenarioName}:`, logs);
                }
            } catch (logError) {
                // Browser logs might not be available in all browsers
                logger.debug('Browser logs not available:', logError.message);
            }
        }
        
    } catch (error) {
        logger.error(`Error in After hook for scenario ${scenarioName}:`, error);
    } finally {
        // Always quit the driver to ensure cleanup
        if (this.driver) {
            try {
                await this.driver.quit();
                logger.info(`Driver closed for scenario: ${scenarioName}`);
                this.driver = null; // Clear the reference
            } catch (quitError) {
                logger.error(`Error closing driver for scenario ${scenarioName}:`, quitError);
            }
        }
    }
    
    // Record test completion metrics
    const duration = scenario.result.duration || 0;
    metricsCollector.recordTestCompletion(scenarioName, duration, isFailure);
});

AfterAll(async function () {
    logger.info('Cleaning up after all scenarios...');
    
    try {
        // Generate final metrics report
        await metricsCollector.generateReport();
        
        // Cleanup driver manager
        if (driverManager) {
            await driverManager.cleanup();
        }
        
        logger.info('Test suite cleanup completed');
    } catch (error) {
        logger.error('Error during cleanup:', error);
    }
});
