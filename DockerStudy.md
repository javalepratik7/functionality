# 🐳 Docker — Complete Concepts Guide

---

## 1. Docker Images & Containers

### What is a Docker Image?

A Docker **image** is a **read-only blueprint/template** used to create containers. Think of it like a class in OOP — it defines what the container will look like, but it's not running yet.

An image contains:
- OS base layer (e.g., `alpine`, `ubuntu`)
- Application code
- Dependencies & libraries
- Environment configuration

```bash
# Pull an image from Docker Hub
docker pull node:18-alpine

# List all local images
docker images
```

---

### What is a Docker Container?

A **container** is a **running instance of an image**. If an image is a class, a container is an object created from it. You can run multiple containers from the same image.

```
Image  →  Container
Class  →  Object
Recipe →  Cooked Dish
```

```bash
# Create and run a container from an image
docker run -d -p 3000:3000 --name my-app node:18-alpine

# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Stop a container
docker stop my-app

# Remove a container
docker rm my-app
```

---

### Key Differences

| | Image | Container |
|--|-------|-----------|
| State | Static (read-only) | Dynamic (running) |
| Stored | Docker Hub / locally | Locally (in memory) |
| Created by | `docker build` | `docker run` |
| Persists data | ❌ No | ❌ No (unless volume used) |

---

## 2. Version Control for Docker Images

Docker uses **tags** for versioning, similar to Git tags.

```bash
# Build with a version tag
docker build -t pratikjavale712/study-docker:v1 .
docker build -t pratikjavale712/study-docker:v2 .

# Tag latest
docker build -t pratikjavale712/study-docker:latest .

# Push a specific version
docker push pratikjavale712/study-docker:v1
docker push pratikjavale712/study-docker:v2

# Pull a specific version
docker pull pratikjavale712/study-docker:v1
```

### Tagging Strategy

```
pratikjavale712/study-docker:latest   ← always points to newest
pratikjavale712/study-docker:v1       ← stable release
pratikjavale712/study-docker:v2       ← new release
pratikjavale712/study-docker:1.0.0    ← semantic versioning
pratikjavale712/study-docker:dev      ← development build
```

> 💡 **Best Practice:** Never rely only on `latest` in production. Always use a fixed version tag (e.g., `v2` or `1.0.0`) so deployments are predictable and rollbacks are easy.

---

## 3. Dockerfile

A `Dockerfile` is a **text file with instructions** to build a Docker image. Each instruction creates a new layer in the image.

### Structure

```dockerfile
# 1. Base image
FROM node:18-alpine

# 2. Set working directory inside container
WORKDIR /app

# 3. Copy dependency files first (for caching)
COPY package*.json ./

# 4. Install dependencies
RUN npm install --omit=dev

# 5. Copy rest of the source code
COPY . .

# 6. Expose the port your app listens on
EXPOSE 3000

# 7. Command to run the app
CMD ["node", "server.js"]
```

### Key Instructions Explained

| Instruction | Purpose | Example |
|-------------|---------|---------|
| `FROM` | Base image to build on | `FROM node:18-alpine` |
| `WORKDIR` | Set working directory | `WORKDIR /app` |
| `COPY` | Copy files from host to container | `COPY . .` |
| `ADD` | Like COPY but supports URLs & tar extraction | `ADD app.tar.gz /app` |
| `RUN` | Execute command during build | `RUN npm install` |
| `CMD` | Default command when container starts | `CMD ["node", "server.js"]` |
| `ENTRYPOINT` | Fixed command (CMD becomes its args) | `ENTRYPOINT ["node"]` |
| `EXPOSE` | Document which port app uses | `EXPOSE 3000` |
| `ENV` | Set environment variables | `ENV NODE_ENV=production` |
| `ARG` | Build-time variables | `ARG VERSION=1.0` |

### CMD vs ENTRYPOINT

