# 🔄 GitLab CI/CD Setup Guide — UG Codebase

This guide covers setting up **automated deployments** for both Frontend and Backend projects using GitLab CI/CD pipelines.

---

## 📋 Overview

When code is pushed to `main`, GitLab CI/CD will automatically:
- SSH into the EC2 server
- Pull the latest code
- Install dependencies & build
- Restart the PM2 process

---

## 🌍 Part 1 — Create Deployment Environment in GitLab

This links your CI/CD pipeline to a named environment (e.g., `production`).

### Steps:

1. Go to **`urbangabru-tech-group`**
2. Open your project (e.g., `ecom-po → frontend`)
3. In the left sidebar → **Operate → Environments**
4. Click **New environment**
5. Set name as `production` → Click **Save**

> Repeat this for both Frontend and Backend repos.

---

## 🔐 Part 2 — Add CI/CD Variables in GitLab

These variables are used inside `.gitlab-ci.yml` and are kept secret (not committed to code).

### Where to add:

1. Go to **`urbangabru-tech-group-2 → po-dashbord → backend`** (or frontend)
2. Left sidebar → **Settings → CI/CD**
3. Expand **Variables** section
4. Click **Add variable** for each one below

---

### Variables to add — Backend

| Variable Name | Example Value | Notes |
|---|---|---|
| `PROJECT_PATH_PRODUCTION` | `/home/ubuntu/ug-codebase/po-dashboard/backend` | From `pwd` in backend folder |
| `PM2_APP_NAME_PRODUCTION` | `po-dashboard-backend` | Must match the name used in `pm2 start` |
| `BACKEND_PORT_PRODUCTION` | `3032` | Port backend runs on |
| `ENV_FILE_PRODUCTION` | *(paste full .env file content)* | Masked, protected |
| `ENV_SERVER_FILE_PATH_PRODUCTION` | `/home/ubuntu/ug-codebase/po-dashboard/backend/.env` | Full path to .env on server |
| `BRANCH_PRODUCTION` | `main` | Branch to deploy from |
| `EC2_IP_PRODUCTION` | `34.228.123.37` | Your EC2 public IP |
| `SSH_KEY_PRODUCTION` | *(paste private .pem key content)* | Set as **File** type, masked |

---

### Variables to add — Frontend

| Variable Name | Example Value | Notes |
|---|---|---|
| `PROJECT_PATH_PRODUCTION` | `/home/ubuntu/ug-codebase/po-dashboard/frontend` | From `pwd` in backend folder |
| `PM2_APP_NAME_PRODUCTION` | `po-dashboard-frontend` | Must match the name used in `pm2 start` |
| `BACKEND_PORT_PRODUCTION` | `3033` | Port backend runs on |
| `ENV_FILE_PRODUCTION` | *(paste full .env file content)* | Masked, protected |
| `ENV_SERVER_FILE_PATH_PRODUCTION` | `/home/ubuntu/ug-codebase/po-dashboard/frontend/.env` | Full path to .env on server |
| `EC2_IP_PRODUCTION` | `34.228.123.37` | Same EC2 IP |]
| `PM2_APP_NAME_PRODUCTION` | `po-dashboard-frontend` | Must match the name used in `pm2 start` |
| `BRANCH_PRODUCTION` | `main` | Branch to deploy from |

> 💡 **How to get PROJECT_PATH_PRODUCTION:** SSH into EC2, `cd` into the project folder, and run `pwd`. Copy the output.

---

## 📄 Part 3 — Frontend CI/CD Files

Add these **two files** to the root of your **Frontend repo**:

---

### File 1: `.gitlab-ci.yml`

