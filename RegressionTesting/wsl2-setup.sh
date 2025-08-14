#!/bin/bash

# WSL2 Docker + Kubernetes Setup Script
# Run this inside WSL2 Ubuntu terminal

echo "🐧 Setting up Docker and Kubernetes in WSL2..."

# Fix any mount issues
sudo mount -o remount,rw /

# Update system
echo "📦 Updating system packages..."
sudo apt update

# Install Docker
echo "🐳 Installing Docker..."
sudo apt install -y docker.io

# Add user to docker group
echo "👤 Adding user to docker group..."
sudo usermod -aG docker $USER

# Start Docker service
echo "🚀 Starting Docker service..."
sudo service docker start

# Test Docker (without sudo)
echo "🧪 Testing Docker..."
newgrp docker << EOF
docker --version
docker run hello-world
EOF

# Install kubectl
echo "☸️ Installing kubectl..."
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
rm kubectl

# Install k3s (lightweight Kubernetes)
echo "🚢 Installing k3s..."
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644

# Set up kubeconfig
echo "⚙️ Setting up kubeconfig..."
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
export KUBECONFIG=~/.kube/config

# Wait for k3s to be ready
echo "⏳ Waiting for k3s to be ready..."
sleep 10

# Test Kubernetes
echo "🧪 Testing Kubernetes..."
kubectl version --client
kubectl get nodes

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Exit and re-enter WSL2 to apply group changes: exit"
echo "2. Start WSL2 again: wsl -d Ubuntu"
echo "3. Test: docker ps && kubectl get nodes"
echo "4. Deploy your regression framework!"
