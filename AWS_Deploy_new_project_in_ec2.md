# 🚀 Deployment Guide — UG Codebase (EC2 Ubuntu)
This guide is based on the **actual deployment process** used on the UG production server.
Covers: GitLab SSH setup, cloning, PM2, NGINX, subdomain, and SSL.

---

## 📋 Prerequisites

- Access to EC2 Ubuntu server (`.pem` key file)
- GitLab repos ready (Frontend + Backend — separate repos)
- Subdomain planned (e.g., `po-dashboard.ugbrands.in` and `api.po-dashboard.ugbrands.in`)
- DNS access to your domain (GoDaddy or similar)

---

## 🔐 Part 1 — SSH into the Server

```bash
ssh -i ./your-server-key.pem ubuntu@<EC2-PUBLIC-IP>
```

> **Note:** Always use `ubuntu` as the user on Ubuntu AMI instances (not `ec2-user`).

---

## 🔑 Part 2 — Add SSH Deploy Key (GitLab ↔ EC2)

This allows your EC2 server to clone private GitLab repos without a password.

> ⚠️ **Do this only once per server.** If a deploy key already exists on this server for your GitLab group, skip to Part 3.

### Step 1: Generate SSH key on EC2

```bash
ssh-keygen -t ed25519 -C "ec2-deploy-key"
```

Press **Enter** for all prompts (no passphrase needed).

### Step 2: Copy the public key

```bash
cat ~/.ssh/id_ed25519.pub
```

### Step 3: Add to GitLab

1. Go to your GitLab repo → **Settings → Repository → Deploy Keys**
2. Click **Add Deploy Key** → paste the public key → Save
3. Repeat for both Frontend and Backend repos

### Step 4: Test the connection

```bash
ssh -T git@gitlab.com
# Expected: Welcome to GitLab, @your-username!
```

---

## 📁 Part 3 — Create Project Folder

```bash
cd ~/ug-codebase
mkdir po-dashboard        # use correct spelling — avoid typos (learned from po-dashbord mistake!)
cd po-dashboard
```

> 💡 **Tip:** Double-check the folder name before creating it. Use `ls` to confirm. Fixing a typo later means deleting and re-creating the folder.

---

## 📥 Part 4 — Clone Frontend & Backend

Clone directly into the `po-dashboard` folder — **do NOT create subfolders manually first.**

### Clone Frontend

```bash
git clone git@gitlab.com:<group>/<subgroup>/frontend.git frontend
```

### Clone Backend

```bash
cd ..   # go back to po-dashboard if needed
git clone git@gitlab.com:<group>/<subgroup>/backend.git backend
```

Your final folder structure:

```
~/ug-codebase/
└── po-dashboard/
    ├── frontend/
    └── backend/
```

> ⚠️ **Common mistake:** Don't `mkdir frontend` before cloning — git will clone into a nested `frontend/frontend/` folder. Clone directly: `git clone <url> frontend`

---

## ⚙️ Part 5 — Check Node Version

```bash
nvm ls
```

Use the default version (the one marked with `->`) or switch if needed:

```bash
nvm use 22      # or whichever version your project needs
```

---

## 📦 Part 6 — Install Dependencies & Add .env

### Backend

```bash
cd ~/ug-codebase/po-dashboard/backend
npm i
nano .env       # Add all required environment variables
```

### Frontend

```bash
cd ~/ug-codebase/po-dashboard/frontend
npm i
nano .env       # Add VITE_ variables if required
```

> 💾 Save `.env` with: `CTRL + X → Y → Enter`

---

## ▶️ Part 7 — Start Backend with PM2

```bash
cd ~/ug-codebase/po-dashboard/backend
pm2 start index.js --name po-dashboard-backend
```

### Check logs

```bash
pm2 log <id>              # e.g. pm2 log 33
pm2 log <id> --lines 100  # see more lines
```

### Verify it's running

```bash
pm2 ls
```

Look for your process name in the table with status `online`.

---

## 🏗️ Part 8 — Build & Start Frontend with PM2

### Step 1: Build the frontend

```bash
cd ~/ug-codebase/po-dashboard/frontend
npm run build
```

This creates a `dist/` folder. Confirm with `ls` — you should see `dist/` listed.

### Step 2: Serve with PM2

```bash
pm2 start npx --name po-dashboard-frontend -- serve -s dist -l <PORT>
```

