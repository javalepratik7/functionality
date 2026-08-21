# EC2 SFTP Server Setup - README

## Quick Start (5 Minutes)

If you already have an EC2 instance and want to set up SFTP quickly, follow these essential steps:

### Step 1: SSH into Your EC2 Instance

```bash
ssh -i /path/to/key.pem ubuntu@3.211.91.14
```

### Step 2: Update and Install OpenSSH

```bash
sudo apt update && sudo apt install -y openssh-server openssh-client
sudo systemctl enable sshd && sudo systemctl start sshd
sudo systemctl status sshd
```

### Step 3: Create SFTP User

```bash
# Create user
sudo adduser increff

# When prompted, enter a strong password (16+ characters)
# Example: Increff@2024#SecurePass

# Disable shell access for security
sudo usermod -s /usr/sbin/nologin increff

# Verify
id increff
```

### Step 4: Create Directory Structure

```bash
# Create directories
sudo mkdir -p /sftp/increff/upload

# Set ownership and permissions
sudo chown root:root /sftp
sudo chmod 755 /sftp

sudo chown root:root /sftp/increff
sudo chmod 755 /sftp/increff

sudo chown increff:increff /sftp/increff/upload
sudo chmod 755 /sftp/increff/upload

# Verify
ls -la /sftp/
```

### Step 5: Configure SSH for SFTP-Only Access

```bash
# Backup original config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Edit SSH config
sudo nano /etc/ssh/sshd_config

# ADD AT THE END OF FILE:
Match User increff
    ChrootDirectory /sftp/increff
    ForceCommand internal-sftp
    PasswordAuthentication yes
    X11Forwarding no
    AllowTcpForwarding no
    AllowAgentForwarding no
    PermitTTY no

# Save: Ctrl+X, then Y, then Enter

# Validate config
sudo sshd -t

# Restart SSH
sudo systemctl restart sshd
```

### Step 6: Update Security Group

In AWS Console:
1. Go to **EC2 → Security Groups**
2. Select your instance's security group
3. Add inbound rule:
   - Type: SSH
   - Port: 22
   - Source: Increff's IP (e.g., 203.x.x.x/32)
4. Save

### Step 7: Test SFTP Connection

```bash
# From your local machine
sftp increff@3.211.91.14

# When prompted, enter the password you created in Step 3

# Test commands:
sftp> pwd          # Should show: /upload
sftp> ls -la       # Should list files in /upload
sftp> put test.txt # Upload test file
sftp> quit         # Exit
```

### Step 8: Set Up Automation (Optional)

```bash
# Create report script
sudo mkdir -p /opt/reports
sudo nano /opt/reports/generate_increff_report.py

# Copy content from the EC2_SFTP.md file (generate_increff_report.py section)
# Make executable
sudo chmod +x /opt/reports/generate_increff_report.py

# Schedule with cron
sudo crontab -e

# Add this line to run daily at 2:00 AM:
0 2 * * * /usr/bin/python3 /opt/reports/generate_increff_report.py >> /var/log/increff_report_cron.log 2>&1

# Save: Ctrl+X, then Y, then Enter
```

---

## Setup Checklist

Use this checklist to ensure everything is configured correctly:

### Pre-Setup
- [ ] EC2 instance selected (Ubuntu 20.04+, Amazon Linux 2, or RHEL 8+)
- [ ] SSH access to EC2 instance working
- [ ] Elastic IP assigned (optional but recommended)
- [ ] Security group exists

### Installation
- [ ] OpenSSH server installed
- [ ] SSH service enabled and running
- [ ] SFTP user created (increff)
- [ ] User password set to strong value (16+ chars)
- [ ] User shell disabled (/usr/sbin/nologin)

### Directory Setup
- [ ] `/sftp` directory created with correct ownership (root:root)
- [ ] `/sftp/increff` directory created with correct ownership (root:root)
- [ ] `/sftp/increff/upload` directory created with correct ownership (increff:increff)
- [ ] All permissions set correctly (755 for parent directories)

### SSH Configuration
- [ ] SSH config backed up
- [ ] Match User block added for increff
- [ ] ChrootDirectory set to `/sftp/increff`
- [ ] ForceCommand set to `internal-sftp`
- [ ] All security parameters configured
- [ ] SSH config syntax validated with `sshd -t`
- [ ] SSH service restarted

