# 💳 Stripe — Complete Implementation Guide (Node.js + React)

> Step-by-step guide to integrate **Stripe** payments in a full-stack app. Covers Stripe Dashboard setup, Payment Intents, Checkout Sessions, webhooks, and production deployment.

**Best for:** International payments — cards, Apple Pay, Google Pay, subscriptions.

---

## Table of Contents

1. [What is Stripe & Payment Flow](#1-what-is-stripe--payment-flow)
2. [Stripe Dashboard Setup (Platform Steps)](#2-stripe-dashboard-setup-platform-steps)
3. [Project Setup](#3-project-setup)
4. [Database Schema](#4-database-schema)
5. [Approach A — Stripe Checkout (Recommended)](#5-approach-a--stripe-checkout-recommended)
6. [Approach B — Payment Intents + Elements](#6-approach-b--payment-intents--elements)
7. [Webhooks Setup](#7-webhooks-setup)
8. [Test Mode vs Live Mode](#8-test-mode-vs-live-mode)
9. [Subscriptions (Optional)](#9-subscriptions-optional)
10. [Refunds (Optional)](#10-refunds-optional)
11. [Full Flow Diagram](#11-full-flow-diagram)
12. [Common Fixes & Best Practices](#12-common-fixes--best-practices)
13. [Quick Reference Cheat Sheet](#13-quick-reference-cheat-sheet)

---

## 1. What is Stripe & Payment Flow

### What Stripe does

Stripe is a payment processor. Your app creates a payment session; Stripe handles card data securely (PCI compliant).

### Two main integration approaches

| Approach | Best for | Complexity |
|----------|----------|------------|
| **Checkout Session** | Quick setup, hosted payment page | Easy ⭐ |
| **Payment Intents + Elements** | Custom UI on your site | Medium ⭐⭐ |

### Standard Checkout flow

```
1. User clicks "Pay" on your website
2. Your BACKEND creates a Stripe Checkout Session
3. User is redirected to Stripe-hosted payment page
4. User pays with card / Apple Pay / Google Pay
5. Stripe redirects back to your success URL
6. Stripe sends webhook → your backend marks order PAID
7. Never trust redirect alone — always confirm via webhook
```

### Amount rule

> Stripe amounts are in **smallest currency unit** (cents for USD, paise for INR).
> $10.00 = `1000` | ₹500 = `50000`

---

## 2. Stripe Dashboard Setup (Platform Steps)

Do these on [https://dashboard.stripe.com](https://dashboard.stripe.com)

### Step 1 — Create account

1. Go to **Sign Up** → email, country, business type
2. Verify email
3. Complete **business verification** for Live payouts (bank account, identity)

> **Test mode** works immediately — toggle is top-right of dashboard.

---

### Step 2 — Get API keys

1. Go to **Developers** → **API keys**
2. Copy:
   - **Publishable key** → `pk_test_xxxxxxxx` (frontend safe)
   - **Secret key** → `sk_test_xxxxxxxx` (backend only — click Reveal)

| Key | Where to use | Safe in frontend? |
|-----|--------------|-------------------|
| Publishable key (`pk_`) | Frontend + Backend | ✅ Yes |
| Secret key (`sk_`) | Backend only | ❌ Never |

---

### Step 3 — Configure business settings

1. **Settings** → **Business settings** → **Public business information**
   - Business name, support email, support phone
   - Shows on receipts and checkout

2. **Settings** → **Branding**
   - Logo, brand color, icon
   - Customizes Checkout page appearance

---

### Step 4 — Enable payment methods

1. Go to **Settings** → **Payment methods**
2. Enable:
   - ✔ Cards
   - ✔ Apple Pay (requires domain verification)
   - ✔ Google Pay
   - ✔ Link (Stripe's saved payment)
   - ✔ Local methods (region-specific)

---

### Step 5 — Set up webhooks

1. Go to **Developers** → **Webhooks**
2. Click **+ Add endpoint**
3. Configure:
   - **Endpoint URL:** `https://api.yourdomain.com/api/stripe/webhook`
   - **Events to listen:**
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded` (optional)
4. Click **Add endpoint**
5. Click endpoint → **Signing secret** → copy `whsec_xxxxxxxx`
6. Save as `STRIPE_WEBHOOK_SECRET` in `.env`

> **Local testing:** Install Stripe CLI:
> ```bash
> stripe listen --forward-to localhost:5000/api/stripe/webhook
> ```
> Copy the `whsec_` secret it prints.

---

### Step 6 — Configure redirect URLs (Checkout)

When creating Checkout Sessions in code, you set:

| URL | Purpose | Example |
|-----|---------|---------|
| `success_url` | After successful payment | `https://yourapp.com/payment/success?session_id={CHECKOUT_SESSION_ID}` |
| `cancel_url` | User cancelled payment | `https://yourapp.com/payment/cancel` |

> `{CHECKOUT_SESSION_ID}` is a Stripe placeholder — auto-replaced.

---

### Step 7 — Apple Pay domain verification (optional)

1. **Settings** → **Payment methods** → **Apple Pay**
2. Click **Configure** → **Add new domain**
3. Download verification file → host at `https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association`
4. Click **Verify**

---

### Step 8 — Go Live (production)

1. Complete business verification (Settings → Account)
2. Toggle **Test mode → Live** (top-right)
3. Get **Live API keys** (Developers → API keys)
4. Create **Live webhook endpoint** with production URL
5. Update `.env`:
   ```env
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

---

## 3. Project Setup

### Install packages

```bash
npm install stripe express cors dotenv
```

### Environment variables

```env
# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# App
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### Folder structure

```
payment-app/
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   │   └── stripeRoutes.js
│   │   ├── controllers/
│   │   │   └── stripeController.js
│   │   └── services/
│   │       └── stripeService.js
│   └── .env
└── frontend/
    └── src/
        └── components/
            └── StripeCheckout.jsx
```

### Initialize Stripe

```javascript
// src/services/stripeService.js
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20", // use latest stable version
});

module.exports = stripe;
```

---

## 4. Database Schema

```sql
CREATE TABLE orders (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  user_id                 INT NOT NULL,
  amount                  INT NOT NULL COMMENT 'Amount in smallest currency unit',
  currency                VARCHAR(3) DEFAULT 'usd',
  status                  ENUM('created', 'paid', 'failed', 'refunded') DEFAULT 'created',
  stripe_session_id       VARCHAR(255) UNIQUE NULL,
  stripe_payment_intent_id VARCHAR(255) UNIQUE NULL,
  stripe_customer_id      VARCHAR(255) NULL,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE payment_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  order_id      INT NULL,
  stripe_event_id VARCHAR(100) UNIQUE,
  event_type    VARCHAR(100),
  payload       JSON,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Approach A — Stripe Checkout (Recommended)

Hosted payment page — fastest to implement, Stripe handles UI.

### Backend — Create Checkout Session

```javascript
// src/controllers/stripeController.js
const stripe = require("../services/stripeService");
const db = require("../db");

// POST /api/stripe/create-checkout-session
exports.createCheckoutSession = async (req, res) => {
  try {
    const { amount, currency = "usd", productName = "Order" } = req.body;
    const userId = req.user.id;

    if (!amount || amount < 50) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // 1. Save order in DB first
    const [result] = await db.query(
      `INSERT INTO orders (user_id, amount, currency, status)
       VALUES (?, ?, ?, 'created')`,
      [userId, amount, currency]
    );
    const dbOrderId = result.insertId;

    // 2. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: productName,
            },
            unit_amount: amount, // cents or paise
          },
          quantity: 1,
        },
      ],
      metadata: {
        db_order_id: String(dbOrderId),
        user_id: String(userId),
      },
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    });

    // 3. Save session ID
    await db.query(
      `UPDATE orders SET stripe_session_id = ? WHERE id = ?`,
      [session.id, dbOrderId]
    );

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url, // redirect user to this URL
    });
  } catch (err) {
    console.error("Checkout session error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
};
```

### Frontend — Redirect to Stripe Checkout

```jsx
// src/components/StripeCheckout.jsx
import { useState } from "react";

export default function StripeCheckout({ amountInDollars, productName }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          amount: Math.round(amountInDollars * 100), // $10 → 1000 cents
          currency: "usd",
          productName,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Redirect to Stripe-hosted checkout page
      window.location.href = data.url;
    } catch (err) {
      alert("Payment failed: " + err.message);
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePay} disabled={loading}>
      {loading ? "Redirecting…" : `Pay $${amountInDollars}`}
    </button>
  );
}
```

### Success page — verify session (optional extra check)

```jsx
// src/pages/PaymentSuccess.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;

    fetch(`/api/stripe/session-status?session_id=${sessionId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((data) => setStatus(data.paymentStatus))
      .catch(() => setStatus("error"));
  }, [searchParams]);

  if (status === "checking") return <p>Confirming payment…</p>;
  if (status === "paid") return <p>✅ Payment successful!</p>;
  return <p>⏳ Payment processing…</p>;
}
```

```javascript
// GET /api/stripe/session-status
exports.getSessionStatus = async (req, res) => {
  const { session_id } = req.query;
  const session = await stripe.checkout.sessions.retrieve(session_id);
  res.json({ paymentStatus: session.payment_status }); // "paid" | "unpaid"
};
```

> **Important:** Success page is for UX only. **Webhook** is the source of truth for marking orders paid.

---

## 6. Approach B — Payment Intents + Elements

Custom payment form embedded in your site.

### Backend — Create Payment Intent

```javascript
// POST /api/stripe/create-payment-intent
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = "usd" } = req.body;
    const userId = req.user.id;

    const [result] = await db.query(
      `INSERT INTO orders (user_id, amount, currency, status) VALUES (?, ?, ?, 'created')`,
      [userId, amount, currency]
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        db_order_id: String(result.insertId),
        user_id: String(userId),
      },
      automatic_payment_methods: { enabled: true },
    });

    await db.query(
      `UPDATE orders SET stripe_payment_intent_id = ? WHERE id = ?`,
      [paymentIntent.id, result.insertId]
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
```

### Frontend — Stripe Elements (React)

```bash
npm install @stripe/react-stripe-js @stripe/stripe-js
```

```jsx
// src/components/StripePaymentForm.jsx
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success`,
      },
    });

    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={!stripe || loading}>
        {loading ? "Processing…" : "Pay now"}
      </button>
    </form>
  );
}

export default function StripePaymentForm({ clientSecret, publishableKey }) {
  const stripePromise = loadStripe(publishableKey);

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm />
    </Elements>
  );
}
```

```jsx
// Parent component — fetch clientSecret first
const [clientSecret, setClientSecret] = useState(null);

useEffect(() => {
  fetch("/api/stripe/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 1000 }), // $10.00
  })
    .then((r) => r.json())
    .then((data) => setClientSecret(data.clientSecret));
}, []);

{clientSecret && (
  <StripePaymentForm
    clientSecret={clientSecret}
    publishableKey={process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY}
  />
)}
```

---

## 7. Webhooks Setup

> **Always use webhooks to mark orders as paid.** Redirect URLs can be skipped or manipulated.

### Webhook handler

```javascript
// POST /api/stripe/webhook
exports.webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // req.body must be RAW buffer — see index.js setup below
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency — skip if already processed
  const [existing] = await db.query(
    `SELECT id FROM payment_logs WHERE stripe_event_id = ?`,
    [event.id]
  );
  if (existing.length) {
    return res.json({ received: true });
  }

  // Log event
  await db.query(
    `INSERT INTO payment_logs (stripe_event_id, event_type, payload) VALUES (?, ?, ?)`,
    [event.id, event.type, JSON.stringify(event.data.object)]
  );

  // Handle events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const dbOrderId = session.metadata.db_order_id;

      await db.query(
        `UPDATE orders
         SET status = 'paid',
             stripe_payment_intent_id = ?,
             updated_at = NOW()
         WHERE id = ? AND status != 'paid'`,
        [session.payment_intent, dbOrderId]
      );

      // Grant access, send email, etc.
      // await fulfillOrder(dbOrderId);
      break;
    }

    case "payment_intent.succeeded": {
      const intent = event.data.object;
      const dbOrderId = intent.metadata.db_order_id;

      await db.query(
        `UPDATE orders SET status = 'paid', updated_at = NOW()
         WHERE id = ? AND status != 'paid'`,
        [dbOrderId]
      );
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      const dbOrderId = intent.metadata.db_order_id;

      await db.query(
        `UPDATE orders SET status = 'failed', updated_at = NOW() WHERE id = ?`,
        [dbOrderId]
      );
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};
```

### Express raw body setup (required)

```javascript
// src/index.js
const express = require("express");
const app = express();

