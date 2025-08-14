# 🎯 **Manual WSL2 Setup - Step by Step Instructions**

Since we had some file system issues with automated installation, here are the **manual steps** for you to run:

---

## **🚀 Step 1: Open WSL2 Ubuntu Terminal**

```powershell
# In PowerShell, start WSL2
wsl -d Ubuntu
```

You should now be in Ubuntu terminal with `devopsadmin@` prompt.

---

## **🐳 Step 2: Install Docker (Run these commands in Ubuntu)**

```bash
# Update packages
sudo apt update

# Install Docker
sudo apt install -y docker.io

# Add yourself to docker group (so no sudo needed)
sudo usermod -aG docker $USER

# Start Docker
sudo service docker start

# Test Docker works
sudo docker --version
sudo docker run hello-world
```

---

## **☸️ Step 3: Install kubectl (Run in Ubuntu)**

```bash
# Download kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Install kubectl
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Remove download file
rm kubectl

# Test kubectl
kubectl version --client
```

---

## **🚢 Step 4: Install k3s Kubernetes (Run in Ubuntu)**

```bash
# Install k3s (lightweight Kubernetes)
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644

# Set up kubeconfig for your user
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Wait a moment for k3s to start
sleep 10

# Test Kubernetes
kubectl get nodes
kubectl cluster-info
```

---

## **🎯 Step 5: Verify Everything Works**

```bash
# Check Docker
docker --version
docker ps

# Check Kubernetes
kubectl get nodes
kubectl get pods --all-namespaces

# You should see:
# - Docker version info
# - k3s node in "Ready" status
# - System pods running
```

---

## **🔗 Step 6: Copy kubeconfig to Windows (Run in PowerShell)**

```powershell
# Copy kubeconfig from WSL2 to Windows
wsl -d Ubuntu cat ~/.kube/config > $env:USERPROFILE\.kube\config

# Test kubectl from Windows
kubectl get nodes
```

---

## **🚀 Step 7: Deploy Your Regression Framework**

```bash
# In WSL2, navigate to your project
cd /mnt/d/AI_bot/Release_Deployment_Bot/github-ci-bot_Changes/RegressionTesting

# Build Docker image
docker build -t regression-test-framework .

# Deploy to Kubernetes
kubectl apply -f k8s/monitoring-stack.yaml
kubectl apply -f k8s/regression-test-deployment.yaml

# Check deployment
kubectl get pods
kubectl get services
```

---

## **✅ Expected Success Output**

After setup, you should see:

```bash
$ docker --version
Docker version 27.5.1, build ...

$ kubectl get nodes
NAME     STATUS   ROLES                  AGE   VERSION
ubuntu   Ready    control-plane,master   1m    v1.28.2+k3s1

$ kubectl get pods --all-namespaces
NAMESPACE     NAME                             READY   STATUS    RESTARTS
kube-system   coredns-6799fbcd5-xxxxx         1/1     Running   0
kube-system   local-path-provisioner-xxxxx    1/1     Running   0
kube-system   metrics-server-xxxxx            1/1     Running   0
```

---

## **🆘 If You Get Stuck**

1. **Docker permission denied:** `sudo usermod -aG docker $USER` then `exit` and re-enter WSL2
2. **k3s not starting:** `sudo systemctl status k3s` and `sudo systemctl restart k3s`  
3. **kubectl can't connect:** Check `~/.kube/config` exists and has correct permissions

---

## **🎉 Once Everything is Working**

Run from your Windows PowerShell:

```powershell
cd "D:\AI_bot\Release_Deployment_Bot\github-ci-bot_Changes\RegressionTesting"
npm run k8s:validate
```

You should see all green checkmarks! ✅

**This will give you a complete Docker + Kubernetes environment in WSL2!** 🚀
