# 🚀 **Quick Kubernetes Setup & Validation Guide**

## **🎯 Current Status**
- ✅ **kubectl installed** (v1.33.0)
- ❌ **Docker Desktop issues** (500 Internal Server Error)
- ❌ **Kubernetes cluster not running**

---

## **🔧 Step 1: Fix Docker Desktop**

### **Restart Docker Desktop:**
1. **Close Docker Desktop completely**
2. **Open Task Manager** → End any Docker processes
3. **Restart Docker Desktop as Administrator**
4. **Wait for "Docker Desktop is running" message**

### **Alternative: Restart Docker Service**
```powershell
# Run as Administrator
Restart-Service docker
```

---

## **🚢 Step 2: Enable Kubernetes in Docker Desktop**

### **Enable Kubernetes:**
1. **Open Docker Desktop**
2. **Settings** (gear icon)
3. **Kubernetes** tab
4. ✅ **Check "Enable Kubernetes"**
5. **Apply & Restart**
6. **Wait for green "Kubernetes is running" status**

### **Expected Result:**
- Green status: "Kubernetes is running"
- kubectl context should be `docker-desktop`

---

## **🧪 Step 3: Validate Kubernetes Setup**

### **Manual Validation Commands:**

```powershell
# 1. Check kubectl version
kubectl version --client

# 2. Check cluster info
kubectl cluster-info

# 3. Check nodes
kubectl get nodes

# 4. Check contexts
kubectl config get-contexts

# 5. Set Docker Desktop context (if needed)
kubectl config use-context docker-desktop
```

### **Automated Validation:**
```powershell
# Run our comprehensive validator
npm run k8s:validate
```

---

## **🐳 Alternative: Use Minikube**

If Docker Desktop continues having issues:

### **Install Minikube:**
```powershell
choco install minikube
```

### **Start Minikube:**
```powershell
# Start with Docker driver
minikube start --driver=docker

# Or with VirtualBox/Hyper-V
minikube start --driver=virtualbox
```

### **Validate Minikube:**
```powershell
minikube status
kubectl get nodes
```

---

## **🎯 Step 4: Deploy Regression Framework**

Once Kubernetes is running:

### **Deploy All Components:**
```powershell
# Deploy everything
npm run k8s:deploy-all

# Check deployment status
npm run k8s:status

# Access Grafana dashboard
npm run k8s:grafana
```

### **Manual Deployment:**
```powershell
# Deploy monitoring stack
kubectl apply -f k8s/monitoring-stack.yaml

# Deploy regression tests
kubectl apply -f k8s/regression-test-deployment.yaml

# Check pods
kubectl get pods

# Check services
kubectl get services
```

---

## **🔍 Troubleshooting**

### **Common Issues:**

#### **1. Docker Desktop Not Starting:**
```powershell
# Reset Docker Desktop
# Settings → Troubleshoot → Reset to factory defaults
```

#### **2. Kubernetes Not Enabling:**
- Ensure **enough system resources** (4GB+ RAM)
- **Disable antivirus** temporarily
- **Run Docker Desktop as Administrator**

#### **3. kubectl Context Issues:**
```powershell
# List contexts
kubectl config get-contexts

# Switch to docker-desktop
kubectl config use-context docker-desktop

# Check current context
kubectl config current-context
```

#### **4. Port Conflicts:**
```powershell
# Check if ports are in use
netstat -an | findstr ":6443"
netstat -an | findstr ":8080"
```

---

## **📊 Expected Output After Success**

### **kubectl cluster-info should show:**
```
Kubernetes control plane is running at https://kubernetes.docker.internal:6443
CoreDNS is running at https://kubernetes.docker.internal:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

### **kubectl get nodes should show:**
```
NAME             STATUS   ROLES           AGE   VERSION
docker-desktop   Ready    control-plane   1m    v1.30.2
```

---

## **🎉 Next Steps After Validation**

1. **Deploy regression framework**: `npm run k8s:deploy-all`
2. **Run tests**: `npm run docker:test`
3. **Check logs**: Access Grafana dashboard
4. **Monitor**: Use `kubectl get pods -w`

---

## **🆘 If All Else Fails**

### **Use Docker Only (No Kubernetes):**
```powershell
# Build and run without K8s
npm run docker:build
npm run docker:test

# Or run locally
npm run server
npm test
```

This will still give you the regression testing framework, just without Kubernetes orchestration.
