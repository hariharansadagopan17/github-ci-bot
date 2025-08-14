const express = require('express');
const app = express();
app.use(express.static('public'));

// Create public directory
const fs = require('fs');
if (!fs.existsSync('public')) fs.mkdirSync('public');

// Create login page
fs.writeFileSync('public/login.html', `
<!DOCTYPE html>
<html>
<head>
  <title>Test Login</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 50px; background-color: #f5f5f5; }
    .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { text-align: center; color: #333; margin-bottom: 30px; }
    input { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    button { width: 100%; padding: 12px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    button:hover { background-color: #0056b3; }
    .checkbox-container { margin: 15px 0; display: flex; align-items: center; }
    .checkbox-container input[type="checkbox"] { width: auto; margin-right: 8px; }
    .error-message { margin-top: 15px; padding: 10px; border-radius: 4px; }
    .loading { display: none; text-align: center; margin-top: 10px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Login Page</h1>
    <form id="login-form">
      <input id="username" type="text" placeholder="Username (testuser@example.com)" required />
      <input id="password" type="password" placeholder="Password (testpassword123)" required />
      <div class="checkbox-container">
        <input id="remember-me" type="checkbox" />
        <label for="remember-me">Remember me</label>
      </div>
      <button id="login-button" type="button" onclick="login()">Login</button>
      <div class="loading" id="loading">Logging in...</div>
    </form>
    <div id="error-message" class="error-message" style="display:none; color:red; background-color:#ffebee; border: 1px solid #f44336;">Invalid credentials</div>
    <div id="validation-error" class="error-message" style="display:none; color:red; background-color:#ffebee; border: 1px solid #f44336;">All fields are required</div>
  </div>
  
  <script>
    function login() {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const loginButton = document.getElementById('login-button');
      const loading = document.getElementById('loading');
      
      // Hide previous error messages
      document.getElementById('error-message').style.display = 'none';
      document.getElementById('validation-error').style.display = 'none';
      
      // Validation
      if (!username || !password) {
        document.getElementById('validation-error').style.display = 'block';
        return;
      }
      
      // Show loading state
      loginButton.disabled = true;
      loginButton.textContent = 'Logging in...';
      loading.style.display = 'block';
      
      // Simulate async login
      setTimeout(() => {
        if (username === 'testuser@example.com' && password === 'testpassword123') {
          // Store remember me state
          if (document.getElementById('remember-me').checked) {
            localStorage.setItem('rememberUser', 'true');
          }
          window.location.href = '/dashboard.html';
        } else {
          document.getElementById('error-message').style.display = 'block';
          loginButton.disabled = false;
          loginButton.textContent = 'Login';
          loading.style.display = 'none';
        }
      }, 1000); // Simulate network delay
    }
    
    // Handle Enter key press
    document.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        login();
      }
    });
    
    // Auto-fill if remembered
    window.onload = function() {
      if (localStorage.getItem('rememberUser') === 'true') {
        document.getElementById('remember-me').checked = true;
      }
    };
  </script>
</body>
</html>
`);

// Create dashboard page
fs.writeFileSync('public/dashboard.html', `
<!DOCTYPE html>
<html>
<head>
  <title>Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background-color: #f8f9fa; }
    .header { background-color: #007bff; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
    .container { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
    .welcome-message { font-size: 24px; color: #333; margin-bottom: 30px; }
    .card { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .card h3 { margin-top: 0; color: #007bff; }
    button { padding: 10px 20px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background-color: #c82333; }
    .user-info { background-color: #e9ecef; padding: 10px; border-radius: 4px; margin: 15px 0; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-number { font-size: 2em; font-weight: bold; }
    .menu { list-style: none; padding: 0; }
    .menu li { padding: 10px; border-bottom: 1px solid #eee; }
    .menu li:hover { background-color: #f8f9fa; cursor: pointer; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Test Dashboard</h2>
    <button id="logout-button" onclick="logout()">Logout</button>
  </div>
  
  <div class="container">
    <div class="welcome-message">Welcome to the dashboard!</div>
    
    <div class="user-info">
      <strong>User:</strong> <span id="current-user">testuser@example.com</span><br>
      <strong>Login Time:</strong> <span id="login-time"></span><br>
      <strong>Session ID:</strong> <span id="session-id"></span>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">42</div>
        <div>Total Tests</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">38</div>
        <div>Tests Passed</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">4</div>
        <div>Tests Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">95%</div>
        <div>Success Rate</div>
      </div>
    </div>
    
    <div class="card">
      <h3>Quick Actions</h3>
      <ul class="menu">
        <li onclick="runTests()">🧪 Run New Test Suite</li>
        <li onclick="viewReports()">📊 View Test Reports</li>
        <li onclick="manageUsers()">👥 Manage Users</li>
        <li onclick="systemSettings()">⚙️ System Settings</li>
        <li onclick="viewLogs()">📝 View Logs</li>
      </ul>
    </div>
    
    <div class="card">
      <h3>Recent Activity</h3>
      <div id="activity-log">
        <p>• Regression test completed - 2 minutes ago</p>
        <p>• New test case added - 15 minutes ago</p>
        <p>• System backup completed - 1 hour ago</p>
        <p>• User logged in - Just now</p>
      </div>
    </div>
  </div>
  
  <script>
    function logout() {
      // Clear remember me if it was set
      localStorage.removeItem('rememberUser');
      
      // Add logout confirmation
      if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/login.html';
      }
    }
    
    function runTests() {
      alert('Running test suite... This is a demo action.');
    }
    
    function viewReports() {
      alert('Opening test reports... This is a demo action.');
    }
    
    function manageUsers() {
      alert('Opening user management... This is a demo action.');
    }
    
    function systemSettings() {
      alert('Opening system settings... This is a demo action.');
    }
    
    function viewLogs() {
      alert('Opening system logs... This is a demo action.');
    }
    
    // Initialize dashboard
    window.onload = function() {
      // Set current time
      document.getElementById('login-time').textContent = new Date().toLocaleString();
      
      // Generate random session ID
      document.getElementById('session-id').textContent = 'sess_' + Math.random().toString(36).substr(2, 9);
      
      // Update activity log every 30 seconds
      setInterval(updateActivity, 30000);
    };
    
    function updateActivity() {
      const activities = [
        'New test execution started',
        'Performance metrics updated', 
        'Error log analyzed',
        'System health check completed',
        'Database backup initiated'
      ];
      
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      const activityLog = document.getElementById('activity-log');
      const newActivity = document.createElement('p');
      newActivity.textContent = '• ' + randomActivity + ' - Just now';
      activityLog.insertBefore(newActivity, activityLog.firstChild);
      
      // Keep only last 5 activities
      while (activityLog.children.length > 5) {
        activityLog.removeChild(activityLog.lastChild);
      }
    }
  </script>
</body>
</html>
`);

// Routes
app.get('/', (req, res) => res.redirect('/login.html'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Internal Server Error');
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Login page: http://localhost:${PORT}/login.html`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = server;