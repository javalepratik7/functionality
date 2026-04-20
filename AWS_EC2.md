# 🚀 AWS EC2 + Nginx + Node.js Deployment Guide (Production Ready)

This document explains how to deploy a Node.js backend on AWS EC2 using PM2, Nginx, SSH keys, GitLab private repo access, domain mapping, and SSL (HTTPS) with Certbot.

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

# 📦 5. PROJECT SETUP

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

Run suggested sudo command

---

# 🌐 9. NGINX SETUP

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
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

# 🌍 10. DOMAIN SETUP

| Type | Name | Value          |
| ---- | ---- | -------------- |
| A    | api  | 54.235.232.237 |

---

# 🔐 11. SSL (HTTPS) WITH CERTBOT

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.npd-dashboard.ugbrands.in
```

Auto-renew test:

```bash
sudo certbot renew --dry-run
```

---

# 🔥 12. FINAL ARCHITECTURE

```
HTTPS Domain → Nginx → Node.js (PM2) → MySQL
```

---

# 🚨 COMMON FIXES

## Nginx default page

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl reload nginx
```

## PM2 issues

```bash
pm2 restart all
pm2 logs
```

---

# 🧠 BEST PRACTICES

* Always use SSH keys (no passwords)
* Always use PM2
* Always use Nginx reverse proxy
* Always enable HTTPS
* Secure .env (chmod 600)

---
