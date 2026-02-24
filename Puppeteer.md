# 🎭 Puppeteer — Complete Guide: Beginner to Advanced

---

## Table of Contents

1. [What is Puppeteer?](#1-what-is-puppeteer)
2. [Prerequisites](#2-prerequisites)
3. [Installation](#3-installation)
4. [Project Setup](#4-project-setup)
5. [Core Concepts](#5-core-concepts)
6. [Basic Usage](#6-basic-usage)
7. [Navigation & Page Interaction](#7-navigation--page-interaction)
8. [Selectors & DOM Manipulation](#8-selectors--dom-manipulation)
9. [Form Handling](#9-form-handling)
10. [Screenshots & PDFs](#10-screenshots--pdfs)
11. [Web Scraping](#11-web-scraping)
12. [Waiting Strategies](#12-waiting-strategies)
13. [Network Interception](#13-network-interception)
14. [Authentication & Cookies](#14-authentication--cookies)
15. [File Upload & Download](#15-file-upload--download)
16. [Handling Multiple Pages & Tabs](#16-handling-multiple-pages--tabs)
17. [Emulating Devices & Geolocation](#17-emulating-devices--geolocation)
18. [Performance & Coverage](#18-performance--coverage)
19. [Advanced: Custom Chrome Launch Flags](#19-advanced-custom-chrome-launch-flags)
20. [Advanced: Using Puppeteer with TypeScript](#20-advanced-using-puppeteer-with-typescript)
21. [Advanced: Puppeteer Cluster (Parallel Scraping)](#21-advanced-puppeteer-cluster-parallel-scraping)
22. [Testing with Jest + Puppeteer](#22-testing-with-jest--puppeteer)
23. [Error Handling & Debugging](#23-error-handling--debugging)
24. [Best Practices](#24-best-practices)

---

## 1. What is Puppeteer?

**Puppeteer** is a Node.js library developed by Google that provides a high-level API to control **Chromium** (or Chrome) over the **DevTools Protocol**. It runs the browser in **headless mode** by default (no visible UI), but can be configured to run in full (headed) mode.

### What you can do with Puppeteer:

- Automate UI testing
- Take screenshots and generate PDFs
- Scrape web content from JavaScript-heavy sites
- Intercept and mock network requests
- Measure page performance
- Simulate user interactions (clicks, typing, scrolling)
- Test Chrome extensions

---

## 2. Prerequisites

Before installing Puppeteer, make sure you have:

- **Node.js** v14 or later (v18+ recommended)  
  Download from [https://nodejs.org](https://nodejs.org)
- **npm** (comes with Node.js)
- Basic knowledge of JavaScript (async/await)

Verify your setup:

```bash
node --version   # e.g., v18.17.0
npm --version    # e.g., 9.6.7
```

---

## 3. Installation

### Option A — Full Puppeteer (downloads Chromium automatically)

```bash
npm i puppeteer
```

This installs the `puppeteer` package **and** automatically downloads a compatible version of Chromium (~170 MB) into `node_modules/puppeteer/.local-chromium/`.

### Option B — Puppeteer Core (bring your own browser)

```bash
npm i puppeteer-core
```

Use this when you want to connect to an existing Chrome/Chromium installation and skip the bundled download. You must manually provide the `executablePath`.

### Verifying the Installation

```bash
node -e "const p = require('puppeteer'); console.log('Puppeteer version:', require('./node_modules/puppeteer/package.json').version);"
```

---

## 4. Project Setup

```bash
# Create a new project directory
mkdir puppeteer-project
cd puppeteer-project

# Initialize npm
npm init -y

# Install Puppeteer
npm i puppeteer

# Create your first script file
touch index.js
```

Your folder structure should look like this:

```
puppeteer-project/
├── node_modules/
├── index.js
└── package.json
```

---

## 5. Core Concepts

Understanding these building blocks is essential before writing any script.

| Concept | Description |
|---|---|
| `Browser` | The browser instance (Chromium). Created via `puppeteer.launch()` |
| `BrowserContext` | An isolated session (like an incognito window). Each context has separate cookies/storage |
| `Page` | A single tab in the browser. Most interactions happen here |
| `ElementHandle` | A reference to a DOM element on the page |
| `JSHandle` | A reference to a JavaScript object in the browser context |
| `Frame` | A frame within a page (including iframes) |
| `CDPSession` | A raw Chrome DevTools Protocol session for low-level control |

---

## 6. Basic Usage

### 6.1 — Hello World: Take a Screenshot

```js
// index.js
const puppeteer = require('puppeteer');

(async () => {
  // Launch the browser
  const browser = await puppeteer.launch();

  // Open a new page/tab
  const page = await browser.newPage();

  // Navigate to a URL
  await page.goto('https://example.com');

  // Take a screenshot
  await page.screenshot({ path: 'screenshot.png' });

  // Close the browser
  await browser.close();

  console.log('Done! Check screenshot.png');
})();
```

Run it:

```bash
node index.js
```

### 6.2 — Launching in Headed Mode (visible browser)

```js
const browser = await puppeteer.launch({
  headless: false,   // Show the browser UI
  slowMo: 50,        // Slow down actions by 50ms (great for debugging)
});
```

### 6.3 — Using puppeteer-core with a custom executable

```js
const puppeteer = require('puppeteer-core');

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome', // or path on your OS
  headless: true,
});
```

---

## 7. Navigation & Page Interaction

### 7.1 — Navigating to URLs

```js
// Wait until the network is idle (no requests for 500ms)
await page.goto('https://example.com', { waitUntil: 'networkidle2' });

// Other waitUntil options:
// 'load'           - wait for the 'load' event
// 'domcontentloaded' - wait for the DOMContentLoaded event
// 'networkidle0'   - no network requests for 500ms (stricter)
// 'networkidle2'   - fewer than 3 requests for 500ms
```

### 7.2 — Browser Navigation Methods

```js
await page.goBack();      // Go to previous page in history
await page.goForward();   // Go forward
await page.reload();      // Reload the page
await page.close();       // Close the tab
```

### 7.3 — Getting Page Information

```js
console.log(await page.url());    // Current URL
console.log(await page.title()); // Page title
const html = await page.content(); // Full page HTML
```

---

## 8. Selectors & DOM Manipulation

Puppeteer supports multiple selector strategies.

### 8.1 — CSS Selectors

```js
// Click a button
await page.click('#submit-button');

// Type into an input
await page.type('#search-input', 'Hello World');

// Get text content of an element
const text = await page.$eval('h1', el => el.textContent);
console.log(text);
```

### 8.2 — XPath Selectors

```js
// Find elements by XPath
const [heading] = await page.$x('//h1[contains(text(), "Welcome")]');
if (heading) {
  await heading.click();
}
```

### 8.3 — Querying Multiple Elements

```js
// page.$$ returns an array of ElementHandles
const links = await page.$$('a');
for (const link of links) {
  const href = await link.evaluate(el => el.href);
  console.log(href);
}
```

### 8.4 — page.$eval vs page.$$eval

```js
// page.$eval — runs a function on the FIRST matching element
const title = await page.$eval('h1', el => el.innerText);

// page.$$eval — runs a function on ALL matching elements
const allParagraphs = await page.$$eval('p', els => els.map(el => el.innerText));
console.log(allParagraphs);
```

### 8.5 — Execute Custom JavaScript on the Page

```js
// page.evaluate runs code INSIDE the browser context
const result = await page.evaluate(() => {
  return document.querySelectorAll('li').length;
});
console.log(`Found ${result} list items`);

// Pass variables from Node.js into the browser context
const selector = 'h1';
const heading = await page.evaluate((sel) => {
  return document.querySelector(sel)?.textContent;
}, selector);
```

---

## 9. Form Handling

```js
// --- Typing into an input field ---
await page.type('#username', 'myUser', { delay: 50 }); // delay simulates human typing

// --- Clearing a field before typing ---
await page.click('#username', { clickCount: 3 }); // Triple-click to select all
await page.type('#username', 'newUser');

// --- Selecting a dropdown option ---
await page.select('#country', 'IN'); // Selects option with value="IN"

// --- Checking a checkbox ---
await page.click('#accept-terms');

// --- Submitting a form ---
await page.click('#submit-btn');
// Or press Enter on an input:
await page.keyboard.press('Enter');

// --- Waiting for navigation after submit ---
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle2' }),
  page.click('#submit-btn'),
]);
```

---

## 10. Screenshots & PDFs

### 10.1 — Screenshot Options

```js
// Full page screenshot
await page.screenshot({
  path: 'full-page.png',
  fullPage: true,
});

// Clip to a specific region
await page.screenshot({
  path: 'clipped.png',
  clip: { x: 0, y: 0, width: 800, height: 600 },
});

// Get screenshot as a base64 string (no file save)
const base64 = await page.screenshot({ encoding: 'base64' });

// JPEG with quality setting
await page.screenshot({
  path: 'image.jpg',
  type: 'jpeg',
  quality: 85,
});
```

### 10.2 — Capture a Specific Element

```js
const element = await page.$('#hero-section');
await element.screenshot({ path: 'element.png' });
```

### 10.3 — Generate a PDF

```js
// Only works in headless mode!
await page.pdf({
  path: 'output.pdf',
  format: 'A4',
  printBackground: true,
  margin: {
    top: '20px',
    right: '20px',
    bottom: '20px',
    left: '20px',
  },
});
```

---

## 11. Web Scraping

### 11.1 — Scraping a Simple Page

```js
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('https://quotes.toscrape.com', { waitUntil: 'load' });

  const quotes = await page.$$eval('.quote', items =>
    items.map(item => ({
      text: item.querySelector('.text').innerText,
      author: item.querySelector('.author').innerText,
      tags: [...item.querySelectorAll('.tag')].map(t => t.innerText),
    }))
  );

  console.log(JSON.stringify(quotes, null, 2));

  await browser.close();
})();
```

### 11.2 — Scraping Across Multiple Pages (Pagination)

```js
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const allQuotes = [];

  let currentPage = 1;

  while (true) {
    await page.goto(`https://quotes.toscrape.com/page/${currentPage}/`);

    const quotes = await page.$$eval('.quote', items =>
      items.map(item => ({
        text: item.querySelector('.text').innerText,
        author: item.querySelector('.author').innerText,
      }))
    );

    allQuotes.push(...quotes);

    // Check if "Next" button exists
    const nextBtn = await page.$('.next a');
    if (!nextBtn) break;

    currentPage++;
  }

  console.log(`Total quotes scraped: ${allQuotes.length}`);
  await browser.close();
})();
```

---

## 12. Waiting Strategies

Proper waiting is critical for reliable automation.

```js
// Wait for a selector to appear in the DOM
await page.waitForSelector('#result-container');

// Wait for selector to be visible (not just present)
await page.waitForSelector('#loader', { hidden: true }); // wait for it to disappear

// Wait for a specific amount of time (use sparingly!)
await page.waitForTimeout(2000); // 2 seconds

// Wait for a URL change
await page.waitForNavigation({ waitUntil: 'networkidle2' });

// Wait for a custom function to return true
await page.waitForFunction(
  () => document.querySelectorAll('.item').length > 5
);

// Wait for a network response
const response = await page.waitForResponse(
  res => res.url().includes('/api/data') && res.status() === 200
);
const data = await response.json();
console.log(data);

// Wait for a network request
await page.waitForRequest(req => req.url().includes('/api/login'));
```

---

## 13. Network Interception

### 13.1 — Block Unnecessary Resources (Speed Up Scraping)

```js
await page.setRequestInterception(true);

page.on('request', (request) => {
  const type = request.resourceType();
  if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
    request.abort(); // Block the request
  } else {
    request.continue(); // Allow it
  }
});
```

### 13.2 — Mock API Responses

```js
await page.setRequestInterception(true);

page.on('request', (request) => {
  if (request.url().includes('/api/user')) {
    // Return a fake response
    request.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ name: 'Test User', role: 'admin' }),
    });
  } else {
    request.continue();
  }
});
```

### 13.3 — Monitoring All Network Activity

```js
page.on('request', req => {
  console.log(`>> ${req.method()} ${req.url()}`);
});

page.on('response', res => {
  console.log(`<< ${res.status()} ${res.url()}`);
});
```

---

## 14. Authentication & Cookies

### 14.1 — HTTP Basic Authentication

```js
await page.authenticate({
  username: 'admin',
  password: 'secret',
});
await page.goto('https://protected-site.com');
```

### 14.2 — Setting Cookies

```js
await page.setCookie({
  name: 'session_token',
  value: 'abc123xyz',
  domain: 'example.com',
  path: '/',
  httpOnly: true,
});
```

### 14.3 — Saving & Restoring Cookies (Session Persistence)

```js
const fs = require('fs');

// Save cookies to a file
const cookies = await page.cookies();
fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));

// Restore cookies from file later
const savedCookies = JSON.parse(fs.readFileSync('cookies.json'));
await page.setCookie(...savedCookies);
```

### 14.4 — Local Storage Manipulation

```js
// Set localStorage items
await page.evaluate(() => {
  localStorage.setItem('token', 'my-auth-token');
});

// Read localStorage
const token = await page.evaluate(() => localStorage.getItem('token'));
console.log(token);
```

---

## 15. File Upload & Download

### 15.1 — File Upload

```js
// Find the file input element and upload a file
const inputElement = await page.$('input[type="file"]');
await inputElement.uploadFile('/path/to/your/file.pdf');

// Click the submit button afterwards
await page.click('#upload-submit');
```

### 15.2 — Configure Download Directory

```js
const path = require('path');

// Use Chrome DevTools Protocol to set download behavior
const client = await page.target().createCDPSession();
await client.send('Page.setDownloadBehavior', {
  behavior: 'allow',
  downloadPath: path.resolve('./downloads'),
});

// Trigger the download (e.g., by clicking a download link)
await page.click('#download-btn');

// Wait for the file to appear
await page.waitForTimeout(3000);
```

---

## 16. Handling Multiple Pages & Tabs

```js
// Open a new tab
const newPage = await browser.newPage();
await newPage.goto('https://google.com');

// Get all open pages
const pages = await browser.pages();
console.log(`Open tabs: ${pages.length}`);

// Listen for new tabs being opened (e.g., via target="_blank")
browser.on('targetcreated', async (target) => {
  if (target.type() === 'page') {
    const newTab = await target.page();
    console.log('New tab opened:', await newTab.url());
  }
});

// Click a link that opens in a new tab
const [newTab] = await Promise.all([
  new Promise(resolve => browser.once('targetcreated', target => resolve(target.page()))),
  page.click('a[target="_blank"]'),
]);

await newTab.waitForLoadState?.() ?? await newTab.waitForSelector('body');
console.log('New tab URL:', await newTab.url());
```

---

## 17. Emulating Devices & Geolocation

### 17.1 — Emulate a Mobile Device

```js
const { KnownDevices } = require('puppeteer');
const iPhone = KnownDevices['iPhone 13'];

await page.emulate(iPhone);
await page.goto('https://example.com');
await page.screenshot({ path: 'mobile-view.png' });
```

### 17.2 — Custom Viewport & User Agent

```js
await page.setViewport({ width: 1280, height: 800 });
await page.setUserAgent(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0 Safari/537.36'
);
```

### 17.3 — Geolocation Spoofing

```js
// First, grant geolocation permission
const context = browser.defaultBrowserContext();
await context.overridePermissions('https://example.com', ['geolocation']);

// Set a fake location (Paris, France)
await page.setGeolocation({ latitude: 48.8566, longitude: 2.3522 });

await page.goto('https://example.com/location-check');
```

### 17.4 — Dark Mode & Color Scheme

```js
await page.emulateMediaFeatures([
  { name: 'prefers-color-scheme', value: 'dark' },
]);
```

---

## 18. Performance & Coverage

### 18.1 — Measure Page Load Performance

```js
const metrics = await page.metrics();
console.log('JS Heap Used:', metrics.JSHeapUsedSize / 1024 / 1024, 'MB');
console.log('Layout count:', metrics.LayoutCount);

// Using Navigation Timing API
const timing = await page.evaluate(() => JSON.stringify(performance.timing));
const { loadEventEnd, navigationStart } = JSON.parse(timing);
console.log(`Page load time: ${loadEventEnd - navigationStart}ms`);
```

### 18.2 — JavaScript Coverage

```js
// Start collecting coverage
await page.coverage.startJSCoverage();

await page.goto('https://example.com');

// Stop and get results
const coverage = await page.coverage.stopJSCoverage();

let totalBytes = 0;
let usedBytes = 0;

for (const entry of coverage) {
  totalBytes += entry.text.length;
  for (const range of entry.ranges) {
    usedBytes += range.end - range.start - 1;
  }
}

const percentage = ((usedBytes / totalBytes) * 100).toFixed(2);
console.log(`JS Coverage: ${percentage}% used (${usedBytes}/${totalBytes} bytes)`);
```

---

## 19. Advanced: Custom Chrome Launch Flags

```js
const browser = await puppeteer.launch({
  headless: 'new',        // Use new headless mode
  slowMo: 0,
  defaultViewport: { width: 1920, height: 1080 },
  args: [
    '--no-sandbox',                  // Required in Docker/CI environments
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',       // Avoids shared memory issues in Docker
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',                 // Disable GPU hardware acceleration
    '--window-size=1920,1080',
    '--incognito',                   // Launch in incognito mode
    '--proxy-server=http://proxy:port', // Use a proxy
  ],
  ignoreHTTPSErrors: true,          // Ignore SSL certificate errors
  userDataDir: './user-data',       // Persist browser profile/session
});
```

---

## 20. Advanced: Using Puppeteer with TypeScript

### Setup

```bash
npm init -y
npm i puppeteer typescript ts-node @types/node
npx tsc --init
```

### tsconfig.json (minimal)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist"
  }
}
```

### TypeScript Example

```ts
// scraper.ts
import puppeteer, { Browser, Page } from 'puppeteer';

interface Quote {
  text: string;
  author: string;
}

async function scrapeQuotes(url: string): Promise<Quote[]> {
  const browser: Browser = await puppeteer.launch({ headless: true });
  const page: Page = await browser.newPage();

  await page.goto(url, { waitUntil: 'load' });

  const quotes: Quote[] = await page.$$eval('.quote', (items) =>
    items.map((item) => ({
      text: (item.querySelector('.text') as HTMLElement).innerText,
      author: (item.querySelector('.author') as HTMLElement).innerText,
    }))
  );

  await browser.close();
  return quotes;
}

(async () => {
  const results = await scrapeQuotes('https://quotes.toscrape.com');
  console.log(results);
})();
```

Run with:

```bash
npx ts-node scraper.ts
```

---

## 21. Advanced: Puppeteer Cluster (Parallel Scraping)

For scraping at scale, use the `puppeteer-cluster` library to parallelize work across multiple browser instances.

```bash
npm i puppeteer-cluster
```

```js
const { Cluster } = require('puppeteer-cluster');

(async () => {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT, // Each task uses its own context
    maxConcurrency: 5,                         // Run 5 tasks in parallel
    puppeteerOptions: { headless: true },
  });

  // Define the task to run for each URL
  await cluster.task(async ({ page, data: url }) => {
    await page.goto(url);
    const title = await page.title();
    console.log(`Title of ${url}: ${title}`);
  });

  // Queue up URLs
  const urls = [
    'https://example.com',
    'https://google.com',
    'https://github.com',
    'https://stackoverflow.com',
    'https://nodejs.org',
  ];

  for (const url of urls) {
    cluster.queue(url);
  }

  await cluster.idle();
  await cluster.close();
})();
```

---

## 22. Testing with Jest + Puppeteer

### Installation

```bash
npm i --save-dev jest jest-puppeteer @types/jest
```

### jest.config.js

```js
module.exports = {
  preset: 'jest-puppeteer',
  testMatch: ['**/*.test.js'],
};
```

### jest-puppeteer.config.js

```js
module.exports = {
  launch: {
    headless: true,
    args: ['--no-sandbox'],
  },
};
```

### Example Test

```js
// google.test.js
describe('Google Search', () => {
  beforeAll(async () => {
    await page.goto('https://google.com');
  });

  it('should show the Google logo', async () => {
    const logo = await page.$('#hplogo');
    expect(logo).not.toBeNull();
  });

  it('should display a search bar', async () => {
    const searchBar = await page.$('input[name="q"]');
    expect(searchBar).not.toBeNull();
  });

  it('should search and return results', async () => {
    await page.type('input[name="q"]', 'Puppeteer automation');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#search');
    const results = await page.$$('.g');
    expect(results.length).toBeGreaterThan(0);
  });
});
```

Run tests:

```bash
npx jest
```

---

## 23. Error Handling & Debugging

### 23.1 — Try/Catch with Cleanup

```js
let browser;
try {
  browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  // ... your logic
} catch (err) {
  console.error('Automation failed:', err.message);
} finally {
  if (browser) await browser.close(); // Always close the browser
}
```

### 23.2 — Listening to Page Errors

```js
// JavaScript errors thrown on the page
page.on('pageerror', (error) => {
  console.error('Page error:', error.message);
});

// Console messages from the page
page.on('console', (msg) => {
  console.log(`[Browser Console] [${msg.type()}]:`, msg.text());
});

// Unhandled promise rejections in the browser
page.on('requestfailed', (request) => {
  console.error(`Request failed: ${request.url()} — ${request.failure()?.errorText}`);
});
```

### 23.3 — Screenshots on Failure

```js
async function runWithScreenshotOnError(page, fn) {
  try {
    await fn();
  } catch (err) {
    await page.screenshot({ path: `error-${Date.now()}.png`, fullPage: true });
    throw err;
  }
}
```

### 23.4 — Debugging in Headed Mode

```js
const browser = await puppeteer.launch({
  headless: false,
  devtools: true,   // Opens Chrome DevTools automatically
  slowMo: 100,      // Slows down every action by 100ms
});
```

You can also pause execution and inspect the page:

```js
await page.evaluate(() => {
  debugger; // Pauses in DevTools if devtools: true is set
});
```

---

## 24. Best Practices

### Performance

- Always close the browser with `browser.close()` in a `finally` block.
- Block unnecessary resources (images, fonts, CSS) when you only need data.
- Reuse page instances when scraping multiple URLs sequentially.
- Use `puppeteer-cluster` for parallel workloads.

### Reliability

- Prefer `waitForSelector` over `waitForTimeout`. Time-based waits are fragile.
- Use `networkidle2` or `networkidle0` for dynamic SPAs.
- Always handle `requestfailed` and `pageerror` events.
- Take screenshots on failures for easier debugging.

### Anti-Detection (Ethical Use Only)

- Rotate User-Agent strings for large-scale scraping.
- Add random delays between actions to mimic human behavior.
- Use residential proxies if needed.
- Use `puppeteer-extra` + `puppeteer-extra-plugin-stealth` to avoid bot detection.

```bash
npm i puppeteer-extra puppeteer-extra-plugin-stealth
```

```js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({ headless: true });
```

### Security

- Never expose Puppeteer scripts on a public server without sandboxing.
- Use `--no-sandbox` only in trusted, isolated environments (like Docker).
- Do not store credentials in your scripts — use environment variables.

```js
const username = process.env.SITE_USERNAME;
const password = process.env.SITE_PASSWORD;
```

### Docker Deployment

```dockerfile
FROM node:18-slim

# Install dependencies for Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["node", "index.js"]
```

---

## Useful Resources

- [Official Puppeteer Docs](https://pptr.dev)
- [Puppeteer GitHub](https://github.com/puppeteer/puppeteer)
- [Puppeteer Cluster](https://github.com/thomasdondorf/puppeteer-cluster)
- [Puppeteer Extra (Stealth)](https://github.com/berstend/puppeteer-extra)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

---

*Generated on: February 24, 2026*
