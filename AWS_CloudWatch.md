# AWS CloudWatch Setup Guide for EC2 PM2 Logs & Metrics

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Create IAM Role](#step-1-create-iam-role)
4. [Step 2: Attach IAM Role to EC2](#step-2-attach-iam-role-to-ec2)
5. [Step 3: Install CloudWatch Agent](#step-3-install-cloudwatch-agent)
6. [Step 4: Configure CloudWatch Agent](#step-4-configure-cloudwatch-agent)
7. [Step 5: Start Agent & Verify](#step-5-start-agent--verify)
8. [Step 6: Access Logs in CloudWatch Console](#step-6-access-logs-in-cloudwatch-console)
9. [CPU Monitoring](#cpu-monitoring)
10. [RAM/Memory Monitoring](#rammemory-monitoring)
11. [Storage Monitoring](#storage-monitoring)
12. [Troubleshooting](#troubleshooting)

---

## Overview

This guide sets up AWS CloudWatch to:
- Stream live PM2 application logs (stdout & stderr) to CloudWatch
- Monitor EC2 CPU, RAM, and Storage metrics
- Enable developers to view logs in real-time via CloudWatch Console
- Set retention policies and create alarms

**Benefits:**
- Centralized log management
- No need to SSH into EC2 to view logs
- Real-time monitoring of system resources
- Historical log retention (customizable)

---

## Prerequisites

- EC2 instance running Ubuntu (tested on Ubuntu 24.04)
- 7 PM2 applications running on the instance
- AWS account with permissions to:
  - Create IAM roles
  - Modify EC2 instance properties
  - Access CloudWatch
- EC2 instance IP: `3.211.91.14`
- Instance ID: `i-07e20b18b7281b7f7`
- Region: `us-east-1`

---

## Step 1: Create IAM Role

CloudWatch Agent needs permissions to send logs to CloudWatch. Create an IAM role for this.

### Via AWS Console (Recommended)

1. Go to **AWS Console** → **IAM** → **Roles** → **Create role**

2. **Select trusted entity:**
   - Trusted entity type: `AWS service`
   - Service or use case: `EC2`

3. **Add permissions:**
   - Search for `CloudWatchAgentServerPolicy`
   - Select it and click **Next**

4. **Name and review:**
   - Role name: `cloudwatch-agent-role`
   - Description: `Allows EC2 instances to send logs to CloudWatch`
   - Click **Create role**

### Via AWS CLI (Alternative)

```bash
# Create role
aws iam create-role --role-name cloudwatch-agent-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' --region us-east-1

# Attach policy
aws iam attach-role-policy --role-name cloudwatch-agent-role \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy \
  --region us-east-1

# Create instance profile
aws iam create-instance-profile --instance-profile-name cloudwatch-agent-profile \
  --region us-east-1

# Add role to instance profile
aws iam add-role-to-instance-profile \
  --instance-profile-name cloudwatch-agent-profile \
  --role-name cloudwatch-agent-role \
  --region us-east-1
```

---

## Step 2: Attach IAM Role to EC2

### Via AWS Console

1. Go to **EC2 Console** → **Instances** → Select your instance
2. Click **Actions** → **Security** → **Modify IAM role**
3. Select: `cloudwatch-agent-role`
4. Click **Update IAM role**
5. Reboot the instance:

```bash
sudo reboot
```

Wait ~2 minutes for the instance to restart.

### Via AWS CLI

```bash
INSTANCE_ID="i-07e20b18b7281b7f7"

# Associate IAM instance profile
aws ec2 associate-iam-instance-profile \
  --iam-instance-profile Name=cloudwatch-agent-profile \
  --instance-id $INSTANCE_ID \
  --region us-east-1

# Reboot
aws ec2 reboot-instances --instance-ids $INSTANCE_ID --region us-east-1
```

**Verify IAM role is attached:**
```bash
aws ec2 describe-instances --instance-ids i-07e20b18b7281b7f7 \
  --query 'Reservations[0].Instances[0].IamInstanceProfile' \
  --region us-east-1
```

---

## Step 3: Install CloudWatch Agent

SSH into your EC2 instance and run:

```bash
# Download the agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb

# Install
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Verify installation
ls -la /opt/aws/amazon-cloudwatch-agent/
```

**Expected output:**
```
total 12345
drwxr-xr-x bin
drwxr-xr-x etc
drwxr-xr-x logs
```

---

## Step 4: Configure CloudWatch Agent

Create the configuration file for PM2 logs:

```bash
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null <<'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/.pm2/logs/*-out.log",
            "log_group_name": "/pm2/apps/output",
            "log_stream_name": "{instance_id}-{ip_address}",
            "timestamp_format": "%b %d %H:%M:%S"
          },
          {
            "file_path": "/home/ubuntu/.pm2/logs/*-error.log",
            "log_group_name": "/pm2/apps/errors",
            "log_stream_name": "{instance_id}-{ip_address}",
            "timestamp_format": "%b %d %H:%M:%S"
          }
        ]
      }
    },
    "log_stream_name": "default_log_stream"
  }
}
EOF
```

**Verify config was created:**
```bash
sudo cat /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

### Configuration Breakdown

| Field | Value | Purpose |
|-------|-------|---------|
| `file_path` | `/home/ubuntu/.pm2/logs/*-out.log` | Collect all PM2 stdout logs |
| `log_group_name` | `/pm2/apps/output` | CloudWatch log group for output |
| `log_stream_name` | `{instance_id}-{ip_address}` | Unique identifier per EC2 instance |
| `timestamp_format` | `%b %d %H:%M:%S` | Parse timestamps from log entries |

---

## Step 5: Start Agent & Verify

### Start the Agent

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

**Expected output:**
```
Configuration validation succeeded
```

### Verify Agent Status

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -m ec2 -a status
```

**Expected output:**
```
{
  "status": "running"
}
```

### Check Agent Logs

```bash
sudo tail -f /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

Look for errors or warnings.

---

## Step 6: Access Logs in CloudWatch Console

### View PM2 Logs

1. Go to **AWS CloudWatch Console**
2. Navigate to **Logs** → **Log groups**
3. You should see two new log groups:
   - `/pm2/apps/output` (stdout)
   - `/pm2/apps/errors` (stderr)

4. Click on `/pm2/apps/output` to view logs
5. Click on the **log stream** to see real-time logs

### Search & Filter Logs

Use **CloudWatch Logs Insights** to query logs:

```
fields @timestamp, @message
| filter @message like /error|ERROR|failed/
| stats count() by @message
```

### Export Logs

1. Select a log stream
2. Click **Actions** → **Download**

---

## CPU Monitoring

### Enable CPU Metrics

Update the CloudWatch Agent config to include CPU metrics:

```bash
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null <<'EOF'
{
  "metrics": {
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_USAGE_IDLE",
            "unit": "Percent"
          },
          {
            "name": "cpu_usage_iowait",
            "rename": "CPU_USAGE_IOWAIT",
            "unit": "Percent"
          },
          "cpu_usage_system",
          "cpu_usage_active"
        ],
        "totalcpu": false,
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/.pm2/logs/*-out.log",
            "log_group_name": "/pm2/apps/output",
            "log_stream_name": "{instance_id}-{ip_address}",
            "timestamp_format": "%b %d %H:%M:%S"
          },
          {
            "file_path": "/home/ubuntu/.pm2/logs/*-error.log",
            "log_group_name": "/pm2/apps/errors",
            "log_stream_name": "{instance_id}-{ip_address}",
            "timestamp_format": "%b %d %H:%M:%S"
          }
        ]
      }
    }
  }
}
EOF
```

### Restart Agent

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

### View CPU Metrics

1. Go to **CloudWatch** → **Metrics** → **CWAgent**
2. Look for:
   - `CPU_USAGE_IDLE`
   - `CPU_USAGE_IOWAIT`
   - `CPU_USAGE_ACTIVE`

3. Create a dashboard to visualize CPU usage

### Set CPU Alarm

1. Go to **CloudWatch** → **Alarms** → **Create alarm**
2. Select metric: `CPU_USAGE_ACTIVE`
3. Set threshold: `> 80%` for 5 minutes
4. Add SNS notification to alert developers

---

## RAM/Memory Monitoring

### Enable Memory Metrics

Update config to include memory collection:

```bash
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null <<'EOF'
{
  "metrics": {
    "metrics_collected": {
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEMORY_USED_PERCENT",
            "unit": "Percent"
          },
          {
            "name": "mem_used",
            "rename": "MEMORY_USED_MB",
            "unit": "Megabytes"
          },
          {
            "name": "mem_total",
            "rename": "MEMORY_TOTAL_MB",
            "unit": "Megabytes"
          },
          {
            "name": "mem_available",
            "rename": "MEMORY_AVAILABLE_MB",
            "unit": "Megabytes"
          }
        ],
        "metrics_collection_interval": 60
      },
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_USAGE_IDLE",
            "unit": "Percent"
          },
          "cpu_usage_active"
        ],
        "totalcpu": false,
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/.pm2/logs/*-out.log",
            "log_group_name": "/pm2/apps/output",
            "log_stream_name": "{instance_id}-{ip_address}",
            "timestamp_format": "%b %d %H:%M:%S"
          },
          {
            "file_path": "/home/ubuntu/.pm2/logs/*-error.log",
            "log_group_name": "/pm2/apps/errors",
            "log_stream_name": "{instance_id}-{ip_address}",
            "timestamp_format": "%b %d %H:%M:%S"
          }
        ]
      }
    }
  }
}
EOF
```

### Restart Agent

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

### View Memory Metrics

1. Go to **CloudWatch** → **Metrics** → **CWAgent**
2. Look for:
   - `MEMORY_USED_PERCENT`
   - `MEMORY_USED_MB`
   - `MEMORY_AVAILABLE_MB`
   - `MEMORY_TOTAL_MB`

### Set Memory Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name high-memory-usage \
  --alarm-description "Alert when memory usage > 85%" \
  --metric-name MEMORY_USED_PERCENT \
  --namespace CWAgent \
  --statistic Average \
  --period 300 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --region us-east-1
```

---

## Storage Monitoring

### Enable Disk Space Metrics

Update config to include disk metrics:

```bash
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null <<'EOF'
{
  "metrics": {
    "metrics_collected": {
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DISK_USED_PERCENT",
            "unit": "Percent"
          },
          {
            "name": "inodes_free",
            "rename": "DISK_INODES_FREE",
            "unit": "Count"
          },
          {
            "name": "used",
            "rename": "DISK_USED_GB",
            "unit": "Gigabytes"
          },
          {
            "name": "total",
            "rename": "DISK_TOTAL_GB",
            "unit": "Gigabytes"
          }
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEMORY_USED_PERCENT",
            "unit": "Percent"
          },
          {
            "name": "mem_available",
            "rename": "MEMORY_AVAILABLE_MB",
            "unit": "Megabytes"
          }
        ],
        "metrics_collection_interval": 60
      },
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_USAGE_IDLE",
            "unit": "Percent"
          },
          "cpu_usage_active"
        ],
        "totalcpu": false,
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/.pm2/logs/*-out.log",
            "log_group_name": "/pm2/apps/output",
            "log_stream_name": "{instance_id}-{ip_address}",
            "timestamp_format": "%b %d %H:%M:%S"
          },
          {
            "file_path": "/home/ubuntu/.pm2/logs/*-error.log",
            "log_group_name": "/pm2/apps/errors",
            "log_stream_name": "{instance_id}-{ip_address}",
            "timestamp_format": "%b %d %H:%M:%S"
          }
        ]
      }
    }
  }
}
EOF
```

### Restart Agent

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

### View Disk Metrics

1. Go to **CloudWatch** → **Metrics** → **CWAgent**
2. Look for:
   - `DISK_USED_PERCENT`
   - `DISK_USED_GB`
   - `DISK_TOTAL_GB`
   - `DISK_INODES_FREE`

### Set Disk Space Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name low-disk-space \
  --alarm-description "Alert when disk usage > 80%" \
  --metric-name DISK_USED_PERCENT \
  --namespace CWAgent \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --region us-east-1
```

### Check Current Disk Usage

```bash
df -h
```

**Output example:**
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/xvda1       30G   15G   15G  50% /
```

---

## Troubleshooting

### Issue: No logs appearing in CloudWatch

**Check 1: PM2 logs exist**
```bash
ls -la ~/.pm2/logs/
```

If empty, PM2 apps aren't logging output.

**Check 2: Agent is running**
```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -m ec2 -a status
```

**Check 3: Agent logs for errors**
```bash
sudo tail -50 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

**Check 4: IAM role has permissions**
```bash
aws sts get-caller-identity
```

Should show the instance's role.

### Issue: Agent fails to start

**Restart agent:**
```bash
sudo systemctl restart amazon-cloudwatch-agent
```

**Check service status:**
```bash
sudo systemctl status amazon-cloudwatch-agent
```

### Issue: High CPU/Memory but no alerts

**Verify alarms exist:**
```bash
aws cloudwatch describe-alarms --region us-east-1
```

**Create alarm manually:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu-alert \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPU_USAGE_ACTIVE \
  --namespace CWAgent \
  --statistic Average \
  --period 60 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --region us-east-1
```

### Issue: Disk space growing rapidly

**Check what's consuming space:**
```bash
du -sh /home/ubuntu/*
du -sh /var/log/*
```

**Clean old PM2 logs manually:**
```bash
pm2 flush
```

---

## Best Practices

1. **Set retention policies** for logs (default: Never expire)
   - Go to CloudWatch → Log groups → Select group → Edit retention
   - Recommended: 7-30 days to control costs

2. **Create dashboards** to monitor all metrics
   ```
   CloudWatch → Dashboards → Create dashboard
   Add widgets for CPU, Memory, Disk, Error logs
   ```

3. **Set up SNS notifications** for alarms
   ```bash
   aws sns create-topic --name cloudwatch-alerts --region us-east-1
   ```

4. **Use metric filters** to extract specific errors
   ```
   CloudWatch → Logs → Log groups → Metric filters
   ```

5. **Monitor costs**
   - Logs ingestion: $0.50 per GB
   - Metric storage: $0.30 per metric per month
   - Estimate: ~$5-10/month for this setup

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Check PM2 logs locally | `pm2 logs` |
| Restart CloudWatch Agent | `sudo systemctl restart amazon-cloudwatch-agent` |
| Check agent status | `sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -m ec2 -a status` |
| View agent logs | `sudo tail -f /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log` |
| Update agent config | `sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json` |
| Check disk space | `df -h` |
| Check memory usage | `free -h` |
| Check CPU usage | `top -b -n 1 \| head -20` |

---

## Support & References

- [AWS CloudWatch Agent Docs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html)
- [CloudWatch Logs Pricing](https://aws.amazon.com/cloudwatch/pricing/)
- [PM2 Documentation](https://pm2.keymetrics.io/)

---

**Last Updated:** September 9, 2026  
**Instance:** urbangabru-prod-server-2 (i-07e20b18b7281b7f7)  
**Region:** us-east-1
