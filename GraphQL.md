# 🔷 GraphQL — Complete Implementation Guide (Node.js + React)

> Step-by-step guide to build a **GraphQL API** with Apollo Server (Express + MySQL) and consume it from a **React** frontend with Apollo Client.

**You already know:** REST APIs with Express. GraphQL lets the client request exactly the fields it needs in one call.

---

## Table of Contents

1. [What is GraphQL & Why Use It?](#1-what-is-graphql--why-use-it)
2. [GraphQL vs REST](#2-graphql-vs-rest)
3. [Core Concepts](#3-core-concepts)
4. [Project Setup (Backend)](#4-project-setup-backend)
5. [Schema & Types](#5-schema--types)
6. [Resolvers & MySQL](#6-resolvers--mysql)
7. [Queries](#7-queries)
8. [Mutations](#8-mutations)
9. [Authentication & Context](#9-authentication--context)
10. [Frontend — Apollo Client (React)](#10-frontend--apollo-client-react)
11. [Variables, Fragments & Pagination](#11-variables-fragments--pagination)
12. [GraphQL Playground / Apollo Sandbox](#12-graphql-playground--apollo-sandbox)
13. [Full Production Example](#13-full-production-example)
14. [Common Fixes & Best Practices](#14-common-fixes--best-practices)
15. [Quick Reference Cheat Sheet](#15-quick-reference-cheat-sheet)

---

## 1. What is GraphQL & Why Use It?

### The REST problem

With REST, you often need **multiple endpoints** or get **too much / too little data**:

```
GET /api/products          → returns 20 fields (you need 3)
GET /api/products/1        → another call for detail
GET /api/products/1/notes  → third call for notes
```

### What GraphQL does

One endpoint. Client defines the **shape** of the response.

```graphql
query {
  product(id: 1) {
    name
    brand
    notes {
      text
      authorName
    }
  }
}
```

Returns exactly those fields — nothing more.

### Key benefits

| Feature | Description |
|---------|-------------|
| **Single endpoint** | Usually `POST /graphql` |
| **No over-fetching** | Client picks fields |
| **No under-fetching** | Nested data in one request |
| **Strongly typed schema** | Self-documenting API |
| **Introspection** | Tools auto-discover types |

### When NOT to use GraphQL

- Simple CRUD with fixed responses → REST is fine
- File uploads as primary feature → REST/multipart is simpler
- Public caching (CDN) heavy APIs → REST URLs cache better
- Very small projects → adds complexity

---

## 2. GraphQL vs REST

| | REST | GraphQL |
|--|------|---------|
| Endpoints | Many (`/users`, `/products`) | One (`/graphql`) |
| Data shape | Fixed per endpoint | Client decides |
| Versioning | `/v1/`, `/v2/` | Evolve schema with deprecations |
| HTTP methods | GET, POST, PUT, DELETE | POST (queries & mutations) |
| Errors | HTTP status codes | 200 with `errors` array |
| Learning curve | Low | Medium |
| Caching | Easy (URL-based) | Needs client cache (Apollo) |

### Request comparison

**REST:**
```http
GET /api/products/42
GET /api/products/42/notes
```

**GraphQL (one request):**
```graphql
query {
  product(id: 42) {
    name
    currentStage
    notes { text authorName createdAt }
  }
}
```

---

## 3. Core Concepts

```
┌─────────────────────────────────────────────────────┐
│                   GraphQL API                       │
│                                                     │
│  Schema (contract)                                  │
│  ├── Query    → read data   (like GET)              │
│  ├── Mutation → write data  (like POST/PUT/DELETE)  │
│  └── Subscription → real-time (like WebSocket)      │
│                                                     │
│  Resolvers (functions that fetch actual data)       │
│  └── connect to MySQL, Redis, external APIs         │
└─────────────────────────────────────────────────────┘
```

| Term | Meaning |
|------|---------|
| **Schema** | Defines all types, queries, mutations |
| **Type** | Object shape (`Product`, `User`) |
| **Query** | Read operation |
| **Mutation** | Create / update / delete |
| **Resolver** | Function that returns data for a field |
| **Context** | Shared data per request (user, db pool) |

---

## 4. Project Setup (Backend)

### Install packages

```bash
mkdir graphql-api && cd graphql-api
npm init -y
npm install @apollo/server graphql express cors dotenv mysql2 jsonwebtoken
npm install --save-dev nodemon
```

### Folder structure

```
graphql-api/
├── src/
│   ├── index.js
│   ├── schema/
│   │   ├── typeDefs.js
│   │   └── resolvers/
│   │       ├── index.js
│   │       ├── productResolvers.js
│   │       └── userResolvers.js
│   ├── db/
│   │   └── pool.js
│   └── utils/
│       └── auth.js
├── .env
└── package.json
```

### Database pool

```javascript
// src/db/pool.js
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
```

### Environment variables

```env
PORT=5000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=npd_dashboard
JWT_SECRET=your_jwt_secret
```

### Start Apollo Server with Express

```javascript
// src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const typeDefs = require("./schema/typeDefs");
const resolvers = require("./schema/resolvers");
const pool = require("./db/pool");
const { getUserFromToken } = require("./utils/auth");

async function startServer() {
  const app = express();

  const server = new ApolloServer({ typeDefs, resolvers });

  await server.start();

  app.use(
    "/graphql",
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const token = req.headers.authorization?.replace("Bearer ", "");
        const user = token ? await getUserFromToken(token) : null;
        return { pool, user };
      },
    })
  );

  app.listen(process.env.PORT, () => {
    console.log(`GraphQL server: http://localhost:${process.env.PORT}/graphql`);
  });
}

startServer();
```

### package.json scripts

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  }
}
```

---

## 5. Schema & Types

GraphQL schema is the **API contract** — defines what clients can request.

```javascript
// src/schema/typeDefs.js
const typeDefs = `#graphql
  # Scalar types: Int, Float, String, Boolean, ID

  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
  }

  type InternalNote {
    id: ID!
    note: String!
    stageLabel: String
    authorName: String!
    attachment: String
    createdAt: String!
  }

  type Product {
    id: ID!
    name: String!
    brand: String!
    currentStage: String!
    assignedTo: User
    notes: [InternalNote!]!
    createdAt: String!
  }

  # Pagination wrapper
  type ProductConnection {
    items: [Product!]!
    total: Int!
    page: Int!
    pageSize: Int!
  }

  # --- Queries (read) ---
  type Query {
    products(search: String, page: Int, pageSize: Int): ProductConnection!
    product(id: ID!): Product
    me: User
  }

  # --- Mutations (write) ---
  input CreateProductInput {
    name: String!
    brand: String!
    assignedTo: ID
  }

  input CreateNoteInput {
    productId: ID!
    stage: String!
    note: String!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    createProduct(input: CreateProductInput!): Product!
    updateProductStage(id: ID!, stage: String!): Product!
    createNote(input: CreateNoteInput!): InternalNote!
    deleteNote(noteId: ID!): Boolean!
  }

  type AuthPayload {
    token: String!
    user: User!
  }
`;

module.exports = typeDefs;
```

### Type modifiers

| Syntax | Meaning |
|--------|---------|
| `String` | Nullable string |
| `String!` | Required (non-null) |
| `[Product]` | Array, items can be null |
| `[Product!]!` | Required array of required items |
| `ID` | Unique identifier (string or int) |

---

## 6. Resolvers & MySQL

Resolvers are functions that **fetch data** for each field.

```javascript
// src/schema/resolvers/productResolvers.js
const productResolvers = {
  Query: {
    products: async (_, { search = "", page = 1, pageSize = 20 }, { pool }) => {
      const offset = (page - 1) * pageSize;
      const searchParam = `%${search}%`;

      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM products
         WHERE name LIKE ? OR brand LIKE ?`,
        [searchParam, searchParam]
      );

      const [rows] = await pool.query(
        `SELECT p.*, u.name AS assigned_to_name
         FROM products p
         LEFT JOIN users u ON u.id = p.assigned_to
         WHERE p.name LIKE ? OR p.brand LIKE ?
         ORDER BY p.id DESC
         LIMIT ? OFFSET ?`,
        [searchParam, searchParam, pageSize, offset]
      );

      return {
        items: rows,
        total: countRows[0].total,
        page,
        pageSize,
      };
    },

    product: async (_, { id }, { pool }) => {
      const [rows] = await pool.query(
        `SELECT p.*, u.name AS assigned_to_name
         FROM products p
         LEFT JOIN users u ON u.id = p.assigned_to
         WHERE p.id = ?`,
        [id]
      );
      return rows[0] || null;
    },
  },

  // Field resolver — nested `assignedTo` on Product
  Product: {
    assignedTo: async (parent, _, { pool }) => {
      if (!parent.assigned_to) return null;
      const [rows] = await pool.query(
        `SELECT id, name, email, role FROM users WHERE id = ?`,
        [parent.assigned_to]
      );
      return rows[0] || null;
    },

    // Nested notes — only fetched if client requests `notes { ... }`
    notes: async (parent, _, { pool }) => {
      const [rows] = await pool.query(
        `SELECT n.*, u.name AS author_name, s.label AS stage_label
         FROM internal_notes n
         JOIN users u ON u.id = n.user_id
         LEFT JOIN stages s ON s.id = n.stage_id
         WHERE n.product_id = ?
         ORDER BY n.created_at DESC`,
        [parent.id]
      );
      return rows;
    },
  },
};

module.exports = productResolvers;
```

### Combine resolvers

```javascript
// src/schema/resolvers/index.js
const productResolvers = require("./productResolvers");
const userResolvers = require("./userResolvers");

module.exports = {
  Query: {
    ...productResolvers.Query,
    ...userResolvers.Query,
  },
  Mutation: {
    ...productResolvers.Mutation,
    ...userResolvers.Mutation,
  },
  Product: productResolvers.Product,
};
```

---

## 7. Queries

### Basic query (Apollo Sandbox / Playground)

Open `http://localhost:5000/graphql` in browser after starting server.

```graphql
query GetProducts {
  products(search: "shampoo", page: 1, pageSize: 10) {
    total
    items {
      id
      name
      brand
      currentStage
    }
  }
}
```

### Query with nested fields

```graphql
query GetProductDetail {
  product(id: "42") {
    id
    name
    brand
    currentStage
    assignedTo {
      id
      name
      role
    }
    notes {
      id
      note
      stageLabel
      authorName
      createdAt
    }
  }
}
```

> GraphQL only runs the `notes` resolver if the client asks for `notes` — efficient.

### Query with variables

```graphql
query GetProducts($search: String, $page: Int) {
  products(search: $search, page: $page) {
    total
    items { id name brand }
  }
}
```

**Variables (JSON):**
```json
{
  "search": "urban",
  "page": 1
}
```

---

## 8. Mutations

```javascript
// src/schema/resolvers/productResolvers.js (Mutation section)
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const mutations = {
  Mutation: {
    createProduct: async (_, { input }, { pool, user }) => {
      if (!user) throw new Error("Not authenticated");

      const { name, brand, assignedTo } = input;
      const [result] = await pool.query(
        `INSERT INTO products (name, brand, assigned_to, current_stage)
         VALUES (?, ?, ?, 'vendor_selection')`,
        [name, brand, assignedTo || null]
      );

      const [rows] = await pool.query(`SELECT * FROM products WHERE id = ?`, [result.insertId]);
      return rows[0];
    },

    updateProductStage: async (_, { id, stage }, { pool, user }) => {
      if (!user) throw new Error("Not authenticated");

      await pool.query(
        `UPDATE products SET current_stage = ?, updated_at = NOW() WHERE id = ?`,
        [stage, id]
      );

      const [rows] = await pool.query(`SELECT * FROM products WHERE id = ?`, [id]);
      return rows[0];
    },

    createNote: async (_, { input }, { pool, user }) => {
      if (!user) throw new Error("Not authenticated");

      const { productId, stage, note } = input;
      const [stageRows] = await pool.query(`SELECT id FROM stages WHERE key_name = ?`, [stage]);
      const stageId = stageRows[0]?.id;

      const [result] = await pool.query(
        `INSERT INTO internal_notes (product_id, user_id, stage_id, note)
         VALUES (?, ?, ?, ?)`,
        [productId, user.id, stageId, note]
      );

      const [rows] = await pool.query(
        `SELECT n.*, u.name AS author_name, s.label AS stage_label
         FROM internal_notes n
         JOIN users u ON u.id = n.user_id
         LEFT JOIN stages s ON s.id = n.stage_id
         WHERE n.id = ?`,
        [result.insertId]
      );
      return rows[0];
    },

    deleteNote: async (_, { noteId }, { pool, user }) => {
      if (!user) throw new Error("Not authenticated");

      const [rows] = await pool.query(`SELECT * FROM internal_notes WHERE id = ?`, [noteId]);
      if (!rows.length) throw new Error("Note not found");

      const note = rows[0];
      if (note.user_id !== user.id && !["admin", "superAdmin"].includes(user.role)) {
        throw new Error("Forbidden");
      }

      await pool.query(`DELETE FROM internal_notes WHERE id = ?`, [noteId]);
      return true;
    },
  },
};
```

### Example mutations

```graphql
mutation CreateProduct {
  createProduct(input: {
    name: "New Hair Serum"
    brand: "UrbanGabru"
    assignedTo: "5"
  }) {
    id
    name
    currentStage
  }
}
```

```graphql
mutation AddNote {
  createNote(input: {
    productId: "42"
    stage: "qc_check"
    note: "Formulation approved"
  }) {
    id
    note
    authorName
    stageLabel
  }
}
```

---

## 9. Authentication & Context

```javascript
// src/utils/auth.js
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

async function getUserFromToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      `SELECT id, name, email, role FROM users WHERE id = ?`,
      [decoded.id]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

module.exports = { getUserFromToken };
```

```javascript
// Login mutation in userResolvers.js
login: async (_, { email, password }, { pool }) => {
  const [rows] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);
  const user = rows[0];
  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
},

me: async (_, __, { user }) => {
  if (!user) return null;
  return user;
},
```

### Send token from client

```http
POST /graphql
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```

---

## 10. Frontend — Apollo Client (React)

### Install

```bash
npm install @apollo/client graphql
```

### Setup Apollo Provider

```jsx
// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import App from "./App";

const httpLink = createHttpLink({
  uri: "http://localhost:5000/graphql",
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);
```

### Query in component

```jsx
// src/components/ProductList.jsx
import { useQuery, gql } from "@apollo/client";

const GET_PRODUCTS = gql`
  query GetProducts($search: String) {
    products(search: $search, page: 1, pageSize: 20) {
      total
      items {
        id
        name
        brand
        currentStage
      }
    }
  }
`;

export default function ProductList({ search }) {
  const { data, loading, error, refetch } = useQuery(GET_PRODUCTS, {
    variables: { search },
  });

  if (loading) return <p>Loading…</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <p>{data.products.total} products</p>
      <ul>
        {data.products.items.map((p) => (
          <li key={p.id}>{p.name} — {p.currentStage}</li>
        ))}
      </ul>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

### Mutation in component

```jsx
import { useMutation, gql } from "@apollo/client";

const CREATE_NOTE = gql`
  mutation CreateNote($input: CreateNoteInput!) {
    createNote(input: $input) {
      id
      note
      authorName
      stageLabel
      createdAt
    }
  }
`;

function NoteForm({ productId, stage }) {
  const [text, setText] = useState("");
  const [createNote, { loading }] = useMutation(CREATE_NOTE, {
    refetchQueries: ["GetProductDetail"], // refresh product query after mutation
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createNote({
      variables: {
        input: { productId: String(productId), stage, note: text },
      },
    });
    setText("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button type="submit" disabled={loading}>Send</button>
    </form>
  );
}
```

### Login mutation

```jsx
const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user { id name role }
    }
  }
`;

const [login] = useMutation(LOGIN);

const handleLogin = async () => {
  const { data } = await login({ variables: { email, password } });
  localStorage.setItem("token", data.login.token);
};
```

---

## 11. Variables, Fragments & Pagination

### Fragments — reusable field sets

```graphql
fragment ProductFields on Product {
  id
  name
  brand
  currentStage
}

query GetProducts {
  products {
    items {
      ...ProductFields
    }
  }
}
```

```jsx
const PRODUCT_FIELDS = gql`
  fragment ProductFields on Product {
    id
    name
    brand
    currentStage
  }
`;

const GET_PRODUCTS = gql`
  ${PRODUCT_FIELDS}
  query GetProducts {
    products { items { ...ProductFields } }
  }
`;
```

### Pagination pattern

```graphql
query GetProducts($page: Int, $pageSize: Int) {
  products(page: $page, pageSize: $pageSize) {
    total
    page
    pageSize
    items { id name }
  }
}
```

---

## 12. GraphQL Playground / Apollo Sandbox

After starting the server, open:

```
http://localhost:5000/graphql
```

Apollo Server 4 serves **Apollo Sandbox** — interactive IDE to:
- Write queries and mutations
- Set variables and headers (Authorization)
- Explore schema docs (Docs panel)
- View response JSON

### Test with curl

```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ products { total items { id name } } }"}'
```

### With auth header

```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query":"mutation { createProduct(input: { name: \"Test\", brand: \"UG\" }) { id } }"}'
```

---

## 13. Full Production Example

### Architecture

```
┌──────────────┐   POST /graphql    ┌──────────────────┐
│  React App   │ ─────────────────► │  Apollo Server   │
│ Apollo Client│                    │  (Express)       │
└──────────────┘                    │                  │
                                    │  typeDefs        │
                                    │  resolvers       │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │      MySQL       │
                                    │  products, users │
                                    │  internal_notes  │
                                    └──────────────────┘
```

### REST + GraphQL together (migration path)

You don't have to replace REST overnight:

```
/api/products     ← existing REST (keep working)
/graphql          ← new GraphQL (add gradually)
```

Start GraphQL for complex nested reads (product + notes + user). Keep REST for file uploads and simple endpoints.

---

## 14. Common Fixes & Best Practices

### Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot return null for non-nullable field` | Resolver returned null for `String!` | Return default value or make field nullable |
| `Not authenticated` | Missing / invalid JWT | Send `Authorization: Bearer token` header |
| N+1 query problem | Resolver runs query per item | Use DataLoader or JOIN in parent resolver |
| `GraphQL validation failed` | Client requests unknown field | Match query to schema |
| CORS error from React | Apollo Client wrong URI | Set correct `uri` in `createHttpLink` |
| Cache shows stale data | Apollo InMemoryCache | Use `refetchQueries` or `fetchPolicy: "network-only"` |

### N+1 problem & DataLoader (advanced)

```bash
npm install dataloader
```

```javascript
const DataLoader = require("dataloader");

// Batch load users by ID instead of one query per product
const userLoader = new DataLoader(async (ids) => {
  const [rows] = await pool.query(`SELECT * FROM users WHERE id IN (?)`, [ids]);
  const map = Object.fromEntries(rows.map((u) => [u.id, u]));
  return ids.map((id) => map[id] || null);
});

// In context: { pool, user, userLoader }
// In resolver: return userLoader.load(parent.assigned_to);
```

### Best practices

* Design schema around **how clients use data**, not DB tables 1:1
* Use `!` (non-null) only when field is always present
* Put auth checks in resolvers or a wrapper helper
* Use **variables** in queries — never string-interpolate user input
* Use **fragments** for repeated field selections
* Log slow resolvers in production
* Use DataLoader for nested lists to avoid N+1
* Keep file uploads on REST (`multipart/form-data`)
* Document breaking schema changes with `@deprecated`

---

## 15. Quick Reference Cheat Sheet

### Schema syntax

```graphql
type Product {
  id: ID!
  name: String!
  notes: [Note!]!    # nested list
}

type Query {
  products: [Product!]!
  product(id: ID!): Product
}

type Mutation {
  createProduct(input: CreateProductInput!): Product!
}

input CreateProductInput {
  name: String!
  brand: String!
}
```

### Resolver signature

```javascript
// (parent, args, context, info)
async (_, { id }, { pool, user }) => { ... }
```

### Apollo Client hooks

```jsx
const { data, loading, error, refetch } = useQuery(QUERY, { variables });
const [mutate, { loading }] = useMutation(MUTATION, { refetchQueries: ["QueryName"] });
```

### Commands

```bash
# Backend
npm install @apollo/server graphql express mysql2
npm run dev

# Frontend
npm install @apollo/client graphql
```

### When to pick GraphQL vs REST

| Use GraphQL | Use REST |
|-------------|----------|
| Mobile app needs minimal data | Simple CRUD |
| Nested product + notes + user | File uploads |
| Multiple clients, different field needs | Heavy HTTP caching |
| Dashboard with flexible queries | Webhooks from third parties |

---

## Related Files in This Repo

| Topic | File |
|-------|------|
| Express REST API | `TypeScript.md` |
| React frontend | `TypeScript.md`, `NextJS.md` |
| MySQL | `MySQLRollBack.md`, `Prisma.md` |
| WebSocket (real-time alternative) | `WebSocket.md` |
| Zustand (client state) | `Zustand.md` |
| Learning roadmap | `README.md` |

---

*Last updated: July 2026*
