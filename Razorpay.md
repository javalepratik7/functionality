# 💳 Razorpay — Complete Implementation Guide (Node.js + React)

> Step-by-step guide to integrate **Razorpay** payments in a full-stack app. Covers Razorpay Dashboard setup, backend order creation, frontend checkout, payment verification, and webhooks.

**Best for:** India — UPI, cards, netbanking, wallets, EMI.

---

## Table of Contents

1. [What is Razorpay & Payment Flow](#1-what-is-razorpay--payment-flow)
2. [Razorpay Dashboard Setup (Platform Steps)](#2-razorpay-dashboard-setup-platform-steps)
3. [Project Setup](#3-project-setup)
4. [Database Schema](#4-database-schema)
5. [Backend — Create Order API](#5-backend--create-order-api)
6. [Frontend — Razorpay Checkout (React)](#6-frontend--razorpay-checkout-react)
7. [Backend — Verify Payment Signature](#7-backend--verify-payment-signature)
8. [Webhooks Setup](#8-webhooks-setup)
9. [Test Mode vs Live Mode](#9-test-mode-vs-live-mode)
10. [Refunds (Optional)](#10-refunds-optional)
11. [Full Flow Diagram](#11-full-flow-diagram)
12. [Common Fixes & Best Practices](#12-common-fixes--best-practices)
13. [Quick Reference Cheat Sheet](#13-quick-reference-cheat-sheet)

---

## 1. What is Razorpay & Payment Flow

### What Razorpay does

Razorpay is a payment gateway. Your app never touches card/UPI details directly — Razorpay's secure checkout handles that.

### Standard payment flow

```
1. User clicks "Pay Now" on your website
2. Your BACKEND creates a Razorpay Order (amount in paise)
3. Your FRONTEND opens Razorpay Checkout popup with order_id
4. User pays via UPI / card / netbanking on Razorpay UI
5. Razorpay returns payment_id + signature to frontend
6. Your BACKEND verifies signature (never trust frontend alone)
7. Mark order as PAID in your database
8. (Optional) Razorpay sends webhook to your server for backup confirmation
```

### Amount rule

> Razorpay amounts are in **paise** (smallest currency unit).
> ₹500 = `50000` paise | ₹1 = `100` paise

---

## 2. Razorpay Dashboard Setup (Platform Steps)

Do these on [https://dashboard.razorpay.com](https://dashboard.razorpay.com)

### Step 1 — Create account

1. Go to **Sign Up** → enter email, phone, business details
2. Verify email and phone OTP
3. Complete **KYC** for Live mode (PAN, bank account, business proof)

> **Test mode** works immediately without full KYC. Use Test mode for development.

---

### Step 2 — Get API keys

1. Login → top-left toggle: **Test Mode** (for development)
2. Go to **Account & Settings** → **API Keys**
3. Click **Generate Key**
4. Copy and save:
   - **Key ID** → `rzp_test_xxxxxxxx` (public, used in frontend)
   - **Key Secret** → `xxxxxxxx` (private, backend only — shown once)

| Key | Where to use | Safe in frontend? |
|-----|--------------|-------------------|
| Key ID | Frontend + Backend | ✅ Yes |
| Key Secret | Backend only | ❌ Never |

---

### Step 3 — Enable payment methods

1. Go to **Settings** → **Payment Methods**
2. Enable what you need:
   - ✔ Cards (Visa, Mastercard, RuPay)
   - ✔ UPI
   - ✔ Netbanking
   - ✔ Wallets (Paytm, PhonePe, etc.)
   - ✔ EMI (optional)

---

### Step 4 — Configure webhook (do after backend is deployed)

1. Go to **Account & Settings** → **Webhooks**
2. Click **+ Add New Webhook**
3. Set:
   - **Webhook URL:** `https://api.yourdomain.com/api/razorpay/webhook`
   - **Secret:** generate a strong random string (save in `.env`)
   - **Events to subscribe:**
     - `payment.captured`
     - `payment.failed`
     - `order.paid` (optional)
4. Click **Create Webhook**
5. Copy the **Webhook Secret** → store in `.env` as `RAZORPAY_WEBHOOK_SECRET`

> For local testing use **ngrok**: `ngrok http 5000` → paste `https://xxxx.ngrok.io/api/razorpay/webhook`

---

### Step 5 — Business settings (Live mode only)

| Setting | Where | What to do |
|---------|-------|------------|
| Brand name & logo | Settings → Branding | Shows on checkout popup |
| Settlement account | Settings → Bank Account | Add bank for payouts |
| KYC documents | My Account → KYC | Upload PAN, GST, etc. |
| Domain whitelist | Not required for standard checkout | — |

---

### Step 6 — Switch to Live mode (production)

1. Complete KYC approval
2. Toggle **Test Mode → Live Mode** (top-left)
3. Generate **Live API Keys** (separate from test keys)
4. Update `.env` with live `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
5. Update webhook URL to production domain

---

## 3. Project Setup

### Install packages

```bash
npm install razorpay express cors dotenv
npm install --save-dev @types/express  # if using TypeScript
```

### Environment variables

```env
# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

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
│   │   │   └── razorpayRoutes.js
│   │   ├── controllers/
│   │   │   └── razorpayController.js
│   │   ├── services/
│   │   │   └── razorpayService.js
│   │   └── utils/
│   │       └── verifySignature.js
│   └── .env
└── frontend/
    └── src/
        └── components/
            └── RazorpayCheckout.jsx
```

---

## 4. Database Schema

```sql
CREATE TABLE orders (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  amount        INT NOT NULL COMMENT 'Amount in paise',
  currency      VARCHAR(3) DEFAULT 'INR',
  status        ENUM('created', 'paid', 'failed', 'refunded') DEFAULT 'created',
  razorpay_order_id   VARCHAR(100) UNIQUE,
  razorpay_payment_id VARCHAR(100) UNIQUE NULL,
  razorpay_signature  VARCHAR(255) NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE payment_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  order_id      INT NOT NULL,
  event_type    VARCHAR(50),
  payload       JSON,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

---

## 5. Backend — Create Order API

### Initialize Razorpay client

```javascript
// src/services/razorpayService.js
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = razorpay;
```

### Create order endpoint

```javascript
// src/controllers/razorpayController.js
const razorpay = require("../services/razorpayService");
const crypto = require("crypto");
const db = require("../db"); // your MySQL pool

// POST /api/razorpay/create-order
exports.createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;
    const userId = req.user.id; // from auth middleware

    if (!amount || amount < 100) {
      return res.status(400).json({ error: "Minimum amount is ₹1 (100 paise)" });
    }

    // 1. Create order on Razorpay
    const razorpayOrder = await razorpay.orders.create({
      amount: amount,          // in paise
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        user_id: String(userId),
      },
    });

    // 2. Save to your database
    const [result] = await db.query(
      `INSERT INTO orders (user_id, amount, currency, status, razorpay_order_id)
       VALUES (?, ?, ?, 'created', ?)`,
      [userId, amount, currency, razorpayOrder.id]
    );

    // 3. Return order details to frontend
    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      dbOrderId: result.insertId,
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
};
```

### Routes

```javascript
// src/routes/razorpayRoutes.js
const express = require("express");
const router = express.Router();
const razorpayController = require("../controllers/razorpayController");
const auth = require("../middlewares/auth");

router.post("/create-order", auth, razorpayController.createOrder);
router.post("/verify-payment", auth, razorpayController.verifyPayment);
router.post("/webhook", razorpayController.webhook); // no auth — uses signature

module.exports = router;
```

```javascript
// src/index.js
app.use("/api/razorpay", require("./routes/razorpayRoutes"));
```

---

## 6. Frontend — Razorpay Checkout (React)

### Load Razorpay script

Add to `public/index.html` or load dynamically:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### React checkout component

```jsx
// src/components/RazorpayCheckout.jsx
import { useState } from "react";

export default function RazorpayCheckout({ amountInRupees, onSuccess, onFailure }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      // Step 1: Create order on your backend
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          amount: amountInRupees * 100, // convert ₹ to paise
          currency: "INR",
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Step 2: Open Razorpay checkout popup
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Your Company Name",
        description: "Order Payment",
        order_id: data.orderId,
        handler: async function (response) {
          // Step 3: Verify payment on backend (CRITICAL)
          const verifyRes = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            onSuccess?.(verifyData);
          } else {
            onFailure?.(verifyData.error);
          }
        },
        prefill: {
          name: "Customer Name",
          email: "customer@example.com",
          contact: "9999999999",
        },
        theme: {
          color: "#3399cc",
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        onFailure?.(response.error.description);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      onFailure?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePay} disabled={loading}>
      {loading ? "Processing…" : `Pay ₹${amountInRupees}`}
    </button>
  );
}
```

### Usage

```jsx
<RazorpayCheckout
  amountInRupees={499}
  onSuccess={(data) => alert("Payment successful!")}
  onFailure={(err) => alert("Payment failed: " + err)}
/>
```

---

## 7. Backend — Verify Payment Signature

> **Never mark an order as paid based only on frontend response.** Always verify the signature on the server.

```javascript
// src/utils/verifySignature.js
const crypto = require("crypto");

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

module.exports = { verifyRazorpaySignature };
```

```javascript
// src/controllers/razorpayController.js (continued)

const { verifyRazorpaySignature } = require("../utils/verifySignature");

// POST /api/razorpay/verify-payment
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    // 1. Verify signature
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }

    // 2. Check order exists and not already paid (idempotency)
    const [rows] = await db.query(
      `SELECT * FROM orders WHERE razorpay_order_id = ? LIMIT 1`,
      [razorpay_order_id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const order = rows[0];
    if (order.status === "paid") {
      return res.json({ success: true, message: "Already paid" });
    }

    // 3. Mark as paid
    await db.query(
      `UPDATE orders
       SET status = 'paid',
           razorpay_payment_id = ?,
           razorpay_signature = ?,
           updated_at = NOW()
       WHERE razorpay_order_id = ?`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    // 4. Grant access / send confirmation email / etc.
    // await grantProductAccess(order.user_id);

    res.json({ success: true, message: "Payment verified successfully" });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ success: false, error: "Verification failed" });
  }
};
```

---

## 8. Webhooks Setup

Webhooks are a **backup** — Razorpay notifies your server even if the user closes the browser after paying.

### Webhook handler

```javascript
// POST /api/razorpay/webhook
exports.webhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    // 1. Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    // 2. Log event
    console.log("Razorpay webhook:", event);

    // 3. Handle events
    if (event === "payment.captured") {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;

      await db.query(
        `UPDATE orders
         SET status = 'paid', razorpay_payment_id = ?, updated_at = NOW()
         WHERE razorpay_order_id = ? AND status != 'paid'`,
        [payment.id, orderId]
      );
    }

    if (event === "payment.failed") {
      const payment = payload.payment.entity;
      await db.query(
        `UPDATE orders SET status = 'failed', updated_at = NOW()
         WHERE razorpay_order_id = ?`,
        [payment.order_id]
      );
    }

    // Always return 200 quickly
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};
```

### Important: raw body for webhooks

Express must receive **raw body** for signature verification:

```javascript
// In index.js — BEFORE express.json() for webhook route only
app.use(
  "/api/razorpay/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    try {
      req.body = JSON.parse(req.body.toString());
    } catch (e) {
      return res.status(400).send("Invalid JSON");
    }
    next();
  }
);

app.use(express.json()); // for all other routes
```

---

## 9. Test Mode vs Live Mode

### Test cards (Test Mode only)

| Card number | Result |
|-------------|--------|
| `4111 1111 1111 1111` | Success |
| `4000 0000 0000 0002` | Failure |
| Any future expiry, any CVV | — |

### Test UPI

- UPI ID: `success@razorpay` → payment succeeds
- UPI ID: `failure@razorpay` → payment fails

### Checklist before going Live

- [ ] KYC completed and approved
- [ ] Live API keys in production `.env`
- [ ] Webhook URL points to production HTTPS domain
- [ ] Signature verification enabled on verify + webhook
- [ ] Test a real ₹1 payment in Live mode
- [ ] Settlement bank account verified

---

## 10. Refunds (Optional)

```javascript
// Refund full amount
const refund = await razorpay.payments.refund(paymentId, {
  speed: "normal", // or "optimum"
});

// Partial refund
const partialRefund = await razorpay.payments.refund(paymentId, {
  amount: 10000, // ₹100 in paise
});
```

Update DB:

```sql
UPDATE orders SET status = 'refunded' WHERE razorpay_payment_id = ?;
```

---

## 11. Full Flow Diagram

```
┌──────────┐    1. Pay ₹499     ┌──────────────┐
│  React   │ ─────────────────► │ Your Backend │
│ Frontend │                    │ create-order │
└──────────┘                    └──────┬───────┘
      ▲                                │
      │                                │ 2. razorpay.orders.create()
      │                                ▼
      │                         ┌──────────────┐
      │  4. Open checkout       │   Razorpay   │
      └──────────────────────── │   Platform   │
                                └──────┬───────┘
      ┌──────────────────────────────┘
      │ 3. order_id returned
      ▼
┌──────────┐   5. User pays UPI/Card   ┌──────────────┐
│ Razorpay │ ◄──────────────────────── │   Customer   │
│ Checkout │                           └──────────────┘
└────┬─────┘
     │ 6. payment_id + signature
     ▼
┌──────────────┐  7. verify signature  ┌──────────────┐
│ Your Backend │ ◄──────────────────── │   Frontend   │
│verify-payment│                       └──────────────┘
└──────┬───────┘
       │ 8. UPDATE orders SET status='paid'
       ▼
┌──────────────┐  9. webhook (backup)  ┌──────────────┐
│   Database   │ ◄──────────────────── │   Razorpay   │
└──────────────┘                       └──────────────┘
```

---

## 12. Common Fixes & Best Practices

### Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Authentication failed` | Wrong Key ID / Secret | Check `.env`, Test vs Live keys |
| `Order amount less than minimum` | Amount < 100 paise | Minimum is ₹1 = 100 paise |
| `Invalid payment signature` | Wrong secret or tampered data | Verify HMAC with Key Secret |
| Checkout popup doesn't open | Script not loaded | Add `checkout.razorpay.com/v1/checkout.js` |
| Webhook signature fails | Body parsed as JSON before verify | Use `express.raw()` for webhook route |
| Order marked paid twice | No idempotency check | Check `status != 'paid'` before update |

### Best practices

* **Never** expose `RAZORPAY_KEY_SECRET` in frontend or Git
* Always verify signature on backend before granting access
* Store `razorpay_order_id` and `razorpay_payment_id` in DB
* Use webhooks as backup, not primary verification only
* Handle `payment.failed` event
* Use Test mode until KYC is complete
* Log all payment events in `payment_logs` table
* Return 200 from webhook quickly — process async if heavy

---

## 13. Quick Reference Cheat Sheet

### Razorpay Dashboard checklist

```
□ Create account
□ Generate Test API Keys (Key ID + Secret)
□ Enable payment methods (UPI, Cards, etc.)
□ Add Webhook URL + subscribe to payment.captured, payment.failed
□ Complete KYC for Live mode
□ Generate Live API Keys for production
```

### API endpoints (your backend)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/razorpay/create-order` | Create Razorpay order |
| POST | `/api/razorpay/verify-payment` | Verify signature after pay |
| POST | `/api/razorpay/webhook` | Razorpay server callback |

### Env variables

```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx
```

### Amount conversion

```
₹1    = 100 paise
₹499  = 49900 paise
₹1000 = 100000 paise
```

---

## Related Files in This Repo

| Topic | File |
|-------|------|
| Stripe (international) | `Stripe.md` |
| Express backend | `TypeScript.md` |
| React frontend | `TypeScript.md` |
| AWS deploy | `AWS_EC2.md` |

---

*Last updated: July 2026*