```yaml
stages:
  - deploy

variables:
  NODE_VERSION: "22"
  # Frontend runs on port 3027 (configured in vite.config.js and PM2_APP_NAME_PRODUCTION environment variable)

deploy_production:
  stage: deploy
  only:
    - main
    - master

  before_script:
    # Install SSH client if missing
    - 'which ssh-agent || (apt-get update -y && apt-get install openssh-client -y)'

    # Start SSH agent and add private key
    - eval $(ssh-agent -s)
    - echo "$SSH_KEY_PRODUCTION" | tr -d '\r' | ssh-add -

    # Setup known hosts for EC2
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
    - ssh-keyscan -H "$EC2_IP_PRODUCTION" >> ~/.ssh/known_hosts

  script:
    - echo "🚀 Deploying production build to EC2..."
    - |
      ssh -o StrictHostKeyChecking=no ubuntu@$EC2_IP_PRODUCTION "
        export NVM_DIR=~/.nvm &&
        source ~/.nvm/nvm.sh &&
        nvm use ${NODE_VERSION} &&
        cd ${PROJECT_PATH_PRODUCTION} &&
        echo '🔄 Pulling latest code...' &&
        git fetch origin ${BRANCH_PRODUCTION} &&
        git reset --hard origin/${BRANCH_PRODUCTION} &&
        echo '📦 Installing dependencies...' &&
        npm ci &&
        echo '🏗️  Building production files...' &&
        npm run build &&
        echo '🚦 Restarting frontend using PM2...' &&
        pm2 restart ${PM2_APP_NAME_PRODUCTION} || pm2 serve dist ${FRONTEND_PORT_PRODUCTION} --name ${PM2_APP_NAME_PRODUCTION} --spa &&
        pm2 save &&
        echo '✅ Deployment complete!'
      "

  environment:
    name: production
    url: http://${EC2_IP_PRODUCTION}:${FRONTEND_PORT_PRODUCTION}
```

---

### File 2: `script-frontend.sh`

```bash
frontend_deploy:
  stage: deploy
  image: alpine:3.18
  before_script:
    - apk add --no-cache openssh-client
    - mkdir -p ~/.ssh
    - echo "$SSH_KEY_PRODUCTION" > ~/.ssh/deploy_key
    - chmod 600 ~/.ssh/deploy_key
  script:
    - scp -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no script-frontend.sh ubuntu@${EC2_IP_PRODUCTION}:/tmp/deploy_frontend.sh
    - ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no ubuntu@${EC2_IP_PRODUCTION} "bash /tmp/deploy_frontend.sh"
  only:
    - main
  environment:
    name: production
```

---

## 📄 Part 4 — Backend CI/CD Files

Add these **two files** to the root of your **Backend repo**:

---

### File 1: `.gitlab-ci.yml`

```yaml
stages:
  - precheck
  - deploy

# Backend runs on port 3028 (configured in .env file)

# ---------- PRECHECK STAGE ----------
check_env_variables:
  stage: precheck
  image: alpine:latest
  environment: production
  script:
    - echo "Checking required CI/CD environment variables..."
    - test -n "$EC2_IP_PRODUCTION"
    - test -n "$SSH_KEY_PRODUCTION"
    - test -n "$PROJECT_PATH_PRODUCTION"
    - test -n "$PM2_APP_NAME_PRODUCTION"
    - test -n "$BACKEND_PORT_PRODUCTION"
    - echo "✅ All required variables exist."

check_lock_file:
  stage: precheck
  image: node:22
  environment: production
  script:
    - echo "Checking for lock file..."
    - if [ ! -f "package-lock.json" ] && [ ! -f "yarn.lock" ]; then echo "❌ No lock file found!"; exit 1; fi
    - echo "✅ Lock file exists."

# ---------- DEPLOYMENT STAGE ----------
deploy_backend_production:
  stage: deploy
  image: node:22
  environment: production
  only:
    - main
  before_script:
    - echo "Setting up SSH..."
    - mkdir -p ~/.ssh
    - echo "$SSH_KEY_PRODUCTION" > ~/.ssh/id_rsa
    - chmod 600 ~/.ssh/id_rsa
    - ssh-keyscan -H "$EC2_IP_PRODUCTION" >> ~/.ssh/known_hosts
  script:
    - |
      ssh -i ~/.ssh/id_rsa ubuntu@$EC2_IP_PRODUCTION "
        echo '🚀 Starting backend deployment...';

        cd $PROJECT_PATH_PRODUCTION || exit 1;

        echo '📦 Fetching latest code...';
        git fetch origin $BRANCH_PRODUCTION && git reset --hard origin/$BRANCH_PRODUCTION;

        echo '🔧 Setting environment variables...';
        echo '$ENV_FILE_PRODUCTION' > .env;

        echo '📦 Installing dependencies...';
        npm ci --omit=dev;

        echo '♻️ Restarting PM2 app...';
        pm2 restart $PM2_APP_NAME_PRODUCTION || pm2 start server.js --name $PM2_APP_NAME_PRODUCTION

        echo '✅ Backend deployed successfully on port $BACKEND_PORT_PRODUCTION';
      "
  needs:
    - check_env_variables
    - check_lock_file
```

---

### File 2: `script-backend.sh`

