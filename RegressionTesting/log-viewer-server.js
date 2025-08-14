const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 8080;

// Enable CORS for all routes
app.use(cors());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get logs (proxy to the main log API)
app.get('/api/logs', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('http://localhost:3001/api/logs');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs', message: error.message });
    }
});

// API endpoint to get latest logs (proxy to the main log API)
app.get('/api/logs/latest', async (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`http://localhost:3001/api/logs/latest?limit=${limit}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching latest logs:', error);
        res.status(500).json({ error: 'Failed to fetch latest logs', message: error.message });
    }
});

// Enhanced logs viewer endpoint
app.get('/logs-viewer', (req, res) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Regression Test Logs - Real-time Dashboard</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: #ffffff;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }
        .header {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .status-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
        }
        .status-item {
            background: rgba(255, 255, 255, 0.2);
            padding: 10px 15px;
            border-radius: 25px;
            font-size: 0.9em;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .status-online {
            background: rgba(76, 175, 80, 0.3);
        }
        .status-offline {
            background: rgba(244, 67, 54, 0.3);
        }
        .refresh-btn {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1em;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }
        .refresh-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
        }
        .log-container {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 15px;
            max-height: 70vh;
            overflow-y: auto;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .log-entry {
            margin-bottom: 15px;
            padding: 15px;
            border-radius: 10px;
            backdrop-filter: blur(5px);
            border-left: 4px solid #00ff00;
            background: rgba(0, 255, 0, 0.1);
            word-wrap: break-word;
            transition: all 0.3s ease;
            animation: slideIn 0.5s ease-out;
        }
        .log-entry:hover {
            transform: translateX(5px);
            background: rgba(0, 255, 0, 0.15);
        }
        .log-error {
            border-left-color: #ff4444;
            background: rgba(255, 68, 68, 0.1);
        }
        .log-error:hover {
            background: rgba(255, 68, 68, 0.15);
        }
        .log-warning {
            border-left-color: #ffaa00;
            background: rgba(255, 170, 0, 0.1);
        }
        .log-warning:hover {
            background: rgba(255, 170, 0, 0.15);
        }
        .timestamp {
            color: #b0b0b0;
            font-size: 0.85em;
            margin-bottom: 8px;
            font-weight: 600;
        }
        .log-message {
            font-size: 1em;
            line-height: 1.4;
            margin-bottom: 5px;
        }
        .log-meta {
            font-size: 0.85em;
            color: #d0d0d0;
            font-style: italic;
        }
        .screenshot-info {
            background: rgba(33, 150, 243, 0.2);
            padding: 8px 12px;
            border-radius: 8px;
            margin-top: 8px;
            border-left: 3px solid #2196F3;
        }
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .loading {
            text-align: center;
            padding: 40px;
            font-size: 1.2em;
            opacity: 0.7;
        }
        .auto-refresh-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-left: 10px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { background-color: #4CAF50; opacity: 1; }
            50% { background-color: #45a049; opacity: 0.5; }
            100% { background-color: #4CAF50; opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Regression Test Logs Dashboard</h1>
        <div class="status-bar">
            <div id="connectionStatus" class="status-item status-offline">
                <span id="statusIcon">🔴</span>
                <span id="statusText">Connecting...</span>
            </div>
            <div class="status-item">
                <span>📊 Total Logs: <span id="logCount">0</span></span>
            </div>
            <div class="status-item">
                <span id="lastUpdate">Never</span>
                <div class="auto-refresh-indicator"></div>
            </div>
            <button class="refresh-btn" onclick="loadLogs()" id="refreshBtn">
                🔄 Refresh Now
            </button>
        </div>
    </div>
    
    <div id="logContainer" class="log-container">
        <div class="loading">Loading logs...</div>
    </div>

    <script>
        let logCount = 0;
        let refreshInterval;
        
        async function loadLogs() {
            try {
                document.getElementById('refreshBtn').textContent = '🔄 Loading...';
                
                const response = await fetch('/api/logs/latest?limit=100');
                
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                const data = await response.json();
                
                updateConnectionStatus(true);
                
                if (data.logs && data.logs.length > 0) {
                    displayLogs(data.logs.reverse());
                    logCount = data.logs.length;
                    document.getElementById('logCount').textContent = logCount;
                } else {
                    document.getElementById('logContainer').innerHTML = 
                        '<div class="loading">No logs found. Run some tests to see results here!</div>';
                }
                
                document.getElementById('lastUpdate').textContent = 
                    \`Last updated: \${new Date().toLocaleTimeString()}\`;
                    
            } catch (error) {
                console.error('Error loading logs:', error);
                updateConnectionStatus(false);
                document.getElementById('logContainer').innerHTML = 
                    \`<div class="log-entry log-error">
                        <div class="timestamp">\${new Date().toLocaleString()}</div>
                        <div class="log-message"><strong>⚠️ Connection Error:</strong> \${error.message}</div>
                        <div class="log-meta">
                            Make sure the log API server is running on port 3001<br>
                            <small>Trying to reconnect automatically...</small>
                        </div>
                    </div>\`;
            } finally {
                document.getElementById('refreshBtn').textContent = '🔄 Refresh Now';
            }
        }

        function updateConnectionStatus(isOnline) {
            const statusElement = document.getElementById('connectionStatus');
            const iconElement = document.getElementById('statusIcon');
            const textElement = document.getElementById('statusText');
            
            if (isOnline) {
                statusElement.className = 'status-item status-online';
                iconElement.textContent = '🟢';
                textElement.textContent = 'Connected';
            } else {
                statusElement.className = 'status-item status-offline';
                iconElement.textContent = '🔴';
                textElement.textContent = 'Disconnected';
            }
        }

        function displayLogs(logs) {
            const container = document.getElementById('logContainer');
            let html = '';
            
            logs.forEach((log, index) => {
                const logClass = log.level === 'error' ? 'log-error' : 
                               log.level === 'warn' ? 'log-warning' : '';
                
                html += \`
                    <div class="log-entry \${logClass}" style="animation-delay: \${index * 0.1}s">
                        <div class="timestamp">📅 \${new Date(log.timestamp).toLocaleString()}</div>
                        <div class="log-message">
                            <strong>[\${log.level.toUpperCase()}]</strong> \${log.message}
                        </div>
                        \${log.screenshot ? \`
                            <div class="screenshot-info">
                                📸 <strong>Screenshot:</strong> \${log.screenshot.filename}<br>
                                📁 <small>\${log.screenshot.path}</small><br>
                                📊 <small>Size: \${(log.screenshot.size / 1024).toFixed(1)}KB</small>
                            </div>
                        \` : ''}
                        \${log.service ? \`
                            <div class="log-meta">🔧 Service: \${log.service}</div>
                        \` : ''}
                        \${log.environment ? \`
                            <div class="log-meta">🌍 Environment: \${log.environment}</div>
                        \` : ''}
                    </div>
                \`;
            });
            
            container.innerHTML = html || '<div class="loading">No logs to display.</div>';
        }

        // Auto-refresh every 10 seconds
        function startAutoRefresh() {
            if (refreshInterval) clearInterval(refreshInterval);
            refreshInterval = setInterval(loadLogs, 10000);
        }
        
        function stopAutoRefresh() {
            if (refreshInterval) clearInterval(refreshInterval);
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            loadLogs();
            startAutoRefresh();
            
            // Handle page visibility change to pause/resume auto-refresh
            document.addEventListener('visibilitychange', function() {
                if (document.hidden) {
                    stopAutoRefresh();
                } else {
                    startAutoRefresh();
                    loadLogs(); // Refresh immediately when page becomes visible
                }
            });
        });

        // Handle window beforeunload
        window.addEventListener('beforeunload', function() {
            stopAutoRefresh();
        });
    </script>
</body>
</html>
    `;
    
    res.send(htmlContent);
});

// Default route
app.get('/', (req, res) => {
    res.redirect('/logs-viewer');
});

app.listen(PORT, () => {
    console.log(`🚀 Enhanced Log Viewer Server running on http://localhost:${PORT}`);
    console.log(`📊 Access the dashboard at: http://localhost:${PORT}/logs-viewer`);
    console.log(`🔄 Auto-refresh enabled every 10 seconds`);
    console.log(`📡 Proxying log requests to http://localhost:3001`);
});
