#!/usr/bin/env node

/**
 * Quick Driver and Screenshot Test
 * This script tests the specific issues mentioned in the error logs
 */

const DriverManager = require('./utils/driverManager');
const ScreenshotHelper = require('./utils/screenshotHelper');
const logger = require('./utils/logger');

async function quickTest() {
    console.log('🧪 Quick Driver and Screenshot Test');
    console.log('='.repeat(40));
    
    let driver = null;
    
    try {
        // Initialize components
        const driverManager = new DriverManager();
        const screenshotHelper = new ScreenshotHelper();
        
        console.log('✅ Components initialized successfully');
        
        // Get driver
        console.log('🚗 Initializing driver...');
        driver = await driverManager.getDriver();
        console.log('✅ Driver initialized');
        
        // Navigate to login page
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        console.log(`🌐 Navigating to ${baseUrl}...`);
        await driver.get(baseUrl);
        console.log('✅ Navigation successful');
        
        // Wait a bit
        await driver.sleep(2000);
        
        // Test screenshot - this is where the original error occurred
        console.log('📸 Testing screenshot functionality...');
        await screenshotHelper.takeScreenshot(driver, 'quick_test');
        console.log('✅ Screenshot taken successfully!');
        
        // Test multiple screenshots (as would happen during failure scenarios)
        console.log('📸 Testing multiple screenshots...');
        for (let i = 1; i <= 3; i++) {
            await screenshotHelper.takeScreenshot(driver, `test_${i}`);
            console.log(`✅ Screenshot ${i} successful`);
        }
        
        // Test driver responsiveness (simulate what happens in After hook)
        console.log('🔍 Testing driver responsiveness...');
        const title = await driver.getTitle();
        console.log(`✅ Driver responsive (title: "${title}")`);
        
        console.log('\n🎉 ALL TESTS PASSED! The screenshot issue should be fixed.');
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
        console.log('Stack:', error.stack);
        
        if (error.message.includes('Driver is required')) {
            console.log('\n💡 The original issue still exists. This means:');
            console.log('   • Driver is being passed as null or undefined');
            console.log('   • Driver becomes invalid between scenarios');
        }
    } finally {
        if (driver) {
            try {
                console.log('🧹 Cleaning up driver...');
                await driver.quit();
                console.log('✅ Driver cleanup successful');
            } catch (cleanupError) {
                console.log('⚠️  Driver cleanup issue:', cleanupError.message);
            }
        }
    }
}

// Load environment variables
require('dotenv').config();

// Run the test
quickTest().catch(error => {
    console.error('Quick test failed:', error);
    process.exit(1);
});
