const fs = require('fs');

async function pushLogsToLoki() {
    try {
        // Read the log file
        const logFile = 'logs/regression-tests.log';
        if (!fs.existsSync(logFile)) {
            console.log('❌ Log file not found');
            return;
        }

        const logData = fs.readFileSync(logFile, 'utf8');
        const logs = logData.trim().split('\n')
            .filter(line => line.trim())
            .slice(-10) // Get last 10 logs
            .map(line => {
                try {
                    const log = JSON.parse(line);
                    const timestamp = new Date(log.timestamp).getTime() * 1000000; // Convert to nanoseconds
                    return [timestamp.toString(), JSON.stringify(log)];
                } catch (e) {
                    const timestamp = Date.now() * 1000000;
                    return [timestamp.toString(), line];
                }
            });

        // Prepare Loki push payload
        const payload = {
            streams: [{
                stream: {
                    job: "regression-tests",
                    service: "regression-testing-framework"
                },
                values: logs
            }]
        };

        console.log(`📤 Pushing ${logs.length} log entries to Loki...`);
        console.log('Sample log entry:', logs[0]);

        // Import fetch dynamically
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch('http://172.22.163.79:3100/loki/api/v1/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('✅ Logs successfully pushed to Loki!');
        } else {
            console.log('❌ Failed to push logs:', response.status, response.statusText);
            const errorText = await response.text();
            console.log('Error details:', errorText);
        }

    } catch (error) {
        console.error('❌ Error pushing logs to Loki:', error);
    }
}

pushLogsToLoki();
