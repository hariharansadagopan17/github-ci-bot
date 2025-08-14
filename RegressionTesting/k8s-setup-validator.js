#!/usr/bin/env node

/**
 * Kubernetes Setup Validation Script
 * Checks if Kubernetes is properly installed and configured
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚢 Kubernetes Setup Validator');
console.log('='.repeat(50));

async function runCommand(command, args = []) {
    return new Promise((resolve) => {
        const process = spawn(command, args, { 
            stdio: 'pipe',
            shell: true 
        });
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        process.on('close', (code) => {
            resolve({
                code,
                stdout: stdout.trim(),
                stderr: stderr.trim()
            });
        });
        
        process.on('error', (error) => {
            resolve({
                code: -1,
                stdout: '',
                stderr: error.message
            });
        });
    });
}

async function checkKubernetes() {
    console.log('\n🔍 Checking Kubernetes Installation...');
    
    // Check 1: kubectl availability
    console.log('\n📦 Checking kubectl...');
    const kubectlVersion = await runCommand('kubectl', ['version', '--client']);
    if (kubectlVersion.code === 0) {
        // Extract version from output
        const versionMatch = kubectlVersion.stdout.match(/v\d+\.\d+\.\d+/);
        const version = versionMatch ? versionMatch[0] : 'unknown version';
        console.log('✅ kubectl is installed:', version);
    } else {
        console.log('❌ kubectl not found:', kubectlVersion.stderr);
        console.log('  🔧 Install kubectl or enable Kubernetes in Docker Desktop');
        return false;
    }
    
    // Check 2: Cluster connectivity
    console.log('\n🌐 Checking cluster connectivity...');
    const clusterInfo = await runCommand('kubectl', ['cluster-info']);
    if (clusterInfo.code === 0) {
        console.log('✅ Kubernetes cluster is accessible');
        console.log('  📍 Cluster info:', clusterInfo.stdout.split('\n')[0]);
    } else {
        console.log('❌ Cannot connect to Kubernetes cluster:', clusterInfo.stderr);
        console.log('  🔧 Start Docker Desktop Kubernetes or minikube');
        return false;
    }
    
    // Check 3: Nodes
    console.log('\n🖥️ Checking cluster nodes...');
    const nodes = await runCommand('kubectl', ['get', 'nodes']);
    if (nodes.code === 0) {
        const nodeLines = nodes.stdout.split('\n').filter(line => line.trim());
        const nodeCount = nodeLines.length - 1; // Subtract header
        console.log(`✅ Found ${nodeCount} node(s):`);
        nodeLines.forEach((line, index) => {
            if (index > 0) { // Skip header
                const [name, status] = line.split(/\s+/);
                const statusIcon = status === 'Ready' ? '✅' : '❌';
                console.log(`  ${statusIcon} ${name}: ${status}`);
            }
        });
    } else {
        console.log('❌ Cannot get node information:', nodes.stderr);
        return false;
    }
    
    // Check 4: Namespaces
    console.log('\n📁 Checking namespaces...');
    const namespaces = await runCommand('kubectl', ['get', 'namespaces']);
    if (namespaces.code === 0) {
        console.log('✅ Namespaces accessible');
        
        // Check if our namespaces exist
        const requiredNamespaces = ['monitoring', 'regression-testing'];
        const existingNamespaces = namespaces.stdout;
        
        requiredNamespaces.forEach(ns => {
            if (existingNamespaces.includes(ns)) {
                console.log(`  ✅ ${ns} namespace exists`);
            } else {
                console.log(`  ⚠️  ${ns} namespace missing (will be created during deployment)`);
            }
        });
    } else {
        console.log('❌ Cannot list namespaces:', namespaces.stderr);
        return false;
    }
    
    // Check 5: Docker images
    console.log('\n🐳 Checking Docker images...');
    const dockerImages = await runCommand('docker', ['images', 'regression-test-framework']);
    if (dockerImages.code === 0 && dockerImages.stdout.includes('regression-test-framework')) {
        console.log('✅ regression-test-framework Docker image found');
    } else {
        console.log('⚠️  regression-test-framework Docker image not found');
        console.log('  🔧 Build it with: npm run docker:build');
    }
    
    // Check 6: Kubernetes manifests
    console.log('\n📄 Checking Kubernetes manifests...');
    const k8sFiles = [
        'k8s/monitoring-stack.yaml',
        'k8s/regression-test-deployment.yaml'
    ];
    
    let manifestIssues = 0;
    k8sFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`✅ ${file} exists`);
        } else {
            console.log(`❌ ${file} missing`);
            manifestIssues++;
        }
    });
    
    if (manifestIssues > 0) {
        console.log('  🔧 Some Kubernetes manifests are missing');
        return false;
    }
    
    return true;
}

async function checkHelm() {
    console.log('\n⚓ Checking Helm (optional)...');
    const helmVersion = await runCommand('helm', ['version', '--short']);
    if (helmVersion.code === 0) {
        console.log('✅ Helm is installed:', helmVersion.stdout);
    } else {
        console.log('⚠️  Helm not found (optional for this setup)');
        console.log('  💡 Install with: choco install kubernetes-helm');
    }
}

async function provideSummary(kubernetesReady) {
    console.log('\n' + '='.repeat(50));
    console.log('📋 SUMMARY & NEXT STEPS');
    console.log('='.repeat(50));
    
    if (kubernetesReady) {
        console.log('🎉 Kubernetes is ready for regression testing!');
        console.log('\n🚀 Next steps:');
        console.log('  1. Build Docker image: npm run docker:build');
        console.log('  2. Deploy monitoring stack: npm run k8s:deploy-monitoring');
        console.log('  3. Deploy regression tests: npm run k8s:deploy-tests');
        console.log('  4. Check status: npm run k8s:status');
        console.log('  5. Access Grafana: npm run k8s:grafana');
        console.log('\n📚 Full guide: KUBERNETES_SETUP_GUIDE.md');
    } else {
        console.log('⚠️  Kubernetes setup needs attention');
        console.log('\n🔧 Common solutions:');
        console.log('  • Enable Kubernetes in Docker Desktop settings');
        console.log('  • Install kubectl: choco install kubernetes-cli');
        console.log('  • Start minikube: minikube start');
        console.log('  • Check Docker Desktop is running');
        console.log('\n📚 Detailed guide: KUBERNETES_SETUP_GUIDE.md');
    }
}

// Main execution
async function main() {
    try {
        const kubernetesReady = await checkKubernetes();
        await checkHelm();
        await provideSummary(kubernetesReady);
        
        console.log('\n✨ Validation complete!');
        process.exit(kubernetesReady ? 0 : 1);
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
    }
}

main();
