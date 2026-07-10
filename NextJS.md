# ⚡ Next.js — Complete Study Guide (Production Ready)

> Build production apps with **Next.js** (App Router) and TypeScript. Written for developers who already know React, Node.js, and Express.

**Prerequisite:** Learn TypeScript first → see [`TypeScript.md`](./TypeScript.md)

---

## Table of Contents

1. [What is Next.js & Why Use It?](#1-what-is-nextjs--why-use-it)
2. [Create a Next.js Project](#2-create-a-nextjs-project)
3. [App Router — File-Based Routing](#3-app-router--file-based-routing)
4. [Layouts, Pages & Loading UI](#4-layouts-pages--loading-ui)
5. [Server Components vs Client Components](#5-server-components-vs-client-components)
6. [Data Fetching in Next.js](#6-data-fetching-in-nextjs)
7. [API Routes (Route Handlers)](#7-api-routes-route-handlers)
8. [Middleware & Auth](#8-middleware--auth)
9. [Environment Variables](#9-environment-variables)
10. [Full Production Example (Dashboard App)](#10-full-production-example-dashboard-app)
11. [Deploy Next.js (Vercel + EC2/Nginx)](#11-deploy-nextjs-vercel--ec2nginx)
12. [Common Fixes & Best Practices](#12-common-fixes--best-practices)
13. [Quick Reference Cheat Sheet](#13-quick-reference-cheat-sheet)

---

## 1. What is Next.js & Why Use It?

### The Problem with Create React App (CRA) / Vite SPA alone

A plain React SPA (like your NPD Dashboard) handles routing and data fetching **only on the client**:

```
Browser → downloads empty HTML → downloads JS bundle → fetches API → renders page
         (slow first load, bad SEO, exposes API keys in browser)
```

### What Next.js Does

Next.js is a **React framework** built on top of React that adds:

| Feature | Benefit |
|---------|---------|
| **Server-side rendering (SSR)** | Faster first paint, better SEO |
| **Static generation (SSG)** | Pre-build pages at deploy time |
| **API routes** | Backend endpoints in same project |
| **File-based routing** | No React Router config needed |
| **Image optimization** | Automatic lazy load + resize |
| **Built-in bundling** | Webpack/Turbopack out of the box |

### Next.js vs React SPA

| | React SPA (Vite/CRA) | Next.js |
|--|----------------------|---------|
| Routing | React Router (manual) | File-based (automatic) |
| Data fetch | Client only (`useEffect`) | Server + Client |
| SEO | Poor (empty initial HTML) | Good (SSR/SSG) |
| API | Separate Express server | Route Handlers built-in |
| Deploy | Static files + separate API | Vercel one-click or Node server |

### Architecture overview

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js App                         │
│                                                         │
│  app/                                                   │
│  ├── page.tsx          ← Server Component (default)     │
│  ├── layout.tsx        ← Shared layout                  │
│  ├── dashboard/                                         │
│  │   └── page.tsx      ← /dashboard route               │
│  └── api/                                               │
│      └── products/                                      │
│          └── route.ts  ← GET/POST /api/products         │
│                                                         │
│  Server ──► fetches DB directly (no exposed API key)    │
│  Client ──► "use client" components (interactivity)     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Create a Next.js Project

### Prerequisites

- Node.js 18.17+ (recommend 20 LTS)
- npm or pnpm

### Step 1 — Create project

```bash
npx create-next-app@latest my-dashboard
```

**Recommended options during setup:**

```
✔ Would you like to use TypeScript?        → Yes
✔ Would you like to use ESLint?            → Yes
✔ Would you like to use Tailwind CSS?      → Yes (or No if using custom CSS)
✔ Would you like to use `src/` directory?  → Yes
✔ Would you like to use App Router?        → Yes  ← IMPORTANT
✔ Would you like to customize import alias?→ No (default @/* is fine)
```

### Step 2 — Project structure (App Router)

```
my-dashboard/
├── src/
│   └── app/
│       ├── layout.tsx       ← Root layout (wraps all pages)
│       ├── page.tsx         ← Home page (/)
│       ├── globals.css
│       ├── dashboard/
│       │   └── page.tsx     ← /dashboard
│       ├── products/
│       │   ├── page.tsx     ← /products (list)
│       │   └── [id]/
│       │       └── page.tsx ← /products/123 (dynamic)
│       └── api/
│           └── products/
│               └── route.ts ← API: /api/products
├── public/                  ← Static assets (images, favicon)
├── next.config.ts
├── tsconfig.json
└── package.json
```

### Step 3 — Run dev server

```bash
cd my-dashboard
npm run dev
```

Open: http://localhost:3000

### Available scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint check |

---

## 3. App Router — File-Based Routing

### Routing rules

| File path | URL |
|-----------|-----|
| `app/page.tsx` | `/` |
| `app/dashboard/page.tsx` | `/dashboard` |
| `app/products/page.tsx` | `/products` |
| `app/products/[id]/page.tsx` | `/products/42` |
| `app/settings/profile/page.tsx` | `/settings/profile` |

### Dynamic routes

```tsx
// src/app/products/[id]/page.tsx

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <h1>Product ID: {id}</h1>;
}
```

### Route groups (organize without affecting URL)

```
app/
├── (auth)/
│   ├── login/page.tsx      → /login
│   └── register/page.tsx   → /register
└── (dashboard)/
    ├── layout.tsx          ← shared dashboard layout
    └── products/page.tsx   → /products
```

### Navigation

```tsx
import Link from "next/link";
import { useRouter } from "next/navigation";  // client component only

// In JSX
<Link href="/dashboard">Go to Dashboard</Link>
<Link href="/products/42">View Product</Link>

// Programmatic (client component)
const router = useRouter();
router.push("/dashboard");
router.back();
```

> Use `next/link` instead of `<a>` for internal links — enables client-side navigation without full page reload.

---

## 4. Layouts, Pages & Loading UI

### Root layout — `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NPD Dashboard",
  description: "Product development tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header>My App Header</header>
        <main>{children}</main>
        <footer>© 2026</footer>
      </body>
    </html>
  );
}
```

### Nested layout — `app/dashboard/layout.tsx`

```tsx
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard">
      <Sidebar />
      <div className="dashboard__content">{children}</div>
    </div>
  );
}
```

### Loading UI — `app/dashboard/loading.tsx`

```tsx
export default function Loading() {
  return (
    <div className="skeleton-loader">
      <p>Loading dashboard…</p>
    </div>
  );
}
```

Next.js automatically shows this while the page is loading.

### Error UI — `app/dashboard/error.tsx`

```tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### Not found — `app/not-found.tsx`

```tsx
export default function NotFound() {
  return (
    <div>
      <h2>404 — Page Not Found</h2>
      <a href="/">Go home</a>
    </div>
  );
}
```

---

## 5. Server Components vs Client Components

### Default: Server Components

Every component in the `app/` directory is a **Server Component** by default.

- Runs **only on the server**
- Can directly access database, file system, secrets
- Cannot use `useState`, `useEffect`, event handlers
- Smaller JS bundle sent to browser

```tsx
// Server Component — no "use client"
import { db } from "@/lib/db";

export default async function ProductsPage() {
  const products = await db.query("SELECT * FROM products LIMIT 20");
  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

### Client Components — add `"use client"` at top

Use when you need:
- `useState`, `useEffect`, `useRef`
- Event handlers (`onClick`, `onChange`)
- Browser APIs (`localStorage`, `window`)
- Third-party libs that use hooks

```tsx
"use client";

import { useState } from "react";

export default function NoteInput({ productId }: { productId: number }) {
  const [text, setText] = useState("");

  const handleSend = async () => {
    await fetch(`/api/products/${productId}/notes`, {
      method: "POST",
      body: JSON.stringify({ note: text }),
    });
    setText("");
  };

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

### Composition pattern (recommended)

```tsx
// Server Component (page.tsx)
import NoteInput from "@/components/NoteInput";   // client component
import { getNotes } from "@/lib/notes";           // server-side fetch

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notes = await getNotes(Number(id));

  return (
    <div>
      <h1>Product {id}</h1>
      <NoteList notes={notes} />       {/* server */}
      <NoteInput productId={Number(id)} />  {/* client */}
    </div>
  );
}
```

### Decision guide

| Need | Use |
|------|-----|
| Fetch data from DB | Server Component |
| Display static content | Server Component |
| Forms, buttons, inputs | Client Component |
| `useState` / `useEffect` | Client Component |
| Keep secrets on server | Server Component + Route Handler |

---

## 6. Data Fetching in Next.js

### Server Component fetch (recommended)

```tsx
// src/app/products/page.tsx

interface Product {
  id: number;
  name: string;
  status: string;
}

async function getProducts(): Promise<Product[]> {
  const res = await fetch("http://localhost:3000/api/products", {
    cache: "no-store",   // always fresh (like SSR)
    // cache: "force-cache"  ← default, cached until rebuild
    // next: { revalidate: 60 }  ← ISR: revalidate every 60 seconds
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <table>
      <thead>
        <tr><th>ID</th><th>Name</th><th>Status</th></tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.id}>
            <td>{p.id}</td>
            <td>{p.name}</td>
            <td>{p.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Direct DB access (no API round-trip)

```tsx
// src/lib/db.ts
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export async function getProducts() {
  const [rows] = await pool.query("SELECT * FROM products ORDER BY id DESC");
  return rows;
}
```

```tsx
// src/app/products/page.tsx
import { getProducts } from "@/lib/db";

export default async function ProductsPage() {
  const products = await getProducts();
  // render...
}
```

### Client-side fetch with TanStack Query (optional)

```bash
npm install @tanstack/react-query
```

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";

export function ProductListClient() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetch("/api/products").then((r) => r.json()),
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Error loading products</p>;
  return <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

---

## 7. API Routes (Route Handlers)

In App Router, API routes live in `app/api/` as `route.ts` files.

### GET + POST example

```typescript
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getProducts, createProduct } from "@/lib/db";

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json({ success: true, data: products });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, brand } = body;

    if (!name || !brand) {
      return NextResponse.json(
        { success: false, message: "name and brand are required" },
        { status: 400 }
      );
    }

    const product = await createProduct({ name, brand });
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Failed to create product" },
      { status: 500 }
    );
  }
}
```

### Dynamic API route

```typescript
// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getProductById, updateProduct, deleteProduct } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const product = await getProductById(Number(id));
  if (!product) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await req.json();
  const updated = await updateProduct(Number(id), body);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  await deleteProduct(Number(id));
  return NextResponse.json({ success: true });
}
```

### File upload route

```typescript
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadToS3(buffer, file.name, file.type);

  return NextResponse.json({ url }, { status: 201 });
}
```

---

## 8. Middleware & Auth

### Middleware — runs before every request

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check auth token cookie
  const token = request.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/products/:path*", "/api/products/:path*"],
};
```

### Simple login API

```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { findUserByEmail } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const user = await findUserByEmail(email);
  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name } });
  response.cookies.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
```

---

## 9. Environment Variables

### File naming

| File | Loaded when |
|------|-------------|
| `.env` | All environments |
| `.env.local` | Local only (gitignored) |
| `.env.development` | `npm run dev` |
| `.env.production` | `npm run build` / `npm start` |

### Example `.env.local`

```env
# Database (server-only — no NEXT_PUBLIC_ prefix)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=npd_dashboard

# Auth (server-only)
JWT_SECRET=your-super-secret-key

# AWS S3 (server-only)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...

# Public (exposed to browser — must start with NEXT_PUBLIC_)
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_APP_NAME=NPD Dashboard
```

### Usage

```typescript
// Server Component or Route Handler — any env var
const dbHost = process.env.DB_HOST;

// Client Component — ONLY NEXT_PUBLIC_ vars
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

> **Rule:** Never put secrets (`DB_PASSWORD`, `JWT_SECRET`, AWS keys) in `NEXT_PUBLIC_` variables.

---

## 10. Full Production Example (Dashboard App)

A simplified NPD-style dashboard structure in Next.js + TypeScript:

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    ← redirect to /dashboard
│   ├── login/
│   │   └── page.tsx                ← client login form
│   ├── dashboard/
│   │   ├── layout.tsx              ← sidebar layout
│   │   ├── page.tsx                ← kanban board (server fetch)
│   │   └── loading.tsx
│   ├── products/
│   │   └── [id]/
│   │       └── page.tsx            ← product detail
│   └── api/
│       ├── auth/
│       │   └── login/route.ts
│       └── products/
│           ├── route.ts
│           └── [id]/
│               ├── route.ts
│               └── notes/route.ts
├── components/
│   ├── Sidebar.tsx                 ← client
│   ├── KanbanBoard.tsx             ← client
│   ├── ProductDrawer.tsx           ← client
│   └── NoteItem.tsx
├── lib/
│   ├── db.ts                       ← MySQL pool
│   ├── auth.ts                     ← JWT helpers
│   └── s3.ts                       ← S3 upload
├── types/
│   ├── product.ts
│   └── user.ts
└── middleware.ts
```

### Types — `src/types/product.ts`

```typescript
export interface Product {
  id: number;
  name: string;
  brand: string;
  currentStage: string;
  assignedTo: number | null;
  assignedToName: string | null;
  createdAt: string;
}

export interface InternalNote {
  id: number;
  productId: number;
  note: string;
  stage: string;
  stageLabel: string | null;
  authorName: string;
  attachment: string | null;
  createdAt: string;
}

export type ProductStage =
  | "vendor_selection"
  | "qc_check"
  | "bromide_approval"
  | "container_review";
```

### Dashboard page (Server Component)

```tsx
// src/app/dashboard/page.tsx
import { getProductsByStage } from "@/lib/db";
import KanbanBoard from "@/components/KanbanBoard";

export default async function DashboardPage() {
  const stages = await getProductsByStage();

  return (
    <div>
      <h1>Product Dashboard</h1>
      <KanbanBoard initialData={stages} />
    </div>
  );
}
```

### Kanban board (Client Component)

```tsx
"use client";

import { useState } from "react";
import type { Product } from "@/types/product";
import ProductDrawer from "./ProductDrawer";

interface KanbanBoardProps {
  initialData: Record<string, Product[]>;
}

export default function KanbanBoard({ initialData }: KanbanBoardProps) {
  const [stages, setStages] = useState(initialData);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleCardClick = (product: Product) => {
    setSelectedProduct(product);
  };

  return (
    <div className="kanban">
      {Object.entries(stages).map(([stage, cards]) => (
        <div key={stage} className="kanban-column">
          <h3>{stage}</h3>
          {cards.map((card) => (
            <div
              key={card.id}
              className="kanban-card"
              onClick={() => handleCardClick(card)}
            >
              {card.name}
            </div>
          ))}
        </div>
      ))}

      {selectedProduct && (
        <ProductDrawer
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
```

---

## 11. Deploy Next.js (Vercel + EC2/Nginx)

### Option A — Vercel (easiest, recommended for Next.js)

```bash
npm install -g vercel
vercel login
vercel
```

1. Connect GitHub/GitLab repo
2. Add environment variables in Vercel dashboard
3. Every `git push` auto-deploys

**Best for:** SSR, API routes, edge functions, zero server management.

---

### Option B — AWS EC2 + PM2 (self-hosted, like your existing setup)

#### Step 1 — Build on server

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

cd /var/www
git clone git@gitlab.com:your-group/my-dashboard.git
cd my-dashboard
npm install
npm run build
```

#### Step 2 — Run with PM2

```bash
npm install -g pm2
pm2 start npm --name "npd-nextjs" -- start
pm2 save
pm2 startup
```

Next.js production server runs on port **3000** by default.

#### Step 3 — Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/npd-dashboard.ugbrands.in
```

```nginx
server {
    listen 80;
    server_name npd-dashboard.ugbrands.in;

    location / {
        proxy_pass http://localhost:3000;
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

```bash
sudo ln -s /etc/nginx/sites-available/npd-dashboard.ugbrands.in /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d npd-dashboard.ugbrands.in
```

#### Step 4 — Re-deploy after code changes

```bash
cd /var/www/my-dashboard
git pull
npm install
npm run build
pm2 restart npd-nextjs
```

### Deployment architecture (EC2)

```
                    ┌─────────────────────────────────────────┐
                    │              AWS EC2 Server             │
                    │                                         │
  HTTPS             │   Nginx (port 80/443)                   │
npd-dashboard  ───► │        │                                │
                    │        ▼                                │
                    │   Next.js (PM2, port 3000)              │
                    │        │                                │
                    │        ├── Server Components → MySQL    │
                    │        └── API Routes → S3 / DB         │
                    └─────────────────────────────────────────┘
```

---

---

## 12. Common Fixes & Best Practices

### Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `You're importing a component that needs useState` | Missing `"use client"` | Add `"use client"` at top of file |
| `Hydration failed` | Server HTML ≠ client HTML | Don't use `window`/`Date.now()` in Server Components |
| `Module not found: Can't resolve '@/...'` | Path alias issue | Check `tsconfig.json` paths: `"@/*": ["./src/*"]` |
| Build fails on EC2 (out of memory) | Large app, low RAM | `export NODE_OPTIONS=--max_old_space_size=2048` before build |
| `cookies()` / `headers()` must be async | Next.js 15 change | `await cookies()` in Server Components |

### Best practices

* Default to **Server Components** — add `"use client"` only when needed
* Fetch data in Server Components or Route Handlers, not `useEffect` when possible
* Use `next/image` for optimized images
* Use `next/link` for internal navigation
* Keep secrets in server-only env vars (no `NEXT_PUBLIC_` prefix)
* Use `loading.tsx` and `error.tsx` for better UX
* Use Middleware for auth guards
* Run `npm run build` locally before pushing to catch type errors

---

## 13. Quick Reference Cheat Sheet

### App Router file map

```
app/page.tsx              → /
app/about/page.tsx        → /about
app/blog/[slug]/page.tsx  → /blog/hello
app/api/users/route.ts    → GET/POST /api/users
app/layout.tsx            → shared layout
app/loading.tsx           → loading UI
app/error.tsx             → error boundary
middleware.ts             → auth, redirects
```

### Commands

```bash
npx create-next-app@latest
npm run dev            # http://localhost:3000
npm run build
npm run start
npm run lint
```

---

## Related Files in This Repo

| Topic | File |
|-------|------|
| TypeScript (prerequisite) | `TypeScript.md` |
| Learning roadmap | `README.md` |
| AWS deploy | `AWS_EC2.md` |
| Nginx | `NginxRoadmap.md` |
| React state | `Redux_Persist_Thunk.md` |

---

*Last updated: July 2026*
