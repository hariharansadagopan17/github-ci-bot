const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve logs in a format Grafana can understand
app.get('/api/logs', (req, res) => {
    try {
        const logFile = path.join(__dirname, 'logs', 'regression-tests.log');
        
        if (!fs.existsSync(logFile)) {
            return res.json([]);
        }

        const logContent = fs.readFileSync(logFile, 'utf8');
        const lines = logContent.trim().split('\n').filter(line => line.trim());
        
        const logs = lines.map(line => {
            try {
                const parsed = JSON.parse(line);
                return {
                    timestamp: new Date(parsed.timestamp).getTime(),
                    time: parsed.timestamp,
                    level: parsed.level || 'info',
                    message: parsed.message || '',
                    service: parsed.service || 'regression-testing',
                    environment: parsed.environment || 'development',
                    scenario: parsed.scenario || null,
                    error: parsed.error || null,
                    metrics: parsed.metrics || null
                };
            } catch (e) {
                return {
                    timestamp: Date.now(),
                    time: new Date().toISOString(),
                    level: 'info',
                    message: line,
                    service: 'regression-testing',
                    environment: 'development',
                    scenario: null,
                    error: null,
                    metrics: null
                };
            }
        });

        // Sort by timestamp
        logs.sort((a, b) => b.timestamp - a.timestamp);
        
        res.json(logs);
    } catch (error) {
        console.error('Error reading logs:', error);
        res.status(500).json({ error: 'Failed to read logs' });
    }
});

// Get latest logs for real-time monitoring
app.get('/api/logs/latest', (req, res) => {
    try {
        const logFile = path.join(__dirname, 'logs', 'regression-tests.log');
        
        if (!fs.existsSync(logFile)) {
            return res.json([]);
        }

        const logContent = fs.readFileSync(logFile, 'utf8');
        const lines = logContent.trim().split('\n').filter(line => line.trim());
        
        // Get last 50 logs
        const recentLines = lines.slice(-50);
        
        const logs = recentLines.map(line => {
            try {
                const parsed = JSON.parse(line);
                return {
                    timestamp: new Date(parsed.timestamp).getTime(),
                    time: parsed.timestamp,
                    level: parsed.level || 'info',
                    message: parsed.message || '',
                    service: parsed.service || 'regression-testing',
                    environment: parsed.environment || 'development'
                };
            } catch (e) {
                return {
                    timestamp: Date.now(),
                    time: new Date().toISOString(),
                    level: 'info',
                    message: line,
                    service: 'regression-testing',
                    environment: 'development'
                };
            }
        });
        
        res.json(logs);
    } catch (error) {
        console.error('Error reading latest logs:', error);
        res.status(500).json({ error: 'Failed to read latest logs' });
    }
});

// Simple metrics endpoint
app.get('/api/metrics', (req, res) => {
    try {
        const logFile = path.join(__dirname, 'logs', 'regression-tests.log');
        
        if (!fs.existsSync(logFile)) {
            return res.json({ total: 0, errors: 0, info: 0, warn: 0 });
        }

        const logContent = fs.readFileSync(logFile, 'utf8');
        const lines = logContent.trim().split('\n').filter(line => line.trim());
        
        let total = 0;
        let errors = 0;
        let info = 0;
        let warn = 0;
        
        lines.forEach(line => {
            try {
                const parsed = JSON.parse(line);
                total++;
                
                switch (parsed.level) {
                    case 'error':
                        errors++;
                        break;
                    case 'warn':
                        warn++;
                        break;
                    case 'info':
                    default:
                        info++;
                        break;
                }
            } catch (e) {
                total++;
                info++;
            }
        });
        
        res.json({ total, errors, info, warn });
    } catch (error) {
        console.error('Error reading metrics:', error);
        res.status(500).json({ error: 'Failed to read metrics' });
    }
});

app.listen(port, () => {
    console.log(`🚀 Grafana Log API Server running on port ${port}`);
    console.log(`📊 Access logs at: http://localhost:${port}/api/logs`);
    console.log(`📈 Access metrics at: http://localhost:${port}/api/metrics`);
    console.log(`⚡ Latest logs at: http://localhost:${port}/api/logs/latest`);
});
