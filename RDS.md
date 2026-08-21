# Creating RDS for MySQL: Complete Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Overview](#overview)
3. [Step-by-Step Creation](#step-by-step-creation)
4. [Configuration Options](#configuration-options)
5. [Security Setup](#security-setup)
6. [Database Migration](#database-migration)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Performance Optimization](#performance-optimization)
9. [Cost Optimization](#cost-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before creating an RDS instance, ensure you have:

- AWS Account with appropriate IAM permissions
- VPC and subnets created (or use default VPC)
- Security group created or ready to be created
- Knowledge of your database requirements (storage, CPU, memory)
- Access to AWS Management Console or AWS CLI configured
- Database backup if migrating from existing database

---

## Overview

Amazon RDS (Relational Database Service) is a managed database service that simplifies database administration. For MySQL, RDS handles:
- Automated backups
- Multi-AZ deployment for high availability
- Read replicas for scaling read operations
- Automatic patching and maintenance
- Storage scaling (for compatible instance types)

---

## Step-by-Step Creation

### Step 1: Access RDS Dashboard

1. Log in to AWS Management Console
2. Navigate to **Services** → **RDS**
3. Click on **Databases** from the left sidebar
4. Click the **Create database** button

### Step 2: Choose Database Creation Method

Select one of:
- **Standard Create**: Full control over all options (recommended for production)
- **Easy Create**: Quick setup with AWS defaults

For this guide, we'll use **Standard Create**.

### Step 3: Database Engine Selection

1. Under "Engine options", select **MySQL**
2. Choose the **Edition**:
   - MySQL Community Edition (most common, free tier eligible)
   - MySQL Enterprise Edition (commercial support)
3. Select **Engine Version**:
   - Latest stable version recommended (e.g., 8.0.35)
   - Consider compatibility with your application

### Step 4: DB Instance Class Selection

The instance class determines CPU, RAM, and network performance.

**Common Instance Types:**

| Instance Class | vCPU | Memory | Use Case |
|---|---|---|---|
| `db.t3.micro` | 1 | 1 GB | Development, testing, low-traffic apps |
| `db.t3.small` | 1 | 2 GB | Small production workloads |
| `db.t3.medium` | 1 | 4 GB | Light production workloads |
| `db.t4g.small` | 2 | 2 GB | Burstable workloads (Graviton2) |
| `db.m6g.large` | 2 | 8 GB | General purpose, moderate traffic |
| `db.m6g.xlarge` | 4 | 16 GB | Standard production workloads |
| `db.r6g.large` | 2 | 16 GB | Memory-optimized, heavy queries |
| `db.r6g.xlarge` | 4 | 32 GB | High-performance, analytics |

**Selection Criteria:**
- **Burstable (t3, t4g)**: Suitable when you have variable workload. Good for cost optimization.
- **General Purpose (m6g, m5)**: Balanced compute, memory, network. Most production workloads.
- **Memory Optimized (r6g, r5)**: For databases with large working sets, complex queries.

### Step 5: Allocate Storage

1. **Storage Type**: Choose between:
   - **General Purpose (gp3)**: Recommended, cost-effective, good performance
   - **Provisioned IOPS (io1)**: High-performance, predictable workloads
   - **Magnetic**: Legacy, not recommended

2. **Allocated Storage**: 
   - Minimum: 20 GB
   - Start with your estimated size + 20-30% buffer
   - Can be increased later without downtime (for gp3/io1)

3. **IOPS**: (for io1 only)
   - Ratio: 1 GB = 1 IOPS (minimum)
   - Example: 100 GB storage = 100-1000 IOPS configurable

4. **Enable Storage Autoscaling**:
   - Check the box "Enable storage autoscaling"
   - Set maximum storage threshold (e.g., 1000 GB)
   - RDS automatically scales storage when usage reaches 90% (for gp3/io1)

### Step 6: DB Instance Identifier

1. Enter a unique name for your instance (e.g., `urbangabru-prod-mysql`, `npd-dashboard-db`)
2. Must be unique within your AWS region
3. Cannot be changed after creation
4. Use lowercase, hyphens (avoid special characters)

### Step 7: Credentials Configuration

1. **Master Username**:
   - Default: `admin`
   - Can customize (e.g., `dbadmin`, `root`)

2. **Master Password**:
   - Create a strong password (minimum 8 characters)
   - Include uppercase, lowercase, numbers, special characters
   - Store securely (AWS Secrets Manager recommended)
   - Note: Cannot be changed after creation through console easily

3. **Auto-generate password**: AWS can generate a strong password
   - Click "Generate password"
   - Store it in AWS Secrets Manager for secure retrieval

### Step 8: Database Connectivity

1. **Compute resource**: 
   - Leave blank (default)
   - Or select specific EC2 instance for automatic security group setup

2. **Virtual Private Cloud (VPC)**:
   - Select your VPC (e.g., default VPC for development)
   - Production: Use dedicated VPC

3. **DB Subnet Group**:
   - For multi-AZ: Create a subnet group spanning multiple AZs
   - This allows failover to another AZ automatically
   - If creating new: Requires at least 2 subnets in different AZs

4. **Public Accessibility**:
   - **No** (recommended for production): Only accessible within VPC
   - **Yes**: Accessible from internet (security risk, only for development)

5. **VPC Security Group**:
   - Choose existing or create new
   - Default allows all traffic (modify later)
   - Must allow inbound port 3306 (MySQL default port)

### Step 9: Database Authentication

1. **Database Authentication**:
   - **Password authentication** (default, recommended for most cases)
   - **IAM database authentication**: Use AWS IAM credentials instead of passwords

2. **IAM DB Authentication**: Benefits:
   - Credentials expire in 15 minutes
   - No need to store passwords in application
   - Audit trail via CloudTrail
   - Setup required in application

### Step 10: Backup Configuration

1. **Backup Retention Period**:
   - Default: 7 days
   - Set to 30+ days for production
   - Maximum: 35 days
   - Set to 1 day for development (cost savings)

2. **Backup Window**:
   - Set to off-peak hours for your application
   - Example: 02:00-03:00 UTC (adjust for your timezone)
   - Duration: 1-4 hours

3. **Enable Copy Automated Backups to Another AWS Region** (optional):
   - For disaster recovery
   - Backups copied to another region automatically
   - Costs extra: Backup storage charges in destination region

4. **Enable Backup Encryption**:
   - Check the box to encrypt backups using KMS
   - Recommended for data protection

### Step 11: Encryption Configuration

1. **Enable Encryption**:
   - Check "Enable encryption" (recommended)
   - Your database data will be encrypted at rest

2. **KMS Key**:
   - Default: `(default) aws/rds` - AWS managed
   - Custom: Select customer-managed KMS key for more control
   - Production: Consider customer-managed for compliance

### Step 12: High Availability (Multi-AZ)

1. **Multi-AZ Deployment**:
   - **Yes** (recommended for production):
     - Creates synchronous standby replica in different AZ
     - Automatic failover if primary fails (2-3 minutes)
     - Doubles cost
   - **No** (for development/testing):
     - Single AZ deployment
     - No automatic failover

2. **Enhanced Monitoring**:
   - Enable to collect OS-level metrics
   - Choose monitoring role (create if needed)
   - Granularity: 1 to 60 seconds
   - Additional cost but valuable for troubleshooting

### Step 13: Performance Insights

1. **Enable Performance Insights**:
   - Check the box (optional but recommended)
   - Provides dashboard for database performance
   - Shows top SQL queries, wait events

2. **Retention Period**:
   - 7 days (default, free)
   - 31 days (additional charge)

### Step 14: Monitoring Options

1. **CloudWatch Logs Exports**:
   - Check desired log types:
     - **Error log**: MySQL errors
     - **General log**: All database activity (verbose, use for debugging)
     - **Slow query log**: Queries exceeding slow_query_log_time
     - **Audit log**: DDL/DML operations (requires parameter group modification)

2. **Enablement**:
   - CloudWatch Logs automatically created
   - Logs available in CloudWatch console
   - Retention configurable per log group

### Step 15: Additional Configuration

1. **Initial Database Name**:
   - Specify initial database (optional)
   - Example: `urbangabru_prod`, `npd_db`
   - Can create additional databases after instance is ready

2. **Parameter Group**:
   - Select default or create custom
   - Controls MySQL configuration (max_connections, slow_query_log, etc.)
   - Custom parameters require restart

3. **Option Group**:
   - MySQL typically has no options
   - Leave as "default" for most cases

4. **Deletion Protection**:
   - Check "Enable deletion protection" for production
   - Prevents accidental deletion

5. **Backup Export to S3**:
   - Not needed at creation
   - Can be configured later

### Step 16: Create the Database

1. Review all settings
2. Click **Create database**
3. Wait for instance to be available (5-15 minutes)
4. Monitor creation status in the RDS Databases list

---

## Configuration Options

### MySQL Parameter Groups

Key parameters to configure after creation:

```sql
-- Connection pooling
max_connections = 150  -- Adjust based on your workload

-- Slow query logging
slow_query_log = 1
long_query_time = 2    -- Queries > 2 seconds logged

-- Binary logging (for replication/backup)
binlog_format = 'ROW'
server_id = 1
binlog_retention_hours = 24

-- Character set (UTF-8)
character_set_server = 'utf8mb4'
collation_server = 'utf8mb4_unicode_ci'

-- Query cache (disabled in MySQL 8.0+)
query_cache_type = 0

-- InnoDB settings
innodb_buffer_pool_size = 2G  -- 50-80% of instance memory
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 1  -- Safety vs performance

-- Max allowed packet (for large operations)
max_allowed_packet = 16M
```

### Access Control

1. **Security Group Configuration**:
   ```
   Inbound Rule:
   - Type: MySQL/Aurora
   - Protocol: TCP
   - Port: 3306
   - Source: Your application security group / IP
   ```

2. **Database User Creation** (after connecting):
   ```sql
   CREATE USER 'appuser'@'%' IDENTIFIED BY 'strong_password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON database_name.* TO 'appuser'@'%';
   FLUSH PRIVILEGES;
   ```

---

## Security Setup

### 1. Network Security

```yaml
VPC Configuration:
  - RDS in private subnets (no public IP)
  - Access only through application servers
  - Security groups restrict traffic to port 3306
  - NACLs allow necessary traffic
```

### 2. Encryption

- **At Rest**: KMS encryption enabled
- **In Transit**: Use SSL/TLS for connections
  ```python
  # Python example
  import pymysql
  ssl_config = {'ca': '/path/to/rds-ca-2019-root.pem'}
  connection = pymysql.connect(
      host='instance-endpoint.amazonaws.com',
      user='admin',
      password='password',
      ssl_kwargs=ssl_config
  )
  ```

### 3. Credential Management

**Store in AWS Secrets Manager**:

```json
{
  "username": "admin",
  "password": "encrypted_password",
  "engine": "mysql",
  "host": "instance-endpoint.rds.amazonaws.com",
  "port": 3306,
  "dbClusterIdentifier": "mydb"
}
```

Retrieve in application:
```python
import boto3
import json

client = boto3.client('secretsmanager')
secret = client.get_secret_value(SecretId='rds-mysql-creds')
credentials = json.loads(secret['SecretString'])
```

### 4. IAM Database Authentication

**Enable in RDS**:
1. Modify DB instance
2. Check "Enable IAM DB authentication"

**Connect with IAM token**:
```bash
token=$(aws rds generate-db-auth-token \
  --hostname instance-endpoint.rds.amazonaws.com \
  --port 3306 \
  --region us-east-1 \
  --username iamuser)

mysql -h instance-endpoint.rds.amazonaws.com \
  --port=3306 \
  -u iamuser \
  --password="$token" \
  --enable-cleartext-plugin
```

### 5. Audit Logging

Enable in parameter group:
```sql
server_audit_logging = 1
server_audit_events = 'CONNECT,QUERY_DDL,QUERY_DML'
```

---

## Database Migration

### Pre-Migration Steps

1. **Backup existing database**:
   ```bash
   mysqldump -u root -p --all-databases > backup.sql
   ```

2. **Test connectivity** to RDS endpoint

3. **Create RDS instance** per steps above

### Migration Methods

#### Method 1: Direct Dump & Restore

```bash
# Export from source
mysqldump -h source-host -u user -p database_name > export.sql

# Import to RDS
mysql -h rds-endpoint.amazonaws.com -u admin -p database_name < export.sql
```

#### Method 2: AWS Database Migration Service (DMS)

**Benefits**:
- Live migration with minimal downtime
- CDC (Change Data Capture) for ongoing sync
- Handles large databases efficiently

**Setup**:
1. Create DMS replication instance
2. Configure source and target endpoints
3. Create migration task
4. Monitor progress
5. Switchover when ready

### Post-Migration Verification

```sql
-- Check data integrity
SELECT COUNT(*) FROM table_name;

-- Verify indexes
SHOW INDEX FROM table_name;

-- Check replication status (if using)
SHOW SLAVE STATUS\G
```

### Handling GTID Errors

If encountering GTID errors during migration:

```sql
-- On RDS (target)
RESET MASTER;

-- On source, if needed
SET GTID_PURGED='uuid:1-999999';

-- Restart replication
STOP SLAVE;
START SLAVE;
```

---

## Monitoring and Maintenance

### CloudWatch Metrics

**Key Metrics to Monitor**:

| Metric | Threshold | Action |
|---|---|---|
| CPUUtilization | > 80% | Scale up instance class |
| DatabaseConnections | > 80% of max | Investigate connections, increase max_connections |
| FreeStorageSpace | < 10% | Increase allocated storage |
| ReadLatency | > 5ms | Check indexes, optimize queries |
| WriteLatency | > 10ms | Check disk performance, optimize queries |
| DiskQueueDepth | > 1 | I/O bottleneck, scale up |

**CloudWatch Alarms Setup**:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "RDS-High-CPU" \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### Backup and Recovery

**Automated Backups**:
- Retained for backup retention period
- Can restore to any point in time
- Download logs from CloudWatch

**Manual Snapshots**:
```bash
aws rds create-db-snapshot \
  --db-instance-identifier mydb-instance \
  --db-snapshot-identifier mydb-backup-2024-01-15
```

**Point-in-Time Restore**:
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mydb-restore \
  --db-snapshot-identifier mydb-backup-2024-01-15
```

### Maintenance Window

- **Default**: Sunday 03:00-04:00 UTC
- **Customize** during creation or modification
- Minor patching: No downtime for multi-AZ
- Major patching: Brief downtime required

---

## Performance Optimization

### Query Optimization

1. **Identify Slow Queries**:
   ```sql
   SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;
   ```

2. **Add Indexes**:
   ```sql
   CREATE INDEX idx_user_email ON users(email);
   ```

3. **Analyze Query Execution**:
   ```sql
   EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
   ```

### Connection Pooling

Use connection pooling in application (don't create new connections per request):

```python
# Using SQLAlchemy with pool
from sqlalchemy import create_engine

engine = create_engine(
    'mysql+pymysql://user:password@host/db',
    pool_size=20,
    max_overflow=40,
    pool_recycle=3600  # Recycle connections after 1 hour
)
```

### Instance Sizing

**Scaling Strategy**:

1. **Vertical Scaling (instance class)**:
   - Requires downtime (few minutes)
   - Best for CPU/memory bottlenecks
   - Multi-AZ: Standby upgraded first (no downtime)

2. **Horizontal Scaling (read replicas)**:
   - Distribute read operations
   - No downtime for creation
   - Slight replication lag

**Read Replica Setup**:
```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier mydb-replica-1 \
  --source-db-instance-identifier mydb-instance
```

### InnoDB Buffer Pool Tuning

```sql
-- Check buffer pool usage
SELECT * FROM performance_schema.global_variables 
WHERE VARIABLE_NAME='innodb_buffer_pool_size';

-- Recommended: 50-80% of available RAM
-- For 16GB instance: 8-12GB buffer pool
```

---

## Cost Optimization

### 1. Right-Sizing

- Use small instances for non-production (dev, test, staging)
- Consolidate multiple databases on single instance
- Use `db.t3` (burstable) for variable workloads

### 2. Storage

- Enable autoscaling to avoid over-provisioning
- Use gp3 instead of io1 for cost savings
- Delete unnecessary snapshots

### 3. Backup Strategy

- Set retention to minimum needed (7 days for dev, 30 for prod)
- Limit cross-region backup copies
- Delete old manual snapshots

### 4. Reserved Instances

- Purchase 1-year or 3-year RI for stable production workloads
- Provides ~30-40% cost savings vs on-demand
- Requires commitment to instance type and region

### 5. Multi-AZ Trade-offs

- Multi-AZ: Double cost but provides HA
- Alternatives: Read replicas + manual failover (cheaper)
- Evaluate availability requirements

---

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to RDS instance

**Solutions**:
1. Verify security group allows port 3306 from your source
2. Check VPC and subnet configuration
3. Ensure RDS instance is in "Available" status
4. Test with telnet/netcat:
   ```bash
   nc -zv rds-endpoint.amazonaws.com 3306
   ```

### Performance Issues

**Problem**: Slow queries

**Diagnosis**:
```sql
-- Check current queries
SHOW PROCESSLIST;

-- Enable slow query log
SET GLOBAL slow_query_log=1;
SET GLOBAL long_query_time=2;

-- Check for lock waits
SHOW ENGINE INNODB STATUS;
```

### Storage Issues

**Problem**: Running out of storage

**Solution**:
1. Increase allocated storage (no downtime for gp3/io1)
2. Delete unnecessary data
3. Archive old data to S3
4. Increase autoscaling threshold

### GTID and Replication Errors

**Problem**: Replication lag or GTID errors

**Solutions**:
```sql
-- Check replication status
SHOW SLAVE STATUS\G

-- Skip corrupted transaction
SET GTID_NEXT='uuid:transaction_id';
BEGIN;
COMMIT;
SET GTID_NEXT='AUTOMATIC';
START SLAVE;
```

### Memory Exhaustion

**Problem**: RDS instance running out of memory

**Investigation**:
```sql
-- Check current connections
SHOW STATUS LIKE 'Threads%';

-- Kill idle connections
KILL CONNECTION process_id;

-- Monitor buffer pool
SELECT * FROM performance_schema.memory_summary_by_account_by_event_name;
```

---

## Best Practices Summary

✅ **Do's**:
- Use multi-AZ for production
- Enable automated backups (min 7 days)
- Monitor key metrics and set alarms
- Use private subnets with security groups
- Enable encryption at rest and in transit
- Use IAM database authentication
- Regular backup testing and restore practice
- Document connection strings and credentials (in Secrets Manager)
- Tag resources for cost allocation

❌ **Don'ts**:
- Don't use public accessibility for production
- Don't store credentials in code
- Don't skip backup retention configuration
- Don't ignore slow query logs
- Don't skip maintenance windows without reason
- Don't over-provision storage initially; use autoscaling
- Don't forget to monitor replication lag (if using replicas)
- Don't disable encryption in production

---

## Additional Resources

- [AWS RDS MySQL Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_MySQL.html)
- [MySQL Best Practices](https://dev.mysql.com/doc/)
- [AWS Well-Architected Framework - Database](https://docs.aws.amazon.com/wellarchitected/latest/userguide/workload-review.html)
- [RDS Pricing Calculator](https://aws.amazon.com/rds/pricing/)

---

**Last Updated**: 2024
**Version**: 1.0