// Stripe webhook MUST use raw body
app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" })
);

// All other routes use JSON parser
app.use(express.json());

app.use("/api/stripe", require("./routes/stripeRoutes"));
```

### Routes

```javascript
// src/routes/stripeRoutes.js
const express = require("express");
const router = express.Router();
const stripeController = require("../controllers/stripeController");
const auth = require("../middlewares/auth");

router.post("/create-checkout-session", auth, stripeController.createCheckoutSession);
router.post("/create-payment-intent", auth, stripeController.createPaymentIntent);
router.get("/session-status", auth, stripeController.getSessionStatus);
router.post("/webhook", stripeController.webhook); // no auth

module.exports = router;
```

### Local webhook testing with Stripe CLI

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:5000/api/stripe/webhook

# Copy the whsec_ secret it prints → STRIPE_WEBHOOK_SECRET in .env

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
```

---

## 8. Test Mode vs Live Mode

### Test card numbers

| Card number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 3220` | 3D Secure required |
| `4000 0025 0000 3155` | Requires authentication |

Use any future expiry, any 3-digit CVC, any billing ZIP.

### Test UPI (India)

Enable INR in Stripe Dashboard → use test mode with `inr` currency.

### Checklist before going Live

- [ ] Business verification complete
- [ ] Live API keys in production `.env`
- [ ] Live webhook endpoint registered
- [ ] `success_url` and `cancel_url` use HTTPS production domain
- [ ] Test one real small payment in Live mode
- [ ] Payout bank account connected

---

## 9. Subscriptions (Optional)

For recurring billing (SaaS, memberships):

### Stripe Dashboard

1. **Products** → **+ Add product** → set name + recurring price
2. Copy **Price ID** → `price_xxxxxxxx`

### Backend

```javascript
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: "price_xxxxxxxx", quantity: 1 }],
  success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
});

