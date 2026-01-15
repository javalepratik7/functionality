# Database Selection Checklist (Senior-Level)

Use this checklist to decide **SQL vs NoSQL** for any project.

---

## 1. Data Relationships
- Strong references / many-to-many / joins → **SQL**
- Independent documents → **NoSQL**

## 2. Transactional Consistency
- Critical transactions (payments, bookings, money) → **SQL**
- Eventual consistency ok → **NoSQL**

## 3. Reporting & Analytics
- Complex queries, grouping, aggregation → **SQL**
- Simple fetch by ID, logging → **NoSQL**

## 4. Schema Stability
- Stable, predictable schema → **SQL**
- Rapidly evolving / dynamic fields → **NoSQL**

## 5. Scale Pattern
- High concurrent writes on same record → **SQL**
- Massive write-heavy, append-only → **NoSQL**

## 6. Data Integrity
- Critical constraints, uniqueness, validations → **SQL**
- Flexible data, validation in app → **NoSQL**

## 7. Team & Operations
- Experienced backend team, traditional tooling → **SQL**
- Microservices, event-driven → **NoSQL**

## 8. Future Requirements
- Audits, history, compliance → **SQL**
- Ephemeral / log data → **NoSQL**

---

# Quick Senior-Level Rules
1. Default to **SQL** unless proven otherwise.
2. NoSQL is a **tool, not a shortcut**.
3. Consider **polyglot persistence** for hybrid needs.
4. Base choice on **failure modes and consistency needs**, not hype.

---

# Interview-Friendly One-Liner
> “I evaluate relationship complexity, transactional consistency, schema stability, and reporting needs.  
> Strongly-related transactional systems → SQL.  
> High-scale, schema-flexible workloads → NoSQL.”




🔑 Rule #1

Default to SQL unless proven otherwise.

🔑 Rule #2

NoSQL is a tool, not a shortcut.

🔑 Rule #3

Use multiple databases if needed.

🔑 Rule #4

Choose based on failure modes, not hype.