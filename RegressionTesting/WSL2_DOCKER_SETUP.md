# 🐧 **Docker in WSL2 Setup Guide**

## **🎯 Why WSL2 + Docker is Better**

### **Advantages:**
- ✅ **More stable** than Docker Desktop
- ✅ **Better performance** for Linux containers  
- ✅ **Native Kubernetes** support with k3s/microk8s
- ✅ **No Windows compatibility issues**
- ✅ **Uses less system resources**

---

## **🚀 Step 1: Enable WSL2**

### **Check if WSL2 is already installed:**
```powershell
wsl --list --verbose
```

### **Install WSL2 (if not installed):**
```powershell
# Run as Administrator
wsl --install

# Or install specific distro
wsl --install -d Ubuntu
```

### **Set WSL2 as default:**
```powershell
wsl --set-default-version 2
```

---

## **🐳 Step 2: Install Docker in WSL2**

### **Enter WSL2:**
```powershell
wsl
```

### **Inside WSL2, install Docker:**
```bash
# Update package list
sudo apt update

# Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package list again
sudo apt update

# Install Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Add user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo service docker start

# Enable Docker to start on boot
sudo systemctl enable docker
```

---

## **⚙️ Step 3: Configure Docker in WSL2**

### **Create Docker daemon config:**
```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"],
  "insecure-registries": [],
  "registry-mirrors": []
}
EOF

# Restart Docker
sudo service docker restart
```

### **Test Docker installation:**
```bash
# Test Docker
docker --version
docker run hello-world

# Test Docker Compose
sudo apt install -y docker-compose
docker-compose --version
```

---

## **☸️ Step 4: Install Kubernetes in WSL2**

### **Option A: Install k3s (Lightweight Kubernetes):**
```bash
# Install k3s
curl -sfL https://get.k3s.io | sh -

# Set up kubeconfig
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Test kubectl
kubectl get nodes
```

### **Option B: Install microk8s:**
```bash
# Install microk8s
sudo snap install microk8s --classic

# Add user to microk8s group
sudo usermod -a -G microk8s $USER
newgrp microk8s

# Enable essential addons
microk8s enable dns dashboard ingress

# Set up kubectl alias
sudo snap alias microk8s.kubectl kubectl

# Test
kubectl get nodes
```

---

## **🔗 Step 5: Access from Windows**

### **Set up kubectl on Windows to use WSL2:**

```powershell
# In Windows PowerShell, create config to point to WSL2
$wslIP = wsl hostname -I
$kubeconfigContent = @"
apiVersion: v1
clusters:
- cluster:
    server: https://$wslIP:6443
    certificate-authority-data: [FROM_WSL_CONFIG]
  name: wsl-k3s
contexts:
- context:
    cluster: wsl-k3s
    user: wsl-k3s
  name: wsl-k3s
current-context: wsl-k3s
users:
- name: wsl-k3s
  user:
    client-certificate-data: [FROM_WSL_CONFIG]
    client-key-data: [FROM_WSL_CONFIG]
"@

# Copy kubeconfig from WSL2
wsl cat ~/.kube/config > $env:USERPROFILE\.kube\config
```

---

## **🧪 Step 6: Validate Setup**

### **From WSL2:**
```bash
# Check Docker
docker ps
docker version

# Check Kubernetes
kubectl cluster-info
kubectl get nodes
kubectl get pods --all-namespaces
```

### **From Windows (your regression testing directory):**
```powershell
cd "D:\AI_bot\Release_Deployment_Bot\github-ci-bot_Changes\RegressionTesting"

# Copy kubeconfig from WSL2
wsl cp ~/.kube/config /mnt/d/temp-kubeconfig
copy D:\temp-kubeconfig $env:USERPROFILE\.kube\config
del D:\temp-kubeconfig

# Test kubectl from Windows
kubectl cluster-info

# Run our validation
npm run k8s:validate
```

---

## **🎯 Step 7: Deploy Your Regression Framework**

### **Build in WSL2:**
```bash
# Navigate to your project (mounted automatically)
cd /mnt/d/AI_bot/Release_Deployment_Bot/github-ci-bot_Changes/RegressionTesting

# Build Docker image in WSL2
docker build -t regression-test-framework .

# Deploy to Kubernetes
kubectl apply -f k8s/
```

### **Or from Windows:**
```powershell
# Set Docker host to WSL2
$env:DOCKER_HOST = "tcp://$(wsl hostname -I):2375"

# Now your npm scripts will work
npm run docker:build
npm run k8s:deploy-all
```

---

## **🔧 Quick Setup Script**

Save this as `setup-wsl-docker.ps1`:

```powershell
# Quick WSL2 + Docker setup
Write-Host "🐧 Setting up WSL2 + Docker..." -ForegroundColor Cyan

# Check if WSL2 exists
$wslDistros = wsl --list --quiet
if ($wslDistros -notcontains "Ubuntu") {
    Write-Host "📦 Installing Ubuntu on WSL2..." -ForegroundColor Yellow
    wsl --install -d Ubuntu
    Write-Host "⚠️ Please restart your computer and run this script again" -ForegroundColor Red
    exit
}

# Enter WSL2 and run setup
Write-Host "🐳 Installing Docker in WSL2..." -ForegroundColor Yellow
wsl -d Ubuntu -e bash -c @"
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker \$USER
sudo service docker start
echo '✅ Docker installed in WSL2!'
"@

Write-Host "☸️ Installing k3s..." -ForegroundColor Yellow
wsl -d Ubuntu -e bash -c @"
curl -sfL https://get.k3s.io | sh -
sudo mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown \$(id -u):\$(id -g) ~/.kube/config
echo '✅ k3s installed!'
"@

Write-Host "🔗 Setting up Windows access..." -ForegroundColor Yellow
if (!(Test-Path "$env:USERPROFILE\.kube")) {
    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.kube"
}
wsl -d Ubuntu cat ~/.kube/config > "$env:USERPROFILE\.kube\config"

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "🎯 Next: Run 'npm run k8s:validate' from your project directory" -ForegroundColor Cyan
```

---

## **💡 Benefits of This Setup**

1. **More Reliable:** No Docker Desktop crashes
2. **Better Performance:** Native Linux containers
3. **Full Kubernetes:** Complete k3s/microk8s cluster
4. **Cost-Effective:** No Docker Desktop licensing issues
5. **Development-Friendly:** Better for CI/CD pipelines

---

## **🆘 Troubleshooting**

### **WSL2 not starting:**
```powershell
# Restart WSL service
wsl --shutdown
wsl
```

### **Docker permission denied:**
```bash
# In WSL2, add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### **kubectl connection issues:**
```bash
# Check k3s status
sudo systemctl status k3s

# Restart k3s if needed
sudo systemctl restart k3s
```

---

## **🎯 Quick Start Commands**

```powershell
# 1. Install WSL2 + Ubuntu
wsl --install -d Ubuntu

# 2. Restart computer, then enter WSL2
wsl

# 3. Install Docker (in WSL2)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 4. Install k3s (in WSL2)
curl -sfL https://get.k3s.io | sh -

# 5. Set up kubeconfig (in WSL2)
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# 6. Copy config to Windows (in Windows)
wsl cat ~/.kube/config > $env:USERPROFILE\.kube\config

# 7. Test from Windows
kubectl get nodes
npm run k8s:validate
```

This approach will give you a much more stable and powerful development environment! 🚀
