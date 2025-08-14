# 🐧 **Complete WSL2 + Docker + Kubernetes Setup**

## **🎯 Clean Setup - No Docker Desktop Needed!**

Now that we've killed Docker Desktop, let's set up a proper WSL2 environment:

---

## **🚀 Step 1: Start Fresh WSL2 Ubuntu**

```powershell
# Start WSL2 Ubuntu
wsl -d Ubuntu

# You should now be in Ubuntu terminal
```

---

## **🐳 Step 2: Install Docker in WSL2 (Run in Ubuntu)**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker dependencies
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index
sudo apt update

# Install Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group (no more sudo needed)
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker

# Start Docker service
sudo service docker start

# Enable Docker to start automatically
sudo systemctl enable docker

# Test Docker
docker --version
docker run hello-world
```

---

## **☸️ Step 3: Install Kubernetes (k3s) in WSL2**

```bash
# Install k3s (lightweight Kubernetes)
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644

# Set up kubeconfig for current user
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Add kubectl alias (optional)
echo 'alias k=kubectl' >> ~/.bashrc
source ~/.bashrc

# Test Kubernetes
kubectl version --client
kubectl cluster-info
kubectl get nodes
```

---

## **🔗 Step 4: Configure Windows Access to WSL2 Kubernetes**

```powershell
# In Windows PowerShell, copy kubeconfig from WSL2
$wslKubeConfig = wsl -d Ubuntu cat ~/.kube/config
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.kube"
$wslKubeConfig | Out-File -FilePath "$env:USERPROFILE\.kube\config" -Encoding utf8

# Test kubectl from Windows
kubectl version --client
kubectl get nodes
```

---

## **🧪 Step 5: Test Everything**

```bash
# In WSL2 Ubuntu:
docker ps
kubectl get nodes
kubectl get pods --all-namespaces

# Should show:
# - Docker running
# - k3s node in Ready state
# - System pods running
```

---

## **🎯 Step 6: Deploy Your Regression Framework**

```bash
# Navigate to your project in WSL2
cd /mnt/d/AI_bot/Release_Deployment_Bot/github-ci-bot_Changes/RegressionTesting

# Build Docker image
docker build -t regression-test-framework .

# Deploy to Kubernetes
kubectl apply -f k8s/

# Check deployment
kubectl get pods
kubectl get services
```

---

## **🆘 Troubleshooting**

### **If Docker doesn't start:**
```bash
# Check Docker status
sudo systemctl status docker

# Start Docker manually
sudo systemctl start docker

# Check Docker daemon
sudo dockerd
```

### **If k3s doesn't work:**
```bash
# Check k3s status
sudo systemctl status k3s

# Restart k3s
sudo systemctl restart k3s

# Check logs
sudo journalctl -u k3s
```

### **If kubectl can't connect:**
```bash
# Check kubeconfig
echo $KUBECONFIG
cat ~/.kube/config

# Reset kubeconfig
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
```

---

## **⚡ One-Command Setup Script**

Save this as `wsl-setup.sh` and run in WSL2:

```bash
#!/bin/bash
echo "🐧 Setting up WSL2 + Docker + Kubernetes..."

# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
newgrp docker
sudo service docker start

# Install k3s
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

echo "✅ Setup complete!"
echo "🎯 Test with: docker ps && kubectl get nodes"
```

---

## **🎉 Expected Result**

After setup, you should see:

```bash
$ docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES

$ kubectl get nodes
NAME    STATUS   ROLES                  AGE   VERSION
ubuntu  Ready    control-plane,master   1m    v1.28.2+k3s1

$ kubectl cluster-info
Kubernetes control plane is running at https://127.0.0.1:6443
```

**This gives you a complete, native Linux environment for Docker and Kubernetes!** 🚀
