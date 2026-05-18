# ☸️ Kubernetes — Complete Study Guide

> Kubernetes (K8s) is an open-source **container orchestration platform** that automates deployment, scaling, and management of containerized applications.

---

## Table of Contents

1. [What is Kubernetes & Why Use It?](#1-what-is-kubernetes--why-use-it)
2. [Core Architecture](#2-core-architecture)
3. [Installing Kubernetes Locally](#3-installing-kubernetes-locally)
4. [kubectl — The CLI Tool](#4-kubectl--the-cli-tool)
5. [Pods](#5-pods)
6. [ReplicaSets](#6-replicasets)
7. [Deployments](#7-deployments)
8. [Services](#8-services)
9. [Namespaces](#9-namespaces)
10. [ConfigMaps & Secrets](#10-configmaps--secrets)
11. [Volumes & Persistent Storage](#11-volumes--persistent-storage)
12. [Resource Requests & Limits](#12-resource-requests--limits)
13. [Liveness & Readiness Probes](#13-liveness--readiness-probes)
14. [Horizontal Pod Autoscaler (HPA)](#14-horizontal-pod-autoscaler-hpa)
15. [Ingress & Ingress Controller](#15-ingress--ingress-controller)
16. [StatefulSets](#16-statefulsets)
17. [DaemonSets](#17-daemonsets)
18. [Jobs & CronJobs](#18-jobs--cronjobs)
19. [Helm — Kubernetes Package Manager](#19-helm--kubernetes-package-manager)
20. [Deploying on AWS EKS](#20-deploying-on-aws-eks)
21. [Full Production Example](#21-full-production-example)
22. [Quick Reference Cheat Sheet](#22-quick-reference-cheat-sheet)

---

## 1. What is Kubernetes & Why Use It?

### The Problem Docker Alone Can't Solve

Docker lets you run containers. But in production you need to answer:

- What if a container **crashes**? Who restarts it?
- How do you **scale** from 1 container to 100?
- How do you do **zero-downtime deployments**?
- How do containers on **different machines** talk to each other?
- How do you **roll back** a bad release?

**Kubernetes answers all of these.**

### What Kubernetes Does

```
Without K8s:
  You → manually run containers → manually restart on crash → manually scale

With K8s:
  You → declare desired state → K8s makes it happen & keeps it that way
```

### Key Benefits

| Feature | Description |
|---------|-------------|
| **Self-healing** | Automatically restarts crashed containers |
| **Auto-scaling** | Scale pods up/down based on CPU/memory |
| **Rolling updates** | Deploy new versions with zero downtime |
| **Load balancing** | Distributes traffic across pods automatically |
| **Service discovery** | Containers find each other by name |
| **Secret management** | Secure storage for passwords and tokens |
| **Storage orchestration** | Mount storage from cloud providers automatically |

---

## 2. Core Architecture

### Big Picture

```
┌─────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                    │
│                                                          │
│  ┌──────────────────┐     ┌──────────────────────────┐  │
│  │   Control Plane  │     │       Worker Nodes        │  │
│  │   (Master Node)  │     │                          │  │
│  │                  │     │  ┌────────┐  ┌────────┐  │  │
│  │  ┌─────────────┐ │     │  │ Node 1 │  │ Node 2 │  │  │
│  │  │ API Server  │ │────▶│  │        │  │        │  │  │
│  │  └─────────────┘ │     │  │  Pod   │  │  Pod   │  │  │
│  │  ┌─────────────┐ │     │  │  Pod   │  │  Pod   │  │  │
│  │  │  Scheduler  │ │     │  └────────┘  └────────┘  │  │
│  │  └─────────────┘ │     │                          │  │
│  │  ┌─────────────┐ │     └──────────────────────────┘  │
│  │  │ Controller  │ │                                    │
│  │  │  Manager   │ │                                    │
│  │  └─────────────┘ │                                    │
│  │  ┌─────────────┐ │                                    │
│  │  │    etcd     │ │                                    │
│  │  └─────────────┘ │                                    │
│  └──────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

### Control Plane Components

| Component | Role |
|-----------|------|
| **API Server** | Front door of K8s — all `kubectl` commands go here |
| **Scheduler** | Decides which Node a new Pod should run on |
| **Controller Manager** | Watches cluster state; ensures desired state matches actual state |
| **etcd** | Key-value store — the cluster's database/brain |

### Worker Node Components

| Component | Role |
|-----------|------|
| **kubelet** | Agent on each node; talks to API Server; starts/stops pods |
| **kube-proxy** | Handles networking rules for services |
| **Container Runtime** | Runs containers (containerd, Docker) |

---

## 3. Installing Kubernetes Locally

### Option 1 — Minikube (Recommended for Beginners)

Minikube runs a single-node K8s cluster inside a VM or Docker container on your machine.

```bash
# Install on macOS
brew install minikube

# Install on Ubuntu/Debian
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Start cluster
minikube start

# Start with specific resources
minikube start --cpus=4 --memory=8192

# Check status
minikube status

# Stop cluster
minikube stop

# Delete cluster
minikube delete

# Open Kubernetes Dashboard
minikube dashboard

# Get cluster IP
minikube ip
```

### Option 2 — Kind (Kubernetes IN Docker)

```bash
# Install
go install sigs.k8s.io/kind@v0.22.0

# Create cluster
kind create cluster --name my-cluster

# Delete cluster
kind delete cluster --name my-cluster
```

### Option 3 — Docker Desktop

Enable Kubernetes in Docker Desktop Settings → Kubernetes → Enable Kubernetes.

---

## 4. kubectl — The CLI Tool

`kubectl` is the command-line tool to interact with any Kubernetes cluster.

### Install kubectl

```bash
# macOS
brew install kubectl

# Ubuntu
sudo apt-get install -y kubectl

# Verify
kubectl version --client
```

### kubectl Basic Syntax

```bash
kubectl [command] [resource-type] [resource-name] [flags]

# Examples:
kubectl get pods
kubectl get pod my-pod
kubectl describe pod my-pod
kubectl delete pod my-pod
kubectl apply -f file.yaml
```

### Essential kubectl Commands

```bash
# Cluster info
kubectl cluster-info
kubectl get nodes
kubectl get nodes -o wide           # With IP, OS, etc.

# Get resources
kubectl get pods
kubectl get pods -n kube-system     # In specific namespace
kubectl get pods --all-namespaces   # Across all namespaces
kubectl get pods -o wide            # With node info
kubectl get all                     # All resources in namespace

# Describe (detailed info + events)
kubectl describe pod my-pod
kubectl describe node my-node
kubectl describe deployment my-app

# Logs
kubectl logs my-pod
kubectl logs -f my-pod              # Stream logs
kubectl logs my-pod -c my-container # Specific container in pod

# Execute command inside pod
kubectl exec -it my-pod -- sh
kubectl exec -it my-pod -- bash

# Apply / Delete from YAML
kubectl apply -f deployment.yaml
kubectl delete -f deployment.yaml

# Delete resource directly
kubectl delete pod my-pod
kubectl delete deployment my-app

# Edit resource live
kubectl edit deployment my-app

# Scale deployment
kubectl scale deployment my-app --replicas=5

# Port forward (access pod locally)
kubectl port-forward pod/my-pod 8080:3000
kubectl port-forward svc/my-service 8080:80
```

### kubectl Context (Switch Clusters)

```bash
kubectl config get-contexts           # List all clusters/contexts
kubectl config current-context        # Show current context
kubectl config use-context minikube   # Switch to minikube
kubectl config use-context my-eks     # Switch to AWS EKS
```

---

## 5. Pods

A **Pod** is the **smallest deployable unit** in Kubernetes. It wraps one or more containers that share the same network and storage.

### Key Facts

- Every container in K8s runs inside a Pod
- Pods are **ephemeral** — they can die and be replaced anytime
- Containers in the same Pod share `localhost` and volumes
- In practice, you almost never create Pods directly — you use Deployments

### Pod Lifecycle

```
Pending → Running → Succeeded / Failed / Unknown
```

| Status | Meaning |
|--------|---------|
| `Pending` | Scheduled but containers not started yet |
| `Running` | All containers started successfully |
| `Succeeded` | All containers exited with code 0 |
| `Failed` | At least one container exited with non-zero code |
| `CrashLoopBackOff` | Container keeps crashing and restarting |

### Simple Pod YAML

```yaml
# pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app-pod
  labels:
    app: my-app
    env: production
spec:
  containers:
    - name: app
      image: pratikjavale712/study-docker:v1
      ports:
        - containerPort: 3000
      env:
        - name: NODE_ENV
          value: "production"
```

```bash
# Create pod
kubectl apply -f pod.yaml

# Get pods
kubectl get pods

# Describe pod (see events, errors)
kubectl describe pod my-app-pod

# Get logs
kubectl logs my-app-pod

# Enter pod shell
kubectl exec -it my-app-pod -- sh

# Delete pod
kubectl delete pod my-app-pod
```

### Multi-Container Pod (Sidecar Pattern)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sidecar
spec:
  containers:
    - name: app
      image: pratikjavale712/study-docker:v1
      ports:
        - containerPort: 3000

    - name: log-collector           # Sidecar container
      image: fluentd:latest
      volumeMounts:
        - name: logs
          mountPath: /var/log/app

  volumes:
    - name: logs
      emptyDir: {}
```

---

## 6. ReplicaSets

A **ReplicaSet** ensures that a specified number of Pod replicas are running at all times. If a pod dies, ReplicaSet creates a new one.

> ⚠️ In practice, you almost never create ReplicaSets directly — Deployments manage them for you.

```yaml
# replicaset.yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: my-app-rs
spec:
  replicas: 3                       # Always maintain 3 pods
  selector:
    matchLabels:
      app: my-app                   # Manage pods with this label
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: pratikjavale712/study-docker:v1
          ports:
            - containerPort: 3000
```

```bash
kubectl apply -f replicaset.yaml
kubectl get replicasets
kubectl get rs

# Scale
kubectl scale rs my-app-rs --replicas=5
```

---

## 7. Deployments

A **Deployment** is the standard way to run stateless apps in Kubernetes. It manages ReplicaSets and adds:

- **Rolling updates** (zero-downtime deploys)
- **Rollback** to previous version
- **Declarative updates** — just change the image tag

```
Deployment → manages → ReplicaSet → manages → Pods
```

### Deployment YAML

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: study-docker-deployment
  labels:
    app: study-docker
spec:
  replicas: 3                        # Run 3 pods
  selector:
    matchLabels:
      app: study-docker
  strategy:
    type: RollingUpdate              # Zero-downtime updates
    rollingUpdate:
      maxSurge: 1                    # Max 1 extra pod during update
      maxUnavailable: 0              # No pod goes down during update
  template:
    metadata:
      labels:
        app: study-docker
    spec:
      containers:
        - name: app
          image: pratikjavale712/study-docker:v1
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "128Mi"
              cpu: "250m"
            limits:
              memory: "256Mi"
              cpu: "500m"
```

### Deployment Commands

```bash
# Apply deployment
kubectl apply -f deployment.yaml

# Get deployments
kubectl get deployments
kubectl get deploy

# Describe deployment
kubectl describe deployment study-docker-deployment

# Update image (triggers rolling update)
kubectl set image deployment/study-docker-deployment \
  app=pratikjavale712/study-docker:v2

# Watch rollout progress
kubectl rollout status deployment/study-docker-deployment

# View rollout history
kubectl rollout history deployment/study-docker-deployment

# Rollback to previous version
kubectl rollout undo deployment/study-docker-deployment

# Rollback to specific revision
kubectl rollout undo deployment/study-docker-deployment --to-revision=2

# Scale
kubectl scale deployment study-docker-deployment --replicas=5

# Pause / Resume rollout
kubectl rollout pause deployment/study-docker-deployment
kubectl rollout resume deployment/study-docker-deployment
```

### Rolling Update Flow

```
Old Pods:  [v1] [v1] [v1]

Step 1:    [v1] [v1] [v1] [v2]     ← new pod created (maxSurge: 1)
Step 2:    [v1] [v1] [v2]          ← old pod removed
Step 3:    [v1] [v1] [v2] [v2]     ← another new pod
Step 4:    [v1] [v2] [v2]          ← another old pod removed
Step 5:    [v1] [v2] [v2] [v2]
Step 6:    [v2] [v2] [v2]          ← done, all updated ✅
```

---

## 8. Services

Pods have dynamic IPs that change when they restart. A **Service** gives a **stable IP and DNS name** to access a set of Pods, and load-balances traffic across them.

### Service Types

| Type | Description | Use Case |
|------|-------------|---------|
| `ClusterIP` | Internal IP only (default) | Pod-to-pod communication inside cluster |
| `NodePort` | Exposes on each Node's IP at a static port | Dev/testing access from outside |
| `LoadBalancer` | Creates a cloud load balancer | Production — expose app to internet |
| `ExternalName` | Maps service to a DNS name | Point to external services |

### ClusterIP Service (Internal)

```yaml
# service-clusterip.yaml
apiVersion: v1
kind: Service
metadata:
  name: study-docker-service
spec:
  type: ClusterIP                    # Default; internal only
  selector:
    app: study-docker                # Routes to pods with this label
  ports:
    - protocol: TCP
      port: 80                       # Service port (what others call)
      targetPort: 3000               # Container port (where app runs)
```

### NodePort Service (External Access for Dev)

```yaml
# service-nodeport.yaml
apiVersion: v1
kind: Service
metadata:
  name: study-docker-nodeport
spec:
  type: NodePort
  selector:
    app: study-docker
  ports:
    - protocol: TCP
      port: 80                       # Service port
      targetPort: 3000               # Container port
      nodePort: 30080                # Node port (30000–32767)
```

Access via: `http://NODE_IP:30080`

### LoadBalancer Service (Production)

```yaml
# service-lb.yaml
apiVersion: v1
kind: Service
metadata:
  name: study-docker-lb
spec:
  type: LoadBalancer
  selector:
    app: study-docker
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
```

On AWS, this automatically provisions an ELB (Elastic Load Balancer).

```bash
kubectl apply -f service.yaml
kubectl get services
kubectl get svc

# Get service details (including external IP)
kubectl describe svc study-docker-lb

# Access via minikube
minikube service study-docker-nodeport --url
```

---

## 9. Namespaces

**Namespaces** let you divide a single cluster into **virtual clusters**. They're used to separate teams, environments, or applications.

```
cluster
├── namespace: default          ← where resources go if not specified
├── namespace: kube-system      ← K8s internal components
├── namespace: development
├── namespace: staging
└── namespace: production
```

```bash
# List namespaces
kubectl get namespaces
kubectl get ns

# Create namespace
kubectl create namespace production

# Or via YAML
```

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
```

```bash
# Deploy to specific namespace
kubectl apply -f deployment.yaml -n production

# Get pods in a namespace
kubectl get pods -n production

# Set default namespace for current context
kubectl config set-context --current --namespace=production

# Get resources across all namespaces
kubectl get pods --all-namespaces
```

---

## 10. ConfigMaps & Secrets

### ConfigMaps — Non-Sensitive Configuration

ConfigMaps store non-sensitive key-value pairs (app settings, feature flags, config files).

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
  APP_NAME: "study-docker"
```

```bash
kubectl apply -f configmap.yaml
kubectl get configmaps
kubectl describe configmap app-config
```

#### Use ConfigMap in Pod

```yaml
spec:
  containers:
    - name: app
      image: pratikjavale712/study-docker:v1

      # Option 1: Load all keys as env vars
      envFrom:
        - configMapRef:
            name: app-config

      # Option 2: Load specific keys
      env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: NODE_ENV

      # Option 3: Mount as file
      volumeMounts:
        - name: config-volume
          mountPath: /app/config

  volumes:
    - name: config-volume
      configMap:
        name: app-config
```

---

### Secrets — Sensitive Data

Secrets store sensitive data like passwords, API keys, and tokens. Values are **base64 encoded** (not encrypted by default — use encryption at rest in production).

```bash
# Create secret from command line
kubectl create secret generic db-secret \
  --from-literal=DB_PASSWORD=mysecretpassword \
  --from-literal=JWT_SECRET=myjwtsecret

# Create from .env file
kubectl create secret generic app-secret --from-env-file=.env
```

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  DB_PASSWORD: bXlzZWNyZXRwYXNzd29yZA==    # base64 encoded
  JWT_SECRET: bXlqd3RzZWNyZXQ=
```

Encode/decode base64:

```bash
echo -n "mysecretpassword" | base64    # Encode
echo "bXlzZWNyZXRwYXNzd29yZA==" | base64 -d  # Decode
```

#### Use Secret in Pod

```yaml
spec:
  containers:
    - name: app
      image: pratikjavale712/study-docker:v1

      # Load all secret keys as env vars
      envFrom:
        - secretRef:
            name: db-secret

      # Or load specific key
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: DB_PASSWORD
```

```bash
kubectl get secrets
kubectl describe secret db-secret
kubectl delete secret db-secret
```

---

## 11. Volumes & Persistent Storage

### emptyDir — Temporary Shared Storage

Lives as long as the Pod. Shared between containers in the same Pod.

```yaml
spec:
  containers:
    - name: app
      volumeMounts:
        - name: temp-storage
          mountPath: /app/tmp

  volumes:
    - name: temp-storage
      emptyDir: {}
```

### PersistentVolume (PV) & PersistentVolumeClaim (PVC)

For **data that must survive Pod restarts** (databases, uploads, etc.).

```
PersistentVolume (PV)        ← Actual storage (disk, EBS, NFS)
PersistentVolumeClaim (PVC)  ← Pod's request for storage
```

#### Step 1 — Create PersistentVolume

```yaml
# pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: my-pv
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce                  # One node can mount read/write
  persistentVolumeReclaimPolicy: Retain
  hostPath:
    path: /data/my-app               # For local/minikube (use EBS on AWS)
```

#### Step 2 — Create PersistentVolumeClaim

```yaml
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi                   # Request 2Gi from available PVs
```

#### Step 3 — Use PVC in Deployment

```yaml
spec:
  containers:
    - name: app
      volumeMounts:
        - name: app-storage
          mountPath: /app/data

  volumes:
    - name: app-storage
      persistentVolumeClaim:
        claimName: my-pvc            # Reference the PVC
```

```bash
kubectl apply -f pv.yaml
kubectl apply -f pvc.yaml
kubectl get pv
kubectl get pvc
```

### Access Modes

| Mode | Short | Description |
|------|-------|-------------|
| `ReadWriteOnce` | RWO | One node, read/write |
| `ReadOnlyMany` | ROX | Multiple nodes, read-only |
| `ReadWriteMany` | RWX | Multiple nodes, read/write |

---

## 12. Resource Requests & Limits

Tell Kubernetes how much CPU and memory each container needs.

```yaml
spec:
  containers:
    - name: app
      image: pratikjavale712/study-docker:v1
      resources:
        requests:                    # Minimum guaranteed resources
          memory: "128Mi"            # 128 Megabytes
          cpu: "250m"                # 250 millicores = 0.25 CPU
        limits:                      # Maximum allowed resources
          memory: "512Mi"
          cpu: "1000m"               # 1000m = 1 full CPU core
```

### CPU Units

```
1000m  = 1 CPU core
500m   = 0.5 CPU core
250m   = 0.25 CPU core
100m   = 0.1 CPU core
```

### Memory Units

```
128Mi  = 128 Mebibytes
256Mi  = 256 Mebibytes
1Gi    = 1 Gibibyte
```

### What Happens Without Limits?

- **No requests:** Scheduler can't place pods properly → unreliable scheduling
- **No limits:** A runaway container can consume all node resources → other pods crash (noisy neighbor problem)

> 💡 **Always set both requests and limits in production.**

---

## 13. Liveness & Readiness Probes

### Liveness Probe

Checks if the container is **alive**. If it fails, Kubernetes **restarts** the container.

### Readiness Probe

Checks if the container is **ready to serve traffic**. If it fails, Kubernetes **removes the pod from the Service's load balancer** (but does not restart it).

```yaml
spec:
  containers:
    - name: app
      image: pratikjavale712/study-docker:v1
      ports:
        - containerPort: 3000

      # Liveness Probe — is the app running?
      livenessProbe:
        httpGet:
          path: /health
          port: 3000
        initialDelaySeconds: 15      # Wait 15s before first check
        periodSeconds: 20            # Check every 20s
        timeoutSeconds: 5            # Fail if no response in 5s
        failureThreshold: 3          # Restart after 3 consecutive failures

      # Readiness Probe — is the app ready for traffic?
      readinessProbe:
        httpGet:
          path: /ready
          port: 3000
        initialDelaySeconds: 5       # Wait 5s (app starts faster)
        periodSeconds: 10
        timeoutSeconds: 3
        failureThreshold: 3
```

### Probe Types

```yaml
# HTTP GET (most common)
httpGet:
  path: /health
  port: 3000

# TCP Socket (checks if port is open)
tcpSocket:
  port: 3000

# Exec (runs a command inside container)
exec:
  command:
    - cat
    - /tmp/healthy
```

### Express.js Health Endpoints

```javascript
// /health — liveness check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// /ready — readiness check (check DB connection etc.)
app.get('/ready', async (req, res) => {
  try {
    await db.ping();                 // Check DB is reachable
    res.status(200).json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});
```

---

## 14. Horizontal Pod Autoscaler (HPA)

HPA automatically **scales the number of pods** based on CPU usage, memory, or custom metrics.

```
Low traffic  → 2 pods
High traffic → 10 pods  (auto-scaled up)
Low again    → 2 pods   (auto-scaled down)
```

### Prerequisites — Install Metrics Server

```bash
# On Minikube
minikube addons enable metrics-server

# On a regular cluster
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Create HPA

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: study-docker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: study-docker-deployment
  minReplicas: 2                     # Minimum pods
  maxReplicas: 10                    # Maximum pods
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70     # Scale up if avg CPU > 70%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80     # Scale up if avg memory > 80%
```

```bash
kubectl apply -f hpa.yaml
kubectl get hpa
kubectl describe hpa study-docker-hpa

# Watch HPA in real-time
kubectl get hpa -w
```

---

## 15. Ingress & Ingress Controller

**The Problem:** With LoadBalancer services, each service gets its own cloud load balancer (expensive). **Ingress** lets you use a single load balancer and route traffic based on URL paths or hostnames.

```
Internet
    ↓
LoadBalancer (1 IP, 1 cloud LB)
    ↓
Ingress Controller (Nginx)
    ↓ Routes based on rules ↓
/api    → api-service
/app    → frontend-service
/admin  → admin-service
```

### Step 1 — Install Nginx Ingress Controller

```bash
# On Minikube
minikube addons enable ingress

# On AWS EKS (using Helm)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx
```

### Step 2 — Create Ingress Resource

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: study-docker-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com           # Domain name
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80

          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
```

### TLS / HTTPS with Ingress

```yaml
spec:
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls-secret    # Contains TLS cert and key
  rules:
    - host: myapp.example.com
      ...
```

```bash
kubectl apply -f ingress.yaml
kubectl get ingress
kubectl describe ingress study-docker-ingress
```

---

## 16. StatefulSets

**Deployments** are for **stateless** apps (any pod is identical and replaceable).

**StatefulSets** are for **stateful** apps that need:
- Stable, unique pod names (`pod-0`, `pod-1`, `pod-2`)
- Stable network identity (consistent DNS)
- Ordered startup and shutdown
- Persistent storage per pod

**Use cases:** Databases (MongoDB, PostgreSQL, Redis, Kafka, Zookeeper)

```yaml
# statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongo
spec:
  serviceName: "mongo"              # Headless service name
  replicas: 3
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
        - name: mongo
          image: mongo:6
          ports:
            - containerPort: 27017
          volumeMounts:
            - name: mongo-data
              mountPath: /data/db

  volumeClaimTemplates:             # Each pod gets its own PVC
    - metadata:
        name: mongo-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 5Gi
```

Pods created: `mongo-0`, `mongo-1`, `mongo-2`

DNS: `mongo-0.mongo.default.svc.cluster.local`

```bash
kubectl apply -f statefulset.yaml
kubectl get statefulsets
kubectl get sts
```

---

## 17. DaemonSets

A **DaemonSet** ensures that **one pod runs on every node** in the cluster. When a new node is added, a pod is automatically created on it.

**Use cases:** Log collectors (Fluentd), monitoring agents (Prometheus Node Exporter), network plugins

```yaml
# daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      containers:
        - name: fluentd
          image: fluentd:v1.16
          volumeMounts:
            - name: varlog
              mountPath: /var/log

      volumes:
        - name: varlog
          hostPath:
            path: /var/log
```

```bash
kubectl apply -f daemonset.yaml
kubectl get daemonsets
kubectl get ds
```

---

## 18. Jobs & CronJobs

### Jobs — Run Once to Completion

A **Job** runs one or more pods and ensures they complete successfully. When the job finishes, the pods stop.

**Use cases:** Database migrations, data processing, batch scripts

```yaml
# job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
spec:
  completions: 1                     # Run until 1 pod succeeds
  parallelism: 1                     # Run 1 pod at a time
  backoffLimit: 3                    # Retry up to 3 times on failure
  template:
    spec:
      restartPolicy: OnFailure       # Required for Jobs
      containers:
        - name: migration
          image: pratikjavale712/study-docker:v1
          command: ["node", "migrate.js"]
          env:
            - name: DB_URI
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: DB_URI
```

```bash
kubectl apply -f job.yaml
kubectl get jobs
kubectl describe job db-migration
kubectl logs job/db-migration
```

### CronJobs — Scheduled Jobs

```yaml
# cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-report
spec:
  schedule: "0 9 * * *"             # Every day at 9:00 AM (cron syntax)
  concurrencyPolicy: Forbid         # Don't run if previous is still running
  successfulJobsHistoryLimit: 3     # Keep last 3 successful jobs
  failedJobsHistoryLimit: 1         # Keep last 1 failed job
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: reporter
              image: pratikjavale712/study-docker:v1
              command: ["node", "generate-report.js"]
```

### Cron Schedule Syntax

```
┌──────── Minute (0-59)
│ ┌────── Hour (0-23)
│ │ ┌──── Day of month (1-31)
│ │ │ ┌── Month (1-12)
│ │ │ │ ┌ Day of week (0-6, Sun=0)
│ │ │ │ │
* * * * *

Examples:
"0 9 * * *"       Every day at 9:00 AM
"*/5 * * * *"     Every 5 minutes
"0 0 1 * *"       First day of every month at midnight
"0 9 * * 1"       Every Monday at 9:00 AM
```

```bash
kubectl apply -f cronjob.yaml
kubectl get cronjobs
kubectl get cj
```

---

## 19. Helm — Kubernetes Package Manager

**Helm** is the package manager for Kubernetes. Instead of writing and managing many YAML files, Helm bundles them into a **Chart** — a reusable, configurable package.

```
npm (Node.js) = Helm (Kubernetes)
package.json  = Chart.yaml
node_modules  = installed charts
```

### Install Helm

```bash
# macOS
brew install helm

# Ubuntu
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify
helm version
```

### Common Helm Commands

```bash
# Add a chart repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx

# Update repos
helm repo update

# Search for charts
helm search repo mongodb
helm search repo nginx

# Install a chart
helm install my-mongo bitnami/mongodb

# Install with custom values
helm install my-mongo bitnami/mongodb \
  --set auth.rootPassword=secret123 \
  --set persistence.size=10Gi

# Install with a values file
helm install my-mongo bitnami/mongodb -f values.yaml

# List installed releases
helm list

# Upgrade a release
helm upgrade my-mongo bitnami/mongodb --set image.tag=6.0

# Rollback a release
helm rollback my-mongo 1

# Uninstall a release
helm uninstall my-mongo

# Show chart values
helm show values bitnami/mongodb
```

### Create Your Own Chart

```bash
# Create chart scaffold
helm create my-app-chart

# Structure created:
my-app-chart/
├── Chart.yaml          # Chart metadata
├── values.yaml         # Default values
├── charts/             # Sub-charts (dependencies)
└── templates/          # K8s YAML templates
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    └── _helpers.tpl
```

### values.yaml Example

```yaml
# values.yaml
replicaCount: 3

image:
  repository: pratikjavale712/study-docker
  tag: v1
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  host: myapp.example.com

resources:
  requests:
    memory: "128Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

```bash
# Install your chart
helm install study-docker ./my-app-chart

# Install with overrides
helm install study-docker ./my-app-chart --set replicaCount=5

# Lint chart
helm lint ./my-app-chart

# Dry run (see what would be applied)
helm install study-docker ./my-app-chart --dry-run
```

---

## 20. Deploying on AWS EKS

**Amazon EKS** (Elastic Kubernetes Service) is a managed Kubernetes service on AWS. AWS manages the control plane; you manage worker nodes.

### Step 1 — Install Required Tools

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region, Output format

# Install eksctl (EKS CLI)
brew install eksctl                  # macOS
# or
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
```

### Step 2 — Create EKS Cluster

```bash
# Create cluster (takes ~15 minutes)
eksctl create cluster \
  --name study-docker-cluster \
  --region ap-south-1 \
  --nodegroup-name standard-nodes \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 4 \
  --managed

# Verify cluster
kubectl get nodes
```

### Step 3 — Configure kubectl for EKS

```bash
aws eks update-kubeconfig \
  --region ap-south-1 \
  --name study-docker-cluster

# Verify
kubectl cluster-info
kubectl get nodes
```

### Step 4 — Create Namespace

```bash
kubectl create namespace production
```

### Step 5 — Create Secret for Docker Hub

```bash
kubectl create secret docker-registry dockerhub-secret \
  --docker-username=pratikjavale712 \
  --docker-password=YOUR_PASSWORD \
  --docker-email=your@email.com \
  -n production
```

### Step 6 — Deploy Application

```yaml
# eks-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: study-docker
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: study-docker
  template:
    metadata:
      labels:
        app: study-docker
    spec:
      imagePullSecrets:
        - name: dockerhub-secret      # Pull from private Docker Hub
      containers:
        - name: app
          image: pratikjavale712/study-docker:v1
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "128Mi"
              cpu: "250m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: study-docker-svc
  namespace: production
spec:
  type: LoadBalancer               # Creates AWS ELB automatically
  selector:
    app: study-docker
  ports:
    - port: 80
      targetPort: 3000
```

```bash
kubectl apply -f eks-deployment.yaml

# Watch pods come up
kubectl get pods -n production -w

# Get external load balancer URL
kubectl get svc -n production
# EXTERNAL-IP will show AWS ELB DNS name
```

### Step 7 — Delete Cluster (to avoid charges)

```bash
eksctl delete cluster --name study-docker-cluster --region ap-south-1
```

---

## 21. Full Production Example

A complete setup: Node.js app + MongoDB + Ingress in one set of YAML files.

```yaml
# ── 1. Namespace ─────────────────────────────────────
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
# ── 2. ConfigMap ─────────────────────────────────────
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  NODE_ENV: "production"
  PORT: "3000"
---
# ── 3. Secret ────────────────────────────────────────
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
  namespace: production
type: Opaque
data:
  MONGO_URI: bW9uZ29kYjovL2RiOjI3MDE3L215ZGI=   # base64
  JWT_SECRET: bXlqd3RzZWNyZXQ=
---
# ── 4. MongoDB StatefulSet ────────────────────────────
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongo
  namespace: production
spec:
  serviceName: mongo
  replicas: 1
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
        - name: mongo
          image: mongo:6
          ports:
            - containerPort: 27017
          volumeMounts:
            - name: mongo-data
              mountPath: /data/db
  volumeClaimTemplates:
    - metadata:
        name: mongo-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 5Gi
---
# ── 5. MongoDB Service (Headless) ─────────────────────
apiVersion: v1
kind: Service
metadata:
  name: mongo
  namespace: production
spec:
  clusterIP: None
  selector:
    app: mongo
  ports:
    - port: 27017
---
# ── 6. App Deployment ─────────────────────────────────
apiVersion: apps/v1
kind: Deployment
metadata:
  name: study-docker
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: study-docker
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: study-docker
    spec:
      containers:
        - name: app
          image: pratikjavale712/study-docker:v1
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: app-secret
          resources:
            requests:
              memory: "128Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
---
# ── 7. App Service ────────────────────────────────────
apiVersion: v1
kind: Service
metadata:
  name: study-docker-svc
  namespace: production
spec:
  selector:
    app: study-docker
  ports:
    - port: 80
      targetPort: 3000
---
# ── 8. HPA ────────────────────────────────────────────
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: study-docker-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: study-docker
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
---
# ── 9. Ingress ────────────────────────────────────────
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: study-docker-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: study-docker-svc
                port:
                  number: 80
```

```bash
# Deploy everything
kubectl apply -f production.yaml

# Watch all resources
kubectl get all -n production

# Watch pods
kubectl get pods -n production -w
```

---

## 22. Quick Reference Cheat Sheet

### Resource Short Names

| Resource | Short Name |
|----------|-----------|
| `pods` | `po` |
| `deployments` | `deploy` |
| `services` | `svc` |
| `replicasets` | `rs` |
| `statefulsets` | `sts` |
| `daemonsets` | `ds` |
| `configmaps` | `cm` |
| `namespaces` | `ns` |
| `persistentvolumes` | `pv` |
| `persistentvolumeclaims` | `pvc` |
| `horizontalpodautoscalers` | `hpa` |
| `cronjobs` | `cj` |
| `ingresses` | `ing` |

### Most-Used Commands

```bash
# Get
kubectl get pods / deploy / svc / cm / secret / pvc / hpa / ing

# Describe
kubectl describe pod my-pod
kubectl describe deploy my-app

# Apply & Delete
kubectl apply -f file.yaml
kubectl delete -f file.yaml

# Logs & Exec
kubectl logs -f pod-name
kubectl exec -it pod-name -- sh

# Scale
kubectl scale deploy my-app --replicas=5

# Rollout
kubectl rollout status deploy/my-app
kubectl rollout undo deploy/my-app
kubectl rollout history deploy/my-app

# Port forward
kubectl port-forward svc/my-svc 8080:80

# Namespace
kubectl get all -n production
kubectl apply -f file.yaml -n production
```

### YAML API Versions

| Kind | apiVersion |
|------|-----------|
| Pod, Service, ConfigMap, Secret, PV, PVC, Namespace | `v1` |
| Deployment, ReplicaSet, StatefulSet, DaemonSet | `apps/v1` |
| Job, CronJob | `batch/v1` |
| HorizontalPodAutoscaler | `autoscaling/v2` |
| Ingress | `networking.k8s.io/v1` |

### K8s Object Template Skeleton

```yaml
apiVersion: <version>
kind: <Kind>
metadata:
  name: <name>
  namespace: <namespace>
  labels:
    key: value
spec:
  # resource-specific spec here
```