> ⚠️ Each project must use a **unique port**. Check `pm2 ls` to see what ports are already in use before picking one. Example ports used on this server: `3032` (backend), `3033` (frontend).

### Verify

```bash
pm2 ls
pm2 log <frontend-id>
```

---

## 💾 Part 9 — Save PM2 Process List

Run this **after adding any new PM2 process** so it survives server reboots:

```bash
pm2 save
```

---


## 🌐 Part 10 — Create Sub Domian in Godaddy

```
-> Login 
-> Access Now 
-> select UG brands 
-> Domain (side bar navigation) 
-> DNS -> Add new record 
-> type A  - Name sub domain name - value IP address of server
```

## 🌐 Part 10 — Configure NGINX

This server uses **`/etc/nginx/sites-available/`** (Ubuntu standard — not `conf.d`).

### Step 1: Create NGINX config for Frontend subdomain

```bash
sudo nano /etc/nginx/sites-available/<DOMAIN-NAME.COM>
```

Paste:

```nginx
server {
    listen 80;
    server_name <DOMAIN-NAME.COM>;

    location / {
        proxy_pass http://localhost:<FRONTEND-PORT>;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 2: Enable the Frontend config

```bash
sudo ln -s /etc/nginx/sites-available/po-dashboard.ugbrands.in /etc/nginx/sites-enabled/
```

### Step 3: Create NGINX config for Backend subdomain (API)

```bash
sudo nano /etc/nginx/sites-available/<DOMAIN-NAME.COM>
```

Paste:

```nginx
server {
    listen 80;
    server_name <DOMAIN-NAME.COM>;

    location / {
        proxy_pass http://localhost:<BACKEND-PORT>;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 4: Enable the Backend config

```bash
sudo ln -s /etc/nginx/sites-available/api.po-dashboard.ugbrands.in /etc/nginx/sites-enabled/
```

### Step 5: Test and restart NGINX

```bash
sudo nginx -t
sudo systemctl restart nginx
```

> ⚠️ `nginx -t` may show a `conflicting server name` warning for other projects — this is **normal and safe to ignore** as long as it says `syntax is ok` and `test is successful`.

---

## 🌍 Part 11 — Add DNS Records (GoDaddy or other provider)

Add **two A records** pointing to your EC2 public IP:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | po-dashboard | `<EC2-PUBLIC-IP>` | 600 |
| A | api.po-dashboard | `<EC2-PUBLIC-IP>` | 600 |

> DNS propagation can take 5 minutes to a few hours. Check with:
> ```bash
> nslookup po-dashboard.ugbrands.in
> ```

---

## 🔒 Part 12 — Issue SSL Certificate (Certbot)

Run certbot for **each subdomain separately**:

```bash
sudo certbot -d <domain.com>   frontend and backend urls
sudo certbot  -d po-dashboard.ugbrands.in
sudo certbot  -d api.po-dashboard.ugbrands.in
```

Follow the prompts — choose **redirect HTTP to HTTPS** when asked.

> ✅ Certbot auto-updates your NGINX config and sets up auto-renewal.

### Test auto-renewal

```bash
sudo certbot renew --dry-run
```

---

## 🔄 Part 13 — Deploying Updates (After Initial Setup)

Every time there's new code pushed to GitLab:

### Backend update

```bash
cd ~/ug-codebase/po-dashboard/backend
git pull origin main
npm i
pm2 restart po-dashboard-backend
pm2 log po-dashboard-backend --lines 30
```

### Frontend update

```bash
cd ~/ug-codebase/po-dashboard/frontend
git pull origin main
npm i
npm run build
pm2 restart po-dashboard-frontend
```

### Restart both at once (using PM2 IDs)

```bash
pm2 restart 33 34    # replace with actual IDs from pm2 ls
```

> 💡 Use `pm2 ls` to confirm the IDs of your project's processes.

---

## 🛠️ Troubleshooting

### ❌ Git clone permission denied
- SSH deploy key not added to GitLab repo
- Run `ssh -T git@gitlab.com` to verify connection

### ❌ npm i fails — `package.json` not found
- You cloned into a nested folder (e.g., `frontend/frontend/`)
- Fix: `cd ..` → `rm -rf frontend` → re-clone directly: `git clone <url> frontend`

### ❌ Backend DB connection error (`ER_ACCESS_DENIED_ERROR`)
- Wrong credentials in `.env`
- Run `cat .env` to verify values, then `nano .env` to fix
- After fixing: `pm2 restart <id> --update-env`

### ❌ Frontend build fails
```bash
rm -rf node_modules dist
npm i
npm run build
```

### ❌ NGINX test fails
```bash
sudo nginx -t     # shows exact error line
sudo journalctl -u nginx --no-pager -n 50
```

### ❌ Certbot SSL fails
- DNS may not have propagated yet — wait and retry
- Check that port 80 is open in AWS Security Group (required for Let's Encrypt verification)

### ❌ PM2 process keeps restarting
```bash
pm2 log <id> --lines 100   # read the error logs carefully
```

---

## 📎 Useful Commands Reference

```bash
pm2 ls                              # list all processes
pm2 log <id>                        # tail logs
pm2 log <id> --lines 100            # tail more lines
pm2 restart <id>                    # restart by ID
pm2 restart <name>                  # restart by name
pm2 restart <id1> <id2>             # restart multiple
pm2 restart <id> --update-env       # restart and reload .env
pm2 save                            # save process list (persist across reboots)
pm2 delete <id>                     # remove a process

sudo nginx -t                       # test nginx config
sudo systemctl restart nginx        # restart nginx
sudo certbot --nginx -d <domain>    # issue/renew SSL
```

---

## ✅ Deployment Checklist

- [ ] SSH into EC2 server
- [ ] GitLab deploy key generated and added to both repos
- [ ] Project folder created with correct spelling
- [ ] Frontend and Backend cloned correctly (no nested folders)
- [ ] `.env` files added to both Frontend and Backend
- [ ] `npm i` run in both folders
- [ ] Backend started with PM2 (`pm2 start index.js --name ...`)
- [ ] Frontend built (`npm run build`) and served with PM2 (`pm2 start npx -- serve -s dist -l <PORT>`)
- [ ] `pm2 save` run to persist processes
- [ ] NGINX configs created for both subdomains
- [ ] Symlinks created in `sites-enabled` for both configs
- [ ] `sudo nginx -t` passes and nginx restarted
- [ ] DNS A records added in GoDaddy (frontend + api subdomains)
- [ ] DNS propagated — verified with `nslookup`
- [ ] SSL issued via Certbot for both subdomains
- [ ] Site loads on HTTPS with no errors in PM2 logs

---

## 📌 Notes

- **Never commit `.env` files** to GitLab
- Each project needs a **unique port** — check `pm2 ls` before assigning
- After any `.env` change, restart with `--update-env`: `pm2 restart <id> --update-env`
- `pm2 save` must be run after adding any new process
- NGINX on this server uses `sites-available` / `sites-enabled` pattern (Ubuntu style)

---

```
1)ssh -i ./urbangabru-prod-server.pem ubuntu@34.228.123.37
2)cd ug-codebase
3)mkdir <PROJECT NAME>
4)cd <PROJECT NAME>
5)git clone git@gitlab.com:urbangabru-tech-group/ecom-po/frontend.git
6)git clone git@gitlab.com:urbangabru-tech-group/ecom-po/backend.git
7)cd frontend
8)npm i
9)cd ../backend/
10)npm i
11)nano .env    (past backend env)
12)cd ../frontend/
13)nano .env    (past backend env)
14)pm2 start server.js --name <PROJECT NAME ON PM2 >
15)pm2 logs 35
16)npm run build
17)pm2 start npx --name <PROJECT NAME ON PM2 > -- serve -s dist -l <PORT>
```
For frontend
```
18)sudo nano /etc/nginx/sites-available/<DOMAIN.COM> 
19)sudo ln -s /etc/nginx/sites-available/ecom-po.ugbrands.in /etc/nginx/sites-enabled/
20)sudo nginx -t
21)sudo systemctl restart nginx
```
For backend
```
22)cd ../backend/
23)sudo nano /etc/nginx/sites-available/<DOMAIN.COM> 
24)sudo ln -s /etc/nginx/sites-available/api.ecom-po.ugbrands.in /etc/nginx/sites-enabled/
25)sudo nginx -t
26)sudo systemctl restart nginx
27)sudo certbot  -d <FRONETND DOMAIN.COM> -d <BACKEND DOMAIN.COM>
28)pm2 restart 35 36
```

✔ **Deployment complete!**
