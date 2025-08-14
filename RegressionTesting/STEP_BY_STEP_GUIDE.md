# 🚀 **Step-by-Step Guide: Regression Testing Framework**

## **📋 Complete Guide to Run Automated Regression Tests**

This guide will walk you through running the regression testing framework from local development to production deployment with full monitoring.

---

## **🛠️ Prerequisites**

### **System Requirements:**
- **Node.js**: Version 16.0.0 or higher
- **npm**: Latest version
- **Docker**: For containerized testing
- **Kubernetes**: For deployment (optional)
- **Git**: For version control
- **Chrome Browser**: For non-headless testing

### **Verify Prerequisites:**
```powershell
# Check Node.js version
node --version
# Should show: v16.0.0 or higher

# Check npm version
npm --version

# Check Docker (if using containerized tests)
docker --version

# Check Kubernetes (if deploying)
kubectl version --client
```

---

## **⚙️ Step 1: Initial Setup**

### **1.1 Clone/Navigate to Project**
```powershell
# Navigate to the regression testing directory
cd "d:\AI_bot\Release_Deployment_Bot\github-ci-bot_Changes\RegressionTesting"

# Verify you're in the right directory
ls
# Should see: package.json, features/, page-objects/, utils/, etc.
```

### **1.2 Install Dependencies**
```powershell
# Install all required packages
npm run install:dependencies

# Alternative: Standard npm install
npm install
```

### **1.3 Create Required Directories**
```powershell
# Create necessary folders for reports, screenshots, and logs
npm run setup
```

Expected output:
```
Directories created successfully
```

### **1.4 Environment Configuration**
Create a `.env` file if it doesn't exist:
```powershell
# Create .env file with default configuration
echo "HEADLESS=true
BASE_URL=https://example.com
TIMEOUT=30000
LOG_LEVEL=info
ELASTICSEARCH_URL=http://localhost:9200" > .env
```

---

## **🧪 Step 2: Running Tests Locally**

### **2.1 Quick Test Validation**
```powershell
# Run a quick lint check to ensure code quality
npm run lint

# If there are fixable issues:
npm run lint:fix
```

### **2.2 Run All Tests (Default)**
```powershell
# Run all regression tests in headless mode
npm test
```

Expected output:
```
> regression-testing-framework@1.0.0 test
> cucumber-js

Using ChromeDriver 119.0.1
Feature: Login Application Testing

  @smoke @login
  Scenario: Successful login with valid credentials
    ✓ Given I am on the login page
    ✓ When I enter valid credentials
    ✓ And I click the login button
    ✓ Then I should be redirected to the dashboard

  @login
  Scenario: Failed login with invalid credentials
    ✓ Given I am on the login page
    ✓ When I enter invalid credentials
    ✓ And I click the login button
    ✓ Then I should see an error message

5 scenarios (5 passed)
15 steps (15 passed)
0m12.345s
```

### **2.3 Run Tests with Different Modes**

**Headless Mode (Default - Faster):**
```powershell
npm run test:headless
```

**Chrome Browser Mode (Visual - Slower):**
```powershell
npm run test:chrome
```

**Smoke Tests Only:**
```powershell
npm run test:smoke
```

**Login Tests Only:**
```powershell
npm run test:login
```

### **2.4 Advanced Test Runner**
```powershell
# Use the advanced test runner for more options
npm run test:runner
```

This provides interactive options for:
- Environment selection
- Browser mode
- Tag-based filtering
- Report generation
- Parallel execution

---

## **📊 Step 3: Understanding Test Results**

### **3.1 Generated Reports Location**
After running tests, check these directories:

```
RegressionTesting/
├── reports/
│   ├── cucumber-report.json     # JSON format
│   ├── cucumber-report.html     # HTML format
│   └── test-results.xml         # JUnit format
├── screenshots/
│   ├── failed-test-1.png        # Screenshots of failures
│   └── step-screenshot-2.png    # Step-by-step captures
└── logs/
    ├── test.log                 # Detailed test execution logs
    ├── error.log                # Error-specific logs
    └── combined.log             # All logs combined
```

### **3.2 View HTML Report**
```powershell
# Open the HTML report in default browser
start reports/cucumber-report.html
```

### **3.3 Check Test Logs**
```powershell
# View the latest test logs
Get-Content logs/test.log -Tail 50

# View error logs only
Get-Content logs/error.log
```

---

## **🐳 Step 4: Running Tests in Docker**

### **4.1 Build Docker Image**
```powershell
# Build the regression test Docker image
npm run build:docker
```

