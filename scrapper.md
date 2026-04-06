# Web Scraper Implementation Using Cheerio

## Prerequisites

- Node.js (v14 or above) installed on your system
- npm (comes with Node.js)
- Basic knowledge of HTML, CSS selectors, and JavaScript

---

## Step 1: Initialize Your Project

Create a new project folder and initialize it with npm.

```bash
mkdir my-scraper
cd my-scraper
npm init -y
```

This generates a `package.json` file in your project directory.

---

## Step 2: Install Required Dependencies

Install **Cheerio** for HTML parsing and **axios** for making HTTP requests.

```bash
npm install cheerio axios
```

- **cheerio** — A fast, jQuery-like library for parsing and traversing HTML on the server.
- **axios** — A promise-based HTTP client to fetch web page content.

---

## Step 3: Project Structure

Your folder structure should look like this:

```
my-scraper/
│
├── node_modules/
├── package.json
├── package-lock.json
└── scraper.js
```

Create the main scraper file:

```bash
touch scraper.js
```

---

## Step 4: Write the Scraper

Open `scraper.js` and add the following code:

```js
const axios = require('axios');
const cheerio = require('cheerio');

// The URL you want to scrape
const URL = 'https://books.toscrape.com/';

async function scrapeData() {
  try {
    // Step 4.1 — Fetch the HTML content of the page
    const { data } = await axios.get(URL);

    // Step 4.2 — Load the HTML into Cheerio
    const $ = cheerio.load(data);

    // Step 4.3 — Select elements using CSS selectors
    const books = [];

    $('article.product_pod').each((index, element) => {
      // Step 4.4 — Extract data from each element
      const title = $(element).find('h3 a').attr('title');
      const price = $(element).find('.price_color').text().trim();
      const rating = $(element).find('p.star-rating').attr('class').replace('star-rating ', '');
      const availability = $(element).find('.availability').text().trim();

      books.push({ title, price, rating, availability });
    });

    // Step 4.5 — Output the scraped data
    console.log(`Total books scraped: ${books.length}`);
    console.log(JSON.stringify(books, null, 2));

  } catch (error) {
    console.error('Error while scraping:', error.message);
  }
}

scrapeData();
```

---

## Step 5: Understanding Cheerio Selectors

Cheerio uses jQuery-style CSS selectors. Here are the key methods used:

| Method | Description | Example |
|---|---|---|
| `$('tag')` | Select by HTML tag | `$('h1')` |
| `$('.class')` | Select by class name | `$('.price_color')` |
| `$('#id')` | Select by element ID | `$('#main')` |
| `.find(selector)` | Find a child element | `.find('h3 a')` |
| `.text()` | Get inner text | `.text().trim()` |
| `.attr('name')` | Get an attribute value | `.attr('href')` |
| `.each(fn)` | Loop over matched elements | `.each((i, el) => {})` |
| `.html()` | Get inner HTML | `.html()` |
| `.parent()` | Get parent element | `.parent()` |
| `.siblings()` | Get sibling elements | `.siblings()` |

---

## Step 6: Run the Scraper

Execute the script using Node.js:

```bash
node scraper.js
```

**Expected Output:**

```json
Total books scraped: 20
[
  {
    "title": "A Light in the Attic",
    "price": "£51.77",
    "rating": "Three",
    "availability": "In stock"
  },
  ...
]
```

---

## Step 7: Save Scraped Data to a JSON File

Modify `scraper.js` to save the output to a file instead of just printing it:

```js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const URL = 'https://books.toscrape.com/';

async function scrapeData() {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const books = [];

    $('article.product_pod').each((index, element) => {
      const title = $(element).find('h3 a').attr('title');
      const price = $(element).find('.price_color').text().trim();
      const rating = $(element).find('p.star-rating').attr('class').replace('star-rating ', '');
      const availability = $(element).find('.availability').text().trim();

      books.push({ title, price, rating, availability });
    });

    // Save to JSON file
    fs.writeFileSync('books.json', JSON.stringify(books, null, 2));
    console.log(`Scraping complete. ${books.length} books saved to books.json`);

  } catch (error) {
    console.error('Error while scraping:', error.message);
  }
}

scrapeData();
```

Run again:

```bash
node scraper.js
```

A `books.json` file will be created in your project folder.

---

## Step 8: Scrape Multiple Pages (Pagination)

Many websites have multiple pages. Here is how to handle pagination:

```js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://books.toscrape.com/catalogue/';
let allBooks = [];

async function scrapePage(pageUrl) {
  const { data } = await axios.get(pageUrl);
  const $ = cheerio.load(data);

  $('article.product_pod').each((index, element) => {
    const title = $(element).find('h3 a').attr('title');
    const price = $(element).find('.price_color').text().trim();
    allBooks.push({ title, price });
  });

  // Check if a "next" button exists
  const nextPage = $('li.next a').attr('href');
  return nextPage ? BASE_URL + nextPage : null;
}

async function scrapeAll() {
  let currentUrl = 'https://books.toscrape.com/catalogue/page-1.html';

  while (currentUrl) {
    console.log(`Scraping: ${currentUrl}`);
    currentUrl = await scrapePage(currentUrl);
  }

  fs.writeFileSync('all_books.json', JSON.stringify(allBooks, null, 2));
  console.log(`Done! Total books: ${allBooks.length}`);
}

scrapeAll();
```

---

## Step 9: Add Request Delays (Polite Scraping)

To avoid overwhelming the server, add a delay between requests:

```js
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Use inside your loop
await delay(1000); // waits 1 second before the next request
```

---

## Step 10: Handle Common Errors

| Error | Cause | Fix |
|---|---|---|
| `ECONNREFUSED` | Server refused connection | Check the URL; the site may be down |
| `403 Forbidden` | Bot detection / IP blocked | Add headers like `User-Agent` |
| `ETIMEDOUT` | Request timed out | Set `timeout` in axios config |
| Empty data | Wrong CSS selector | Inspect the page HTML again |

**Example — Adding User-Agent Header:**

```js
const { data } = await axios.get(URL, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  timeout: 10000 // 10 seconds
});
```

---

## Step 11: Final Project Structure

After completing all steps, your project should look like:

```
my-scraper/
│
├── node_modules/
├── books.json          ← Scraped output (single page)
├── all_books.json      ← Scraped output (all pages)
├── scraper.js          ← Main scraper script
├── package.json
└── package-lock.json
```

---

## Important Notes

- **Respect `robots.txt`** — Always check `https://example.com/robots.txt` before scraping.
- **Terms of Service** — Read the website's ToS; some sites prohibit scraping.
- **Rate Limiting** — Don't flood servers. Use delays between requests.
- **Dynamic Content** — Cheerio only parses static HTML. For JavaScript-rendered pages, use **Puppeteer** or **Playwright** instead.
- **Legal** — Scrape only publicly available data and never store personal information without consent.

---

## Quick Reference — Useful Cheerio Methods

```js
// Load HTML
const $ = cheerio.load(htmlString);

// Select and extract
$('h1').text()                    // Inner text
$('a').attr('href')               // Attribute value
$('div').html()                   // Inner HTML
$('ul li').length                 // Count elements
$('p').first().text()             // First matched element
$('p').last().text()              // Last matched element
$('div').children('p').text()     // Direct children
$('span').closest('div').text()   // Nearest ancestor

// Filtering
$('li').filter('.active').text()
$('li').not('.disabled').each((i, el) => { ... })
```
