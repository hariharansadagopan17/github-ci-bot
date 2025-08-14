const { until, By } = require('selenium-webdriver');
const logger = require('../utils/logger');
const screenshotHelper = require('../utils/screenshotHelper');

class BasePage {
    constructor(driver) {
        this.driver = driver;
        this.timeout = parseInt(process.env.BROWSER_TIMEOUT) || 30000;
        this.implicitWait = parseInt(process.env.IMPLICIT_WAIT) || 10000;
    }

    async navigateTo(url) {
        try {
            logger.info(`Navigating to: ${url}`);
            await this.driver.get(url);
            await this.waitForPageLoad();
        } catch (error) {
            logger.error(`Failed to navigate to ${url}:`, error);
            await screenshotHelper.takeScreenshot(this.driver, 'navigation_error');
            throw error;
        }
    }

    async waitForElement(locator, timeout = this.timeout) {
        try {
            return await this.driver.wait(until.elementLocated(locator), timeout);
        } catch (error) {
            logger.error(`Element not found with locator: ${locator}`, error);
            await screenshotHelper.takeScreenshot(this.driver, 'element_not_found');
            throw error;
        }
    }

    async waitForElementVisible(locator, timeout = this.timeout) {
        try {
            const element = await this.waitForElement(locator, timeout);
            return await this.driver.wait(until.elementIsVisible(element), timeout);
        } catch (error) {
            logger.error(`Element not visible with locator: ${locator}`, error);
            await screenshotHelper.takeScreenshot(this.driver, 'element_not_visible');
            throw error;
        }
    }

    async waitForElementClickable(locator, timeout = this.timeout) {
        try {
            const element = await this.waitForElement(locator, timeout);
            return await this.driver.wait(until.elementIsEnabled(element), timeout);
        } catch (error) {
            logger.error(`Element not clickable with locator: ${locator}`, error);
            await screenshotHelper.takeScreenshot(this.driver, 'element_not_clickable');
            throw error;
        }
    }

    async click(locator) {
        try {
            const element = await this.waitForElementClickable(locator);
            await element.click();
            logger.info(`Clicked element with locator: ${locator}`);
        } catch (error) {
            logger.error(`Failed to click element with locator: ${locator}`, error);
            await screenshotHelper.takeScreenshot(this.driver, 'click_error');
            throw error;
        }
    }

    async type(locator, text) {
        try {
            const element = await this.waitForElementVisible(locator);
            await element.sendKeys(text);
            logger.info(`Typed text into element with locator: ${locator}`);
        } catch (error) {
            logger.error(`Failed to type into element with locator: ${locator}`, error);
            await screenshotHelper.takeScreenshot(this.driver, 'type_error');
            throw error;
        }
    }

    async clearAndType(locator, text) {
        try {
            const element = await this.waitForElementVisible(locator);
            await element.clear();
            await element.sendKeys(text);
            logger.info(`Cleared and typed text into element with locator: ${locator}`);
        } catch (error) {
            logger.error(`Failed to clear and type into element with locator: ${locator}`, error);
            await screenshotHelper.takeScreenshot(this.driver, 'clear_type_error');
            throw error;
        }
    }

    async getText(locator) {
        try {
            const element = await this.waitForElementVisible(locator);
            const text = await element.getText();
            logger.info(`Retrieved text from element with locator: ${locator}`);
            return text;
        } catch (error) {
            logger.error(`Failed to get text from element with locator: ${locator}`, error);
            await screenshotHelper.takeScreenshot(this.driver, 'get_text_error');
            throw error;
        }
    }

    async getAttribute(locator, attributeName) {
        try {
            const element = await this.waitForElementVisible(locator);
            const attribute = await element.getAttribute(attributeName);
            logger.info(`Retrieved attribute '${attributeName}' from element with locator: ${locator}`);
            return attribute;
        } catch (error) {
            logger.error(`Failed to get attribute '${attributeName}' from element with locator: ${locator}`, error);
            await screenshotHelper.takeScreenshot(this.driver, 'get_attribute_error');
            throw error;
        }
    }

    async isElementPresent(locator) {
        try {
            await this.driver.findElement(locator);
            return true;
        } catch (error) {
            return false;
        }
    }

    async isElementVisible(locator) {
        try {
            const element = await this.driver.findElement(locator);
            return await element.isDisplayed();
        } catch (error) {
            return false;
        }
    }

    async waitForPageLoad() {
        try {
            await this.driver.wait(
                () => this.driver.executeScript('return document.readyState').then(state => state === 'complete'),
                this.timeout
            );
            logger.info('Page loaded successfully');
        } catch (error) {
            logger.error('Page failed to load within timeout', error);
            throw error;
        }
    }

    async scrollToElement(locator) {
        try {
            const element = await this.waitForElement(locator);
            await this.driver.executeScript('arguments[0].scrollIntoView();', element);
            logger.info(`Scrolled to element with locator: ${locator}`);
        } catch (error) {
            logger.error(`Failed to scroll to element with locator: ${locator}`, error);
            throw error;
        }
    }

    async getPageTitle() {
        try {
            return await this.driver.getTitle();
        } catch (error) {
            logger.error('Failed to get page title', error);
            throw error;
        }
    }

    async getCurrentUrl() {
        try {
            return await this.driver.getCurrentUrl();
        } catch (error) {
            logger.error('Failed to get current URL', error);
            throw error;
        }
    }

    async refreshPage() {
        try {
            await this.driver.navigate().refresh();
            await this.waitForPageLoad();
            logger.info('Page refreshed successfully');
        } catch (error) {
            logger.error('Failed to refresh page', error);
            throw error;
        }
    }

    async goBack() {
        try {
            await this.driver.navigate().back();
            await this.waitForPageLoad();
            logger.info('Navigated back successfully');
        } catch (error) {
            logger.error('Failed to navigate back', error);
            throw error;
        }
    }
}

module.exports = BasePage;