Expected output:
```
Successfully built 12345abcde
Successfully tagged regression-test-framework:latest
```

### **4.2 Run Tests in Container**
```powershell
# Run tests inside Docker container
npm run test:docker
```

### **4.3 Custom Docker Commands**
```powershell
# Run specific test tags in Docker
docker run --rm -v ${PWD}:/app regression-test-framework npm run test:smoke

# Run with custom environment variables
docker run --rm -v ${PWD}:/app -e HEADLESS=false regression-test-framework npm test

# Interactive mode for debugging
docker run -it --rm -v ${PWD}:/app regression-test-framework /bin/bash
```

---

## **☁️ Step 5: Kubernetes Deployment**

### **5.1 Deploy Monitoring Stack**
```powershell
# Deploy Elasticsearch, Prometheus, and Grafana
kubectl apply -f k8s/monitoring-stack.yaml

# Check deployment status
kubectl get pods -n monitoring
```

Wait for all pods to be ready:
```powershell
kubectl wait --for=condition=ready pod -l app=elasticsearch -n monitoring --timeout=600s
kubectl wait --for=condition=ready pod -l app=prometheus -n monitoring --timeout=300s
kubectl wait --for=condition=ready pod -l app=grafana -n monitoring --timeout=300s
```

### **5.2 Deploy Regression Tests**
```powershell
# Deploy the regression test jobs
kubectl apply -f k8s/regression-test-deployment.yaml

# Verify deployment
kubectl get all -n regression-testing
```

### **5.3 Run Manual Test Job**
```powershell
# Create a one-time test job
kubectl create job manual-regression-test --from=cronjob/regression-test-cronjob -n regression-testing

# Monitor job execution
kubectl get jobs -n regression-testing
kubectl logs job/manual-regression-test -n regression-testing -f
```

### **5.4 Check Scheduled Tests**
```powershell
# View cron job schedule (runs every hour by default)
kubectl get cronjobs -n regression-testing

# View recent job history
kubectl get jobs -n regression-testing --sort-by=.metadata.creationTimestamp
```

---

## **📈 Step 6: Monitoring and Grafana Setup**

### **6.1 Access Grafana**
```powershell
# Port forward to access Grafana locally
kubectl port-forward svc/grafana 3000:3000 -n monitoring
```

Open browser: http://localhost:3000
- **Username**: admin
- **Password**: admin123

### **6.2 Configure Data Sources**

1. **Go to**: Configuration → Data Sources
2. **Add Elasticsearch**:
   - Name: `Regression-Test-Logs`
   - URL: `http://elasticsearch:9200`
   - Index: `regression-test-logs-*`
   - Time field: `@timestamp`

3. **Add Prometheus**:
   - Name: `Prometheus`
   - URL: `http://prometheus:9090`

### **6.3 Import Pre-built Dashboard**
1. Go to **Dashboards** → **Import**
2. Copy the dashboard JSON from `docs/grafana-log-setup.md`
3. Paste and click **Load**
4. Select your data sources and click **Import**

---

## **🔄 Step 7: CI/CD Pipeline (GitHub Actions)**

### **7.1 Pipeline Triggers**
The pipeline automatically triggers on:
- **Push** to main branch
- **Pull Request** creation/updates
- **Schedule**: Daily at 2 AM UTC
- **Manual**: Workflow dispatch

### **7.2 Monitor Pipeline**
```powershell
# Check workflow status (if using GitHub CLI)
gh workflow list
gh run list --workflow="Regression Testing Pipeline"

# View specific run details
gh run view [run-id]
```

### **7.3 Pipeline Stages**
1. **Build**: Install dependencies, lint code
2. **Test**: Run regression tests in headless mode
3. **Docker**: Build and push container image
4. **Deploy**: Deploy to Kubernetes
5. **Notify**: Send results to configured channels

---

## **🧹 Step 8: Maintenance and Cleanup**

### **8.1 Clean Up Local Files**
```powershell
# Clean up generated reports and logs
Remove-Item -Recurse -Force reports/* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force screenshots/* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force logs/* -ErrorAction SilentlyContinue

# Recreate directories
npm run setup
```

### **8.2 Clean Up Docker**
```powershell
# Remove unused Docker images
docker system prune -f

# Remove specific test image
docker rmi regression-test-framework
```

### **8.3 Clean Up Kubernetes**
```powershell
# Delete test jobs (keep CronJob)
kubectl delete jobs --all -n regression-testing

# Delete entire regression testing namespace (if needed)
kubectl delete namespace regression-testing

# Delete monitoring stack (if needed)
kubectl delete namespace monitoring
```

---

