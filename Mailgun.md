# 📬 Mailgun Auto Reply Bot

> A lightweight **Node.js + Express** webhook that receives inbound emails via Mailgun, generates smart replies using **OpenAI (gpt-4o-mini)**, and sends them back — automatically.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o--mini-412991?style=flat-square&logo=openai&logoColor=white)
![Mailgun](https://img.shields.io/badge/Mailgun-Webhooks-F06B66?style=flat-square&logo=mailgun&logoColor=white)

---

## ✨ Features

| # | Feature |
|---|---------|
| 1 | Receives Mailgun inbound webhooks at `POST /mailgun-webhook` |
| 2 | Extracts sender, subject, and plain-text body from each email |
| 3 | Sends content to OpenAI to generate a short, professional reply |
| 4 | Sends the reply back automatically via Mailgun |
| 5 | Built-in request logging for easy debugging |

---

## 📋 Requirements

- **Node.js 18+** — recommended runtime
- **Mailgun account** — sandbox or custom domain
- **OpenAI API key** — with access to `gpt-4o-mini`

---

## 📁 Folder Structure

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
```

---

## 🔑 Environment Variables

Copy `.env.example` → `.env` and fill in your credentials.

> ⚠️ **Never commit `.env` to Git.** Add it to `.gitignore`.

```env
# Server
PORT=3000
NODE_ENV=development

# Mailgun
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=sandboxXXXXXXXXXXXXXXXXXXXX.mailgun.org

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🚀 Installation

**1. Clone the repository**

```bash
git clone <repo-url>
cd mailgun-auto-reply-bot
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure your `.env`**

Copy `.env.example` to `.env` and fill in your Mailgun domain, API key, and OpenAI key.

**4. Start the server**

```bash
# Production
npm start

# Development with auto-reload
npm run dev
```

---

## 📮 Mailgun Setup

### 1 — Add a Domain

1. Log in to your [Mailgun Dashboard](https://app.mailgun.com/)
2. Go to **Sending → Domains** and add a sandbox or custom domain
3. For sandbox domains, authorize recipient emails in the sandbox settings
4. Copy your domain name to `.env`

---

### 2 — Create an API Key

1. Go to **Settings → API Keys** (or **Domains → Your Domain → API Keys**)
2. Click **Create API Key**, copy it, and paste into your `.env`:

```env
MAILGUN_API_KEY=key-yourgeneratedkey
```

---

### 3 — Create an Inbound Route

1. Go to **Routes → Create Route**

2. Set the **Filter** to match your recipient:
   ```
   match_recipient("anything@yourdomain.com")
   ```

3. Set the **Action** to **Webhook** and enter your public URL:
   ```
   https://your-public-url.com/mailgun-webhook
   ```

4. **Local development?** Use a tunnel to expose your local server:

   ```bash
   # Option A — ngrok
   ngrok http 3000

   # Option B — Cloudflare
   cloudflared tunnel --url http://localhost:3000
   ```

   Copy the HTTPS URL and set it as the webhook URL in Mailgun Routes.

5. Save the route

---

### 4 — Test Inbound Email

Make sure your server is running and reachable, then send a test email to your domain. Check your server logs to confirm the webhook fires — the bot should reply automatically.

---

## 🧪 Manual Testing with cURL

Simulate a Mailgun webhook POST locally while the server is running:

```bash
curl -X POST http://localhost:3000/mailgun-webhook \
  -d "sender=Alex <alex@example.com>" \
  -d "subject=Hello from test" \
  -d "body-plain=Hi there, can you help me?"
```

✅ You should receive a `200` response and see a reply sent in the server logs.

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `undefined` environment variables | Ensure `.env` is in the project root and `dotenv.config()` is the first call in `server.js` |
| Emails not sending | Verify `MAILGUN_DOMAIN` and `MAILGUN_API_KEY`; for sandbox, confirm recipients are authorized |
| Webhook not firing | Check that your tunnel is running and the HTTPS URL is set correctly in Mailgun Routes |
| OpenAI errors | Verify your API key and check available usage limits on the OpenAI dashboard |
| Empty replies | Add `console.log(response)` in `openai.js` and adjust the response field path as needed |

> ⚠️ Mailgun retries webhooks on non-2xx responses. Always return **200** once an email is processed.

---

## 📌 Notes

- **Sandbox domains** only send to authorized recipients — use a custom domain in production
- **API keys are sensitive** — never push `.env` to Git
- Mailgun webhook payloads use `multipart/form-data` — ensure your Express body parser handles it
- OpenAI SDK response shapes may vary between versions — log the raw response if replies come back empty

---

## ✨ Optional Enhancements

- [ ] 🛡️ Validate Mailgun webhook signatures
- [ ] 🗃️ Log incoming emails to a database
- [ ] 📎 Handle email attachments
- [ ] 🎨 Send rich HTML replies
- [ ] 🔄 Queue emails for retry on failure
- [ ] 📊 Add a reply analytics dashboard

---

## 📚 Resources

- [Mailgun Documentation](https://documentation.mailgun.com/)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [ngrok](https://ngrok.com/) · [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)

---

*Built with Node.js · Express · Mailgun · OpenAI*
