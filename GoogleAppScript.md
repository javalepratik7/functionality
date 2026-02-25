# 📧 Google Apps Script — Gmail to Webhook: Complete Implementation Guide

> **What this script does:** Every 1 minute, it automatically scans your Gmail inbox for new emails received in the last 2 minutes and forwards their full data (sender, subject, body, attachments count, etc.) to your custom API/webhook endpoint via an HTTP POST request — simulating how services like SendGrid's Inbound Parse webhook work.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Step 1 — Open Google Apps Script](#3-step-1--open-google-apps-script)
4. [Step 2 — Paste the Script](#4-step-2--paste-the-script)
5. [Step 3 — Understand Every Line](#5-step-3--understand-every-line)
6. [Step 4 — Grant Gmail Permissions](#6-step-4--grant-gmail-permissions)
7. [Step 5 — Run setupTrigger() (One-Time Setup)](#7-step-5--run-setuptrigger-one-time-setup)
8. [Step 6 — Verify the Trigger is Active](#8-step-6--verify-the-trigger-is-active)
9. [Step 7 — Test Your Webhook Endpoint](#9-step-7--test-your-webhook-endpoint)
10. [Step 8 — Enable the Endpoint URL](#10-step-8--enable-the-endpoint-url)
11. [Step 9 — Test the Full Flow End-to-End](#11-step-9--test-the-full-flow-end-to-end)
12. [Step 10 — Monitor Execution Logs](#12-step-10--monitor-execution-logs)
13. [Handling Attachments](#13-handling-attachments)
14. [Preventing Duplicate Processing](#14-preventing-duplicate-processing)
15. [Production-Ready Enhanced Script](#15-production-ready-enhanced-script)
16. [Deploying Your Webhook Backend (Node.js Example)](#16-deploying-your-webhook-backend-nodejs-example)
17. [Common Errors & Fixes](#17-common-errors--fixes)
18. [Security Best Practices](#18-security-best-practices)
19. [Quotas & Limits](#19-quotas--limits)
20. [Full Script Reference](#20-full-script-reference)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    YOUR GMAIL INBOX                 │
│           (new email arrives every X mins)          │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│           GOOGLE APPS SCRIPT (Time Trigger)         │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  processNewEmails()  — runs every 1 minute  │   │
│  │                                             │   │
│  │  GmailApp.search('newer_than:2m')           │   │
│  │     → Get recent email threads              │   │
│  │     → Extract: from, to, subject,           │   │
│  │                body, html, headers          │   │
│  │     → Build form-encoded payload            │   │
│  │     → POST to your webhook URL              │   │
│  └─────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────┘
                         │  HTTP POST
                         │  Content-Type: application/x-www-form-urlencoded
                         ▼
┌─────────────────────────────────────────────────────┐
│              YOUR WEBHOOK API SERVER                │
│   (Node.js / Python / any backend)                  │
│                                                     │
│   POST /api/webhooks/sendgrid/inbound               │
│   → Parse payload                                   │
│   → Store in DB / trigger logic / send reply        │
└─────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

Before starting, make sure you have:

- A **Google Account** with Gmail access
- A **webhook/API server** running and publicly accessible (or use a dev tunnel like VS Code Dev Tunnels, ngrok, etc.)
- Basic familiarity with JavaScript

---

## 3. Step 1 — Open Google Apps Script

**Method A — Directly via Apps Script:**

1. Open your browser and go to: **[https://script.google.com](https://script.google.com)**
2. Click **"New project"**
3. A code editor opens with a default `function myFunction() {}` — delete it

**Method B — From Google Drive:**

1. Go to **[https://drive.google.com](https://drive.google.com)**
2. Click **"New"** → **"More"** → **"Google Apps Script"**

**Method C — From Gmail (linked script):**

1. In Gmail, click the **Settings gear** → **"See all settings"**
2. There is no direct link to Apps Script from Gmail — use Method A

> 💡 **Rename your project**: Click "Untitled project" at the top left and name it something like `Gmail Webhook Forwarder`.

---

## 4. Step 2 — Paste the Script

In the code editor, delete everything and paste the full script:

```javascript
// ============================================================
// STEP 1: RUN THIS FUNCTION MANUALLY ONLY ONCE
// It creates the time-based trigger for processNewEmails()
// ============================================================
function setupTrigger() {
  ScriptApp.newTrigger('processNewEmails')
    .timeBased()
    .everyMinutes(1)  // Checks every 1 minute
    .create();
}

// ============================================================
// STEP 2: THIS RUNS AUTOMATICALLY EVERY 1 MINUTE
// ============================================================
function processNewEmails() {
  try {
    // Get ALL new emails (read + unread) from last 2 minutes
    const threads = GmailApp.search('newer_than:2m', 0, 10);
    
    threads.forEach(thread => {
      const messages = thread.getMessages();
      messages.forEach(message => {
        const payload = {
          'from': message.getFrom(),
          'to': message.getTo(),
          'subject': message.getSubject(),
          'text': message.getPlainBody(),
          'html': message.getBody(),
          'headers': `Message-ID: <gapps-${Date.now()}@gmail.com>; Subject: ${message.getSubject()}; Date: ${message.getDate()}`,
          'spam_score': '0.0',
          'attachment-count': message.getAttachments().length.toString()
        };
        
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          payload: Object.keys(payload)
            .map(key => `${key}=${encodeURIComponent(payload[key])}`)
            .join('&')
        };
        
        // YOUR ENDPOINT — uncomment this line when ready!
        UrlFetchApp.fetch('https://your-server.com/api/webhooks/sendgrid/inbound', options);
      });
    });
  } catch(e) {
    console.log('Error: ' + e);
  }
}
```

Click the **Save** button (💾 icon) or press `Ctrl+S` / `Cmd+S`.

---

## 5. Step 3 — Understand Every Line

This section breaks down exactly what every part of the script does.

### `setupTrigger()` — The One-Time Setup Function

```javascript
function setupTrigger() {
  ScriptApp.newTrigger('processNewEmails')  // Which function to call
    .timeBased()                             // Trigger type: time-based (not event-based)
    .everyMinutes(1)                         // Fire every 1 minute
    .create();                               // Register the trigger with Google
}
```

**Why do you run this manually?** Google doesn't allow scripts to auto-schedule themselves on first load for security reasons. You must explicitly run `setupTrigger()` once to register the time trigger. After that, Google's servers handle the scheduling — even when your browser is closed.

**Other timing options you can use instead of `everyMinutes(1)`:**

```javascript
.everyMinutes(5)     // Every 5 minutes
.everyMinutes(10)    // Every 10 minutes
.everyMinutes(15)    // Every 15 minutes
.everyMinutes(30)    // Every 30 minutes
.everyHours(1)       // Every hour
.everyHours(6)       // Every 6 hours
.everyDays(1)        // Daily
```

> ⚠️ **Note:** Google enforces a minimum of 1 minute for time-based triggers. You cannot go lower.

---

### `GmailApp.search(...)` — Finding Recent Emails

```javascript
const threads = GmailApp.search('newer_than:2m', 0, 10);
```

| Parameter | Value | Meaning |
|---|---|---|
| Query string | `'newer_than:2m'` | Gmail search query — only emails from the last 2 minutes |
| Start index | `0` | Start from the first result (pagination) |
| Max results | `10` | Fetch at most 10 threads at once |

**Why `2m` when the trigger fires every `1m`?** The 2-minute window provides a safety overlap. If a trigger fires slightly late (e.g., at 1m10s), using a 1-minute window could miss emails received between 1m00s and 1m10s. The 2-minute window ensures no emails fall through the gap.

**Other useful Gmail search queries:**

```javascript
GmailApp.search('is:unread newer_than:2m')   // Only unread emails
GmailApp.search('from:boss@company.com')      // From a specific sender
GmailApp.search('subject:Invoice newer_than:1h') // Specific subject
GmailApp.search('has:attachment newer_than:2m')  // Only with attachments
GmailApp.search('label:inbox newer_than:2m')     // Only inbox (no spam/sent)
```

---

### Thread vs Message — What's the Difference?

```javascript
threads.forEach(thread => {
  const messages = thread.getMessages();
  messages.forEach(message => {
    // ...
  });
});
```

**Gmail organizes emails as:**

```
Thread (conversation)
  └── Message 1 (the original email)
  └── Message 2 (a reply)
  └── Message 3 (another reply)
```

A thread can contain multiple messages. The nested loop ensures every individual message in every thread is processed.

---

### Building the Payload

```javascript
const payload = {
  'from': message.getFrom(),           // "John Doe <john@example.com>"
  'to': message.getTo(),               // "you@gmail.com"
  'subject': message.getSubject(),     // "Invoice #1234"
  'text': message.getPlainBody(),      // Plain text version of the email
  'html': message.getBody(),           // Full HTML version of the email
  'headers': `Message-ID: <gapps-${Date.now()}@gmail.com>; ...`, // Synthetic headers
  'spam_score': '0.0',                 // Static — Gmail already filters spam
  'attachment-count': message.getAttachments().length.toString()
};
```

**All available `message` methods:**

| Method | Returns | Description |
|---|---|---|
| `message.getFrom()` | String | Sender's email address with name |
| `message.getTo()` | String | Recipient(s) |
| `message.getCc()` | String | CC recipients |
| `message.getBcc()` | String | BCC recipients |
| `message.getSubject()` | String | Email subject line |
| `message.getPlainBody()` | String | Plain text body |
| `message.getBody()` | String | Full HTML body |
| `message.getDate()` | Date | Timestamp the email was sent |
| `message.getId()` | String | Unique Gmail message ID |
| `message.getAttachments()` | Blob[] | Array of attachment blobs |
| `message.isUnread()` | Boolean | Whether the email is unread |
| `message.isStarred()` | Boolean | Whether the email is starred |
| `message.getThread()` | Thread | Parent thread object |
| `message.getReplyTo()` | String | Reply-To header value |

---

### Encoding & Sending the HTTP Request

```javascript
const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  payload: Object.keys(payload)
    .map(key => `${key}=${encodeURIComponent(payload[key])}`)
    .join('&')
};

UrlFetchApp.fetch('https://your-server.com/api/webhooks/sendgrid/inbound', options);
```

The payload is encoded as `key=value&key2=value2` format (URL-encoded form data). This mimics the format that SendGrid's Inbound Parse webhook uses, so your existing inbound email handler can receive the data without changes.

**Alternatively, send as JSON:**

```javascript
const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  payload: JSON.stringify(payload)
};
```

---

## 6. Step 4 — Grant Gmail Permissions

The first time you run any function that accesses Gmail, Google will ask you to authorize the script.

1. In the Apps Script editor, select `processNewEmails` from the function dropdown (top toolbar)
2. Click the **▶ Run** button
3. A popup appears: **"Authorization required"** → Click **"Review permissions"**
4. Choose your Google account
5. You'll see a warning: **"Google hasn't verified this app"** → Click **"Advanced"** → **"Go to [Your Project Name] (unsafe)"**
6. Review the permissions and click **"Allow"**

**Permissions it requests:**

- **Read Gmail messages** — to call `GmailApp.search()` and `message.getBody()`
- **Connect to external services** — to call `UrlFetchApp.fetch()`
- **Run as you** — to set up triggers via `ScriptApp`

> 🔒 These permissions are scoped to your own account only. The script only reads your own Gmail and sends to your own server.

---

## 7. Step 5 — Run setupTrigger() (One-Time Setup)

This is the most important step. You run it exactly **once**.

1. In the function dropdown at the top of the editor, select **`setupTrigger`**
2. Click the **▶ Run** button
3. A "Execution started" message appears in the log panel at the bottom
4. After a second you'll see: "Execution completed"

That's it. The trigger is now registered with Google's servers and will fire every minute indefinitely — even when the editor is closed, even when your computer is off.

> ⚠️ **DO NOT run `setupTrigger()` more than once.** Each call creates a new trigger. If you run it 3 times, you'll have 3 triggers firing simultaneously, and every email will be processed 3 times. See [Step 6](#8-step-6--verify-the-trigger-is-active) for how to manage existing triggers.

---

## 8. Step 6 — Verify the Trigger is Active

To confirm the trigger was created:

1. In the Apps Script editor, click the **clock icon** (⏰) in the left sidebar — this is "Triggers"
2. You should see one row:

```
Function            Deployment    Event Source    Type           Failure notification
processNewEmails    Head          Time-driven     Every minute   Notify me daily
```

**To delete a trigger** (if you accidentally created duplicates):

1. Click the three-dot menu (⋮) next to the trigger
2. Click **"Delete trigger"**
3. Confirm deletion

---

## 9. Step 7 — Test Your Webhook Endpoint

Before connecting the script to your live server, verify your endpoint works correctly by testing it independently.

### Using curl (Terminal)

```bash
curl -X POST https://your-server.com/api/webhooks/sendgrid/inbound \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "from=test%40example.com&to=you%40gmail.com&subject=Test+Email&text=Hello+World&html=%3Cp%3EHello+World%3C%2Fp%3E&spam_score=0.0&attachment-count=0"
```

### Using Postman

1. Open Postman → New Request
2. Method: `POST`
3. URL: `https://your-server.com/api/webhooks/sendgrid/inbound`
4. Go to **Body** tab → select **x-www-form-urlencoded**
5. Add keys: `from`, `to`, `subject`, `text`, `html`, `spam_score`, `attachment-count`
6. Click **Send**

### Using a Dev Tunnel (for local development)

If your server is running locally, expose it using VS Code Dev Tunnels or ngrok:

```bash
# Using ngrok
ngrok http 5000
# → Gives you: https://abc123.ngrok.io

# Your webhook URL becomes:
# https://abc123.ngrok.io/api/webhooks/sendgrid/inbound
```

---

## 10. Step 8 — Enable the Endpoint URL

Once your webhook endpoint is tested and working, enable the `UrlFetchApp.fetch()` call in the script:

**Before (commented out):**
```javascript
// UrlFetchApp.fetch('https://cj0rctdb-5000.inc1.devtunnels.ms/api/webhooks/sendgrid/inbound', options);
```

**After (uncommented and updated with your real URL):**
```javascript
UrlFetchApp.fetch('https://your-actual-server.com/api/webhooks/sendgrid/inbound', options);
```

Click **Save** (`Ctrl+S`).

---

## 11. Step 9 — Test the Full Flow End-to-End

1. Make sure your webhook server is running and accessible
2. Send a test email to your Gmail address from any other account
3. Wait up to 2 minutes for the trigger to fire
4. Check your server logs — you should see a POST request with the email data

**To test immediately without waiting:**

1. In the Apps Script editor, select `processNewEmails` from the dropdown
2. Click **▶ Run** manually
3. Check your server logs right away

---

## 12. Step 10 — Monitor Execution Logs

### In Apps Script Editor

1. Click the **Executions** icon (▶ list) in the left sidebar
2. You'll see a log of every trigger execution with status: `Completed`, `Failed`, or `Timed out`
3. Click any row to expand and see `console.log()` output

### Adding Better Logging to Your Script

```javascript
function processNewEmails() {
  try {
    console.log(`[${new Date().toISOString()}] Trigger fired. Searching for new emails...`);
    
    const threads = GmailApp.search('newer_than:2m', 0, 10);
    console.log(`Found ${threads.length} threads`);
    
    threads.forEach(thread => {
      const messages = thread.getMessages();
      messages.forEach(message => {
        console.log(`Processing: "${message.getSubject()}" from ${message.getFrom()}`);
        
        // ... build payload ...
        
        const response = UrlFetchApp.fetch('https://your-server.com/...', options);
        console.log(`Webhook response status: ${response.getResponseCode()}`);
      });
    });
    
    console.log('Done processing.');
  } catch(e) {
    console.error('Error: ' + e.message);
    console.error('Stack: ' + e.stack);
  }
}
```

---

## 13. Handling Attachments

The base script only counts attachments. Here's how to actually forward them:

```javascript
function processNewEmails() {
  const threads = GmailApp.search('newer_than:2m', 0, 10);

  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      const attachments = message.getAttachments();

      // Build base payload
      const payload = {
        'from': message.getFrom(),
        'to': message.getTo(),
        'subject': message.getSubject(),
        'text': message.getPlainBody(),
        'html': message.getBody(),
        'attachment-count': attachments.length.toString(),
      };

      // If sending as multipart/form-data (to support binary file uploads)
      if (attachments.length > 0) {
        // Build a multipart payload manually
        const boundary = 'boundary' + Date.now();
        let body = '';

        // Add text fields
        Object.keys(payload).forEach(key => {
          body += `--${boundary}\r\n`;
          body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
          body += `${payload[key]}\r\n`;
        });

        // Add attachment files
        attachments.forEach((attachment, index) => {
          const fileName = attachment.getName();
          const mimeType = attachment.getContentType();
          const fileData = attachment.getBytes();

          body += `--${boundary}\r\n`;
          body += `Content-Disposition: form-data; name="attachment${index + 1}"; filename="${fileName}"\r\n`;
          body += `Content-Type: ${mimeType}\r\n\r\n`;
          // Note: binary data would need base64 encoding for text-based transmission
        });

        body += `--${boundary}--`;
      } else {
        // Simple URL-encoded POST (no attachments)
        const options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          payload: Object.keys(payload)
            .map(k => `${k}=${encodeURIComponent(payload[k])}`)
            .join('&'),
        };
        UrlFetchApp.fetch('https://your-server.com/api/webhooks/sendgrid/inbound', options);
      }
    });
  });
}
```

---

## 14. Preventing Duplicate Processing

Since the trigger fires every 1 minute with a 2-minute search window, the **same email can be processed twice**. Here's how to prevent that using Google's `PropertiesService` (a persistent key-value store).

```javascript
function processNewEmails() {
  // Get the script's persistent storage
  const processed = PropertiesService.getScriptProperties();

  const threads = GmailApp.search('newer_than:2m', 0, 10);

  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      const messageId = message.getId(); // Unique Gmail message ID

      // Skip if already processed
      if (processed.getProperty(messageId)) {
        console.log(`Skipping already-processed message: ${messageId}`);
        return;
      }

      // Mark as processed BEFORE sending (prevents duplicates on retry)
      processed.setProperty(messageId, new Date().toISOString());

      const payload = {
        'from': message.getFrom(),
        'to': message.getTo(),
        'subject': message.getSubject(),
        'text': message.getPlainBody(),
        'html': message.getBody(),
        'message_id': messageId,  // Include the ID so your server can deduplicate too
        'spam_score': '0.0',
        'attachment-count': message.getAttachments().length.toString()
      };

      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        payload: Object.keys(payload)
          .map(k => `${k}=${encodeURIComponent(payload[k])}`)
          .join('&'),
      };

      try {
        UrlFetchApp.fetch('https://your-server.com/api/webhooks/sendgrid/inbound', options);
        console.log(`Sent: ${messageId} — "${message.getSubject()}"`);
      } catch (fetchError) {
        // If sending fails, un-mark so it retries next time
        processed.deleteProperty(messageId);
        console.error(`Failed to send ${messageId}: ${fetchError}`);
      }
    });
  });

  // Clean up old entries (keep only last 1000 to avoid storage limits)
  const allKeys = processed.getKeys();
  if (allKeys.length > 1000) {
    allKeys.slice(0, allKeys.length - 1000).forEach(k => processed.deleteProperty(k));
  }
}
```

---

## 15. Production-Ready Enhanced Script

This is the complete, battle-tested version with all improvements:

```javascript
// ============================================================
// CONFIG — Edit these values
// ============================================================
const CONFIG = {
  WEBHOOK_URL: 'https://your-server.com/api/webhooks/sendgrid/inbound',
  SEARCH_WINDOW: 'newer_than:2m',
  MAX_THREADS: 10,
  SECRET_KEY: 'your-secret-key-for-verification', // Optional auth header
};

// ============================================================
// Run ONCE manually to create the trigger
// ============================================================
function setupTrigger() {
  // Delete any existing triggers first (prevents duplicates)
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processNewEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create a fresh trigger
  ScriptApp.newTrigger('processNewEmails')
    .timeBased()
    .everyMinutes(1)
    .create();

  console.log('✅ Trigger created successfully!');
}

// ============================================================
// Delete all triggers (useful for cleanup)
// ============================================================
function deleteTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  console.log('🗑️ All triggers deleted.');
}

// ============================================================
// Main function — runs every 1 minute automatically
// ============================================================
function processNewEmails() {
  const startTime = Date.now();
  const processed = PropertiesService.getScriptProperties();

  try {
    console.log(`[${new Date().toISOString()}] processNewEmails started`);

    const threads = GmailApp.search(CONFIG.SEARCH_WINDOW, 0, CONFIG.MAX_THREADS);
    console.log(`Found ${threads.length} thread(s)`);

    let sentCount = 0;
    let skippedCount = 0;

    threads.forEach(thread => {
      thread.getMessages().forEach(message => {
        const messageId = message.getId();

        // Skip if already processed
        if (processed.getProperty(messageId)) {
          skippedCount++;
          return;
        }

        // Mark as processed immediately
        processed.setProperty(messageId, new Date().toISOString());

        const subject = message.getSubject();
        const from = message.getFrom();

        console.log(`Processing: "${subject}" from ${from}`);

        const payload = {
          'from':             from,
          'to':               message.getTo(),
          'cc':               message.getCc(),
          'subject':          subject,
          'text':             message.getPlainBody(),
          'html':             message.getBody(),
          'date':             message.getDate().toISOString(),
          'message_id':       messageId,
          'thread_id':        thread.getId(),
          'headers':          buildHeaders(message),
          'spam_score':       '0.0',
          'attachment-count': message.getAttachments().length.toString(),
          'charsets':         JSON.stringify({ to: 'UTF-8', html: 'UTF-8', text: 'UTF-8' }),
        };

        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Webhook-Secret': CONFIG.SECRET_KEY, // Optional: verify on server side
            'X-Source': 'google-apps-script',
          },
          payload: Object.keys(payload)
            .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(payload[k] || '')}`)
            .join('&'),
          muteHttpExceptions: true, // Don't throw on non-2xx responses
        };

        try {
          const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
          const statusCode = response.getResponseCode();

          if (statusCode >= 200 && statusCode < 300) {
            sentCount++;
            console.log(`✅ Sent "${subject}" — HTTP ${statusCode}`);
          } else {
            // Server error — unmark so it retries next run
            processed.deleteProperty(messageId);
            console.warn(`⚠️ Server returned HTTP ${statusCode} for "${subject}". Will retry.`);
          }
        } catch (fetchError) {
          // Network error — unmark so it retries
          processed.deleteProperty(messageId);
          console.error(`❌ Fetch failed for "${subject}": ${fetchError.message}`);
        }
      });
    });

    const elapsed = Date.now() - startTime;
    console.log(`✔️ Done — Sent: ${sentCount}, Skipped: ${skippedCount}, Time: ${elapsed}ms`);

    // Cleanup old processed IDs (keep last 500)
    cleanupProcessedIds(processed);

  } catch (e) {
    console.error(`❌ Fatal error: ${e.message}`);
    console.error(e.stack);
  }
}

// ============================================================
// Helper: Build synthetic email headers
// ============================================================
function buildHeaders(message) {
  return [
    `Message-ID: <gapps-${message.getId()}@gmail.com>`,
    `Subject: ${message.getSubject()}`,
    `From: ${message.getFrom()}`,
    `To: ${message.getTo()}`,
    `Date: ${message.getDate().toUTCString()}`,
    `Content-Type: text/html; charset=UTF-8`,
  ].join('; ');
}

// ============================================================
// Helper: Remove old processed IDs to stay under storage limits
// ============================================================
function cleanupProcessedIds(store) {
  const keys = store.getKeys();
  if (keys.length > 500) {
    const toDelete = keys.slice(0, keys.length - 500);
    toDelete.forEach(k => store.deleteProperty(k));
    console.log(`🗑️ Cleaned up ${toDelete.length} old processed IDs`);
  }
}
```

---

## 16. Deploying Your Webhook Backend (Node.js Example)

Here's a minimal Express.js server that receives the webhook:

```bash
mkdir webhook-server && cd webhook-server
npm init -y
npm i express body-parser
```

```javascript
// server.js
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// Parse URL-encoded form data (what Apps Script sends)
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));

// Optional: verify the webhook secret
const WEBHOOK_SECRET = 'your-secret-key-for-verification';

app.post('/api/webhooks/sendgrid/inbound', (req, res) => {
  // Optional secret verification
  const secret = req.headers['x-webhook-secret'];
  if (secret !== WEBHOOK_SECRET) {
    console.warn('Unauthorized webhook call — wrong secret');
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const {
    from,
    to,
    cc,
    subject,
    text,
    html,
    date,
    message_id,
    thread_id,
    'attachment-count': attachmentCount,
    spam_score,
  } = req.body;

  console.log('\n📧 New Email Received:');
  console.log('  From:    ', from);
  console.log('  To:      ', to);
  console.log('  Subject: ', subject);
  console.log('  Date:    ', date);
  console.log('  Msg ID:  ', message_id);
  console.log('  Attachments:', attachmentCount);
  console.log('  Body preview:', text?.substring(0, 100));

  // Add your business logic here:
  // - Save to database
  // - Trigger an auto-reply
  // - Send a Slack notification
  // - Create a support ticket

  res.status(200).json({ success: true, received: message_id });
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on http://localhost:${PORT}`);
});
```

Run it:

```bash
node server.js
```

---

## 17. Common Errors & Fixes

### ❌ "Exception: Request failed for URL..."

**Cause:** Your webhook URL is not reachable (server is down, tunnel expired, wrong URL).

**Fix:**
- Check that your server is running
- If using a dev tunnel or ngrok, make sure it's still active
- Test the URL with curl first

---

### ❌ "Exception: You do not have permission to call GmailApp..."

**Cause:** Script hasn't been authorized yet, or authorization was revoked.

**Fix:**
- Run any Gmail function manually in the editor
- Go through the authorization flow again
- Check: **Script Settings** → make sure the script is linked to the right Google account

---

### ❌ Emails are being processed multiple times

**Cause:** Multiple triggers exist (you ran `setupTrigger()` more than once), or the 2-minute search window is too wide.

**Fix:**
- Go to **Triggers** (clock icon) → delete duplicate triggers
- Add the deduplication logic from [Section 14](#14-preventing-duplicate-processing)
- Run `deleteTrigger()` then `setupTrigger()` again

---

### ❌ "Script runtime exceeded maximum execution time"

**Cause:** Processing too many emails at once; each run has a 6-minute time limit.

**Fix:**
- Reduce `MAX_THREADS` from 10 to 3–5
- Add a timeout check:

```javascript
function processNewEmails() {
  const startTime = Date.now();
  const MAX_RUN_TIME = 5 * 60 * 1000; // 5 minutes

  threads.forEach(thread => {
    if (Date.now() - startTime > MAX_RUN_TIME) {
      console.warn('Approaching time limit — stopping early');
      return;
    }
    // ... rest of processing
  });
}
```

---

### ❌ "Service invoked too many times in a short time"

**Cause:** Gmail API rate limiting.

**Fix:**
- Add a delay between requests:

```javascript
Utilities.sleep(500); // Wait 500ms between each email
```

---

### ❌ Webhook receives empty `text` or `html`

**Cause:** Some emails only have one body format.

**Fix:**
```javascript
'text': message.getPlainBody() || 'No plain text body',
'html': message.getBody() || message.getPlainBody() || 'No HTML body',
```

---

## 18. Security Best Practices

**1. Verify webhook requests with a secret header**

In the Apps Script:
```javascript
headers: {
  'X-Webhook-Secret': 'my-super-secret-key-123',
}
```

In your server:
```javascript
if (req.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET) {
  return res.status(403).send('Forbidden');
}
```

**2. Never hardcode secrets in the script** — use Script Properties instead:

```javascript
// Set once using the Properties editor in Apps Script
const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
```

To set properties: In Apps Script editor → **Project Settings** (⚙️) → **Script Properties** → Add property.

**3. Use HTTPS** — never send email content to an HTTP endpoint.

**4. Rotate your webhook secret periodically.**

**5. Scope the Gmail search** — if possible, label emails you want to forward and search by label:

```javascript
GmailApp.search('label:to-forward newer_than:2m')
```

This avoids forwarding every single email indiscriminately.

---

## 19. Quotas & Limits

Google Apps Script has the following daily limits for free accounts:

| Quota | Free (gmail.com) | Google Workspace |
|---|---|---|
| Script runtime per day | 90 min/day | 6 hrs/day |
| Triggers | 20 total | 20 total |
| URL Fetch calls | 20,000/day | 100,000/day |
| Gmail read operations | 50/day | 1,500/day |
| Properties reads/writes | 50,000/day | 50,000/day |
| Execution time per run | 6 min max | 6 min max |

With a 1-minute trigger: your script fires ~1,440 times/day, but Gmail read operations are grouped — fetching 10 threads counts as ~1 read operation per batch.

---

## 20. Full Script Reference — Quick Copy

```javascript
// ============================================================
// GMAIL TO WEBHOOK FORWARDER — Google Apps Script
// ============================================================

const CONFIG = {
  WEBHOOK_URL: 'https://YOUR-SERVER.COM/api/webhooks/sendgrid/inbound',
  SEARCH_WINDOW: 'newer_than:2m',
  MAX_THREADS: 10,
  SECRET_KEY: 'your-secret-key',
};

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'processNewEmails') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processNewEmails').timeBased().everyMinutes(1).create();
  console.log('Trigger created!');
}

function deleteTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
}

function processNewEmails() {
  const processed = PropertiesService.getScriptProperties();
  try {
    const threads = GmailApp.search(CONFIG.SEARCH_WINDOW, 0, CONFIG.MAX_THREADS);
    threads.forEach(thread => {
      thread.getMessages().forEach(message => {
        const id = message.getId();
        if (processed.getProperty(id)) return;
        processed.setProperty(id, new Date().toISOString());

        const payload = {
          from: message.getFrom(),
          to: message.getTo(),
          cc: message.getCc(),
          subject: message.getSubject(),
          text: message.getPlainBody(),
          html: message.getBody(),
          date: message.getDate().toISOString(),
          message_id: id,
          'spam_score': '0.0',
          'attachment-count': message.getAttachments().length.toString(),
        };

        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Webhook-Secret': CONFIG.SECRET_KEY,
          },
          payload: Object.keys(payload)
            .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(payload[k] || '')}`)
            .join('&'),
          muteHttpExceptions: true,
        };

        const res = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
        const code = res.getResponseCode();
        if (code < 200 || code >= 300) processed.deleteProperty(id);
        console.log(`${code} — ${message.getSubject()}`);
      });
    });
  } catch (e) {
    console.error('Error: ' + e);
  }
}
```

---
