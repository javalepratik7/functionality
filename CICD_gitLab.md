# 🚀 GitLab CI/CD Deployment Guide

---

## 1. SSH Key Setup (EC2 → GitLab)

### Check existing SSH key on EC2

```bash
cat ~/.ssh/id_ed25519.pub
```

If the key doesn't exist, generate one:

```bash
ssh-keygen -t ed25519 -C "ec2-gitlab-deploy-key"
# Press ENTER for default path, leave passphrase empty
```

Copy the public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

### Add Deploy Key to GitLab

Go to: **GitLab → Repo → Settings → Repository → Deploy Keys**

- Title: `ec2-server`
- Key: paste the public key output
- Enable write access only if the pipeline needs to push

Test the connection:

```bash
ssh -T git@gitlab.com
# Expected: Welcome to GitLab, @username!
```

---

## 2. Group-Level CI/CD Variables

Go to: **GitLab → Group → Settings → CI/CD → Variables**

Set **Environment** to `All (default)` for each variable.

| Variable | Value |
|---|---|
| `BRANCH_PRODUCTION` | `main` |
| `DEPLOY_ENV_PRODUCTION` | `prod` |
| `EC2_IP_PRODUCTION` | `3.211.91.14` |
| `NGINX_SERVICE_NAME_PRODUCTION` | `nginx` |
| `SSH_KEY_PRODUCTION` | *(paste full private key including BEGIN/END lines)* |

> **Note:** For `SSH_KEY_PRODUCTION`, paste the full contents of `~/.ssh/id_ed25519` (private key) from your EC2 instance. Mark it as **Protected** and **Masked**.

---

## 3. Project-Level Setup

### Create Environment

Go to: **Project → Operate → Environments → New Environment**

- Name: `production`

---

### 3A. Frontend Variables

Go to: **Project → Settings → CI/CD → Variables**

| Variable | Example Value |
|---|---|
| `DOMAIN_NAME` | `npd-dashboard.ugbrands.in` |
| `ENV_FILE_PRODUCTION` | `VITE_API_BASE_URL=https://api.npd-dashboard.ugbrands.in/api/v1` |
| `ENV_SERVER_FILE_PATH_PRODUCTION` | `/home/ubuntu/ug-codebase/npd-dashbord/frontend/.env` |
| `NGINX_ROOT_PATH` | `/var/www/online-ops-inventory-frontend/` |
| `PROJECT_PATH_PRODUCTION` | `/home/ubuntu/ug-codebase/npd-dashbord/frontend` |

> **Note:** Get the exact paths using `pwd` inside the project directory on EC2. NGINX_ROOT_PATH also you can take help of `sudo cp -rf /home/ubuntu/ug-codebase/online-operations-inventory-dashboard/frontend/dist/* /var/www/online-ops-inventory-frontend/`

### Frontend `.gitlab-ci.yml`

```yaml
stages:
  - deploy

variables:
  NODE_VERSION: "22"

deploy_production:
  stage: deploy
  only:
    - main
    - master

  before_script:
    # Install SSH client
    - 'which ssh-agent || (apt-get update -y && apt-get install openssh-client -y)'

    # Setup SSH key
    - eval $(ssh-agent -s)
    - echo "$SSH_KEY_PRODUCTION" | tr -d '\r' | ssh-add -

    # Add EC2 to known hosts
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
    - ssh-keyscan -H "$EC2_IP_PRODUCTION" >> ~/.ssh/known_hosts

  script:
    - echo "🚀 Deploying frontend to EC2 via Nginx..."

    - |
      ssh -o StrictHostKeyChecking=no ubuntu@$EC2_IP_PRODUCTION "
        set -e

        echo '📁 Moving to project directory...'
        cd ${PROJECT_PATH_PRODUCTION}

        echo '🔄 Pulling latest code...'
        git fetch origin ${BRANCH_PRODUCTION}
        git reset --hard origin/${BRANCH_PRODUCTION}

        echo '🧹 Cleaning old build...'
        rm -rf dist

        node -v
        npm -v

        echo '📦 Installing dependencies...'
        npm ci

        echo '📝 Creating .env file...'
        echo \"$ENV_FILE_PRODUCTION\" > .env

        echo '🏗️ Building project...'
        npm run build

        echo '📂 Deploying to Nginx directory...'
        sudo rm -rf ${NGINX_ROOT_PATH}/*
        sudo cp -r dist/* ${NGINX_ROOT_PATH}/

        echo '🔄 Reloading Nginx...'
        sudo systemctl reload nginx

        echo '✅ Frontend deployed successfully!'
      "

  environment:
    name: production
    url: http://${DOMAIN_NAME}
```

