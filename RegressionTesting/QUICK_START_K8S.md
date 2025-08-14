# 🚀 **Enable Kubernetes in Docker Desktop - Step by Step**

## **Quick Method: Enable Docker Desktop Kubernetes**

Since WSL2 Docker needs sudo access, let's use Docker Desktop's built-in Kubernetes:

### **Step 1: Open Docker Desktop**
1. Look for **Docker Desktop** icon in system tray (bottom right)
2. Click on it to open Docker Desktop

### **Step 2: Enable Kubernetes**
1. Click the **Settings** (gear icon) in Docker Desktop
2. Click **Kubernetes** in the left sidebar
3. ✅ Check **"Enable Kubernetes"**
4. Click **"Apply & Restart"**

### **Step 3: Wait for Kubernetes to Start**
- You'll see "Kubernetes is starting..." 
- Wait until it shows **"Kubernetes is running"** (green status)
- This may take 2-3 minutes

### **Step 4: Verify It's Working**
```powershell
# In your PowerShell terminal, run:
kubectl cluster-info
kubectl get nodes
```

### **Step 5: Deploy Your Framework**
```powershell
# Once Kubernetes is running:
npm run k8s:validate
npm run k8s:deploy-all
```

---

## **🔧 Alternative: Fix WSL2 Docker (If Needed)**

If you prefer WSL2, you can set up Docker without password:

1. **Open Ubuntu WSL2 directly** (not through PowerShell)
2. **Set up Docker to run without sudo:**
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   sudo service docker start
   ```
3. **Create k3d cluster:**
   ```bash
   k3d cluster create regression-cluster --port "8080:80@loadbalancer"
   ```

---

## **📋 Next Steps After Kubernetes is Running:**

```powershell
# 1. Validate setup
npm run k8s:validate

# 2. Deploy everything  
npm run k8s:deploy-all

# 3. Check status
npm run k8s:status

# 4. Access services
npm run k8s:grafana
```

---

## **🎯 Expected Result:**

When Kubernetes is working, you'll see:
```
$ kubectl cluster-info
Kubernetes control plane is running at https://kubernetes.docker.internal:6443
```

**Choose your preferred method and let me know when Kubernetes is running!** 🚀