```bash#!/usr/bin/env bash
#!/usr/bin/env bash
set -euo pipefail

# This script is uploaded by CI to the remote EC2 host and executed there.
# Environment variables should be set by CI/CD pipeline

REPO_URL="${REPO_URL:-}"
PROJECT_DIR="${PROJECT_DIR:-}"
BRANCH="${GIT_BRANCH:-main}"

if [ -z "$REPO_URL" ] || [ -z "$PROJECT_DIR" ]; then
  echo "Error: REPO_URL and PROJECT_DIR must be set"
  exit 1
fi

echo "Running remote bootstrap script"

mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

if [ -d .git ]; then
  echo "Existing repo found. Fetching and resetting to origin/${BRANCH}"
  git fetch origin
  git reset --hard origin/${BRANCH}
  git clean -fd
else
  echo "Cloning repository ${REPO_URL} into ${PROJECT_DIR}"
  git clone --branch ${BRANCH} ${REPO_URL} .
fi

echo "Installing node and npm if missing (apt-get assumed)."
if ! command -v node >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    echo "No apt-get found. Ensure node is installed manually."
  fi
fi

echo "Installing dependencies (production)..."
npm ci --production || npm install --production

echo "Ensuring pm2 is installed..."
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

echo "Starting or reloading app via pm2"
if pm2 describe "${PM2_APP_NAME}" >/dev/null 2>&1; then
  pm2 reload "${PM2_APP_NAME}" || pm2 restart "${PM2_APP_NAME}"
else
  pm2 start server.js --name "${PM2_APP_NAME}"
fi
pm2 save

echo "Remote bootstrap finished."
```

---

## 🗂️ Final File Structure

Your repos should look like this after adding CI/CD files:

```
frontend/
├── .gitlab-ci.yml        ← CI/CD pipeline config
├── script-frontend.sh    ← Deploy script uploaded to EC2
├── src/
├── public/
├── package.json
└── vite.config.js

backend/
├── .gitlab-ci.yml        ← CI/CD pipeline config
├── script-backend.sh     ← Bootstrap script for EC2
├── index.js / server.js
├── package.json
└── .env                  ← Never commit this!
```

---

## ▶️ Part 5 — How to Trigger a Deployment

Once CI/CD is set up, deployments are **automatic**:

```
Push to main branch → GitLab detects push → Pipeline starts → EC2 is updated automatically
```

To monitor a running pipeline:
1. Go to your GitLab repo
2. Left sidebar → **Build → Pipelines**
3. Click on the latest pipeline to see live logs

---

## 🛠️ Troubleshooting CI/CD

### ❌ Pipeline fails at SSH step
- Check that `SSH_KEY_PRODUCTION` variable is set correctly
- The key must be the **private key** (contents of your `.pem` file)
- Make sure it's set as type **Variable** (not File) — or File, consistently with how the pipeline reads it

### ❌ `Permission denied (publickey)`
- The public key for the EC2 instance must be in `~/.ssh/authorized_keys` on the server
- Run on EC2: `cat ~/.ssh/authorized_keys` to verify

### ❌ `pm2: command not found` on EC2
- nvm-installed pm2 may not be in PATH during SSH sessions
- Add to the SSH command: `export NVM_DIR=~/.nvm && source ~/.nvm/nvm.sh &&` before `pm2`

### ❌ `git reset --hard` fails
- The EC2 server may have local uncommitted changes (e.g., a manually edited `.env`)
- The `.env` file must not be tracked by git — confirm `.gitignore` includes `.env`

### ❌ Variables not found in pipeline
- Go to **Settings → CI/CD → Variables** and confirm all required variables are saved
- Check that variable names match exactly (case-sensitive)

### ❌ `npm ci` fails
- `package-lock.json` is missing from the repo
- Run `npm install` locally, commit `package-lock.json`, and push

---

## 📎 Notes

- **Never commit `.env` files** — add `.env` to `.gitignore` in both repos
- `ENV_FILE_PRODUCTION` stores the full contents of `.env` as a CI/CD variable — this is how the pipeline writes the `.env` file on the server during deploy
- `git reset --hard origin/main` is used instead of `git pull` to avoid merge conflicts on the server
- `pm2 save` is called after every restart to persist the process list across server reboots
- Backend runs 2 stages: **precheck** (validates variables + lock file) then **deploy** — frontend skips precheck for speed

---

✔ **CI/CD setup complete! Pushes to `main` will now auto-deploy.**