### Security Group
- [ ] Inbound rule added for TCP port 22
- [ ] Source set to specific IP/CIDR (NOT 0.0.0.0/0)
- [ ] Rule description added

### Testing
- [ ] SFTP connection successful with username/password
- [ ] User lands in `/upload` directory
- [ ] Cannot navigate to parent directories
- [ ] File upload works
- [ ] File download works
- [ ] User cannot get shell access (ssh command fails)

### Automation (If Applicable)
- [ ] Python report script created
- [ ] Script has execute permissions
- [ ] RDS credentials configured in script
- [ ] Script tested manually
- [ ] Cron job added with correct schedule
- [ ] Log file location verified

### Documentation & Handoff
- [ ] Credentials created and stored securely
- [ ] Client handoff document prepared
- [ ] Connection details verified
- [ ] Support contact information provided
- [ ] Credentials delivered via secure channel (NOT email)

---

## Common Commands

### User & Directory Management

```bash
# View user details
id increff
getent passwd increff

# Change password
sudo passwd increff

# Delete user (if needed)
sudo userdel -r increff

# List directory contents with details
ls -la /sftp/increff/
sudo du -sh /sftp/increff/upload

# Change directory ownership
sudo chown increff:increff /sftp/increff/upload

# Change permissions
sudo chmod 755 /sftp/increff/upload
```

### SSH Service Management

```bash
# Check status
sudo systemctl status sshd

# Start/stop/restart
sudo systemctl start sshd
sudo systemctl stop sshd
sudo systemctl restart sshd

# View service logs
sudo journalctl -u sshd -f

# Check if listening on port 22
sudo netstat -tlnp | grep :22
sudo ss -tlnp | grep :22

# Validate SSH config
sudo sshd -t

# Debug mode
sudo sshd -d
```

### Monitoring & Troubleshooting

```bash
# View recent SSH connections
sudo tail -20 /var/log/auth.log

# View all increff connections
sudo grep increff /var/log/auth.log

# Check failed login attempts
sudo grep "Failed password" /var/log/auth.log | grep increff

# Monitor in real-time
sudo tail -f /var/log/auth.log | grep increff

# Count connections by IP
sudo grep increff /var/log/auth.log | grep Accepted | awk '{print $11}' | sort | uniq -c

# Check disk usage
df -h /sftp

# Check file count
find /sftp/increff/upload -type f | wc -l
```

### Report Generation

```bash
# Test report script manually
sudo python3 /opt/reports/generate_increff_report.py

# View report generation logs
sudo tail -50 /var/log/increff_report.log

# Check cron execution
sudo grep increff /var/log/syslog | tail -20

# View cron jobs
sudo crontab -l

# Check if Python dependencies installed
python3 -c "import pymysql, pandas; print('OK')"
```

---

## Quick Troubleshooting

### Cannot Connect via SFTP

**Error**: `Connection refused` or `Connection timed out`

**Fix**:
```bash
# 1. Check SSH is running
sudo systemctl status sshd

# 2. Check security group
aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx

# 3. Verify IP has access
telnet 3.211.91.14 22

# 4. Check firewall
sudo ufw status
sudo ufw allow 22/tcp
```

### Authentication Failed

**Error**: `Permission denied (password)`

**Fix**:
```bash
# 1. Verify user exists
id increff

# 2. Reset password
sudo passwd increff

# 3. Check user shell
grep increff /etc/passwd
# Should end with: /usr/sbin/nologin

# 4. Check password policy
sudo cat /etc/login.defs | grep PASS
```

### Permission Denied When Uploading

**Error**: `Permission denied` when trying to upload

**Fix**:
```bash
# Check directory ownership
ls -la /sftp/increff/

# Fix if needed
sudo chown root:root /sftp/increff
sudo chmod 755 /sftp/increff

ls -la /sftp/increff/upload/

# Fix if needed
sudo chown increff:increff /sftp/increff/upload
sudo chmod 755 /sftp/increff/upload
```

### User Can Access Other Directories

**Problem**: User can navigate outside `/upload`

