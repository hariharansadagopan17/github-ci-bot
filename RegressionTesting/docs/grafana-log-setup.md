# Grafana Log Visualization Setup Guide

## 🔍 **Complete Guide to View Regression Test Logs in Grafana**

### **📋 Prerequisites**
- Kubernetes cluster running
- Elasticsearch deployed
- Grafana deployed
- Regression tests generating logs

---

## **🚀 Step 1: Deploy the Complete Monitoring Stack**

### **1.1 Deploy Monitoring Infrastructure**
```powershell
# Deploy the monitoring stack (Elasticsearch, Prometheus, Grafana)
kubectl apply -f k8s/monitoring-stack.yaml

# Check deployment status
kubectl get pods -n monitoring

# Wait for all pods to be ready (this may take 5-10 minutes)
kubectl wait --for=condition=ready pod -l app=elasticsearch -n monitoring --timeout=600s
kubectl wait --for=condition=ready pod -l app=prometheus -n monitoring --timeout=300s
kubectl wait --for=condition=ready pod -l app=grafana -n monitoring --timeout=300s
```

### **1.2 Verify Services are Running**
```powershell
kubectl get svc -n monitoring
```

Expected output:
```
NAME            TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)          AGE
elasticsearch   ClusterIP      10.x.x.x       <none>        9200/TCP,9300/TCP   5m
prometheus      ClusterIP      10.x.x.x       <none>        9090/TCP             5m
grafana         LoadBalancer   10.x.x.x       <pending>     3000:xxxxx/TCP       5m
```

---

## **🌐 Step 2: Access Grafana**

### **2.1 Port Forward to Access Grafana**
```powershell
# Forward Grafana port to your local machine
kubectl port-forward svc/grafana 3000:3000 -n monitoring
```

### **2.2 Access Grafana Web Interface**
- **URL**: http://localhost:3000
- **Username**: `admin`
- **Password**: `admin123`

### **2.3 Alternative Access Methods**

**Option A: NodePort (if available)**
```powershell
# Get NodePort
kubectl get svc grafana -n monitoring -o jsonpath='{.spec.ports[0].nodePort}'

# Access via: http://<node-ip>:<nodeport>
```

**Option B: LoadBalancer (if available)**
```powershell
# Get LoadBalancer IP
kubectl get svc grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

---

## **📊 Step 3: Configure Elasticsearch Data Source in Grafana**

### **3.1 Add Elasticsearch Data Source**
1. **Login** to Grafana (admin/admin123)
2. Go to **Configuration** → **Data Sources**
3. Click **"Add data source"**
4. Select **"Elasticsearch"**

### **3.2 Configure Elasticsearch Settings**
```
Name: Regression-Test-Logs
URL: http://elasticsearch:9200
Index name: regression-test-logs-*
Pattern: Daily
Time field name: @timestamp
Version: 7.10+
```

### **3.3 Advanced Settings**
```
Min time interval: 10s
Log message field name: message
Log level field name: level
```

### **3.4 Test and Save**
- Click **"Save & Test"**
- Should show: ✅ **"Index OK. Time field name OK."**

---

## **🏃‍♂️ Step 4: Run Tests to Generate Logs**

### **4.1 Deploy Regression Tests**
```powershell
kubectl apply -f k8s/regression-test-deployment.yaml
```

### **4.2 Run Test Job**
```powershell
# Create a test job
kubectl create job regression-test-logs --from=cronjob/regression-test-cronjob -n regression-testing

# Monitor job progress
kubectl get jobs -n regression-testing
kubectl logs job/regression-test-logs -n regression-testing -f
```

### **4.3 Verify Logs in Elasticsearch**
```powershell
# Port forward to Elasticsearch
kubectl port-forward svc/elasticsearch 9200:9200 -n monitoring

