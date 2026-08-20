# AWS DMS: Copy one MySQL database from one RDS to another

This guide walks through a **one-time full copy** of a single MySQL database from a source Amazon RDS instance to a target Amazon RDS instance using **AWS Database Migration Service (DMS)**.

DMS **copies** data. It does **not** delete or move data off the source. After a successful full load, **both** RDS instances have the data.

This is based on a real cross-region copy:

| | Source | Target |
|---|---|---|
| Region | `ap-south-1` (Mumbai) | `us-east-1` (N. Virginia) |
| RDS | `ug-application-db-server` | `ug-db-server` |
| Database | `mtracker_db` (~15 GB) | `mtracker_db` |
| DMS region | `us-east-1` (same region as the target) | |

---

## 1. What you are building

```
Source RDS (MySQL)  -->  DMS replication instance  -->  Target RDS (MySQL)
     ap-south-1                 us-east-1                    us-east-1
```

You will create, in order:

1. Replication instance (compute that runs the copy)
2. Source endpoint (how DMS reads the source)
3. Target endpoint (how DMS writes the target)
4. Migration task (what to copy, and how)

The **database name is not entered on the endpoint**. It is entered later in the **task table mappings**.

---

## 2. Decide the migration type

| Task type in console | Meaning | Use when |
|---|---|---|
| **Migrate only** (Full load) | Copy existing data once | You want the same data on both RDS instances |
| **Migrate and replicate** (Full load + CDC) | Copy once, then keep applying new changes | You need the target to stay in sync |
| **Replicate only** (CDC) | Only new changes | Target already has a copy |

This guide uses **Migrate only**.

CDC needs extra source setup (binary logging, `binlog_format=ROW`, `binlog_row_image=FULL`, backups). Skip CDC unless you need ongoing sync.

---

## 3. Collect these values first

Do not put passwords in this file. Keep them in a password manager.

| Item | Example |
|---|---|
| AWS console region for DMS | `us-east-1` (N. Virginia) |
| Source RDS hostname | `ug-application-db-server.catvfpilxwys.ap-south-1.rds.amazonaws.com` |
| Source region | `ap-south-1` |
| Target RDS hostname | `ug-db-server.c0tweoa8s523.us-east-1.rds.amazonaws.com` |
| Target region | `us-east-1` |
| Port | `3306` |
| Username | `admin` (or another user with required grants) |
| Database name | `mtracker_db` |
| SSL | `none` for the first test (tighten later if required) |

Also note:

- Source security group (in the **source** region)
- Target security group (in the **target** region)

---

## 4. Network: allow DMS to reach both databases

The replication instance needs inbound **MySQL 3306** access to **both** RDS instances.

If the DMS instance is **publicly accessible**, AWS shows a **public IP** (example: `32.195.150.173`).

On **each** RDS security group, add:

| Type | Port | Source |
|---|---|---|
| MySQL/Aurora | `3306` | DMS public IP `/32` (example: `32.195.150.173/32`) |

Rules:

- Source RDS is in another region → you **cannot** use a VPC security-group reference. Use the DMS **public IP**.
- Target RDS in the same VPC as DMS can instead allow the DMS security group. Using the public IP still works if the instance is publicly accessible.
- Source and target RDS must be **publicly accessible** if you connect by public hostname. For private-only RDS, use VPC peering / VPN / Transit Gateway instead. This guide assumes public RDS endpoints.

Create the replication instance first (next section), copy its public IP, then add the security-group rules **before** testing endpoints.

---

## 5. Create the replication instance

Console: **AWS DMS** (region = where you want DMS, usually the **target** region) → **Provisioned instances** / **Replication instances** → **Create replication instance**.

| Field | Recommended |
|---|---|
| Name | `dms-<app>-migration` (example: `dms-mtracker-migration`) |
| Instance class | `dms.t3.medium` is enough for ~15 GB. Use larger (`dms.c5.large`+) for bigger DBs or tight time |
| Engine version | `3.5.4` (or current default). Do **not** use IAM DB auth unless version is **3.6.1+** |
| VPC | Same VPC as the target RDS when possible |
| Multi-AZ | Optional. On is more resilient; off is cheaper |
| Publicly accessible | **Yes** if source is in another region/VPC and you have no peering |