**Fix**:
```bash
# Check SSH config has chroot
grep -A5 "Match User increff" /etc/ssh/sshd_config

# Should show: ChrootDirectory /sftp/increff

# Restart SSH
sudo systemctl restart sshd

# Test again
sftp increff@3.211.91.14
sftp> cd ..
# Should fail
```

### Reports Not Generating

**Error**: No files appearing in `/sftp/increff/upload`

**Fix**:
```bash
# 1. Test script manually
sudo python3 /opt/reports/generate_increff_report.py

# 2. Check logs
sudo tail -50 /var/log/increff_report.log

# 3. Check RDS connectivity
mysql -h your-rds-endpoint.com -u dbuser -p -e "SELECT 1"

# 4. Verify script has correct permissions
ls -la /opt/reports/generate_increff_report.py
chmod +x /opt/reports/generate_increff_report.py

# 5. Check cron executed
sudo grep CRON /var/log/syslog | grep increff

# 6. Verify Python packages
python3 -m pip list | grep -E "pymysql|pandas"
```

---

## Security Checklist

### Before Going to Production

- [ ] SSH key rotation completed (if using keys)
- [ ] Strong password enforced (16+ characters, mixed case, numbers, symbols)
- [ ] Security group whitelists specific IPs only (NOT 0.0.0.0/0)
- [ ] Chroot jail verified (user cannot escape)
- [ ] Audit logging enabled and monitored
- [ ] Backups configured (daily automated)
- [ ] CloudWatch alarms set up
- [ ] SSH config syntax validated
- [ ] Password stored in AWS Secrets Manager
- [ ] Credentials NOT in code or scripts
- [ ] Firewall rules verified
- [ ] VPC security groups verified
- [ ] Network ACLs verified
- [ ] EBS encryption enabled
- [ ] CloudWatch Logs integration configured

---

## File Structure

After setup, your SFTP server structure should look like:

```
EC2 Instance (3.211.91.14)
│
├── /sftp/                          (root:root, 755)
│   └── increff/                    (root:root, 755)
│       ├── upload/                 (increff:increff, 755)
│       │   ├── Daily_Report_2024-01-15.csv
│       │   ├── Daily_Report_2024-01-16.csv
│       │   └── Monthly_Report_2024-01.csv
│       └── .ssh/                   (increff:increff, 700)
│           └── authorized_keys     (increff:increff, 600) [if using key auth]
│
├── /opt/reports/
│   └── generate_increff_report.py  (executable)
│
└── /var/log/
    ├── auth.log                    (SSH audit logs)
    └── increff_report.log          (Report generation logs)
```

---

## Client Information

### Share These Details with Increff

```
Host:              3.211.91.14
Port:              22
Protocol:          SFTP
Username:          increff
Password:          [Provided via secure channel]
Remote Directory:  /upload

Report Frequency:  Daily at 2:00 AM UTC
File Format:       CSV
Encoding:          UTF-8
Retention:         30 days (auto-delete)
```

### Do NOT Share via Email

❌ **INSECURE**: Email, Slack, Teams, Discord
✅ **SECURE**: In-person, secure password manager, AWS Secrets Manager, encrypted file

---

## Performance Tips

### Optimize Transfer Speed

```bash
# Use faster SSH ciphers
sudo nano /etc/ssh/sshd_config

# Add line:
Ciphers chacha20-poly1305@openssh.com,aes128-ctr,aes192-ctr

# Increase parallelism
# In SFTP client (e.g., FileZilla):
# - Set simultaneous connections: 5-10
# - Use binary mode for transfers
```

### Monitor Performance

```bash
# Check network throughput
iftop

# Check CPU usage
top

# Check disk I/O
iostat -x 1 5

# Check active connections
netstat -an | grep ESTABLISHED | wc -l
```

---

## Cost Optimization

**Estimated Monthly Costs** (Assuming US East 1):
- EC2 t3.small: $10-15
- Elastic IP: $0-3 (free if always attached)
- Data Transfer: $0-5 (first 1GB/month free)
- **Total**: $10-23/month

**Cost Saving Tips**:
- Use t3.small or t3.micro instead of larger instances
- Delete old reports regularly (30-day retention recommended)
- Use spot instances if acceptable for your use case
- Consolidate multiple clients on same server

---

## Monitoring & Alerts

### Set Up CloudWatch Alarms

