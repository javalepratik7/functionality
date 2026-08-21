# EC2 RAM Exhaustion Troubleshooting: Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [Symptoms & Detection](#symptoms--detection)
3. [Diagnostic Commands](#diagnostic-commands)
4. [Common Causes](#common-causes)
5. [Real-World Case Study](#real-world-case-study)
6. [Remediation Strategies](#remediation-strategies)
7. [Prevention & Monitoring](#prevention--monitoring)
8. [Performance Tuning](#performance-tuning)
9. [Incident Response Playbook](#incident-response-playbook)
10. [Automated Recovery](#automated-recovery)

---

## Overview

EC2 RAM exhaustion (100% memory usage) causes:
- Application crashes
- No response to requests (frozen state)
- System becomes unresponsive
- Automatic process termination by OS
- Service degradation
- Data loss potential

**Root Causes**:
- Memory leaks in application code
- Web scraping without proper resource management
- Large database queries pulling entire result sets into memory
- Misconfigured application parameters
- Runaway processes
- Cache accumulation (Redis, Memcached)
- Incorrect JVM/Node.js heap size configuration

**Cost**: Each incident can cost:
- Data loss
- Customer dissatisfaction
- Manual intervention time
- SLA violations
- Potential compliance issues

---

## Symptoms & Detection

### Immediate Symptoms

✅ **You'll Notice**:
- Applications timeout or become unresponsive
- SSH connection slow or hangs
- HTTP requests timeout (502/503 errors)
- Cron jobs fail to execute
- New process spawning fails

### How to Detect

**Quick Check - Memory Usage Percentage**:

```bash
# Check current memory usage
free | awk '/Mem:/ {printf "%.2f%%\n", $3/$2*100}'

# Expected output: 87.45%
# ⚠️ Alert if > 85%
# 🚨 Critical if > 95%
```

**Breakdown**:

```bash
free -h
# Output:
#               total        used        free      shared  buff/cache   available
# Mem:          3.8Gi       3.7Gi        0.1Gi        0Mi        0.0Gi      0.0Gi
# Swap:         1.0Gi       0.5Gi       0.5Gi

# Calculation:
# Used%: 3.7 / 3.8 * 100 = 97.4% (CRITICAL)
```

**Quick Health Check**:

```bash
#!/bin/bash
# memory_check.sh

mem_usage=$(free | awk '/Mem:/ {printf "%.2f", $3/$2*100}')

if (( $(echo "$mem_usage > 90" | bc -l) )); then
    echo "🚨 CRITICAL: Memory usage is ${mem_usage}%"
    exit 1
elif (( $(echo "$mem_usage > 75" | bc -l) )); then
    echo "⚠️ WARNING: Memory usage is ${mem_usage}%"
    exit 0
else
    echo "✅ OK: Memory usage is ${mem_usage}%"
    exit 0
fi
```

---

## Diagnostic Commands

### Command 1: Check Memory Usage Percentage

**Purpose**: Get overall memory consumption

```bash
# Method 1: Simple percentage
free | awk '/Mem:/ {printf "%.2f%%\n", $3/$2*100}'

# Output: 94.67%

# Method 2: Detailed breakdown
free -h

# Output:
#               total        used        free      shared  buff/cache   available
# Mem:          7.8Gi       7.5Gi       0.3Gi        0Mi        0.0Gi      0.4Gi
# Swap:         2.0Gi       1.8Gi       0.2Gi

# Method 3: Include swap
free -h | grep -E "Mem:|Swap:"

# Method 4: Watch real-time
watch -n 1 'free -h'  # Updates every 1 second
```

### Command 2: Identify Top Memory-Consuming Processes

**Purpose**: Find which processes are using most RAM

```bash
# Method 1: Top by memory percentage (interactive)
top -o %MEM

# Key columns:
# PID   - Process ID
# USER  - Process owner
# %MEM  - Memory percentage
# VIRT  - Virtual memory allocated
# RES   - Resident memory (actual RAM)
# COMMAND - Process name

# Press 'q' to quit
```

**Output Example**:

```
PID    USER    PR  NI  VIRT   RES  %MEM COMMAND
6458   www-data 20  0  2.1g  1.8g 45.2% python app.py
7123   mysql    20  0  1.4g  1.2g 31.5% mysqld
8901   ubuntu   20  0  512m  256m  6.7% node server.js
1234   root     20  0  150m   50m  1.3% sshd
```

**Analysis**:
- Process 6458 (Python app) = 45.2% of 7.8GB = ~3.5GB
- Process 7123 (MySQL) = 31.5% of 7.8GB = ~2.5GB
- Process 8901 (Node) = 6.7% of 7.8GB = ~0.52GB
- Total = 6.52GB / 7.8GB ≈ 84%

### Command 3: Get Process Details

**Purpose**: Identify specific process and its parent

```bash
# Get process details by PID
ps -fp 6458

# Output:
# UID   PID  PPID  C STIME TTY      STAT TIME      COMMAND
# www-data 6458 6400  0  02:15 ?  Sl  0:45 python /opt/app/main.py

# Breakdown:
# - PID 6458: Process ID
# - PPID 6400: Parent process ID
# - STIME 02:15: Start time
# - TIME 0:45: CPU time used
```

### Command 4: Check Process Family & Details

**Purpose**: Understand process hierarchy and context

```bash
# Method 1: Show parent process chain
pstree -aps 6458

# Output:
# systemd(1)
#   └─python(6400)
#       └─python(6458)
#           ├─{python}(6459)
#           ├─{python}(6460)
#           └─{python}(6461)

# Method 2: More detailed info
pstree -p 6458

# Method 3: With full command line
pstree -p -c 6458
```

### Command 5: Check Process Memory Details

**Purpose**: See memory breakdown for specific process

```bash
# Method 1: Detailed process info
ps aux | grep python

# Output:
# www-data  6458  45.2  45.2 2147200 3563200 ?  Sl  02:15 0:45 python /opt/app/main.py
# ├─ Column 3: %CPU
# ├─ Column 4: %MEM
# ├─ Column 5: VSZ (Virtual size in KB)
# └─ Column 6: RSS (Resident set size in KB)

# Method 2: Show memory in human readable format
ps aux --width 200 | grep python | head -1
# Then calculate: RSS (KB) / 1024 = MB

# Method 3: Real-time memory monitoring for specific process
watch -n 1 'ps aux | grep python | grep -v grep'

# Method 4: Using /proc filesystem
cat /proc/6458/status | grep VmRSS

# Output: VmRSS: 3563200 kB (≈ 3.4GB)

# All memory details
cat /proc/6458/status | grep -E "VmPeak|VmSize|VmHWM|VmRSS"

# Output:
# VmPeak: 2684176 kB (Peak virtual size)
# VmSize: 2147200 kB (Current virtual size)
# VmHWM:  3563200 kB (Peak resident size)
# VmRSS:  3563200 kB (Current resident size)
```

### Command 6: Show Process Summary

**Purpose**: Get overview of all processes by memory

```bash
# Sort by memory usage (descending)
ps aux --sort=-%mem | head -20

# Output:
# USER       PID %CPU %MEM    VSZ   RSS TTY STAT START   TIME COMMAND
# www-data  6458 12.5 45.2 2147200 3563200 ? Sl   02:15 0:45 python app.py
# mysql     7123  5.2 31.5 1468992 2490000 ? Sl   02:20 0:38 mysqld
# root      1234  0.1  1.3  154200   50000 ?  Ss  01:00 0:02 /usr/sbin/sshd

# Show only your application processes
ps aux --sort=-%mem | grep -E "python|node|java" | head -10
```

### Command 7: Check Memory Leaks Over Time

**Purpose**: Identify if process memory grows steadily

```bash
# Script to monitor process memory growth
#!/bin/bash
# monitor_memory.sh

PID=$1
INTERVAL=60  # Check every 60 seconds
COUNT=0
MAX_CHECKS=60  # Run for 1 hour

echo "Monitoring PID $PID for memory leaks..."
echo "Time (sec) | RSS (MB) | VIRT (MB) | Status"
echo "-----------|----------|-----------|--------"

while [ $COUNT -lt $MAX_CHECKS ]; do
    RSS=$(cat /proc/$PID/status 2>/dev/null | grep VmRSS | awk '{print int($2/1024)}')
    VIRT=$(cat /proc/$PID/status 2>/dev/null | grep VmSize | awk '{print int($2/1024)}')
    
    if [ -z "$RSS" ]; then
        echo "Process $PID terminated or not found"
        break
    fi
    
    # Alert if memory growing > 100MB per check
    if [ $COUNT -gt 0 ]; then
        PREV_RSS=$(echo "$PREV_RSS" | tail -1)
        GROWTH=$((RSS - PREV_RSS))
        
        if [ $GROWTH -gt 100 ]; then
            STATUS="⚠️ LEAK ($GROWTH MB in ${INTERVAL}s)"
        else
            STATUS="OK"
        fi
    else
        STATUS="BASELINE"
    fi
    
    echo "$((COUNT * INTERVAL)) | $RSS | $VIRT | $STATUS"
    PREV_RSS=$RSS
    
    COUNT=$((COUNT + 1))
    sleep $INTERVAL
done
```

**Usage**:

```bash
chmod +x monitor_memory.sh
./monitor_memory.sh 6458

# Output:
# Time (sec) | RSS (MB) | VIRT (MB) | Status
# -----------|----------|-----------|--------
# 0          | 3456     | 2147      | BASELINE
# 60         | 3512     | 2150      | OK
# 120        | 3689     | 2155      | ⚠️ LEAK (177 MB in 60s)
# 180        | 3845     | 2160      | ⚠️ LEAK (156 MB in 60s)
# 240        | 4012     | 2165      | ⚠️ LEAK (167 MB in 60s)
```

### Command Summary Table

| Command | Purpose | When to Use |
|---------|---------|-----------|
| `free \| awk '/Mem:/ {printf "%.2f%%\n", $3/$2*100}'` | Overall memory % | First check |
| `top -o %MEM` | Top processes by memory | Find culprit |
| `ps -fp <PID>` | Process details | Verify process info |
| `pstree -aps <PID>` | Process family tree | Understand context |
| `cat /proc/<PID>/status` | Detailed memory breakdown | Analyze memory usage |
| `ps aux --sort=-%mem` | All processes by memory | System overview |
| `watch -n 1 'free -h'` | Real-time memory | Monitor recovery |

---

## Common Causes

### Cause 1: Web Scraping Without Resource Management

**Scenario**: Your Case

Your team discovered a tenant's web scraping workload was consuming 100% RAM.

**Symptoms**:
- Memory usage grows steadily
- Rapid increase (within minutes)
- Python/Node process consuming >50% RAM
- System becomes unresponsive

**Root Cause - Example Code (BAD)**:

```python
# ❌ BAD: Stores all responses in memory
import requests

urls = ["http://example.com/page1", "http://example.com/page2", ...]  # 10,000 URLs

all_data = []
for url in urls:
    response = requests.get(url)
    all_data.append(response.text)  # ⚠️ Keeps all in memory
    # Each page ~500KB, 10k pages = 5GB+!

process_data(all_data)
```

**Problems**:
- All 10,000 responses loaded into RAM simultaneously
- 500KB × 10,000 = 5GB in memory
- No pagination or batching
- No resource cleanup between requests

**Fix - Chunked Processing (GOOD)**:

```python
# ✅ GOOD: Process in batches
import requests
from collections import deque

urls = ["http://example.com/page1", ...]  # 10,000 URLs
BATCH_SIZE = 100  # Process 100 pages at a time

for i in range(0, len(urls), BATCH_SIZE):
    batch_urls = urls[i:i + BATCH_SIZE]
    batch_data = []
    
    for url in batch_urls:
        try:
            response = requests.get(url, timeout=10)
            # Process immediately instead of storing
            process_single_page(response.text)
            # Cleanup
            del response
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
    
    # Clear batch
    batch_data.clear()
    
    # Optional: Add delay to be respectful
    time.sleep(1)
    
    # Log progress
    logger.info(f"Processed {i + BATCH_SIZE}/{len(urls)} pages")

logger.info("Scraping complete")
```

**Better Approach - Streaming**:

```python
# ✅ BETTER: Stream data to disk
import requests
import csv

def stream_scrape_to_csv(urls, output_file):
    """Stream scraping results to CSV file"""
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['url', 'title', 'content', 'scraped_at'])
        
        for idx, url in enumerate(urls, 1):
            try:
                response = requests.get(url, timeout=10)
                data = parse_page(response.text)
                
                # Write to disk immediately (minimal memory)
                writer.writerow([
                    url,
                    data['title'],
                    data['content'],
                    datetime.now()
                ])
                
                if idx % 100 == 0:
                    logger.info(f"Scraped {idx}/{len(urls)} pages")
                    
            except Exception as e:
                logger.error(f"Error: {e}")

# Usage
stream_scrape_to_csv(all_urls, '/data/scraped_data.csv')
```

**Prevention Checklist**:
- ✅ Use generators instead of lists
- ✅ Process data in chunks/batches
- ✅ Stream to disk instead of memory
- ✅ Add resource limits
- ✅ Monitor memory during development
- ✅ Implement pagination
- ✅ Add request delays (be respectful)
- ✅ Clean up objects after use

---

### Cause 2: Memory Leaks in Application Code

**Symptoms**:
- Memory usage increases over time
- Doesn't plateau (keeps growing)
- Restart fixes the issue temporarily

**Example - Node.js Memory Leak**:

```javascript
// ❌ BAD: Memory leak due to accumulating cache
let cache = {};

app.get('/api/data', (req, res) => {
    const id = req.query.id;
    
    if (!cache[id]) {
        cache[id] = expensiveCalculation(id);  // Store in memory
    }
    
    res.json(cache[id]);
});

// Problem: cache never cleared, grows infinitely
```

**Fix**:

```javascript
// ✅ GOOD: Use LRU cache with max size
const LRU = require('lru-cache');

const cache = new LRU({
    max: 1000,           // Max 1000 items
    maxSize: 50000000,   // Max 50MB
    ttl: 1000 * 60 * 60  // 1 hour TTL
});

app.get('/api/data', (req, res) => {
    const id = req.query.id;
    
    if (!cache.has(id)) {
        cache.set(id, expensiveCalculation(id));
    }
    
    res.json(cache.get(id));
});
```

**Example - Python Memory Leak**:

```python
# ❌ BAD: Global list accumulating data
accumulated_data = []

def process_request(data):
    global accumulated_data
    accumulated_data.append(data)  # Keeps growing!
    return accumulated_data

# ✅ GOOD: Use generator or queue
from collections import deque
from threading import Lock

class DataBuffer:
    def __init__(self, max_size=1000):
        self.data = deque(maxlen=max_size)
        self.lock = Lock()
    
    def add(self, item):
        with self.lock:
            self.data.append(item)  # Auto-removes oldest when full
    
    def get_all(self):
        with self.lock:
            return list(self.data)

buffer = DataBuffer(max_size=1000)
```

**Detection**:

```bash
# Monitor process for 1 hour
# If RSS keeps growing, likely a leak
watch -n 60 'ps aux | grep python | grep app'

# Sample output over time:
# Time   | RSS (MB)
# 00:00  | 200
# 00:30  | 350
# 01:00  | 520
# Trend: +80MB every 30 minutes = LEAK!
```

---

### Cause 3: Large Database Query Results

**Symptoms**:
- Spike after specific query executes
- PHP/Python web application affected
- Query runs fine alone, but crashes in production

**Example - Bad Query**:

```python
# ❌ BAD: Load entire result set into memory
import pymysql

cursor.execute("SELECT * FROM large_table")  # 1M rows
results = cursor.fetchall()  # ALL rows in memory!

# Each row ~1KB, 1M rows = 1GB+
for row in results:
    process_row(row)
```

**Fix - Use Generators**:

```python
# ✅ GOOD: Process row by row (server-side cursor)
import pymysql.cursors

connection = pymysql.connect(
    host='rds-endpoint',
    user='user',
    password='pass',
    db='database',
    cursorclass=pymysql.cursors.SSDictCursor  # Server-side cursor
)

cursor = connection.cursor()
cursor.execute("SELECT * FROM large_table")

# Fetch one row at a time
for row in cursor:
    process_row(row)  # Process and forget

cursor.close()
```

**Fix - Use Pagination**:

```python
# ✅ ALSO GOOD: Fetch in batches
BATCH_SIZE = 10000

for offset in range(0, total_rows, BATCH_SIZE):
    query = f"""
        SELECT * FROM large_table 
        LIMIT {BATCH_SIZE} OFFSET {offset}
    """
    results = cursor.fetchall()  # Only 10k rows at a time
    
    for row in results:
        process_row(row)
    
    logger.info(f"Processed {offset + BATCH_SIZE}/{total_rows}")
```

---

### Cause 4: Misconfigured Application Heap Size

**Java Application**:

```bash
# ❌ BAD: Unlimited heap
java -jar app.jar

# ✅ GOOD: Set heap limits
java -Xms512m -Xmx2g -jar app.jar
# -Xms: Initial heap (512MB)
# -Xmx: Maximum heap (2GB)
# Prevents uncontrolled growth
```

**Node.js Application**:

```bash
# Check Node memory limit
node --max-old-space-size=2048 app.js
# Default: Auto-detect (can be problematic in containers)
# Set explicitly to avoid surprises

# Monitor Node memory
node --trace-gc app.js
# Shows garbage collection events
```

---

### Cause 5: Container/Cgroup Memory Limits

**Docker Container**:

```bash
# ❌ BAD: No memory limit
docker run -it ubuntu bash

# ✅ GOOD: Set memory limit
docker run -it -m 2g --memory-swap 2.5g ubuntu bash
# -m: Hard limit (2GB)
# --memory-swap: Total virtual memory (2.5GB)

# Check container memory usage
docker stats
```

**Kubernetes Pod**:

```yaml
# ❌ BAD: No resource limits
spec:
  containers:
  - name: app
    image: myapp:latest

# ✅ GOOD: Set requests and limits
spec:
  containers:
  - name: app
    image: myapp:latest
    resources:
      requests:
        memory: "256Mi"   # Minimum
        cpu: "100m"
      limits:
        memory: "2Gi"     # Maximum (OOMKilled if exceeded)
        cpu: "1000m"
```

---

## Real-World Case Study

### The Incident: Tenant Web Scraping Workload

**Timeline**:

```
02:00 AM - Scraping job starts (scheduled daily)
02:15 AM - System load increases
02:30 AM - 50% RAM used
02:45 AM - 80% RAM used, first timeouts
03:00 AM - 98% RAM used, multiple crashes
03:15 AM - Incident reported by customers
03:30 AM - On-call engineer investigates
```

### Investigation

**Step 1: Identify RAM Issue**

```bash
ubuntu@prod-server$ free | awk '/Mem:/ {printf "%.2f%%\n", $3/$2*100}'
97.45%

ubuntu@prod-server$ free -h
              total        used        free      shared  buff/cache   available
Mem:          15.6G       15.2G       0.4G          0M        0.0G        0.3G
```

**Step 2: Find Culprit Process**

```bash
ubuntu@prod-server$ top -o %MEM

PID     USER    PR  NI  VIRT     RES   %MEM COMMAND
12847   ubuntu  20  0  12.5g   11.8g 75.7% python scraper.py
1234    mysql   20  0  1.2g    850m   5.4% mysqld
5678    www     20  0  400m    250m   1.6% nginx
```

**Step 3: Get Process Details**

```bash
ubuntu@prod-server$ ps -fp 12847

UID         PID   PPID  C STIME TTY STAT TIME     COMMAND
ubuntu    12847  12800  18 02:00 ?   Sl   28:45   python /opt/scraper/main.py --tenant-id=5429

# Parent process 12800 is likely a scheduler
```

**Step 4: Check Process Family**

```bash
ubuntu@prod-server$ pstree -aps 12847

systemd(1)
  └─cron(523)
      └─python(12800)-/opt/scraper/scheduler.py
          └─python(12847)-/opt/scraper/main.py

# Scheduled via cron, child process consuming RAM
```

**Step 5: Monitor Memory Growth**

```bash
ubuntu@prod-server$ watch -n 5 'ps aux | grep python | grep scraper'

# Output every 5 seconds shows:
# Time | RSS (MB)
# 02:00 | 100
# 02:05 | 450
# 02:10 | 950
# 02:15 | 1500
# 02:20 | 2200
# Growth rate: ~100MB every 5 seconds = 1.2GB/minute!
```

### Root Cause Analysis

**Examined Code** (`/opt/scraper/main.py`):

```python
# ❌ PROBLEMATIC CODE
import requests
from bs4 import BeautifulSoup

def scrape_all_products(tenant_id):
    all_products = []
    
    for page in range(1, 1000):  # 1000 pages
        url = f"https://competitor.com/products?page={page}&tenant_id={tenant_id}"
        
        response = requests.get(url)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        products = soup.find_all('div', class_='product')
        
        for product in products:
            data = {
                'name': product.find('h2').text,
                'price': product.find('span', class_='price').text,
                'description': product.find('p').text,
                'html': str(product),  # ⚠️ Storing entire HTML!
                'competitor_name': 'ExampleCom',
                'scraped_date': datetime.now(),
            }
            all_products.append(data)  # ⚠️ Keeps everything in memory
    
    # At end, write to database
    # Problem: 1000 pages × 20 products = 20,000 items in memory
    # Each item ~5KB = 100MB minimum, but with HTML = 500MB+!
    
    for product in all_products:
        db.insert_product(product)
    
    return all_products

# Scheduled to run every day for tenant 5429
# No error handling, no pagination, no cleanup
```

**Why It Failed**:
- 1000 pages × 50 products/page × 5KB = 250MB+ base
- HTML content = additional 200-300MB
- BeautifulSoup parsing overhead = extra 100MB
- No garbage collection between iterations
- Total: ~500MB-1GB per scrape
- Every 5 seconds, loads another page: memory bloat

### Immediate Fix (Incident Response)

```bash
# Kill the process
sudo kill -9 12847

# Verify memory released
free | awk '/Mem:/ {printf "%.2f%%\n", $3/$2*100}'
# Output: 12.34% (Back to normal!)

# Alert stakeholders
echo "Scraper crash killed, memory restored. Services recovering."
```

### Permanent Fix

**Rewrote Scraper** (`/opt/scraper/main_fixed.py`):

```python
# ✅ FIXED CODE: Streaming + Batching
import requests
from bs4 import BeautifulSoup
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def scrape_products_streamed(tenant_id, output_file=None):
    """
    Scrape products with minimal memory footprint
    Stream results to database and optional CSV file
    """
    
    DB_BATCH_SIZE = 100
    BATCH_TIMEOUT = 5  # seconds between batches
    REQUEST_TIMEOUT = 30
    
    batch = []
    total_scraped = 0
    
    try:
        for page in range(1, 1001):  # 1000 pages
            try:
                logger.info(f"Scraping tenant {tenant_id}, page {page}")
                
                url = f"https://competitor.com/products?page={page}"
                
                # Add tenant ID as parameter, not in URL logging
                response = requests.get(url, timeout=REQUEST_TIMEOUT)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                products = soup.find_all('div', class_='product')
                
                # Process each product immediately
                for product in products:
                    try:
                        # Extract only needed data (NOT full HTML)
                        product_data = {
                            'tenant_id': tenant_id,
                            'competitor_name': 'ExampleCom',
                            'name': product.find('h2').text.strip(),
                            'price': product.find('span', class_='price').text.strip(),
                            'description': product.find('p').text.strip(),
                            'url': product.find('a')['href'] if product.find('a') else '',
                            'scraped_date': datetime.now(),
                            # ✅ NOT storing: 'html': str(product)
                        }
                        
                        batch.append(product_data)
                        total_scraped += 1
                        
                        # Flush batch when full
                        if len(batch) >= DB_BATCH_SIZE:
                            logger.info(f"Flushing batch of {len(batch)} products")
                            db.insert_products_batch(batch)
                            
                            # Optional: Write to CSV for backup
                            if output_file:
                                write_to_csv(batch, output_file, append=True)
                            
                            # Clear batch from memory
                            batch.clear()
                            
                            # Add delay between batches
                            time.sleep(BATCH_TIMEOUT)
                    
                    except Exception as e:
                        logger.error(f"Error processing product: {e}")
                        continue
                
                # Cleanup current page's memory
                del soup
                del response
                
                # Progress logging every 100 pages
                if page % 100 == 0:
                    mem_usage = get_memory_usage_mb()
                    logger.info(f"Progress: {page}/1000, Memory: {mem_usage}MB")
            
            except requests.RequestException as e:
                logger.error(f"Error fetching page {page}: {e}")
                # Continue with next page instead of crashing
                continue
        
        # Flush remaining batch
        if batch:
            logger.info(f"Flushing final batch of {len(batch)} products")
            db.insert_products_batch(batch)
            if output_file:
                write_to_csv(batch, output_file, append=True)
            batch.clear()
        
        logger.info(f"Scraping complete: {total_scraped} products")
        return {'status': 'success', 'total_products': total_scraped}
    
    except Exception as e:
        logger.error(f"Fatal error in scraper: {e}")
        return {'status': 'error', 'message': str(e)}

def get_memory_usage_mb():
    """Get current process memory in MB"""
    import psutil
    process = psutil.Process()
    return int(process.memory_info().rss / 1024 / 1024)

def write_to_csv(products, filepath, append=True):
    """Stream products to CSV file"""
    import csv
    mode = 'a' if append else 'w'
    with open(filepath, mode, newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['tenant_id', 'name', 'price', 'url', 'scraped_date'])
        if mode == 'w':
            writer.writeheader()
        writer.writerows(products)

# Usage
if __name__ == '__main__':
    result = scrape_products_streamed(
        tenant_id=5429,
        output_file='/data/scrape_results.csv'
    )
    print(result)
```

### Improvements Made

| Aspect | Before | After |
|--------|--------|-------|
| **Memory Usage** | 1.2GB | 150MB |
| **Max Load** | 98% | 12% |
| **Time to Crash** | 30 min | Never |
| **Data Persistence** | In-memory then DB | Streamed to DB + CSV |
| **Error Recovery** | Crashes entire job | Skips bad pages, continues |
| **Monitoring** | None | Logs every 100 pages + memory tracking |
| **Batch Processing** | None | 100 products at a time |
| **Request Handling** | Fetch all then process | Process each page immediately |

### Post-Incident Improvements

**1. Added Resource Limits**:

```bash
# Set cron job resource limits
# /etc/security/limits.d/scraper.conf
scraper soft memlock unlimited
scraper hard memlock 2048000  # Max 2GB
scraper soft cpu unlimited
scraper hard cpu 3600  # Max 1 hour
```

**2. Added Monitoring**:

```bash
# Crontab with monitoring
0 2 * * * /opt/scraper/monitor_and_run.sh

# /opt/scraper/monitor_and_run.sh
#!/bin/bash
set -e

LOG_FILE="/var/log/scraper.log"
MAX_MEMORY_MB=2048  # 2GB

# Monitor and kill if exceeds memory
{
    python /opt/scraper/main_fixed.py --tenant-id=5429 \
        --output-file=/data/scrape_$(date +%Y%m%d_%H%M%S).csv
} & 

SCRAPER_PID=$!
while kill -0 $SCRAPER_PID 2>/dev/null; do
    MEM_USAGE=$(ps -p $SCRAPER_PID -o rss= | awk '{print int($1/1024)}')
    
    if [ $MEM_USAGE -gt $MAX_MEMORY_MB ]; then
        echo "ALERT: Scraper exceeded $MAX_MEMORY_MB MB (current: $MEM_USAGE MB)"
        kill -9 $SCRAPER_PID
        exit 1
    fi
    
    sleep 10
done
```

**3. Added Alerts**:

```bash
# CloudWatch Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "Scraper-Memory-High" \
  --metric-name MemoryUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:region:account:topic-name
```

**4. Incident Report**:

```markdown
# Incident Report: Web Scraper Memory Exhaustion

**Date**: 2024-01-15 02:00 AM - 03:45 AM UTC
**Duration**: 1 hour 45 minutes
**Impact**: Full platform unavailability for 1 hour
**Root Cause**: Tenant 5429's web scraper loading all results in memory

## Timeline
- 02:00 AM: Job started
- 02:45 AM: RAM 80%, first timeouts
- 03:00 AM: RAM 98%, service crashes
- 03:15 AM: Incident reported
- 03:30 AM: Root cause identified
- 03:45 AM: Process killed, services recovered

## Resolution
- Rewrote scraper with streaming architecture
- Reduced memory footprint by 8x
- Added resource limits and monitoring
- Implemented batch processing
- Added error handling and recovery

## Prevention
- Code review for all data processing tasks
- Memory profiling during development
- Automated resource monitoring
- Incident playbook for OOMemory conditions
```

---

## Remediation Strategies

### Immediate Actions (During Incident)

**Step 1: Identify & Kill Offending Process**

```bash
# Find top memory consumer
top -o %MEM | head -10

# Kill process
sudo kill -9 <PID>

# Or kill by name
sudo pkill -9 python  # Only if safe!
```

**Step 2: Restart Services**

```bash
# Restart affected services
sudo systemctl restart app-service
sudo systemctl restart nginx
sudo systemctl restart php-fpm

# Verify they're up
sudo systemctl status app-service
```

**Step 3: Clear Caches (if applicable)**

```bash
# Clear OS page cache
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches

# Restart Redis
redis-cli FLUSHALL
sudo systemctl restart redis-server

# Clear Memcached
sudo systemctl restart memcached
```

### Short-term Fixes (Interim)

**1. Reduce Working Set**:

```bash
# Lower max connections
# For MySQL:
SET GLOBAL max_connections = 100;  # From 1000

# For Nginx:
worker_connections 512;  # From 2048

# For Node.js:
node --max-old-space-size=1024 app.js  # From unlimited
```

**2. Add Swap (Temporary, NOT permanent)**:

```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Check
free -h

# Note: Swap is slow, just buys time!
```

**3. Implement Rate Limiting**:

```bash
# Nginx rate limiting
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

location / {
    limit_req zone=general burst=20 nodelay;
    proxy_pass http://backend;
}
```

### Long-term Fixes (Permanent)

**1. Code Optimization**:
- Fix memory leaks
- Use generators instead of lists
- Stream large datasets
- Implement pagination
- Use LRU caches with size limits

**2. Scale Horizontally**:
- Add more instances
- Load balance traffic
- Split workloads across servers

**3. Upgrade Instance Type**:
```bash
# Move from t3.medium (4GB) to t3.large (8GB)
aws ec2 modify-instance-attribute \
  --instance-id i-1234567890abcdef0 \
  --instance-type "{\"Value\": \"t3.large\"}"

# Requires stop/start
```

**4. Implement Resource Controls**:

```bash
# Docker
docker run -m 2g --memory-swap 2.5g myapp

# Systemd service
# /etc/systemd/system/myapp.service
[Service]
MemoryLimit=2G
MemoryAccounting=yes
```

---

## Prevention & Monitoring

### Proactive Monitoring Setup

**CloudWatch Alarms**:

```bash
# Alert when memory > 75%
aws cloudwatch put-metric-alarm \
  --alarm-name "EC2-High-Memory-75" \
  --metric-name MemoryUtilization \
  --namespace AWS/EC2 \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --statistic Average \
  --period 300 \
  --threshold 75 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:ops-alerts

# Alert when memory > 90% (critical)
aws cloudwatch put-metric-alarm \
  --alarm-name "EC2-Critical-Memory-90" \
  --metric-name MemoryUtilization \
  --namespace AWS/EC2 \
  --threshold 90 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:ops-critical
```

**CloudWatch Agent Installation**:

```bash
# Install agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Start
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

**Monitoring Script**:

```bash
#!/bin/bash
# /opt/monitoring/memory_check.sh

# Runs every 5 minutes via cron
MEM_PERCENT=$(free | awk '/Mem:/ {printf "%.0f", $3/$2*100}')
TOP_PROCESS=$(ps aux --sort=-%mem | head -2 | tail -1)

# Check thresholds
if [ $MEM_PERCENT -gt 90 ]; then
    LEVEL="CRITICAL"
    SEVERITY=1
elif [ $MEM_PERCENT -gt 75 ]; then
    LEVEL="WARNING"
    SEVERITY=2
else
    LEVEL="OK"
    SEVERITY=3
fi

# Log to syslog
logger -t memory_check -p user.$LEVEL "Memory: ${MEM_PERCENT}% - Top: $(echo $TOP_PROCESS | awk '{print $11, $4\"%\"}')"

# Send metric to CloudWatch
aws cloudwatch put-metric-data \
  --metric-name MemoryUtilization \
  --value $MEM_PERCENT \
  --unit Percent

exit 0
```

**Add to Crontab**:

```bash
*/5 * * * * /opt/monitoring/memory_check.sh
```

### Dashboards

**Create CloudWatch Dashboard**:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name "EC2-Memory-Monitoring" \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["AWS/EC2", "MemoryUtilization", {"stat": "Average"}],
            ["AWS/EC2", "CPUUtilization", {"stat": "Average"}],
            ["AWS/EC2", "NetworkIn", {"stat": "Sum"}]
          ],
          "period": 300,
          "stat": "Average",
          "region": "us-east-1",
          "title": "Instance Metrics"
        }
      }
    ]
  }'
```

---

## Performance Tuning

### MySQL Memory Tuning

```sql
-- Check current memory usage
SELECT @@innodb_buffer_pool_size / 1024 / 1024 / 1024 as buffer_pool_gb;
SELECT @@max_connections;
SELECT @@sort_buffer_size;

-- Configure for EC2 t3.medium (4GB)
SET GLOBAL innodb_buffer_pool_size = 2147483648;  -- 2GB
SET GLOBAL max_connections = 100;
SET GLOBAL sort_buffer_size = 256000;  -- 256KB

-- Add to /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
innodb_buffer_pool_size = 2G
max_connections = 100
sort_buffer_size = 256K
```

### PHP Memory Tuning

```ini
; /etc/php/8.1/fpm/php.ini
memory_limit = 256M              ; Per-process limit
max_execution_time = 30
upload_max_filesize = 20M
post_max_size = 20M

; Connection pooling
; Use PHP-FPM process manager:
; pm = dynamic
; pm.start_servers = 4
; pm.min_spare_servers = 4
; pm.max_spare_servers = 8
; pm.max_children = 50
```

### Node.js Memory Tuning

```javascript
// app.js
const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
console.log(`Heap used: ${heapUsed.toFixed(2)} MB`);

// Monitor memory growth
setInterval(() => {
    const memUsage = process.memoryUsage();
    console.log({
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    });
}, 30000);  // Every 30 seconds

// Graceful shutdown if memory too high
if (memUsage.heapUsed > 2 * 1024 * 1024 * 1024) {  // 2GB
    console.error('Memory limit exceeded, shutting down gracefully');
    process.exit(1);
}
```

---

## Incident Response Playbook

### Runbook: EC2 Memory Exhaustion (100% RAM)

**Level**: CRITICAL
**Time to Resolve**: 5-15 minutes
**Team**: DevOps + Application Team

### Detection (Automated)

```
Alert: EC2-Critical-Memory-90
└─ Triggers PagerDuty → On-call engineer paged
```

### Response Steps

**Phase 1: Immediate Mitigation (0-5 min)**

```bash
# 1. SSH to instance
ssh -i key.pem ubuntu@ec2-instance

# 2. Confirm the issue
free | awk '/Mem:/ {printf "%.2f%%\n", $3/$2*100}'
# Expected: >90%

# 3. Identify top process
top -o %MEM
# Note: Top 3 processes

# 4. Get process details
ps -fp <PID>
pstree -aps <PID>

# 5. Check recent changes
journalctl -xe
ls -lat /opt/app/  # Recent file changes

# 6. Kill offending process
sudo kill -9 <PID>

# 7. Verify memory recovered
free -h
# Expected: >50% free
```

**Phase 2: Service Recovery (5-10 min)**

```bash
# 1. Restart affected services
sudo systemctl restart app-service
sudo systemctl restart nginx

# 2. Verify services are up
sudo systemctl status app-service
sudo systemctl status nginx

# 3. Check logs for errors
tail -100 /var/log/app/error.log
tail -100 /var/log/nginx/error.log

# 4. Test application
curl http://localhost:8080
# Expected: 200 OK
```

**Phase 3: Investigation (10-30 min)**

```bash
# 1. Review logs for anomalies
grep -i "error\|exception\|oom" /var/log/app/error.log | tail -50

# 2. Check cron jobs
sudo crontab -l
# Check what ran around incident time

# 3. Monitor memory baseline
watch -n 1 'free -h'
# Watch for 5 minutes, ensure stable

# 4. Check disk usage (could trigger issue)
df -h
du -sh /opt/app/*

# 5. Review code/config changes
cd /opt/app && git log --oneline -10
git diff HEAD~1 HEAD

# 6. Check resource limits
ps aux | head -3
ulimit -a
```

**Phase 4: Root Cause Fix**

Based on cause, apply appropriate fix from "Remediation Strategies" section.

### Communication

**During Incident**:

```
[03:30] Incident Declared: EC2 Memory Exhaustion
Status: Impact - Services down
ETA to Resolution: 15 minutes

[03:35] Mitigation: Killed runaway process PID 12847
Status: Partial Recovery - Services recovering
ETA: 5 minutes

[03:40] Recovery: All services online
Status: Investigating root cause
ETA to Permanent Fix: 1 hour

[04:00] Post-Incident: Root cause identified
Fix: Code refactoring to reduce memory footprint
Timeline: Deploy fix in next release
```

### Post-Incident

- [ ] Document what happened
- [ ] Schedule post-mortem
- [ ] Identify prevention measures
- [ ] Add monitoring/alerts
- [ ] Update runbook
- [ ] Communicate to stakeholders
- [ ] Schedule code review with team

---

## Automated Recovery

### Self-Healing Script

```bash
#!/bin/bash
# /opt/monitoring/self_healing.sh
# Runs every minute via cron

set -e

MEM_THRESHOLD=90
PID_THRESHOLD=80
APP_NAMES=("python" "node" "java")

# Get memory percentage
MEM_PERCENT=$(free | awk '/Mem:/ {printf "%.0f", $3/$2*100}')

if [ $MEM_PERCENT -gt $MEM_THRESHOLD ]; then
    logger -t self_healing "ALERT: Memory at ${MEM_PERCENT}%"
    
    # Find and kill top memory consumer
    TOP_PID=$(ps aux --sort=-%mem | awk 'NR==2 {print $2}')
    TOP_CMD=$(ps aux --sort=-%mem | awk 'NR==2 {print $11}')
    TOP_PERCENT=$(ps aux --sort=-%mem | awk 'NR==2 {print $4}')
    
    logger -t self_healing "Top process: PID=$TOP_PID CMD=$TOP_CMD MEM=${TOP_PERCENT}%"
    
    # Only kill if > threshold
    if [ $(echo "$TOP_PERCENT > $PID_THRESHOLD" | bc -l) -eq 1 ]; then
        logger -t self_healing "KILLING: PID $TOP_PID (${TOP_PERCENT}% memory)"
        
        # Graceful kill first
        kill -15 $TOP_PID || true
        sleep 5
        
        # Force kill if still alive
        kill -9 $TOP_PID || true
        
        # Restart services
        systemctl restart app-service || true
        systemctl restart nginx || true
        
        # Verify recovery
        sleep 5
        NEW_MEM=$(free | awk '/Mem:/ {printf "%.0f", $3/$2*100}')
        logger -t self_healing "Memory recovered: ${NEW_MEM}%"
        
        # Send alert
        aws sns publish \
          --topic-arn arn:aws:sns:region:account:ops-alerts \
          --subject "Self-healing triggered: Process killed" \
          --message "Process $TOP_CMD killed due to excessive memory usage"
    fi
fi
```

**Add to Crontab**:

```bash
* * * * * /opt/monitoring/self_healing.sh
```

### Docker Health Check

```dockerfile
FROM ubuntu:22.04

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD bash -c '[[ $(free | awk "/Mem:/ {printf \"%d\", \$3/\$2*100}") -lt 90 ]]'

# Restart container if health check fails
# docker run --health-on-failure=restart ...
```

---

## Summary Checklist

### Before Issues Occur

- [ ] Set up CloudWatch memory alerts (75%, 90%)
- [ ] Enable CloudWatch agent for detailed monitoring
- [ ] Review all data processing code for memory leaks
- [ ] Set resource limits on containers/services
- [ ] Implement monitoring dashboards
- [ ] Document incident runbook
- [ ] Schedule regular memory profiling
- [ ] Code review process in place

### During Incident

- [ ] Confirm high memory usage (`free` command)
- [ ] Identify culprit process (`top -o %MEM`)
- [ ] Collect process details (`ps`, `pstree`)
- [ ] Kill offending process (`kill -9`)
- [ ] Restart affected services (`systemctl restart`)
- [ ] Verify recovery (`free -h`)
- [ ] Notify stakeholders
- [ ] Begin root cause analysis

### After Incident

- [ ] Document timeline and impact
- [ ] Identify root cause
- [ ] Implement permanent fix
- [ ] Add monitoring/alerts
- [ ] Update runbooks
- [ ] Conduct post-mortem
- [ ] Communicate findings to team
- [ ] Implement prevention measures

---

## Useful Commands Reference

```bash
# Memory Diagnostics
free | awk '/Mem:/ {printf "%.2f%%\n", $3/$2*100}'  # Memory %
free -h                                              # Detailed view
top -o %MEM                                          # Top by memory
ps aux --sort=-%mem                                  # All by memory
ps -eo pid,user,vsz,rss,comm | sort -k3 -nr | head  # VSZ sorted

# Process Details
ps -fp <PID>                                         # Process info
pstree -aps <PID>                                    # Process tree
cat /proc/<PID>/status                               # Memory details
cat /proc/<PID>/cmdline | tr '\0' ' '                # Full command

# Memory Monitoring
watch -n 1 'free -h'                                 # Real-time
watch -n 5 'ps aux | grep python'                    # Process monitoring
vmstat 1 10                                          # Virtual memory stats
iostat -x 1 5                                        # I/O stats

# Process Management
top -o %MEM -u <user>                                # User's top processes
ps aux | grep <app_name>                             # Find process
kill -15 <PID>                                       # Graceful kill
kill -9 <PID>                                        # Force kill
pkill -f <pattern>                                   # Kill by pattern

# System Info
uname -a                                             # System info
cat /proc/cpuinfo                                    # CPU info
cat /proc/meminfo                                    # Memory info
lsb_release -a                                       # OS version

# Limits
ulimit -a                                            # Current limits
ulimit -v <size>                                     # Set virtual memory limit
ulimit -d <size>                                     # Set data segment limit
```

---

**Last Updated**: 2024-01-15
**Version**: 1.0
**Owner**: DevOps Team (UrbanGabru)
**Incident Reference**: Web Scraper OOM - Tenant 5429 - Jan 15, 2024
