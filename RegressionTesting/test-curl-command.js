#!/usr/bin/env node

/**
 * Test Curl Command Construction
 * Direct test of the exact curl command that's failing
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testCurlCommand() {
    const lokiUrl = 'http://localhost:3101';
    const query = '{job="regression-tests"} |~ "(error|failed)"';
    const start = Date.now() - 300000; // 5 minutes ago
    const end = Date.now();
    
    // Our fixed URL construction
    let baseUrl = lokiUrl.replace(/\/$/, '');
    if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
    }
    const fullUrl = `${baseUrl}loki/api/v1/query_range`;
    
    console.log('🔍 Base URL:', baseUrl);
    console.log('🔍 Full URL:', fullUrl);
    
    // Test curl command construction
    const curlCommand = `wsl -d Ubuntu-EDrive -e bash -c "curl -s '${fullUrl}?query=${encodeURIComponent(query)}&start=${start}000000&end=${end}000000&limit=100'"`;
    
    console.log('🔍 Curl command:', curlCommand);
    
    // Try to execute it
    try {
        const { stdout, stderr } = await execAsync(curlCommand, { timeout: 10000 });
        console.log('✅ Command executed successfully');
        if (stderr) {
            console.log('⚠️  Stderr:', stderr);
        }
        if (stdout) {
            console.log('📄 Stdout length:', stdout.length);
        }
    } catch (error) {
        console.log('❌ Command failed:', error.message);
        // Check if the error contains double slashes
        if (error.message.includes('//')) {
            console.log('🔍 Double slash found in error message!');
        }
    }
}

// Run the test
testCurlCommand().catch(console.error);