Wait until **Status = Available**. Note:

- Public IP
- Private IP
- VPC ID

---

## 6. Create the source endpoint

Console: **DMS → Endpoints → Create endpoint**.

### 6.1 Fields

| Field | Value |
|---|---|
| Endpoint type | **Source endpoint** |
| Select RDS DB instance | **Unchecked** if the source RDS is in **another region**. That list only shows RDS in the **current** DMS region |
| Endpoint identifier | `src-<name>-mysql` (example: `src-mtracker-mysql`) |
| Source engine | **MySQL** |
| Access to endpoint database | **Provide access information manually** |
| Server name | Source RDS hostname |
| Port | `3306` |
| User name | Source DB user |
| Password | Source DB password |
| SSL mode | **none** (unless you already configured certs) |
| Database name | **Leave blank** (see below) |
| Endpoint settings / ECAs | Leave default |
| KMS key | `(Default) aws/dms` |

### 6.2 Do not enter the database name here

For MySQL, DMS connects to the **server**. If you set `DatabaseName` on the endpoint, DMS can dump every selected table into that one database. Enter `mtracker_db` later in **task table mappings**.

### 6.3 Do not use IAM authentication

Select **Provide access information manually**, not:

- AWS Secrets Manager (unless you already have a working DMS + Secrets Manager role)
- **IAM authentication**

IAM auth needs DMS **3.6.1+** and a valid role ARN. A common console error is:

```text
Invalid role arn
```

That means an empty or invalid IAM / Secrets Manager role is being sent. Fix:

1. Click **Cancel** and open **Create endpoint** again (do not reuse a broken form)
2. Confirm **Provide access information manually** is selected
3. Confirm a **Password** field is visible (not an **IAM role** field)
4. Leave **Select RDS DB instance** unchecked for a cross-region source
5. If **Run test** still shows `Invalid role arn`, click **Create endpoint** anyway, then **Actions → Test connection** from the endpoint page

### 6.4 Test the source

1. Replication instance: your DMS instance
2. **Run test**
3. Wait for **Successful**
4. **Create endpoint** (Run test often creates the endpoint already)

Status on the Endpoints list should be **Active**.

If the test **times out**: security group, public access, or wrong hostname.

If **Access denied**: wrong password, or the user is not allowed from the DMS IP.

---

## 7. Create the target endpoint

Same page: **Create endpoint**.

| Field | Value |
|---|---|
| Endpoint type | **Target endpoint** |
| Select RDS DB instance | **Checked** only if the target RDS is in the **same region** as the DMS console. Otherwise leave unchecked and type the hostname |
| Endpoint identifier | `tgt-<name>-mysql` (or the RDS name, example: `ug-db-server`) |
| Target engine | **MySQL** |
| Access | **Provide access information manually** |
| Server name | Target RDS hostname |
| Port | `3306` |
| User name / password | Target credentials |
| SSL | **none** |
| Database name | **Leave blank** |

Test against the same replication instance. Wait for **Successful**, then **Create endpoint**.

Same `Invalid role arn` rule as the source: do **not** select IAM authentication.

---

## 8. Prepare the target database

DMS creates **tables**. It does **not** reliably create the **database**.

On the **target** RDS:

```sql
CREATE DATABASE IF NOT EXISTS mtracker_db;

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, LOCK TABLES
ON mtracker_db.* TO 'admin'@'%';

FLUSH PRIVILEGES;
```

Replace `mtracker_db` and `admin` with your names.

`Can't create database ... database exists` is fine. The `GRANT` should succeed.

Optional but recommended: raise timeouts so a long 15 GB load does not drop the connection. In a **custom** RDS parameter group (you cannot edit the default), on **source and target**:

| Parameter | Value |
|---|---|
| `net_read_timeout` | `300` or higher |
| `net_write_timeout` | `300` or higher |
| `wait_timeout` | `300` or higher (`28800` is already fine) |

Attach the parameter group and reboot if RDS requires it.

DMS full load also expects `local_infile = 1` on the **target**. RDS MySQL often already has this.

---

## 9. Create the migration task

Console: **DMS → Tasks → Create task**.

### 9.1 Task configuration

