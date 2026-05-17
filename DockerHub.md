# 🐳 Docker Hub — Deploy Project on EC2

A complete step-by-step guide to build, push, and deploy your Docker project on an AWS EC2 instance.

---

## 📋 Prerequisites

- Docker installed on your local machine
- AWS EC2 instance (Ubuntu) running
- Docker Hub account (`pratikjavale712`)
- EC2 `.pem` key file for SSH access

---

## PART 1 — Local Machine: Build & Push Image

### Step 1 — Verify Docker Installation

```bash
docker --version
docker info
```

---

### Step 2 — Login to Docker Hub

```bash
docker login -u pratikjavale712
```

Enter your Docker Hub **password** or **Personal Access Token (PAT)** when prompted.

If successful:

```
Login Succeeded
```

Verify login:

```bash
cat ~/.docker/config.json
```

---

### Step 3 — Create Dockerfile

In your project root, create a `Dockerfile`:

```bash
nano Dockerfile
```

Example for a Node.js app:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

> ⚠️ Replace `server.js` with your actual entry file and `3000` with your app's port.

---

### Step 4 — Create `.dockerignore`

```bash
nano .dockerignore
```

Add the following:

```
node_modules
.git
.env
npm-debug.log
```

---

### Step 5 — Build Docker Image

```bash
docker build -t pratikjavale712/study-docker:v1 .
```

| Part | Meaning |
|------|---------|
| `docker build` | Build the Docker image |
| `-t` | Tag the image |
| `pratikjavale712/study-docker` | Docker Hub repository name |
| `v1` | Image version/tag |
| `.` | Use current directory as build context |

Verify the image was created:

```bash
docker images
```

Expected output:

```
REPOSITORY                        TAG    IMAGE ID      CREATED
pratikjavale712/study-docker     v1     xxxxxxxxx     1 minute ago
```

---

### Step 6 — Push Image to Docker Hub

```bash
docker push pratikjavale712/study-docker:v1
```

If successful:

```
v1: digest: sha256:xxxxxxxx size: xxxx
```

Verify on Docker Hub: [https://hub.docker.com](https://hub.docker.com) → Go to `study-docker` repo → You should see tag `v1`.

---

## PART 2 — EC2 Server: Pull & Run Container

### Step 1 — SSH into EC2

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

> 💡 Replace `your-key.pem` with your actual key file path and `YOUR_EC2_PUBLIC_IP` with your instance's public IP.

---

### Step 2 — Install Docker on EC2 (if not installed)

```bash
sudo apt update
sudo apt install docker.io -y
```

Start and enable Docker:

```bash
sudo systemctl start docker
sudo systemctl enable docker
```

Verify installation:

```bash
docker --version
```

> ⚠️ If you get a permission error when running Docker commands, add your user to the docker group:
> ```bash
> sudo usermod -aG docker ubuntu
> newgrp docker
> ```

---

### Step 3 — Login to Docker Hub on EC2

```bash
docker login -u pratikjavale712
```

Enter your password or PAT when prompted.

---

### Step 4 — Pull Docker Image

```bash
docker pull pratikjavale712/study-docker:v1
```

Verify the image was pulled:

```bash
docker images
```

---

### Step 5 — Run Docker Container

```bash
docker run -d \
  -p 3000:3000 \
  --name study-docker \
  pratikjavale712/study-docker:v1
```

| Flag | Meaning |
|------|---------|
| `-d` | Run container in background (detached mode) |
| `-p 3000:3000` | Map EC2 port 3000 → container port 3000 |
| `--name study-docker` | Assign a name to the container |

---

### Step 6 — Check Running Container

```bash
docker ps
```

---

### Step 7 — Check Container Logs

```bash
docker logs study-docker
```

Live/streaming logs:

```bash
docker logs -f study-docker
```

---

### Step 8 — Open Security Group Port in AWS Console

To make your app accessible from the internet:

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2)
2. Navigate to **Security Groups**
3. Select the security group attached to your EC2
4. Click **Inbound Rules** → **Edit Inbound Rules**
5. Add a new rule:

| Field | Value |
|-------|-------|
| Type | Custom TCP |
| Port Range | `3000` |
| Source | `0.0.0.0/0` |

6. Click **Save rules**

---

### Step 9 — Access Your App

Open in your browser:

```
http://YOUR_EC2_PUBLIC_IP:3000
```

---

## PART 3 — Update Application (New Version)

When you make code changes and want to deploy a new version:

### Step 1 — Build New Image (Local Machine)

```bash
docker build -t pratikjavale712/study-docker:v2 .
```

### Step 2 — Push New Image

```bash
docker push pratikjavale712/study-docker:v2
```

### Step 3 — SSH into EC2 and Pull New Image

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
docker pull pratikjavale712/study-docker:v2
```

### Step 4 — Stop and Remove Old Container

```bash
docker stop study-docker
docker rm study-docker
```

### Step 5 — Run New Container

```bash
docker run -d \
  -p 3000:3000 \
  --name study-docker \
  pratikjavale712/study-docker:v2
```

---

## 📌 Useful Docker Commands

### Container Management

| Command | Description |
|---------|-------------|
| `docker ps` | List running containers |
| `docker ps -a` | List all containers (including stopped) |
| `docker stop study-docker` | Stop a running container |
| `docker start study-docker` | Start a stopped container |
| `docker restart study-docker` | Restart a container |
| `docker rm -f study-docker` | Force remove a container |
| `docker logs study-docker` | View container logs |
| `docker logs -f study-docker` | Stream live logs |
| `docker exec -it study-docker sh` | Enter a running container |

### Image Management

| Command | Description |
|---------|-------------|
| `docker images` | List all local images |
| `docker rmi pratikjavale712/study-docker:v1` | Remove a specific image |
| `docker image prune -a` | Remove all unused images |
| `docker container prune` | Remove all stopped containers |

---

## 🔄 CI/CD Flow Overview

```
Developer Pushes Code
        ↓
  GitHub Actions
        ↓
   Build Image
        ↓
  Push to Docker Hub
        ↓
  EC2 Pull Latest Image
        ↓
  Restart Container
```

---

## 🚀 Recommended Production Setup

| Component | Tool |
|-----------|------|
| CI/CD | GitHub Actions |
| Image Registry | Docker Hub |
| Hosting | AWS EC2 |
| Reverse Proxy | Nginx |
| SSL | Certbot (Let's Encrypt) |
| Logs | AWS CloudWatch |
| Multi-app | Docker Compose |

---

> 💡 **Tip:** For production, consider using Docker Compose to manage multi-container apps (e.g., app + database + Nginx) with a single `docker-compose.yml` file.
