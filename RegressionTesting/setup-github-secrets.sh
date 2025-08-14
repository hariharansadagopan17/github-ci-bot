#!/bin/bash

# GitHub Secrets Setup Script
# This script will help you set up all required GitHub secrets for the CI/CD pipeline

echo "🔐 GitHub Secrets Setup for CI/CD Pipeline"
echo "=========================================="
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it from: https://cli.github.com/"
    echo ""
    echo "Windows Installation:"
    echo "winget install --id GitHub.cli"
    echo ""
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "🔑 Please authenticate with GitHub CLI first:"
    echo "gh auth login"
    echo ""
    exit 1
fi

# Repository information
REPO_OWNER="hariharansadagopan17"
REPO_NAME="github-ci-bot"
REPO_FULL="${REPO_OWNER}/${REPO_NAME}"

echo "📋 Setting up secrets for repository: ${REPO_FULL}"
echo ""

# Get the base64 encoded kubeconfig
echo "🔍 Getting Kubernetes configuration..."
KUBE_CONFIG_B64=$(sudo cat /etc/rancher/k3s/k3s.yaml | base64 -w 0)

if [ -z "$KUBE_CONFIG_B64" ]; then
    echo "❌ Failed to get kubeconfig. Make sure k3s is installed and running."
    exit 1
fi

echo "✅ Kubernetes configuration obtained"
echo ""

# Set the KUBE_CONFIG secret
echo "🔐 Setting KUBE_CONFIG secret..."
echo "$KUBE_CONFIG_B64" | gh secret set KUBE_CONFIG --repo "$REPO_FULL"

if [ $? -eq 0 ]; then
    echo "✅ KUBE_CONFIG secret set successfully"
else
    echo "❌ Failed to set KUBE_CONFIG secret"
    exit 1
fi

echo ""

# Optional: Set Loki URL if needed
echo "🔧 Optional: Setting LOKI_URL secret..."
LOKI_URL="http://localhost:3100"
echo "$LOKI_URL" | gh secret set LOKI_URL --repo "$REPO_FULL"

if [ $? -eq 0 ]; then
    echo "✅ LOKI_URL secret set successfully"
else
    echo "⚠️ Warning: Failed to set LOKI_URL secret (optional)"
fi

echo ""

# Verify secrets are set
echo "🔍 Verifying secrets..."
SECRETS=$(gh secret list --repo "$REPO_FULL")

echo "📋 Current repository secrets:"
echo "$SECRETS"
echo ""

# Check for required secrets
if echo "$SECRETS" | grep -q "KUBE_CONFIG"; then
    echo "✅ KUBE_CONFIG secret is set"
else
    echo "❌ KUBE_CONFIG secret is missing"
    exit 1
fi

echo ""
echo "🎉 GitHub secrets setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Push any change to trigger the pipeline:"
echo "   git add . && git commit -m 'feat: activate CI/CD pipeline' && git push"
echo ""
echo "2. Monitor the pipeline at:"
echo "   https://github.com/${REPO_FULL}/actions"
echo ""
echo "3. View logs in Grafana dashboard:"
echo "   Check your ngrok tunnel URL"
echo ""
echo "4. Use troubleshooting tools:"
echo "   npm run pipeline:dashboard"
echo "   npm run pipeline:troubleshoot"
echo ""

echo "🔧 Pipeline Features Now Active:"
echo "✅ Automated testing on every push"
echo "✅ Docker image build and push"
echo "✅ Kubernetes deployment"
echo "✅ Self-healing pipeline troubleshooting"
echo "✅ Grafana log monitoring"
echo "✅ Automatic issue creation for failures"
echo ""
