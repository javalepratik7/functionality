✅ OPTION 1 (RECOMMENDED): Authenticate a Real Domain

This is the correct and professional approach.

Step 1: Use a Domain You Own

Example:

yourdomain.com


You will later receive emails on:

support@parse.yourdomain.com

Step 2: Domain Authentication in SendGrid

Go to Settings → Sender Authentication

Click Authenticate Your Domain

Choose:

DNS Host: (Cloudflare / GoDaddy / Namecheap etc.)

Select:

✔️ Use a subdomain (recommended)

Subdomain: parse

Click Next

SendGrid will generate:

3 CNAME records

1 DKIM record

Step 3: Add DNS Records (Very Important)

In your DNS provider, add exactly what SendGrid gives.

Example (sample only):

Type: CNAME
Host: s1._domainkey.parse
Value: s1.domainkey.u123.sendgrid.net


⚠️ Do not change values
⚠️ Do not add extra dots

Step 4: Verify Domain

Back in SendGrid:

Click Verify

Wait 1–10 minutes (sometimes up to 24 hours)

Once verified → ✅ domain authenticated.

Step 5: Configure Inbound Parse (Now It Works)

Now go to:

Settings → Inbound Parse → Add Host & URL


Host:

parse.yourdomain.com


URL:

https://cj0rctdb-5000.inc1.devtunnels.ms/api/webhooks/sendgrid/inbound


Save.

Step 6: Add MX Record (Mandatory)

In DNS:

Type: MX
Host: parse.yourdomain.com
Value: mx.sendgrid.net
Priority: 10

Step 7: Test

Send email to:

test@parse.yourdomain.com


🎉 Webhook will fire.





https://script.google.com/macros/s/AKfycbyXjYmgMLXFETbwx9PWxdhzg8p4FnnYdm-K4HV9sVh_nKvELlQcDXSL1hSO7Y4gL_uA/exec
AKfycbyXjYmgMLXFETbwx9PWxdhzg8p4FnnYdm-K4HV9sVh_nKvELlQcDXSL1hSO7Y4gL_uA