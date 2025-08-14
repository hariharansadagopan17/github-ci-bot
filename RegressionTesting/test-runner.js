#!/usr/bin/env node

/**
 * Regression Test Runner
 * Simple CLI tool to run regression tests with different configurations
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
let config = {
    headless: true,
    browser: 'chrome',
    tags: '',
    environment: 'development',
    baseUrl: 'http://localhost:3000',
    parallel: 1
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--browser':
        case '-b':
            config.browser = args[++i];
            break;
        case '--headless':
            config.headless = args[++i] !== 'false';
            break;
        case '--tags':
        case '-t':
            config.tags = args[++i];
            break;
        case '--env':
        case '-e':
            config.environment = args[++i];
            break;
        case '--url':
        case '-u':
            config.baseUrl = args[++i];
            break;
        case '--parallel':
        case '-p':
            config.parallel = parseInt(args[++i]);
            break;
        case '--help':
        case '-h':
            showHelp();
            process.exit(0);
        default:
            if (args[i].startsWith('-')) {
                console.error(`Unknown option: ${args[i]}`);
                process.exit(1);
            }
    }
}

function showHelp() {
    console.log(`
Regression Test Runner

Usage: node test-runner.js [options]

Options:
    -b, --browser <browser>     Browser to use (chrome, firefox) [default: chrome]
    -h, --headless <boolean>    Run in headless mode [default: true]
    -t, --tags <tags>          Cucumber tags to run (e.g., @smoke, @login)
    -e, --env <environment>    Test environment [default: development]
    -u, --url <url>           Base URL for tests [default: http://localhost:3000]
    -p, --parallel <number>    Number of parallel processes [default: 1]
    --help                     Show this help message

Examples:
    node test-runner.js --browser chrome --headless false
    node test-runner.js --tags @smoke --env staging
    node test-runner.js --url http://staging.example.com --parallel 2
`);
}

function runTests() {
    console.log('🧪 Starting Regression Tests...');
    console.log(`Configuration:`, config);
    
    // Set environment variables
    const env = {
        ...process.env,
        HEADLESS: config.headless.toString(),
        BROWSER_NAME: config.browser,
        BASE_URL: config.baseUrl,
        LOGIN_URL: `${config.baseUrl}/login`,
        TEST_ENV: config.environment
    };
    
    // Build cucumber command
    let cucumberArgs = ['cucumber-js'];
    
    if (config.tags) {
        cucumberArgs.push('--tags', config.tags);
    }
    
    if (config.parallel > 1) {
        cucumberArgs.push('--parallel', config.parallel.toString());
    }
    
    // Add format options
    cucumberArgs.push(
        '--format', 'pretty',
        '--format', 'json:reports/cucumber-report.json',
        '--format', 'html:reports/cucumber-report.html'
    );
    
    console.log(`Running command: npx ${cucumberArgs.join(' ')}`);
    
    // Ensure directories exist
    ['reports', 'screenshots', 'logs'].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    // Run cucumber tests
    const cucumber = spawn('npx', cucumberArgs, {
        stdio: 'inherit',
        env: env,
        cwd: process.cwd()
    });
    
    cucumber.on('close', (code) => {
        console.log(`\n🏁 Tests completed with exit code: ${code}`);
        
        if (code === 0) {
            console.log('✅ All tests passed!');
        } else {
            console.log('❌ Some tests failed. Check reports for details.');
        }
        
        console.log('\n📊 Reports generated:');
        console.log('- HTML Report: reports/cucumber-report.html');
        console.log('- JSON Report: reports/cucumber-report.json');
        console.log('- Screenshots: screenshots/');
        console.log('- Logs: logs/');
        
        process.exit(code);
    });
    
    cucumber.on('error', (error) => {
        console.error('❌ Failed to start tests:', error);
        process.exit(1);
    });
}

// Main execution
if (require.main === module) {
    runTests();
}

module.exports = { runTests, config };
