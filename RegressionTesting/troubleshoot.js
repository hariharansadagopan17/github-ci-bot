#!/usr/bin/env node

/**
 * Regression Testing Framework Troubleshooter
 * This script identifies and fixes common issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Regression Testing Framework Troubleshooter');
console.log('='.repeat(50));

// Check 1: Node.js version
console.log('\n📦 Checking Node.js version...');
const nodeVersion = process.version;
const minNodeVersion = '16.0.0';
console.log(`Current Node.js version: ${nodeVersion}`);
if (nodeVersion.replace('v', '') >= minNodeVersion) {
    console.log('✅ Node.js version is compatible');
} else {
    console.log(`❌ Node.js version must be >= ${minNodeVersion}`);
}

// Check 2: Required directories
console.log('\n📁 Checking required directories...');
const requiredDirs = ['features', 'page-objects', 'utils', 'reports', 'screenshots', 'logs'];
let dirIssues = 0;

requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`✅ ${dir}/ exists`);
    } else {
        console.log(`❌ ${dir}/ missing`);
        dirIssues++;
        try {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`  🔧 Created ${dir}/ directory`);
        } catch (error) {
            console.log(`  ❌ Failed to create ${dir}/: ${error.message}`);
        }
    }
});

// Check 3: Required files
console.log('\n📄 Checking required files...');
const requiredFiles = [
    'package.json',
    'features/login.feature',
    'features/step_definitions/loginSteps.js',
    'features/support/hooks.js',
    'page-objects/LoginPage.js',
    'utils/driverManager.js',
    'utils/logger.js',
    '.env'
];

let fileIssues = 0;
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} missing`);
        fileIssues++;
    }
});

// Check 4: Environment variables
console.log('\n🌍 Checking environment configuration...');
require('dotenv').config();

const requiredEnvVars = [
    'BASE_URL',
    'TEST_USERNAME', 
    'TEST_PASSWORD'
];

let envIssues = 0;
requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
        console.log(`✅ ${envVar} is set`);
    } else {
        console.log(`❌ ${envVar} is not set`);
        envIssues++;
    }
});

// Check 5: Chrome/ChromeDriver
console.log('\n🌐 Checking browser setup...');
try {
    const chrome = require('chromedriver');
    console.log('✅ ChromeDriver package is installed');
    
    // Check ChromeDriver binary
    try {
        const chromedriverPath = require('chromedriver').path;
        console.log(`✅ ChromeDriver binary found at: ${chromedriverPath}`);
    } catch (error) {
        console.log('⚠️  ChromeDriver binary path not found, but package is installed');
    }
} catch (error) {
    console.log('❌ ChromeDriver package not found');
    console.log('  🔧 Run: npm install chromedriver');
}

// Check 6: Test server availability
console.log('\n🌐 Checking test server...');
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

// Simple HTTP check
const http = require('http');
const url = require('url');

const checkServer = () => {
    return new Promise((resolve) => {
        const urlParts = url.parse(baseUrl);
        const options = {
            hostname: urlParts.hostname,
            port: urlParts.port,
            path: '/',
            method: 'GET',
            timeout: 3000
        };

        const req = http.request(options, (res) => {
            console.log(`✅ Test server is running at ${baseUrl} (Status: ${res.statusCode})`);
            resolve(true);
        });

        req.on('error', () => {
            console.log(`❌ Test server is not running at ${baseUrl}`);
            console.log('  🔧 Start the server with: node server.js');
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`❌ Test server timeout at ${baseUrl}`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
};

// Check 7: Package dependencies
console.log('\n📦 Checking npm dependencies...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    
    console.log(`✅ Found ${dependencies.length} dependencies in package.json`);
    
    // Check if node_modules exists
    if (fs.existsSync('node_modules')) {
        console.log('✅ node_modules/ directory exists');
    } else {
        console.log('❌ node_modules/ directory missing');
        console.log('  🔧 Run: npm install');
    }
} catch (error) {
    console.log('❌ Error reading package.json:', error.message);
}

// Check 8: Driver-specific diagnostics
console.log('\n🚗 Running driver diagnostics...');

async function runDriverDiagnostics() {
    try {
        const DriverManager = require('./utils/driverManager');
        const ScreenshotHelper = require('./utils/screenshotHelper');
        
        console.log('  🔧 Testing driver initialization...');
        const driverManager = new DriverManager();
        const screenshotHelper = new ScreenshotHelper();
        
        let driver = null;
        try {
            driver = await driverManager.getDriver();
            console.log('  ✅ Driver created successfully');
            
            // Test responsiveness
            await driver.getTitle();
            console.log('  ✅ Driver is responsive');
            
            // Test screenshot capability
            await driver.get(baseUrl);
            await driver.sleep(1000);
            
            await screenshotHelper.takeScreenshot(driver, 'diagnostic_test');
            console.log('  ✅ Screenshot functionality working');
            
        } catch (driverError) {
            console.log('  ❌ Driver test failed:', driverError.message);
            console.log('  💡 This might explain your automation script errors');
            
            if (driverError.message.includes('ChromeDriver')) {
                console.log('  🔧 Try: npm install chromedriver@latest');
            }
            if (driverError.message.includes('Chrome binary')) {
                console.log('  🔧 Ensure Google Chrome is installed on your system');
            }
        } finally {
            if (driver) {
                try {
                    await driver.quit();
                    console.log('  ✅ Driver cleanup successful');
                } catch (cleanupError) {
                    console.log('  ⚠️  Driver cleanup had issues:', cleanupError.message);
                }
            }
        }
        
    } catch (importError) {
        console.log('  ❌ Cannot import driver modules:', importError.message);
        console.log('  🔧 Check if all dependencies are properly installed');
    }
}

// Summary and recommendations
console.log('\n' + '='.repeat(50));
console.log('📋 SUMMARY & RECOMMENDATIONS');
console.log('='.repeat(50));

const totalIssues = dirIssues + fileIssues + envIssues;

if (totalIssues === 0) {
    console.log('🎉 Basic setup checks passed! Running driver diagnostics...');
    
    // Check server asynchronously and run driver diagnostics
    checkServer().then(async (serverRunning) => {
        if (serverRunning) {
            await runDriverDiagnostics();
        } else {
            console.log('⚠️  Cannot run driver diagnostics without test server');
        }
        
        console.log('\n🚀 To run tests after fixing any driver issues:');
        console.log('   1. Ensure test server is running: node server.js');
        console.log('   2. In another terminal: npm test');
        console.log('\n✨ Troubleshooting complete!');
    });
    
} else {
    console.log(`⚠️  Found ${totalIssues} issues that need attention.`);
    
    if (dirIssues > 0) {
        console.log('\n📁 Directory Issues:');
        console.log('   • Some required directories were missing (auto-created)');
    }
    
    if (fileIssues > 0) {
        console.log('\n📄 File Issues:');
        console.log('   • Some required files are missing');
        console.log('   • Check the STEP_BY_STEP_GUIDE.md for setup instructions');
    }
    
    if (envIssues > 0) {
        console.log('\n🌍 Environment Issues:');
        console.log('   • Check your .env file configuration');
        console.log('   • Ensure all required environment variables are set');
    }
    
    console.log('\n📚 For detailed setup instructions:');
    console.log('   • Read: STEP_BY_STEP_GUIDE.md');
    console.log('   • Check: README.md');
    
    console.log('\n✨ Fix the above issues and run troubleshoot again!');
}
