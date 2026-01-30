Below is a **complete step-by-step guide for Mailgun**, starting **from scratch**, to build an **AI auto-reply email system using OpenAI**, plus a **clear Mailgun Dashboard guide**.
I’ll keep it **developer-centric**, practical, and aligned with how you’ll actually implement this in production.

---

## 1️⃣ What we are building (Architecture)

When someone sends an email to:

```
support@yourdomain.com
help@yourdomain.com
anything@yourdomain.com
```

Mailgun will:

1. Receive the email
2. Trigger an **Inbound Route**
3. POST parsed email data to your backend webhook
4. Backend sends email text to **OpenAI**
5. OpenAI generates reply
6. Backend sends reply back using **Mailgun Send API**

**Flow**
Incoming Email → Mailgun Inbound Route → Your API → OpenAI → Auto-Reply Email

---

## 2️⃣ Prerequisites

You need:

* Mailgun account
* A domain you control
* Node.js installed
* OpenAI API key
* Public webhook URL (ngrok for local)

---

## 3️⃣ Create Mailgun Account & Add Domain

Login to Mailgun Dashboard.

Go to **Sending → Domains → Add New Domain**

Choose:

* Region (US or EU)
* Domain: `yourdomain.com`

Mailgun will give you **DNS records**:

* TXT (SPF)
* TXT (DKIM)
* MX records

Add **all records** in your DNS provider.

Once verified → domain becomes **Active**

⚠️ This step is mandatory for inbound emails.

---

## 4️⃣ Mailgun Dashboard – Inbound Routes (Very Important)

Go to:

```
Receiving → Routes → Create Route
```

Create a route like:

**Expression**

```
match_recipient(".*@yourdomain.com")
```

This means:
➡️ **ANY email** sent to `@yourdomain.com` will trigger this route.

**Actions**

```
forward("https://your-backend.com/api/inbound-email")
store(notify=false)
```

Save the route.

✅ That’s it. Mailgun inbound email is now active.

---

## 5️⃣ Backend Project Setup (Node + Express)

Create project:

```
mkdir mailgun-ai-reply
cd mailgun-ai-reply
npm init -y
```

Install dependencies:

```
npm install express dotenv form-data mailgun.js openai
```

---

## 6️⃣ Environment Variables

Create `.env`

```
MAILGUN_API_KEY=key-xxxx
MAILGUN_DOMAIN=yourdomain.com
OPENAI_API_KEY=sk-xxxx
```

---

## 7️⃣ Server Setup

Create `index.js`

```js
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import Mailgun from "mailgun.js";
import FormData from "form-data";

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});
```

---

## 8️⃣ Inbound Email Webhook (Mailgun)

Mailgun sends **clean, structured data**.

```js
app.post("/api/inbound-email", async (req, res) => {
  try {
    const from = req.body.from;
    const to = req.body.recipient;
    const subject = req.body.subject;
    const text = req.body["stripped-text"];
    const messageId = req.body["Message-Id"];
    const inReplyTo = req.body["In-Reply-To"];

    // Ignore self-replies (important)
    if (from.includes("@yourdomain.com")) {
      return res.status(200).send("Ignored self email");
    }

    // Generate AI reply
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional email support assistant.",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const replyText = aiResponse.choices[0].message.content;

    // Send reply
    await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: "Support <support@yourdomain.com>",
      to: from,
      subject: `Re: ${subject}`,
      text: replyText,
      "h:In-Reply-To": messageId,
      "h:References": messageId,
    });

    res.status(200).send("Email processed");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
});
```

---

## 9️⃣ Start Server

```js
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
```

Expose locally:

```
ngrok http 5000
```

Update **Mailgun Route forward URL** with ngrok URL.

---

## 🔟 Testing

Send email to:

```
support@yourdomain.com
help@yourdomain.com
abc@yourdomain.com
```

What happens:

* Mailgun receives email
* Route triggers webhook
* OpenAI generates reply
* Mailgun sends auto-reply
* Reply stays in **same email thread**

---

## 1️⃣1️⃣ How to Route Different Emails

Mailgun provides `recipient`

```js
const recipient = req.body.recipient;

if (recipient === "support@yourdomain.com") {
  // support logic
}

if (recipient === "sales@yourdomain.com") {
  // sales logic
}
```

You can also use:

```
support+billing@yourdomain.com
```

---

## 1️⃣2️⃣ Mailgun Dashboard Tips (Important)

### Logs

```
Sending → Logs
```

Shows outbound replies.

### Inbound Emails

Mailgun does **not store inbound emails by default**
If you want storage → enable `store()` action in route.

### Rate Limits

Mailgun inbound webhooks are extremely reliable and fast.

---

## 1️⃣3️⃣ Best Practices (Production-Grade)

1. Store `Message-Id` in DB to prevent duplicate replies
2. Ignore auto-replies using header:

```
Auto-Submitted
```

3. Add fallback response if OpenAI fails
4. Add confidence threshold before replying
5. Use different prompts per inbox

---

## 🔥 Mailgun vs SendGrid for THIS use case

For **AI email auto-reply systems**:

* ✅ Mailgun is **better**
* Cleaner inbound payload
* Easier reply threading
* Better routing logic
* Cheaper long-term

This is why **Zendesk-like systems prefer Mailgun**.

---

## ✅ Final Summary

* Mailgun inbound routes trigger for **all emails in domain**
* Routing is done via backend logic
* OpenAI integration is clean
* Threaded replies work out of the box
* Best choice for long-term automated email systems

If you want next:

* MongoDB schema for conversations
* Anti-loop protection logic
* Confidence-based AI reply approval
* Multi-language support

Just tell me 👍



