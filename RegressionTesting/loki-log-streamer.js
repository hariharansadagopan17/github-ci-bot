const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');

class LokiLogStreamer {
    constructor(lokiUrl = 'http://localhost:3100', logFile = 'logs/regression-tests.log') {
        this.lokiUrl = lokiUrl;
        this.logFile = logFile;
        this.lastPosition = 0;
        this.isRunning = false;
        this.streamInterval = null;
        
        // Ensure log directory exists
        if (!fs.existsSync('logs')) {
            fs.mkdirSync('logs');
        }
        
        console.log('🔄 Loki Log Streamer initialized');
        console.log(`📂 Watching: ${this.logFile}`);
        console.log(`🎯 Loki URL: ${this.lokiUrl}`);
    }
    
    async pushLogsToLoki(logEntries) {
        if (logEntries.length === 0) return;
        
        try {
            const streams = [{
                stream: {
                    job: "regression-tests",
                    service: "regression-testing-framework",
                    level: "info",
                    source: "automated-streaming"
                },
                values: []
            }];
            
            logEntries.forEach(entry => {
                try {
                    const logData = JSON.parse(entry.line);
                    const timestamp = new Date(logData.timestamp).getTime() * 1000000; // Convert to nanoseconds
                    streams[0].values.push([timestamp.toString(), entry.line]);
                } catch (e) {
                    // For non-JSON lines, use current timestamp
                    const timestamp = Date.now() * 1000000;
                    streams[0].values.push([timestamp.toString(), entry.line]);
                }
            });
            
            // Use WSL2 to push to Loki (more reliable than direct Windows connection)
            const payload = JSON.stringify({ streams });
            const curlCommand = `curl -s -X POST http://localhost:3100/loki/api/v1/push -H "Content-Type: application/json" -d '${payload.replace(/'/g, "'\"'\"'")}'`;
            
            const wslProcess = spawn('wsl', ['-d', 'Ubuntu-EDrive', '-e', 'bash', '-c', curlCommand]);
            
            wslProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ Pushed ${logEntries.length} log entries to Loki`);
                } else {
                    console.log(`⚠️  Failed to push logs (exit code: ${code})`);
                }
            });
            
        } catch (error) {
            console.error('❌ Error pushing to Loki:', error.message);
        }
    }
    
    async watchLogFile() {
        if (!fs.existsSync(this.logFile)) {
            console.log(`⏳ Waiting for log file: ${this.logFile}`);
            return;
        }
        
        try {
            const stats = fs.statSync(this.logFile);
            const currentSize = stats.size;
            
            if (currentSize > this.lastPosition) {
                const stream = fs.createReadStream(this.logFile, {
                    start: this.lastPosition,
                    encoding: 'utf8'
                });
                
                let buffer = '';
                const newEntries = [];
                
                stream.on('data', (chunk) => {
                    buffer += chunk;
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // Keep incomplete line in buffer
                    
                    lines.forEach(line => {
                        if (line.trim()) {
                            newEntries.push({ line: line.trim(), timestamp: new Date() });
                        }
                    });
                });
                
                stream.on('end', () => {
                    if (newEntries.length > 0) {
                        console.log(`📤 Found ${newEntries.length} new log entries`);
                        this.pushLogsToLoki(newEntries);
                    }
                    this.lastPosition = currentSize;
                });
                
            }
        } catch (error) {
            console.error('❌ Error reading log file:', error.message);
        }
    }
    
    start() {
        if (this.isRunning) {
            console.log('⚠️  Streamer already running');
            return;
        }
        
        console.log('🚀 Starting real-time log streaming to Loki...');
        this.isRunning = true;
        
        // Initial log file setup
        this.lastPosition = fs.existsSync(this.logFile) ? fs.statSync(this.logFile).size : 0;
        
        // Watch for changes every 2 seconds
        this.streamInterval = setInterval(() => {
            this.watchLogFile();
        }, 2000);
        
        // Push a startup message
        this.pushLogsToLoki([{
            line: JSON.stringify({
                environment: "development",
                level: "info",
                message: "🔄 Real-time log streaming to Loki started",
                service: "regression-testing-framework",
                timestamp: new Date().toISOString()
            })
        }]);
        
        console.log('✅ Log streamer started successfully');
        console.log('💡 Now run your regression tests and watch logs appear in Grafana!');
    }
    
    stop() {
        if (!this.isRunning) return;
        
        console.log('🛑 Stopping log streamer...');
        this.isRunning = false;
        
        if (this.streamInterval) {
            clearInterval(this.streamInterval);
            this.streamInterval = null;
        }
        
        // Push a shutdown message
        this.pushLogsToLoki([{
            line: JSON.stringify({
                environment: "development",
                level: "info",
                message: "🛑 Real-time log streaming to Loki stopped",
                service: "regression-testing-framework",
                timestamp: new Date().toISOString()
            })
        }]);
        
        console.log('✅ Log streamer stopped');
    }
}

// Export for use as a module
module.exports = LokiLogStreamer;

// If run directly, start the streamer
if (require.main === module) {
    const streamer = new LokiLogStreamer();
    streamer.start();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🔄 Received shutdown signal...');
        streamer.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\n🔄 Received termination signal...');
        streamer.stop();
        process.exit(0);
    });
    
    // Keep the process running
    console.log('💡 Press Ctrl+C to stop the log streamer');
}
