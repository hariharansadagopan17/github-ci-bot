const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for Grafana
app.use(cors());
app.use(express.json());

// Serve log files as JSON for Grafana
app.get('/logs', (req, res) => {
    try {
        const logFile = path.join(__dirname, 'logs', 'regression-tests.log');
        const logContent = fs.readFileSync(logFile, 'utf8');
        
        // Parse each line as JSON
        const logs = logContent.split('\n')
            .filter(line => line.trim())
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return {
                        timestamp: new Date().toISOString(),
                        level: 'info',
                        message: line,
                        service: 'regression-testing-framework'
                    };
                }
            })
            .slice(-1000); // Last 1000 logs

        res.json({
            logs: logs,
            total: logs.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to read logs',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'log-server'
    });
});

// Get latest test metrics
app.get('/metrics', (req, res) => {
    try {
        const metricsFile = path.join(__dirname, 'reports', 'metrics-report.json');
        if (fs.existsSync(metricsFile)) {
            const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
            res.json(metrics);
        } else {
            res.json({
                message: 'No metrics available yet',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(500).json({
            error: 'Failed to read metrics',
            message: error.message
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Log server running on http://localhost:${PORT}`);
    console.log(`📊 Logs endpoint: http://localhost:${PORT}/logs`);
    console.log(`📈 Metrics endpoint: http://localhost:${PORT}/metrics`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