// Webhook events to handle:
// customer.subscription.created
// customer.subscription.deleted
// invoice.payment_succeeded
// invoice.payment_failed
```

---

## 10. Refunds (Optional)

```javascript
// Full refund
const refund = await stripe.refunds.create({
  payment_intent: "pi_xxxxxxxx",
});

// Partial refund ($5.00)
const partialRefund = await stripe.refunds.create({
  payment_intent: "pi_xxxxxxxx",
  amount: 500, // cents
});
```

Or from Dashboard: **Payments** → select payment → **Refund**.

---

## 11. Full Flow Diagram

### Checkout Session flow

```
┌──────────┐  1. Pay $10    ┌──────────────┐
│  React   │ ─────────────► │ Your Backend │
│ Frontend │                │ create-session│
└──────────┘                └──────┬───────┘
                                   │ 2. stripe.checkout.sessions.create()
                                   ▼
                            ┌──────────────┐
                            │    Stripe    │
                            │   Platform   │
                            └──────┬───────┘
                                   │ 3. session.url
┌──────────┐  4. Redirect          │
│  React   │ ◄────────────────────┘
└────┬─────┘
     │ 5. User pays on Stripe page
     ▼
┌──────────────┐  6. success_url redirect  ┌──────────┐
│    Stripe    │ ─────────────────────────► │  React   │
│   Checkout   │                            │ Success  │
└──────┬───────┘                            └──────────┘
       │ 7. webhook: checkout.session.completed
       ▼
