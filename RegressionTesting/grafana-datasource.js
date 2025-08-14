const express = require('express');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Enable CORS
app.use(cors());

// Proxy to existing log API
const LOG_API_URL = 'http://localhost:3001';

// Grafana SimpleJSON data source endpoints
app.get('/search', (req, res) => {
    // Return available metrics
    res.json([
        'regression_test_logs',
        'test_count', 
        'error_count',
        'screenshot_count'
    ]);
});

app.post('/query', async (req, res) => {
    try {
        // Fetch from existing log API
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`${LOG_API_URL}/api/logs/latest?limit=50`);
        const data = await response.json();
        
        if (!data.logs || data.logs.length === 0) {
            return res.json([]);
        }

        // Format data for Grafana time series
        const datapoints = data.logs.map(log => [
            1, // value (you can change this to count errors, etc.)
            new Date(log.timestamp).getTime()
        ]);

        const response_data = [
            {
                target: 'regression_test_logs',
                datapoints: datapoints
            }
        ];

        res.json(response_data);
    } catch (error) {
        console.error('Query error:', error);
        res.json([]);
    }
});

// Table data for Grafana table panels
app.post('/query-table', async (req, res) => {
    try {
        // Fetch from existing log API
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`${LOG_API_URL}/api/logs/latest?limit=50`);
        const data = await response.json();
        
        if (!data.logs || data.logs.length === 0) {
            return res.json({
                columns: [
                    { text: "Timestamp", type: "time" },
                    { text: "Level", type: "string" },
                    { text: "Message", type: "string" },
                    { text: "Service", type: "string" }
                ],
                rows: []
            });
        }

        const rows = data.logs.reverse().map(log => [
            new Date(log.timestamp).getTime(),
            log.level.toUpperCase(),
            log.message,
            log.service || 'N/A'
        ]);

        res.json({
            columns: [
                { text: "Timestamp", type: "time" },
                { text: "Level", type: "string" },
                { text: "Message", type: "string" },
                { text: "Service", type: "string" }
            ],
            rows: rows
        });
    } catch (error) {
        console.error('Table query error:', error);
        res.json({ columns: [], rows: [] });
    }
});

app.get('/', (req, res) => {
    res.json({
        message: 'Grafana SimpleJSON Data Source for Regression Tests',
        endpoints: {
            search: '/search',
            query: '/query',
            'query-table': '/query-table'
        }
    });
});

app.listen(PORT, () => {
    console.log(`🔗 Grafana SimpleJSON Data Source running on port ${PORT}`);
    console.log(`🎯 Configure in Grafana with URL: http://172.22.160.1:${PORT}`);
    console.log(`📊 Available endpoints: /search, /query, /query-table`);
});
