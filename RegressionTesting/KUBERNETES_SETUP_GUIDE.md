# 🚢 **Kubernetes Installation Guide for Regression Testing**

## **📋 Kubernetes Installation Options**

For your regression testing framework, you have several Kubernetes options:

### **🎯 Recommended: Docker Desktop with Kubernetes (Easiest)**
### **🔧 Alternative: Minikube (More features)**
### **☁️ Cloud: Azure AKS, AWS EKS, Google GKE (Production)**

---

## **🐳 Option 1: Docker Desktop Kubernetes (Recommended)**

Since you already have Docker installed, this is the simplest option.

### **Enable Kubernetes in Docker Desktop:**

1. **Open Docker Desktop**
2. **Go to Settings** (gear icon)
3. **Click on "Kubernetes" tab**
4. **Check "Enable Kubernetes"**
5. **Click "Apply & Restart"**
6. **Wait for Kubernetes to start** (green indicator)

### **Verify Installation:**
```powershell
# Check if kubectl is available
kubectl version --client

# Check cluster info
kubectl cluster-info

# Check nodes
kubectl get nodes
```

Expected output:
```
NAME             STATUS   ROLES           AGE   VERSION
docker-desktop   Ready    control-plane   1m    v1.28.2
```

---

## **🚀 Option 2: Minikube (More Control)**

If you want more Kubernetes features or multiple clusters.

### **Install Minikube:**

```powershell
# Download Minikube installer
Invoke-WebRequest -OutFile 'minikube-installer.exe' -Uri 'https://github.com/kubernetes/minikube/releases/latest/download/minikube-installer.exe' -UseBasicParsing

# Run installer
.\minikube-installer.exe

# Verify installation
minikube version
```

### **Start Minikube:**
```powershell
# Start with Docker driver
minikube start --driver=docker

# Check status
minikube status

# Get kubectl context
kubectl config current-context
```

### **Minikube Useful Commands:**
```powershell
# Start/Stop
minikube start
minikube stop

# Dashboard
minikube dashboard

# SSH into node
minikube ssh

# Clean up
minikube delete
```

---

## **⚙️ Install kubectl (Kubernetes CLI)**

If kubectl is not installed with Docker Desktop:

### **Using Chocolatey (Recommended):**
```powershell
# Install Chocolatey first (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install kubectl
choco install kubernetes-cli

# Verify
kubectl version --client
```

### **Manual Download:**
```powershell
# Download kubectl
curl -LO "https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe"

# Move to PATH location
move kubectl.exe C:\Windows\System32\

# Or add to PATH
```

---

## **🔧 Install Helm (Package Manager)**

Helm helps manage Kubernetes applications:

```powershell
# Using Chocolatey
choco install kubernetes-helm

# Verify
helm version
```

---

## **🎯 Deploy Your Regression Testing Framework**

Now you can deploy your framework to Kubernetes:

### **1. Build and Push Docker Image:**
```powershell
# Build image
npm run docker:build

# Tag for local registry (if using Minikube)
docker tag regression-test-framework:latest localhost:5000/regression-test-framework:latest
```

### **2. Deploy to Kubernetes:**
```powershell
# Deploy monitoring stack (Grafana, Prometheus, Elasticsearch)
kubectl apply -f k8s/monitoring-stack.yaml

# Deploy regression tests
kubectl apply -f k8s/regression-test-deployment.yaml

# Check deployments
kubectl get all -n monitoring
kubectl get all -n regression-testing
```

### **3. Access Services:**
```powershell
# Port forward Grafana
kubectl port-forward svc/grafana 3000:3000 -n monitoring

# Port forward test server
kubectl port-forward svc/test-server 8080:3000 -n regression-testing
```

---

## **📊 Kubernetes Dashboard (Optional)**

