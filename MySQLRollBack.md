# 🗄️ MySQL `conn.query` & Transaction Guide

Reference for working with **mysql2/promise** connection pools, `conn.query()`, `conn.commit()`, and `conn.rollback()` in this project.

---

## 1. Overview

This backend uses **mysql2** with **connection pools** — not a full ORM.

| Concept | What it is |
|---|---|
| **Pool** | Reusable group of DB connections (`historyDb`, `operationsDb`) |
| **Connection (`conn`)** | One borrowed connection from the pool |
| **Transaction** | Multiple SQL steps that succeed or fail **together** |
| **`conn.query()`** | Run SQL on the borrowed connection |
| **`conn.commit()`** | Save all changes in the transaction permanently |
| **`conn.rollback()`** | Undo all changes since `beginTransaction()` |
| **`conn.release()`** | Return the connection back to the pool *(always do this)* |

> **Rule:** Use `pool.query()` for single, standalone queries. Use `getConnection()` + transaction when multiple queries must be atomic (all succeed or none apply).

---

## 2. Database Pools in This Project

### 2.1 History DB — `DB/HistoryDB.js`

Used for PO dashboard tables (`po_dashbord_main`, `po_dashbord_sub`, etc.).

```javascript
const mysql = require('mysql2/promise');

const historyDb = mysql.createPool({
  host: process.env.HIST_OPERATIONS_DB_HOST,
  user: process.env.HIST_OPERATIONS_DB_USER,
  password: process.env.HIST_OPERATIONS_DB_PASS,
  database: process.env.HIST_OPERATIONS_DB_DB_NAME,
  port: Number(process.env.HIST_OPERATIONS_DB_PORT),
  waitForConnections: true,
  connectionLimit: Number(process.env.HIST_OPERATIONS_DB_CONN_LIMIT),
  queueLimit: Number(process.env.HIST_OPERATIONS_DB_QUE_LIMIT),
  connectTimeout: Number(process.env.HIST_OPERATIONS_DB_CONN_TIME),
});

module.exports = historyDb;
```

### 2.2 Operations DB — `DB/OperationsDB.js`

Used for live operational data (e.g. `replica_b2b_order_itemlevel`).

Same pool pattern — different `.env` variables (`OPERATIONS_DB_*`).

### 2.3 Environment Variables

Add to your `.env` file:

```env
# History Operations DB
HIST_OPERATIONS_DB_HOST=your-host
HIST_OPERATIONS_DB_USER=your-user
HIST_OPERATIONS_DB_PASS=your-password
HIST_OPERATIONS_DB_DB_NAME=history_operations_db
HIST_OPERATIONS_DB_PORT=3306
HIST_OPERATIONS_DB_CONN_LIMIT=10
HIST_OPERATIONS_DB_QUE_LIMIT=0
HIST_OPERATIONS_DB_CONN_TIME=10000

# Operations DB
OPERATIONS_DB_HOST=your-host
OPERATIONS_DB_USER=your-user
OPERATIONS_DB_PASS=your-password
OPERATIONS_DB_DB_NAME=operations_db
OPERATIONS_DB_PORT=3306
OPERATIONS_DB_CONN_LIMIT=10
OPERATIONS_DB_QUE_LIMIT=0
OPERATIONS_DB_CONN_TIME=10000
```

Make sure `.env` is in `.gitignore`:

```gitignore
.env
.env.*
```

---

## 3. Simple Query (No Transaction)

Use the **pool directly** when you run **one** query and don't need atomic multi-step logic.

**Example:** `controllers/poAwbController.js`

```javascript
const historyDb = require('../DB/HistoryDB');
const { PO_SUB_TABLE } = require('../config/poDashboardTables');

// SELECT — returns rows
const [rows] = await historyDb.query(
  `SELECT sub_po_number, sub_po_tracking_id
     FROM ${PO_SUB_TABLE}
    WHERE sub_po_number = ?
    LIMIT 1`,
  [trimmedSubPO]
);

if (rows.length === 0) {
  return res.status(404).json({ success: false, message: 'Sub PO not present' });
}

// INSERT — returns result metadata
const [result] = await historyDb.query(
  `INSERT INTO po_awb (Sub_PO, \`AWB/Tracking_ID\`, Logistic_Partner)
   VALUES (?, ?, ?)`,
  [trimmedSubPO, awbTrackingId?.trim() || null, logisticPartner || null]
);

