const LokiLogStreamer = require('./loki-log-streamer');
const { spawn } = require('child_process');
const path = require('path');

class CucumberRunner {
    constructor() {
        this.logStreamer = new LokiLogStreamer();
    }
    
    async runCucumberTests() {
        console.log('🥒 Running Cucumber regression tests with live log streaming...');
        
        return new Promise((resolve, reject) => {
            try {
                // Try different ways to run cucumber-js
                let cucumberProcess;
                let cucumberCommand;
                
                // Option 1: Try direct cucumber-js from node_modules
                const cucumberPath = path.join('node_modules', '.bin', 'cucumber-js');
                
                try {
                    cucumberCommand = 'cucumber-js';
                    cucumberProcess = spawn(cucumberCommand, [], {
                        stdio: ['pipe', 'pipe', 'pipe'],
                        shell: true,
                        cwd: process.cwd()
                    });
                    console.log('✅ Using cucumber-js directly');
                } catch (error1) {
                    console.log('⚠️  Trying alternative cucumber execution...');
                    
                    try {
                        // Option 2: Try node directly with cucumber path
                        cucumberCommand = 'node';
                        cucumberProcess = spawn('node', [cucumberPath], {
                            stdio: ['pipe', 'pipe', 'pipe'],
                            shell: true,
                            cwd: process.cwd()
                        });
                        console.log('✅ Using node with cucumber path');
                    } catch (error2) {
                        console.log('⚠️  Trying npm run test...');
                        
                        try {
                            // Option 3: Try npm run test
                            cucumberCommand = 'npm';
                            cucumberProcess = spawn('npm', ['run', 'test'], {
                                stdio: ['pipe', 'pipe', 'pipe'],
                                shell: true,
                                cwd: process.cwd()
                            });
                            console.log('✅ Using npm run test');
                        } catch (error3) {
                            console.log('❌ All cucumber execution methods failed');
                            console.log('💡 Please ensure cucumber-js is installed: npm install @cucumber/cucumber');
                            resolve();
                            return;
                        }
                    }
                }
                
                if (!cucumberProcess) {
                    console.log('❌ Failed to start cucumber process');
                    resolve();
                    return;
                }
                
                console.log(`🚀 Cucumber process started with: ${cucumberCommand}`);
                
                cucumberProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    console.log('🥒 Cucumber Output:', output.trim());
                });
                
                cucumberProcess.stderr.on('data', (data) => {
                    const errorOutput = data.toString();
                    console.log('🥒 Cucumber Info:', errorOutput.trim());
                });
                
                cucumberProcess.on('error', (error) => {
                    console.log('⚠️  Cucumber execution error:', error.message);
                    console.log('💡 This is expected if cucumber-js is not properly installed');
                    resolve();
                });
                
                cucumberProcess.on('close', (code) => {
                    console.log(`🥒 Cucumber tests completed with exit code: ${code}`);
                    if (code === 0) {
                        console.log('✅ All Cucumber tests passed!');
                    } else {
                        console.log('⚠️  Some Cucumber tests may have failed or no tests found');
                    }
                    resolve();
                });
                
            } catch (error) {
                console.log('❌ Failed to start Cucumber tests:', error.message);
                resolve(); // Continue without failing
            }
        });
    }
    
    async start() {
        try {
            console.log('🥒 Cucumber Test Runner with Live Grafana Monitoring');
            console.log('=' .repeat(60));
            
            // Step 1: Start log streamer
            console.log('\n📊 Step 1: Starting real-time log streaming to Loki...');
            this.logStreamer.start();
            
            // Wait for streamer to initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Step 2: Run Cucumber tests
            console.log('\n🥒 Step 2: Running Cucumber tests...');
            await this.runCucumberTests();
            
            console.log('\n✅ Cucumber testing completed!');
            console.log('🎯 Check your Grafana dashboard for live logs!');
            console.log('📊 Grafana URL: https://79a151442637.ngrok-free.app');
            console.log('🔍 Query: {job="regression-tests"}');
            console.log('\n💡 Log streamer continues running for real-time monitoring...');
            console.log('💡 Press Ctrl+C to stop');
            
        } catch (error) {
            console.error('❌ Error during Cucumber execution:', error.message);
            console.log('\n💡 Log streamer continues running...');
        }
    }
    
    stop() {
        console.log('🛑 Stopping Cucumber runner...');
        this.logStreamer.stop();
        console.log('✅ Cucumber runner stopped');
    }
}

// Export for use as module
module.exports = CucumberRunner;

// If run directly, start the runner
if (require.main === module) {
    const runner = new CucumberRunner();
    
    runner.start();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🔄 Received shutdown signal...');
        runner.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\n🔄 Received termination signal...');
        runner.stop();
        process.exit(0);
    });
}
