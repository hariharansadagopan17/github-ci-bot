#!/bin/bash

# Regression Testing Framework Installation Script

set -e

echo "🚀 Installing Regression Testing Framework..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version $NODE_VERSION is not supported. Please upgrade to version 16 or higher."
        exit 1
    fi
    
    print_status "Node.js version $(node --version) ✓"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    
    print_status "npm version $(npm --version) ✓"
    
    # Check if Chrome is available (optional warning)
    if ! command -v google-chrome &> /dev/null && ! command -v chromium-browser &> /dev/null; then
        print_warning "Chrome/Chromium not found. Tests will run in headless mode only."
    else
        print_status "Chrome/Chromium found ✓"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    npm install
    print_status "Dependencies installed ✓"
}

# Create required directories
create_directories() {
    print_status "Creating required directories..."
    mkdir -p reports screenshots logs
    print_status "Directories created ✓"
}

# Setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    if [ ! -f .env ]; then
        print_status "Creating default .env file..."
        cat > .env << EOF
# Application URLs
BASE_URL=http://localhost:3000
LOGIN_URL=http://localhost:3000/login
TEST_ENV=development

# Browser Configuration
HEADLESS=true
BROWSER_TIMEOUT=30000
IMPLICIT_WAIT=10000

# Test Data
TEST_USERNAME=testuser@example.com
TEST_PASSWORD=testpassword123

# Elasticsearch/Grafana Configuration
ELASTICSEARCH_HOST=http://localhost:9200
ELASTICSEARCH_INDEX=regression-test-logs

# Kubernetes Configuration
KUBERNETES_NAMESPACE=regression-testing
SERVICE_NAME=regression-test-service

# Prometheus/Metrics Configuration
METRICS_PORT=9090
METRICS_ENDPOINT=/metrics

# Report Configuration
REPORT_PATH=./reports
SCREENSHOT_PATH=./screenshots

# CI/CD Configuration
CI=false
BUILD_NUMBER=1
GIT_BRANCH=main
GIT_COMMIT=
EOF
        print_status "Default .env file created ✓"
    else
        print_warning ".env file already exists, skipping creation"
    fi
}

# Run sample test
run_sample_test() {
    print_status "Running sample test to verify installation..."
    
    # Create a simple mock server for testing
    cat > test-server.js << 'EOF'
const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>Test App</title></head>
            <body>
                <h1>Welcome to Test Application</h1>
                <a href="/login">Login</a>
            </body>
        </html>
    `);
});

app.get('/login', (req, res) => {
    res.send(`
        <html>
            <head><title>Login</title></head>
            <body>
                <h1>Login Page</h1>
                <form id="login-form">
                    <input id="username" type="text" placeholder="Username" />
                    <input id="password" type="password" placeholder="Password" />
                    <button id="login-button" type="button" onclick="login()">Login</button>
                </form>
                <div id="error-message" class="error-message" style="display:none; color: red;">Invalid credentials</div>
                <script>
                    function login() {
                        const username = document.getElementById('username').value;
                        const password = document.getElementById('password').value;
                        
                        if (username === 'testuser@example.com' && password === 'testpassword123') {
                            window.location.href = '/dashboard';
                        } else {
                            document.getElementById('error-message').style.display = 'block';
                        }
                    }
                </script>
            </body>
        </html>
    `);
});

app.get('/dashboard', (req, res) => {
    res.send(`
        <html>
            <head><title>Dashboard</title></head>
            <body>
                <div class="welcome-message">Welcome to the dashboard!</div>
                <button id="logout-button" onclick="logout()">Logout</button>
                <script>
                    function logout() {
                        window.location.href = '/login';
                    }
                </script>
            </body>
        </html>
    `);
});

const server = app.listen(port, () => {
    console.log(\`Test server running at http://localhost:\${port}\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Test server stopped');
    });
});

process.on('SIGINT', () => {
    server.close(() => {
        console.log('Test server stopped');
    });
});
EOF

    # Start the test server in background
    node test-server.js &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 3
    
    # Run a quick test
    if npm test -- --tags @smoke; then
        print_status "Sample test passed ✓"
    else
        print_warning "Sample test failed, but installation is complete"
    fi
    
    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    rm -f test-server.js
}

# Display next steps
show_next_steps() {
    echo ""
    echo "🎉 Installation completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update the .env file with your application URLs and credentials"
    echo "2. Run tests:"
    echo "   - Headless mode: npm run test:headless"
    echo "   - Chrome UI mode: npm run test:chrome"
    echo "   - All tests: npm test"
    echo ""
    echo "3. Build Docker image: npm run build:docker"
    echo "4. Deploy to Kubernetes: kubectl apply -f k8s/"
    echo ""
    echo "For more information, see README.md"
    echo ""
}

# Main installation flow
main() {
    echo "Regression Testing Framework Installation"
    echo "========================================"
    echo ""
    
    check_prerequisites
    install_dependencies
    create_directories
    setup_environment
    
    # Ask user if they want to run sample test
    echo ""
    read -p "Would you like to run a sample test to verify the installation? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_sample_test
    fi
    
    show_next_steps
}

# Run main function
main "$@"
