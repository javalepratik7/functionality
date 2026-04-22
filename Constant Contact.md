**What it is:** Constant Contact is an email marketing platform with an API that lets you programmatically manage contacts and send emails from your app.

**Use case:** When a user registers on your site, automatically add them to a mailing list and send them a welcome email — no manual effort.

**Why use it:** It handles email deliverability, unsubscribes, and compliance (CAN-SPAM) so you don't have to build that yourself.

---

## The 5 Steps to Get It Working

### Step 1 — Create Developer Account & App
1. Go to [developer.constantcontact.com](https://developer.constantcontact.com)
2. Sign up → **My Applications** → **New Application**
3. Set OAuth2 Flow to **Authorization Code**, enable **Rotating Refresh Tokens**
4. Copy your **API Key (client_id)** and **Client Secret**
5. Add redirect URI: `http://localhost:3001/callback`
6. Enable scopes: `contact_data`, `campaign_data`, `account_read`, `offline_access`

---

### Step 2 — Set Up Your .env
```env
CONSTANT_CONTACT_CLIENT_ID=your_client_id
CONSTANT_CONTACT_CLIENT_SECRET=your_client_secret
CONSTANT_CONTACT_REDIRECT_URI=http://localhost:3001/callback
CONSTANT_CONTACT_ACCESS_TOKEN=        # filled after Step 3
CONSTANT_CONTACT_REFRESH_TOKEN=       # filled after Step 3
WELCOME_CAMPAIGN_ACTIVITY_ID=         # filled after Step 4
FROM_EMAIL=your-verified@email.com
```

---

### Step 3 — Get Your Access Token (OAuth)
Run the server, visit `http://localhost:3001/auth` in your browser. It redirects you to Constant Contact login → you approve → your server's `/callback` receives the tokens and logs them to console. Copy both tokens into `.env`.

```
ACCESS_TOKEN  →  save to CONSTANT_CONTACT_ACCESS_TOKEN
REFRESH_TOKEN →  save to CONSTANT_CONTACT_REFRESH_TOKEN
```

---

### Step 4 — Create a Welcome Email Campaign & Get Its ID
Run this curl command with your access token:

```bash
curl -X POST 'https://api.cc.email/v3/emails' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Welcome Email",
    "type": "NEWSLETTER",
    "email_campaign_activities": [{
      "format_type": 5,
      "from_email": "your-verified@email.com",
      "from_name": "Your App",
      "reply_to_email": "your-verified@email.com",
      "subject": "Welcome!",
      "html_content": "<html><body>[[trackingImage]]<h1>Welcome [[FIRST_NAME]]!</h1></body></html>"
    }]
  }'
```

From the response, copy `campaign_activity_id` → paste into `.env` as `WELCOME_CAMPAIGN_ACTIVITY_ID`.

---

### Step 5 — Register a User (The Full Flow)
Once everything is set up, one API call to your backend does all three things automatically:

```bash
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{"parentFirst":"John","parentLast":"Doe","email":"john@example.com"}'
```

**What happens behind the scenes:**
```
User submits form
      ↓
Create/find contact list  →  "demo-contact-list"
      ↓
Check if email exists already  →  skip if duplicate
      ↓
POST /contacts  →  adds contact to Constant Contact
      ↓
POST /emails/activities/{id}/tests  →  sends welcome email
      ↓
Return { success: true, contactId: "..." }
```

---

## Quick Troubleshooting

| Error | Fix |
|---|---|
| `email_address is invalid` | Use `{ address: email, permission_to_send: "implicit" }` format |
| `from email is null` | Create campaign via API, not dashboard |
| `campaign activity not found` | Check the ID is correct and status is `DRAFT` |
| `401 Unauthorized` | Token expired — call `refreshAccessToken()` |

---

## The Minimal Flow in One Diagram

```
.env credentials
      ↓
/auth → browser login → /callback → save tokens
      ↓
Create campaign via API → save campaign_activity_id
      ↓
POST /api/register → contact created + welcome email sent ✅
```