| Field | Value |
|---|---|
| Task identifier | `mtracker-mysql-migration` |
| Source database endpoint | `src-mtracker-mysql` |
| Target database endpoint | `ug-db-server` |
| Why moving data | **Cross region replication** (optional) |
| Task mode | **Provisioned** |
| Provisioned instance | `dms-mtracker-migration` |
| Task type | **Migrate only** |

### 9.2 Settings

| Setting | Value |
|---|---|
| Editing mode | Wizard |
| Target table preparation mode | **Drop tables on target** if you want a clean copy. **Truncate** if tables already exist and you only want data replaced. **Do nothing** if you created tables yourself |
| Include LOB columns | **Limited LOB mode** |
| Maximum LOB size (KB) | `32` (increase if you have larger TEXT/BLOB values; truncated LOBs will be incomplete) |
| Data validation | **Turn off** for the first copy |
| CloudWatch logs | On |

**Drop tables on target** (`DROP_AND_CREATE`) **deletes matching tables on the target only**. Source is never dropped. Do not use this if the target already has data you must keep.

### 9.3 Table mappings (this is where the DB name goes)

Keep **Wizard**. **Add selection rule**:

| Field | Value |
|---|---|
| Schema name | `mtracker_db` (MySQL **database** name) |
| Schema table name | `%` (all tables) |
| Action | **Include** |

The summary must look like:

```text
where schema name is like 'mtracker_db' and table name is like '%', include
```

**Wrong:** table name `mtracker_db` — that copies only a table literally named `mtracker_db`, not the whole database.

No transformation rules are needed if the target database has the **same name**.

### 9.4 Premigration assessment

Optional. If you turn it on, DMS creates an S3 bucket and IAM role, and you **cannot** auto-start the task.

For a first copy you can leave it **off**, then **Create task**, then start manually.

If you run it, typical results:

| Result | Meaning | Action |
|---|---|---|
| Failed: target user privileges | User cannot write to target DB | Run the `GRANT` in section 8 |
| Failed: timeouts &lt; 5 minutes | `net_read_timeout` / `net_write_timeout` too low | Parameter group (section 8) |
| Failed: cascade constraints | DMS does not copy `ON DELETE CASCADE` / `ON UPDATE CASCADE` | Recreate FKs on target **after** load (section 13) |
| Warning: AUTO_INCREMENT | Attribute is not copied | Fix after load (section 13) |
| Warning: secondary indexes | Some indexes may be missing on target | Recreate after load |
| Warning: MaxFullLoadSubTasks | More than 8 tables | Optional: raise parallel table count |

Assessment **failures do not always block Start**. Fix privileges before starting. Cascade / AUTO_INCREMENT are post-copy work.

### 9.5 Start configuration

Choose **Manually later**, then **Create task**.

Wait until status is **Ready** (not **Creating**).

---

## 10. Start the task

**Tasks** → select the task → **Actions → Start**.

Confirm the dialog:

- **DROP_AND_CREATE** will wipe matching **target** tables. Source stays.
- Assessment may still show failed items. You can start after privileges are fixed.

Status flow:

```text
Ready → Starting → Running / Load running → Load complete
```

Watch:

| Column | Healthy |
|---|---|
| Full load progress | Moves from 0% toward 100% |
| Tables loaded | Increases |
| Tables errored | Stays `0` |
| Elapsed load time | Keeps growing while Running |

Open the task → **Table statistics** to see each table.

### How long?

Rough guide for a **cross-region** full load on `dms.t3.medium`:

| Size | Typical time |
|---|---|
| ~15 GB | 1–3 hours |
| Simple tables, good network | Under 1 hour |
| Many indexes, FKs, large LOBs | 3–6 hours |

Leave the task running. Do not stop it unless it is failed or stuck for a long time with no progress.

---

## 11. Confirm both RDS instances have the data

When **Status = Load complete** and progress is **100%**:

On **source** (unchanged):

```sql
SELECT table_schema, COUNT(*) AS tables,
       ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'mtracker_db'
GROUP BY table_schema;
```

On **target** (copy):

```sql
SELECT table_schema, COUNT(*) AS tables,
       ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'mtracker_db'
GROUP BY table_schema;
```

Spot-check row counts:

```sql
SELECT COUNT(*) FROM mtracker_db.<table_name>;
```

Source and target table counts should match. Sizes can differ slightly (indexes, InnoDB overhead).

