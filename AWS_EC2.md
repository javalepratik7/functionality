# 🚀 AWS EC2 + Nginx + Node.js + React Deployment Guide (Production Ready)

This document explains how to deploy a **Node.js backend** and **React frontend** on AWS EC2 using PM2, Nginx, SSH keys, GitLab private repo access, domain mapping, and SSL (HTTPS) with Certbot.

---

# 🧱 1. AWS CONSOLE SETUP (EC2)

## Step 1: Launch EC2 Instance

1. Go to AWS Console → EC2
2. Click **Launch Instance**
3. Configure:

   * Name: `npd-backend-server`
   * OS: Ubuntu 22.04 LTS
   * Instance Type: `t3.micro` / `t3.small`

---

## Step 2: SSH KEY PAIR (AWS LOGIN KEY)

### Create Key in AWS:

* Key type: RSA
* Format: `.pem`
* Download file

### Set permissions:

```bash
chmod 400 your-key.pem
```

### Connect to server:

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
ssh -i urbangabru-prod-server-2.pem ubuntu@54.235.232.237
```

---

## Step 3: Security Group Rules

| Type   | Port | Source    |
| ------ | ---- | --------- |
| SSH    | 22   | My IP     |
| HTTP   | 80   | 0.0.0.0/0 |
| HTTPS  | 443  | 0.0.0.0/0 |
| Custom | 5000 | localhost |

---

# 🔗 2. SERVER LOGIN

```bash
ssh -i your-key.pem ubuntu@54.235.232.237
```

---

# ⚙️ 3. BASIC SERVER SETUP

```bash
sudo apt update -y
sudo apt upgrade -y
sudo apt install git nginx curl -y
```

Install Node.js:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y
```

Install PM2:

```bash
sudo npm install -g pm2
```

---

# 🔐 4. GITLAB PRIVATE REPO ACCESS (SSH KEY SETUP)

## Step 1: Generate SSH key on EC2

```bash
ssh-keygen -t ed25519 -C "ec2-gitlab-key"
```

Press ENTER for default path:

```
/home/ubuntu/.ssh/id_ed25519
```

Leave passphrase empty (recommended for servers)

---

## Step 2: Copy public key

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy output

---

## Step 3: Add to GitLab

Go to:

```
GitLab → Repo → Settings → Deploy Keys
```

Add:

* Title: `ec2-server`
* Key: paste public key
* Enable: ✔ Allow write access (only if needed)

---

## Step 4: Test GitLab connection

```bash
ssh -T git@gitlab.com
```

Expected:

```
Welcome to GitLab
```

---

## Step 5: Clone private repo

```bash
git clone git@gitlab.com:your-group/your-repo.git
```

✔ No password required anymore

---

# 📦 5. PROJECT SETUP (BACKEND)

```bash
mkdir -p ~/ug-codebase
cd ~/ug-codebase
git clone git@gitlab.com:your-repo/backend.git
cd backend
npm install
```

---

# ⚙️ 6. ENV FILE

```bash
nano .env
```

Example:

```env
PORT=5000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=npd_dashboard
```

Secure the file:

```bash
chmod 600 .env
```

---

# 🧪 7. TEST APPLICATION

```bash
npm run migrate
node server.js
```

---

# 🔥 8. PM2 SETUP

```bash
pm2 start server.js --name npd-backend
pm2 save
pm2 startup
```

Run the suggested `sudo` command shown after `pm2 startup`

---

# 🌐 9. NGINX SETUP — BACKEND

```bash
sudo nano /etc/nginx/sites-available/api.npd-dashboard.ugbrands.in
```

```nginx
server {
    listen 80;
    server_name api.npd-dashboard.ugbrands.in;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/api.npd-dashboard.ugbrands.in /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```
IF sudo nginx -t shows Error
```
cat etc/nginx/sites-enabled/npd-tracker.ugbrands.in
and if instade of space othere present to remove it use
sudo sed -i 's/\xC2\xA0/ /g' /etc/nginx/sites-enabled/npd-tracker.ugbrands.in  
```

---

# 🖥️ 10. FRONTEND DEPLOYMENT (React Build + Nginx)

## Step 1: Clone Frontend Repo

```bash
cd /var/www
sudo git clone git@gitlab.com:your-repo/online-ops-inventory-frontend.git
cd online-ops-inventory-frontend
ls
```

