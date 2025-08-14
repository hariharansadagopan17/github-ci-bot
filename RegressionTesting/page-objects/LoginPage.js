const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class LoginPage extends BasePage {
    constructor(driver) {
        super(driver);
        this.usernameField = By.id('username');
        this.passwordField = By.id('password');
        this.loginButton = By.id('login-button');
        this.logoutButton = By.id('logout-button');
        this.errorMessage = By.css('.error-message');
        this.rememberMeCheckbox = By.id('remember-me');
        this.welcomeMessage = By.css('.welcome-message');
        this.validationErrors = By.css('.validation-error');
    }

    async navigateToLogin() {
        await this.navigateTo(process.env.LOGIN_URL || 'http://localhost:3000/login');
        await this.waitForPageLoad();
    }

    async enterUsername(username) {
        await this.waitForElement(this.usernameField);
        await this.clearAndType(this.usernameField, username);
    }

    async enterPassword(password) {
        await this.waitForElement(this.passwordField);
        await this.clearAndType(this.passwordField, password);
    }

    async clickLoginButton() {
        await this.waitForElement(this.loginButton);
        await this.click(this.loginButton);
    }

    async clickLogoutButton() {
        await this.waitForElement(this.logoutButton);
        await this.click(this.logoutButton);
    }

    async checkRememberMe() {
        await this.waitForElement(this.rememberMeCheckbox);
        const checkbox = await this.driver.findElement(this.rememberMeCheckbox);
        if (!(await checkbox.isSelected())) {
            await checkbox.click();
        }
    }

    async isErrorMessageDisplayed() {
        try {
            await this.waitForElement(this.errorMessage, 5000);
            return true;
        } catch (error) {
            return false;
        }
    }

    async getErrorMessage() {
        await this.waitForElement(this.errorMessage);
        return await this.getText(this.errorMessage);
    }

    async isWelcomeMessageDisplayed() {
        try {
            await this.waitForElement(this.welcomeMessage, 10000);
            return true;
        } catch (error) {
            return false;
        }
    }

    async getWelcomeMessage() {
        await this.waitForElement(this.welcomeMessage);
        return await this.getText(this.welcomeMessage);
    }

    async areValidationErrorsDisplayed() {
        try {
            const elements = await this.driver.findElements(this.validationErrors);
            return elements.length > 0;
        } catch (error) {
            return false;
        }
    }

    async isOnLoginPage() {
        try {
            await this.waitForElement(this.loginButton, 5000);
            return true;
        } catch (error) {
            return false;
        }
    }

    async isOnDashboard() {
        try {
            const currentUrl = await this.driver.getCurrentUrl();
            return currentUrl.includes('/dashboard') || currentUrl.includes('/home');
        } catch (error) {
            return false;
        }
    }

    async loginWithCredentials(username, password) {
        await this.enterUsername(username);
        await this.enterPassword(password);
        await this.clickLoginButton();
    }

    async loginWithValidCredentials() {
        const username = process.env.TEST_USERNAME || 'testuser@example.com';
        const password = process.env.TEST_PASSWORD || 'testpassword123';
        await this.loginWithCredentials(username, password);
    }

    async loginWithInvalidCredentials() {
        await this.loginWithCredentials('invalid@example.com', 'wrongpassword');
    }

    async loginWithEmptyCredentials() {
        await this.loginWithCredentials('', '');
    }
}

module.exports = LoginPage;
