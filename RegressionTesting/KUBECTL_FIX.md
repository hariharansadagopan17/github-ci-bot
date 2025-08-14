# 🔧 **Kubernetes Connection Issue Fix**

## **🎯 The Issue:**
Windows kubectl can't connect to the Kubernetes API server running in WSL2 because:
- WSL2 runs in a separate network namespace
- The API server is bound to localhost (127.0.0.1) inside WSL2
- Windows can't directly access WSL2's localhost

---

## **✅ Solution 1: Use WSL2 for All Operations (Recommended)**

### **Always use WSL2 for Kubernetes operations:**
```powershell
# Instead of running kubectl from Windows PowerShell, always use:
wsl -d Ubuntu-EDrive -e kubectl get nodes
wsl -d Ubuntu-EDrive -e kubectl get pods --all-namespaces
wsl -d Ubuntu-EDrive -e kubectl get services --all-namespaces
```

### **Or enter WSL2 directly:**
```powershell
# Enter WSL2
wsl -d Ubuntu-EDrive

# Then run all kubectl commands normally
kubectl get nodes
kubectl get pods --all-namespaces
kubectl logs -n regression-testing -l app=regression-test
```

---

## **✅ Solution 2: Port Forward for Specific Services**

### **Access Grafana from Windows:**
```powershell
# Run this in WSL2 to make Grafana accessible from Windows
wsl -d Ubuntu-EDrive -e kubectl port-forward -n monitoring service/grafana 3000:3000 --address=0.0.0.0
```
Then access: `http://localhost:3000`

### **Access other services:**
```powershell
# Prometheus
wsl -d Ubuntu-EDrive -e kubectl port-forward -n monitoring service/prometheus 9090:9090 --address=0.0.0.0

# Elasticsearch
wsl -d Ubuntu-EDrive -e kubectl port-forward -n monitoring service/elasticsearch 9200:9200 --address=0.0.0.0
```

---

## **✅ Solution 3: Configure k3s for External Access**

### **Make k3s API server accessible from Windows:**
```bash
# In WSL2 Ubuntu-EDrive, edit k3s config
wsl -d Ubuntu-EDrive

# Stop k3s
sudo systemctl stop k3s

# Start k3s with external access
sudo k3s server --bind-address=0.0.0.0 --https-listen-port=6443 --write-kubeconfig-mode=644 &

# Or edit the service file
sudo nano /etc/systemd/system/k3s.service
# Add: --bind-address=0.0.0.0 to ExecStart line
```

---

## **🚀 Quick Commands for Your Setup**

### **Check Deployment Status (from WSL2):**
```bash
# Enter WSL2
wsl -d Ubuntu-EDrive

# Check all pods
kubectl get pods --all-namespaces

# Check your regression testing
kubectl get pods -n regression-testing

# Check monitoring stack
kubectl get pods -n monitoring

# View Grafana service
kubectl get svc -n monitoring grafana
```

### **Access Grafana Dashboard:**
```bash
# Method 1: Direct IP (from WSL2 or within network)
curl http://172.22.163.79:3000

# Method 2: Port forward to Windows
wsl -d Ubuntu-EDrive -e kubectl port-forward -n monitoring service/grafana 3000:3000 --address=0.0.0.0
# Then open: http://localhost:3000
```

---

## **📋 Your Working Commands:**

### **Always use these patterns:**
```powershell
# ✅ WORKS - Run kubectl through WSL2
wsl -d Ubuntu-EDrive -e kubectl get nodes

# ✅ WORKS - Enter WSL2 first
wsl -d Ubuntu-EDrive
# Then: kubectl get nodes

# ❌ DOESN'T WORK - Direct kubectl from Windows PowerShell
kubectl get nodes
```

---

## **🎯 Recommended Workflow:**

1. **For Kubernetes operations:** Always use WSL2
2. **For accessing web services:** Use port-forwarding
3. **For file operations:** Windows/PowerShell is fine

### **Example Session:**
```powershell
# Check files (Windows)
ls k8s/

# Deploy/manage Kubernetes (WSL2)
wsl -d Ubuntu-EDrive -e kubectl apply -f k8s/monitoring-stack.yaml

# Access Grafana (Port forward)
wsl -d Ubuntu-EDrive -e kubectl port-forward -n monitoring service/grafana 3000:3000 --address=0.0.0.0
# Open browser: http://localhost:3000
```

---

## **🔍 Quick Status Check:**

Run this to verify everything is working:
```powershell
# Check WSL2 Kubernetes
wsl -d Ubuntu-EDrive -e bash -c "echo '=== Kubernetes Status ===' && kubectl get nodes && echo '=== Regression Testing ===' && kubectl get pods -n regression-testing && echo '=== Monitoring Stack ===' && kubectl get pods -n monitoring"
```

---

## **💡 Pro Tip:**

Create a batch file `k8s.bat` for easier access:
```batch
@echo off
wsl -d Ubuntu-EDrive -e kubectl %*
```

Then you can use: `k8s.bat get nodes` from Windows!

---

**The deployment is working perfectly in WSL2. Just use WSL2 for all kubectl operations! 🚀**
