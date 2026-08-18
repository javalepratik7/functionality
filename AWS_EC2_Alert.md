# AWS EC2 Resource Alert Setup Guide

Complete guide to set up automated memory & CPU alert emails on EC2 using msmtp and cron.

---

## Overview

| What | Details |
|---|---|
| Alert: Memory | ≥ 85% usage |
| Alert: CPU | ≥ 90% usage |
| Runs every | 15 minutes via cron |
| Sends email to | pratik.javale@urbangabru.in, tech@urbangabru.in, swetalina.nayak@urbangabru.in, rutwik.shinde@urbangabru.in, pritam.kumar@urbangabru.in |
| Email sender | urbangabru4321@gmail.com |
| Server | Ubuntu EC2 (t3.large — 8GB RAM) |

---

## Step 1 — SSH into EC2

```bash
ssh ubuntu@<YOUR_EC2_IP>
```

---

## Step 2 — Install msmtp

```bash
sudo apt update
sudo apt install msmtp -y
```

---

## Step 3 — Create Gmail App Password

1. Go to: **myaccount.google.com/apppasswords**
2. App: **Mail** → Device: **Linux**
3. Copy the 16-character password generated

---

## Step 4 — Configure msmtp

```bash
nano ~/.msmtprc
```

Paste exactly (no extra spaces):

```
defaults
auth on
tls on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile ~/.msmtp.log

account gmail
host smtp.gmail.com
port 587
from urbangabru4321@gmail.com
user urbangabru4321@gmail.com
password YOUR_16_CHAR_APP_PASSWORD

account default : gmail
```

```bash
chmod 600 ~/.msmtprc
```

> **Important:** No extra spaces before commands — msmtp is strict about formatting.

---

## Step 5 — Test Email

```bash
echo "Subject: EC2 msmtp Test" | msmtp pratikjavale712@gmail.com
```

Check inbox — if email arrives, msmtp is working correctly.

Verify in log:
```bash
cat ~/.msmtp.log
```

Should show `exitcode=EX_OK`.

---

## Step 6 — Create Alert Script

```bash
nano ~/memory-alert.sh
```

Paste:

```bash
#!/bin/bash

TO="pratik.javale@urbangabru.in tech@urbangabru.in swetalina.nayak@urbangabru.in rutwik.shinde@urbangabru.in pritam.kumar@urbangabru.in"
HOSTNAME=$(hostname)
IP=$(hostname -I | awk '{print $1}')
DATE=$(date)

MEM_THRESHOLD=${MEM_THRESHOLD:-85}
CPU_THRESHOLD=${CPU_THRESHOLD:-90}

MEM_USAGE=$(free | awk '/Mem:/ {printf("%.0f"), $3/$2 * 100}')
CPU_USAGE=$(top -bn2 | grep "Cpu(s)" | tail -1 | awk '{print 100 - $8}' | cut -d. -f1)

ALERT_REASON=""

if [ "$MEM_USAGE" -ge "$MEM_THRESHOLD" ]; then
  ALERT_REASON="${ALERT_REASON}- High Memory Usage (${MEM_USAGE}%)\n"
fi

if [ "$CPU_USAGE" -ge "$CPU_THRESHOLD" ]; then
  ALERT_REASON="${ALERT_REASON}- High CPU Usage (${CPU_USAGE}%)\n"
fi

if [ ! -z "$ALERT_REASON" ]; then
/usr/bin/msmtp $TO <<MAILEOF
Subject: EC2 Alert - ${HOSTNAME}

EC2 RESOURCE ALERT
Server  : ${HOSTNAME}
IP      : ${IP}
Time    : ${DATE}

--------------------------------------------------
ALERT REASONS
--------------------------------------------------
$(printf "%b" "$ALERT_REASON")
--------------------------------------------------
MEMORY STATUS
--------------------------------------------------
Usage   : ${MEM_USAGE}%
$(free -h | awk 'NR<=2')

--------------------------------------------------
CPU STATUS
--------------------------------------------------
Usage   : ${CPU_USAGE}%
$(top -bn2 | grep "Cpu(s)" | tail -1)

--------------------------------------------------
TOP PROCESSES (by Memory)
--------------------------------------------------
$(ps -eo pid,user,%mem,%cpu,rss,cmd --sort=-rss | awk '
NR==1 { printf "%-7s %-10s %-5s %-5s %-8s %s\n", "PID","USER","MEM%","CPU%","RAM(MB)","PROCESS" }
NR>1  { printf "%-7s %-10s %-5s %-5s %-8.0f %s\n", $1,$2,$3,$4,$5/1024,substr($6,1,50) }
' | head -6)
--------------------------------------------------
Useful Commands: pm2 monit | top -o %MEM | top -o %CPU
--------------------------------------------------
MAILEOF
fi
```

---

## Step 7 — Make Executable and Test

```bash
chmod +x ~/memory-alert.sh

# Force trigger both alerts
MEM_THRESHOLD=1 CPU_THRESHOLD=1 bash ~/memory-alert.sh
```

Check inbox — all 5 recipients should receive the alert email.

Verify in log:
```bash
cat ~/.msmtp.log | tail -5
# recipients= should show all 5 email addresses
```

---

## Step 8 — Add to Crontab

```bash
crontab -e
# Select 1 (nano)
```

Add this line at the bottom:

```
*/15 * * * * /bin/bash /home/ubuntu/memory-alert.sh
```

Save: **Ctrl+X → Y → Enter**

---

## Step 9 — Verify Everything

```bash
# Check crontab
crontab -l

# Check cron service is running
sudo systemctl status cron

# Check msmtp log
cat ~/.msmtp.log
```

---

## Threshold Configuration

| Variable | Default | Meaning |
|---|---|---|
| `MEM_THRESHOLD` | 85 | Alert if RAM usage ≥ 85% |
| `CPU_THRESHOLD` | 90 | Alert if CPU usage ≥ 90% |

To change thresholds, edit the script:
```bash
nano ~/memory-alert.sh
# Change MEM_THRESHOLD or CPU_THRESHOLD values
```

---

## Useful Debug Commands

```bash
# Force trigger alert (for testing)
MEM_THRESHOLD=1 CPU_THRESHOLD=1 bash ~/memory-alert.sh

# Check current memory usage
free | awk '/Mem:/ {printf("RAM Usage: %.2f%%\n"), $3/$2 * 100}'

# Check current CPU usage
top -bn2 | grep "Cpu(s)" | tail -1

# Check msmtp log
cat ~/.msmtp.log

# Check cron logs
grep CRON /var/log/syslog | grep memory-alert | tail -10

# Check script with debug output
bash -x ~/memory-alert.sh
```

---

## Email Recipients

| Name | Email |
|---|---|
| Pratik | pratik.javale@urbangabru.in |
| Tech | tech@urbangabru.in |
| Swetalina | swetalina.nayak@urbangabru.in |
| Rutwik | rutwik.shinde@urbangabru.in |
| Pritam | pritam.kumar@urbangabru.in |

---

## Crontab Summary

```
*/15 * * * *   /bin/bash /home/ubuntu/memory-alert.sh   ← every 15 min
```

---

## Notes

- `MEM_THRESHOLD=${MEM_THRESHOLD:-85}` syntax allows override from command line for testing without editing the script
- `top -bn2` uses 2 samples for accurate CPU reading (single sample is often inaccurate)
- msmtp config must have no extra spaces before commands or it throws `unknown command` error
- `chmod 600 ~/.msmtprc` is required — msmtp refuses to run with open permissions