```dockerfile
# CMD — can be overridden at runtime
CMD ["node", "server.js"]
docker run my-app node other.js   # overrides CMD

# ENTRYPOINT — always runs, CMD becomes arguments
ENTRYPOINT ["node"]
CMD ["server.js"]
docker run my-app other.js        # runs: node other.js
```

---

## 4. Multi-Stage Builds

Multi-stage builds let you use **multiple FROM statements** in one Dockerfile. This is used to keep the final image small — you build in one stage and only copy the result to the final image.

### Without Multi-Stage (Problem)

```dockerfile
FROM node:18                  # Heavy image (~900MB)
WORKDIR /app
COPY . .
RUN npm install               # Dev dependencies included
RUN npm run build             # Build output in /app/dist
CMD ["node", "dist/server.js"]
# Final image: ~900MB+ (includes all build tools & dev deps)
```

### With Multi-Stage (Solution)

```dockerfile
# ──── Stage 1: Builder ────
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install               # Install everything (dev + prod)
COPY . .
RUN npm run build             # Build the app

# ──── Stage 2: Production ────
FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev    # Only production dependencies
COPY --from=builder /app/dist ./dist   # Copy ONLY the build output
EXPOSE 3000
CMD ["node", "dist/server.js"]
# Final image: ~150MB (no build tools, no dev deps)
```

### How It Works

```
Stage 1 (builder):   node:18 → install all deps → build app
                                                        ↓
                                                   /app/dist  ← only this is copied
                                                        ↓
Stage 2 (production): node:18-alpine → prod deps → /app/dist
```

> 💡 **Benefit:** Final image only contains what's needed to run the app — no compilers, no test libraries, no source code.

---

## 5. Image Layers

Every instruction in a Dockerfile creates a **new read-only layer**. Docker caches these layers, so unchanged layers are reused on rebuilds — making builds faster.

### How Layers Work

```dockerfile
FROM node:18-alpine        # Layer 1 — base OS + node
WORKDIR /app               # Layer 2 — set directory
COPY package*.json ./      # Layer 3 — package files
RUN npm install            # Layer 4 — node_modules
COPY . .                   # Layer 5 — source code
CMD ["node", "server.js"]  # Layer 6 — metadata only
```

```
┌──────────────────────────┐
│  Layer 6: CMD metadata   │  ← changes often
│  Layer 5: source code    │  ← changes often
│  Layer 4: node_modules   │  ← changes only when package.json changes
│  Layer 3: package files  │  ← rarely changes
│  Layer 2: WORKDIR        │  ← never changes
│  Layer 1: node:alpine    │  ← never changes
└──────────────────────────┘
```

### Layer Caching — Order Matters!

```dockerfile
# ❌ BAD — copies all files first, so npm install re-runs on every code change
COPY . .
RUN npm install

# ✅ GOOD — package.json copied first, npm install cached unless deps change
COPY package*.json ./
RUN npm install
COPY . .
```

> 💡 Put instructions that change **least often** at the top, and instructions that change **most often** at the bottom.

### Inspect Layers

```bash
docker history pratikjavale712/study-docker:v1
```

---

## 6. Docker Volumes

By default, containers are **stateless** — all data is lost when a container is removed. **Volumes** are the way to persist data beyond the container lifecycle.

### Types of Storage

| Type | Description | Use Case |
|------|-------------|---------|
| **Volume** | Managed by Docker, stored in Docker's area | Databases, persistent app data |
| **Bind Mount** | Maps a host directory to container | Local development (live code reload) |
| **tmpfs Mount** | Stored in host memory only | Sensitive data, temp files |

### Named Volumes (Recommended for Production)

```bash
# Create a volume
docker volume create mydata

# Use volume when running container
docker run -d \
  -v mydata:/app/data \
  --name my-app \
  pratikjavale712/study-docker:v1

# List volumes
docker volume ls

# Inspect a volume
docker volume inspect mydata

# Remove a volume
docker volume rm mydata
```

