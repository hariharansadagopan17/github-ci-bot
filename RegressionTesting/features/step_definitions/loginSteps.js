const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const LoginPage = require('../../page-objects/LoginPage');
const logger = require('../../utils/logger');
const ScreenshotHelper = require('../../utils/screenshotHelper');

let loginPage;
const screenshotHelper = new ScreenshotHelper();

Given('I navigate to the login page', async function () {
    try {
        loginPage = new LoginPage(this.driver);
        await loginPage.navigateToLogin();
        logger.info('Navigated to login page');
    } catch (error) {
        logger.error('Failed to navigate to login page:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'navigate_to_login_failed');
        throw error;
    }
});

When('I enter valid username and password', async function () {
    try {
        await loginPage.loginWithValidCredentials();
        logger.info('Entered valid credentials');
    } catch (error) {
        logger.error('Failed to enter valid credentials:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'enter_valid_credentials_failed');
        throw error;
    }
});

When('I enter invalid username and password', async function () {
    try {
        await loginPage.loginWithInvalidCredentials();
        logger.info('Entered invalid credentials');
    } catch (error) {
        logger.error('Failed to enter invalid credentials:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'enter_invalid_credentials_failed');
        throw error;
    }
});

When('I leave username and password fields empty', async function () {
    try {
        await loginPage.loginWithEmptyCredentials();
        logger.info('Left credentials empty');
    } catch (error) {
        logger.error('Failed to leave credentials empty:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'empty_credentials_failed');
        throw error;
    }
});

When('I click the login button', async function () {
    try {
        await loginPage.clickLoginButton();
        logger.info('Clicked login button');
        // Wait a moment for the login process to complete
        await this.driver.sleep(2000);
    } catch (error) {
        logger.error('Failed to click login button:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'click_login_failed');
        throw error;
    }
});

When('I check the {string} checkbox', async function (checkboxLabel) {
    try {
        if (checkboxLabel === 'Remember me') {
            await loginPage.checkRememberMe();
            logger.info('Checked remember me checkbox');
        }
    } catch (error) {
        logger.error(`Failed to check ${checkboxLabel} checkbox:`, error);
        await screenshotHelper.takeScreenshot(this.driver, 'check_checkbox_failed');
        throw error;
    }
});

When('I click the logout button', async function () {
    try {
        await loginPage.clickLogoutButton();
        logger.info('Clicked logout button');
        // Wait a moment for the logout process to complete
        await this.driver.sleep(2000);
    } catch (error) {
        logger.error('Failed to click logout button:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'click_logout_failed');
        throw error;
    }
});

When('I close and reopen the browser', async function () {
    try {
        // Close the current browser
        await this.driver.quit();
        logger.info('Closed browser');
        
        // Reinitialize the driver
        const DriverManager = require('../../utils/driverManager');
        const driverManager = new DriverManager();
        this.driver = await driverManager.getDriver();
        loginPage = new LoginPage(this.driver);
        logger.info('Reopened browser');
    } catch (error) {
        logger.error('Failed to close and reopen browser:', error);
        throw error;
    }
});

When('I navigate to the application', async function () {
    try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        await loginPage.navigateTo(baseUrl);
        logger.info('Navigated to application');
    } catch (error) {
        logger.error('Failed to navigate to application:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'navigate_to_app_failed');
        throw error;
    }
});

Given('I am logged in with valid credentials', async function () {
    try {
        loginPage = new LoginPage(this.driver);
        await loginPage.navigateToLogin();
        await loginPage.loginWithValidCredentials();
        
        // Wait for successful login
        await this.driver.sleep(3000);
        logger.info('Successfully logged in');
    } catch (error) {
        logger.error('Failed to login with valid credentials:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'login_setup_failed');
        throw error;
    }
});

Then('I should be redirected to the dashboard', async function () {
    try {
        const isDashboard = await loginPage.isOnDashboard();
        expect(isDashboard).to.be.true;
        logger.info('Successfully redirected to dashboard');
    } catch (error) {
        logger.error('Failed to redirect to dashboard:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'dashboard_redirect_failed');
        throw error;
    }
});

Then('I should see a welcome message', async function () {
    try {
        const isWelcomeDisplayed = await loginPage.isWelcomeMessageDisplayed();
        expect(isWelcomeDisplayed).to.be.true;
        
        const welcomeMessage = await loginPage.getWelcomeMessage();
        expect(welcomeMessage).to.not.be.empty;
        logger.info(`Welcome message displayed: ${welcomeMessage}`);
    } catch (error) {
        logger.error('Failed to verify welcome message:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'welcome_message_failed');
        throw error;
    }
});

Then('I should see an error message', async function () {
    try {
        const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
        expect(isErrorDisplayed).to.be.true;
        
        const errorMessage = await loginPage.getErrorMessage();
        expect(errorMessage).to.not.be.empty;
        logger.info(`Error message displayed: ${errorMessage}`);
    } catch (error) {
        logger.error('Failed to verify error message:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'error_message_failed');
        throw error;
    }
});

Then('I should remain on the login page', async function () {
    try {
        const isOnLoginPage = await loginPage.isOnLoginPage();
        expect(isOnLoginPage).to.be.true;
        logger.info('Remained on login page');
    } catch (error) {
        logger.error('Failed to verify remaining on login page:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'login_page_verification_failed');
        throw error;
    }
});

Then('I should see validation error messages', async function () {
    try {
        const areValidationErrorsDisplayed = await loginPage.areValidationErrorsDisplayed();
        expect(areValidationErrorsDisplayed).to.be.true;
        logger.info('Validation error messages displayed');
    } catch (error) {
        logger.error('Failed to verify validation error messages:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'validation_errors_failed');
        throw error;
    }
});

Then('I should be redirected to the login page', async function () {
    try {
        const isOnLoginPage = await loginPage.isOnLoginPage();
        expect(isOnLoginPage).to.be.true;
        logger.info('Successfully redirected to login page');
    } catch (error) {
        logger.error('Failed to redirect to login page:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'login_redirect_failed');
        throw error;
    }
});

Then('I should not be able to access protected pages', async function () {
    try {
        // Try to access a protected page (dashboard)
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        await loginPage.navigateTo(`${baseUrl}/dashboard`);
        
        // Should be redirected back to login or see unauthorized message
        const isOnLoginPage = await loginPage.isOnLoginPage();
        expect(isOnLoginPage).to.be.true;
        logger.info('Cannot access protected pages - properly redirected');
    } catch (error) {
        logger.error('Failed to verify protected page access:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'protected_page_access_failed');
        throw error;
    }
});

Then('I should still be logged in', async function () {
    try {
        const isOnDashboard = await loginPage.isOnDashboard();
        expect(isOnDashboard).to.be.true;
        logger.info('Still logged in after browser restart');
    } catch (error) {
        logger.error('Failed to verify persistent login:', error);
        await screenshotHelper.takeScreenshot(this.driver, 'persistent_login_failed');
        throw error;
    }
});
