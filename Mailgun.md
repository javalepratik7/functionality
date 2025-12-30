```markdown
# Mailgun Auto Reply Bot

> Node.js + Express project that receives inbound Mailgun emails, generates replies using OpenAI (gpt-4o-mini), and sends replies back via Mailgun.

---

## Features

- Receives Mailgun inbound webhooks (`POST /mailgun-webhook`)
- Extracts sender, subject, and plain-text body
- Sends content to OpenAI (gpt-4o-mini) to generate a short, professional, friendly reply
- Sends reply via Mailgun automatically
- Quick logging for debugging

---

## Requirements

- Node.js 18+ recommended
- Mailgun account (sandbox or custom domain)
- OpenAI API key

---

## Folder structure

```

mailgun-auto-reply-bot/
├── .env.example
├── package.json
├── README.md
└── src/
├── server.js
├── mailgun.js
├── openai.js
└── handlers/
└── incomingEmail.js

````

---

## `.env.example`

```env
# Server
PORT=3000
NODE_ENV=development

# Mailgun
MAILGUN_API_KEY=key-xxxxxx
MAILGUN_DOMAIN=sandboxXXXX.mailgun.org

# OpenAI
OPENAI_API_KEY=sk-xxxxxx
````

> Save a copy as `.env` in the project root (do **not** commit this file to Git).

---

## Installation

1. Clone the repository:

```bash
git clone <repo-url>
cd mailgun-auto-reply-bot
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` from `.env.example` and fill in your keys:

```
PORT=3000
MAILGUN_API_KEY=key-xxxx
MAILGUN_DOMAIN=sandboxxxxx.mailgun.org
OPENAI_API_KEY=sk-xxxx
NODE_ENV=development
```

4. Start the server:

```bash
npm start
# or for development with auto-reload:
npm run dev
```

---

## Mailgun Setup

### 1. Add a domain

* Log in to your [Mailgun Dashboard](https://app.mailgun.com/)
* Go to **Sending** → **Domains**
* Add a domain (sandbox or custom)
* For **sandbox**, authorize recipient emails in the sandbox settings
* Copy your domain name (e.g., `sandboxXXXX.mailgun.org`) to `.env`


### 2. Create Mailgun API Key

1. Log in to your [Mailgun Dashboard](https://app.mailgun.com/).
2. Go to **Settings → API Keys** (or **Domains → Your Domain → API Keys** depending on UI).
3. Click **Create API Key** (or view the default key if available).
4. Copy the key and paste it into your `.env`:

```env
MAILGUN_API_KEY=key-yourgeneratedkey
```


### 3. Create an inbound route

1. Go to **Routes** → **Create Route**

2. Set **Filter** to match emails sent to your domain or a specific recipient

   * Example: `match_recipient("anything@yourdomain.com")`

3. Set **Action** to **Forward** or **Webhook**

   * Enter the URL where your bot is listening, e.g.:

     ```
     https://your-public-url.com/mailgun-webhook
     ```
   * If developing locally, use a tunnel (ngrok or cloudflared):

     ```bash
     ngrok http 3000
     ```

     Copy the HTTPS URL and use it as the webhook URL

4. Save the route

### 4. Test Mailgun inbound

* Make sure your server is running and reachable from the internet
* Send a test email to your domain/authorized recipient
* Check your server logs to see if the webhook is received and processed
* The bot should automatically reply

---

## Manual testing with curl

After server is running, simulate Mailgun webhook POST:

```bash
curl -X POST http://localhost:3000/mailgun-webhook \
  -d "sender=Alex <alex@example.com>" \
  -d "subject=Hello from test" \
  -d "body-plain=Hi there, can you help me?"
```

You should receive a 200 response and see a reply sent in the logs.

---

## Notes

* Sandbox domains require authorized recipients; use a custom domain for production.
* Keep API keys secret. Do **not** push `.env` to Git.
* OpenAI SDK response shape may vary—`console.log(response)` if replies are empty and adjust `openai.js` accordingly.
* Mailgun retries webhooks if endpoint returns non-2xx. Return 200 if processed successfully.

---

## Troubleshooting

* `undefined` environment variables? Ensure `.env` is at the project root and `dotenv.config()` is first in `server.js`.
* Emails not sending? Check:

  * Correct `MAILGUN_DOMAIN` and `MAILGUN_API_KEY`
  * Sandbox domain recipients are authorized
* Webhook not firing? Check:

  * ngrok or tunnel is running and publicly accessible
  * Correct URL is set in Mailgun route
* OpenAI errors? Check API key and usage limits

---

## Optional Enhancements

* Validate Mailgun webhook signatures
* Log incoming emails to a database
* Handle attachments
* Send HTML replies
* Queue emails for retry in case of failure

---

*End of README*

```