console.log(result.insertId); // new row ID

// UPDATE
await historyDb.query(
  `UPDATE ${PO_SUB_TABLE}
      SET sub_po_tracking_id = ?,
          sub_po_courier_partner = ?
    WHERE sub_po_number = ?`,
  [awbTrackingId?.trim() || null, logisticPartner || null, trimmedSubPO]
);
```

### 3.1 `query()` Return Value

`mysql2` returns an **array**. Destructure the first element:

| Query type | Destructure | First element contains |
|---|---|---|
| `SELECT` | `const [rows] = await db.query(...)` | Array of row objects |
| `INSERT` | `const [result] = await db.query(...)` | `insertId`, `affectedRows`, etc. |
| `UPDATE` | `const [result] = await db.query(...)` | `affectedRows`, `changedRows`, etc. |
| `DELETE` | `const [result] = await db.query(...)` | `affectedRows` |

```javascript
const [rows] = await historyDb.query('SELECT * FROM po_dashbord_sub WHERE id = ?', [1]);
// rows = [{ id: 1, ean_code: '...', ... }]

const [result] = await historyDb.query('INSERT INTO po_awb (...) VALUES (...)', [...]);
// result.insertId = 42
// result.affectedRows = 1
```

> Always use **`?` placeholders** for values — never concatenate user input into SQL strings.

---

## 4. When to Use a Transaction

Use `beginTransaction()` when:

- You **UPDATE** one table and **INSERT** into another — both must succeed
- A validation failure mid-flow should **undo** earlier writes
- Business logic requires **all-or-nothing** behavior

**Real case in this project:** `services/poGrnService.js`  
Updates `po_dashbord_sub` **and** inserts into `po_dashbord_main`. If the main insert fails, the sub update must be rolled back.

---

## 5. Transaction Lifecycle

```
getConnection()
      ↓
beginTransaction()
      ↓
conn.query()  ← step 1
conn.query()  ← step 2
conn.query()  ← step 3
      ↓
   success? ──yes──→ commit()
      │
      no
      ↓
   rollback()
      ↓
release()   ← ALWAYS in finally block
```

| Method | Purpose |
|---|---|
| `historyDb.getConnection()` | Borrow one connection from the pool |
| `conn.beginTransaction()` | Start transaction — changes are temporary until commit |
| `conn.query(sql, params)` | Run SQL inside the transaction |
| `conn.commit()` | Permanently save all changes |
| `conn.rollback()` | Discard all changes since `beginTransaction()` |
| `conn.release()` | Return connection to pool — **prevents pool exhaustion** |

---

## 6. Standard Transaction Template

Copy this pattern for any multi-step service:

```javascript
const historyDb = require('../DB/HistoryDB');