This was a **one-time** copy. New writes on the source after **Load complete** will **not** appear on the target unless you used **Migrate and replicate**.

---

## 12. After the copy (recommended)

DMS MySQL limitations you will likely need to fix on the **target**:

### 12.1 AUTO_INCREMENT

DMS does not copy the `AUTO_INCREMENT` attribute. For each identity table, on **source**:

```sql
SHOW TABLE STATUS FROM mtracker_db LIKE '<table>';
```

Then on **target**:

```sql
ALTER TABLE mtracker_db.<table> AUTO_INCREMENT = <next_value>;
```

### 12.2 Foreign keys with CASCADE

Dump FK definitions from source and apply on target:

```sql
SHOW CREATE TABLE mtracker_db.<table>\G
```

Re-add `ON DELETE CASCADE` / `ON UPDATE CASCADE` as needed.

### 12.3 Secondary indexes

Compare indexes:

```sql
SHOW INDEX FROM mtracker_db.<table>;
```

Create any missing secondary indexes on the target.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Endpoint test timeout | SG / public access / wrong host | Allow DMS IP on port 3306; confirm publicly accessible |
| Endpoint `Access denied` | Bad password or host grant | Reset password; `GRANT ... TO 'user'@'%'` |
| `Invalid role arn` | IAM / Secrets Manager selected | Use username + password only; recreate the form |
| Source RDS not in the dropdown | Different region | Do not use **Select RDS DB instance**; type hostname |
| Task copies 0 tables / wrong objects | Table mapping table name is the DB name | Schema = DB name, table = `%` |
| Assessment: target privileges failed | DB missing or weak grants | `CREATE DATABASE` + `GRANT` on target |
| Task failed mid-load / disconnect | Timeouts too low | Raise `net_read_timeout` / `net_write_timeout` to 300+ |
| Tables errored &gt; 0 | Per-table issue | Task → Table statistics → error message |
| LOB data truncated | Limited LOB 32 KB too small | Increase max LOB size or use Full LOB mode |
| Target missing FKs / AI / indexes | DMS MySQL limitation | Section 12 |

---

## 14. Cleanup (optional, after you verify the copy)

DMS resources keep costing money while they exist.

1. Stop the task if it is still running (full load should already be complete)
2. Delete the **task**
3. Delete **endpoints** if unused
4. Delete the **replication instance** (largest cost)
5. Remove the temporary **3306** rules from RDS security groups
6. Delete assessment S3 bucket / IAM role if you created them (`dms-assessment-run-...`, `DMSS3AccessRole-...`)

Do not delete the replication instance until you are sure you will not re-run or resume.

---

## 15. Console click path (short)

1. **DMS** (target region) → create **replication instance** → wait **Available**
2. Copy DMS **public IP** → open **3306** on source **and** target security groups
3. **Endpoints** → source MySQL, hostname, user/password, **no DB name**, **no IAM** → **Run test** → **Active**
4. **Endpoints** → target MySQL, same pattern → **Active**
5. On target: `CREATE DATABASE` + `GRANT`
6. **Tasks** → Migrate only → mapping **schema = db name**, **table = `%`** → **Create task**
7. **Start** → confirm target tables may be dropped → wait **Load complete**
8. Compare table/row counts on both RDS
9. Fix AUTO_INCREMENT, cascades, and indexes on the target

---

## 16. Worked example (mtracker)

| Resource | Value |
|---|---|
| AWS account | `751237266254` |
| DMS region | `us-east-1` |
| Replication instance | `dms-mtracker-migration` (`dms.t3.medium`, engine `3.5.4`, public) |
| Source endpoint | `src-mtracker-mysql` → `ug-application-db-server.catvfpilxwys.ap-south-1.rds.amazonaws.com:3306` |
| Target endpoint | `ug-db-server` → `ug-db-server.c0tweoa8s523.us-east-1.rds.amazonaws.com:3306` |
| Database | `mtracker_db` |
| Task | `mtracker-mysql-migration` |
| Task type | Full load (Migrate only) |
| Table prep | `DROP_AND_CREATE` |
| Mapping | schema `mtracker_db`, table `%`, Include |

While running, a healthy task looks like: **Load running**, progress increasing, **Tables errored = 0**.
