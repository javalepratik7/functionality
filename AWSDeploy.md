# 🚀 Deployment Guide — Top Tutors Connect

This guide includes the **Backend Deployment**, **Frontend Deployment**, and **Environment Update** steps — formatted clean and beginner‑friendly.

---

## 📌 Backend Deployment

### **Step 1: SSH into the server**

```bash
ssh -i "top-tutors-connect-dev.pem" ec2-user@ec2-3-148-55-20.us-east-2.compute.amazonaws.com
```

### **Step 2: Go to the project folder**

```bash
cd top
or
cd top-tutors-connect
```

### **Step 3: Pull the latest code from `main`**

```bash
git pull origin main
```

### **Step 4: Install backend dependencies (only if needed)**

```bash
cd Backend
npm install
cd ..
```

### **Step 5: Restart backend service**

```bash
pm2 restart top-tutors-backend
```

### **Step 6: Check backend status**

```bash
pm2 status
```

### **Step 7: Test backend health**

```bash
curl http://localhost:4000/api/health
```

### **Step 8: Verify in browser**

🔗 [https://app.toptutorsforus.com](https://app.toptutorsforus.com)

---

### ⚠️ If there are issues:

#### 👉 PM2 process not found

```bash
pm2 start ecosystem.config.cjs --env production
```

#### 👉 Check backend logs

```bash
pm2 logs top-tutors-backend --lines 50
```

---

## 🎨 Frontend Deployment

### **Step 1: SSH into the server**

```bash
ssh -i "top-tutors-connect-dev.pem" ec2-user@ec2-3-148-55-20.us-east-2.compute.amazonaws.com
```

### **Step 2: Go to project directory**

```bash
cd top
```

### **Step 3: Pull latest changes**

```bash
git pull origin main
```

### **Step 4: Go to frontend folder**

```bash
cd Frontend
```

### **Step 5: Build frontend**

```bash
npm install
npm run build
cd ..
```

---

### ❗ If build fails — fix with:

```bash
cd Frontend
rm -rf node_modules dist
npm install
npm run build
```

---

### **Step 6: Update NGINX build files**

#### View existing config (optional)

```bash
sudo nano /etc/nginx/conf.d/top-tutors-connect.conf
```

#### Replace old build with the new one

```bash
sudo cp -rf /home/ec2-user/top-tutors-connect/Frontend/dist/* /var/www/top-tutors-connect/
```

### **Step 7: Test and restart NGINX**

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔑 Update Environment Variables (.env)

### **Step 1: Navigate to backend folder**

```bash
cd /home/ec2-user/top-tutors-connect/Backend
```

### **Step 2: Check if `.env` exists**

```bash
ls -la .env
cat .env
```

### **Step 3: Edit `.env` file**

```bash
nano .env
```

➡️ Add or update the required keys.

### **Step 4: Save the file**

```
CTRL + X → Y → Enter
```

### **Step 5: Verify changes**

```bash
grep -E "(AWS_ACCESS_KEY_ID|OPENAI_API_KEY|ZOOM_ACCOUNT_ID|MAILGUN_API_KEY)" .env
```

### **Step 6: Restart backend**

```bash
pm2 restart top-tutors-backend
```

### **Step 7: Check logs**

```bash
pm2 logs top-tutors-backend --lines 30
```

### **Step 8: Test server health**

```bash
curl http://localhost:4000/api/health
```

---

### ✅ Deployment Completed

If no errors are shown in PM2 logs and the site loads correctly — the deployment is successful.

---

### 📎 Notes

* Never share `.env` file publicly.
* Always test backend health before restarting services.
* Run commands step‑by‑step — don’t skip.

---

✔ You’re done!