### Bind Mounts (Great for Development)

```bash
# Map current directory on host → /app in container
docker run -d \
  -v $(pwd):/app \
  -p 3000:3000 \
  --name my-app \
  pratikjavale712/study-docker:v1
```

> Any file change on your host is instantly reflected inside the container — no rebuild needed.

### In Docker Compose

```yaml
services:
  app:
    image: pratikjavale712/study-docker:v1
    volumes:
      - mydata:/app/data          # named volume
      - ./logs:/app/logs          # bind mount

volumes:
  mydata:                         # declare named volume
```

---

## 7. Docker Networking

Docker networking allows containers to **communicate with each other** and with the outside world.

### Network Types

| Type | Description | Use Case |
|------|-------------|---------|
| `bridge` | Default network; containers communicate by name | Most apps |
| `host` | Container shares host's network stack | Performance-critical apps |
| `none` | No network access | Isolated containers |
| `overlay` | Multi-host networking (Docker Swarm) | Distributed systems |

### Default Bridge Network

When you run a container without specifying a network, it joins the default `bridge` network. Containers on this network **cannot** reach each other by name — only by IP.

```bash
docker run -d --name app1 node:18-alpine
docker run -d --name app2 node:18-alpine
# app2 CANNOT reach app1 by name on default bridge
```

### Custom Bridge Network (Recommended)

On a **user-defined bridge network**, containers can reach each other using their **container name as hostname**.

```bash
# Create a custom network
docker network create my-network

# Run containers on the same network
docker run -d --name app --network my-network pratikjavale712/study-docker:v1
docker run -d --name db  --network my-network mongo:6

# Now "app" can connect to "db" using hostname: db
# e.g., mongodb://db:27017
```

### Useful Network Commands

```bash
docker network ls                        # List all networks
docker network inspect my-network        # Inspect a network
docker network connect my-network app    # Connect running container to network
docker network disconnect my-network app # Disconnect container from network
docker network rm my-network             # Remove a network
```

### Port Mapping

```bash
# HOST_PORT:CONTAINER_PORT
docker run -p 8080:3000 my-app
# Access app on localhost:8080 → routed to container's port 3000
```

---

## 8. Docker Compose

Docker Compose lets you **define and run multi-container applications** using a single `docker-compose.yml` file. Instead of running multiple `docker run` commands, you define everything in one place.

### Example: Node.js + MongoDB + Nginx

```yaml
# docker-compose.yml

version: "3.9"

services:

  # ── App Container ──
  app:
    build: .                                  # Build from local Dockerfile
    container_name: study-docker-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://db:27017/mydb
    depends_on:
      - db
    networks:
      - app-network
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  # ── Database Container ──
  db:
    image: mongo:6
    container_name: study-docker-db
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db                  # Persist database data
    networks:
      - app-network
    restart: unless-stopped

  # ── Reverse Proxy ──
  nginx:
    image: nginx:alpine
    container_name: study-docker-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app
    networks:
      - app-network
    restart: unless-stopped

networks:
  app-network:
    driver: bridge

volumes:
  mongo-data:
```

### Common Docker Compose Commands

```bash
# Start all services (detached)
docker compose up -d

# Start and rebuild images
docker compose up -d --build

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# View logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f app

# List running services
docker compose ps

# Run a command inside a service
docker compose exec app sh

# Restart a single service
docker compose restart app
```

### Compose vs Manual `docker run`

| Task | docker run | docker compose |
|------|-----------|---------------|
| Start 3 containers | 3 separate commands | `docker compose up` |
| Networking | Manual setup | Auto-created |
| Volumes | Manual flags | Defined in YAML |
| Env variables | `-e` flags | `environment:` block |
| Restart on crash | `--restart` flag | `restart:` key |

---

## 9. Container Optimization

Optimizing containers means: **smaller image size**, **faster builds**, and **less resource usage**.

