const axios = require('axios');
const fs = require('fs');

async function pushRecentLogsToLoki() {
    try {
        console.log('📤 Pushing recent test logs to Loki...');
        
        // Read recent logs
        const logData = fs.readFileSync('logs/regression-tests.log', 'utf8');
        const logLines = logData.trim().split('\n').slice(-50); // Get last 50 entries
        
        // Format logs for Loki
        const streams = [{
            stream: {
                job: "regression-tests",
                level: "info",
                service: "regression-testing-framework"
            },
            values: []
        }];
        
        logLines.forEach(line => {
            if (line.trim()) {
                try {
                    const logEntry = JSON.parse(line);
                    const timestamp = new Date(logEntry.timestamp).getTime() * 1000000; // Convert to nanoseconds
                    streams[0].values.push([timestamp.toString(), line]);
                } catch (e) {
                    // Skip invalid JSON lines
                }
            }
        });
        
        // Add current timestamp log
        const now = Date.now() * 1000000;
        const currentLog = {
            environment: "development",
            level: "info",
            message: `Fresh logs pushed to Loki at ${new Date().toISOString()}`,
            service: "regression-testing-framework",
            timestamp: new Date().toISOString()
        };
        streams[0].values.push([now.toString(), JSON.stringify(currentLog)]);
        
        const payload = { streams };
        
        console.log(`📊 Pushing ${streams[0].values.length} log entries...`);
        
        // Push to Loki (running in WSL2)
        const response = await axios.post('http://host.docker.internal:3100/loki/api/v1/push', payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Logs successfully pushed to Loki!');
        console.log(`🎯 You should now see ${streams[0].values.length} log entries in Grafana`);
        
    } catch (error) {
        console.error('❌ Error pushing logs to Loki:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

pushRecentLogsToLoki();