# Check if logs are being indexed (in another terminal)
curl http://localhost:9200/regression-test-logs-*/_search?pretty
```

---

## **📈 Step 5: Create Log Dashboards in Grafana**

### **5.1 Import Pre-configured Dashboard**

Go to **Dashboards** → **Import** and use this JSON configuration:

```json
{
  "dashboard": {
    "id": null,
    "title": "Regression Test Logs Dashboard",
    "tags": ["regression", "testing", "logs"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Log Volume Over Time",
        "type": "graph",
        "targets": [
          {
            "datasource": "Regression-Test-Logs",
            "query": "*",
            "alias": "Log Count",
            "timeField": "@timestamp",
            "metrics": [
              {
                "type": "count",
                "id": "1"
              }
            ],
            "bucketAggs": [
              {
                "type": "date_histogram",
                "field": "@timestamp",
                "id": "2",
                "settings": {
                  "interval": "1m"
                }
              }
            ]
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Log Levels Distribution",
        "type": "piechart",
        "targets": [
          {
            "datasource": "Regression-Test-Logs",
            "query": "*",
            "bucketAggs": [
              {
                "type": "terms",
                "field": "level.keyword",
                "id": "2",
                "settings": {
                  "size": "10",
                  "order": "desc",
                  "orderBy": "_count"
                }
              }
            ]
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Test Scenario Logs",
        "type": "logs",
        "targets": [
          {
            "datasource": "Regression-Test-Logs",
            "query": "scenario:*",
            "timeField": "@timestamp"
          }
        ],
        "options": {
          "showTime": true,
          "showLabels": false,
          "showCommonLabels": false,
          "wrapLogMessage": false,
          "prettifyLogMessage": false,
          "enableLogDetails": true,
          "sortOrder": "Descending"
        },
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Error Logs",
        "type": "logs",
        "targets": [
          {
            "datasource": "Regression-Test-Logs",
            "query": "level:error OR level:ERROR",
            "timeField": "@timestamp"
          }
        ],
        "options": {
          "showTime": true,
          "showLabels": true,
          "enableLogDetails": true,
          "sortOrder": "Descending"
        },
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 16}
      },
      {
        "id": 5,
        "title": "Browser Actions",
        "type": "table",
        "targets": [
          {
            "datasource": "Regression-Test-Logs",
            "query": "event:browser_action",
            "timeField": "@timestamp",
            "bucketAggs": [
              {
                "type": "terms",
                "field": "action.keyword",
                "id": "2"
              }
            ]
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 24}
      },
      {
        "id": 6,
        "title": "Test Results",
        "type": "stat",
        "targets": [
          {
            "datasource": "Regression-Test-Logs",
            "query": "event:scenario_end",
            "bucketAggs": [
              {
                "type": "terms",
                "field": "status.keyword",
                "id": "2"
              }
            ]
          }
        ],
        "fieldConfig": {
          "defaults": {
            "mappings": [
              {
                "type": "value",
                "value": "PASSED",
                "text": "✅ Passed"
              },
              {
                "type": "value", 
                "value": "FAILED",
                "text": "❌ Failed"
              }
            ]
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 24}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### **5.2 Create Custom Queries**

**Common Log Queries:**

1. **All Test Logs**:
   ```
   testLog:true
   ```

2. **Error Logs Only**:
   ```
   level:error
   ```

3. **Specific Test Scenario**:
   ```
   scenario:"Successful login with valid credentials"
   ```

4. **Browser Actions**:
   ```
   event:browser_action
   ```

5. **Test Results**:
   ```
   event:scenario_end
   ```

6. **Screenshots Taken**:
   ```
   screenshot:*
   ```

---

## **🔍 Step 6: Advanced Log Analysis**

### **6.1 Log Filtering**

**Filter by Time Range:**
- Use Grafana's time picker (top right)
- Common ranges: Last 15 minutes, Last 1 hour, Last 24 hours

**Filter by Log Level:**
```
level:info
level:warn  
level:error
level:debug
```

**Filter by Environment:**
```
environment:development
environment:staging
environment:production
```

**Filter by Build:**
```
buildNumber:123
gitBranch:main
gitCommit:abc123
```

### **6.2 Advanced Search Patterns**

**Multiple Conditions (AND):**
```
level:error AND scenario:"login"
```

**Multiple Conditions (OR):**
```
level:error OR level:warn
```

**Wildcard Search:**
```
message:*timeout*
scenario:*login*
```

**Range Queries:**
```
duration:>5000  (duration greater than 5 seconds)
buildNumber:[100 TO 200]  (build numbers 100-200)
```

---

## **📊 Step 7: Pre-built Dashboard Panels**

### **7.1 Essential Panels for Regression Testing**

1. **📈 Test Execution Timeline**
   - Shows when tests started/completed
   - Query: `event:scenario_start OR event:scenario_end`

2. **🔢 Success/Failure Rates**
   - Pie chart of pass/fail ratios
   - Query: `event:scenario_end`

3. **⚠️ Error Distribution**
   - Types of errors encountered
   - Query: `level:error`

4. **🖱️ Browser Action Heatmap**
   - Frequency of clicks, types, navigations
   - Query: `event:browser_action`

5. **📸 Screenshot Events**
   - When screenshots were captured
   - Query: `screenshot:*`

6. **⏱️ Performance Metrics**
   - Test duration, page load times
   - Query: `duration:* OR pageLoad:*`

---

## **🚀 Step 8: Real-time Log Monitoring**

### **8.1 Set Up Live Dashboard**

1. **Configure Auto-refresh**:
   - Set refresh interval to 30s or 1m
   - Use relative time ranges (e.g., "Last 15 minutes")

2. **Create Alerts**:
   - Go to **Alerting** → **Alert Rules**
   - Create alerts for:
     - High error rates
     - Test failures
     - Long execution times

### **8.2 Alert Configuration Example**

```yaml
Alert Name: High Test Failure Rate
Query: count by ()(rate(regression_test_total{status="failure"}[5m]))
Condition: IS ABOVE 0.5
Evaluation: every 1m for 2m
Notification: Send to #testing-alerts Slack channel
```

---

## **🔧 Step 9: Troubleshooting Common Issues**

### **9.1 No Logs Appearing**

**Check Elasticsearch Connection:**
```powershell
kubectl port-forward svc/elasticsearch 9200:9200 -n monitoring
curl http://localhost:9200/_cluster/health
```

**Verify Log Index:**
```powershell
curl http://localhost:9200/_cat/indices?v | findstr regression
```

**Check Test Pod Logs:**
```powershell
kubectl logs -l app=regression-test -n regression-testing
```

### **9.2 Grafana Data Source Issues**

1. **Test Data Source Connection**
   - Go to Data Sources → Regression-Test-Logs
   - Click "Save & Test"

2. **Check Index Pattern**
   - Ensure pattern matches: `regression-test-logs-*`
   - Verify time field: `@timestamp`

### **9.3 Missing Log Fields**

**Check Log Structure:**
```powershell
curl -X GET "localhost:9200/regression-test-logs-*/_search?pretty&size=1" -H 'Content-Type: application/json'
```

---

## **📱 Step 10: Mobile and External Access**

### **10.1 Expose Grafana Externally**

**Using Ingress (recommended):**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana-ingress
  namespace: monitoring
spec:
  rules:
  - host: grafana.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 3000
```

**Using NodePort:**
```yaml
# Update the grafana service in monitoring-stack.yaml
spec:
  type: NodePort
  ports:
  - port: 3000
    nodePort: 30000
```

---

## **🎯 Quick Start Commands Summary**

```powershell
# 1. Deploy monitoring stack
kubectl apply -f k8s/monitoring-stack.yaml

# 2. Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=grafana -n monitoring --timeout=300s

# 3. Access Grafana
kubectl port-forward svc/grafana 3000:3000 -n monitoring

# 4. Run tests to generate logs
kubectl create job test-logs --from=cronjob/regression-test-cronjob -n regression-testing

# 5. Open browser
start http://localhost:3000
# Login: admin/admin123

# 6. Add Elasticsearch data source:
# URL: http://elasticsearch:9200
# Index: regression-test-logs-*
# Time field: @timestamp
```

Now you'll have complete visibility into your regression test logs in Grafana! 🎉
