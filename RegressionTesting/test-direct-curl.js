#!/usr/bin/env node

/**
 * Direct WSL Curl Test
 * Test if WSL bash is adding double slashes
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testDirectCurl() {
    // Test 1: Simple URL without any Loki paths
    console.log('Test 1: Simple HTTP request');
    try {
        const simpleCmd = `wsl -d Ubuntu-EDrive -e bash -c "curl -I -s 'http://localhost:3101/ready'"`;
        console.log('Command:', simpleCmd);
        const { stdout, stderr } = await execAsync(simpleCmd, { timeout: 5000 });
        console.log('✅ Simple request successful');
        if (stderr) console.log('Stderr:', stderr.substring(0, 200));
    } catch (error) {
        console.log('❌ Simple request failed:', error.message.substring(0, 300));
    }
    
    // Test 2: Test with the exact path that's failing
    console.log('\nTest 2: Loki query path');
    try {
        const lokiCmd = `wsl -d Ubuntu-EDrive -e bash -c "curl -I -s 'http://localhost:3101/loki/api/v1/query_range'"`;
        console.log('Command:', lokiCmd);
        const { stdout, stderr } = await execAsync(lokiCmd, { timeout: 5000 });
        console.log('✅ Loki path request successful');
        if (stderr) console.log('Stderr:', stderr.substring(0, 200));
    } catch (error) {
        console.log('❌ Loki path request failed:', error.message.substring(0, 300));
        // Check if error message contains double slash
        if (error.message.includes('//loki')) {
            console.log('🔍 Found double slash in error! This suggests WSL or curl is modifying the URL');
        }
    }
    
    // Test 3: Test with query parameters like we do in the real call
    console.log('\nTest 3: With query parameters');
    try {
        const queryCmd = `wsl -d Ubuntu-EDrive -e bash -c "curl -I -s 'http://localhost:3101/loki/api/v1/query_range?query=test&start=1000&end=2000'"`;
        console.log('Command:', queryCmd);
        const { stdout, stderr } = await execAsync(queryCmd, { timeout: 5000 });
        console.log('✅ Query with params successful');
        if (stderr) console.log('Stderr:', stderr.substring(0, 200));
    } catch (error) {
        console.log('❌ Query with params failed:', error.message.substring(0, 300));
        if (error.message.includes('//loki')) {
            console.log('🔍 Found double slash in error with query params!');
        }
    }
}

testDirectCurl().catch(console.error);