### 1. Use Alpine Base Images

```dockerfile
# ❌ Heavy
FROM node:18         # ~900MB

# ✅ Lightweight
FROM node:18-alpine  # ~180MB
```

### 2. Use Multi-Stage Builds

(Covered in Section 4 — removes build tools from final image)

### 3. Minimize Layers

```dockerfile
# ❌ 3 separate layers
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get clean

# ✅ 1 layer (chained with &&)
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### 4. Use `.dockerignore`

```
node_modules
.git
.env
*.log
dist
coverage
.DS_Store
```

This prevents unnecessary files from being sent to the Docker build context, speeding up builds.

### 5. Don't Run as Root

```dockerfile
# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Switch to that user
USER appuser

CMD ["node", "server.js"]
```

### 6. Set Resource Limits

```bash
docker run -d \
  --memory="512m" \       # Max 512MB RAM
  --cpus="1.0" \          # Max 1 CPU core
  --name my-app \
  pratikjavale712/study-docker:v1
```

In Docker Compose:

```yaml
services:
  app:
    image: pratikjavale712/study-docker:v1
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
```

### 7. Use Specific Package Versions

```dockerfile
# ❌ Unpredictable
RUN npm install

# ✅ Reproducible, uses lockfile
RUN npm ci --omit=dev
```

---

## 10. Healthchecks

A **healthcheck** tells Docker how to verify that your container is **actually working** — not just running. Docker uses this to mark containers as `healthy` or `unhealthy`.

### Add Healthcheck in Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY . .
RUN npm ci --omit=dev

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s \     # Check every 30 seconds
            --timeout=10s \      # Fail if no response within 10s
            --start-period=15s \ # Wait 15s before first check (app startup time)
            --retries=3 \        # Mark unhealthy after 3 consecutive failures
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

### Add Healthcheck in Docker Compose

```yaml
services:
  app:
    image: pratikjavale712/study-docker:v1
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      start_period: 15s
      retries: 3
```

### Add a `/health` Endpoint in Your App

```javascript
// Express.js example
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});
```

### Check Container Health Status

```bash
docker ps
# STATUS column shows: healthy / unhealthy / starting

docker inspect --format='{{.State.Health.Status}}' study-docker
# Output: healthy
```

### Healthcheck Status Flow

```
Container starts
      ↓
  starting  (during start_period)
      ↓
  healthy   ← all checks pass
      ↓
  unhealthy ← retries exceeded (Docker can auto-restart if restart policy set)
```

> 💡 Always add a `/health` endpoint to your API and a matching `HEALTHCHECK` in your Dockerfile. This is essential for production reliability and works seamlessly with Docker Compose, AWS ECS, and Kubernetes.

---

## 📚 Quick Reference Cheat Sheet

```bash
# Images
docker build -t name:tag .          # Build image
docker images                       # List images
docker pull name:tag                # Pull from Docker Hub
docker push name:tag                # Push to Docker Hub
docker rmi name:tag                 # Remove image
docker image prune -a               # Remove unused images
docker history name:tag             # View image layers

# Containers
docker run -d -p 3000:3000 name     # Run container
docker ps                           # List running
docker ps -a                        # List all
docker stop name                    # Stop container
docker start name                   # Start container
docker restart name                 # Restart container
docker rm -f name                   # Force remove
docker logs -f name                 # Stream logs
docker exec -it name sh             # Enter container

# Volumes
docker volume create vol            # Create volume
docker volume ls                    # List volumes
docker volume rm vol                # Remove volume

# Networks
docker network create net           # Create network
docker network ls                   # List networks
docker network inspect net          # Inspect network

# Docker Compose
docker compose up -d                # Start all services
docker compose up -d --build        # Start with rebuild
docker compose down                 # Stop all services
docker compose down -v              # Stop + remove volumes
docker compose logs -f              # Stream all logs
docker compose ps                   # List services
```