> 💡 If you see `package.json`, you're in the right place.

---

## Step 2: Install Dependencies

```bash
sudo npm install
```

---

## Step 3: Set Frontend ENV (if needed)

```bash
sudo nano .env
```

Example:

```env
REACT_APP_API_URL=https://api.npd-dashboard.ugbrands.in
```

---

## Step 4: Build the React App

```bash
sudo npm run build
```

This creates a `build/` folder with static files.

---

## Step 5: Copy Build to Web Root

```bash
sudo mkdir -p /var/www/npd-frontend
sudo cp -r build/* /var/www/npd-frontend/
```

Set correct permissions so Nginx can read files:

```bash
sudo chown -R www-data:www-data /var/www/npd-frontend
sudo chmod -R 755 /var/www/npd-frontend
```

---

## Step 6: Nginx Config for Frontend

```bash
sudo nano /etc/nginx/sites-available/npd-dashboard.ugbrands.in
```

```nginx
server {
    listen 80;
    server_name npd-dashboard.ugbrands.in;

    root /var/www/npd-frontend;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # Optional: Cache static assets for performance
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Optional: Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/npd-dashboard.ugbrands.in /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 7: SSL for Frontend Domain

```bash
sudo certbot --nginx -d npd-dashboard.ugbrands.in
```

---

## Step 8: Re-deploy Frontend (After Code Changes)

Whenever there is a code update, re-deploy like this:

```bash
cd /var/www/online-ops-inventory-frontend
sudo git pull
sudo npm install          # only if dependencies changed
sudo npm run build
sudo cp -r build/* /var/www/npd-frontend/
sudo systemctl reload nginx
```

---

# 🌍 11. DOMAIN SETUP

Add A records in your DNS provider:

| Type | Name | Value          |
| ---- | ---- | -------------- |
| A    | api  | 54.235.232.237 |
| A    | @    | 54.235.232.237 |

> `api` → backend API subdomain  
> `@` → root domain for frontend (or use `npd-dashboard` as the name if it's a subdomain)

---

# 🔐 12. SSL (HTTPS) WITH CERTBOT

```bash
sudo apt install certbot python3-certbot-nginx -y

# Backend domain
sudo certbot --nginx -d api.npd-dashboard.ugbrands.in

# Frontend domain
sudo certbot --nginx -d npd-dashboard.ugbrands.in
```

Auto-renew test:

```bash
sudo certbot renew --dry-run
```

---

# 🔥 13. FINAL ARCHITECTURE

```
                    ┌─────────────────────────────────────────┐
                    │              AWS EC2 Server              │
                    │                                          │
  HTTPS             │   Nginx                                  │
npd-dashboard  ───► │   (port 80/443) ──► /var/www/npd-frontend│
                    │                     (Static React Build)  │
  HTTPS             │                                          │
api.npd-dashboard ──► Nginx ──► Node.js (PM2, port 5000) ──► MySQL
                    │                                          │
                    └─────────────────────────────────────────┘
```

---

# 🚨 COMMON FIXES

## Nginx default page showing

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl reload nginx
```

## PM2 issues

```bash
pm2 restart all
pm2 logs
```

## Frontend shows blank page (React Router issue)

Make sure Nginx has `try_files $uri /index.html;` — this is required for SPAs so that refreshing a route doesn't return 404.

## Build fails due to memory (large React apps)

```bash
export NODE_OPTIONS=--max_old_space_size=2048
sudo npm run build
```

## Permission denied on /var/www

```bash
sudo chown -R ubuntu:ubuntu /var/www/online-ops-inventory-frontend
sudo chown -R www-data:www-data /var/www/npd-frontend
```

## Nginx config test fails

```bash
sudo nginx -t        # shows exact error line
sudo journalctl -u nginx --no-pager -n 50   # recent logs
```

---

# 🧠 BEST PRACTICES

* Always use SSH keys (no passwords)
* Always use PM2 for Node.js processes
* Always use Nginx as a reverse proxy for backend
* Always serve React builds as static files via Nginx (never `npm start` in production)
* Always enable HTTPS with Certbot
* Secure `.env` with `chmod 600 .env`
* Never run `npm start` in production for frontend — always build and serve static files
* Keep frontend build folder (`/var/www/npd-frontend`) separate from source code (`/var/www/online-ops-inventory-frontend`)
