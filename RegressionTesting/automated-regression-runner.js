const { spawn } = require('child_process');
const LokiLogStreamer = require('./loki-log-streamer');

class AutomatedRegressionRunner {
    constructor() {
        this.logStreamer = new LokiLogStreamer();
        this.isRunning = false;
    }
    
    async runRegressionTests() {
        console.log('🧪 Starting regression tests...');
        
        return new Promise((resolve) => {
            const testProcess = spawn('node', ['quick-test.js'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });
            
            testProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log('🔍 Test:', output.trim());
            });
            
            testProcess.stderr.on('data', (data) => {
                const errorOutput = data.toString();
                console.error('❌ Test error:', errorOutput.trim());
            });
            
            testProcess.on('close', (code) => {
                console.log(`🏁 Regression tests completed with exit code: ${code}`);
                if (code === 0) {
                    console.log('✅ All regression tests passed!');
                } else {
                    console.log('⚠️  Some regression tests failed');
                }
                resolve();
            });
            
            testProcess.on('error', (error) => {
                console.error('❌ Failed to start regression tests:', error.message);
                resolve();
            });
        });
    }
    
    async runCucumberTests() {
        console.log('🥒 Running Cucumber tests...');
        
        return new Promise((resolve) => {
            try {
                let cucumberProcess;
                
                try {
                    // Try npm run test first
                    cucumberProcess = spawn('npm', ['run', 'test'], {
                        stdio: ['pipe', 'pipe', 'pipe'],
                        shell: true
                    });
                    console.log('✅ Using npm run test for Cucumber');
                } catch (error) {
                    console.log('⚠️  npm run test not available, skipping Cucumber tests');
                    resolve();
                    return;
                }
                
                cucumberProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    console.log('🥒 Cucumber:', output.trim());
                });
                
                cucumberProcess.stderr.on('data', (data) => {
                    const errorOutput = data.toString();
                    console.log('🥒 Cucumber Info:', errorOutput.trim());
                });
                
                cucumberProcess.on('error', (error) => {
                    console.log('⚠️  Cucumber execution error:', error.message);
                    resolve();
                });
                
                cucumberProcess.on('close', (code) => {
                    console.log(`🥒 Cucumber tests completed with exit code: ${code}`);
                    resolve();
                });
                
            } catch (error) {
                console.log('❌ Failed to start Cucumber tests:', error.message);
                resolve();
            }
        });
    }
    
    async start() {
        if (this.isRunning) {
            console.log('⚠️  Runner already active');
            return;
        }
        
        try {
            console.log('🚀 Automated Regression Runner with Live Grafana Monitoring');
            console.log('=' .repeat(65));
            
            this.isRunning = true;
            
            // Step 1: Start log streamer
            console.log('\n📊 Step 1: Starting real-time log streaming to Loki...');
            this.logStreamer.start();
            
            // Wait for streamer to initialize
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Step 2: Run regression tests
            console.log('\n🧪 Step 2: Running regression tests...');
            await this.runRegressionTests();
            
            // Step 3: Run Cucumber tests
            console.log('\n🥒 Step 3: Running Cucumber tests...');
            await this.runCucumberTests();
            
            console.log('\n✅ All tests completed!');
            console.log('🎯 Check your Grafana dashboard for live logs!');
            console.log('📊 Grafana URL: https://79a151442637.ngrok-free.app');
            console.log('🔍 Query: {job="regression-tests"}');
            
        } catch (error) {
            console.error('❌ Error during test execution:', error.message);
        } finally {
            // Keep log streamer running for continuous monitoring
            console.log('\n💡 Log streamer continues running for real-time monitoring...');
            console.log('💡 Press Ctrl+C to stop everything');
        }
    }
    
    stop() {
        console.log('🛑 Stopping automated runner...');
        this.isRunning = false;
        this.logStreamer.stop();
        console.log('✅ Runner stopped');
    }
}

// Export for use as module
module.exports = AutomatedRegressionRunner;

// If run directly, start the runner
if (require.main === module) {
    console.log('🎬 Starting Automated Regression Runner...');
    
    const runner = new AutomatedRegressionRunner();
    
    runner.start().catch(error => {
        console.error('❌ Runner failed to start:', error.message);
    });
    
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
