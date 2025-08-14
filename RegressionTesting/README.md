# Regression Testing Framework

This directory contains a comprehensive regression testing framework built with Node.js, Cucumber.js, Selenium WebDriver, and integrated with Kubernetes, Grafana, and GitHub Actions.

## Features

- **Automated Login Testing**: Complete test scenarios for user authentication
- **Cross-Browser Support**: Chrome and Firefox support with headless/GUI modes
- **Containerized Execution**: Docker containers for consistent test execution
- **Kubernetes Integration**: Deploy and run tests in Kubernetes clusters
- **Monitoring & Observability**: 
  - Prometheus metrics collection
  - Elasticsearch log aggregation
  - Grafana dashboards for visualization
- **CI/CD Pipeline**: GitHub Actions workflow for automated testing
- **Page Object Model**: Maintainable test structure
- **Comprehensive Reporting**: HTML, JSON, and screenshot reports

## Project Structure

```
RegressionTesting/
├── features/                     # Cucumber feature files
│   ├── login.feature            # Login test scenarios
│   ├── step_definitions/        # Step implementations
│   │   └── loginSteps.js
│   └── support/                 # Test configuration
│       └── hooks.js
├── page-objects/                # Page Object Model
│   ├── BasePage.js             # Base page with common methods
│   └── LoginPage.js            # Login page specific methods
├── utils/                       # Utility modules
│   ├── driverManager.js        # WebDriver management
│   ├── logger.js               # Logging with Elasticsearch
│   ├── metricsCollector.js     # Prometheus metrics
│   └── screenshotHelper.js     # Screenshot utilities
├── k8s/                        # Kubernetes manifests
│   ├── monitoring-stack.yaml   # Grafana, Prometheus, Elasticsearch
│   └── regression-test-deployment.yaml  # Test deployment
├── reports/                    # Test reports (generated)
├── screenshots/                # Test screenshots (generated)
├── logs/                      # Log files (generated)
├── Dockerfile                 # Container image definition
├── package.json              # Node.js dependencies
└── .env                      # Environment configuration
```

## Quick Start

### Prerequisites

- Node.js 18 or higher
- Chrome browser (for local testing)
- Docker (for containerized testing)
- Kubernetes cluster (for production deployment)

### Local Development

1. **Install dependencies:**
   ```bash
   cd RegressionTesting
   npm install
   ```

2. **Run tests locally (headless):**
   ```bash
   npm run test:headless
   ```

3. **Run tests with Chrome UI:**
   ```bash
   npm run test:chrome
   ```

### Environment Configuration

Create or modify the `.env` file:

```bash
# Application URLs
BASE_URL=http://localhost:3000
LOGIN_URL=http://localhost:3000/login
TEST_ENV=development

# Browser Configuration
HEADLESS=false
BROWSER_TIMEOUT=30000

# Test Credentials
TEST_USERNAME=testuser@example.com
TEST_PASSWORD=testpassword123

# Monitoring
ELASTICSEARCH_HOST=http://localhost:9200
METRICS_PORT=9090
```

## Docker Execution

### Build the Docker image:
```bash
docker build -t regression-test-framework .
```

### Run tests in container:
```bash
docker run --rm -v $(pwd)/reports:/app/reports \
  -v $(pwd)/screenshots:/app/screenshots \
  regression-test-framework
```

## Kubernetes Deployment

### Deploy monitoring stack:
```bash
kubectl apply -f k8s/monitoring-stack.yaml
```

### Deploy regression tests:
```bash
kubectl apply -f k8s/regression-test-deployment.yaml
```

### Run tests as a job:
```bash
kubectl create job regression-test-manual \
  --from=cronjob/regression-test-cronjob \
  -n regression-testing
```

## Monitoring & Observability

### Grafana Dashboard
- URL: `http://<grafana-service>/`
- Username: `admin`
- Password: `admin123`
- Dashboard: "Regression Test Dashboard"

### Prometheus Metrics
- URL: `http://<prometheus-service>:9090`
- Metrics endpoint: `/metrics`

### Elasticsearch Logs
- URL: `http://<elasticsearch-service>:9200`
- Index pattern: `regression-test-logs-*`

## Available Test Scenarios

### Login Feature (`features/login.feature`)

1. **Successful login with valid credentials**
   - Tags: `@smoke @login`
   - Verifies successful authentication flow

2. **Failed login with invalid credentials**
   - Tags: `@smoke @login`
   - Tests error handling for wrong credentials

3. **Failed login with empty credentials**
   - Tags: `@login`
   - Validates form validation

4. **Logout functionality**
   - Tags: `@login`
   - Tests session termination

5. **Remember me functionality**
   - Tags: `@login`
   - Tests persistent login sessions

## npm Scripts

```json
{
  "test": "cucumber-js",
  "test:headless": "cross-env HEADLESS=true cucumber-js",
  "test:chrome": "cross-env HEADLESS=false cucumber-js",
  "test:docker": "docker run --rm -v $(pwd):/app regression-test-framework",
  "build:docker": "docker build -t regression-test-framework ."
}
```

## GitHub Actions Integration

The framework includes a comprehensive CI/CD pipeline that:

1. **Builds and tests** the application on every push
2. **Creates Docker images** and pushes to registry
3. **Deploys to Kubernetes** on main branch merges
4. **Runs regression tests** in the cluster
5. **Sends notifications** about test results

### Required Secrets

Add these secrets to your GitHub repository:

- `CONTAINER_REGISTRY`: Container registry URL
- `REGISTRY_USERNAME`: Registry username
- `REGISTRY_PASSWORD`: Registry password
- `AWS_ACCESS_KEY_ID`: AWS access key (for EKS)
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region
- `EKS_CLUSTER_NAME`: Kubernetes cluster name
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications

## Metrics and KPIs

The framework collects comprehensive metrics:

### Test Execution Metrics
- Total tests executed
- Success/failure rates
- Test duration (percentiles)
- Error classifications

### Browser Automation Metrics
- Page load times
- Browser action counts
- Screenshot captures

### Infrastructure Metrics
- Container resource usage
- Kubernetes pod status
- Job completion rates

## Troubleshooting

### Common Issues

1. **Chrome not found error**
   ```bash
   # Install Chrome on Ubuntu/Debian
   wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
   echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list
   apt-get update && apt-get install -y google-chrome-stable
   ```

2. **Display issues in Docker**
   ```bash
   # Use the provided run-tests.sh script which sets up Xvfb
   ./run-tests.sh npm test
   ```

3. **Kubernetes pod fails**
   ```bash
   # Check pod logs
   kubectl logs -l app=regression-test -n regression-testing
   
   # Check events
   kubectl get events -n regression-testing
   ```

### Debug Mode

Enable debug logging:
```bash
DEBUG=true npm test
```

View detailed logs:
```bash
tail -f logs/regression-tests.log
```

## Contributing

1. Follow the Page Object Model pattern
2. Add appropriate test tags (`@smoke`, `@regression`, etc.)
3. Include proper error handling and logging
4. Update documentation for new features
5. Ensure tests pass in both headless and GUI modes

## License

MIT License - see LICENSE file for details.