┌──────────────┐  8. UPDATE orders SET status='paid'
│ Your Backend │ ◄── source of truth
│   webhook    │
└──────────────┘
```

---

## 12. Common Fixes & Best Practices

### Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `No API key provided` | Missing `STRIPE_SECRET_KEY` | Check `.env` |
| `Invalid API Key` | Test key in Live mode or vice versa | Match key to mode |
| Webhook signature fails | Body parsed before verify | Use `express.raw()` on webhook route only |
| `Amount must be at least 50` | Amount too small | Minimum varies by currency |
| Payment succeeds but order not updated | Webhook not configured | Add endpoint in Dashboard + handle event |
| CORS error on frontend | Wrong API URL | Proxy or set CORS on backend |
| `client_secret does not match` | Stale PaymentIntent | Create new intent per attempt |

### Best practices

* **Never** expose `STRIPE_SECRET_KEY` in frontend or Git
* Use **webhooks** as source of truth, not redirect URLs alone
* Store `stripe_session_id` / `stripe_payment_intent_id` in DB
* Use `metadata` to link Stripe objects to your DB order ID
* Implement webhook **idempotency** (check `stripe_event_id` before processing)
* Use Test mode until business verification is complete
* Set explicit `apiVersion` in Stripe client initialization
* Handle `payment_intent.payment_failed` webhook
* Use Stripe CLI for local webhook testing

### Razorpay vs Stripe — when to use which

| | Razorpay | Stripe |
|--|----------|--------|
| Primary market | India | Global |
| UPI | Native | Limited |
| Setup complexity | Easy | Easy (Checkout) |
| Subscriptions | Yes | Excellent |
| Currency | INR focus | 135+ currencies |

---

## 13. Quick Reference Cheat Sheet

### Stripe Dashboard checklist

```
□ Create account
□ Copy Test Publishable + Secret keys
□ Set business name & branding
□ Enable payment methods
□ Add Webhook endpoint (checkout.session.completed, payment_intent.succeeded)
□ Copy Webhook signing secret (whsec_)
□ Complete business verification for Live
□ Switch to Live keys + Live webhook for production
```

### API endpoints (your backend)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/stripe/create-checkout-session` | Hosted checkout (easy) |
| POST | `/api/stripe/create-payment-intent` | Custom Elements form |
| GET | `/api/stripe/session-status` | Check payment status |
| POST | `/api/stripe/webhook` | Stripe server events |

### Env variables

```env
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
FRONTEND_URL=http://localhost:3000
```

### Amount conversion

```
$1.00  = 100 cents
$10.00 = 1000 cents
₹500   = 50000 paise (use currency: "inr")
```

### Stripe CLI commands

```bash
stripe login
stripe listen --forward-to localhost:5000/api/stripe/webhook
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
```

---

## Related Files in This Repo

| Topic | File |
|-------|------|
| Razorpay (India) | `Razorpay.md` |
| Express backend | `TypeScript.md` |
| React frontend | `TypeScript.md` |
| AWS deploy | `AWS_EC2.md` |

---

*Last updated: July 2026*