```bash
# Alert if SSH connection attempts spike
aws cloudwatch put-metric-alarm \
  --alarm-name "SFTP-High-Connections" \
  --metric-name NetworkIn \
  --namespace AWS/EC2 \
  --threshold 1000000000 \
  --comparison-operator GreaterThanThreshold

# Alert if disk space low
aws cloudwatch put-metric-alarm \
  --alarm-name "SFTP-Disk-Full" \
  --metric-name DiskSpaceUtilization \
  --threshold 90 \
  --comparison-operator GreaterThanThreshold
```

### Enable Enhanced Monitoring

```bash
# View detailed logs
sudo tail -f /var/log/auth.log

# Monitor in real-time
sudo journalctl -u sshd -f

# Set up CloudWatch Logs agent
# (See detailed guide in EC2_SFTP.md)
```

---

## Backup & Disaster Recovery

### Automated Daily Backup

```bash
# Add to crontab
sudo crontab -e

# Add:
0 3 * * * tar -czf /backups/sftp_$(date +\%Y-\%m-\%d).tar.gz /sftp/
0 3 * * * aws s3 sync /backups/ s3://backup-bucket/sftp/ --delete

# Or use snapshot
aws ec2 create-snapshot --volume-id vol-xxxxxxxxx --description "Daily SFTP backup"
```

### Restore from Backup

```bash
# From S3
aws s3 cp s3://backup-bucket/sftp_2024-01-15.tar.gz /tmp/
sudo tar -xzf /tmp/sftp_2024-01-15.tar.gz -C /

# From snapshot
aws ec2 create-volume --snapshot-id snap-xxxxxxxxx --availability-zone us-east-1a
```

---

## Related Documentation

📄 **Full Guide**: See `EC2_SFTP.md` for:
- Detailed step-by-step setup
- Advanced SSH configuration
- Key-based authentication
- Python report automation
- AWS Lambda/EventBridge setup
- Comprehensive troubleshooting
- Security best practices
- Client handoff templates

📄 **Database Guide**: See `RDS.md` for:
- MySQL RDS setup
- Database migration
- Query optimization
- Monitoring and alerts

---

## Support

**Having issues?**

1. **Check** Quick Troubleshooting section above
2. **Review** Full documentation in `EC2_SFTP.md`
3. **Run** diagnostic commands from "Common Commands" section
4. **Contact** DevOps team if issue persists

**Contact Info**:
- Email: devops@urbangabru.com
- Phone: +91-xxxx-xxxx-xxxx
- Slack: #infrastructure-support

---

## Next Steps

After initial setup:

1. ✅ Test SFTP connection with client
2. ✅ Verify first report generates
3. ✅ Set up monitoring/alerts
4. ✅ Schedule quarterly password rotation
5. ✅ Document in team wiki/knowledge base
6. ✅ Add to runbooks for oncall
7. ✅ Set up automated backups
8. ✅ Review logs weekly for anomalies

---

## Useful Links

- [OpenSSH Manual](https://man.openbsd.org/sshd_config)
- [AWS EC2 Security Groups](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)
- [FileZilla Documentation](https://wiki.filezilla-project.org/)
- [paramiko (Python SSH)](https://www.paramiko.org/)
- [AWS EC2 User Guide](https://docs.aws.amazon.com/ec2/)

---

## Quick Reference

| Task | Command |
|------|---------|
| Create user | `sudo adduser increff` |
| Set password | `sudo passwd increff` |
| Create directories | `sudo mkdir -p /sftp/increff/upload` |
| Fix permissions | `sudo chown increff:increff /sftp/increff/upload` |
| Edit SSH config | `sudo nano /etc/ssh/sshd_config` |
| Restart SSH | `sudo systemctl restart sshd` |
| Test connection | `sftp increff@3.211.91.14` |
| Check logs | `sudo tail -f /var/log/auth.log` |
| View cron jobs | `sudo crontab -l` |
| Test script | `sudo python3 /opt/reports/generate_increff_report.py` |

---

**Version**: 1.0
**Last Updated**: 2024-01-15
**Status**: Production Ready
**Owner**: DevOps Team (UrbanGabru)


reference link - https://chatgpt.com/share/6a71b0be-fea8-83ee-b1eb-787ef0f620e6
