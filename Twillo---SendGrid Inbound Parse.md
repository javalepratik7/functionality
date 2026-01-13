```markdown
# SendGrid Inbound Parse – Step-by-Step Cheat-Sheet  
*(receive ➜ call OpenAI ➜ auto-reply)*

---

## 0.  One-glance overview
1. Buy / pick a domain (or sub-domain) **exclusively** for receiving mail.  
2. Add **MX record** → `mx.sendgrid.net.`  
3. Authenticate the domain in SendGrid.  
4. Tell SendGrid where to **POST** the parsed mail (your Node endpoint).  
5. In Node: verify signature → read `multipart/form-data` → send text to OpenAI → call SendGrid API to reply.  
6. Deploy, update the webhook URL, done.

---

## 1.  Prerequisites
| Item | Example / command |
|------|-------------------|
| Node ≥ 18 | `node -v` |
| Domain you control | `reply.yourcompany.com` |
| SendGrid account | free is enough |
| OpenAI API key | platform.openai.com |
| Public HTTPS URL for dev | `ngrok http 3000` |

---

## 2.  DNS – add MX record
**Record type:** MX  
**Name:** `reply` (or `@` if you want the apex)  
**Value:** `10 mx.sendgrid.net.`  ← keep the trailing dot  
**TTL:** 3600 s  

Check:  
```bash
dig MX reply.yourcompany.com
```
Should return `10 mx.sendgrid.net.`

---

## 3.  Authenticate domain in SendGrid
1. Console → Settings → **Sender Authentication** → **Authenticate Domain**  
2. Pick your DNS host → **Next**  
3. Domain = `reply.yourcompany.com`  
4. Copy the **3 CNAME** records into your DNS  
5. Back in SendGrid hit **Verify** → green ✓

---

## 4.  Create the Node project
```bash
mkdir sg-inbound && cd sg-inbound
npm init -y
npm install express multer axios @sendgrid/mail dotenv
touch index.js .env
```

**.env**
```
PORT=3000
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=reply@reply.yourcompany.com   # must be verified in SG
```

**index.js (minimal but complete)**
```js
require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const sgMail  = require('@sendgrid/mail');
const axios   = require('axios');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const upload = multer();          // handles multipart
const app    = express();

app.post('/inbound', upload.any(), async (req,res)=>{
  try {
    // 1. grab SendGrid fields
    const from    = req.body.from;
    const to      = req.body.to;
    const subject = req.body.subject;
    let text      = req.body.text || req.body.html.replace(/<[^>]+>/g,' ');

    // 2. strip old quoted lines
    text = text.split('\n').filter(l=>!l.trim().startsWith('>')).join('\n');

    // 3. ask OpenAI
    const chat = await axios.post('https://api.openai.com/v1/chat/completions',{
      model:'gpt-3.5-turbo',
      messages:[{role:'user',content:text}]
    },{headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`}});

    const answer = chat.data.choices[0].message.content;

    // 4. send reply
    await sgMail.send({
      to: from,
      from: process.env.FROM_EMAIL,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      text: answer
    });

    res.status(200).send('OK');      // 200 = “delivered” for SendGrid
  } catch(e){ console.error(e); res.sendStatus(500); }
});

app.listen(process.env.PORT, ()=>console.log('Webhook on :3000/inbound'));
```

---

## 5.  Expose localhost (dev only)
```bash
npm i -g ngrok
ngrok http 3000
```
Copy the **https** URL → `https://abcd1234.ngrok.io/inbound`

---

## 6.  Wire the webhook in SendGrid
Console → Settings → **Inbound Parse** → **Add Host & URL**  
- **Sub-domain:** `reply`  
- **Domain:** `reply.yourcompany.com`  
- **Destination URL:** `https://abcd1234.ngrok.io/inbound`  
- **Spam check:** off (faster)  
- **Send raw:** off  

---

## 7.  End-to-end test
1. From any mailbox send an email to `anything@reply.yourcompany.com`  
2. Watch your Node console – you should see the text hit OpenAI  
3. Check the sender’s inbox – an AI-generated reply arrives within seconds

---

## 8.  Deploy & update URL
Push code to your host (Render, Fly, Railway, EC2, …).  
Replace the ngrok URL in SendGrid with `https://api.myapp.com/inbound`.  
Keep the endpoint **IDEMPOTENT** (same sender → same session) if you want threaded conversations.

---

## 9.  Security hardening checklist
- Verify the `X-Twilio-Email-Event-Webhook-Signature` header (SendGrid signs every POST).  
- Rate-limit the route.  
- Store conversation history keyed by `from` to give OpenAI context.  
- Use **Reply-To** header so human support can jump in.  
- Rotate keys via environment variables – never commit them.

---

## 10.  Need more?
- Full field list: [docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook#default-parameters](https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook#default-parameters)  
- Langflow’s TS example (Astro):   
- Medium walk-through with pictures:   

Enjoy your hands-free AI mailbox!
```