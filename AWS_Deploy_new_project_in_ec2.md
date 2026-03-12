# 🚀 EC2 Deployment Guide — Fresh Server Setup

This guide covers setting up a **brand-new EC2 instance** from scratch: GitLab repo, SSH keys, cloning, PM2, NGINX, subdomain, and SSL via Certbot.

---

## 📋 Prerequisites

- AWS EC2 instance running (Amazon Linux 2 or Ubuntu)
- A domain on GoDaddy (e.g., `app.yourdomain.com`)
- GitLab account with your Frontend & Backend repos
- Your `.pem` key file to SSH into EC2

---

## 🗂️ Part 1 — Create GitLab Repositories

### Step 1: Create repos on GitLab

1. Go to [https://gitlab.com](https://gitlab.com) → **New Project**
2. Create **two separate repos**:
   - `your-project-backend`
   - `your-project-frontend`
3. Set visibility to **Private**

---

## 🔑 Part 2 — Add SSH Key (GitLab ↔ EC2 Sync)

This allows your EC2 server to pull code from GitLab without a password.

### Step 1: SSH into your EC2 instance

```bash
ssh -i "your-key.pem" ec2-user@your-ec2-public-ip
```

> **Note:** Use `ubuntu` instead of `ec2-user` if you're on Ubuntu AMI.

### Step 2: Generate an SSH key on EC2

```bash
ssh-keygen -t ed25519 -C "ec2-deploy-key"
```

Press **Enter** for all prompts (no passphrase needed for deploy keys).

### Step 3: Copy the public key

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the entire output.

### Step 4: Add key to GitLab

1. Go to your GitLab repo → **Settings → Repository → Deploy Keys**
2. Click **Add Deploy Key**
3. Paste the public key → Enable **"Grant write permissions"** if needed
4. Click **Add Key**

> Repeat for both Frontend and Backend repos.

### Step 5: Test the connection

```bash
ssh -T git@gitlab.com
```

You should see: `Welcome to GitLab, @your-username!`

---

## 🖥️ Part 3 — Server Setup on EC2

### Step 1: SSH into EC2

```bash
ssh -i "your-key.pem" ec2-user@your-ec2-public-ip
```

### Step 2: Update system packages

```bash
sudo yum update -y        # Amazon Linux
# OR
sudo apt update && sudo apt upgrade -y   # Ubuntu
```

### Step 3: Install Node.js (v18+ recommended)

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
node -v   # Verify
npm -v    # Verify
```

### Step 4: Install PM2 globally

```bash
npm install -g pm2
```

### Step 5: Install Git (if not already installed)

```bash
sudo yum install git -y       # Amazon Linux
# OR
sudo apt install git -y       # Ubuntu
```

---

## 📁 Part 4 — Create Project Folder & Clone Repos

### Step 1: Create a project directory

```bash
mkdir -p /home/ec2-user/your-project
cd /home/ec2-user/your-project
```

### Step 2: Clone Backend

```bash
git clone git@gitlab.com:your-username/your-project-backend.git Backend
```

### Step 3: Clone Frontend

```bash
git clone git@gitlab.com:your-username/your-project-frontend.git Frontend
```

Your folder structure should look like:

```
/home/ec2-user/your-project/
├── Backend/
└── Frontend/
```

---

## 📦 Part 5 — Install Dependencies

### Step 1: Install Backend dependencies

```bash
cd /home/ec2-user/your-project/Backend
npm install
```

### Step 2: Add Backend `.env` file

```bash
nano .env
```

Add all required environment variables, then save with `CTRL + X → Y → Enter`.

### Step 3: Install Frontend dependencies & build

```bash
cd /home/ec2-user/your-project/Frontend
npm install
npm run build
```

> ✅ This creates a `dist/` folder — this is what NGINX will serve.

---

## ⚙️ Part 6 — Configure PM2 (Backend Process Manager)

### Step 1: Create PM2 ecosystem config

```bash
cd /home/ec2-user/your-project/Backend
nano ecosystem.config.cjs
```

Paste the following:

```javascript
module.exports = {
  apps: [
    {
      name: "your-project-backend",
      script: "server.js",          // Change to your entry file
      instances: 1,
      autorestart: true,
      watch: false,
      env_production: {
        NODE_ENV: "production",
        PORT: 4000
      }
    }
  ]
};
```

Save and close.

### Step 2: Start the backend with PM2

```bash
pm2 start ecosystem.config.cjs --env production
```

### Step 3: Save PM2 process list (auto-restart on server reboot)

```bash
pm2 save
pm2 startup
```

> Run the command that `pm2 startup` outputs (it gives you a `sudo env PATH=...` command — copy and run it).

### Step 4: Verify PM2 is running

```bash
pm2 status
pm2 logs your-project-backend --lines 30
```

### Step 5: Test backend health

```bash
curl http://localhost:4000/api/health
```

---

## 🌐 Part 7 — Configure NGINX (Reverse Proxy + Frontend)

### Step 1: Install NGINX

```bash
sudo yum install nginx -y      # Amazon Linux
# OR
sudo apt install nginx -y      # Ubuntu
```

### Step 2: Create the web root directory for frontend

```bash
sudo mkdir -p /var/www/your-project
sudo cp -rf /home/ec2-user/your-project/Frontend/dist/* /var/www/your-project/
```

### Step 3: Create NGINX config file

```bash
sudo nano /etc/nginx/conf.d/your-project.conf
```

Paste the following config:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;

    # Serve Frontend
    root /var/www/your-project;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Backend
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 4: Test and restart NGINX

```bash
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx     # Auto-start on reboot
sudo systemctl restart nginx
```

---

## 🌍 Part 8 — Create Subdomain in GoDaddy

### Step 1: Get your EC2 Public IP

In the AWS Console → EC2 → Your Instance → copy **Public IPv4 address**.

### Step 2: Add DNS record in GoDaddy

1. Go to [https://godaddy.com](https://godaddy.com) → **My Products → DNS**
2. Find your domain → click **Manage DNS**
3. Click **Add New Record**:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A    | app  | your-ec2-ip | 600 |

> `app` in the Name field will create `app.yourdomain.com`.

4. Click **Save**

### Step 3: Wait for DNS propagation

DNS can take **5 minutes to 48 hours**. Check with:

```bash
nslookup app.yourdomain.com
```

---

## 🔒 Part 9 — HTTPS with Certbot (Let's Encrypt)

### Step 1: Install Certbot

```bash
# Amazon Linux 2
sudo yum install certbot python3-certbot-nginx -y

# Ubuntu
sudo apt install certbot python3-certbot-nginx -y
```

> If `certbot` is not available via yum, use snap:
> ```bash
> sudo snap install --classic certbot
> sudo ln -s /snap/bin/certbot /usr/bin/certbot
> ```

### Step 2: Open port 443 in AWS Security Group

1. Go to AWS Console → EC2 → **Security Groups**
2. Select your instance's security group → **Edit Inbound Rules**
3. Add rule: **HTTPS (port 443) from 0.0.0.0/0**
4. Also confirm **HTTP (port 80)** is open

### Step 3: Run Certbot

```bash
sudo certbot --nginx -d app.yourdomain.com
```

Follow the prompts:
- Enter your email address
- Agree to terms
- Choose **redirect HTTP to HTTPS** (option 2 — recommended)

### Step 4: Verify SSL is working

Open in browser: `https://app.yourdomain.com` — you should see a 🔒 padlock.

### Step 5: Set up auto-renewal

Certbot adds auto-renewal by default. Test it with:

```bash
sudo certbot renew --dry-run
```

---

## 🔄 Part 10 — Deploying Updates (After Initial Setup)

Every time you push new code, run these steps on the server:

### Backend update

```bash
cd /home/ec2-user/your-project
git pull origin main
cd Backend && npm install && cd ..
pm2 restart your-project-backend
pm2 logs your-project-backend --lines 30
```

### Frontend update

```bash
cd /home/ec2-user/your-project
git pull origin main
cd Frontend
npm install
npm run build
cd ..
sudo cp -rf /home/ec2-user/your-project/Frontend/dist/* /var/www/your-project/
sudo systemctl restart nginx
```

---

## 🛠️ Troubleshooting

### PM2 process not found
```bash
pm2 start ecosystem.config.cjs --env production
```

### Frontend build fails
```bash
cd Frontend
rm -rf node_modules dist
npm install
npm run build
```

### NGINX config error
```bash
sudo nginx -t           # Shows the error line
sudo journalctl -u nginx --no-pager -n 50
```

### Certbot SSL fails
- Make sure DNS has fully propagated: `nslookup app.yourdomain.com`
- Make sure port 80 and 443 are open in AWS Security Group

### Backend not responding
```bash
pm2 logs your-project-backend --lines 50
curl http://localhost:4000/api/health
```

---

## ✅ Deployment Checklist

- [ ] EC2 instance running and SSH key pair configured
- [ ] GitLab repos created for Frontend and Backend
- [ ] EC2 SSH deploy key added to both GitLab repos
- [ ] Node.js and PM2 installed on EC2
- [ ] Frontend and Backend cloned into project folder
- [ ] `.env` file created in Backend
- [ ] Backend running via PM2 with `pm2 save` + `pm2 startup`
- [ ] Frontend built (`npm run build`)
- [ ] NGINX installed and configured
- [ ] Frontend `dist/` files copied to NGINX web root
- [ ] Subdomain `A record` added in GoDaddy pointing to EC2 IP
- [ ] Port 80 and 443 open in AWS Security Group
- [ ] Certbot SSL certificate installed
- [ ] Site loads correctly over HTTPS

---

## 📎 Important Notes

- Never commit `.env` files to GitLab
- Always test `pm2 status` and `curl http://localhost:4000/api/health` after backend changes
- If your EC2 IP changes (stop/start), update the GoDaddy DNS A record
- Use **Elastic IP** in AWS to get a permanent IP that won't change on restart

---

✔ **You're done! Your project is live on EC2 with HTTPS.**
