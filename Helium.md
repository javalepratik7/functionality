# Helium 10 — Complete Reference Guide

## Table of Contents

1. [What is Helium 10?](#1-what-is-helium-10)
2. [How the Chrome Extension Works](#2-how-the-chrome-extension-works)
3. [Key Tools Inside Helium 10](#3-key-tools-inside-helium-10)
4. [Data Helium 10 Exposes on Amazon Pages](#4-data-helium-10-exposes-on-amazon-pages)
5. [How We Use Helium 10 in This Project](#5-how-we-use-helium-10-in-this-project)
6. [Session Authentication Flow](#6-session-authentication-flow)
7. [Extension DOM Structure](#7-extension-dom-structure)
8. [Data Extraction Strategy](#8-data-extraction-strategy)
9. [Keeping the Extension Working](#9-keeping-the-extension-working)
10. [Troubleshooting Reference](#10-troubleshooting-reference)
11. [Environment Variables Reference](#11-environment-variables-reference)

---

## 1. What is Helium 10?

Helium 10 is a suite of Amazon seller tools. It has two interfaces:

| Interface | URL | Purpose |
|---|---|---|
| Web app | `members.helium10.com` | Account management, bulk tools, keyword research |
| Chrome extension | Loaded on `amazon.com` pages | Injects live product analytics directly into Amazon |

The Chrome extension is what this project uses. It piggybacks onto Amazon product pages and injects a floating sidebar panel called **X-Ray** that shows real-time sales estimates.

---

## 2. How the Chrome Extension Works

When you visit `https://www.amazon.com/dp/{ASIN}`, the extension:

```
1. Detects the page is an Amazon product listing
       ↓
2. Sends the ASIN + your session token to Helium 10's backend API
       ↓
3. Receives product analytics data (sales estimates, revenue, etc.)
       ↓
4. Injects a React-based panel into the page DOM
       ↓
5. Renders metrics like "Unit Sales", "30-Day Revenue", "Rating"
```

The extension runs as a **content script** — JavaScript that Chrome injects into the page's DOM after the main page loads. It:
- Reads the ASIN from the URL or page meta tags
- Makes authenticated API calls (using a cookie set when you log into `helium10.com`)
- Waits for the API response (~2–8 seconds)
- Renders a React component tree into a shadow DOM or a div it injects into `document.body`

---

## 3. Key Tools Inside Helium 10

| Tool | What It Shows | Where |
|---|---|---|
| **X-Ray** | Unit Sales, Revenue, BSR, Review count, FBA fees | Amazon product page sidebar |
| **Cerebro** | Reverse ASIN keyword lookup | Web app |
| **Magnet** | Keyword search volume | Web app |
| **Black Box** | Product research / niche finder | Web app |
| **Profits** | P&L dashboard for your own listings | Web app |
| **Keyword Tracker** | Rank tracking over time | Web app |

This project only uses **X-Ray** (the extension panel on Amazon product pages).

---

## 4. Data Helium 10 Exposes on Amazon Pages

The X-Ray panel shows these fields. This is what we extract:

| Field | Example Value | What It Means |
|---|---|---|
| **Unit Sales** | `1,704` | Estimated units sold in last 30 days |
| **30-Day Revenue** | `$1,207,278.18` | Estimated gross revenue in last 30 days |
| **Rating** | `4.5` | Current Amazon star rating |
| **Review Count** | `12,843` | Total customer reviews |
| **BSR** | `#312 in Kitchen` | Best Seller Rank |
| **Price** | `$29.99` | Current Buy Box price |
| **FBA Fees** | `$6.22` | Estimated FBA fulfillment fee |

We extract the first three (Unit Sales, Revenue, Rating) in the current implementation.

---

## 5. How We Use Helium 10 in This Project

### Architecture

```
API Request (GET /api/v1/helium10/product?asin=B0F5KTGDS9)
    ↓
helium10Routes.js       ← validates ASIN, calls scraper
    ↓
helium10Scraper.js      ← manages browser, session, extraction
    ↓
Puppeteer (Chromium)    ← real browser with H10 extension loaded
    ↓
amazon.com/dp/{ASIN}    ← page loads, extension injects panel
    ↓
page.evaluate()         ← extracts text from injected DOM nodes
    ↓
JSON response           ← { unitSales, revenue30d, rating }
```

### Why a real browser is necessary

Helium 10's API calls include authentication headers derived from your session cookie. The extension handles this automatically — your session cookie is stored in the Chromium profile directory (`userDataDir`). There is no public API to call directly.

### Singleton browser

One Chromium instance is shared across all requests. New tabs are opened and closed per ASIN, but the browser process stays running. This is critical for performance — Chromium takes 3–8 seconds to cold-start.

---

## 6. Session Authentication Flow

### First-time setup (manual or automatic)

```
launchBrowser()
    ↓
ensureH10Session()
    ↓
Opens tab → navigates to members.helium10.com
    ↓
    ├── Redirected to /login ?
    │       ↓ YES
    │   performLogin() fills email + password → submits form
    │       ↓
    │   Cookies written to HELIUM10_USER_DATA_DIR
    │
    └── Stays on members page?
            ↓ YES
        Session active → _sessionVerified = true → skip login
```

### Subsequent requests (same process)

```
getHelium10ProductData(asin)
    ↓
_sessionVerified === true → skip session check entirely
    ↓
openProductPage() → extractProductData()
```

### Session persistence

The `userDataDir` folder stores:
- **Cookies** — The `helium10.com` authentication cookie
- **LocalStorage** — H10 app preferences and cached data
- **IndexedDB** — Extension state

As long as the Helium 10 session cookie hasn't expired (typically 30 days), the server will start and be authenticated without any visible browser window or user interaction.

---

## 7. Extension DOM Structure

When the X-Ray panel renders on an Amazon page, it injects elements like:

```html
<!-- Root container → identified by id^="h10" or data-h10 attributes -->
<div id="h10-xray-root" data-h10="true">

  <!-- Metric card (typical structure) -->
  <div class="[hashed-classname]">
    <span>Unit Sales</span>       ← label text node
    <span>1,704</span>            ← value text node (next sibling)
  </div>

  <div class="[hashed-classname]">
    <span>30-Day Revenue</span>
    <span>$1,207,278.18</span>
  </div>

  <div class="[hashed-classname]">
    <span>Rating</span>
    <span>4.5</span>
  </div>

</div>
```

**Why class names are useless as selectors:**
Helium 10 uses CSS Modules or a hashed build system. Classes like `sc-abc123` change with every extension update. The stable identifiers are:

- `id` attributes starting with `h10`
- `data-h10` / `data-helium` custom attributes
- Text content of label nodes ("Unit Sales", "Rating")

---

## 8. Data Extraction Strategy

### Step 1 — Detect the panel

Poll these selectors every 800ms until one matches or timeout (20s):

```js
'[id^="h10"]'           // id="h10-root", id="h10-xray-panel"
'[id*="helium"]'
'[data-h10]'
'[data-helium]'
'[data-testid*="h10"]'
'[aria-label*="Helium"]'
'[class^="h10-"]'       // last resort
```

### Step 2 — Walk text nodes

Inside `page.evaluate()`, use `TreeWalker` (not `querySelectorAll`) to scan every text node:

```js
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
while ((node = walker.nextNode())) {
  const text = node.textContent.trim().toLowerCase();
  if (text.includes('unit sales')) {
    value = node.parentElement.nextElementSibling?.innerText;
  }
}
```

### Step 3 — Sibling traversal for the value

The value element is always near the label but the exact relationship varies by H10 version:

```
Pattern A:  <span>Label</span><span>Value</span>      → nextElementSibling
Pattern B:  <div><span>Label</span></div><div>Value</div> → parentElement.nextElementSibling
Pattern C:  deeper nesting                             → parentElement.parentElement.nextElementSibling
```

We try all three levels before giving up.

### Step 4 — Normalise to numbers

```
"1,704"          → remove commas  → 1704
"$1,207,278.18"  → remove $,commas → 1207278.18
"4.5"            → parseFloat    → 4.5
"N/A"            → null
```

---

## 9. Keeping the Extension Working

### Extension updates

When Helium 10 releases an extension update, Chrome auto-updates it in the live profile. The copied folder at `~/helium10-ext` does **not** auto-update.

After an H10 extension update, re-copy:

```bash
# Find the new version folder
ls ~/.config/google-chrome/Profile\ 3/Extensions/njmehopjdpcckochcggncklnlmikcbnb/

# Re-copy (replace existing)
rm -rf ~/helium10-ext
cp -r ~/.config/google-chrome/Profile\ 3/Extensions/njmehopjdpcckochcggncklnlmikcbnb/NEW_VERSION_0 ~/helium10-ext
```

### Session expiry

Helium 10 sessions expire approximately every 30 days. When this happens:
- `ensureH10Session()` detects the redirect to `/login`
- `performLogin()` auto-logs in using `HELIUM10_EMAIL` / `HELIUM10_PASSWORD`
- New cookies are persisted to `HELIUM10_USER_DATA_DIR`

No manual intervention is needed if credentials are in `.env`.

### DOM selector changes

If H10 redesigns their extension panel:
1. Open a real Chrome window with the extension
2. Navigate to any Amazon product page
3. Inspect the injected panel with DevTools (right-click the panel → Inspect)
4. Find the stable `id` or `data-*` attribute on the root container
5. Add it to `H10_PANEL_SELECTORS` in `helium10Scraper.js`
6. Check if label texts changed → update `LABEL_MAP`

---

## 10. Troubleshooting Reference

| Error | Cause | Fix |
|---|---|---|
| `Failed to load extension from: .` | `HELIUM10_EXTENSION_PATH` is empty or wrong | Set correct path in `.env` (must contain `manifest.json`) |
| `Manifest file is missing or unreadable` | Pointing at parent folder instead of version folder | Path must end at the version folder, e.g. `…/8.36.2_0` |
| `Panel did not appear within 20s` | H10 not logged in, or extension not loaded | Check session; ensure `HELIUM10_USER_DATA_DIR` is correct |
| `Login failed – still on login page` | Wrong credentials or CAPTCHA challenge | Verify `HELIUM10_EMAIL` / `HELIUM10_PASSWORD`; log in manually once |
| All values return `null` | Panel appeared but label text changed | Inspect DOM; update `LABEL_MAP` in scraper |
| `Connection closed` error | Browser crashed mid-request | auto-relaunches on next request; check system RAM |
| Slow response (60s+) | `networkidle2` waiting on slow Amazon page | Acceptable; Amazon pages load many requests. Can switch to `domcontentloaded` |

---

## 11. Environment Variables Reference

```env
# Required
HELIUM10_EXTENSION_PATH=/home/pratik/helium10-ext
HELIUM10_USER_DATA_DIR=/home/pratik/.config/helium10-session

# Required for auto-login (if session expired)
HELIUM10_EMAIL=your@email.com
HELIUM10_PASSWORD=yourpassword

# Optional tuning
HELIUM10_CACHE_TTL_MS=900000        # 15 min — how long to cache results per ASIN
HELIUM10_BATCH_CONCURRENCY=2        # max parallel tabs for batch requests
```
