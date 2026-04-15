# Puppeteer — Complete Reference Guide

## Table of Contents

1. [What is Puppeteer?](#1-what-is-puppeteer)
2. [How Puppeteer Works Internally](#2-how-puppeteer-works-internally)
3. [The Chrome DevTools Protocol (CDP)](#3-the-chrome-devtools-protocol-cdp)
4. [Core Concepts](#4-core-concepts)
5. [Browser vs BrowserContext vs Page](#5-browser-vs-browsercontext-vs-page)
6. [Lifecycle Events and waitUntil](#6-lifecycle-events-and-waituntil)
7. [Request Interception](#7-request-interception)
8. [page.evaluate() — Running Code in the Browser](#8-pageevaluate--running-code-in-the-browser)
9. [Selectors and Element Handles](#9-selectors-and-element-handles)
10. [puppeteer-extra and the Stealth Plugin](#10-puppeteer-extra-and-the-stealth-plugin)
11. [Loading Chrome Extensions](#11-loading-chrome-extensions)
12. [User Data Directory and Session Persistence](#12-user-data-directory-and-session-persistence)
13. [Headless vs Headful Mode](#13-headless-vs-headful-mode)
14. [How We Use Puppeteer in This Project](#14-how-we-use-puppeteer-in-this-project)
15. [Performance Patterns](#15-performance-patterns)
16. [Common Errors Reference](#16-common-errors-reference)
17. [API Quick Reference](#17-api-quick-reference)

---

## 1. What is Puppeteer?

Puppeteer is a Node.js library published by Google that provides a high-level API to programmatically control a Chromium (or Chrome) browser.

It is **not a simulator**. It runs a real, full Chrome browser process — the exact same engine that renders pages for human users. Every network request, JavaScript execution, CSS rendering, and extension behaviour is identical to a real user session.

```
Your Node.js code
      ↕  (Puppeteer API)
  Puppeteer library
      ↕  (Chrome DevTools Protocol over WebSocket)
  Chromium process
      ↕  (HTTP/HTTPS)
  Web servers (Amazon, Helium 10 API, etc.)
```

### What Puppeteer can do

- Navigate to URLs, click elements, fill forms, submit
- Take screenshots and generate PDFs
- Intercept and modify network requests
- Execute arbitrary JavaScript inside the browser
- Load Chrome extensions
- Emulate devices, network conditions, geolocation
- Handle authentication, cookies, localStorage
- Capture performance traces

---

## 2. How Puppeteer Works Internally

This is the most important section. Understanding the internals explains why certain things behave the way they do.

### Process architecture

When you call `puppeteer.launch()`, three separate OS processes come into existence:

```
┌─────────────────────────────────────────────────────────┐
│  Node.js Process (your server)                          │
│                                                         │
│  puppeteer.launch() ──WebSocket──→ Browser Process      │
│                                        │                │
│                                    Renderer Process     │
│                                    (one per tab)        │
└─────────────────────────────────────────────────────────┘
```

1. **Node.js process** — Your application. Puppeteer runs here.
2. **Browser process** — The main Chromium process. Manages windows, extensions, network, and spawns renderer processes.
3. **Renderer process** — One per tab. Executes JavaScript, parses HTML, runs the page's code. Each tab is isolated in its own process (Chrome's process-per-site security model).

### How `puppeteer.launch()` works step by step

```
puppeteer.launch()
    │
    ├─ 1. Finds the Chromium executable (bundled with puppeteer, or system Chrome)
    │
    ├─ 2. Spawns Chromium as a child process with flags like:
    │      --remote-debugging-port=0       ← CDP over a random port
    │      --no-first-run
    │      --no-default-browser-check
    │
    ├─ 3. Reads the WebSocket URL from Chromium's stdout:
    │      "DevTools listening on ws://127.0.0.1:PORT/....."
    │
    ├─ 4. Opens a WebSocket connection to that URL
    │
    └─ 5. Returns a Browser object that wraps the WebSocket connection
```

Every subsequent API call (`page.goto()`, `page.click()`, etc.) is translated into a **CDP message** sent over this WebSocket. There is no magic — it's just JSON messages.

---

## 3. The Chrome DevTools Protocol (CDP)

CDP is the protocol that Puppeteer speaks with Chromium. It is the same protocol used by Chrome DevTools when you open F12.

### Protocol structure

CDP is a JSON-RPC-over-WebSocket protocol. Every command is a JSON object:

```json
// Command sent from Node.js → Chromium
{
  "id": 42,
  "method": "Page.navigate",
  "params": {
    "url": "https://www.amazon.com/dp/B0F5KTGDS9"
  }
}

// Response from Chromium → Node.js
{
  "id": 42,
  "result": {
    "frameId": "ABC123",
    "loaderId": "XYZ789"
  }
}
```

### How a `page.goto()` maps to CDP

```js
// Puppeteer API
await page.goto('https://www.amazon.com', { waitUntil: 'networkidle2' });

// What Puppeteer actually sends over WebSocket:
// 1. Page.navigate       → tells Chrome to load the URL
// 2. Page.frameNavigated → event received when navigation starts
// 3. Page.loadEventFired → event when window.onload fires
// 4. Network.* events    → Puppeteer tracks active requests internally
// 5. Resolves the Promise when 0 active requests for 500ms (networkidle2)
```

### How `page.evaluate()` maps to CDP

```js
// Puppeteer API
const title = await page.evaluate(() => document.title);

// CDP commands:
// Runtime.callFunctionOn  → sends the function's source code as a string
//                           to the renderer process
// Runtime.evaluate result → receives the serialised return value back
```

The function you pass to `page.evaluate()` is **serialised to a string**, sent over WebSocket, executed inside the renderer process (the tab), and the result is serialised back to JSON and returned to Node.js. This is why you cannot use variables from the outer Node.js scope inside `page.evaluate()` unless you pass them as arguments.

---

## 4. Core Concepts

### Asynchronous by design

Every Puppeteer method that touches the browser returns a Promise. All browser interactions cross a process boundary (Node.js → Chromium over WebSocket), which is inherently asynchronous. Always `await` them.

### Serialisation boundary

There is a strict boundary between the Node.js world and the browser world:

```
Node.js world                    │  Browser world (inside page.evaluate)
─────────────────────────────────│──────────────────────────────────────
require(), fs, path, logger      │  document, window, DOM APIs
can't be used inside evaluate()  │  can't access Node.js modules
                                 │
Data crosses via JSON serialise  │  Return value must be JSON-serialisable
```

```js
// ✅ Correct: pass data as second argument (gets JSON-serialised)
const labelMap = { 'unit sales': 'unitSales' };
const result = await page.evaluate((map) => {
  // `map` is available here — it was serialised when passed in
  return Object.keys(map);
}, labelMap);

// ❌ Wrong: trying to use outer variable directly
const result = await page.evaluate(() => {
  return Object.keys(labelMap); // ReferenceError: labelMap is not defined
});
```

---

## 5. Browser vs BrowserContext vs Page

Puppeteer has three levels of isolation:

```
Browser
  └─ BrowserContext (think: separate Chrome profile / incognito window)
       └─ Page (a single tab)
```

| Object | Analogy | Shares cookies? |
|---|---|---|
| `Browser` | The Chrome application | — |
| `BrowserContext` | A Chrome profile / incognito window | No — isolated from other contexts |
| `Page` | A browser tab | Yes — shares cookies with other pages in same context |

By default, `browser.newPage()` creates pages in the **default context**, which shares cookies across all tabs. This is what we use — one login session shared by all ASIN tabs.

```js
// Default context (shared session) — what we use
const page = await browser.newPage();

// Isolated incognito-style context — used when you need separate sessions
const context = await browser.createBrowserContext();
const page    = await context.newPage();
```

---

## 6. Lifecycle Events and waitUntil

When you call `page.goto(url, { waitUntil: '...' })`, Puppeteer waits for a specific page lifecycle event before resolving the Promise.

```
Page load timeline:
─────────────────────────────────────────────────────────────────────
 │ DNS resolve │ TCP connect │ TLS │ HTTP │ HTML parse │ JS execute │
 ▼                                                                   
'commit'        ← Puppeteer: response headers received
                     ▼
'domcontentloaded'  ← DOMContentLoaded event (HTML parsed, no images/CSS)
                              ▼
'load'                        ← window.onload (images, CSS loaded)
                                        ▼
'networkidle0'                          ← 0 network requests for 500ms
'networkidle2'                          ← ≤ 2 active requests for 500ms
```

| `waitUntil` value | When it resolves | Use case |
|---|---|---|
| `'commit'` | First byte received | Rarely used |
| `'domcontentloaded'` | HTML parsed | Fastest; good for SPAs that render via JS |
| `'load'` | All resources loaded | Standard pages |
| `'networkidle0'` | Zero requests for 500ms | Fully quiescent pages |
| `'networkidle2'` | ≤2 requests for 500ms | Pages with background polling (Amazon) |

We use `'networkidle2'` because Amazon's page keeps a few WebSocket/beacon connections open permanently, so `networkidle0` would never resolve.

---

## 7. Request Interception

Puppeteer can intercept every network request the page makes and decide to allow, block, or modify it.

### How it works internally

```
Page makes a request
      ↓
Chrome fires: Fetch.requestPaused CDP event → sent to Node.js
      ↓
Puppeteer calls your handler function
      ↓
You call: request.continue() / request.abort() / request.respond()
      ↓
Puppeteer sends: Fetch.continueRequest or Fetch.failRequest CDP command
      ↓
Chrome continues or drops the request
```

### How we use it

```js
await page.setRequestInterception(true);

page.on('request', (req) => {
  // Block fonts and media — not needed for DOM scraping, saves bandwidth
  if (['font', 'media'].includes(req.resourceType())) {
    req.abort();
  } else {
    req.continue();
  }
});
```

**Important:** You must call either `req.continue()`, `req.abort()`, or `req.respond()` for every intercepted request. If you don't, the request hangs and the page stalls.

### Resource types available

```
document, stylesheet, image, media, font, script,
texttrack, xhr, fetch, eventsource, websocket, manifest, other
```

---

## 8. page.evaluate() — Running Code in the Browser

This is the most powerful Puppeteer method. It runs JavaScript inside the actual browser tab, with full access to the DOM.

### How it works

```
page.evaluate(fn, ...args)
      │
      ├─ Serialises `fn.toString()` + args to JSON
      │
      ├─ Sends Runtime.callFunctionOn CDP command to renderer process
      │
      ├─ Renderer executes the function synchronously in the page context
      │
      ├─ Return value is serialised back to JSON
      │
      └─ Puppeteer deserialises and returns the value to Node.js
```

### Variants

```js
// Execute in page, return serialisable value
const result = await page.evaluate(() => document.title);

// Execute with arguments
const text = await page.evaluate((selector) => {
  return document.querySelector(selector)?.innerText;
}, '#product-title');

// Execute in context of a specific element
const el = await page.$('#product-title');
const text = await page.evaluate(node => node.innerText, el);

// Expose Node.js function to the page
await page.exposeFunction('readFile', async (path) => {
  return fs.readFileSync(path, 'utf8');
});
// Now the page JS can call: window.readFile('/path')

// Add a script tag
await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/lodash' });
```

### The TreeWalker pattern (what we use)

```js
const data = await page.evaluate((labelMap) => {
  const result = {};

  // TreeWalker visits every TEXT NODE in the document
  // Much faster than querySelectorAll('*') for text search
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,  // only text nodes, not element nodes
    null
  );

  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim().toLowerCase();
    if (!text || text.length > 120) continue;

    for (const [label, field] of Object.entries(labelMap)) {
      if (result[field] !== undefined) continue;
      if (text.includes(label)) {
        // The value is always in a sibling or parent's sibling element
        const valueEl =
          node.parentElement?.nextElementSibling ||
          node.parentElement?.parentElement?.nextElementSibling;
        if (valueEl?.innerText) {
          result[field] = valueEl.innerText.trim();
        }
      }
    }
  }

  return result;
}, LABEL_MAP);
```

---

## 9. Selectors and Element Handles

### Finding elements

```js
// Returns first matching ElementHandle or null
const el = await page.$('css-selector');

// Returns array of ElementHandles
const els = await page.$$('css-selector');

// Returns true/false
const exists = await page.$('selector') !== null;

// Wait until selector appears (polls DOM)
await page.waitForSelector('#my-element', { timeout: 5000 });

// Wait for function to return truthy (custom polling)
await page.waitForFunction(() => document.querySelector('.loaded') !== null);
```

### ElementHandle methods

```js
const el = await page.$('#submit-button');

await el.click();                           // click
await el.type('hello', { delay: 50 });     // type with human-like delay
await el.focus();                           // focus
const text = await el.evaluate(n => n.innerText);  // read property
const box  = await el.boundingBox();        // { x, y, width, height }
```

### CSS selector tips for scraping

Prefer stable selectors over fragile ones:

```
✅ Stable                    ❌ Fragile
────────────────────────────────────────────
[id^="h10"]                 .sc-abc123
[data-testid="unit-sales"]  .css-xyz789
[aria-label="Unit Sales"]   div > div > span:nth-child(2)
button[type="submit"]       .submitBtn_hashABC
```

---

## 10. puppeteer-extra and the Stealth Plugin

`puppeteer-extra` is a thin wrapper around the base `puppeteer` package that adds a plugin system. The **stealth plugin** patches dozens of browser fingerprinting signals that websites (and Amazon) use to detect automated browsers.

### What the stealth plugin fixes

| Detection vector | What changes |
|---|---|
| `navigator.webdriver` | Set to `undefined` instead of `true` |
| Chrome plugins list | Adds realistic plugin entries (PDF Viewer, etc.) |
| `navigator.languages` | Set to `['en-US', 'en']` |
| `window.chrome` | Adds `chrome.runtime`, `chrome.app` stubs |
| `navigator.permissions` | Returns realistic permission states |
| Canvas fingerprint | Adds subtle noise |
| WebGL vendor | Spoofed to a real GPU vendor string |
| `iframe.contentWindow` | Consistent with outer window |
| `User-Agent` header | Matches navigator.userAgent |

### How it works under the hood

The stealth plugin works by injecting JavaScript into **every page before any other script runs**. It does this via:

```js
// Internally, stealth plugin calls:
await page.evaluateOnNewDocument(stealthScript);
```

`evaluateOnNewDocument` runs code before the page's own JavaScript executes — so by the time Amazon's bot-detection code runs, the browser already looks normal.

### Usage

```js
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin  = require('puppeteer-extra-plugin-stealth');

puppeteerExtra.use(StealthPlugin());

const browser = await puppeteerExtra.launch({ ... });
// All pages opened from this browser are stealthed
```

---

## 11. Loading Chrome Extensions

Chromium normally allows extensions in non-headless mode. Extensions must be loaded at browser launch — you cannot load them after the fact.

### Required launch flags

```js
await puppeteer.launch({
  headless: false,   // REQUIRED — extensions don't work in headless
  args: [
    // Load ONLY this extension (block all others for isolation)
    '--disable-extensions-except=/path/to/extension',
    '--load-extension=/path/to/extension',
  ]
});
```

### How extension loading works internally

```
Chromium starts
      ↓
Reads --load-extension flag
      ↓
Reads extension's manifest.json (validates permissions, version, CSP)
      ↓
Registers content scripts declared in manifest
      ↓
When a page loads that matches the content script's URL pattern:
  → Injects the content script JavaScript into the page's renderer process
  → Content script has access to the real DOM but runs in an isolated world
  → Can communicate with background service worker via chrome.runtime.sendMessage
```

### Why the extension path must contain manifest.json directly

```
✅ Correct path:  ~/helium10-ext/           (manifest.json is inside)
❌ Wrong path:    ~/helium10-ext/8.36.2_0/  (then you're one level too deep)
❌ Wrong path:    ~/.config/google-chrome/…/Extensions/  (parent directory)
```

The path must be the folder that **directly contains** `manifest.json`.

### Why we copy the extension

Chrome's Extensions folder is managed by Chrome and may have file locks or permission issues. Copying to `~/helium10-ext` gives Puppeteer a clean, readable directory.

```bash
cp -r "~/.config/google-chrome/Profile 3/Extensions/<ID>/<version>_0" ~/helium10-ext
```

---

## 12. User Data Directory and Session Persistence

The `userDataDir` option points Chromium at a profile directory on disk. This is the same concept as Chrome profiles (`~/.config/google-chrome/Default/`).

### What gets stored

```
/home/pratik/.config/helium10-session/
├── Default/
│   ├── Cookies              ← authentication cookies (helium10.com session)
│   ├── Local Storage/       ← site localStorage (H10 preferences, tokens)
│   ├── IndexedDB/           ← app database (extension state)
│   ├── Extension State/     ← extension persistent data
│   └── Preferences          ← browser settings
└── Crashpad/
```

### How sessions work across restarts

```
First run:
  launchBrowser({ userDataDir: '/path/to/dir' })
    → Dir is empty or new
    → No cookies → session expired → performLogin() runs
    → Login writes cookies to Cookies file in userDataDir
    → Browser closes

Second run:
  launchBrowser({ userDataDir: '/path/to/dir' })
    → Chromium reads existing Cookies file
    → helium10.com sees valid session cookie → no login needed ✓
```

### Security note

The `userDataDir` contains credentials in cookie form. Treat it like a password:
- Keep it outside your project's version-controlled directories
- Do not commit it to Git (add to `.gitignore`)
- Restrict file permissions: `chmod 700 ~/.config/helium10-session`

---

## 13. Headless vs Headful Mode

| Mode | `headless` value | Extension support | Speed | Memory |
|---|---|---|---|---|
| Old headless | `true` | ❌ No | Fastest | Lowest |
| New headless | `'new'` | ❌ No | Fast | Low |
| Headful | `false` | ✅ Yes | Slower | Higher |

**Why we use `headless: false`:**

Chrome extensions are implemented as Chrome "apps" that run within the browser's UI layer. The old and new headless modes strip the UI layer entirely, which means the extension service worker and content scripts either don't start or can't inject into pages.

On a Linux server without a display, run Xvfb (virtual framebuffer) to create an invisible display:

```bash
# Install
sudo apt install xvfb

# Run your server with a virtual display
Xvfb :99 -screen 0 1440x900x24 &
export DISPLAY=:99
node server.js
```

Or use the `xvfb-run` wrapper:

```bash
xvfb-run --server-args="-screen 0 1440x900x24" node server.js
```

---

## 14. How We Use Puppeteer in This Project

### File: `src/services/helium10Scraper.js`

```
launchBrowser()
├── puppeteerExtra.launch() with stealth + extension flags
├── Sets up 'disconnected' event to clear singleton reference
└── Returns singleton Browser instance

ensureH10Session(browser)
├── Opens tab → navigates to members.helium10.com
├── If redirected to /login → performLogin() → fills form → submits
└── Sets _sessionVerified = true (skipped on subsequent calls)

openProductPage(browser, asin)
├── browser.newPage()
├── setUserAgent() + setExtraHTTPHeaders()
├── setRequestInterception() → block fonts/media
└── page.goto(amazon URL, { waitUntil: 'networkidle2' })

extractProductData(page)
├── Poll H10_PANEL_SELECTORS every 800ms (up to 20s)
├── page.evaluate(TreeWalker logic, LABEL_MAP)
└── parseNumericValue() → normalise strings to numbers

getHelium10ProductData(asin)
├── Validate ASIN format
├── cacheGet() → return if cached
├── launchBrowser() → ensureH10Session()
└── Retry loop (3 attempts):
    ├── openProductPage()
    ├── extractProductData()
    ├── cacheSet() → return
    └── On failure: saveDebugScreenshot() → retry with back-off
```

### Singleton pattern

```js
let _browser = null;
let _launchPromise = null;  // deduplicates concurrent launch calls

async function launchBrowser() {
  if (_browser) {
    // Health check: if browser crashed, _browser.pages() throws
    try { await _browser.pages(); return _browser; }
    catch { _browser = null; _launchPromise = null; }
  }

  if (_launchPromise) return _launchPromise;  // concurrent callers wait on same promise

  _launchPromise = (async () => {
    const browser = await puppeteerExtra.launch({ ... });
    browser.on('disconnected', () => { _browser = null; _launchPromise = null; });
    _browser = browser;
    _launchPromise = null;
    return browser;
  })();

  return _launchPromise;
}
```

---

## 15. Performance Patterns

### Tab pooling

We close tabs after each extraction (`page.close()` in `finally` block). Keeping tabs open wastes renderer process memory — each tab is ~50–150MB.

### Block unnecessary resources

```js
await page.setRequestInterception(true);
page.on('request', req => {
  if (['font', 'media'].includes(req.resourceType())) {
    req.abort();   // saves ~200–800KB per page load
  } else {
    req.continue();
  }
});
```

### In-memory cache

ASIN data is cached in a `Map<string, { data, expiresAt }>` with a 15-minute TTL. Repeated requests for the same ASIN skip Puppeteer entirely.

```js
// Cache hit: ~0ms response
// Cache miss: ~8–30s (page load + extension render time)
```

### Batch concurrency

Multiple ASINs use a worker-pool pattern — N "coroutines" drain a shared queue:

```js
// 20 ASINs with concurrency=2 → 2 tabs open at a time
// Avoids overwhelming Amazon or H10 with too many parallel requests
async function worker() {
  while (queue.length > 0) {
    const asin = queue.shift();
    results[asin] = await getHelium10ProductData(asin);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
```

---

## 16. Common Errors Reference

| Error | Root cause | Fix |
|---|---|---|
| `Failed to launch the browser process` | Chrome executable not found | `puppeteer` bundles Chromium; check it's installed (`npx puppeteer browsers install chrome`) |
| `Protocol error: Target closed` | Tab closed before operation completed | Ensure `page.close()` is only in `finally`, not mid-operation |
| `Execution context was destroyed` | Page navigated away mid-evaluate | Await navigation before evaluating |
| `Node is detached from document` | Element removed from DOM between `$()` and use | Re-query after navigation or waitForSelector |
| `net::ERR_ABORTED` | Request was aborted by your interception handler | Normal for blocked resources; not an error |
| `TimeoutError: waiting failed` | Selector never appeared | Element takes longer than timeout. Increase timeout or check if selector is correct |
| `Cannot read property of null` | `page.$()` returned null | Element not on page; add null check |
| `Error: WebSocket is not open` | Browser process crashed | Singleton auto-relaunches on next request |
| `Extension ... manifest missing` | Wrong extension path | Path must contain `manifest.json` directly |

---

## 17. API Quick Reference

### Launch

```js
const browser = await puppeteer.launch({
  headless: false,                      // false = visible window (needed for extensions)
  args: ['--no-sandbox', ...],          // Chromium flags
  userDataDir: '/path/to/profile',      // persist cookies/storage
  defaultViewport: { width: 1440, height: 900 },
  executablePath: '/usr/bin/google-chrome',  // use system Chrome instead of bundled
  ignoreDefaultArgs: ['--enable-automation'],
  slowMo: 50,                           // add 50ms delay to all operations (debugging)
});
```

### Navigation

```js
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await page.reload({ waitUntil: 'networkidle2' });
await page.goBack();
await page.goForward();
const url = page.url();
```

### Waiting

```js
await page.waitForSelector('.my-class', { timeout: 5000, visible: true });
await page.waitForFunction(() => window.__loaded === true);
await page.waitForNavigation({ waitUntil: 'networkidle2' });
await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 });
```

### Interaction

```js
await page.click('#button');
await page.type('#input', 'hello world', { delay: 60 });
await page.select('#dropdown', 'value');
await page.keyboard.press('Enter');
await page.mouse.move(100, 200);
await page.focus('#input');
await page.$eval('#input', el => el.value = '');   // clear input
```

### Extraction

```js
const text = await page.$eval('.title', el => el.innerText);
const all  = await page.$$eval('li', els => els.map(el => el.innerText));
const html = await page.content();                   // full page HTML
const val  = await page.evaluate(() => window.__data);
```

### Screenshots & PDFs

```js
await page.screenshot({ path: 'screenshot.png', fullPage: true });
await page.screenshot({ path: 'clip.png', clip: { x: 0, y: 0, width: 800, height: 600 } });
await page.pdf({ path: 'page.pdf', format: 'A4' });
```

### Cookies & Storage

```js
// Get all cookies
const cookies = await page.cookies();

// Set cookies
await page.setCookie({ name: 'session', value: 'abc123', domain: '.amazon.com' });

// Clear cookies
await page.deleteCookie({ name: 'session' });

// localStorage
await page.evaluate(() => localStorage.setItem('key', 'value'));
const val = await page.evaluate(() => localStorage.getItem('key'));
```

### Browser management

```js
const pages   = await browser.pages();         // all open tabs
const version = await browser.version();       // Chrome version string
const wsUrl   = browser.wsEndpoint();          // WebSocket URL (for reconnect)
await browser.close();                         // kill browser process
```

### Puppeteer-extra

```js
const puppeteer = require('puppeteer-extra');
const Stealth   = require('puppeteer-extra-plugin-stealth');

puppeteer.use(Stealth());

// Use exactly like normal puppeteer after this:
const browser = await puppeteer.launch({ ... });
```