### **Install Dashboard:**
```powershell
# Install dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Create admin user
kubectl create serviceaccount admin-user -n kubernetes-dashboard
kubectl create clusterrolebinding admin-user --clusterrole=cluster-admin --serviceaccount=kubernetes-dashboard:admin-user

# Get access token
kubectl -n kubernetes-dashboard create token admin-user

# Start proxy
kubectl proxy

# Access at: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

---

## **🔍 Troubleshooting Kubernetes**

### **Common Issues:**

#### **1. kubectl not found**
```powershell
# Solution: Install kubectl or enable in Docker Desktop
choco install kubernetes-cli
```

#### **2. Cluster not accessible**
```powershell
# Check cluster status
kubectl cluster-info

# Reset context
kubectl config use-context docker-desktop
```

#### **3. Pods not starting**
```powershell
# Check pod status
kubectl get pods --all-namespaces

# Describe problematic pods
kubectl describe pod <pod-name> -n <namespace>

# Check logs
kubectl logs <pod-name> -n <namespace>
```

#### **4. ImagePullBackOff errors**
```powershell
# For local images, ensure they're available to cluster
# Docker Desktop: Images are automatically available
# Minikube: Use minikube docker-env
eval $(minikube docker-env)
docker build -t regression-test-framework .
```

---

## **🚀 Quick Setup Commands**

```powershell
# Complete Kubernetes setup for regression testing:

# 1. Enable Kubernetes in Docker Desktop (GUI)
# OR start Minikube
minikube start --driver=docker

# 2. Verify installation
kubectl version
kubectl get nodes

# 3. Create namespaces
kubectl create namespace monitoring
kubectl create namespace regression-testing

# 4. Deploy your framework
kubectl apply -f k8s/monitoring-stack.yaml
kubectl apply -f k8s/regression-test-deployment.yaml

# 5. Check status
kubectl get all -n monitoring
kubectl get all -n regression-testing

# 6. Access Grafana
kubectl port-forward svc/grafana 3000:3000 -n monitoring
```

---

## **📚 Additional Tools**

### **k9s (Kubernetes CLI Manager):**
```powershell
# Install k9s for better cluster management
choco install k9s

# Run k9s
k9s
```

### **kubectx/kubens (Context Switcher):**
```powershell
# Install for easier context switching
choco install kubectx

# Switch contexts
kubectx
kubens
```

---

## **☁️ Cloud Kubernetes (Production)**

For production deployments, consider cloud providers:

### **Azure AKS:**
```powershell
# Install Azure CLI
choco install azure-cli

# Login and create cluster
az login
az aks create --resource-group myRG --name myAKS --node-count 3 --enable-addons monitoring --generate-ssh-keys
az aks get-credentials --resource-group myRG --name myAKS
```

### **AWS EKS:**
```powershell
# Install AWS CLI and eksctl
choco install awscli
choco install eksctl

# Create cluster
eksctl create cluster --name my-cluster --region us-west-2 --nodes 3
```

### **Google GKE:**
```powershell
# Install Google Cloud SDK
choco install gcloudsdk

# Create cluster
gcloud container clusters create my-cluster --num-nodes=3
gcloud container clusters get-credentials my-cluster
```

---

## **✅ Verification Checklist**

After installation:

- [ ] **kubectl responds** - `kubectl version`
- [ ] **Cluster accessible** - `kubectl get nodes`
- [ ] **Namespaces created** - `kubectl get namespaces`
- [ ] **Pods running** - `kubectl get pods --all-namespaces`
- [ ] **Services accessible** - `kubectl get services --all-namespaces`
- [ ] **Grafana dashboard** - `http://localhost:3000` after port-forward

---

## **🎯 Next Steps**

1. **Choose installation method** (Docker Desktop recommended)
2. **Verify kubectl works**
3. **Deploy monitoring stack**
4. **Deploy regression tests**
5. **Access Grafana dashboard**
6. **Run tests in Kubernetes**

Your regression testing framework will then be running in a full Kubernetes environment with monitoring and logging! 🎉
