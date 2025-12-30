# AWS EC2 Deployment Guide - Step by Step

This guide provides detailed instructions for deploying the Top Tutors Connect application on AWS EC2. It covers everything from creating an EC2 instance to configuring Nginx, SSL, and production-ready deployment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create EC2 Instance](#step-1-create-ec2-instance)
3. [Step 2: Configure Security Groups](#step-2-configure-security-groups)
4. [Step 3: Create and Configure SSH Key Pair](#step-3-create-and-configure-ssh-key-pair)
5. [Step 4: Connect to EC2 Instance](#step-4-connect-to-ec2-instance)
6. [Step 5: Initial Server Setup](#step-5-initial-server-setup)
7. [Step 6: Install Node.js and Dependencies](#step-6-install-nodejs-and-dependencies)
8. [Step 7: Install and Configure PostgreSQL](#step-7-install-and-configure-postgresql)
9. [Step 8: Install and Configure Nginx](#step-8-install-and-configure-nginx)
9. [Step 9: Deploy Application](#step-9-deploy-application)
10. [Step 10: Setup Process Manager (PM2)](#step-10-setup-process-manager-pm2)
11. [Step 11: Configure SSL Certificate](#step-11-configure-ssl-certificate)
12. [Step 12: Setup Domain and DNS](#step-12-setup-domain-and-dns)
13. [Step 13: Configure Environment Variables](#step-13-configure-environment-variables)
14. [Step 14: Database Setup and Migrations](#step-14-database-setup-and-migrations)
15. [Step 15: Setup Monitoring and Logging](#step-15-setup-monitoring-and-logging)
16. [Step 16: Setup Automated Backups](#step-16-setup-automated-backups)
17. [Troubleshooting](#troubleshooting)
18. [Maintenance and Updates](#maintenance-and-updates)

---

## Prerequisites

Before starting, ensure you have:

- An AWS account with appropriate permissions
- A domain name (optional but recommended)
- SSH client installed (built-in on Mac/Linux, PuTTY for Windows)
- Basic knowledge of Linux command line
- Access to your project repository (GitHub, GitLab, etc.)

---

## Step 1: Create EC2 Instance

### 1.1 Access EC2 Console

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **EC2** service
3. Click **"Instances"** in the left sidebar
4. Click **"Launch Instance"** button

### 1.2 Configure Instance Details

#### Name and Tags:
- **Name**: `top-tutors-connect-production` (or your preferred name)

#### Application and OS Images:
- **Amazon Machine Image (AMI)**: 
  - Select **"Ubuntu Server 22.04 LTS"** (recommended)
  - Or **"Amazon Linux 2023"** (alternative)
  - Both are free tier eligible

#### Instance Type:
- **For Development/Testing**: `t2.micro` or `t3.micro` (Free Tier eligible)
- **For Production (Small)**: `t3.small` or `t3.medium`
- **For Production (Medium)**: `t3.large` or `m5.large`
- **For Production (Large)**: `m5.xlarge` or higher

**Recommendation**: Start with `t3.medium` for production, scale up as needed.

#### Key Pair:
- **Key pair name**: Click **"Create new key pair"** (we'll configure this in Step 3)
- **Key pair type**: RSA
- **Private key file format**: `.pem` (for OpenSSH)

#### Network Settings:
- **VPC**: Default VPC (or create a custom VPC)
- **Subnet**: Select a public subnet
- **Auto-assign Public IP**: Enable
- **Security Group**: Create new security group (we'll configure in Step 2)

#### Configure Storage:
- **Volume Type**: General Purpose SSD (gp3)
- **Size**: 
  - Minimum: 20 GB
  - Recommended: 30-50 GB for production
  - Can be increased later if needed

#### Advanced Details (Optional):
- **IAM role**: Create/select a role with S3 access (if using S3)
- **User data**: Leave empty for now (can add bootstrap script later)

### 1.3 Launch Instance

1. Review all settings
2. Click **"Launch Instance"**
3. Wait for instance to be in **"Running"** state (takes 1-2 minutes)

### 1.4 Note Important Information

After launch, note down:
- **Instance ID**: `i-xxxxxxxxxxxxxxxxx`
- **Public IPv4 address**: `xx.xx.xx.xx`
- **Private IPv4 address**: `10.x.x.x`
- **Security Group ID**: `sg-xxxxxxxxxxxxxxxxx`

---

## Step 2: Configure Security Groups

Security groups act as a firewall for your EC2 instance.

### 2.1 Access Security Groups

1. In EC2 Console, click **"Security Groups"** in the left sidebar
2. Find your security group (created during instance launch)
3. Click on it to view details

### 2.2 Configure Inbound Rules

Click **"Edit inbound rules"** and add the following rules:

#### SSH Access (Required):
- **Type**: SSH
- **Protocol**: TCP
- **Port**: 22
- **Source**: 
  - **My IP** (recommended for security)
  - Or **0.0.0.0/0** (allows from anywhere - less secure)

#### HTTP Access (For initial setup):
- **Type**: HTTP
- **Protocol**: TCP
- **Port**: 80
- **Source**: 0.0.0.0/0

#### HTTPS Access (For production):
- **Type**: HTTPS
- **Protocol**: TCP
- **Port**: 443
- **Source**: 0.0.0.0/0

#### Custom TCP (For Node.js app - if not using Nginx):
- **Type**: Custom TCP
- **Protocol**: TCP
- **Port**: 4000 (or your app port)
- **Source**: 
  - **0.0.0.0/0** (if public)
  - Or **Security Group** (if only accessible via Nginx)

#### PostgreSQL (Only if database is on EC2):
- **Type**: PostgreSQL
- **Protocol**: TCP
- **Port**: 5432
- **Source**: 
  - **My IP** (for direct access)
  - Or **Security Group** (for app access only)

### 2.3 Configure Outbound Rules

Outbound rules are usually set to allow all traffic by default. This is fine for most use cases.

### 2.4 Save Rules

Click **"Save rules"** to apply changes.

---

## Step 3: Create and Configure SSH Key Pair

### 3.1 Create Key Pair (If Not Done)

1. In EC2 Console, click **"Key Pairs"** in the left sidebar
2. Click **"Create key pair"**
3. Configure:
   - **Name**: `top-tutors-ec2-key` (or your preferred name)
   - **Key pair type**: RSA
   - **Private key file format**: `.pem` (OpenSSH)
4. Click **"Create key pair"**
5. **Download the `.pem` file** - you won't be able to download it again!

### 3.2 Secure Your Key File

#### On Mac/Linux:
```bash
# Move key to ~/.ssh directory
mv ~/Downloads/top-tutors-ec2-key.pem ~/.ssh/

# Set proper permissions (IMPORTANT!)
chmod 400 ~/.ssh/top-tutors-ec2-key.pem
```

#### On Windows (Using PowerShell):
```powershell
# Move key to a secure location
Move-Item ~/Downloads/top-tutors-ec2-key.pem ~/.ssh/

# Set permissions (requires icacls)
icacls ~/.ssh/top-tutors-ec2-key.pem /inheritance:r
icacls ~/.ssh/top-tutors-ec2-key.pem /grant:r "$($env:USERNAME):(R)"
```

### 3.3 Test Key Access

You should now be able to connect using this key (see Step 4).

---

## Step 4: Connect to EC2 Instance

### 4.1 Get Connection Information

1. In EC2 Console, select your instance
2. Click **"Connect"** button
3. Note the **Public IPv4 address** or **Public IPv4 DNS**

### 4.2 Connect via SSH

#### On Mac/Linux:
```bash
ssh -i ~/.ssh/top-tutors-ec2-key.pem ubuntu@<PUBLIC_IP>
```

Replace:
- `<PUBLIC_IP>` with your instance's public IP
- `ubuntu` with `ec2-user` if using Amazon Linux

#### On Windows (Using PowerShell or Git Bash):
```bash
ssh -i ~/.ssh/top-tutors-ec2-key.pem ubuntu@<PUBLIC_IP>
```

#### On Windows (Using PuTTY):
1. Convert `.pem` to `.ppk` using PuTTYgen
2. Open PuTTY
3. Enter hostname: `ubuntu@<PUBLIC_IP>`
4. Load the `.ppk` key in Connection → SSH → Auth

### 4.3 First Connection

On first connection, you'll see:
```
The authenticity of host 'xx.xx.xx.xx' can't be established.
Are you sure you want to continue connecting (yes/no)?
```
Type `yes` and press Enter.

### 4.4 Verify Connection

You should now see the Ubuntu welcome message and be logged in as `ubuntu` user.

---

## Step 5: Initial Server Setup

### 5.1 Update System Packages

```bash
# Update package list
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y build-essential curl wget git unzip software-properties-common
```

### 5.2 Create Application User (Optional but Recommended)

```bash
# Create a dedicated user for the application
sudo adduser appuser
sudo usermod -aG sudo appuser

# Switch to app user
su - appuser
```

### 5.3 Setup Firewall (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Allow Node.js app port (if not using Nginx)
sudo ufw allow 4000/tcp

# Check status
sudo ufw status
```

### 5.4 Configure Timezone

```bash
# Set timezone
sudo timedatectl set-timezone America/New_York  # Replace with your timezone

# Verify
timedatectl
```

### 5.5 Setup Swap Space (For Small Instances)

If using a small instance (t2.micro, t3.micro), add swap space:

```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Step 6: Install Node.js and Dependencies

### 6.1 Install Node.js (Using NodeSource)

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### 6.2 Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 6.3 Install Additional Tools

```bash
# Install Yarn (optional)
sudo npm install -g yarn

# Install Git (if not already installed)
sudo apt install -y git
```

---

## Step 7: Install and Configure PostgreSQL

### 7.1 Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo -u postgres psql --version
```

### 7.2 Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE ttc_production;
CREATE USER ttc_admin WITH PASSWORD 'your_secure_password_here';
ALTER ROLE ttc_admin SET client_encoding TO 'utf8';
ALTER ROLE ttc_admin SET default_transaction_isolation TO 'read committed';
ALTER ROLE ttc_admin SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE ttc_production TO ttc_admin;
\q
```

### 7.3 Configure PostgreSQL Access

Edit PostgreSQL configuration:

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Find and uncomment/modify:
# listen_addresses = 'localhost'  # For local only
# Or '0.0.0.0' if you need remote access (less secure)
```

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add line for local connections:
# local   all             all                                     md5
# host    all             all             127.0.0.1/32            md5
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 7.4 Test PostgreSQL Connection

```bash
# Test connection
psql -U ttc_admin -d ttc_production -h localhost

# If successful, you'll see PostgreSQL prompt
# Type \q to exit
```

---

## Step 8: Install and Configure Nginx

### 8.1 Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
sudo systemctl status nginx
```

### 8.2 Configure Nginx for Backend API

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/top-tutors-backend
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # Replace with your domain or IP

    # Increase body size limit for file uploads
    client_max_body_size 50M;

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:4000;
        access_log off;
    }
}
```

### 8.3 Configure Nginx for Frontend (If Serving from EC2)

```bash
# Create frontend configuration
sudo nano /etc/nginx/sites-available/top-tutors-frontend
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # Replace with your domain

    root /var/www/top-tutors-frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8.4 Enable Nginx Sites

```bash
# Enable backend configuration
sudo ln -s /etc/nginx/sites-available/top-tutors-backend /etc/nginx/sites-enabled/

# Enable frontend configuration (if applicable)
sudo ln -s /etc/nginx/sites-available/top-tutors-frontend /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 9: Deploy Application

### 9.1 Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone https://github.com/yourusername/top-tutors-connect.git

# Or if using SSH:
# git clone git@github.com:yourusername/top-tutors-connect.git

# Navigate to project directory
cd top-tutors-connect
```

### 9.2 Install Backend Dependencies

```bash
# Navigate to backend
cd Backend

# Install dependencies
npm install --production

# Verify installation
npm list --depth=0
```

### 9.3 Build Frontend (If Deploying Frontend)

```bash
# Navigate to frontend
cd ../Frontend

# Install dependencies
npm install

# Build for production
npm run build

# Copy build to Nginx directory
sudo mkdir -p /var/www/top-tutors-frontend
sudo cp -r dist/* /var/www/top-tutors-frontend/
sudo chown -R www-data:www-data /var/www/top-tutors-frontend
```

### 9.4 Create Application Directory Structure

```bash
# Create application directory
sudo mkdir -p /opt/top-tutors-connect
sudo chown -R $USER:$USER /opt/top-tutors-connect

# Copy application files
cp -r ~/top-tutors-connect/Backend/* /opt/top-tutors-connect/

# Or create a symlink (easier for updates)
sudo ln -s ~/top-tutors-connect/Backend /opt/top-tutors-connect
```

---

## Step 10: Setup Process Manager (PM2)

### 10.1 Create PM2 Ecosystem File

```bash
# Navigate to application directory
cd /opt/top-tutors-connect

# Create ecosystem file
nano ecosystem.config.js
```

Add the following configuration:

```javascript
export default {
  apps: [{
    name: 'top-tutors-backend',
    script: 'server.js',
    cwd: '/opt/top-tutors-connect',
    instances: 1,  // Use 'max' for cluster mode
    exec_mode: 'fork',  // Use 'cluster' for load balancing
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/var/log/pm2/top-tutors-error.log',
    out_file: '/var/log/pm2/top-tutors-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 10.2 Create Log Directory

```bash
# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

### 10.3 Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions shown (usually involves running a sudo command)
```

### 10.4 PM2 Useful Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs top-tutors-backend

# Restart application
pm2 restart top-tutors-backend

# Stop application
pm2 stop top-tutors-backend

# Monitor resources
pm2 monit

# View detailed info
pm2 show top-tutors-backend
```

---

## Step 11: Configure SSL Certificate

### 11.1 Install Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 11.2 Obtain SSL Certificate

```bash
# Obtain certificate for your domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Or for API subdomain
sudo certbot --nginx -d api.yourdomain.com
```

Follow the prompts:
- Enter your email address
- Agree to terms of service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 11.3 Verify SSL Certificate

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

### 11.4 Auto-Renewal Setup

Certbot automatically sets up a cron job for renewal. Verify:

```bash
# Check cron job
sudo systemctl status certbot.timer

# Or check crontab
sudo crontab -l
```

### 11.5 Update Nginx Configuration for HTTPS

Certbot automatically updates your Nginx configuration. Your config should now include:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of your configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Step 12: Setup Domain and DNS

### 12.1 Configure DNS Records

In your domain registrar's DNS settings, add:

#### A Record (For main domain):
- **Type**: A
- **Name**: @ (or blank)
- **Value**: Your EC2 instance's Public IPv4 address
- **TTL**: 3600

#### A Record (For www subdomain):
- **Type**: A
- **Name**: www
- **Value**: Your EC2 instance's Public IPv4 address
- **TTL**: 3600

#### A Record (For API subdomain):
- **Type**: A
- **Name**: api
- **Value**: Your EC2 instance's Public IPv4 address
- **TTL**: 3600

### 12.2 Verify DNS Propagation

```bash
# Check DNS propagation
dig yourdomain.com
nslookup yourdomain.com

# Or use online tools:
# https://www.whatsmydns.net/
```

### 12.3 Update Nginx Server Names

Update your Nginx configurations with actual domain names:

```bash
sudo nano /etc/nginx/sites-available/top-tutors-backend
# Update server_name with your actual domain
```

---

## Step 13: Configure Environment Variables

### 13.1 Create Production .env File

```bash
# Navigate to application directory
cd /opt/top-tutors-connect

# Create .env file
nano .env
```

Add all required environment variables:

```env
# Application
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://ttc_admin:your_password@localhost:5432/ttc_production

# JWT
JWT_SECRET=your_very_secure_jwt_secret_here_min_32_characters

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
MEDIA_STORAGE=s3

# Zoom Integration
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
ZOOM_WEBHOOK_SECRET_TOKEN=your_webhook_secret

# Email Configuration
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your_sendgrid_api_key

# Moodle Integration (if applicable)
MOODLE_URL=https://lms.yourdomain.com
MOODLE_API_KEY=your_moodle_api_key

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 13.2 Secure .env File

```bash
# Set proper permissions
chmod 600 .env

# Verify
ls -la .env
```

### 13.3 Restart Application

```bash
# Restart PM2 to load new environment variables
pm2 restart top-tutors-backend

# Check logs
pm2 logs top-tutors-backend
```

---

## Step 14: Database Setup and Migrations

### 14.1 Run Database Migrations

```bash
# Navigate to application directory
cd /opt/top-tutors-connect

# Run migrations (if you have a migration script)
npm run migrate

# Or manually run SQL files
psql -U ttc_admin -d ttc_production -f migrations/your_migration.sql
```

### 14.2 Create Initial Admin User

```bash
# If you have a seed script
npm run seed:admin

# Or manually via SQL
psql -U ttc_admin -d ttc_production
```

```sql
-- In PostgreSQL prompt
INSERT INTO users (email, password_hash, role_id, created_at)
VALUES (
  'admin@yourdomain.com',
  '$2b$10$hashed_password_here',  -- Use bcrypt to hash password
  (SELECT id FROM roles WHERE name = 'admin'),
  NOW()
);
```

### 14.3 Verify Database Connection

```bash
# Test connection
psql -U ttc_admin -d ttc_production -h localhost

# Run a test query
SELECT COUNT(*) FROM users;
```

---

## Step 15: Setup Monitoring and Logging

### 15.1 Setup PM2 Monitoring

```bash
# Install PM2 monitoring module
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 15.2 Setup CloudWatch Agent (Optional)

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure (interactive)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c ssm:AmazonCloudWatch-linux
```

### 15.3 Setup Application Logging

Ensure your application logs to files:

```bash
# Check PM2 logs
pm2 logs top-tutors-backend --lines 100

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 15.4 Setup Uptime Monitoring

Consider using external services:
- **UptimeRobot**: Free uptime monitoring
- **Pingdom**: Advanced monitoring
- **AWS CloudWatch**: Integrated with AWS

---

## Step 16: Setup Automated Backups

### 16.1 Database Backup Script

```bash
# Create backup directory
sudo mkdir -p /opt/backups
sudo chown -R $USER:$USER /opt/backups

# Create backup script
nano /opt/backups/db-backup.sh
```

Add the following:

```bash
#!/bin/bash

# Configuration
DB_NAME="ttc_production"
DB_USER="ttc_admin"
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Create backup
PGPASSWORD=your_password pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_FILE

# Remove backups older than 7 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

# Upload to S3 (optional)
# aws s3 cp $BACKUP_FILE s3://your-backup-bucket/database-backups/

echo "Backup completed: $BACKUP_FILE"
```

```bash
# Make executable
chmod +x /opt/backups/db-backup.sh

# Test backup
/opt/backups/db-backup.sh
```

### 16.2 Setup Cron Job for Backups

```bash
# Edit crontab
crontab -e

# Add line for daily backup at 2 AM
0 2 * * * /opt/backups/db-backup.sh >> /var/log/backup.log 2>&1
```

### 16.3 Application Files Backup

```bash
# Create application backup script
nano /opt/backups/app-backup.sh
```

```bash
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
APP_DIR="/opt/top-tutors-connect"
BACKUP_FILE="$BACKUP_DIR/app_backup_$DATE.tar.gz"

# Create backup
tar -czf $BACKUP_FILE $APP_DIR

# Remove backups older than 7 days
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete

echo "Application backup completed: $BACKUP_FILE"
```

```bash
# Make executable
chmod +x /opt/backups/app-backup.sh

# Add to crontab (weekly on Sunday at 3 AM)
0 3 * * 0 /opt/backups/app-backup.sh >> /var/log/backup.log 2>&1
```

---

## Troubleshooting

### Issue: Cannot Connect via SSH

**Solutions**:
1. **Check Security Group**: Ensure port 22 is open for your IP
2. **Verify Key Permissions**: `chmod 400 your-key.pem`
3. **Check Instance Status**: Ensure instance is "Running"
4. **Verify Public IP**: Use the correct public IP address
5. **Check Key Pair**: Ensure you're using the correct key pair

### Issue: Application Not Starting

**Solutions**:
1. **Check PM2 Logs**: `pm2 logs top-tutors-backend`
2. **Check Environment Variables**: Ensure `.env` file exists and is correct
3. **Check Database Connection**: Verify PostgreSQL is running and accessible
4. **Check Port**: Ensure port 4000 is not in use: `sudo lsof -i :4000`
5. **Check Node.js Version**: `node --version` should be 18.x or higher

### Issue: Nginx 502 Bad Gateway

**Solutions**:
1. **Check Application**: Ensure app is running on port 4000
2. **Check Nginx Config**: `sudo nginx -t`
3. **Check Nginx Logs**: `sudo tail -f /var/log/nginx/error.log`
4. **Check Firewall**: Ensure UFW allows port 4000
5. **Check Proxy Settings**: Verify proxy_pass URL in Nginx config

### Issue: Database Connection Failed

**Solutions**:
1. **Check PostgreSQL Status**: `sudo systemctl status postgresql`
2. **Verify Credentials**: Test connection manually
3. **Check pg_hba.conf**: Ensure local connections are allowed
4. **Check Database Exists**: `psql -U ttc_admin -l`
5. **Check Connection String**: Verify DATABASE_URL in .env

### Issue: SSL Certificate Not Working

**Solutions**:
1. **Check DNS**: Ensure domain points to EC2 IP
2. **Check Nginx Config**: Verify SSL configuration
3. **Check Certbot**: `sudo certbot certificates`
4. **Check Port 443**: Ensure security group allows HTTPS
5. **Renew Certificate**: `sudo certbot renew`

### Issue: High Memory Usage

**Solutions**:
1. **Check Memory**: `free -h`
2. **Check PM2**: `pm2 monit`
3. **Restart Application**: `pm2 restart top-tutors-backend`
4. **Add Swap**: Follow Step 5.5
5. **Upgrade Instance**: Consider larger instance type

### Issue: Application Crashes

**Solutions**:
1. **Check Logs**: `pm2 logs top-tutors-backend --err`
2. **Check System Logs**: `sudo journalctl -xe`
3. **Check Memory**: Application may be running out of memory
4. **Check Database**: Ensure database is accessible
5. **Enable Auto-restart**: Verify PM2 autorestart is enabled

---

## Maintenance and Updates

### Updating Application

```bash
# Navigate to project directory
cd ~/top-tutors-connect

# Pull latest changes
git pull origin main

# Install/update dependencies
cd Backend
npm install --production

# Run migrations (if any)
npm run migrate

# Restart application
pm2 restart top-tutors-backend

# Check status
pm2 status
pm2 logs top-tutors-backend
```

### Updating System Packages

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Restart services if needed
sudo systemctl restart nginx
sudo systemctl restart postgresql
```

### Monitoring Disk Space

```bash
# Check disk usage
df -h

# Check directory sizes
du -sh /opt/top-tutors-connect/*
du -sh /var/log/*

# Clean old logs
sudo journalctl --vacuum-time=7d
```

### Performance Optimization

1. **Enable Gzip Compression**: Already configured in Nginx
2. **Enable Caching**: Configure cache headers in Nginx
3. **Database Indexing**: Ensure database has proper indexes
4. **CDN Setup**: Consider CloudFront for static assets
5. **Load Balancing**: Use multiple instances for high traffic

---

## Quick Reference Commands

### Application Management
```bash
pm2 status                    # Check app status
pm2 logs top-tutors-backend  # View logs
pm2 restart top-tutors-backend # Restart app
pm2 stop top-tutors-backend   # Stop app
pm2 monit                     # Monitor resources
```

### Nginx Management
```bash
sudo systemctl status nginx   # Check status
sudo systemctl restart nginx  # Restart
sudo nginx -t                 # Test config
sudo tail -f /var/log/nginx/error.log  # View errors
```

### Database Management
```bash
sudo systemctl status postgresql  # Check status
sudo systemctl restart postgresql # Restart
psql -U ttc_admin -d ttc_production  # Connect
```

### System Management
```bash
sudo apt update && sudo apt upgrade -y  # Update system
df -h                                    # Check disk space
free -h                                  # Check memory
top                                      # Monitor processes
```

---

## Security Checklist

- [ ] SSH key pair secured (chmod 400)
- [ ] Security groups configured correctly
- [ ] UFW firewall enabled
- [ ] Strong database passwords set
- [ ] JWT secret is secure and random
- [ ] Environment variables secured (chmod 600)
- [ ] SSL certificate installed and auto-renewing
- [ ] Regular security updates scheduled
- [ ] Backups configured and tested
- [ ] Logs monitored for suspicious activity
- [ ] Unnecessary ports closed
- [ ] Root login disabled (if applicable)

---

## Cost Optimization

### EC2 Instance Costs (Approximate)

- **t3.micro**: ~$7-10/month
- **t3.small**: ~$15-20/month
- **t3.medium**: ~$30-35/month
- **t3.large**: ~$60-70/month

### Additional Costs

- **EBS Storage**: ~$0.10/GB/month
- **Data Transfer**: First 1GB free, then ~$0.09/GB
- **Elastic IP**: Free if attached to running instance

### Cost Optimization Tips

1. **Use Reserved Instances**: Save up to 75% for 1-3 year commitments
2. **Right-size Instances**: Monitor usage and adjust instance size
3. **Use Spot Instances**: For non-critical workloads (up to 90% savings)
4. **Optimize Storage**: Use appropriate EBS volume types
5. **Monitor Costs**: Set up AWS Cost Alerts

---

## Additional Resources

### AWS Documentation
- [EC2 User Guide](https://docs.aws.amazon.com/ec2/)
- [EC2 Best Practices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-best-practices.html)
- [Security Groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html)

### Project Files Reference
- Deployment Config: `deployment/README.md`
- Backend Package: `Backend/package.json`

### Useful Tools
- [AWS CLI](https://aws.amazon.com/cli/) - Command-line interface
- [Terraform](https://www.terraform.io/) - Infrastructure as code
- [Ansible](https://www.ansible.com/) - Configuration management

---

**Last Updated**: December 2024
**Version**: 1.0

