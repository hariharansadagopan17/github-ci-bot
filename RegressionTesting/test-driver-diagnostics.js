#!/usr/bin/env node

/**
 * Driver and Screenshot Diagnostics
 * Tests driver initialization and screenshot functionality
 */

const DriverManager = require('./utils/driverManager');
const ScreenshotHelper = require('./utils/screenshotHelper');
const logger = require('./utils/logger');

async function testDriverAndScreenshots() {
    console.log('🔧 Testing Driver Initialization and Screenshots');
    console.log('='.repeat(60));
    
    let driver = null;
    const driverManager = new DriverManager();
    const screenshotHelper = new ScreenshotHelper();
    
    try {
        // Test 1: Driver initialization
        console.log('\n📦 Test 1: Driver initialization...');
        driver = await driverManager.getDriver();
        
        if (driver) {
            console.log('✅ Driver initialized successfully');
            
            // Test if driver is responsive
            const title = await driver.getTitle();
            console.log(`✅ Driver is responsive (current title: "${title}")`);
        } else {
            console.log('❌ Driver initialization failed');
            return;
        }
        
        // Test 2: Navigate to test page
        console.log('\n🌐 Test 2: Navigation test...');
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        await driver.get(baseUrl);
        
        const currentUrl = await driver.getCurrentUrl();
        console.log(`✅ Navigation successful. Current URL: ${currentUrl}`);
        
        // Wait for page to load
        await driver.sleep(2000);
        
        // Test 3: Screenshot functionality
        console.log('\n📸 Test 3: Screenshot functionality...');
        
        try {
            await screenshotHelper.takeScreenshot(driver, 'diagnostic_test');
            console.log('✅ Screenshot taken successfully');
        } catch (screenshotError) {
            console.log('❌ Screenshot failed:', screenshotError.message);
            console.log('   Stack:', screenshotError.stack);
        }
        
        // Test 4: Multiple screenshots (simulating failure scenario)
        console.log('\n📸 Test 4: Multiple screenshots...');
        for (let i = 1; i <= 3; i++) {
            try {
                await screenshotHelper.takeScreenshot(driver, `diagnostic_test_${i}`);
                console.log(`✅ Screenshot ${i} taken successfully`);
            } catch (error) {
                console.log(`❌ Screenshot ${i} failed:`, error.message);
            }
        }
        
        // Test 5: Driver responsiveness after operations
        console.log('\n🔍 Test 5: Driver responsiveness after operations...');
        try {
            const finalTitle = await driver.getTitle();
            console.log(`✅ Driver still responsive (title: "${finalTitle}")`);
        } catch (error) {
            console.log('❌ Driver became unresponsive:', error.message);
        }
        
    } catch (error) {
        console.log('❌ Test failed with error:', error.message);
        console.log('   Stack:', error.stack);
    } finally {
        // Test 6: Driver cleanup
        console.log('\n🧹 Test 6: Driver cleanup...');
        if (driver) {
            try {
                await driver.quit();
                console.log('✅ Driver quit successfully');
            } catch (quitError) {
                console.log('❌ Driver quit failed:', quitError.message);
            }
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Diagnostic tests completed!');
}

// Run diagnostics
testDriverAndScreenshots().catch(error => {
    console.error('Diagnostic failed:', error);
    process.exit(1);
});
