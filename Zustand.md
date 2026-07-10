# 🐻 Zustand — Complete State Management Guide (React)

> Step-by-step guide to learn and implement **Zustand** in React apps. A lightweight alternative to Redux — less boilerplate, same power for most dashboards and forms.

**You already know:** Redux + Thunk + Persist (`Redux_Persist_Thunk.md`). Zustand solves the same problems with far less code.

---

## Table of Contents

1. [What is Zustand & Why Use It?](#1-what-is-zustand--why-use-it)
2. [Zustand vs Redux — Comparison](#2-zustand-vs-redux--comparison)
3. [Project Setup](#3-project-setup)
4. [Create Your First Store](#4-create-your-first-store)
5. [Reading & Updating State](#5-reading--updating-state)
6. [Async Actions (API Calls)](#6-async-actions-api-calls)
7. [Multiple Stores & Slices](#7-multiple-stores--slices)
8. [Persist State (like Redux Persist)](#8-persist-state-like-redux-persist)
9. [TypeScript with Zustand](#9-typescript-with-zustand)
10. [DevTools & Debugging](#10-devtools--debugging)
11. [Real Example — NPD Dashboard Pattern](#11-real-example--npd-dashboard-pattern)
12. [When to Use Zustand vs Redux vs Context](#12-when-to-use-zustand-vs-redux-vs-context)
13. [Common Fixes & Best Practices](#13-common-fixes--best-practices)
14. [Quick Reference Cheat Sheet](#14-quick-reference-cheat-sheet)

---

## 1. What is Zustand & Why Use It?

### The problem

React `useState` works for one component. When many components need the same data (user, cart, dashboard filters), you end up with **prop drilling** or heavy global state libraries.

### What Zustand does

Zustand is a **small global state manager** for React. One store, any component can read/write without providers wrapping your whole app.

```
Component A ──┐
Component B ──┼──► useStore() ──► shared state
Component C ──┘
```

### Key benefits

| Feature | Description |
|---------|-------------|
| **Minimal boilerplate** | No actions, reducers, or dispatch |
| **No Provider required** | Unlike Redux Context — just import and use |
| **Tiny bundle** | ~1 KB gzipped |
| **Works outside React** | Call `getState()` / `setState()` in utils |
| **TypeScript friendly** | Excellent type inference |
| **Middleware support** | Persist, devtools, immer |

---

## 2. Zustand vs Redux — Comparison

| | Redux + Thunk + Persist | Zustand |
|--|-------------------------|---------|
| Setup files | store, reducer, actions, types | 1 store file |
| Provider | `<Provider store={store}>` required | Not required |
| Async logic | Thunk middleware | Async functions in store |
| Persistence | redux-persist config | `persist` middleware |
| Learning curve | High | Low |
| DevTools | Excellent | Good (with middleware) |
| Best for | Very large apps, strict patterns | Most dashboards & SPAs |

### Same feature, less code

**Redux Thunk:**
```javascript
// action
export const fetchProducts = () => async (dispatch) => {
  dispatch({ type: 'PRODUCTS_REQUEST' });
  const data = await api.getProducts();
  dispatch({ type: 'PRODUCTS_SUCCESS', payload: data });
};

// reducer
case 'PRODUCTS_SUCCESS':
  return { ...state, products: action.payload, loading: false };

// component
const products = useSelector(state => state.products);
dispatch(fetchProducts());
```

**Zustand:**
```javascript
// store
fetchProducts: async () => {
  set({ loading: true });
  const data = await api.getProducts();
  set({ products: data, loading: false });
}

// component
const { products, fetchProducts } = useProductStore();
fetchProducts();
```

---

## 3. Project Setup

### Install

```bash
npm install zustand
```

### Optional middleware

```bash
# Persist to localStorage (like redux-persist)
# Built into zustand/middleware — no extra install

# Immer for immutable updates (optional)
npm install immer
```

### Folder structure

```
src/
├── stores/
│   ├── useAuthStore.js
│   ├── useProductStore.js
│   └── useUiStore.js
├── components/
│   └── Dashboard/
└── App.jsx
```

---

## 4. Create Your First Store

```javascript
// src/stores/useCounterStore.js
import { create } from "zustand";

const useCounterStore = create((set, get) => ({
  count: 0,

  increment: () => set((state) => ({ count: state.count + 1 })),

  decrement: () => set((state) => ({ count: state.count - 1 })),

  reset: () => set({ count: 0 }),

  // get() reads current state inside actions
  incrementBy: (amount) => set({ count: get().count + amount }),
}));

export default useCounterStore;
```

### Use in component

```jsx
import useCounterStore from "../stores/useCounterStore";

function Counter() {
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

---

## 5. Reading & Updating State

### Subscribe to specific slice (performance)

```jsx
// ✅ Only re-renders when `count` changes
const count = useCounterStore((state) => state.count);

// ❌ Re-renders on ANY store change
const store = useCounterStore();
```

### Update patterns

```javascript
// Replace a field
set({ loading: true });

// Merge with previous state
set((state) => ({ count: state.count + 1 }));

// Update nested object
set((state) => ({
  user: { ...state.user, name: "Pratik" },
}));
```

### Access store outside React

```javascript
// In API interceptor, router guard, utility file
import useAuthStore from "./stores/useAuthStore";

const token = useAuthStore.getState().token;
useAuthStore.getState().logout();

// Subscribe to changes outside React
const unsub = useAuthStore.subscribe(
  (state) => console.log("Token changed:", state.token)
);
```

---

## 6. Async Actions (API Calls)

Replaces Redux Thunk — async logic lives directly in the store.

```javascript
// src/stores/useProductStore.js
import { create } from "zustand";
import { productService } from "../services/productService";

const useProductStore = create((set, get) => ({
  products: [],
  loading: false,
  error: null,
  selectedProduct: null,

  fetchProducts: async (searchQuery = "") => {
    set({ loading: true, error: null });
    try {
      const data = await productService.getAll(searchQuery);
      set({ products: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchProductById: async (id) => {
    set({ loading: true, error: null });
    try {
      const product = await productService.getById(id);
      set({ selectedProduct: product, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  updateProductStage: async (id, stage) => {
    try {
      await productService.updateStage(id, stage);
      // Refresh list after update
      await get().fetchProducts();
    } catch (err) {
      set({ error: err.message });
    }
  },

  clearSelected: () => set({ selectedProduct: null }),
}));

export default useProductStore;
```

### Component usage

```jsx
function ProductList() {
  const { products, loading, error, fetchProducts } = useProductStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

---

## 7. Multiple Stores & Slices

Split by domain — same idea as Redux slices.

```javascript
// src/stores/useAuthStore.js
import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}));

export default useAuthStore;
```

```javascript
// src/stores/useUiStore.js
import { create } from "zustand";

const useUiStore = create((set) => ({
  sidebarOpen: true,
  activeDrawer: null,       // 'product' | 'qc' | null
  searchQuery: "",

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openDrawer: (name) => set({ activeDrawer: name }),
  closeDrawer: () => set({ activeDrawer: null }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));

export default useUiStore;
```

### Cross-store access

```javascript
// Inside an action in useProductStore
import useAuthStore from "./useAuthStore";

deleteProduct: async (id) => {
  const { user } = useAuthStore.getState();
  if (user.role !== "admin") return;
  await productService.delete(id);
  await get().fetchProducts();
},
```

---

## 8. Persist State (like Redux Persist)

Save store to `localStorage` — survives page refresh.

```javascript
// src/stores/useAuthStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: "auth-storage",           // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({        // only persist these fields
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
```

### Persist only specific fields

```javascript
partialize: (state) => ({
  token: state.token,
  // don't persist loading, error, etc.
}),
```

### Clear persisted storage on logout

```javascript
logout: () => {
  set({ user: null, token: null, isAuthenticated: false });
  localStorage.removeItem("auth-storage");
},
```

---

## 9. TypeScript with Zustand

```typescript
// src/stores/useProductStore.ts
import { create } from "zustand";

interface Product {
  id: number;
  name: string;
  currentStage: string;
  brand: string;
}

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  selectedProduct: Product | null;
  fetchProducts: (search?: string) => Promise<void>;
  selectProduct: (product: Product) => void;
  clearSelected: () => void;
}

const useProductStore = create<ProductState>((set) => ({
  products: [],
  loading: false,
  error: null,
  selectedProduct: null,

  fetchProducts: async (search = "") => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/products?q=${search}`);
      const data: Product[] = await res.json();
      set({ products: data, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  selectProduct: (product) => set({ selectedProduct: product }),
  clearSelected: () => set({ selectedProduct: null }),
}));

export default useProductStore;
```

### Typed selector hook (optional pattern)

```typescript
import { useShallow } from "zustand/react/shallow";

// Avoid unnecessary re-renders with multiple fields
const { products, loading } = useProductStore(
  useShallow((state) => ({ products: state.products, loading: state.loading }))
);
```

---

## 10. DevTools & Debugging

### Redux DevTools integration

```javascript
import { create } from "zustand";
import { devtools } from "zustand/middleware";

const useProductStore = create(
  devtools(
    (set) => ({
      products: [],
      fetchProducts: async () => {
        set({ loading: true }, false, "fetchProducts/start");
        const data = await api.getProducts();
        set({ products: data, loading: false }, false, "fetchProducts/success");
      },
    }),
    { name: "ProductStore" }  // name in Redux DevTools
  )
);
```

### Immer middleware (easier nested updates)

```bash
npm install immer
```

```javascript
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

const useKanbanStore = create(
  immer((set) => ({
    columns: { creative: [], npd: [], qc: [] },

    moveCard: (cardId, fromStage, toStage) =>
      set((state) => {
        const card = state.columns[fromStage].find((c) => c.id === cardId);
        state.columns[fromStage] = state.columns[fromStage].filter((c) => c.id !== cardId);
        state.columns[toStage].push(card);
      }),
  }))
);
```

---

## 11. Real Example — NPD Dashboard Pattern

Typical stores for a Kanban dashboard like your NPD project:

```javascript
// src/stores/useDashboardStore.js
import { create } from "zustand";
import { productService } from "../services/productService";

const useDashboardStore = create((set, get) => ({
  // Kanban data
  stages: {},
  loading: false,
  error: null,
  refreshKey: 0,

  // Drawer state
  activeCard: null,
  activeDrawer: null,    // 'product' | 'parallel' | 'qc'
  qcSubStage: "npd",

  // Fetch all stages for Kanban
  fetchKanban: async (searchQuery = "") => {
    set({ loading: true, error: null });
    try {
      const data = await productService.getKanbanData(searchQuery);
      set({ stages: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Open product drawer
  openProductDrawer: (card) =>
    set({ activeCard: card, activeDrawer: "product" }),

  openQcDrawer: (card, subStage = "npd") =>
    set({ activeCard: card, activeDrawer: "qc", qcSubStage: subStage }),

  closeDrawer: () =>
    set({ activeCard: null, activeDrawer: null }),

  // After stage advance — refresh board
  onStageAdvanced: () => {
    set((s) => ({ refreshKey: s.refreshKey + 1 }));
    get().fetchKanban();
  },
}));

export default useDashboardStore;
```

```jsx
// KanbanBoard.jsx — simplified
function KanbanBoard() {
  const {
    stages,
    loading,
    fetchKanban,
    openQcDrawer,
    activeCard,
    activeDrawer,
    qcSubStage,
    closeDrawer,
    onStageAdvanced,
  } = useDashboardStore();

  const searchQuery = useUiStore((s) => s.searchQuery);

  useEffect(() => {
    fetchKanban(searchQuery);
  }, [searchQuery, fetchKanban]);

  return (
    <div className="kanban">
      {/* render columns from stages */}
      {activeDrawer === "qc" && activeCard && (
        <QcDrawer
          card={activeCard}
          subStage={qcSubStage}
          onClose={closeDrawer}
          onStageAdvanced={onStageAdvanced}
        />
      )}
    </div>
  );
}
```

---

## 12. When to Use Zustand vs Redux vs Context

| Scenario | Use |
|----------|-----|
| Auth user + token | Zustand + persist |
| Dashboard global filters, drawer state | Zustand |
| Kanban board data + refresh | Zustand |
| Simple theme toggle | Context or Zustand |
| Huge app with time-travel debugging needs | Redux |
| Form state inside one page | `useState` / React Hook Form |
| Server-fetched data (Next.js) | TanStack Query + Zustand for UI only |

### Recommended combo for modern React

```
TanStack Query  →  server data (fetch, cache, refetch)
Zustand         →  client UI state (drawers, filters, auth)
useState        →  local component state
```

---

## 13. Common Fixes & Best Practices

### Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| Infinite re-render loop | Unstable selector / missing deps | Select specific slices; wrap actions in `useCallback` if passing as props |
| State not updating | Mutating state directly | Always use `set()` — never mutate `get()` result |
| Persist shows stale data | Old localStorage key | `localStorage.removeItem("auth-storage")` |
| `fetchProducts` in useEffect loop | Function recreated each render | Zustand actions are stable — don't add to deps unnecessarily |
| Hydration mismatch (Next.js) | Persist reads localStorage on server | Use persist only in client components |

### Best practices

* One store per domain (`auth`, `products`, `ui`)
* Select only what you need: `useStore(s => s.count)`
* Keep async API calls inside store actions
* Use `persist` only for data that should survive refresh (auth, preferences)
* Don't put server cache in Zustand — use TanStack Query for that
* Use TypeScript interfaces for store shape
* Use `get()` for reading state inside actions
* Use `partialize` in persist to avoid saving loading/error states

---

## 14. Quick Reference Cheat Sheet

```javascript
import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

// Basic store
const useStore = create((set, get) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  fetch: async () => {
    set({ loading: true });
    const data = await api.get();
    set({ data, loading: false });
  },
}));

// In component
const count = useStore((s) => s.count);
const increment = useStore((s) => s.increment);

// Outside React
useStore.getState().count;
useStore.getState().increment();

// With persist
const useAuthStore = create(
  persist((set) => ({ token: null, login: (t) => set({ token: t }) }),
  { name: "auth" }
);
```

### Commands

```bash
npm install zustand
npm install immer          # optional — nested updates
```

---

## Related Files in This Repo

| Topic | File |
|-------|------|
| Redux (comparison) | `Redux_Persist_Thunk.md` |
| TypeScript | `TypeScript.md` |
| React / Next.js | `NextJS.md` |
| Learning roadmap | `README.md` |

---

*Last updated: July 2026*
