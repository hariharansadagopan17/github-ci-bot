const LokiLogStreamer = require('./loki-log-streamer');
const { spawn } = require('child_process');

class SimpleRegressionRunner {
    constructor() {
        this.logStreamer = new LokiLogStreamer();
    }
    
    async runQuickTest() {
        console.log('🧪 Running quick regression test...');
        
        return new Promise((resolve, reject) => {
            const testProcess = spawn('node', ['quick-test.js'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });
            
            testProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log('🔍 Test:', output.trim());
            });
            
            testProcess.stderr.on('data', (data) => {
                console.error('❌ Test error:', data.toString());
            });
            
            testProcess.on('close', (code) => {
                console.log(`🏁 Test completed with exit code: ${code}`);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Test failed with code ${code}`));
                }
            });
            
            testProcess.on('error', (error) => {
                console.error('❌ Failed to start test:', error.message);
                reject(error);
            });
        });
    }
    
    async start() {
        try {
            console.log('🚀 Simple Regression Runner with Live Grafana Monitoring');
            console.log('=' .repeat(60));
            
            // Step 1: Start log streamer
            console.log('\n📊 Starting real-time log streaming to Loki...');
            this.logStreamer.start();
            
            // Wait for streamer to initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Step 2: Run tests
            console.log('\n🧪 Running regression tests...');
            await this.runQuickTest();
            
            console.log('\n✅ Tests completed successfully!');
            console.log('🎯 Check your Grafana dashboard for live logs!');
            console.log('📊 Grafana URL: https://79a151442637.ngrok-free.app');
            console.log('🔍 Query: {job="regression-tests"}');
            console.log('\n💡 Log streamer continues running for real-time monitoring...');
            console.log('💡 Press Ctrl+C to stop');
            
        } catch (error) {
            console.error('❌ Error during test execution:', error.message);
            console.log('\n💡 Log streamer continues running...');
        }
    }
    
    stop() {
        console.log('🛑 Stopping runner...');
        this.logStreamer.stop();
        console.log('✅ Runner stopped');
    }
}

// Export for use as module
module.exports = SimpleRegressionRunner;

// If run directly, start the runner
if (require.main === module) {
    const runner = new SimpleRegressionRunner();
    
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
