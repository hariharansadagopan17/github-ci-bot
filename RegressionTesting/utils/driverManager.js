const { Builder, Capabilities } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const logger = require('./logger');

class DriverManager {
    constructor() {
        this.driver = null;
        this.browserName = process.env.BROWSER_NAME || 'chrome';
        this.headless = process.env.HEADLESS === 'true';
        this.timeout = parseInt(process.env.BROWSER_TIMEOUT) || 30000;
        this.implicitWait = parseInt(process.env.IMPLICIT_WAIT) || 10000;
    }

    async getDriver() {
        // Always create a new driver instance for each scenario
        // This ensures clean state and prevents driver reuse issues
        
        try {
            logger.info(`Initializing ${this.browserName} driver (headless: ${this.headless})`);
            
            const builder = new Builder();
            let driver;
            
            // Set a timeout for driver initialization
            const driverPromise = this.createDriverWithTimeout();
            driver = await Promise.race([
                driverPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Driver initialization timeout after 30 seconds')), 30000)
                )
            ]);

            // Set timeouts
            await driver.manage().setTimeouts({
                implicit: this.implicitWait,
                pageLoad: this.timeout,
                script: this.timeout
            });

            // Maximize window if not headless
            if (!this.headless) {
                try {
                    await driver.manage().window().maximize();
                } catch (windowError) {
                    logger.warn('Failed to maximize window:', windowError.message);
                }
            }

            logger.info('Driver initialized successfully');
            return driver;

        } catch (error) {
            logger.error('Failed to initialize driver:', error);
            if (this.driver) {
                await this.driver.quit();
                this.driver = null;
            }
            throw error;
        }
    }

    async createDriverWithTimeout() {
        const builder = new Builder();
        
        switch (this.browserName.toLowerCase()) {
            case 'chrome':
                return await this.createChromeDriver(builder);
            case 'firefox':
                return await this.createFirefoxDriver(builder);
            default:
                throw new Error(`Unsupported browser: ${this.browserName}`);
        }
    }

    async createChromeDriver(builder) {
        const chromeOptions = new chrome.Options();
        
        // Basic Chrome options
        chromeOptions.addArguments('--disable-web-security');
        chromeOptions.addArguments('--disable-features=VizDisplayCompositor');
        chromeOptions.addArguments('--disable-dev-shm-usage');
        chromeOptions.addArguments('--no-sandbox');
        chromeOptions.addArguments('--disable-gpu');
        chromeOptions.addArguments('--disable-extensions');
        chromeOptions.addArguments('--disable-background-timer-throttling');
        chromeOptions.addArguments('--disable-renderer-backgrounding');
        chromeOptions.addArguments('--disable-backgrounding-occluded-windows');
        chromeOptions.addArguments('--disable-ipc-flooding-protection');
        
        // Set window size
        chromeOptions.addArguments('--window-size=1920,1080');
        
        if (this.headless) {
            chromeOptions.addArguments('--headless');
            logger.info('Running Chrome in headless mode');
        }
        
        // Additional options for CI environments
        if (process.env.CI === 'true') {
            chromeOptions.addArguments('--disable-background-networking');
            chromeOptions.addArguments('--disable-default-apps');
            chromeOptions.addArguments('--disable-sync');
            chromeOptions.addArguments('--metrics-recording-only');
            chromeOptions.addArguments('--no-first-run');
            chromeOptions.addArguments('--safebrowsing-disable-auto-update');
            chromeOptions.addArguments('--disable-logging');
            chromeOptions.addArguments('--disable-notifications');
        }

        // Enable logging (commented out as selenium-webdriver logging may not be available)
        // const logPrefs = new logging.Preferences();
        // logPrefs.setLevel('browser', logging.Level.INFO);
        // chromeOptions.setLoggingPrefs(logPrefs);

        return builder
            .forBrowser('chrome')
            .setChromeOptions(chromeOptions)
            .build();
    }

    async createFirefoxDriver(builder) {
        const firefoxOptions = new firefox.Options();
        
        if (this.headless) {
            firefoxOptions.addArguments('--headless');
            logger.info('Running Firefox in headless mode');
        }
        
        // Set window size
        firefoxOptions.addArguments('--width=1920');
        firefoxOptions.addArguments('--height=1080');

        return builder
            .forBrowser('firefox')
            .setFirefoxOptions(firefoxOptions)
            .build();
    }

    async cleanup() {
        if (this.driver) {
            try {
                await this.driver.quit();
                logger.info('Driver cleaned up successfully');
            } catch (error) {
                logger.error('Error during driver cleanup:', error);
            } finally {
                this.driver = null;
            }
        }
    }

    async restartDriver() {
        await this.cleanup();
        return await this.getDriver();
    }

    async takeScreenshot(filename) {
        if (this.driver) {
            try {
                const screenshot = await this.driver.takeScreenshot();
                const fs = require('fs-extra');
                const path = require('path');
                
                const screenshotPath = path.join(__dirname, '../screenshots', `${filename}.png`);
                await fs.writeFile(screenshotPath, screenshot, 'base64');
                
                logger.info(`Screenshot saved: ${screenshotPath}`);
                return screenshotPath;
            } catch (error) {
                logger.error('Failed to take screenshot:', error);
                throw error;
            }
        }
        throw new Error('No driver available for screenshot');
    }
}

module.exports = DriverManager;