## **🚨 Step 9: Troubleshooting Common Issues**

### **9.1 Tests Failing to Start**

**Issue**: ChromeDriver not found
```powershell
# Solution: Ensure ChromeDriver is installed
npx webdriver-manager update
```

**Issue**: Port already in use
```powershell
# Solution: Kill processes using the port
netstat -ano | findstr :4444
taskkill /PID [PID_NUMBER] /F
```

### **9.2 Tests Running but Failing**

**Check Browser Version:**
```powershell
# Update ChromeDriver to match Chrome version
npm install chromedriver@latest
```

**Check Application URL:**
```powershell
# Verify BASE_URL in .env file is accessible
curl -I $env:BASE_URL
```

**Review Logs:**
```powershell
Get-Content logs/error.log -Tail 20
```

### **9.3 Docker Issues**

**Build Failures:**
```powershell
# Build with verbose output
docker build --no-cache -t regression-test-framework .
```

**Container Crashes:**
```powershell
# Run container interactively for debugging
docker run -it --rm regression-test-framework /bin/bash
```

### **9.4 Kubernetes Issues**

**Pod Not Starting:**
```powershell
# Check pod status and events
kubectl describe pod [pod-name] -n regression-testing
kubectl get events -n regression-testing --sort-by=.metadata.creationTimestamp
```

**No Logs in Grafana:**
```powershell
# Check Elasticsearch health
kubectl port-forward svc/elasticsearch 9200:9200 -n monitoring
curl http://localhost:9200/_cluster/health
```

---

## **📚 Step 10: Advanced Usage**

### **10.1 Custom Test Configuration**

**Environment-Specific Tests:**
```powershell
# Create environment-specific .env files
cp .env .env.dev
cp .env .env.staging
cp .env .env.prod

# Run tests against specific environment
cross-env NODE_ENV=staging npm test
```

**Custom Tag Combinations:**
```powershell
# Run multiple tags
npx cucumber-js --tags "@smoke or @critical"

# Exclude specific tags
npx cucumber-js --tags "not @slow"
```

### **10.2 Parallel Test Execution**
```powershell
# Run tests in parallel (modify package.json script)
npx cucumber-js --parallel 3
```

### **10.3 Custom Reporting**
```powershell
# Generate custom reports
npx cucumber-js --format json:reports/custom-report.json --format @cucumber/pretty-formatter
```

---

## **📋 Quick Reference Commands**

| **Task** | **Command** |
|----------|-------------|
| **Setup** | `npm run setup` |
| **Install** | `npm run install:dependencies` |
| **Test All** | `npm test` |
| **Test Headless** | `npm run test:headless` |
| **Test Chrome** | `npm run test:chrome` |
| **Test Smoke** | `npm run test:smoke` |
| **Test Login** | `npm run test:login` |
| **Docker Build** | `npm run build:docker` |
| **Docker Test** | `npm run test:docker` |
| **Advanced Runner** | `npm run test:runner` |
| **Lint Code** | `npm run lint` |
| **Fix Lint** | `npm run lint:fix` |
| **View Report** | `start reports/cucumber-report.html` |
| **K8s Deploy** | `kubectl apply -f k8s/` |
| **Grafana Access** | `kubectl port-forward svc/grafana 3000:3000 -n monitoring` |

---

## **✅ Success Checklist**

### **Local Testing:**
- [ ] Dependencies installed successfully
- [ ] All tests pass in headless mode
- [ ] HTML report generates without errors
- [ ] Screenshots captured on failures
- [ ] Logs written to files

### **Docker Testing:**
- [ ] Docker image builds successfully
- [ ] Tests run in container
- [ ] Volume mounts work for reports

### **Kubernetes Deployment:**
- [ ] Monitoring stack deployed
- [ ] Regression tests deployed
- [ ] CronJob scheduled correctly
- [ ] Logs appearing in Elasticsearch

### **Monitoring:**
- [ ] Grafana accessible
- [ ] Data sources connected
- [ ] Dashboards showing data
- [ ] Alerts configured

---

## **🎯 Next Steps**

1. **Customize** test scenarios in `features/login.feature`
2. **Add** new page objects in `page-objects/`
3. **Extend** step definitions in `features/step_definitions/`
4. **Configure** alerts in Grafana
5. **Integrate** with Slack/Teams notifications
6. **Schedule** tests for different environments

---

**🎉 Congratulations!** You now have a fully functional automated regression testing framework with monitoring and CI/CD integration.

For detailed Grafana setup, see: `docs/grafana-log-setup.md`
For GitHub Actions details, see: `docs/github-actions-pipeline.md`
