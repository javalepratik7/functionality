# 📘 TypeScript — Complete Study Guide (Production Ready)

> A step-by-step guide to learn **TypeScript** from JavaScript. Written for developers who already know React, Node.js, and Express.

---

## Table of Contents

1. [What is TypeScript & Why Use It?](#1-what-is-typescript--why-use-it)
2. [Project Setup & tsconfig.json](#2-project-setup--tsconfigjson)
3. [Basic Types](#3-basic-types)
4. [Interfaces, Types & Objects](#4-interfaces-types--objects)
5. [Functions & Arrow Functions](#5-functions--arrow-functions)
6. [Arrays, Tuples & Enums](#6-arrays-tuples--enums)
7. [Union, Literal & Optional Types](#7-union-literal--optional-types)
8. [Type Narrowing & Guards](#8-type-narrowing--guards)
9. [Generics](#9-generics)
10. [Utility Types (Pick, Omit, Partial…)](#10-utility-types-pick-omit-partial)
11. [TypeScript with Express (Backend)](#11-typescript-with-express-backend)
12. [TypeScript with React](#12-typescript-with-react)
13. [Common Fixes & Best Practices](#13-common-fixes--best-practices)
14. [Quick Reference Cheat Sheet](#14-quick-reference-cheat-sheet)

---

## 1. What is TypeScript & Why Use It?

### The Problem with JavaScript Alone

JavaScript is **dynamically typed** — variable types are checked only at **runtime**:

```javascript
function getTotal(price, qty) {
  return price * qty;
}

getTotal("10", 5);   // "1010101010" — string repeat, not math!
getTotal(null, 5);   // 0 — silent bug
```

You only discover these bugs when the app runs (or in production).

### What TypeScript Does

TypeScript is **JavaScript + static types**. It compiles to plain JavaScript.

```
You write .ts / .tsx  →  tsc compiles  →  .js runs in Node/browser
```

### Key Benefits

| Feature | Description |
|---------|-------------|
| **Catch errors early** | IDE + compiler find bugs before runtime |
| **Better autocomplete** | IntelliSense knows object shapes |
| **Safer refactoring** | Rename/change types across entire codebase |
| **Self-documenting code** | Types explain what functions expect |
| **Industry standard** | Most modern React/Node projects use TS |

### TypeScript vs JavaScript — Quick Comparison

| JavaScript | TypeScript |
|------------|------------|
| `let name = "Pratik"` | `let name: string = "Pratik"` |
| `function add(a, b) { return a + b }` | `function add(a: number, b: number): number { return a + b }` |
| No compile step | `tsc` or bundler compiles TS → JS |
| `.js` files | `.ts` (logic) / `.tsx` (React) files |

---

## 2. Project Setup & tsconfig.json

### Step 1 — Initialize a TypeScript project

```bash
mkdir my-ts-app
cd my-ts-app
npm init -y
npm install typescript @types/node --save-dev
npx tsc --init
```

This creates `tsconfig.json`.

### Step 2 — Recommended `tsconfig.json` (strict, production-ready)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 3 — Folder structure

```
my-ts-app/
├── src/
│   └── index.ts
├── dist/          ← compiled JS (gitignore this)
├── tsconfig.json
└── package.json
```

### Step 4 — Add scripts to `package.json`

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc --watch"
  }
}
```

### Step 5 — Run

```bash
npm run build
npm start
```

### Important `tsconfig` flags explained

| Flag | Meaning |
|------|---------|
| `strict: true` | Enables all strict type checks (always use this) |
| `target` | JS version output (ES2022 for modern Node) |
| `module` | Module system (`commonjs` for Node, `esnext` for bundlers) |
| `outDir` | Where compiled `.js` files go |
| `rootDir` | Source folder |
| `skipLibCheck` | Faster builds, skip checking `node_modules` types |

---

## 3. Basic Types

```typescript
// Primitives
let name: string = "Pratik";
let age: number = 28;
let isActive: boolean = true;
let nothing: null = null;
let notDefined: undefined = undefined;

// any — avoid in production (disables type checking)
let anything: any = "hello";
anything = 42; // no error — dangerous

// unknown — safer than any (must narrow before use)
let userInput: unknown = "hello";
if (typeof userInput === "string") {
  console.log(userInput.toUpperCase());
}

// void — function returns nothing
function logMessage(msg: string): void {
  console.log(msg);
}

// never — function never returns (throws or infinite loop)
function throwError(msg: string): never {
  throw new Error(msg);
}
```

### Type inference (TypeScript guesses the type)

```typescript
let city = "Mumbai";     // inferred as string
let count = 10;            // inferred as number
// city = 123;            // ❌ Error: Type 'number' is not assignable to type 'string'
```

> **Best practice:** Let TypeScript infer when obvious. Add explicit types for function parameters and return values.

---

## 4. Interfaces, Types & Objects

### Interface — describe object shape

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "member" | "superAdmin";
  createdAt?: Date;   // optional field
}

const user: User = {
  id: 1,
  name: "Pratik",
  email: "pratik@example.com",
  role: "admin",
};
```

### Type alias — same idea, more flexible

```typescript
type ProductStatus = "draft" | "active" | "archived";

type Product = {
  id: number;
  name: string;
  status: ProductStatus;
};
```

### Interface vs Type — when to use which

| Use **Interface** when | Use **Type** when |
|------------------------|-------------------|
| Defining object shapes | Union types (`A \| B`) |
| You may extend later (`extends`) | Tuples, mapped types |
| React component props | Complex utility types |

```typescript
// Extending interface
interface AdminUser extends User {
  permissions: string[];
}

// Union type (only possible with `type`)
type ApiResponse = { success: true; data: Product[] } | { success: false; error: string };
```

### Readonly & Index signatures

```typescript
interface Config {
  readonly apiUrl: string;       // cannot be reassigned
  [key: string]: string | number; // dynamic keys
}
```

---

## 5. Functions & Arrow Functions

```typescript
// Named function
function calculateTotal(price: number, qty: number): number {
  return price * qty;
}

// Arrow function
const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString("en-IN")}`;
};

// Optional & default parameters
function greet(name: string, greeting: string = "Hello"): string {
  return `${greeting}, ${name}!`;
}

// Function type (callback)
type OnComplete = (id: number, success: boolean) => void;

function processOrder(id: number, callback: OnComplete): void {
  callback(id, true);
}
```

### Async functions

```typescript
async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error("User not found");
  const data: User = await res.json();
  return data;
}
```

> `Promise<User>` means this async function eventually returns a `User`.

---

## 6. Arrays, Tuples & Enums

### Arrays

```typescript
const tags: string[] = ["react", "node", "mysql"];
const ids: Array<number> = [1, 2, 3];   // same as number[]

// Readonly array
const roles: readonly string[] = ["admin", "member"];
```

### Tuples — fixed-length, typed array

```typescript
type Coordinate = [number, number];   // [lat, lng]
const point: Coordinate = [19.076, 72.877];

// React useState returns a tuple
type StateHook<T> = [T, (value: T) => void];
```

### Enums

```typescript
enum OrderStatus {
  Pending = "pending",
  Shipped = "shipped",
  Delivered = "delivered",
}

const status: OrderStatus = OrderStatus.Pending;
```

> **Modern preference:** Use string union types instead of enums in many codebases:
> `type OrderStatus = "pending" | "shipped" | "delivered"`

---

## 7. Union, Literal & Optional Types

```typescript
// Union — value can be one of several types
let id: string | number;
id = "abc-123";
id = 42;

// Literal types — exact values only
type Theme = "light" | "dark";
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

// Optional properties
interface CreateNoteDto {
  note: string;
  attachment?: File;    // may or may not be present
  stage?: string;
}

// Optional chaining & nullish coalescing
const label = user?.name ?? "Unknown";
```

---

## 8. Type Narrowing & Guards

TypeScript needs to know the **exact type** before you use type-specific methods.

```typescript
function printId(id: string | number) {
  if (typeof id === "string") {
    console.log(id.toUpperCase());   // TS knows: id is string here
  } else {
    console.log(id.toFixed(2));      // TS knows: id is number here
  }
}
```

### `in` operator guard

```typescript
interface Dog { bark(): void }
interface Cat { meow(): void }

function speak(animal: Dog | Cat) {
  if ("bark" in animal) {
    animal.bark();
  } else {
    animal.meow();
  }
}
```

### Custom type guard

```typescript
interface ApiError {
  success: false;
  message: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

type ApiResult<T> = ApiSuccess<T> | ApiError;

function isSuccess<T>(result: ApiResult<T>): result is ApiSuccess<T> {
  return result.success === true;
}

// Usage
const result = await fetchProducts();
if (isSuccess(result)) {
  console.log(result.data);   // TS knows data exists
} else {
  console.error(result.message);
}
```

---

## 9. Generics

Generics let you write **reusable code** that works with any type while keeping type safety.

```typescript
// Generic function
function wrapInArray<T>(value: T): T[] {
  return [value];
}

wrapInArray<string>("hello");   // string[]
wrapInArray(42);                // number[] (inferred)

// Generic interface
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

type ProductList = PaginatedResponse<Product>;

// Generic with constraint
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: "Pratik" };
getProperty(user, "name");   // string
// getProperty(user, "age"); // ❌ Error: "age" is not a key of user
```

### Real-world example — API service

```typescript
async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// Usage
const products = await apiGet<Product[]>("/api/products");
const user = await apiGet<User>("/api/me");
```

---

## 10. Utility Types (Pick, Omit, Partial…)

TypeScript built-in helpers to transform types:

```typescript
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  status: ProductStatus;
  createdAt: Date;
}

// Pick — select only some fields
type ProductSummary = Pick<Product, "id" | "name" | "status">;

// Omit — exclude some fields
type CreateProductDto = Omit<Product, "id" | "createdAt">;

// Partial — all fields optional (great for PATCH updates)
type UpdateProductDto = Partial<Pick<Product, "name" | "price" | "status">>;

// Required — make all fields required
type RequiredProduct = Required<Partial<Product>>;

// Record — object with specific key/value types
type RolePermissions = Record<"admin" | "member", string[]>;

// ReturnType — get return type of a function
type FetchResult = ReturnType<typeof fetchUser>;   // Promise<User>
```

---

## 11. TypeScript with Express (Backend)

### Project setup

```bash
mkdir npd-api-ts
cd npd-api-ts
npm init -y
npm install express cors dotenv
npm install typescript ts-node-dev @types/express @types/cors @types/node --save-dev
npx tsc --init
```

### Folder structure

```
npd-api-ts/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   └── productRoutes.ts
│   ├── controllers/
│   │   └── productController.ts
│   ├── services/
│   │   └── productService.ts
│   ├── types/
│   │   └── product.types.ts
│   └── middlewares/
│       └── auth.ts
├── tsconfig.json
└── package.json
```

### Types file — `src/types/product.types.ts`

```typescript
export interface Product {
  id: number;
  name: string;
  brand: string;
  currentStage: string;
  assignedTo: number | null;
  createdAt: string;
}

export interface CreateProductDto {
  name: string;
  brand: string;
  assignedTo?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
```

### Controller — `src/controllers/productController.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import { Product, CreateProductDto } from "../types/product.types";
import * as productService from "../services/productService";

// Extend Express Request for authenticated user
export interface AuthRequest extends Request {
  user?: { id: number; role: string };
}

export const getProducts = async (
  _req: Request,
  res: Response<Product[]>,
  next: NextFunction
): Promise<void> => {
  try {
    const products = await productService.findAll();
    res.json(products);
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (
  req: Request<{}, Product, CreateProductDto>,
  res: Response<Product>,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await productService.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};
```

### Routes — `src/routes/productRoutes.ts`

```typescript
import { Router } from "express";
import * as productController from "../controllers/productController";

const router = Router();

router.get("/", productController.getProducts);
router.post("/", productController.createProduct);

export default router;
```

### Entry — `src/index.ts`

```typescript
import express from "express";
import cors from "cors";
import productRoutes from "./routes/productRoutes";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/products", productRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Dev script

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

```bash
npm run dev
```

---

## 12. TypeScript with React

### Component props

```tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({ label, onClick, variant = "primary", disabled = false }: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
```

### useState with types

```tsx
import { useState } from "react";

interface Product {
  id: number;
  name: string;
}

function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ...
}
```

### Event types

```tsx
function SearchBar() {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" onChange={handleChange} />
    </form>
  );
}
```

### Children prop

```tsx
interface CardProps {
  title: string;
  children: React.ReactNode;
}

function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
```

---

## 13. Common Fixes & Best Practices

### Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot use import statement outside a module` | Wrong `module` in tsconfig | Set `"module": "commonjs"` for Node |
| `Property 'x' does not exist on type` | Missing interface field | Add field to interface or use optional `?` |
| `Object is possibly 'null'` | Strict null checks | Use `?.` or `if (obj)` guard |
| `Type 'X' is not assignable to type 'Y'` | Wrong type passed | Check interface / union types |
| `Parameter 'x' implicitly has an 'any' type` | Missing param type | Add explicit type to function params |

### Best practices

* Always enable `"strict": true` in `tsconfig.json`
* Avoid `any` — use `unknown` and narrow types
* Define interfaces for API request/response shapes
* Use `Pick` / `Omit` for DTOs instead of duplicating types
* Share types between frontend and backend in a `types/` folder
* Add explicit return types on exported functions
* Use `as const` for literal objects that should not change

---

## 14. Quick Reference Cheat Sheet

```typescript
// Types
let s: string = "hi";
let n: number = 42;
let b: boolean = true;
let arr: string[] = ["a", "b"];
let tuple: [string, number] = ["id", 1];
let union: string | number = "x";
let literal: "admin" | "member" = "admin";

// Interface
interface User { id: number; name: string; email?: string }

// Function
const fn = (x: number): string => String(x);

// Generic
function id<T>(val: T): T { return val; }

// Utility
type PartialUser = Partial<User>;
type UserName = Pick<User, "name">;
```

### Commands

```bash
npx tsc --init          # create tsconfig.json
npm run build           # compile TS → JS
npx tsc --noEmit        # type-check only (no output)
npx tsc --watch         # watch mode
```

---

## Related Files in This Repo

| Topic | File |
|-------|------|
| Next.js (uses TypeScript) | `NextJS.md` |
| Learning roadmap | `README.md` |
| Database ORM | `Prisma.md` |
| React state | `Redux_Persist_Thunk.md` |

---

*Last updated: July 2026*