---

### 3B. Backend Variables

Go to: **Project → Settings → CI/CD → Variables**

| Variable | Example Value |
|---|---|
| `BACKEND_PORT_PRODUCTION` | `5000` |
| `ENV_FILE_PRODUCTION` | `PORT=5000\nDB_HOST=127.0.0.1\n...` |
| `ENV_SERVER_FILE_PATH_PRODUCTION` | `/home/ubuntu/ug-codebase/npd-dashbord/backend/.env` |
| `PM2_APP_NAME_PRODUCTION` | `npd-dashbord-backend` |
| `PROJECT_PATH_PRODUCTION` | `/home/ubuntu/ug-codebase/npd-dashbord/backend` |

### Backend `.gitlab-ci.yml`

```yaml
stages:
  - precheck
  - deploy

# Backend runs on port 3028 (configured in .env file)

# ---------- PRECHECK STAGE ----------
check_env_variables:
  stage: precheck
  image: alpine:latest
  only:
    - main
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
  only:
    - main
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

## 4. EC2 Prerequisites Checklist

Before the pipeline runs, confirm these are set up on your EC2 instance:

- [ ] Node.js installed (`node -v`)
- [ ] PM2 installed globally (`pm2 -v`)
- [ ] Nginx installed and running (`sudo systemctl status nginx`)
- [ ] Project repo already cloned at the configured `PROJECT_PATH_PRODUCTION`
- [ ] Nginx root directory exists (`sudo mkdir -p /var/www/your-frontend-dir/`)
- [ ] `ubuntu` user has passwordless sudo for nginx reload and file copy (see note in frontend section)
- [ ] `.env` file permissions secured: `chmod 600 .env`

---

## 5. Architecture Overview

```
GitLab Push → CI/CD Pipeline → SSH into EC2 → Pull Code → Build → Deploy

Frontend:  git pull → npm ci → npm run build → copy dist → nginx reload
Backend:   git pull → npm ci → write .env → pm2 restart
```

## 6. Reference 
check all dist files
```
ls /var/www/
or
cd /var/www
```
in this you will see like 
```
html  npd-frontend  online-ops-inventory-frontend
```
our frontend folders which contains their path and in the folder contain dist files 
```
cd /var/www
cd online-ops-inventory-frontend/
ls
```
and this path is given to the nginx file for that domain 
```
cd /etc/nginx/sites-available/
```

you will get like 
```
api.npd-dashboard.ugbrands.in  api.online-ops-inventory-dashboard.ugbrands.in  default  npd-frontend  online-ops-inventory-dashboard.ugbrands.in
```
our all nginx setups and you can check in that nginx file 
```
nano npd-frontend
```
```
server {
    listen 80;
    server_name npd-dashboard.ugbrands.in;

    root /var/www/npd-frontend;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```
and with ssl certificate ( certbot ) it will looks like 
```
server {
    server_name npd-dashboard.ugbrands.in;

    root /var/www/npd-frontend;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # cache static assets
    location ~* \.(js|css|png|jpg|jpeg|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/npd-dashboard.ugbrands.in/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/npd-dashboard.ugbrands.in/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = npd-dashboard.ugbrands.in) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name npd-dashboard.ugbrands.in;
    return 404; # managed by Certbot


}
```
Check certbot
```
sudo ls /etc/letsencrypt/live/
```
