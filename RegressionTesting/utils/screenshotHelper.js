const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const logger = require('./logger');

class ScreenshotHelper {
    constructor() {
        this.screenshotDir = path.join(__dirname, '../screenshots');
        this.ensureDirectoryExists();
    }

    async ensureDirectoryExists() {
        try {
            await fs.ensureDir(this.screenshotDir);
        } catch (error) {
            logger.error('Failed to create screenshots directory:', error);
        }
    }

    generateFilename(prefix = 'screenshot', suffix = '') {
        const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss-SSS');
        const cleanPrefix = this.sanitizeFilename(prefix);
        const cleanSuffix = suffix ? `_${this.sanitizeFilename(suffix)}` : '';
        return `${cleanPrefix}_${timestamp}${cleanSuffix}.png`;
    }

    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-z0-9]/gi, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .toLowerCase();
    }

    async takeScreenshot(driver, filename = 'screenshot', options = {}) {
        try {
            if (!driver) {
                throw new Error('Driver is required for taking screenshots');
            }

            // Check if driver is still active/responsive
            try {
                await driver.getTitle(); // Simple check to ensure driver is responsive
            } catch (driverError) {
                throw new Error(`Driver is not responsive: ${driverError.message}`);
            }

            const screenshotFilename = this.generateFilename(filename);
            const screenshotPath = path.join(this.screenshotDir, screenshotFilename);
            
            // Take the screenshot with timeout
            const screenshot = await Promise.race([
                driver.takeScreenshot(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Screenshot timeout')), 10000)
                )
            ]);
            
            // Save the screenshot
            await fs.writeFile(screenshotPath, screenshot, 'base64');
            
            // Log the screenshot information
            logger.info(`Screenshot saved: ${screenshotPath}`, {
                screenshot: {
                    filename: screenshotFilename,
                    path: screenshotPath,
                    size: screenshot.length,
                    timestamp: new Date().toISOString()
                },
                ...options
            });
            
            return {
                filename: screenshotFilename,
                path: screenshotPath,
                fullPath: path.resolve(screenshotPath)
            };
            
        } catch (error) {
            logger.error(`Failed to take screenshot with filename ${filename}:`, error);
            throw error;
        }
    }

    async takeElementScreenshot(driver, element, filename = 'element_screenshot', options = {}) {
        try {
            if (!driver || !element) {
                throw new Error('Driver and element are required for taking element screenshots');
            }

            const screenshotFilename = this.generateFilename(filename);
            const screenshotPath = path.join(this.screenshotDir, screenshotFilename);
            
            // Take screenshot of the specific element
            const screenshot = await element.takeScreenshot();
            
            // Save the screenshot
            await fs.writeFile(screenshotPath, screenshot, 'base64');
            
            // Log the screenshot information
            logger.info(`Element screenshot saved: ${screenshotPath}`, {
                screenshot: {
                    filename: screenshotFilename,
                    path: screenshotPath,
                    type: 'element',
                    size: screenshot.length,
                    timestamp: new Date().toISOString()
                },
                ...options
            });
            
            return {
                filename: screenshotFilename,
                path: screenshotPath,
                fullPath: path.resolve(screenshotPath)
            };
            
        } catch (error) {
            logger.error(`Failed to take element screenshot with filename ${filename}:`, error);
            throw error;
        }
    }

    async takeFullPageScreenshot(driver, filename = 'fullpage_screenshot', options = {}) {
        try {
            if (!driver) {
                throw new Error('Driver is required for taking full page screenshots');
            }

            // Get the full page dimensions
            const dimensions = await driver.executeScript(`
                return {
                    width: Math.max(document.body.scrollWidth, document.body.offsetWidth, 
                           document.documentElement.clientWidth, document.documentElement.scrollWidth, 
                           document.documentElement.offsetWidth),
                    height: Math.max(document.body.scrollHeight, document.body.offsetHeight, 
                            document.documentElement.clientHeight, document.documentElement.scrollHeight, 
                            document.documentElement.offsetHeight)
                };
            `);

            // Set window size to capture full page
            await driver.manage().window().setRect({
                width: dimensions.width,
                height: dimensions.height
            });

            // Wait for page to adjust
            await driver.sleep(500);

            const screenshotFilename = this.generateFilename(filename);
            const screenshotPath = path.join(this.screenshotDir, screenshotFilename);
            
            // Take the screenshot
            const screenshot = await driver.takeScreenshot();
            
            // Save the screenshot
            await fs.writeFile(screenshotPath, screenshot, 'base64');
            
            // Log the screenshot information
            logger.info(`Full page screenshot saved: ${screenshotPath}`, {
                screenshot: {
                    filename: screenshotFilename,
                    path: screenshotPath,
                    type: 'fullpage',
                    dimensions,
                    size: screenshot.length,
                    timestamp: new Date().toISOString()
                },
                ...options
            });
            
            return {
                filename: screenshotFilename,
                path: screenshotPath,
                fullPath: path.resolve(screenshotPath)
            };
            
        } catch (error) {
            logger.error(`Failed to take full page screenshot with filename ${filename}:`, error);
            throw error;
        }
    }

    async takeComparisonScreenshots(driver, beforeAction, afterAction, filename = 'comparison', options = {}) {
        try {
            // Take before screenshot
            const beforeScreenshot = await this.takeScreenshot(driver, `${filename}_before`, options);
            
            // Execute the action
            if (typeof beforeAction === 'function') {
                await beforeAction();
            }
            
            // Wait for any animations or changes
            await driver.sleep(1000);
            
            // Take after screenshot
            const afterScreenshot = await this.takeScreenshot(driver, `${filename}_after`, options);
            
            // Execute after action if provided
            if (typeof afterAction === 'function') {
                await afterAction();
            }
            
            logger.info(`Comparison screenshots taken`, {
                comparison: {
                    before: beforeScreenshot,
                    after: afterScreenshot,
                    timestamp: new Date().toISOString()
                },
                ...options
            });
            
            return {
                before: beforeScreenshot,
                after: afterScreenshot
            };
            
        } catch (error) {
            logger.error(`Failed to take comparison screenshots with filename ${filename}:`, error);
            throw error;
        }
    }

    async cleanupOldScreenshots(maxAge = 7) {
        try {
            const files = await fs.readdir(this.screenshotDir);
            const cutoffDate = moment().subtract(maxAge, 'days');
            
            let deletedCount = 0;
            
            for (const file of files) {
                if (file.endsWith('.png')) {
                    const filePath = path.join(this.screenshotDir, file);
                    const stats = await fs.stat(filePath);
                    const fileDate = moment(stats.birthtime);
                    
                    if (fileDate.isBefore(cutoffDate)) {
                        await fs.remove(filePath);
                        deletedCount++;
                    }
                }
            }
            
            if (deletedCount > 0) {
                logger.info(`Cleaned up ${deletedCount} old screenshot(s) older than ${maxAge} days`);
            }
            
            return deletedCount;
            
        } catch (error) {
            logger.error('Failed to cleanup old screenshots:', error);
            throw error;
        }
    }

    async getScreenshotStats() {
        try {
            const files = await fs.readdir(this.screenshotDir);
            const screenshots = files.filter(file => file.endsWith('.png'));
            
            let totalSize = 0;
            for (const file of screenshots) {
                const filePath = path.join(this.screenshotDir, file);
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
            }
            
            return {
                count: screenshots.length,
                totalSize: totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                directory: this.screenshotDir
            };
            
        } catch (error) {
            logger.error('Failed to get screenshot statistics:', error);
            throw error;
        }
    }
}

// Export the class, not a singleton instance
module.exports = ScreenshotHelper;