async function myMultiStepOperation({ id, value }) {
  const conn = await historyDb.getConnection();

  try {
    await conn.beginTransaction();

    // ── Step 1: Read ──────────────────────────────────────────
    const [rows] = await conn.query(
      'SELECT id, status FROM some_table WHERE id = ? LIMIT 1',
      [id]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return { ok: false, status: 404, message: 'Record not found' };
    }

    // ── Step 2: Update ────────────────────────────────────────
    const [updateResult] = await conn.query(
      'UPDATE some_table SET status = ? WHERE id = ?',
      [value, id]
    );

    if (updateResult.affectedRows === 0) {
      await conn.rollback();
      return { ok: false, status: 500, message: 'Update failed' };
    }

    // ── Step 3: Insert related row ────────────────────────────
    const [insertResult] = await conn.query(
      'INSERT INTO audit_log (record_id, action) VALUES (?, ?)',
      [id, 'updated']
    );

    // ── All steps OK — save permanently ───────────────────────
    await conn.commit();

    return {
      ok: true,
      status: 200,
      data: { id, auditId: insertResult.insertId },
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
```

---

## 7. Real Project Example — GRN Update

**File:** `services/poGrnService.js`  
**API:** `POST /api/podashbord-view/grn`

### 7.1 Business Logic

1. Find sub PO row by `ean` + `sub_po_number`
2. Compute new `grn_quantity_diff` = `old_grn_quantity_diff - qty` *(qty from frontend)*
3. Update `po_dashbord_sub` — **do not change** `grn_quantity`
4. Insert adjustment row into `po_dashbord_main`
5. Commit both steps together

### 7.2 Code Flow

```javascript
const conn = await historyDb.getConnection();

try {
  await conn.beginTransaction();

  // 1) SELECT sub row
  const [subRows] = await conn.query(
    `SELECT id, grn_quantity, grn_quantity_diff
       FROM ${PO_SUB_TABLE}
      WHERE TRIM(ean_code) = TRIM(?)
        AND sub_po_number = ?
      LIMIT 1`,
    [trimmedEan, trimmedSubPo]
  );

  if (subRows.length === 0) {
    await conn.rollback();
    return { ok: false, status: 404, message: 'Sub PO not found...' };
  }

  const subRow = subRows[0];
  const existingGrnQty = Number(subRow.grn_quantity ?? 0);
  const oldGrnQuantityDiff = Number(subRow.grn_quantity_diff ?? 0);
  const grnQuantityDiff = oldGrnQuantityDiff - grnQty;

  // 2) UPDATE sub — grn_quantity stays unchanged
  const [subUpdate] = await conn.query(
    `UPDATE ${PO_SUB_TABLE}
        SET grn_quantity_diff = ?,
            po_status         = ?
      WHERE id = ?`,
    [grnQuantityDiff, poStatus, subRow.id]
  );

  if (subUpdate.affectedRows === 0) {
    await conn.rollback();
    return { ok: false, status: 500, message: 'Failed to update sub PO GRN details' };
  }

  // 3) SELECT main template row (copy SKU info)
  const [mainRows] = await conn.query(
    `SELECT sku_id, brand, sku_name, vendor_name, cogs_price
       FROM ${PO_MAIN_TABLE}
      WHERE TRIM(ean_code) = TRIM(?)
      LIMIT 1`,
    [trimmedEan]
  );

  if (mainRows.length === 0) {
    await conn.rollback();
    return { ok: false, status: 404, message: 'No main PO row found...' };
  }

  // 4) INSERT into main
  const [mainInsert] = await conn.query(
    `INSERT INTO ${PO_MAIN_TABLE} (
        sku_id, ean_code, brand, sku_name, vendor_name,
        main_po_date, main_po_number, main_po_qty, cogs_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [/* ...values... */]
  );

  // 5) Save everything
  await conn.commit();

  return {
    ok: true,
    status: 200,
    data: {
      grn_quantity: existingGrnQty,
      grn_quantity_diff: grnQuantityDiff,
      main_po_insert_id: mainInsert.insertId,
    },
  };
} catch (error) {
  await conn.rollback();
  throw error;
} finally {
  conn.release();
}
```

### 7.3 GRN Diff Formula

```
new grn_quantity_diff = old grn_quantity_diff - qty (from frontend)

Example:
  old diff = 60
  qty      = 60
  new diff = 60 - 60 = 0
```

---

## 8. `rollback()` — When to Call It

| Situation | Action |
|---|---|
| Validation fails before any write | `rollback()` then `return` error |
| `SELECT` returns 0 rows | `rollback()` then `return` 404 |
| `UPDATE` / `INSERT` affects 0 rows unexpectedly | `rollback()` then `return` error |
| Any thrown exception in `catch` | `rollback()` then `throw` or handle |
| Everything succeeded | `commit()` — **not** `rollback()` |

> Even when you `return` early after `rollback()`, still run `conn.release()` in the `finally` block.

---

## 9. `commit()` vs `rollback()`

```javascript
await conn.beginTransaction();

// ... queries ...

await conn.commit();    // ✅ Permanent — data is saved
await conn.rollback();  // ❌ Discarded — data reverts to pre-transaction state
```

| | `commit()` | `rollback()` |
|---|---|---|
| **Effect** | Saves all changes | Undoes all changes |
| **When** | All steps succeeded | Any step failed or validation failed |
| **Reversible?** | No (unless you run another query) | N/A — nothing was saved |

---

## 10. Controller Layer Pattern

Keep SQL in **services**, HTTP logic in **controllers**.

**`controllers/poGrnController.js`**

```javascript
const { updateGrn } = require('../services/poGrnService');

exports.updateGrn = async (req, res) => {
  const { ean, qty, sub_po_number, status } = req.body;

  try {
    const result = await updateGrn({ ean, qty, sub_po_number, status });

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'GRN updated successfully',
      ...result.data,
    });
  } catch (error) {
    console.error('❌ POST /podashbord-view/grn error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update GRN',
      error: error.message,
    });
  }
};
```

---

## 11. Table Name Config

Use constants from `config/poDashboardTables.js` — never hardcode table names in production code.

```javascript
const { PO_MAIN_TABLE, PO_SUB_TABLE } = require('../config/poDashboardTables');

// PO_MAIN_TABLE = 'history_operations_db.po_dashbord_main'       (production)
// PO_MAIN_TABLE = 'history_operations_db.backup_po_dashbord_main' (development)
```

Controlled by `NODE_ENV` in `.env`:

```env
NODE_ENV=development   # uses backup_* tables
NODE_ENV=production    # uses live tables
```

---

## 12. Common Mistakes to Avoid

| Mistake | Problem | Fix |
|---|---|---|
| Forgetting `conn.release()` | Pool runs out of connections | Always use `finally { conn.release() }` |
| Using `pool.query()` inside a transaction | Queries run on different connections | Use `conn.query()` on the same `conn` |
| Calling `commit()` after `rollback()` | Unpredictable state | Return immediately after `rollback()` |
| No `rollback()` in `catch` | Partial data may linger | Always `rollback()` in `catch` |
| String concatenation in SQL | SQL injection risk | Use `?` placeholders |
| Not checking `affectedRows` | Silent failures | Check after `UPDATE` / `INSERT` |

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Too many connections` | `release()` not called | Add `finally { conn.release() }` to every `getConnection()` |
| `Cannot enqueue Query after fatal error` | Connection used after error without release | Release in `finally`, get fresh connection next call |
| `ER_LOCK_WAIT_TIMEOUT` | Another transaction holds row lock | Keep transactions short; avoid long loops inside transactions |
| `ER_NO_SUCH_TABLE` | Wrong table name or wrong DB | Check `PO_MAIN_TABLE` / `PO_SUB_TABLE` and `NODE_ENV` |
| `ECONNREFUSED` | DB host/port wrong or DB down | Verify `.env` credentials and server status |
| Changes not visible after API success | Forgot `commit()` | Ensure `await conn.commit()` runs before `return` |
| Partial update saved on error | No transaction used | Wrap related queries in `beginTransaction()` |

---

## Quick Reference Checklist

- [ ] Import correct pool (`historyDb` or `operationsDb`)
- [ ] Use `pool.query()` for single standalone queries
- [ ] Use `getConnection()` + transaction for multi-step atomic operations
- [ ] Call `beginTransaction()` before first `conn.query()`
- [ ] Use `conn.query()` (not `pool.query()`) inside transactions
- [ ] `rollback()` on validation failure or unexpected `affectedRows === 0`
- [ ] `commit()` only when all steps succeed
- [ ] `rollback()` in `catch` block
- [ ] `conn.release()` in `finally` block — **always**
- [ ] Use `?` placeholders for all dynamic values
- [ ] Use table constants from `config/poDashboardTables.js`
- [ ] Keep SQL in `services/`, HTTP responses in `controllers/`

---

## File Map (This Project)

| File | Role |
|---|---|
| `DB/HistoryDB.js` | History DB connection pool |
| `DB/OperationsDB.js` | Operations DB connection pool |
| `config/poDashboardTables.js` | Table name constants (prod vs dev) |
| `services/poGrnService.js` | Transaction example — GRN update |
| `controllers/poGrnController.js` | HTTP handler for GRN API |
| `routes/PODashbordRoute.js` | `POST /api/podashbord-view/grn` route |
| `controllers/poAwbController.js` | Simple `pool.query()` example (no transaction) |

---

## Related API

```
POST /api/podashbord-view/grn
```

**Request body:**

```json
{
  "ean": "1234567890123",
  "qty": 60,
  "sub_po_number": "SUB-PO-001",
  "status": "Open"
}
```

**What happens in DB (transaction):**

1. `po_dashbord_sub` → update `grn_quantity_diff`, `po_status` *(grn_quantity unchanged)*
2. `po_dashbord_main` → insert new row with SKU info copied from existing EAN row
